"""
PCA Analysis Service

This module contains services for running Principal Component Analysis (PCA) on gene expression data.
It preserves the exact mathematical methods from the original Streamlit implementation.
"""

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.impute import SimpleImputer
import itertools
import logging
from django.db import transaction
from celery import shared_task

from stickforstats.pca_analysis.models import (
    PCAProject,
    PCAResult,
    PCAVisualization,
    Sample,
    SampleGroup,
    Gene,
    ExpressionValue,
    GeneContribution
)

logger = logging.getLogger(__name__)

class PCAService:
    """Service for performing PCA analysis on gene expression data"""
    
    @staticmethod
    def prepare_data_matrix(project_id):
        """
        Prepare the gene expression data matrix for PCA analysis.
        
        Args:
            project_id: UUID of the PCA project
            
        Returns:
            tuple: (data_matrix, sample_ids, gene_ids)
        """
        # Get all samples and genes for this project
        samples = Sample.objects.filter(project_id=project_id).order_by('id')
        genes = Gene.objects.filter(project_id=project_id).order_by('id')
        
        # Create a DataFrame to hold the expression values
        # This preserves the exact data structure used in the Streamlit version
        sample_ids = [sample.id for sample in samples]
        gene_ids = [gene.id for gene in genes]
        
        # Initialize with NaN (missing values will be imputed later)
        data_matrix = pd.DataFrame(
            index=sample_ids,
            columns=gene_ids,
            dtype=float
        )
        
        # Fill the matrix with expression values
        expressions = ExpressionValue.objects.filter(
            sample__project_id=project_id
        ).select_related('sample', 'gene')
        
        for expr in expressions:
            data_matrix.loc[expr.sample.id, expr.gene.id] = expr.value
            
        return data_matrix, sample_ids, gene_ids

    @staticmethod
    def run_pca_analysis(project_id, n_components=5):
        """
        Runs PCA analysis on the gene expression data.
        
        Args:
            project_id: UUID of the PCA project
            n_components: Number of principal components to calculate
            
        Returns:
            dict: PCA results including loadings, scores, and variance explained
        """
        try:
            # Get the project
            project = PCAProject.objects.get(id=project_id)
            
            # Prepare the data matrix
            data_matrix, sample_ids, gene_ids = PCAService.prepare_data_matrix(project_id)
            
            # Handle missing values
            # This exactly matches the original code in pca-streamlit-app.py lines 268-277
            if data_matrix.isnull().values.any():
                imputer = SimpleImputer(strategy='mean')
                data_matrix_imputed = pd.DataFrame(
                    imputer.fit_transform(data_matrix),
                    index=data_matrix.index,
                    columns=data_matrix.columns
                )
            else:
                data_matrix_imputed = data_matrix
            
            # Scale the data
            # This exactly matches the original code in pca-streamlit-app.py lines 280-293
            if project.scaling_method == 'STANDARD':
                scaler = StandardScaler()
                data_matrix_scaled = pd.DataFrame(
                    scaler.fit_transform(data_matrix_imputed),
                    index=data_matrix_imputed.index,
                    columns=data_matrix_imputed.columns
                )
            elif project.scaling_method == 'MINMAX':
                data_matrix_scaled = (data_matrix_imputed - data_matrix_imputed.min()) / (data_matrix_imputed.max() - data_matrix_imputed.min())
            else:  # 'NONE'
                data_matrix_scaled = data_matrix_imputed
            
            # Run PCA
            # This exactly matches the original code in pca-streamlit-app.py lines 296-308
            pca = PCA(n_components=min(n_components, len(data_matrix_scaled.columns), len(data_matrix_scaled.index)))
            pca_result = pca.fit_transform(data_matrix_scaled)
            
            # Create a DataFrame with PCA results
            pca_df = pd.DataFrame(
                data=pca_result,
                columns=[f'PC{i+1}' for i in range(pca.n_components_)],
                index=data_matrix_scaled.index
            )
            
            # Get group information for each sample
            samples_with_groups = {}
            for sample in Sample.objects.filter(id__in=sample_ids).select_related('group'):
                samples_with_groups[sample.id] = sample.group.name if sample.group else 'Unknown'
            
            # Add group information to PCA results
            pca_df['Group'] = [samples_with_groups.get(sample_id, 'Unknown') for sample_id in pca_df.index]
            
            # Calculate explained variance
            explained_variance = pca.explained_variance_ratio_ * 100
            cumulative_variance = np.cumsum(explained_variance)
            
            # Get the loadings - transpose to match original format
            loadings = pca.components_.T
            loadings_df = pd.DataFrame(
                loadings,
                columns=[f'PC{i+1}' for i in range(pca.n_components_)],
                index=data_matrix_scaled.columns
            )
            
            # Calculate gene contributions - Matching lines 524-531 in original code
            gene_contribution = pd.DataFrame(
                index=loadings_df.index,
                columns=['PC1_contribution', 'PC2_contribution', 'Total_contribution']
            )
            
            # Ensure we have at least 2 PCs
            if loadings_df.shape[1] >= 2:
                gene_contribution['PC1_contribution'] = loadings_df['PC1'].abs() * explained_variance[0]
                gene_contribution['PC2_contribution'] = loadings_df['PC2'].abs() * explained_variance[1]
                gene_contribution['Total_contribution'] = gene_contribution['PC1_contribution'] + gene_contribution['PC2_contribution']
            
            # Calculate group centroids - Matching lines 729-736 in original code
            unique_groups = list(set(pca_df['Group']))
            group_centroids = {}
            
            for group in unique_groups:
                group_data = pca_df[pca_df['Group'] == group]
                group_centroids[group] = {
                    'PC1': group_data['PC1'].mean(),
                    'PC2': group_data['PC2'].mean() if 'PC2' in group_data.columns else 0
                }
            
            # Calculate distances between group centroids - Matching lines 738-746 in original code
            group_distances = {}
            
            for group1, group2 in itertools.combinations(unique_groups, 2):
                distance = np.sqrt(
                    (group_centroids[group1]['PC1'] - group_centroids[group2]['PC1'])**2 +
                    (group_centroids[group1]['PC2'] - group_centroids[group2]['PC2'])**2
                )
                group_distances[(group1, group2)] = float(distance)
            
            # Calculate within-group variation - Matching lines 748-761 in original code
            group_variations = {}
            
            for group in unique_groups:
                group_data = pca_df[pca_df['Group'] == group]
                if len(group_data) > 1:  # Need at least 2 samples
                    centroid = (group_centroids[group]['PC1'], group_centroids[group]['PC2'])
                    distances = []
                    for idx, row in group_data.iterrows():
                        point = (row['PC1'], row['PC2'] if 'PC2' in row.index else 0)
                        dist = np.sqrt((point[0] - centroid[0])**2 + (point[1] - centroid[1])**2)
                        distances.append(dist)
                    group_variations[group] = float(np.mean(distances))
                else:
                    group_variations[group] = 0.0
            
            # Prepare results dictionary
            results = {
                'scores': pca_df.to_dict(orient='records'),
                'loadings': loadings_df.to_dict(orient='records'),
                'explained_variance': explained_variance.tolist(),
                'cumulative_variance': cumulative_variance.tolist(),
                'gene_contribution': gene_contribution.to_dict(orient='records'),
                'group_centroids': group_centroids,
                'group_distances': group_distances,
                'group_variations': group_variations,
                'sample_ids': sample_ids,
                'gene_ids': gene_ids,
                'n_components': pca.n_components_
            }
            
            return results
            
        except Exception as e:
            logger.error(f"Error in PCA analysis: {str(e)}")
            raise
    
    @staticmethod
    @transaction.atomic
    def save_pca_results(project_id, results):
        """
        Saves PCA results to the database.
        
        Args:
            project_id: UUID of the PCA project
            results: PCA results from run_pca_analysis
            
        Returns:
            PCAResult: The saved PCA result object
        """
        project = PCAProject.objects.get(id=project_id)
        
        # Create PCA result record
        pca_result = PCAResult.objects.create(
            project=project,
            user=project.user,
            n_components=results['n_components'],
            scaling_method=project.scaling_method,
            explained_variance=results['explained_variance'],
            cumulative_variance=results['cumulative_variance'],
            loadings=results['loadings'],
            scores=results['scores'],
            group_centroids=results['group_centroids'],
            group_distances=results['group_distances'],
            group_variations=results['group_variations'],
            status='COMPLETED'
        )
        
        # Get genes from the project
        genes = {gene.id: gene for gene in Gene.objects.filter(project=project)}
        
        # Save gene contributions - top contributors for each PC
        gene_contrib_df = pd.DataFrame(results['gene_contribution'])
        
        if not gene_contrib_df.empty and 'Total_contribution' in gene_contrib_df.columns:
            # Get top contributing genes
            top_genes = gene_contrib_df.sort_values('Total_contribution', ascending=False).head(30)
            
            for gene_id, row in top_genes.iterrows():
                if gene_id in genes:
                    GeneContribution.objects.create(
                        pca_result=pca_result,
                        gene=genes[gene_id],
                        pc1_contribution=float(row['PC1_contribution']),
                        pc2_contribution=float(row['PC2_contribution']),
                        total_contribution=float(row['Total_contribution'])
                    )
        
        # Create default visualization
        PCAVisualization.objects.create(
            pca_result=pca_result,
            name="Default 2D Visualization",
            plot_type='2D',
            x_component=1,
            y_component=2,
            include_gene_loadings=True,
            top_genes_count=10
        )
        
        return pca_result

    @staticmethod
    # @shared_task - Commented out because we're running directly without Celery
    def run_pca_analysis_task(project_id, n_components=5):
        """
        Celery task for running PCA analysis asynchronously.
        
        Args:
            project_id: UUID of the PCA project
            n_components: Number of principal components to calculate
            
        Returns:
            dict: Results summary
        """
        try:
            # Update project status to PROCESSING
            project = PCAProject.objects.get(id=project_id)
            
            # Get existing result or create new one
            pca_result, created = PCAResult.objects.get_or_create(
                project=project,
                defaults={
                    'name': f"PCA Analysis ({n_components} components)",
                    'user': project.user,
                    'n_components': n_components,
                    'scaling_method': project.scaling_method,
                    'status': 'PROCESSING'
                }
            )
            
            if not created:
                pca_result.status = 'PROCESSING'
                pca_result.save(update_fields=['status'])
            
            # Run the analysis
            results = PCAService.run_pca_analysis(project_id, n_components)
            
            # Save the results
            with transaction.atomic():
                pca_result.explained_variance = results['explained_variance']
                pca_result.cumulative_variance = results['cumulative_variance']
                pca_result.loadings = results['loadings'] 
                pca_result.scores = results['scores']
                pca_result.group_centroids = results['group_centroids']
                pca_result.group_distances = results['group_distances']
                pca_result.group_variations = results['group_variations']
                pca_result.status = 'COMPLETED'
                pca_result.save()
                
                # Add gene contributions
                GeneContribution.objects.filter(pca_result=pca_result).delete()
                gene_contrib_df = pd.DataFrame(results['gene_contribution'])
                
                genes = {gene.id: gene for gene in Gene.objects.filter(project=project)}
                
                if not gene_contrib_df.empty and 'Total_contribution' in gene_contrib_df.columns:
                    # Get top contributing genes
                    top_genes = gene_contrib_df.sort_values('Total_contribution', ascending=False).head(30)
                    
                    for gene_id, row in top_genes.iterrows():
                        if gene_id in genes:
                            GeneContribution.objects.create(
                                pca_result=pca_result,
                                gene=genes[gene_id],
                                pc1_contribution=float(row['PC1_contribution']),
                                pc2_contribution=float(row['PC2_contribution']),
                                total_contribution=float(row['Total_contribution'])
                            )
            
            return {
                'status': 'success',
                'result_id': str(pca_result.id),
                'n_components': pca_result.n_components,
                'explained_variance': results['explained_variance'][:2]  # Just first 2 PCs
            }
            
        except Exception as e:
            logger.error(f"Error in PCA analysis task: {str(e)}")
            
            # Update status to FAILED
            try:
                project = PCAProject.objects.get(id=project_id)
                pca_result, _ = PCAResult.objects.get_or_create(
                    project=project,
                    defaults={
                        'name': f"PCA Analysis (Failed)",
                        'user': project.user,
                        'status': 'FAILED',
                        'error_message': str(e)
                    }
                )
                
                if pca_result.status != 'FAILED':
                    pca_result.status = 'FAILED'
                    pca_result.error_message = str(e)
                    pca_result.save(update_fields=['status', 'error_message'])
            except Exception as inner_e:
                logger.error(f"Failed to update PCA result status: {str(inner_e)}")
            
            return {
                'status': 'error',
                'error': str(e)
            }
    
    @staticmethod
    def generate_visualization_data(pca_result_id, plot_type='2D', x_component=1, y_component=2, 
                                  z_component=None, include_gene_loadings=True, top_genes_count=10):
        """
        Generates data for PCA visualization.
        
        Args:
            pca_result_id: UUID of the PCA result
            plot_type: '2D' or '3D'
            x_component, y_component, z_component: Components to use for visualization
            include_gene_loadings: Whether to include gene loadings
            top_genes_count: Number of top genes to highlight
            
        Returns:
            dict: Visualization data
        """
        try:
            # Get the PCA result
            pca_result = PCAResult.objects.get(id=pca_result_id)
            
            # Get the scores and loadings from the result
            scores = pd.DataFrame(pca_result.scores)
            
            # Prepare visualization data
            visualization_data = {
                'plot_type': plot_type,
                'explained_variance': pca_result.explained_variance,
                'cumulative_variance': pca_result.cumulative_variance,
                'sample_data': []
            }
            
            # Format sample data for visualization
            if not scores.empty:
                for _, row in scores.iterrows():
                    sample_point = {
                        'sample_id': row.get('sample_id', ''),
                        'group': row.get('Group', 'Unknown'),
                        'pc1': float(row.get(f'PC{x_component}', 0)),
                        'pc2': float(row.get(f'PC{y_component}', 0))
                    }
                    
                    if plot_type == '3D' and z_component:
                        sample_point['pc3'] = float(row.get(f'PC{z_component}', 0))
                        
                    visualization_data['sample_data'].append(sample_point)
            
            # Include gene loadings if requested
            if include_gene_loadings and pca_result.loadings:
                loadings = pd.DataFrame(pca_result.loadings)
                
                # Get gene contribution data
                gene_contributions = GeneContribution.objects.filter(
                    pca_result=pca_result
                ).select_related('gene').order_by('-total_contribution')[:top_genes_count]
                
                visualization_data['gene_loadings'] = []
                
                # Add top genes to visualization
                for contrib in gene_contributions:
                    gene_id = contrib.gene.id
                    gene_name = contrib.gene.name
                    
                    # Find the gene in loadings
                    if gene_id in loadings.index:
                        loading_data = {
                            'gene_id': gene_id,
                            'gene_name': gene_name,
                            'pc1_loading': float(loadings.loc[gene_id, f'PC{x_component}']),
                            'pc2_loading': float(loadings.loc[gene_id, f'PC{y_component}']),
                            'pc1_contribution': float(contrib.pc1_contribution),
                            'pc2_contribution': float(contrib.pc2_contribution),
                            'total_contribution': float(contrib.total_contribution)
                        }
                        
                        if plot_type == '3D' and z_component:
                            loading_data['pc3_loading'] = float(loadings.loc[gene_id, f'PC{z_component}'])
                            
                        visualization_data['gene_loadings'].append(loading_data)
            
            # Add group statistics
            visualization_data['group_centroids'] = pca_result.group_centroids
            visualization_data['group_distances'] = pca_result.group_distances
            visualization_data['group_variations'] = pca_result.group_variations
            
            return visualization_data
            
        except Exception as e:
            logger.error(f"Error generating visualization data: {str(e)}")
            raise