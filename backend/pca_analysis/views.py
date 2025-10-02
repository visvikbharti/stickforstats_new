"""
PCA Analysis API Views - Both project-based and simplified interfaces
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction
from django.http import FileResponse
import numpy as np
import pandas as pd
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.impute import SimpleImputer
import logging
from typing import Dict, Any, List, Optional, Tuple
import json
import io

from .models import (
    PCAProject,
    SampleGroup,
    Sample,
    Gene,
    ExpressionValue,
    PCAResult,
    PCAVisualization,
    GeneContribution
)
from .serializers import (
    PCAProjectSerializer,
    PCAProjectDetailSerializer,
    SampleGroupSerializer,
    SampleSerializer,
    GeneSerializer,
    PCAResultSerializer,
    PCAVisualizationSerializer,
    FileUploadSerializer,
    CreateDemoDataSerializer,
    RunPCASerializer,
    PCAVisualizationDataSerializer
)
from .services.data_processor import DataProcessorService
from .services.pca_service import PCAService
from .visualizations import (
    create_interactive_biplot,
    create_3d_rotation_animation,
    create_variance_waterfall,
    create_gene_constellation,
    create_loading_heatmap,
    create_sample_trajectory,
    create_contribution_sunburst,
    create_pca_explained_animation
)
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

logger = logging.getLogger(__name__)


# ======================= ORIGINAL PROJECT-BASED VIEWS =======================

class PCAProjectViewSet(viewsets.ModelViewSet):
    """ViewSet for PCA projects."""
    
    serializer_class = PCAProjectSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return PCAProject.objects.filter(user=self.request.user)
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PCAProjectDetailSerializer
        elif self.action == 'upload_data':
            return FileUploadSerializer
        elif self.action == 'create_demo':
            return CreateDemoDataSerializer
        elif self.action == 'run_pca':
            return RunPCASerializer
        return super().get_serializer_class()
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['post'])
    @transaction.atomic
    def upload_data(self, request):
        """Upload data file and create a new project."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        file = serializer.validated_data['file']
        project_name = serializer.validated_data['project_name']
        project_description = serializer.validated_data.get('project_description', '')
        scaling_method = serializer.validated_data.get('scaling_method', 'STANDARD')
        
        # Create project
        project = PCAProject.objects.create(
            name=project_name,
            description=project_description,
            user=request.user,
            scaling_method=scaling_method
        )
        
        # Process the uploaded file
        try:
            data_processor = DataProcessorService()
            data_processor.process_uploaded_file(project, file)
            
            # Detect sample groups
            data_processor.detect_sample_groups(project)
            
            return Response({
                'project_id': str(project.id),
                'message': 'Data uploaded successfully',
                'sample_count': Sample.objects.filter(project=project).count(),
                'gene_count': Gene.objects.filter(project=project).count(),
                'group_count': SampleGroup.objects.filter(project=project).count()
            })
        except Exception as e:
            project.delete()  # Clean up if there's an error
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    @transaction.atomic
    def create_demo(self, request):
        """Create a demo project with example data."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        project_name = serializer.validated_data['project_name']
        project_description = serializer.validated_data.get('project_description', '')
        scaling_method = serializer.validated_data.get('scaling_method', 'STANDARD')
        
        # Create project
        project = PCAProject.objects.create(
            name=project_name,
            description=project_description,
            user=request.user,
            scaling_method=scaling_method
        )
        
        # Generate demo data
        try:
            data_processor = DataProcessorService()
            data_processor.create_demo_data(project)
            
            return Response({
                'project_id': str(project.id),
                'message': 'Demo project created successfully',
                'sample_count': Sample.objects.filter(project=project).count(),
                'gene_count': Gene.objects.filter(project=project).count(),
                'group_count': SampleGroup.objects.filter(project=project).count()
            })
        except Exception as e:
            project.delete()  # Clean up if there's an error
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def run_pca(self, request, pk=None):
        """Run PCA analysis on the project."""
        project = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        n_components = serializer.validated_data['n_components']
        
        # Run PCA analysis synchronously for now
        try:
            pca_service = PCAService()
            result = pca_service.run_pca_analysis(project, n_components)
            
            return Response({
                'result_id': str(result.id),
                'message': 'PCA analysis completed successfully',
                'status': 'completed'
            })
        except Exception as e:
            return Response({
                'error': str(e),
                'message': 'PCA analysis failed',
                'status': 'failed'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['get'])
    def latest_result(self, request, pk=None):
        """Get the latest PCA result for the project."""
        project = self.get_object()
        
        result = PCAResult.objects.filter(project=project).order_by('-created_at').first()
        if not result:
            return Response(
                {'error': 'No PCA results found for this project'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = PCAResultSerializer(result)
        return Response(serializer.data)


class SampleGroupViewSet(viewsets.ModelViewSet):
    """ViewSet for sample groups."""
    
    serializer_class = SampleGroupSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        project_id = self.kwargs.get('project_pk')
        if project_id:
            return SampleGroup.objects.filter(project_id=project_id)
        return SampleGroup.objects.none()
    
    def perform_create(self, serializer):
        project_id = self.kwargs.get('project_pk')
        project = get_object_or_404(PCAProject, id=project_id, user=self.request.user)
        serializer.save(project=project)


class SampleViewSet(viewsets.ModelViewSet):
    """ViewSet for samples."""
    
    serializer_class = SampleSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        project_id = self.kwargs.get('project_pk')
        if project_id:
            return Sample.objects.filter(project_id=project_id)
        return Sample.objects.none()


class GeneViewSet(viewsets.ModelViewSet):
    """ViewSet for genes."""
    
    serializer_class = GeneSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        project_id = self.kwargs.get('project_pk')
        if project_id:
            return Gene.objects.filter(project_id=project_id)
        return Gene.objects.none()


class PCAResultViewSet(viewsets.ModelViewSet):
    """ViewSet for PCA results."""
    
    serializer_class = PCAResultSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'head', 'options']  # Read-only
    
    def get_queryset(self):
        queryset = PCAResult.objects.filter(user=self.request.user)
        
        # Filter by project if specified
        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        
        return queryset
    
    @action(detail=True, methods=['get'])
    def visualization_data(self, request, pk=None):
        """Get visualization data for the PCA result."""
        result = self.get_object()
        
        # Get visualization parameters from query params
        plot_type = request.query_params.get('plot_type', '2d_scatter')
        x_component = int(request.query_params.get('x_component', 1))
        y_component = int(request.query_params.get('y_component', 2))
        z_component = int(request.query_params.get('z_component', 3))
        include_gene_loadings = request.query_params.get('include_gene_loadings', 'false').lower() == 'true'
        top_genes_count = int(request.query_params.get('top_genes_count', 20))
        
        try:
            # Get the PCA data
            pca_data = result.get_pca_data()
            
            # Generate visualization data based on plot type
            visualization_data = {
                'plot_type': plot_type,
                'data': {}
            }
            
            if plot_type == '2d_scatter':
                visualization_data['data'] = {
                    'samples': pca_data['samples'],
                    'x_component': x_component,
                    'y_component': y_component,
                    'explained_variance': result.explained_variance
                }
            elif plot_type == '3d_scatter':
                visualization_data['data'] = {
                    'samples': pca_data['samples'],
                    'x_component': x_component,
                    'y_component': y_component,
                    'z_component': z_component,
                    'explained_variance': result.explained_variance
                }
            elif plot_type == 'scree':
                visualization_data['data'] = {
                    'explained_variance': result.explained_variance,
                    'cumulative_variance': result.cumulative_variance
                }
            elif plot_type == 'loadings':
                visualization_data['data'] = {
                    'loadings': pca_data['loadings'],
                    'top_genes_count': top_genes_count
                }
            
            return Response(visualization_data)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def gene_contributions(self, request, pk=None):
        """Get gene contributions for the PCA result."""
        result = self.get_object()
        contributions = GeneContribution.objects.filter(pca_result=result).order_by('-total_contribution')[:50]
        
        data = []
        for contrib in contributions:
            data.append({
                'gene_name': contrib.gene.name,
                'pc1_contribution': contrib.pc1_contribution,
                'pc2_contribution': contrib.pc2_contribution,
                'total_contribution': contrib.total_contribution
            })
        
        return Response(data)
    
    @action(detail=True, methods=['get'])
    def download_report(self, request, pk=None):
        """Download a PDF report of the PCA results."""
        result = self.get_object()
        
        # Generate report
        report_generator = ReportGeneratorService()
        pdf_buffer = report_generator.generate_pca_report(result)
        
        # Return as file response
        return FileResponse(
            pdf_buffer,
            as_attachment=True,
            filename=f'pca_report_{result.project.name}_{result.created_at.strftime("%Y%m%d")}.pdf'
        )


class PCAVisualizationViewSet(viewsets.ModelViewSet):
    """ViewSet for PCA visualizations."""
    
    serializer_class = PCAVisualizationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        result_id = self.kwargs.get('result_pk')
        if result_id:
            return PCAVisualization.objects.filter(pca_result_id=result_id)
        return PCAVisualization.objects.none()
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return PCAVisualizationDataSerializer
        return super().get_serializer_class()
    
    def perform_create(self, serializer):
        result_id = self.kwargs.get('result_pk')
        result = get_object_or_404(PCAResult, id=result_id, user=self.request.user)
        serializer.save(pca_result=result)
    
    @action(detail=True, methods=['get'])
    def data(self, request, result_pk=None, pk=None):
        """Get the actual visualization data."""
        visualization = self.get_object()
        
        # Get the PCA result
        result = visualization.pca_result
        pca_data = result.get_pca_data()
        
        # Generate visualization based on type
        if visualization.plot_type == '2d_scatter':
            data = {
                'samples': pca_data['samples'],
                'x_component': visualization.x_component,
                'y_component': visualization.y_component,
                'explained_variance': result.explained_variance
            }
        elif visualization.plot_type == '3d_scatter':
            data = {
                'samples': pca_data['samples'],
                'x_component': visualization.x_component,
                'y_component': visualization.y_component,
                'z_component': visualization.z_component,
                'explained_variance': result.explained_variance
            }
        elif visualization.plot_type == 'scree':
            data = {
                'explained_variance': result.explained_variance,
                'cumulative_variance': result.cumulative_variance
            }
        elif visualization.plot_type == 'loadings':
            data = {
                'loadings': pca_data['loadings'],
                'top_genes_count': visualization.top_genes_count
            }
        else:
            data = {}
        
        return Response({
            'visualization': PCAVisualizationSerializer(visualization).data,
            'data': data
        })


# ======================= SIMPLIFIED API VIEWS =======================


class QuickPCAView(APIView):
    """Quick PCA analysis without project setup"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Perform quick PCA analysis on uploaded data"""
        try:
            data = request.data
            
            # Extract data matrix
            if 'data_matrix' in data:
                df = pd.DataFrame(data['data_matrix'])
            elif 'csv_data' in data:
                # Parse CSV string
                import io
                df = pd.read_csv(io.StringIO(data['csv_data']))
            else:
                return Response({
                    'status': 'error',
                    'error': {
                        'code': 'NO_DATA',
                        'message': 'No data provided. Use data_matrix or csv_data'
                    }
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Extract parameters
            n_components = data.get('n_components', min(3, len(df.columns)))
            scaling_method = data.get('scaling_method', 'standard')
            sample_names = data.get('sample_names', [f'Sample_{i+1}' for i in range(len(df))])
            feature_names = data.get('feature_names', [f'Feature_{i+1}' for i in range(len(df.columns))])
            
            # Preprocess data
            imputer = SimpleImputer(strategy='mean')
            df_imputed = pd.DataFrame(
                imputer.fit_transform(df),
                columns=df.columns,
                index=df.index
            )
            
            # Scale data
            if scaling_method == 'standard':
                scaler = StandardScaler()
            elif scaling_method == 'minmax':
                scaler = MinMaxScaler()
            else:
                scaler = None
            
            if scaler:
                data_scaled = scaler.fit_transform(df_imputed)
            else:
                data_scaled = df_imputed.values
            
            # Perform PCA
            pca = PCA(n_components=n_components)
            pca_result = pca.fit_transform(data_scaled)
            
            # Calculate additional metrics
            loadings = pca.components_.T * np.sqrt(pca.explained_variance_)
            
            # Generate creative visualizations
            visualizations = {}
            
            if data.get('generate_visualizations', True):
                # Interactive biplot with animations
                visualizations['biplot'] = create_interactive_biplot(
                    pca_result, loadings, sample_names, feature_names,
                    pca.explained_variance_ratio_
                )
                
                # 3D rotation animation
                if n_components >= 3:
                    visualizations['3d_animation'] = create_3d_rotation_animation(
                        pca_result[:, :3], sample_names,
                        pca.explained_variance_ratio_[:3]
                    )
                
                # Variance waterfall chart
                visualizations['variance_waterfall'] = create_variance_waterfall(
                    pca.explained_variance_ratio_
                )
                
                # Gene constellation map
                visualizations['gene_constellation'] = create_gene_constellation(
                    loadings, feature_names
                )
            
            # Prepare results
            results = {
                'pca_scores': pca_result.tolist(),
                'loadings': loadings.tolist(),
                'explained_variance': pca.explained_variance_.tolist(),
                'explained_variance_ratio': pca.explained_variance_ratio_.tolist(),
                'cumulative_variance': np.cumsum(pca.explained_variance_ratio_).tolist(),
                'n_components_used': n_components,
                'n_samples': len(df),
                'n_features': len(df.columns),
                'sample_names': sample_names,
                'feature_names': feature_names
            }
            
            return Response({
                'status': 'success',
                'data': {
                    'results': results,
                    'visualizations': visualizations,
                    'metadata': {
                        'analysis_time': timezone.now().isoformat(),
                        'scaling_method': scaling_method,
                        'user_id': str(request.user.id)
                    }
                },
                'message': 'PCA analysis completed successfully'
            })
            
        except Exception as e:
            logger.error(f"Error in quick PCA: {str(e)}")
            return Response({
                'status': 'error',
                'error': {
                    'code': 'PCA_ERROR',
                    'message': str(e)
                }
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class InteractivePCAView(APIView):
    """Interactive PCA with real-time parameter updates"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Update PCA visualization with new parameters"""
        try:
            data = request.data
            
            # Get existing PCA results
            pca_scores = np.array(data.get('pca_scores', []))
            loadings = np.array(data.get('loadings', []))
            
            # Visualization parameters
            viz_type = data.get('visualization_type', 'biplot')
            color_scheme = data.get('color_scheme', 'viridis')
            show_labels = data.get('show_labels', True)
            show_loadings = data.get('show_loadings', True)
            point_size = data.get('point_size', 50)
            
            # Group information
            groups = data.get('groups', {})
            
            # Generate updated visualization
            if viz_type == 'biplot':
                visualization = create_interactive_biplot(
                    pca_scores, loadings,
                    data.get('sample_names', []),
                    data.get('feature_names', []),
                    data.get('explained_variance_ratio', []),
                    groups=groups,
                    color_scheme=color_scheme,
                    show_labels=show_labels,
                    show_loadings=show_loadings,
                    point_size=point_size
                )
            elif viz_type == 'heatmap':
                visualization = create_loading_heatmap(
                    loadings,
                    data.get('feature_names', []),
                    data.get('sample_names', [])
                )
            elif viz_type == 'trajectory':
                visualization = create_sample_trajectory(
                    pca_scores,
                    data.get('sample_names', []),
                    data.get('time_points', None)
                )
            else:
                visualization = None
            
            return Response({
                'status': 'success',
                'data': {
                    'visualization': visualization,
                    'parameters': {
                        'visualization_type': viz_type,
                        'color_scheme': color_scheme,
                        'show_labels': show_labels,
                        'show_loadings': show_loadings,
                        'point_size': point_size
                    }
                }
            })
            
        except Exception as e:
            logger.error(f"Error updating PCA visualization: {str(e)}")
            return Response({
                'status': 'error',
                'error': {
                    'code': 'VISUALIZATION_ERROR',
                    'message': str(e)
                }
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GeneContributionView(APIView):
    """Analyze gene contributions to principal components"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Calculate and visualize gene contributions"""
        try:
            data = request.data
            
            loadings = np.array(data.get('loadings', []))
            feature_names = data.get('feature_names', [])
            n_top_genes = data.get('n_top_genes', 20)
            pc_index = data.get('pc_index', 0)  # Which PC to analyze
            
            # Calculate contributions
            contributions = np.abs(loadings[:, pc_index])
            top_indices = np.argsort(contributions)[-n_top_genes:][::-1]
            
            top_genes = [feature_names[i] for i in top_indices]
            top_contributions = contributions[top_indices]
            
            # Create visualizations
            visualizations = {}
            
            # Sunburst chart showing hierarchical contributions
            visualizations['sunburst'] = create_contribution_sunburst(
                loadings, feature_names, n_components=min(3, loadings.shape[1])
            )
            
            # Gene constellation showing relationships
            visualizations['constellation'] = create_gene_constellation(
                loadings, feature_names, highlight_genes=top_genes
            )
            
            results = {
                'top_genes': top_genes,
                'contributions': top_contributions.tolist(),
                'contribution_percentages': (top_contributions / np.sum(contributions) * 100).tolist(),
                'pc_index': pc_index,
                'total_genes': len(feature_names)
            }
            
            return Response({
                'status': 'success',
                'data': {
                    'results': results,
                    'visualizations': visualizations
                },
                'message': f'Top {n_top_genes} contributing genes identified'
            })
            
        except Exception as e:
            logger.error(f"Error analyzing gene contributions: {str(e)}")
            return Response({
                'status': 'error',
                'error': {
                    'code': 'CONTRIBUTION_ERROR',
                    'message': str(e)
                }
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PCAComparisonView(APIView):
    """Compare multiple PCA analyses"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Compare PCA results from different conditions or datasets"""
        try:
            data = request.data
            datasets = data.get('datasets', [])
            
            if len(datasets) < 2:
                return Response({
                    'status': 'error',
                    'error': {
                        'code': 'INSUFFICIENT_DATA',
                        'message': 'At least 2 datasets required for comparison'
                    }
                }, status=status.HTTP_400_BAD_REQUEST)
            
            comparison_results = []
            
            for dataset in datasets:
                # Process each dataset
                df = pd.DataFrame(dataset['data'])
                
                # Preprocess
                imputer = SimpleImputer(strategy='mean')
                df_imputed = pd.DataFrame(imputer.fit_transform(df))
                
                # Scale
                scaler = StandardScaler()
                data_scaled = scaler.fit_transform(df_imputed)
                
                # PCA
                pca = PCA(n_components=min(3, len(df.columns)))
                pca_result = pca.fit_transform(data_scaled)
                
                comparison_results.append({
                    'name': dataset.get('name', f'Dataset_{len(comparison_results)+1}'),
                    'pca_scores': pca_result.tolist(),
                    'explained_variance_ratio': pca.explained_variance_ratio_.tolist(),
                    'n_samples': len(df),
                    'n_features': len(df.columns)
                })
            
            # Create comparison visualizations
            visualizations = {}
            
            # Side-by-side plots
            visualizations['comparison_plot'] = self._create_comparison_plot(comparison_results)
            
            # Procrustes analysis for shape comparison
            if len(comparison_results) == 2:
                visualizations['procrustes'] = self._perform_procrustes_analysis(
                    comparison_results[0]['pca_scores'],
                    comparison_results[1]['pca_scores']
                )
            
            return Response({
                'status': 'success',
                'data': {
                    'comparison_results': comparison_results,
                    'visualizations': visualizations
                },
                'message': 'PCA comparison completed successfully'
            })
            
        except Exception as e:
            logger.error(f"Error in PCA comparison: {str(e)}")
            return Response({
                'status': 'error',
                'error': {
                    'code': 'COMPARISON_ERROR',
                    'message': str(e)
                }
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _create_comparison_plot(self, results):
        """Create side-by-side comparison visualization"""
        # Implementation would create an SVG with multiple subplots
        return "data:image/svg+xml;base64,..."  # Placeholder
    
    def _perform_procrustes_analysis(self, scores1, scores2):
        """Perform Procrustes analysis to compare shapes"""
        from scipy.spatial import procrustes
        mtx1, mtx2, disparity = procrustes(np.array(scores1), np.array(scores2))
        return {
            'disparity': float(disparity),
            'aligned_scores1': mtx1.tolist(),
            'aligned_scores2': mtx2.tolist()
        }


class PCASimulationView(APIView):
    """Interactive PCA simulation for education"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get PCA simulation with animated explanation"""
        try:
            # Generate sample data for simulation
            np.random.seed(42)
            
            # Create correlated data
            mean = [0, 0]
            cov = [[1, 0.8], [0.8, 1]]
            data = np.random.multivariate_normal(mean, cov, 100)
            
            # Add some outliers
            outliers = np.random.multivariate_normal([3, 3], [[0.5, 0], [0, 0.5]], 5)
            data = np.vstack([data, outliers])
            
            # Create step-by-step animation
            animation = create_pca_explained_animation(data)
            
            # Educational content
            explanation = {
                'steps': [
                    {
                        'title': 'Original Data',
                        'description': 'Your data points in original feature space',
                        'key_concept': 'Each point represents a sample with multiple features'
                    },
                    {
                        'title': 'Center the Data',
                        'description': 'Subtract the mean from each feature',
                        'key_concept': 'This moves the data cloud to origin (0,0)'
                    },
                    {
                        'title': 'Calculate Covariance',
                        'description': 'Measure how features vary together',
                        'key_concept': 'High covariance means features are related'
                    },
                    {
                        'title': 'Find Principal Components',
                        'description': 'Identify directions of maximum variance',
                        'key_concept': 'PC1 captures most variation, PC2 second most'
                    },
                    {
                        'title': 'Project Data',
                        'description': 'Transform data to new coordinate system',
                        'key_concept': 'Data is now expressed in terms of PCs'
                    }
                ],
                'interactive_elements': [
                    'drag_to_rotate',
                    'click_to_highlight',
                    'slider_for_components'
                ]
            }
            
            return Response({
                'status': 'success',
                'data': {
                    'simulation': {
                        'animation': animation,
                        'explanation': explanation,
                        'sample_data': data.tolist(),
                        'interactive': True
                    }
                },
                'message': 'PCA simulation ready'
            })
            
        except Exception as e:
            logger.error(f"Error creating PCA simulation: {str(e)}")
            return Response({
                'status': 'error',
                'error': {
                    'code': 'SIMULATION_ERROR',
                    'message': str(e)
                }
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DemoDataView(APIView):
    """Generate various demo datasets for PCA"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get list of available demo datasets"""
        demos = {
            'gene_expression': {
                'name': 'Gene Expression Dataset',
                'description': 'Simulated RNA-seq data with 3 cell types',
                'n_samples': 30,
                'n_features': 1000,
                'groups': ['TypeA', 'TypeB', 'TypeC']
            },
            'iris_extended': {
                'name': 'Extended Iris Dataset',
                'description': 'Classic Iris data with additional features',
                'n_samples': 150,
                'n_features': 8,
                'groups': ['Setosa', 'Versicolor', 'Virginica']
            },
            'time_series': {
                'name': 'Time Series Expression',
                'description': 'Gene expression over 5 time points',
                'n_samples': 50,
                'n_features': 500,
                'time_points': [0, 2, 4, 8, 16]
            },
            'single_cell': {
                'name': 'Single Cell RNA-seq',
                'description': 'Simulated scRNA-seq with cell trajectories',
                'n_samples': 200,
                'n_features': 2000,
                'trajectories': True
            }
        }
        
        return Response({
            'status': 'success',
            'data': {
                'demos': demos
            }
        })
    
    def post(self, request):
        """Generate specific demo dataset"""
        try:
            demo_type = request.data.get('demo_type', 'gene_expression')
            
            if demo_type == 'gene_expression':
                data, metadata = self._generate_gene_expression_demo()
            elif demo_type == 'iris_extended':
                data, metadata = self._generate_iris_extended_demo()
            elif demo_type == 'time_series':
                data, metadata = self._generate_time_series_demo()
            elif demo_type == 'single_cell':
                data, metadata = self._generate_single_cell_demo()
            else:
                return Response({
                    'status': 'error',
                    'error': {
                        'code': 'UNKNOWN_DEMO',
                        'message': f'Unknown demo type: {demo_type}'
                    }
                }, status=status.HTTP_400_BAD_REQUEST)
            
            return Response({
                'status': 'success',
                'data': {
                    'dataset': data.tolist(),
                    'metadata': metadata
                },
                'message': f'{demo_type} demo dataset generated'
            })
            
        except Exception as e:
            logger.error(f"Error generating demo data: {str(e)}")
            return Response({
                'status': 'error',
                'error': {
                    'code': 'DEMO_ERROR',
                    'message': str(e)
                }
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _generate_gene_expression_demo(self):
        """Generate simulated gene expression data"""
        np.random.seed(42)
        
        n_samples = 30
        n_genes = 1000
        
        # Three cell types with different expression patterns
        type_a = np.random.normal(5, 1, (10, n_genes))
        type_a[:, :100] += 3  # First 100 genes highly expressed
        
        type_b = np.random.normal(5, 1, (10, n_genes))
        type_b[:, 100:200] += 3  # Second 100 genes highly expressed
        
        type_c = np.random.normal(5, 1, (10, n_genes))
        type_c[:, 200:300] += 3  # Third 100 genes highly expressed
        
        data = np.vstack([type_a, type_b, type_c])
        
        # Add some noise
        data += np.random.normal(0, 0.5, data.shape)
        
        # Make non-negative
        data = np.maximum(data, 0)
        
        metadata = {
            'sample_names': [f'Sample_{i+1}' for i in range(n_samples)],
            'gene_names': [f'Gene_{i+1}' for i in range(n_genes)],
            'groups': ['TypeA'] * 10 + ['TypeB'] * 10 + ['TypeC'] * 10,
            'description': 'Three cell types with distinct expression signatures'
        }
        
        return data, metadata
    
    def _generate_iris_extended_demo(self):
        """Generate extended version of Iris dataset"""
        from sklearn.datasets import load_iris
        
        iris = load_iris()
        data = iris.data
        
        # Add correlated features
        data_extended = np.hstack([
            data,
            data[:, 0:1] * 0.5 + np.random.normal(0, 0.1, (len(data), 1)),  # Correlated with sepal length
            data[:, 2:3] * 0.7 + np.random.normal(0, 0.1, (len(data), 1)),  # Correlated with petal length
            np.random.normal(5, 2, (len(data), 2))  # Random features
        ])
        
        metadata = {
            'sample_names': [f'Iris_{i+1}' for i in range(len(data))],
            'feature_names': list(iris.feature_names) + [
                'Sepal_Length_Derived',
                'Petal_Length_Derived',
                'Random_Feature_1',
                'Random_Feature_2'
            ],
            'groups': [iris.target_names[i] for i in iris.target],
            'description': 'Extended Iris dataset with additional correlated and random features'
        }
        
        return data_extended, metadata
    
    def _generate_time_series_demo(self):
        """Generate time series expression data"""
        np.random.seed(42)
        
        n_timepoints = 5
        n_samples_per_timepoint = 10
        n_genes = 500
        
        timepoints = [0, 2, 4, 8, 16]
        data_list = []
        
        for t, time in enumerate(timepoints):
            # Simulate expression changes over time
            base_expression = np.random.normal(5, 1, (n_samples_per_timepoint, n_genes))
            
            # Some genes increase over time
            base_expression[:, :100] += t * 0.5
            
            # Some genes decrease over time
            base_expression[:, 100:200] -= t * 0.5
            
            # Some genes peak at middle timepoint
            peak_factor = np.exp(-((t - 2) ** 2) / 2)
            base_expression[:, 200:300] += peak_factor * 2
            
            data_list.append(base_expression)
        
        data = np.vstack(data_list)
        
        metadata = {
            'sample_names': [f'T{timepoints[i//n_samples_per_timepoint]}_S{i%n_samples_per_timepoint+1}' 
                           for i in range(len(data))],
            'gene_names': [f'Gene_{i+1}' for i in range(n_genes)],
            'time_points': np.repeat(timepoints, n_samples_per_timepoint).tolist(),
            'description': 'Time series with genes showing different temporal patterns'
        }
        
        return data, metadata
    
    def _generate_single_cell_demo(self):
        """Generate single cell RNA-seq like data with trajectories"""
        np.random.seed(42)
        
        n_cells = 200
        n_genes = 2000
        
        # Simulate a differentiation trajectory
        pseudotime = np.sort(np.random.uniform(0, 1, n_cells))
        
        data = np.zeros((n_cells, n_genes))
        
        # Early genes (high at beginning)
        for i in range(200):
            data[:, i] = np.exp(-pseudotime * 3) * 5 + np.random.normal(0, 0.5, n_cells)
        
        # Late genes (high at end)
        for i in range(200, 400):
            data[:, i] = (1 - np.exp(-pseudotime * 3)) * 5 + np.random.normal(0, 0.5, n_cells)
        
        # Transient genes (peak in middle)
        for i in range(400, 600):
            data[:, i] = np.exp(-((pseudotime - 0.5) ** 2) / 0.1) * 5 + np.random.normal(0, 0.5, n_cells)
        
        # Add random genes
        data[:, 600:] = np.random.normal(2, 1, (n_cells, n_genes - 600))
        
        # Make non-negative and add sparsity
        data = np.maximum(data, 0)
        mask = np.random.random(data.shape) < 0.3  # 30% dropout
        data[mask] = 0
        
        metadata = {
            'sample_names': [f'Cell_{i+1}' for i in range(n_cells)],
            'gene_names': [f'Gene_{i+1}' for i in range(n_genes)],
            'pseudotime': pseudotime.tolist(),
            'cell_types': ['Early'] * 67 + ['Intermediate'] * 66 + ['Late'] * 67,
            'description': 'Single cell data with differentiation trajectory'
        }
        
        return data, metadata