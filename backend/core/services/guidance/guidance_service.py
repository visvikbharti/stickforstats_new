import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional
import logging
from scipy import stats
from dataclasses import dataclass
import json

# from ...models import Dataset, Analysis, GuidanceRecommendation  # Models don't exist yet
from typing import Any as Dataset  # Placeholder type
from typing import Any as Analysis  # Placeholder type
from typing import Any as GuidanceRecommendation  # Placeholder type

logger = logging.getLogger(__name__)

@dataclass
class AnalysisRecommendation:
    """Class for storing analysis recommendations."""
    analysis_type: str
    confidence: float  # 0.0 to 1.0
    description: str
    requirements: Dict[str, Any]
    suggested_parameters: Dict[str, Any]
    details: Optional[Dict[str, Any]] = None
    module_recommendations: Optional[List[str]] = None

class GuidanceService:
    """
    Autonomous guidance system for statistical analysis.
    
    This service analyzes datasets and user goals to recommend
    appropriate statistical analyses and visualizations.
    """
    
    def __init__(self):
        """Initialize the guidance service."""
        self.recommendation_rules = {}
        self.setup_standard_recommendation_rules()
    
    def analyze_dataset(self, dataset: Dataset) -> Dict[str, Any]:
        """
        Analyze a dataset to extract characteristics for guidance.
        
        Args:
            dataset: The Dataset object to analyze
            
        Returns:
            A dictionary of dataset characteristics
        """
        try:
            # Load the data
            data = self._load_dataset(dataset)
            if data is None:
                return {'error': 'Failed to load dataset'}
            
            # Extract dataset characteristics
            characteristics = {
                'n_rows': len(data),
                'n_columns': len(data.columns),
                'column_types': {col: str(dtype) for col, dtype in data.dtypes.items()},
                'numeric_columns': [col for col in data.columns if pd.api.types.is_numeric_dtype(data[col])],
                'categorical_columns': [col for col in data.columns if pd.api.types.is_categorical_dtype(data[col]) or pd.api.types.is_object_dtype(data[col])],
                'datetime_columns': [col for col in data.columns if pd.api.types.is_datetime64_dtype(data[col])],
                'missing_values': data.isna().sum().to_dict(),
                'cardinality': {col: data[col].nunique() for col in data.columns},
                'numeric_stats': {},
                'correlation_summary': {},
                'distribution_summary': {}
            }
            
            # Add numeric column statistics
            for col in characteristics['numeric_columns']:
                try:
                    characteristics['numeric_stats'][col] = {
                        'mean': float(data[col].mean()),
                        'median': float(data[col].median()),
                        'std': float(data[col].std()),
                        'min': float(data[col].min()),
                        'max': float(data[col].max()),
                        'skew': float(stats.skew(data[col].dropna())),
                        'kurtosis': float(stats.kurtosis(data[col].dropna()))
                    }
                except Exception as e:
                    logger.warning(f"Error computing stats for column {col}: {str(e)}")
            
            # Add correlation information for numeric columns
            if len(characteristics['numeric_columns']) > 1:
                try:
                    corr_matrix = data[characteristics['numeric_columns']].corr()
                    characteristics['correlation_summary'] = {
                        'max_correlation': float(corr_matrix.abs().unstack().sort_values(ascending=False)[1]),
                        'correlated_pairs': [
                            {'col1': col1, 'col2': col2, 'correlation': float(corr_matrix.loc[col1, col2])}
                            for col1 in corr_matrix.columns
                            for col2 in corr_matrix.columns
                            if col1 < col2 and abs(corr_matrix.loc[col1, col2]) > 0.7
                        ]
                    }
                except Exception as e:
                    logger.warning(f"Error computing correlation matrix: {str(e)}")
            
            # Check for normality in numeric columns
            for col in characteristics['numeric_columns']:
                try:
                    # Skip if too many missing values
                    if data[col].isna().sum() > len(data) * 0.2:
                        continue
                    
                    # Use Shapiro-Wilk test for normality
                    # Only use up to 5000 samples for performance
                    sample = data[col].dropna()
                    if len(sample) > 5000:
                        sample = sample.sample(5000)
                    
                    shapiro_test = stats.shapiro(sample)
                    characteristics['distribution_summary'][col] = {
                        'shapiro_statistic': float(shapiro_test[0]),
                        'shapiro_pvalue': float(shapiro_test[1]),
                        'is_normal': shapiro_test[1] > 0.05
                    }
                except Exception as e:
                    logger.warning(f"Error checking normality for column {col}: {str(e)}")
            
            return characteristics
                
        except Exception as e:
            logger.error(f"Error analyzing dataset: {str(e)}")
            return {'error': str(e)}
    
    def _load_dataset(self, dataset: Dataset) -> Optional[pd.DataFrame]:
        """
        Load a dataset from its file path.
        
        Args:
            dataset: The Dataset object to load
            
        Returns:
            The loaded DataFrame or None if loading fails
        """
        try:
            if not dataset.file_path:
                logger.error(f"Dataset {dataset.id} has no file path")
                return None
            
            if dataset.file_type == 'csv':
                return pd.read_csv(dataset.file_path)
            elif dataset.file_type in ['xlsx', 'xls']:
                return pd.read_excel(dataset.file_path)
            else:
                logger.error(f"Unsupported file type: {dataset.file_type}")
                return None
                
        except Exception as e:
            logger.error(f"Error loading dataset {dataset.id}: {str(e)}")
            return None
    
    def get_analysis_recommendations(self, dataset_characteristics: Dict[str, Any], 
                                   user_goals: Optional[Dict[str, Any]] = None) -> List[AnalysisRecommendation]:
        """
        Generate analysis recommendations based on dataset characteristics and user goals.
        
        Args:
            dataset_characteristics: The characteristics of the dataset
            user_goals: Optional user-specified analysis goals
            
        Returns:
            A list of AnalysisRecommendation objects
        """
        recommendations = []
        
        # Check if there was an error in dataset analysis
        if 'error' in dataset_characteristics:
            return []
        
        # Apply each recommendation rule
        for analysis_type, rule in self.recommendation_rules.items():
            try:
                # Check if this analysis type is applicable
                if rule['condition'](dataset_characteristics, user_goals):
                    # Compute confidence score
                    confidence = rule['confidence_calculator'](dataset_characteristics, user_goals)
                    
                    # Generate parameters
                    parameters = rule['parameter_generator'](dataset_characteristics, user_goals)
                    
                    # Create a recommendation
                    recommendation = AnalysisRecommendation(
                        analysis_type=analysis_type,
                        confidence=confidence,
                        description=rule['description'],
                        requirements=rule['requirements'],
                        suggested_parameters=parameters,
                        details=rule.get('details', {}),
                        module_recommendations=rule.get('module_recommendations', [])
                    )
                    
                    recommendations.append(recommendation)
            except Exception as e:
                logger.error(f"Error applying recommendation rule for {analysis_type}: {str(e)}")
        
        # Sort recommendations by confidence
        recommendations.sort(key=lambda x: x.confidence, reverse=True)
        
        return recommendations
    
    def setup_standard_recommendation_rules(self):
        """Set up standard recommendation rules for common analysis types."""
        # Descriptive statistics
        self.recommendation_rules['descriptive_statistics'] = {
            'condition': lambda chars, goals: len(chars.get('numeric_columns', [])) > 0,
            'confidence_calculator': lambda chars, goals: 1.0,  # Always high confidence for descriptive stats
            'description': "Compute descriptive statistics for numeric columns",
            'requirements': {
                'numeric_columns': True
            },
            'parameter_generator': lambda chars, goals: {
                'columns': chars.get('numeric_columns', [])
            },
            'module_recommendations': ['basic_statistics']
        }
        
        # Correlation analysis
        self.recommendation_rules['correlation_analysis'] = {
            'condition': lambda chars, goals: len(chars.get('numeric_columns', [])) >= 2,
            'confidence_calculator': lambda chars, goals: min(1.0, 0.5 + 0.1 * len(chars.get('numeric_columns', []))),
            'description': "Analyze correlations between numeric variables",
            'requirements': {
                'min_numeric_columns': 2
            },
            'parameter_generator': lambda chars, goals: {
                'columns': chars.get('numeric_columns', []),
                'method': 'pearson'
            },
            'module_recommendations': ['basic_statistics', 'probability_distributions']
        }
        
        # T-test (independent samples)
        self.recommendation_rules['t_test_independent'] = {
            'condition': lambda chars, goals: (
                len(chars.get('numeric_columns', [])) >= 1 and
                len(chars.get('categorical_columns', [])) >= 1 and
                any(chars.get('cardinality', {}).get(col, 0) == 2 
                    for col in chars.get('categorical_columns', []))
            ),
            'confidence_calculator': lambda chars, goals: 
                0.7 if any(chars.get('distribution_summary', {}).get(col, {}).get('is_normal', False) 
                         for col in chars.get('numeric_columns', [])) else 0.4,
            'description': "Compare means between two independent groups",
            'requirements': {
                'numeric_column': True,
                'binary_categorical': True
            },
            'parameter_generator': lambda chars, goals: {
                'numeric_column': chars.get('numeric_columns', [])[0],
                'group_column': next((col for col in chars.get('categorical_columns', []) 
                                     if chars.get('cardinality', {}).get(col, 0) == 2), None),
                'equal_variance': True
            },
            'module_recommendations': ['basic_statistics', 'confidence_intervals']
        }
        
        # ANOVA
        self.recommendation_rules['anova'] = {
            'condition': lambda chars, goals: (
                len(chars.get('numeric_columns', [])) >= 1 and
                len(chars.get('categorical_columns', [])) >= 1 and
                any(chars.get('cardinality', {}).get(col, 0) > 2 
                    for col in chars.get('categorical_columns', []))
            ),
            'confidence_calculator': lambda chars, goals: 
                0.8 if any(chars.get('distribution_summary', {}).get(col, {}).get('is_normal', False) 
                         for col in chars.get('numeric_columns', [])) else 0.5,
            'description': "Compare means across multiple groups (ANOVA)",
            'requirements': {
                'numeric_column': True,
                'multi_categorical': True
            },
            'parameter_generator': lambda chars, goals: {
                'numeric_column': chars.get('numeric_columns', [])[0],
                'group_column': next((col for col in chars.get('categorical_columns', []) 
                                     if chars.get('cardinality', {}).get(col, 0) > 2), None)
            },
            'module_recommendations': ['basic_statistics', 'doe_analysis']
        }
        
        # Simple linear regression
        self.recommendation_rules['simple_linear_regression'] = {
            'condition': lambda chars, goals: (
                len(chars.get('numeric_columns', [])) >= 2 and
                chars.get('correlation_summary', {}).get('max_correlation', 0) > 0.3
            ),
            'confidence_calculator': lambda chars, goals: 
                min(1.0, 0.4 + 0.6 * chars.get('correlation_summary', {}).get('max_correlation', 0)),
            'description': "Predict a continuous outcome using a linear model",
            'requirements': {
                'min_numeric_columns': 2,
                'correlation': True
            },
            'parameter_generator': lambda chars, goals: {
                # Recommend the most correlated pair for regression
                'dependent_var': chars.get('correlation_summary', {}).get('correlated_pairs', [{}])[0].get('col1', 
                                                                                                          chars.get('numeric_columns', [])[0]),
                'independent_var': chars.get('correlation_summary', {}).get('correlated_pairs', [{}])[0].get('col2', 
                                                                                                            chars.get('numeric_columns', [])[1])
            },
            'module_recommendations': ['basic_statistics', 'confidence_intervals']
        }
        
        # Chi-squared test
        self.recommendation_rules['chi_squared'] = {
            'condition': lambda chars, goals: len(chars.get('categorical_columns', [])) >= 2,
            'confidence_calculator': lambda chars, goals: 0.7,
            'description': "Test association between categorical variables",
            'requirements': {
                'min_categorical_columns': 2
            },
            'parameter_generator': lambda chars, goals: {
                'columns': chars.get('categorical_columns', [])[:2]
            },
            'module_recommendations': ['probability_distributions']
        }
        
        # Time series analysis
        self.recommendation_rules['time_series_analysis'] = {
            'condition': lambda chars, goals: len(chars.get('datetime_columns', [])) > 0 and len(chars.get('numeric_columns', [])) > 0,
            'confidence_calculator': lambda chars, goals: 0.9,
            'description': "Analyze trends over time in your data",
            'requirements': {
                'datetime_column': True,
                'numeric_column': True
            },
            'parameter_generator': lambda chars, goals: {
                'datetime_column': chars.get('datetime_columns', [])[0],
                'value_column': chars.get('numeric_columns', [])[0]
            },
            'module_recommendations': ['pca_analysis', 'doe_analysis']
        }
        
        # Cluster analysis
        self.recommendation_rules['cluster_analysis'] = {
            'condition': lambda chars, goals: len(chars.get('numeric_columns', [])) >= 3,
            'confidence_calculator': lambda chars, goals: min(0.8, 0.4 + 0.1 * len(chars.get('numeric_columns', []))),
            'description': "Find natural groupings in your multivariate data",
            'requirements': {
                'min_numeric_columns': 3
            },
            'parameter_generator': lambda chars, goals: {
                'columns': chars.get('numeric_columns', [])[:5],  # Limit to 5 columns for initial analysis
                'n_clusters': 'auto'
            },
            'module_recommendations': ['pca_analysis']
        }
        
        # Principal Component Analysis
        self.recommendation_rules['pca'] = {
            'condition': lambda chars, goals: (
                len(chars.get('numeric_columns', [])) >= 4 and
                len(chars.get('correlation_summary', {}).get('correlated_pairs', [])) > 0
            ),
            'confidence_calculator': lambda chars, goals: min(0.9, 0.5 + 0.05 * len(chars.get('numeric_columns', []))),
            'description': "Reduce dimensionality and extract principal components",
            'requirements': {
                'min_numeric_columns': 4,
                'correlated_features': True
            },
            'parameter_generator': lambda chars, goals: {
                'columns': chars.get('numeric_columns', []),
                'n_components': min(3, len(chars.get('numeric_columns', [])) - 1)
            },
            'module_recommendations': ['pca_analysis']
        }
        
        # Non-parametric tests (when data is not normal)
        self.recommendation_rules['non_parametric_tests'] = {
            'condition': lambda chars, goals: (
                len(chars.get('numeric_columns', [])) > 0 and
                chars.get('distribution_summary', {}) and
                not any(chars.get('distribution_summary', {}).get(col, {}).get('is_normal', True) 
                      for col in chars.get('distribution_summary', {}))
            ),
            'confidence_calculator': lambda chars, goals: 0.8,
            'description': "Use non-parametric tests for non-normally distributed data",
            'requirements': {
                'numeric_column': True,
                'not_normal': True
            },
            'parameter_generator': lambda chars, goals: {
                'columns': [col for col in chars.get('distribution_summary', {}) 
                           if not chars.get('distribution_summary', {}).get(col, {}).get('is_normal', True)]
            },
            'module_recommendations': ['basic_statistics', 'probability_distributions']
        }
        
        # Outlier detection
        self.recommendation_rules['outlier_detection'] = {
            'condition': lambda chars, goals: (
                len(chars.get('numeric_columns', [])) > 0 and
                any(chars.get('numeric_stats', {}).get(col, {}).get('skew', 0) > 2 or
                    chars.get('numeric_stats', {}).get(col, {}).get('kurtosis', 0) > 3
                    for col in chars.get('numeric_stats', {}))
            ),
            'confidence_calculator': lambda chars, goals: 0.7,
            'description': "Detect and analyze outliers in your data",
            'requirements': {
                'numeric_column': True
            },
            'parameter_generator': lambda chars, goals: {
                'columns': [col for col in chars.get('numeric_stats', {}) 
                           if chars.get('numeric_stats', {}).get(col, {}).get('skew', 0) > 2 or
                              chars.get('numeric_stats', {}).get(col, {}).get('kurtosis', 0) > 3]
            },
            'module_recommendations': ['sqc_analysis']
        }
        
        # Statistical Process Control (for quality control data)
        self.recommendation_rules['statistical_process_control'] = {
            'condition': lambda chars, goals: (
                len(chars.get('numeric_columns', [])) > 0 and
                len(chars.get('datetime_columns', [])) > 0
            ),
            'confidence_calculator': lambda chars, goals: 0.6,  # Lower confidence as it's a specialized analysis
            'description': "Monitor process quality using control charts",
            'requirements': {
                'numeric_column': True,
                'datetime_column': True
            },
            'parameter_generator': lambda chars, goals: {
                'measurement_column': chars.get('numeric_columns', [])[0],
                'time_column': chars.get('datetime_columns', [])[0],
                'chart_type': 'xbar_r'
            },
            'module_recommendations': ['sqc_analysis']
        }
        
        # Random forest (for complex relationships)
        self.recommendation_rules['random_forest'] = {
            'condition': lambda chars, goals: (
                len(chars.get('numeric_columns', [])) >= 3 and
                len(chars.get('categorical_columns', [])) >= 1
            ),
            'confidence_calculator': lambda chars, goals: 0.6,
            'description': "Build a random forest model for prediction or classification",
            'requirements': {
                'min_numeric_columns': 3,
                'target_column': True
            },
            'parameter_generator': lambda chars, goals: {
                'features': chars.get('numeric_columns', [])[:-1],
                'target': chars.get('numeric_columns', [])[-1] if goals is None else 
                          goals.get('target_column', chars.get('numeric_columns', [])[-1])
            },
            'module_recommendations': ['pca_analysis', 'confidence_intervals']
        }
    
    def save_recommendations(self, user_id, dataset_id, recommendations: List[AnalysisRecommendation]) -> bool:
        """
        Save analysis recommendations to the database.
        
        Args:
            user_id: The ID of the user
            dataset_id: The ID of the dataset
            recommendations: List of AnalysisRecommendation objects
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Convert recommendations to JSON-serializable format
            rec_data = []
            for rec in recommendations:
                rec_data.append({
                    'analysis_type': rec.analysis_type,
                    'confidence': rec.confidence,
                    'description': rec.description,
                    'requirements': rec.requirements,
                    'suggested_parameters': rec.suggested_parameters,
                    'details': rec.details,
                    'module_recommendations': rec.module_recommendations
                })
            
            # Create recommendation in database
            GuidanceRecommendation.objects.create(
                user_id=user_id,
                context_data={
                    'dataset_id': str(dataset_id)
                },
                recommendation_type='analysis_recommendations',
                recommendation={
                    'recommendations': rec_data,
                    'timestamp': pd.Timestamp.now().isoformat()
                }
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error saving recommendations: {str(e)}")
            return False