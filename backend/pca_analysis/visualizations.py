"""
PCA Visualization Functions

Generates visualization data for PCA results.
Returns structured data that the frontend renders.
"""

import numpy as np
import logging

logger = logging.getLogger(__name__)


def create_interactive_biplot(pca_result, components=(0, 1), top_n_genes=10):
    """Create data for an interactive biplot showing scores and loadings."""
    try:
        scores = np.array(pca_result.scores) if pca_result.scores else []
        loadings = np.array(pca_result.loadings) if pca_result.loadings else []
        explained_variance = pca_result.explained_variance_ratio or []

        return {
            'type': 'biplot',
            'scores': scores.tolist() if hasattr(scores, 'tolist') else [],
            'loadings': loadings.tolist() if hasattr(loadings, 'tolist') else [],
            'components': list(components),
            'explained_variance': explained_variance,
            'top_n_genes': top_n_genes,
        }
    except Exception as e:
        logger.error(f"Error creating biplot: {e}")
        return {'type': 'biplot', 'error': str(e)}


def create_3d_rotation_animation(pca_result, components=(0, 1, 2)):
    """Create data for a 3D rotation animation of PCA scores."""
    try:
        scores = np.array(pca_result.scores) if pca_result.scores else []
        explained_variance = pca_result.explained_variance_ratio or []

        return {
            'type': '3d_rotation',
            'scores': scores.tolist() if hasattr(scores, 'tolist') else [],
            'components': list(components),
            'explained_variance': explained_variance,
        }
    except Exception as e:
        logger.error(f"Error creating 3D animation: {e}")
        return {'type': '3d_rotation', 'error': str(e)}


def create_variance_waterfall(pca_result):
    """Create data for a variance explained waterfall chart."""
    try:
        explained_variance = pca_result.explained_variance_ratio or []
        cumulative = np.cumsum(explained_variance).tolist() if explained_variance else []

        return {
            'type': 'variance_waterfall',
            'individual': explained_variance,
            'cumulative': cumulative,
            'n_components': len(explained_variance),
        }
    except Exception as e:
        logger.error(f"Error creating variance waterfall: {e}")
        return {'type': 'variance_waterfall', 'error': str(e)}


def create_gene_constellation(pca_result, top_n=20):
    """Create data for a gene constellation (network) plot."""
    try:
        loadings = np.array(pca_result.loadings) if pca_result.loadings else []

        return {
            'type': 'gene_constellation',
            'loadings': loadings.tolist() if hasattr(loadings, 'tolist') else [],
            'top_n': top_n,
        }
    except Exception as e:
        logger.error(f"Error creating gene constellation: {e}")
        return {'type': 'gene_constellation', 'error': str(e)}


def create_loading_heatmap(pca_result, n_components=None, top_n_genes=30):
    """Create data for a loading heatmap."""
    try:
        loadings = np.array(pca_result.loadings) if pca_result.loadings else []

        return {
            'type': 'loading_heatmap',
            'loadings': loadings.tolist() if hasattr(loadings, 'tolist') else [],
            'n_components': n_components,
            'top_n_genes': top_n_genes,
        }
    except Exception as e:
        logger.error(f"Error creating loading heatmap: {e}")
        return {'type': 'loading_heatmap', 'error': str(e)}


def create_sample_trajectory(pca_result, sample_order=None):
    """Create data for a sample trajectory plot."""
    try:
        scores = np.array(pca_result.scores) if pca_result.scores else []

        return {
            'type': 'sample_trajectory',
            'scores': scores.tolist() if hasattr(scores, 'tolist') else [],
            'sample_order': sample_order,
        }
    except Exception as e:
        logger.error(f"Error creating sample trajectory: {e}")
        return {'type': 'sample_trajectory', 'error': str(e)}


def create_contribution_sunburst(pca_result, n_components=3):
    """Create data for a contribution sunburst chart."""
    try:
        loadings = np.array(pca_result.loadings) if pca_result.loadings else []
        explained_variance = pca_result.explained_variance_ratio or []

        return {
            'type': 'contribution_sunburst',
            'loadings': loadings.tolist() if hasattr(loadings, 'tolist') else [],
            'explained_variance': explained_variance,
            'n_components': n_components,
        }
    except Exception as e:
        logger.error(f"Error creating contribution sunburst: {e}")
        return {'type': 'contribution_sunburst', 'error': str(e)}


def create_pca_explained_animation(pca_result):
    """Create data for a PCA explained variance animation."""
    try:
        explained_variance = pca_result.explained_variance_ratio or []
        cumulative = np.cumsum(explained_variance).tolist() if explained_variance else []

        return {
            'type': 'pca_explained_animation',
            'individual': explained_variance,
            'cumulative': cumulative,
            'n_components': len(explained_variance),
        }
    except Exception as e:
        logger.error(f"Error creating PCA animation: {e}")
        return {'type': 'pca_explained_animation', 'error': str(e)}
