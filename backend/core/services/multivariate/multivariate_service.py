"""
Multivariate Analysis Service
==============================

Comprehensive multivariate statistical analysis capabilities.

Author: StickForStats Development Team
Date: 2025-08-26
Version: 1.0.0
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple, Optional, Union
from dataclasses import dataclass
import warnings
from scipy import stats, linalg
from scipy.spatial.distance import cdist, pdist, squareform
from scipy.cluster.hierarchy import dendrogram, linkage, fcluster
from sklearn.discriminant_analysis import LinearDiscriminantAnalysis, QuadraticDiscriminantAnalysis
from sklearn.decomposition import FactorAnalysis, PCA
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans, AgglomerativeClustering, DBSCAN
from sklearn.manifold import MDS
from sklearn.metrics import silhouette_score, calinski_harabasz_score, davies_bouldin_score
from sklearn.covariance import EmpiricalCovariance, MinCovDet
from statsmodels.multivariate.manova import MANOVA as StatsMANOVA
from statsmodels.multivariate.multivariate_ols import _MultivariateOLS
from factor_analyzer import FactorAnalyzer, calculate_bartlett_sphericity, calculate_kmo
import prince


@dataclass
class MultivariateResults:
    """Container for multivariate analysis results."""
    method: str
    test_statistics: Dict[str, float]
    p_values: Dict[str, float]
    effect_sizes: Dict[str, float]
    loadings: Optional[np.ndarray] = None
    scores: Optional[np.ndarray] = None
    eigenvalues: Optional[np.ndarray] = None
    explained_variance: Optional[np.ndarray] = None
    clusters: Optional[np.ndarray] = None
    classification_accuracy: Optional[float] = None
    additional_info: Dict[str, Any] = None
    
    def summary(self) -> str:
        """Generate summary of multivariate results."""
        summary_lines = [
            f"Multivariate Analysis: {self.method}",
            "=" * 50
        ]
        
        # Add test statistics
        if self.test_statistics:
            summary_lines.append("\nTest Statistics:")
            for stat_name, stat_value in self.test_statistics.items():
                summary_lines.append(f"  {stat_name}: {stat_value:.4f}")
        
        # Add p-values
        if self.p_values:
            summary_lines.append("\nP-values:")
            for test_name, p_value in self.p_values.items():
                sig = "***" if p_value < 0.001 else "**" if p_value < 0.01 else "*" if p_value < 0.05 else ""
                summary_lines.append(f"  {test_name}: {p_value:.4f} {sig}")
        
        # Add effect sizes
        if self.effect_sizes:
            summary_lines.append("\nEffect Sizes:")
            for effect_name, effect_value in self.effect_sizes.items():
                summary_lines.append(f"  {effect_name}: {effect_value:.4f}")
        
        # Add explained variance for dimension reduction methods
        if self.explained_variance is not None:
            summary_lines.append("\nExplained Variance:")
            cumulative = np.cumsum(self.explained_variance)
            for i, (var, cum_var) in enumerate(zip(self.explained_variance[:5], cumulative[:5])):
                summary_lines.append(f"  Component {i+1}: {var:.2%} (Cumulative: {cum_var:.2%})")
        
        # Add classification accuracy if available
        if self.classification_accuracy is not None:
            summary_lines.append(f"\nClassification Accuracy: {self.classification_accuracy:.2%}")
        
        # Add cluster validation metrics if available
        if self.additional_info and 'cluster_validation' in self.additional_info:
            summary_lines.append("\nCluster Validation:")
            for metric, value in self.additional_info['cluster_validation'].items():
                summary_lines.append(f"  {metric}: {value:.4f}")
        
        return "\n".join(summary_lines)


class MultivariateService:
    """
    Comprehensive multivariate analysis service.
    
    Provides advanced multivariate statistical methods including:
    - MANOVA (Multivariate Analysis of Variance)
    - Canonical Correlation Analysis
    - Discriminant Analysis (LDA, QDA)
    - Factor Analysis
    - Cluster Analysis
    - Multidimensional Scaling
    - Correspondence Analysis
    """
    
    def __init__(self):
        """Initialize the multivariate service."""
        self.scaler = StandardScaler()
        
    def manova(self, data: pd.DataFrame, dependent_vars: List[str],
               independent_vars: List[str]) -> MultivariateResults:
        """
        Perform Multivariate Analysis of Variance (MANOVA).
        
        Args:
            data: DataFrame containing the data
            dependent_vars: List of dependent variable names
            independent_vars: List of independent variable names
            
        Returns:
            MultivariateResults object
        """
        # Prepare formula
        dep_formula = ' + '.join(dependent_vars)
        ind_formula = ' + '.join(independent_vars)
        formula = f"{dep_formula} ~ {ind_formula}"
        
        # Fit MANOVA
        manova_model = StatsMANOVA.from_formula(formula, data)
        manova_results = manova_model.mv_test()
        
        # Extract test statistics
        test_statistics = {}
        p_values = {}
        effect_sizes = {}
        
        # Parse the results for each independent variable
        for ind_var in independent_vars:
            var_results = manova_results.results[ind_var]['stat']
            
            # Wilks' Lambda
            wilks = var_results.loc["Wilks' lambda"]
            test_statistics[f"{ind_var}_Wilks_Lambda"] = wilks['Value'].values[0]
            p_values[f"{ind_var}_Wilks"] = wilks['Pr > F'].values[0]
            
            # Pillai's Trace
            pillai = var_results.loc["Pillai's trace"]
            test_statistics[f"{ind_var}_Pillai"] = pillai['Value'].values[0]
            p_values[f"{ind_var}_Pillai"] = pillai['Pr > F'].values[0]
            
            # Hotelling-Lawley Trace
            hotelling = var_results.loc["Hotelling-Lawley trace"]
            test_statistics[f"{ind_var}_Hotelling"] = hotelling['Value'].values[0]
            p_values[f"{ind_var}_Hotelling"] = hotelling['Pr > F'].values[0]
            
            # Roy's Greatest Root
            roy = var_results.loc["Roy's greatest root"]
            test_statistics[f"{ind_var}_Roy"] = roy['Value'].values[0]
            p_values[f"{ind_var}_Roy"] = roy['Pr > F'].values[0]
            
            # Calculate multivariate eta-squared from Wilks' Lambda
            wilks_value = wilks['Value'].values[0]
            eta_squared = 1 - wilks_value
            effect_sizes[f"{ind_var}_eta_squared"] = eta_squared
        
        # Perform follow-up univariate ANOVAs
        univariate_results = {}
        for dep_var in dependent_vars:
            for ind_var in independent_vars:
                # Simple one-way ANOVA for each dependent variable
                groups = [group[dep_var].values for name, group in data.groupby(ind_var)]
                f_stat, p_val = stats.f_oneway(*groups)
                univariate_results[f"{dep_var}_{ind_var}"] = {
                    'F_statistic': f_stat,
                    'p_value': p_val
                }
        
        additional_info = {
            'univariate_anovas': univariate_results,
            'dependent_vars': dependent_vars,
            'independent_vars': independent_vars
        }
        
        return MultivariateResults(
            method='MANOVA',
            test_statistics=test_statistics,
            p_values=p_values,
            effect_sizes=effect_sizes,
            additional_info=additional_info
        )
    
    def canonical_correlation(self, X: np.ndarray, Y: np.ndarray) -> Dict[str, Any]:
        """
        Perform Canonical Correlation Analysis (CCA).
        
        Args:
            X: First set of variables (n_samples, n_features_X)
            Y: Second set of variables (n_samples, n_features_Y)
            
        Returns:
            Dictionary containing CCA results
        """
        # Standardize data
        X_std = self.scaler.fit_transform(X)
        Y_std = StandardScaler().fit_transform(Y)
        
        n = X_std.shape[0]
        p = X_std.shape[1]
        q = Y_std.shape[1]
        
        # Compute covariance matrices
        Cxx = np.cov(X_std.T)
        Cyy = np.cov(Y_std.T)
        Cxy = np.cov(X_std.T, Y_std.T)[:p, p:]
        
        # Regularize if needed
        Cxx = Cxx + 1e-8 * np.eye(p)
        Cyy = Cyy + 1e-8 * np.eye(q)
        
        # Solve eigenvalue problem
        inv_Cxx = np.linalg.inv(Cxx)
        inv_Cyy = np.linalg.inv(Cyy)
        
        # Compute canonical correlations
        M = inv_Cxx @ Cxy @ inv_Cyy @ Cxy.T
        eigenvalues, eigenvectors_X = np.linalg.eig(M)
        
        # Sort by eigenvalues
        idx = np.argsort(eigenvalues)[::-1]
        eigenvalues = eigenvalues[idx]
        eigenvectors_X = eigenvectors_X[:, idx]
        
        # Canonical correlations are square roots of eigenvalues
        canonical_correlations = np.sqrt(np.abs(eigenvalues[:min(p, q)]))
        
        # Compute canonical weights for Y
        eigenvectors_Y = inv_Cyy @ Cxy.T @ eigenvectors_X
        
        # Normalize
        for i in range(eigenvectors_X.shape[1]):
            eigenvectors_X[:, i] /= np.linalg.norm(eigenvectors_X[:, i])
            eigenvectors_Y[:, i] /= np.linalg.norm(eigenvectors_Y[:, i])
        
        # Compute canonical variates
        X_scores = X_std @ eigenvectors_X
        Y_scores = Y_std @ eigenvectors_Y[:, :eigenvectors_X.shape[1]]
        
        # Wilks' Lambda test for significance
        n_pairs = min(p, q)
        wilks_lambda = np.prod(1 - canonical_correlations[:n_pairs]**2)
        
        # Bartlett's chi-square approximation
        chi_square = -(n - 1 - (p + q + 1) / 2) * np.log(wilks_lambda)
        df = p * q
        p_value = 1 - stats.chi2.cdf(chi_square, df)
        
        # Redundancy analysis
        X_var_explained = np.var(X_scores, axis=0) / np.sum(np.var(X_std, axis=0))
        Y_var_explained = np.var(Y_scores, axis=0) / np.sum(np.var(Y_std, axis=0))
        
        return {
            'canonical_correlations': canonical_correlations,
            'X_weights': eigenvectors_X,
            'Y_weights': eigenvectors_Y,
            'X_scores': X_scores,
            'Y_scores': Y_scores,
            'wilks_lambda': wilks_lambda,
            'chi_square': chi_square,
            'p_value': p_value,
            'X_variance_explained': X_var_explained,
            'Y_variance_explained': Y_var_explained
        }
    
    def discriminant_analysis(self, X: np.ndarray, y: np.ndarray,
                            method: str = 'linear',
                            priors: Optional[np.ndarray] = None) -> MultivariateResults:
        """
        Perform Linear or Quadratic Discriminant Analysis.
        
        Args:
            X: Feature matrix (n_samples, n_features)
            y: Target labels
            method: 'linear' for LDA, 'quadratic' for QDA
            priors: Prior probabilities for each class
            
        Returns:
            MultivariateResults object
        """
        # Standardize features
        X_std = self.scaler.fit_transform(X)
        
        # Fit discriminant analysis
        if method == 'linear':
            da = LinearDiscriminantAnalysis(priors=priors)
        else:
            da = QuadraticDiscriminantAnalysis(priors=priors)
        
        da.fit(X_std, y)
        
        # Get predictions and accuracy
        predictions = da.predict(X_std)
        accuracy = np.mean(predictions == y)
        
        # Compute confusion matrix
        from sklearn.metrics import confusion_matrix
        conf_matrix = confusion_matrix(y, predictions)
        
        # For LDA, get discriminant coefficients
        loadings = None
        scores = None
        explained_variance = None
        
        if method == 'linear':
            # Linear discriminants
            loadings = da.coef_
            scores = da.transform(X_std)
            explained_variance = da.explained_variance_ratio_ if hasattr(da, 'explained_variance_ratio_') else None
            
            # Compute Wilks' Lambda for overall model
            n_samples = X.shape[0]
            n_features = X.shape[1]
            n_classes = len(np.unique(y))
            
            # Between and within scatter matrices
            overall_mean = np.mean(X_std, axis=0)
            Sw = np.zeros((n_features, n_features))  # Within scatter
            Sb = np.zeros((n_features, n_features))  # Between scatter
            
            for class_label in np.unique(y):
                class_data = X_std[y == class_label]
                class_mean = np.mean(class_data, axis=0)
                
                # Within scatter
                Sw += (class_data - class_mean).T @ (class_data - class_mean)
                
                # Between scatter
                n_class = len(class_data)
                mean_diff = (class_mean - overall_mean).reshape(-1, 1)
                Sb += n_class * (mean_diff @ mean_diff.T)
            
            # Wilks' Lambda
            try:
                wilks_lambda = np.linalg.det(Sw) / np.linalg.det(Sw + Sb)
            except:
                wilks_lambda = np.nan
            
            # Approximate F-statistic for Wilks' Lambda
            if not np.isnan(wilks_lambda):
                p = n_features
                g = n_classes
                n = n_samples
                
                # Rao's F approximation
                t = np.sqrt((p**2 * (g-1)**2 - 4) / (p**2 + (g-1)**2 - 5))
                df1 = p * (g - 1)
                df2 = (n - g - p + 1) * t - df1/2 + 1
                
                F_stat = ((1 - wilks_lambda**(1/t)) / wilks_lambda**(1/t)) * (df2 / df1)
                p_value = 1 - stats.f.cdf(F_stat, df1, df2)
            else:
                F_stat = np.nan
                p_value = np.nan
        else:
            wilks_lambda = np.nan
            F_stat = np.nan
            p_value = np.nan
        
        # Classification report
        from sklearn.metrics import classification_report
        class_report = classification_report(y, predictions, output_dict=True)
        
        test_statistics = {
            'accuracy': accuracy,
            'wilks_lambda': wilks_lambda,
            'F_statistic': F_stat
        }
        
        p_values = {
            'overall_model': p_value
        }
        
        # Mahalanobis distance for each observation
        mahal_distances = []
        for i, class_label in enumerate(np.unique(y)):
            class_data = X_std[y == class_label]
            class_mean = np.mean(class_data, axis=0)
            class_cov = np.cov(class_data.T)
            
            # Compute Mahalanobis distance for each point in this class
            for x in class_data:
                diff = x - class_mean
                inv_cov = np.linalg.pinv(class_cov)
                mahal_dist = np.sqrt(diff @ inv_cov @ diff)
                mahal_distances.append(mahal_dist)
        
        additional_info = {
            'confusion_matrix': conf_matrix,
            'classification_report': class_report,
            'mahalanobis_distances': np.array(mahal_distances),
            'method': method.upper()
        }
        
        return MultivariateResults(
            method=f'{method.upper()} Discriminant Analysis',
            test_statistics=test_statistics,
            p_values=p_values,
            effect_sizes={},
            loadings=loadings,
            scores=scores,
            explained_variance=explained_variance,
            classification_accuracy=accuracy,
            additional_info=additional_info
        )
    
    def factor_analysis(self, X: np.ndarray, n_factors: Optional[int] = None,
                       rotation: str = 'varimax',
                       method: str = 'minres') -> MultivariateResults:
        """
        Perform Factor Analysis with rotation.
        
        Args:
            X: Data matrix (n_samples, n_features)
            n_factors: Number of factors to extract
            rotation: Rotation method ('varimax', 'promax', 'oblimin', 'none')
            method: Extraction method ('minres', 'ml', 'principal')
            
        Returns:
            MultivariateResults object
        """
        # Standardize data
        X_std = self.scaler.fit_transform(X)
        
        # Test for factorability
        chi_square_value, p_value = calculate_bartlett_sphericity(X_std)
        kmo_all, kmo_model = calculate_kmo(X_std)
        
        # Determine number of factors if not specified
        if n_factors is None:
            # Use parallel analysis or Kaiser criterion
            pca = PCA()
            pca.fit(X_std)
            eigenvalues = pca.explained_variance_
            n_factors = np.sum(eigenvalues > 1)  # Kaiser criterion
            n_factors = max(1, min(n_factors, X.shape[1] - 1))
        
        # Perform factor analysis
        fa = FactorAnalyzer(n_factors=n_factors, rotation=rotation, method=method)
        fa.fit(X_std)
        
        # Get loadings and scores
        loadings = fa.loadings_
        scores = fa.transform(X_std)
        eigenvalues = fa.get_eigenvalues()[0]
        
        # Calculate communalities
        communalities = fa.get_communalities()
        
        # Calculate uniqueness (specific variance)
        uniqueness = fa.get_uniquenesses()
        
        # Variance explained
        total_variance = np.sum(fa.get_eigenvalues()[0])
        var_explained = fa.get_eigenvalues()[0][:n_factors] / total_variance
        cumulative_var = np.cumsum(var_explained)
        
        # Factor correlations (for oblique rotations)
        factor_corr = fa.phi_ if hasattr(fa, 'phi_') and fa.phi_ is not None else np.eye(n_factors)
        
        # Structure matrix (for oblique rotations)
        structure_matrix = loadings @ factor_corr if rotation in ['oblimin', 'promax'] else loadings
        
        # Test statistics
        test_statistics = {
            'bartlett_chi_square': chi_square_value,
            'kmo_overall': kmo_model,
            'n_factors': n_factors
        }
        
        p_values = {
            'bartlett_test': p_value
        }
        
        effect_sizes = {
            'total_variance_explained': np.sum(var_explained)
        }
        
        additional_info = {
            'communalities': communalities,
            'uniqueness': uniqueness,
            'kmo_per_variable': kmo_all,
            'rotation_method': rotation,
            'extraction_method': method,
            'factor_correlations': factor_corr,
            'structure_matrix': structure_matrix,
            'cumulative_variance': cumulative_var
        }
        
        return MultivariateResults(
            method='Factor Analysis',
            test_statistics=test_statistics,
            p_values=p_values,
            effect_sizes=effect_sizes,
            loadings=loadings,
            scores=scores,
            eigenvalues=eigenvalues,
            explained_variance=var_explained,
            additional_info=additional_info
        )
    
    def cluster_analysis(self, X: np.ndarray, method: str = 'kmeans',
                        n_clusters: Optional[int] = None,
                        linkage_method: str = 'ward') -> MultivariateResults:
        """
        Perform cluster analysis using various methods.
        
        Args:
            X: Data matrix (n_samples, n_features)
            method: Clustering method ('kmeans', 'hierarchical', 'dbscan')
            n_clusters: Number of clusters (auto-detect if None)
            linkage_method: Linkage for hierarchical clustering
            
        Returns:
            MultivariateResults object
        """
        # Standardize data
        X_std = self.scaler.fit_transform(X)
        
        # Determine optimal number of clusters if not specified
        if n_clusters is None and method != 'dbscan':
            n_clusters = self._find_optimal_clusters(X_std, method)
        
        # Perform clustering
        if method == 'kmeans':
            clusterer = KMeans(n_clusters=n_clusters, random_state=42)
            clusters = clusterer.fit_predict(X_std)
            centers = clusterer.cluster_centers_
            inertia = clusterer.inertia_
            
        elif method == 'hierarchical':
            # Compute linkage matrix
            linkage_matrix = linkage(X_std, method=linkage_method)
            
            # Cut tree to get clusters
            clusters = fcluster(linkage_matrix, n_clusters, criterion='maxclust')
            clusters = clusters - 1  # Zero-index
            
            # Compute cluster centers
            centers = np.array([X_std[clusters == i].mean(axis=0) 
                              for i in range(n_clusters)])
            
            # Calculate within-cluster sum of squares
            inertia = sum([np.sum((X_std[clusters == i] - centers[i])**2) 
                          for i in range(n_clusters)])
            
        elif method == 'dbscan':
            # Use DBSCAN with automatic parameter selection
            from sklearn.neighbors import NearestNeighbors
            
            # Find optimal eps using k-distance graph
            k = min(4, X_std.shape[0] - 1)
            neighbors = NearestNeighbors(n_neighbors=k)
            neighbors_fit = neighbors.fit(X_std)
            distances, indices = neighbors_fit.kneighbors(X_std)
            distances = np.sort(distances[:, k-1], axis=0)
            
            # Use elbow method to find eps
            eps = np.percentile(distances, 90)
            
            clusterer = DBSCAN(eps=eps, min_samples=k)
            clusters = clusterer.fit_predict(X_std)
            
            # Handle noise points
            n_clusters = len(set(clusters)) - (1 if -1 in clusters else 0)
            
            # Compute centers for non-noise clusters
            centers = np.array([X_std[clusters == i].mean(axis=0) 
                              for i in range(n_clusters) if i != -1])
            
            inertia = np.nan  # Not applicable for DBSCAN
        
        else:
            raise ValueError(f"Unknown clustering method: {method}")
        
        # Validate clusters
        validation = self._validate_clusters(X_std, clusters)
        
        # Compute distance matrix
        if method != 'dbscan' or n_clusters > 0:
            dist_matrix = cdist(X_std, centers)
        else:
            dist_matrix = None
        
        test_statistics = {
            'n_clusters': n_clusters,
            'inertia': inertia,
            'silhouette': validation['silhouette'],
            'calinski_harabasz': validation['calinski_harabasz'],
            'davies_bouldin': validation['davies_bouldin']
        }
        
        # Statistical tests for cluster validity
        # MANOVA to test if clusters differ significantly
        if n_clusters > 1 and len(np.unique(clusters)) > 1:
            # Simplified MANOVA p-value using Wilks' Lambda
            cluster_means = np.array([X_std[clusters == i].mean(axis=0) 
                                     for i in np.unique(clusters) if i != -1])
            
            # Between and within scatter matrices
            n_samples = X_std.shape[0]
            n_features = X_std.shape[1]
            overall_mean = X_std.mean(axis=0)
            
            Sw = np.zeros((n_features, n_features))
            Sb = np.zeros((n_features, n_features))
            
            for i in np.unique(clusters):
                if i == -1:  # Skip noise points in DBSCAN
                    continue
                cluster_data = X_std[clusters == i]
                cluster_mean = cluster_data.mean(axis=0)
                
                # Within scatter
                Sw += (cluster_data - cluster_mean).T @ (cluster_data - cluster_mean)
                
                # Between scatter
                n_cluster = len(cluster_data)
                mean_diff = (cluster_mean - overall_mean).reshape(-1, 1)
                Sb += n_cluster * (mean_diff @ mean_diff.T)
            
            # Wilks' Lambda
            try:
                wilks_lambda = np.linalg.det(Sw) / np.linalg.det(Sw + Sb)
                # Approximate p-value
                n = n_samples
                p = n_features
                g = n_clusters
                F_stat = ((1 - wilks_lambda) / wilks_lambda) * ((n - g) / (g - 1))
                p_value = 1 - stats.f.cdf(F_stat, p * (g - 1), p * (n - g))
            except:
                wilks_lambda = np.nan
                p_value = np.nan
        else:
            wilks_lambda = np.nan
            p_value = np.nan
        
        p_values = {
            'cluster_separation': p_value
        }
        
        effect_sizes = {
            'within_cluster_variance': inertia / (X_std.shape[0] * X_std.shape[1]) if inertia else np.nan
        }
        
        additional_info = {
            'cluster_centers': centers,
            'cluster_sizes': pd.Series(clusters).value_counts().to_dict(),
            'distance_matrix': dist_matrix,
            'clustering_method': method,
            'cluster_validation': validation
        }
        
        if method == 'hierarchical':
            additional_info['linkage_matrix'] = linkage_matrix
            additional_info['linkage_method'] = linkage_method
        elif method == 'dbscan':
            additional_info['eps'] = eps if 'eps' in locals() else None
            additional_info['n_noise_points'] = np.sum(clusters == -1)
        
        return MultivariateResults(
            method=f'{method.capitalize()} Clustering',
            test_statistics=test_statistics,
            p_values=p_values,
            effect_sizes=effect_sizes,
            clusters=clusters,
            additional_info=additional_info
        )
    
    def _find_optimal_clusters(self, X: np.ndarray, method: str = 'kmeans',
                              max_clusters: int = 10) -> int:
        """Find optimal number of clusters using elbow method and silhouette score."""
        max_clusters = min(max_clusters, X.shape[0] - 1)
        
        silhouette_scores = []
        inertias = []
        
        for n in range(2, max_clusters + 1):
            if method == 'kmeans':
                clusterer = KMeans(n_clusters=n, random_state=42)
                clusters = clusterer.fit_predict(X)
                inertias.append(clusterer.inertia_)
            else:  # hierarchical
                linkage_matrix = linkage(X, method='ward')
                clusters = fcluster(linkage_matrix, n, criterion='maxclust')
            
            silhouette_scores.append(silhouette_score(X, clusters))
        
        # Find elbow point
        if inertias:
            # Calculate second derivative
            if len(inertias) > 2:
                second_derivative = np.diff(np.diff(inertias))
                elbow = np.argmax(second_derivative) + 2
            else:
                elbow = 2
        else:
            elbow = 2
        
        # Find maximum silhouette score
        best_silhouette = np.argmax(silhouette_scores) + 2
        
        # Use silhouette score as primary criterion
        return best_silhouette
    
    def _validate_clusters(self, X: np.ndarray, clusters: np.ndarray) -> Dict[str, float]:
        """Compute cluster validation metrics."""
        validation = {}
        
        # Remove noise points for validation (DBSCAN)
        valid_mask = clusters != -1
        if np.sum(valid_mask) < len(clusters):
            X_valid = X[valid_mask]
            clusters_valid = clusters[valid_mask]
        else:
            X_valid = X
            clusters_valid = clusters
        
        # Ensure we have at least 2 clusters for validation
        n_unique = len(np.unique(clusters_valid))
        
        if n_unique >= 2:
            validation['silhouette'] = silhouette_score(X_valid, clusters_valid)
            validation['calinski_harabasz'] = calinski_harabasz_score(X_valid, clusters_valid)
            validation['davies_bouldin'] = davies_bouldin_score(X_valid, clusters_valid)
        else:
            validation['silhouette'] = np.nan
            validation['calinski_harabasz'] = np.nan
            validation['davies_bouldin'] = np.nan
        
        return validation
    
    def multidimensional_scaling(self, X: np.ndarray, n_components: int = 2,
                                metric: bool = True,
                                dissimilarity: str = 'euclidean') -> Dict[str, Any]:
        """
        Perform Multidimensional Scaling (MDS).
        
        Args:
            X: Data matrix or distance matrix
            n_components: Number of dimensions for embedding
            metric: Use metric (True) or non-metric (False) MDS
            dissimilarity: 'euclidean' or 'precomputed'
            
        Returns:
            Dictionary containing MDS results
        """
        # Compute distance matrix if needed
        if dissimilarity == 'euclidean':
            X_std = self.scaler.fit_transform(X)
            dist_matrix = squareform(pdist(X_std, metric='euclidean'))
        else:
            dist_matrix = X
        
        # Perform MDS
        mds = MDS(n_components=n_components, metric=metric,
                 dissimilarity='precomputed', random_state=42)
        embedding = mds.fit_transform(dist_matrix)
        
        # Calculate stress (measure of fit)
        stress = mds.stress_
        
        # Calculate R-squared for metric MDS
        if metric:
            # Distances in embedded space
            embedded_dist = squareform(pdist(embedding))
            
            # Correlation between original and embedded distances
            flat_orig = dist_matrix[np.triu_indices_from(dist_matrix, k=1)]
            flat_embed = embedded_dist[np.triu_indices_from(embedded_dist, k=1)]
            correlation = np.corrcoef(flat_orig, flat_embed)[0, 1]
            r_squared = correlation ** 2
        else:
            r_squared = np.nan
        
        # Calculate variance explained by each dimension
        var_explained = np.var(embedding, axis=0) / np.sum(np.var(embedding, axis=0))
        
        return {
            'embedding': embedding,
            'stress': stress,
            'n_components': n_components,
            'metric': metric,
            'r_squared': r_squared,
            'variance_explained': var_explained,
            'distance_matrix': dist_matrix
        }
    
    def correspondence_analysis(self, contingency_table: pd.DataFrame) -> Dict[str, Any]:
        """
        Perform Correspondence Analysis on contingency table.
        
        Args:
            contingency_table: DataFrame with categories as rows and columns
            
        Returns:
            Dictionary containing CA results
        """
        # Initialize CA
        ca = prince.CA(n_components=min(contingency_table.shape) - 1)
        
        # Fit the model
        ca = ca.fit(contingency_table)
        
        # Get row and column coordinates
        row_coords = ca.row_coordinates(contingency_table)
        col_coords = ca.column_coordinates(contingency_table)
        
        # Get eigenvalues and inertia
        eigenvalues = ca.eigenvalues_
        total_inertia = np.sum(eigenvalues)
        explained_inertia = eigenvalues / total_inertia
        
        # Chi-square test of independence
        chi2, p_value, dof, expected = stats.chi2_contingency(contingency_table)
        
        # Compute contributions
        row_contrib = ca.row_contributions_
        col_contrib = ca.column_contributions_
        
        # Compute quality of representation (cos2)
        row_cos2 = ca.row_cosine_similarities(contingency_table)
        col_cos2 = ca.column_cosine_similarities(contingency_table)
        
        return {
            'row_coordinates': row_coords,
            'column_coordinates': col_coords,
            'eigenvalues': eigenvalues,
            'total_inertia': total_inertia,
            'explained_inertia': explained_inertia,
            'cumulative_inertia': np.cumsum(explained_inertia),
            'chi_square': chi2,
            'p_value': p_value,
            'degrees_of_freedom': dof,
            'row_contributions': row_contrib,
            'column_contributions': col_contrib,
            'row_cos2': row_cos2,
            'column_cos2': col_cos2
        }
    
    def mahalanobis_distance(self, X: np.ndarray, 
                            robust: bool = False) -> np.ndarray:
        """
        Compute Mahalanobis distance for outlier detection.
        
        Args:
            X: Data matrix (n_samples, n_features)
            robust: Use robust covariance estimation
            
        Returns:
            Array of Mahalanobis distances
        """
        X_std = self.scaler.fit_transform(X)
        
        if robust:
            # Use Minimum Covariance Determinant
            cov = MinCovDet().fit(X_std)
            mahal_dist = cov.mahalanobis(X_std)
        else:
            # Use empirical covariance
            cov = EmpiricalCovariance().fit(X_std)
            mahal_dist = cov.mahalanobis(X_std)
        
        return np.sqrt(mahal_dist)
    
    def hotelling_t2_test(self, X1: np.ndarray, X2: Optional[np.ndarray] = None,
                         mu0: Optional[np.ndarray] = None) -> Dict[str, Any]:
        """
        Perform Hotelling's T-squared test.
        
        Args:
            X1: First sample (n_samples, n_features)
            X2: Second sample for two-sample test (optional)
            mu0: Hypothesized mean for one-sample test (optional)
            
        Returns:
            Dictionary containing test results
        """
        n1, p = X1.shape
        
        if X2 is not None:
            # Two-sample test
            n2 = X2.shape[0]
            
            mean1 = np.mean(X1, axis=0)
            mean2 = np.mean(X2, axis=0)
            
            # Pooled covariance
            S1 = np.cov(X1.T, ddof=1)
            S2 = np.cov(X2.T, ddof=1)
            Sp = ((n1 - 1) * S1 + (n2 - 1) * S2) / (n1 + n2 - 2)
            
            # T-squared statistic
            mean_diff = mean1 - mean2
            T2 = (n1 * n2) / (n1 + n2) * mean_diff @ np.linalg.inv(Sp) @ mean_diff
            
            # F-statistic
            F = (n1 + n2 - p - 1) / ((n1 + n2 - 2) * p) * T2
            df1 = p
            df2 = n1 + n2 - p - 1
            
            test_type = 'two-sample'
            
        else:
            # One-sample test
            if mu0 is None:
                mu0 = np.zeros(p)
            
            mean1 = np.mean(X1, axis=0)
            S = np.cov(X1.T, ddof=1)
            
            mean_diff = mean1 - mu0
            T2 = n1 * mean_diff @ np.linalg.inv(S) @ mean_diff
            
            # F-statistic
            F = (n1 - p) / ((n1 - 1) * p) * T2
            df1 = p
            df2 = n1 - p
            
            test_type = 'one-sample'
        
        # P-value
        p_value = 1 - stats.f.cdf(F, df1, df2)
        
        # Effect size (Mahalanobis D)
        if X2 is not None:
            D = np.sqrt(mean_diff @ np.linalg.inv(Sp) @ mean_diff)
        else:
            D = np.sqrt(mean_diff @ np.linalg.inv(S) @ mean_diff)
        
        return {
            'test_type': test_type,
            'T2_statistic': T2,
            'F_statistic': F,
            'df1': df1,
            'df2': df2,
            'p_value': p_value,
            'mahalanobis_D': D,
            'mean_difference': mean_diff
        }