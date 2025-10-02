import numpy as np
import pandas as pd
import logging
from typing import Dict, Any, List, Tuple, Optional, Union
import uuid
import json
import pickle
import base64
import os
from pathlib import Path
from datetime import datetime

from django.conf import settings
from sklearn.model_selection import train_test_split, GridSearchCV, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder, OneHotEncoder
from sklearn.linear_model import LinearRegression, LogisticRegression, Lasso, Ridge
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.svm import SVR, SVC
from sklearn.metrics import (mean_squared_error, r2_score, mean_absolute_error,
                           accuracy_score, classification_report, confusion_matrix,
                           precision_recall_curve, roc_curve, auc)
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA

from core.services.error_handler import safe_operation, try_except

logger = logging.getLogger(__name__)

class MLService:
    """
    Service for machine learning model training, evaluation, and prediction.
    
    This service provides methods for:
    - Data preparation and preprocessing
    - Model training with hyperparameter tuning
    - Model evaluation and metrics calculation
    - Visualization of model results
    - Clustering and dimensionality reduction
    """
    
    def __init__(self):
        """Initialize ML service with model configurations."""
        self.regression_models = {
            'linear_regression': {
                'name': 'Linear Regression',
                'model': LinearRegression(),
                'params': {},
                'description': 'A simple linear regression model that assumes a linear relationship between inputs and target.'
            },
            'random_forest_regression': {
                'name': 'Random Forest Regression',
                'model': RandomForestRegressor(random_state=42),
                'params': {
                    'n_estimators': [50, 100, 200],
                    'max_depth': [None, 10, 20, 30],
                    'min_samples_split': [2, 5, 10]
                },
                'description': 'An ensemble method that builds multiple decision trees and aggregates their predictions.'
            },
            'svr': {
                'name': 'Support Vector Regression',
                'model': SVR(),
                'params': {
                    'C': [0.1, 1, 10],
                    'kernel': ['linear', 'rbf'],
                    'gamma': ['scale', 'auto']
                },
                'description': 'A regression method based on support vector machines that's effective for non-linear relationships.'
            },
            'lasso': {
                'name': 'Lasso Regression',
                'model': Lasso(random_state=42),
                'params': {
                    'alpha': [0.01, 0.1, 1.0, 10.0],
                    'max_iter': [1000, 2000, 5000]
                },
                'description': 'Linear regression with L1 regularization that can eliminate irrelevant features.'
            },
            'ridge': {
                'name': 'Ridge Regression',
                'model': Ridge(random_state=42),
                'params': {
                    'alpha': [0.01, 0.1, 1.0, 10.0]
                },
                'description': 'Linear regression with L2 regularization that works well when features are correlated.'
            }
        }
        
        self.classification_models = {
            'logistic_regression': {
                'name': 'Logistic Regression',
                'model': LogisticRegression(random_state=42),
                'params': {
                    'C': [0.1, 1, 10],
                    'solver': ['lbfgs', 'liblinear'],
                    'max_iter': [1000, 2000]
                },
                'description': 'A classification algorithm that predicts the probability of categorical outcomes.'
            },
            'random_forest_classification': {
                'name': 'Random Forest Classification',
                'model': RandomForestClassifier(random_state=42),
                'params': {
                    'n_estimators': [50, 100, 200],
                    'max_depth': [None, 10, 20, 30],
                    'min_samples_split': [2, 5, 10]
                },
                'description': 'An ensemble of decision trees for classification that's robust to overfitting.'
            },
            'svc': {
                'name': 'Support Vector Classification',
                'model': SVC(random_state=42, probability=True),
                'params': {
                    'C': [0.1, 1, 10],
                    'kernel': ['linear', 'rbf'],
                    'gamma': ['scale', 'auto']
                },
                'description': 'A classification method that finds the optimal hyperplane to separate classes.'
            }
        }
        
        self.clustering_models = {
            'kmeans': {
                'name': 'K-Means Clustering',
                'model': KMeans(random_state=42),
                'params': {
                    'n_clusters': [2, 3, 4, 5, 6, 7, 8],
                    'init': ['k-means++', 'random']
                },
                'description': 'A clustering algorithm that groups data points into k clusters based on similarity.'
            }
        }
        
        # Ensure model storage directory exists
        self.models_dir = os.path.join(settings.BASE_DIR, "data", "models")
        os.makedirs(self.models_dir, exist_ok=True)
    
    @safe_operation
    def get_available_models(self, task_type: str) -> Dict[str, Dict[str, Any]]:
        """
        Get available models for a specific task type.
        
        Args:
            task_type: Type of task ('regression', 'classification', 'clustering')
            
        Returns:
            Dictionary of available models with their configurations
        """
        if task_type == 'regression':
            return self.regression_models
        elif task_type == 'classification':
            return self.classification_models
        elif task_type == 'clustering':
            return self.clustering_models
        else:
            raise ValueError(f"Unknown task type: {task_type}")
    
    @safe_operation
    def prepare_data(self, data: pd.DataFrame, target: str, 
                   features: List[str], test_size: float = 0.2,
                   handle_categorical: bool = True,
                   scale_features: bool = True) -> Dict[str, Any]:
        """
        Prepare data for machine learning.
        
        Args:
            data: Input DataFrame
            target: Target variable name
            features: List of feature variable names
            test_size: Proportion of data to use for testing
            handle_categorical: Whether to encode categorical variables
            scale_features: Whether to scale features
            
        Returns:
            Dictionary with processed data
        """
        # Validate inputs
        if target not in data.columns:
            raise ValueError(f"Target column '{target}' not found in data")
            
        missing_features = [f for f in features if f not in data.columns]
        if missing_features:
            raise ValueError(f"Feature columns {missing_features} not found in data")
        
        # Extract features and target
        X = data[features].copy()
        y = data[target].copy()
        
        # Track preprocessing steps for reproducibility
        preprocessing_steps = []
        
        # Handle categorical variables
        categorical_encoders = {}
        
        if handle_categorical:
            categorical_cols = X.select_dtypes(include=['object', 'category']).columns
            
            if not categorical_cols.empty:
                # One-hot encode categorical features
                for col in categorical_cols:
                    encoder = OneHotEncoder(sparse=False, drop='first', handle_unknown='ignore')
                    col_encoded = encoder.fit_transform(X[[col]])
                    
                    # Create encoded column names
                    category_names = encoder.categories_[0][1:]  # Drop first category
                    encoded_names = [f"{col}_{cat}" for cat in category_names]
                    
                    # Create DataFrame with encoded columns
                    col_encoded_df = pd.DataFrame(col_encoded, columns=encoded_names, index=X.index)
                    
                    # Add to original dataframe
                    X = pd.concat([X.drop(col, axis=1), col_encoded_df], axis=1)
                    
                    # Store encoder
                    categorical_encoders[col] = {
                        'encoder': encoder,
                        'encoded_names': encoded_names
                    }
                    
                    preprocessing_steps.append(f"One-hot encoded '{col}' into {len(encoded_names)} columns")
        
        # Store variable types for target
        is_classification = False
        target_encoder = None
        
        if y.dtype in ['object', 'category'] or y.nunique() < 10:
            is_classification = True
            if handle_categorical:
                target_encoder = LabelEncoder()
                y = target_encoder.fit_transform(y)
                preprocessing_steps.append(f"Label encoded target '{target}' with {len(target_encoder.classes_)} classes")
        
        # Scale features if requested
        feature_scaler = None
        
        if scale_features:
            feature_scaler = StandardScaler()
            X_columns = X.columns
            X = pd.DataFrame(feature_scaler.fit_transform(X), columns=X_columns, index=X.index)
            preprocessing_steps.append(f"Scaled features using StandardScaler")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42
        )
        
        preprocessing_steps.append(f"Split data into {len(X_train)} training and {len(X_test)} testing samples")
        
        # Return processed data
        return {
            'X_train': X_train,
            'X_test': X_test,
            'y_train': y_train,
            'y_test': y_test,
            'feature_names': X.columns.tolist(),
            'preprocessing': {
                'steps': preprocessing_steps,
                'categorical_encoders': categorical_encoders,
                'feature_scaler': feature_scaler,
                'target_encoder': target_encoder
            },
            'task_type': 'classification' if is_classification else 'regression'
        }
    
    @safe_operation
    def train_model(self, prepared_data: Dict[str, Any], 
                  model_id: str, hyper_params: Optional[Dict[str, Any]] = None,
                  perform_gridsearch: bool = True, 
                  cv_folds: int = 5) -> Dict[str, Any]:
        """
        Train a machine learning model with optional hyperparameter tuning.
        
        Args:
            prepared_data: Data prepared by prepare_data
            model_id: ID of the model to train
            hyper_params: Optional hyperparameters to override the defaults
            perform_gridsearch: Whether to perform grid search
            cv_folds: Number of cross-validation folds
            
        Returns:
            Dictionary with training results
        """
        task_type = prepared_data['task_type']
        
        # Get the appropriate model configuration
        if task_type == 'regression':
            model_configs = self.regression_models
        elif task_type == 'classification':
            model_configs = self.classification_models
        elif task_type == 'clustering':
            model_configs = self.clustering_models
        else:
            raise ValueError(f"Unknown task type: {task_type}")
        
        if model_id not in model_configs:
            raise ValueError(f"Unknown model ID: {model_id}")
            
        model_config = model_configs[model_id]
        model_inst = model_config['model']
        param_grid = hyper_params or model_config['params']
        
        # Extract training data
        X_train = prepared_data['X_train']
        y_train = prepared_data['y_train']
        
        # Record start time
        start_time = datetime.now()
        
        # Train the model
        if perform_gridsearch and param_grid:
            scoring = 'r2' if task_type == 'regression' else 'accuracy'
            
            grid_search = GridSearchCV(
                estimator=model_inst,
                param_grid=param_grid,
                cv=cv_folds,
                n_jobs=-1,
                scoring=scoring,
                return_train_score=True
            )
            
            grid_search.fit(X_train, y_train)
            best_model = grid_search.best_estimator_
            best_params = grid_search.best_params_
            cv_results = grid_search.cv_results_
        else:
            model_copy = model_inst.__class__(**model_inst.get_params())
            
            if hyper_params:
                model_copy.set_params(**hyper_params)
                
            best_model = model_copy
            best_model.fit(X_train, y_train)
            best_params = model_copy.get_params()
            
            # Compute cross-validation scores
            scoring = 'r2' if task_type == 'regression' else 'accuracy'
            cv_scores = cross_val_score(best_model, X_train, y_train, cv=cv_folds, scoring=scoring)
            cv_results = {
                'mean_test_score': np.mean(cv_scores),
                'std_test_score': np.std(cv_scores)
            }
        
        # Record end time and compute training time
        end_time = datetime.now()
        training_time = (end_time - start_time).total_seconds()
        
        # Generate a unique model ID
        model_uuid = str(uuid.uuid4())
        
        # Save the model
        model_path = os.path.join(self.models_dir, f"{model_uuid}.pkl")
        with open(model_path, 'wb') as f:
            pickle.dump({
                'model': best_model,
                'preprocessing': prepared_data['preprocessing'],
                'feature_names': prepared_data['feature_names'],
                'task_type': task_type,
                'training_info': {
                    'model_id': model_id,
                    'model_name': model_config['name'],
                    'params': best_params,
                    'training_time': training_time,
                    'train_samples': len(X_train)
                }
            }, f)
        
        # Return training results
        return {
            'model_uuid': model_uuid,
            'model_type': model_id,
            'model_name': model_config['name'],
            'best_params': best_params,
            'training_time': training_time,
            'cv_results': cv_results,
            'task_type': task_type,
            'model_path': model_path,
            'training_size': len(X_train),
            'feature_importance': self._extract_feature_importance(best_model, prepared_data['feature_names'])
        }
    
    def _extract_feature_importance(self, model: Any, feature_names: List[str]) -> Dict[str, float]:
        """Extract feature importance if available."""
        feature_importance = {}
        
        try:
            if hasattr(model, 'feature_importances_'):
                importance = model.feature_importances_
                feature_importance = {name: float(value) for name, value 
                                     in zip(feature_names, importance)}
            elif hasattr(model, 'coef_'):
                coef = model.coef_
                # Handle different shapes of coefficients
                if len(coef.shape) == 1:
                    # Single target or binary classification
                    feature_importance = {name: float(value) for name, value 
                                         in zip(feature_names, np.abs(coef))}
                else:
                    # Multi-class or multi-target
                    avg_importance = np.mean(np.abs(coef), axis=0)
                    feature_importance = {name: float(value) for name, value 
                                         in zip(feature_names, avg_importance)}
        except:
            logger.warning("Could not extract feature importance")
        
        return feature_importance
    
    @safe_operation
    def evaluate_model(self, model_uuid: str, prepared_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluate a trained model.
        
        Args:
            model_uuid: UUID of the trained model
            prepared_data: Data prepared by prepare_data
            
        Returns:
            Dictionary with evaluation results
        """
        # Load the model
        model_path = os.path.join(self.models_dir, f"{model_uuid}.pkl")
        if not os.path.exists(model_path):
            raise ValueError(f"Model with UUID {model_uuid} not found")
            
        with open(model_path, 'rb') as f:
            model_data = pickle.load(f)
            
        model = model_data['model']
        task_type = model_data['task_type']
        
        # Extract test data
        X_test = prepared_data['X_test']
        y_test = prepared_data['y_test']
        
        # Make predictions
        y_pred = model.predict(X_test)
        
        # Calculate metrics based on task type
        if task_type == 'regression':
            results = self._evaluate_regression(y_test, y_pred, X_test, model)
        elif task_type == 'classification':
            results = self._evaluate_classification(y_test, y_pred, X_test, model)
        elif task_type == 'clustering':
            results = self._evaluate_clustering(X_test, model)
        else:
            raise ValueError(f"Unknown task type: {task_type}")
            
        # Add model information to results
        results['model_uuid'] = model_uuid
        results['model_type'] = model_data['training_info']['model_id']
        results['model_name'] = model_data['training_info']['model_name']
        results['task_type'] = task_type
        
        return results
    
    def _evaluate_regression(self, y_true: np.ndarray, y_pred: np.ndarray, 
                           X_test: pd.DataFrame, model: Any) -> Dict[str, Any]:
        """Evaluate regression model."""
        mse = mean_squared_error(y_true, y_pred)
        rmse = np.sqrt(mse)
        mae = mean_absolute_error(y_true, y_pred)
        r2 = r2_score(y_true, y_pred)
        
        return {
            'metrics': {
                'mse': float(mse),
                'rmse': float(rmse),
                'mae': float(mae),
                'r2': float(r2)
            },
            'predictions': {
                'true': y_true.tolist(),
                'predicted': y_pred.tolist()
            }
        }
    
    def _evaluate_classification(self, y_true: np.ndarray, y_pred: np.ndarray, 
                               X_test: pd.DataFrame, model: Any) -> Dict[str, Any]:
        """Evaluate classification model."""
        accuracy = accuracy_score(y_true, y_pred)
        conf_matrix = confusion_matrix(y_true, y_pred)
        class_report = classification_report(y_true, y_pred, output_dict=True)
        
        results = {
            'metrics': {
                'accuracy': float(accuracy),
                'class_report': class_report
            },
            'confusion_matrix': conf_matrix.tolist(),
            'predictions': {
                'true': y_true.tolist(),
                'predicted': y_pred.tolist()
            }
        }
        
        # Add ROC curve data if applicable (binary classification with probability)
        if hasattr(model, 'predict_proba') and len(np.unique(y_true)) == 2:
            y_proba = model.predict_proba(X_test)[:, 1]
            fpr, tpr, thresholds = roc_curve(y_true, y_proba)
            roc_auc = auc(fpr, tpr)
            
            results['roc_curve'] = {
                'fpr': fpr.tolist(),
                'tpr': tpr.tolist(),
                'thresholds': thresholds.tolist(),
                'auc': float(roc_auc)
            }
            
            # Add precision-recall curve
            precision, recall, pr_thresholds = precision_recall_curve(y_true, y_proba)
            
            results['pr_curve'] = {
                'precision': precision.tolist(),
                'recall': recall.tolist(),
                'thresholds': pr_thresholds.tolist()
            }
        
        return results
    
    def _evaluate_clustering(self, X: pd.DataFrame, model: Any) -> Dict[str, Any]:
        """Evaluate clustering model."""
        clusters = model.predict(X)
        centroids = model.cluster_centers_
        
        # Calculate silhouette score if scikit-learn is recent enough
        try:
            from sklearn.metrics import silhouette_score
            sil_score = silhouette_score(X, clusters)
        except:
            sil_score = None
            
        # Calculate inertia (sum of squared distances to closest centroid)
        inertia = model.inertia_
        
        return {
            'metrics': {
                'inertia': float(inertia),
                'silhouette_score': float(sil_score) if sil_score is not None else None,
                'n_clusters': len(centroids)
            },
            'clusters': clusters.tolist(),
            'centroids': centroids.tolist()
        }
    
    @safe_operation
    def predict(self, model_uuid: str, data: pd.DataFrame) -> Dict[str, Any]:
        """
        Make predictions with a trained model.
        
        Args:
            model_uuid: UUID of the trained model
            data: Input data for prediction
            
        Returns:
            Dictionary with predictions
        """
        # Load the model
        model_path = os.path.join(self.models_dir, f"{model_uuid}.pkl")
        if not os.path.exists(model_path):
            raise ValueError(f"Model with UUID {model_uuid} not found")
            
        with open(model_path, 'rb') as f:
            model_data = pickle.load(f)
            
        model = model_data['model']
        task_type = model_data['task_type']
        preprocessing = model_data['preprocessing']
        feature_names = model_data['feature_names']
        
        # Check features
        missing_features = [f for f in feature_names if f not in data.columns]
        
        # Check if feature names need to be derived from categorical variables
        if preprocessing.get('categorical_encoders'):
            # Reconstruct feature list from original features
            original_features = []
            for feature in feature_names:
                # Check if this is an encoded feature
                is_encoded = False
                for col, encoder_info in preprocessing['categorical_encoders'].items():
                    if feature in encoder_info['encoded_names']:
                        is_encoded = True
                        if col not in original_features:
                            original_features.append(col)
                        break
                
                if not is_encoded and feature not in original_features:
                    original_features.append(feature)
            
            # Check missing original features
            missing_features = [f for f in original_features if f not in data.columns]
        
        if missing_features:
            raise ValueError(f"Missing features in input data: {missing_features}")
        
        # Preprocess data
        X = data.copy()
        
        # Apply categorical encoding
        if preprocessing.get('categorical_encoders'):
            for col, encoder_info in preprocessing['categorical_encoders'].items():
                if col in X.columns:
                    encoder = encoder_info['encoder']
                    col_encoded = encoder.transform(X[[col]])
                    
                    # Create DataFrame with encoded columns
                    encoded_names = encoder_info['encoded_names']
                    col_encoded_df = pd.DataFrame(col_encoded, columns=encoded_names, index=X.index)
                    
                    # Add to original dataframe
                    X = pd.concat([X.drop(col, axis=1), col_encoded_df], axis=1)
        
        # Apply feature scaling
        if preprocessing.get('feature_scaler'):
            feature_scaler = preprocessing['feature_scaler']
            X = pd.DataFrame(feature_scaler.transform(X[feature_names]), 
                            columns=feature_names, index=X.index)
        else:
            # Make sure we only include the required features in the right order
            X = X[feature_names]
        
        # Make predictions
        y_pred = model.predict(X)
        
        # For classification, decode labels if needed
        if task_type == 'classification' and preprocessing.get('target_encoder'):
            target_encoder = preprocessing['target_encoder']
            y_pred = target_encoder.inverse_transform(y_pred)
            
            # For probability predictions
            probabilities = None
            if hasattr(model, 'predict_proba'):
                y_proba = model.predict_proba(X)
                probabilities = {
                    'values': y_proba.tolist(),
                    'classes': target_encoder.classes_.tolist()
                }
            
            return {
                'predictions': y_pred.tolist(),
                'probabilities': probabilities
            }
        elif task_type == 'clustering':
            # For clustering, also return distances to cluster centers if possible
            if hasattr(model, 'transform'):
                distances = model.transform(X)
                return {
                    'clusters': y_pred.tolist(),
                    'distances': distances.tolist()
                }
            else:
                return {
                    'clusters': y_pred.tolist()
                }
        else:
            # For regression
            return {
                'predictions': y_pred.tolist()
            }
    
    @safe_operation
    def get_model_info(self, model_uuid: str) -> Dict[str, Any]:
        """
        Get information about a trained model.
        
        Args:
            model_uuid: UUID of the trained model
            
        Returns:
            Dictionary with model information
        """
        # Load the model
        model_path = os.path.join(self.models_dir, f"{model_uuid}.pkl")
        if not os.path.exists(model_path):
            raise ValueError(f"Model with UUID {model_uuid} not found")
            
        with open(model_path, 'rb') as f:
            model_data = pickle.load(f)
        
        # Remove actual model object for serialization
        model_info = {
            'uuid': model_uuid,
            'feature_names': model_data['feature_names'],
            'task_type': model_data['task_type'],
            'training_info': model_data['training_info'],
            'preprocessing_steps': model_data['preprocessing']['steps']
        }
        
        return model_info
    
    @safe_operation
    def list_trained_models(self) -> List[Dict[str, Any]]:
        """
        List all trained models.
        
        Returns:
            List of dictionaries with model information
        """
        models = []
        
        for filename in os.listdir(self.models_dir):
            if filename.endswith('.pkl'):
                model_uuid = filename.split('.')[0]
                try:
                    model_info = self.get_model_info(model_uuid)
                    models.append(model_info)
                except Exception as e:
                    logger.warning(f"Error loading model {model_uuid}: {str(e)}")
        
        return models
    
    @safe_operation
    def delete_model(self, model_uuid: str) -> bool:
        """
        Delete a trained model.
        
        Args:
            model_uuid: UUID of the trained model
            
        Returns:
            True if deletion was successful
        """
        model_path = os.path.join(self.models_dir, f"{model_uuid}.pkl")
        if not os.path.exists(model_path):
            raise ValueError(f"Model with UUID {model_uuid} not found")
            
        os.remove(model_path)
        
        return True
    
    @safe_operation
    def export_model(self, model_uuid: str) -> str:
        """
        Export a trained model as a base64 encoded string.
        
        Args:
            model_uuid: UUID of the trained model
            
        Returns:
            Base64 encoded model data
        """
        model_path = os.path.join(self.models_dir, f"{model_uuid}.pkl")
        if not os.path.exists(model_path):
            raise ValueError(f"Model with UUID {model_uuid} not found")
            
        with open(model_path, 'rb') as f:
            model_bytes = f.read()
            
        return base64.b64encode(model_bytes).decode('utf-8')
    
    @safe_operation
    def import_model(self, model_data: str) -> str:
        """
        Import a model from a base64 encoded string.
        
        Args:
            model_data: Base64 encoded model data
            
        Returns:
            UUID of the imported model
        """
        model_bytes = base64.b64decode(model_data)
        
        # Verify this is a valid model
        try:
            model_obj = pickle.loads(model_bytes)
            if not (isinstance(model_obj, dict) and 'model' in model_obj 
                   and 'task_type' in model_obj and 'feature_names' in model_obj):
                raise ValueError("Invalid model format")
        except:
            raise ValueError("Failed to load model data")
        
        # Generate a unique model ID
        model_uuid = str(uuid.uuid4())
        
        # Save the model
        model_path = os.path.join(self.models_dir, f"{model_uuid}.pkl")
        with open(model_path, 'wb') as f:
            f.write(model_bytes)
        
        return model_uuid
    
    @safe_operation
    def perform_clustering(self, data: pd.DataFrame, n_clusters: int = 3, 
                         algorithm: str = 'kmeans',
                         features: Optional[List[str]] = None,
                         scaling: bool = True) -> Dict[str, Any]:
        """
        Perform clustering analysis.
        
        Args:
            data: Input DataFrame
            n_clusters: Number of clusters
            algorithm: Clustering algorithm to use
            features: Features to use for clustering (default: all numeric)
            scaling: Whether to scale features
            
        Returns:
            Dictionary with clustering results
        """
        # Use all numeric features if none specified
        if features is None:
            features = data.select_dtypes(include=[np.number]).columns.tolist()
        
        # Check features
        missing_features = [f for f in features if f not in data.columns]
        if missing_features:
            raise ValueError(f"Missing features in input data: {missing_features}")
        
        # Extract features
        X = data[features].copy()
        
        # Handle missing values
        X = X.fillna(X.mean())
        
        # Scale features if requested
        scaler = None
        if scaling:
            scaler = StandardScaler()
            X = pd.DataFrame(scaler.fit_transform(X), columns=X.columns, index=X.index)
        
        # Perform clustering
        if algorithm == 'kmeans':
            model = KMeans(n_clusters=n_clusters, random_state=42)
            clusters = model.fit_predict(X)
            centroids = model.cluster_centers_
            inertia = model.inertia_
            
            # Calculate silhouette score if possible
            try:
                from sklearn.metrics import silhouette_score
                sil_score = silhouette_score(X, clusters)
            except:
                sil_score = None
            
            # Perform PCA for visualization if more than 2 dimensions
            if X.shape[1] > 2:
                pca = PCA(n_components=2)
                X_pca = pca.fit_transform(X)
                pca_explained_variance = pca.explained_variance_ratio_
                
                # Project centroids to PCA space
                centroids_pca = pca.transform(centroids)
            else:
                X_pca = X.values
                pca_explained_variance = [1.0, 0.0] if X.shape[1] == 1 else [0.5, 0.5]
                centroids_pca = centroids
            
            # Add cluster labels to original data
            data_with_clusters = data.copy()
            data_with_clusters['cluster'] = clusters
            
            # Calculate statistics for each cluster
            cluster_stats = {}
            for i in range(n_clusters):
                cluster_data = data_with_clusters[data_with_clusters['cluster'] == i]
                stats = {}
                
                for feat in features:
                    stats[feat] = {
                        'mean': float(cluster_data[feat].mean()),
                        'std': float(cluster_data[feat].std()),
                        'min': float(cluster_data[feat].min()),
                        'max': float(cluster_data[feat].max())
                    }
                
                cluster_stats[str(i)] = {
                    'size': int(len(cluster_data)),
                    'percentage': float(len(cluster_data) / len(data) * 100),
                    'features': stats
                }
            
            # Return results
            return {
                'clusters': clusters.tolist(),
                'centroids': centroids.tolist(),
                'metrics': {
                    'inertia': float(inertia),
                    'silhouette_score': float(sil_score) if sil_score is not None else None,
                    'n_clusters': n_clusters
                },
                'visualization': {
                    'pca_points': X_pca.tolist(),
                    'pca_centroids': centroids_pca.tolist(),
                    'pca_explained_variance': pca_explained_variance.tolist()
                },
                'cluster_statistics': cluster_stats
            }
        else:
            raise ValueError(f"Unsupported clustering algorithm: {algorithm}")

# Initialize global ML service
ml_service = MLService()

def get_ml_service() -> MLService:
    """Get the global ML service instance."""
    return ml_service