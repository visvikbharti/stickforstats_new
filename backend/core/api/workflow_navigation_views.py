"""
Workflow Navigation API Views
=============================

Simple, functional API endpoints for workflow navigation.
Focus on getting to deployment quickly with essential features.

Author: Vishal Bharti
Date: 2025-08-26
Version: 1.0.0 (MVP)
"""

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.core.cache import cache
import json
import logging

from core.services.workflow import (
    NavigationController,
    WorkflowContext,
    DecisionEngine
)
# from core.models import Dataset, Workflow, AnalysisSession  # Models don't exist yet
from typing import Any as Dataset  # Placeholder type
from typing import Any as Workflow  # Placeholder type
from typing import Any as AnalysisSession  # Placeholder type

logger = logging.getLogger(__name__)


class WorkflowNavigationViewSet(viewsets.ViewSet):
    """
    API endpoints for workflow navigation.
    Simple implementation for MVP.
    """
    
    @action(detail=False, methods=['post'], url_path='initialize')
    def initialize(self, request):
        """
        Initialize workflow navigation.
        
        Expected data:
        - workflow_id: string
        - mode: string (guided/assisted/expert)
        """
        try:
            workflow_id = request.data.get('workflow_id')
            mode = request.data.get('mode', 'guided')
            user_id = request.user.id if request.user.is_authenticated else None
            
            # Create navigation controller
            controller = NavigationController(workflow_id=workflow_id, user_id=user_id)
            
            # Get initial state
            next_step = controller.get_next_step({})
            progress = controller.get_progress()
            recommendations = controller.get_recommendations()
            
            # Cache the controller for this session
            cache_key = f"nav_controller_{workflow_id}"
            cache.set(cache_key, controller, timeout=3600)  # 1 hour
            
            return Response({
                'success': True,
                'current_step': controller.current_step,
                'next_step': next_step,
                'available_steps': list(controller.decision_tree.keys()),
                'progress': progress['percentage'],
                'recommendations': recommendations
            })
            
        except Exception as e:
            logger.error(f"Navigation initialization failed: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], url_path='navigate')
    def navigate(self, request):
        """
        Navigate to a specific step.
        
        Expected data:
        - workflow_id: string
        - from_step: string
        - to_step: string
        - context: dict (optional)
        """
        try:
            workflow_id = request.data.get('workflow_id')
            to_step = request.data.get('to_step')
            context_data = request.data.get('context', {})
            
            # Get controller from cache
            cache_key = f"nav_controller_{workflow_id}"
            controller = cache.get(cache_key)
            
            if not controller:
                # Recreate if not in cache
                controller = NavigationController(workflow_id=workflow_id)
            
            # Update context if provided
            if context_data:
                controller.context.update(context_data)
            
            # Navigate
            success = controller.navigate_to_step(to_step)
            
            if success:
                # Get updated state
                progress = controller.get_progress()
                recommendations = controller.get_recommendations()
                
                # Update cache
                cache.set(cache_key, controller, timeout=3600)
                
                # Check if this is a decision point
                decision_node = None
                if to_step in ['test_selection', 'data_type_selection']:
                    # Get decision node from decision engine
                    engine = DecisionEngine()
                    decision_node = {
                        'id': to_step,
                        'question': 'What type of analysis do you need?',
                        'options': []  # Simplified for MVP
                    }
                
                return Response({
                    'success': True,
                    'current_step': controller.current_step,
                    'next_step': controller.get_next_step(controller.context),
                    'completed_steps': list(set(
                        [h['to'] for h in controller.navigation_history if h['to']]
                    )),
                    'progress': progress['percentage'],
                    'recommendations': recommendations,
                    'decision_node': decision_node
                })
            else:
                return Response(
                    {'error': 'Invalid navigation'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except Exception as e:
            logger.error(f"Navigation failed: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], url_path='validate')
    def validate(self, request):
        """
        Validate a step transition.
        
        Expected data:
        - workflow_id: string
        - from_step: string
        - to_step: string
        - context: dict (optional)
        """
        try:
            workflow_id = request.data.get('workflow_id')
            from_step = request.data.get('from_step')
            to_step = request.data.get('to_step')
            
            # Get controller
            cache_key = f"nav_controller_{workflow_id}"
            controller = cache.get(cache_key)
            
            if not controller:
                controller = NavigationController(workflow_id=workflow_id)
            
            # Validate
            is_valid, reason = controller.validate_transition(from_step, to_step)
            
            return Response({
                'is_valid': is_valid,
                'reason': reason,
                'errors': [] if is_valid else [reason]
            })
            
        except Exception as e:
            logger.error(f"Validation failed: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='actions/(?P<workflow_id>[^/]+)/(?P<step_id>[^/]+)')
    def get_actions(self, request, workflow_id, step_id):
        """
        Get available actions for a step.
        """
        try:
            # Get controller
            cache_key = f"nav_controller_{workflow_id}"
            controller = cache.get(cache_key)
            
            if not controller:
                controller = NavigationController(workflow_id=workflow_id)
            
            actions = controller.get_available_actions(step_id)
            
            return Response({
                'actions': actions
            })
            
        except Exception as e:
            logger.error(f"Get actions failed: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], url_path='save')
    def save_state(self, request):
        """
        Save navigation state.
        
        Expected data:
        - workflow_id: string
        - navigation_state: dict
        - context: dict
        """
        try:
            workflow_id = request.data.get('workflow_id')
            
            # Get controller
            cache_key = f"nav_controller_{workflow_id}"
            controller = cache.get(cache_key)
            
            if not controller:
                return Response(
                    {'error': 'No active navigation session'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Save state
            state_id = controller.save_state()
            
            return Response({
                'success': True,
                'state_id': state_id
            })
            
        except Exception as e:
            logger.error(f"Save state failed: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='load/(?P<workflow_id>[^/]+)/(?P<state_id>[^/]+)')
    def load_state(self, request, workflow_id, state_id):
        """
        Load navigation state.
        """
        try:
            # Create new controller
            controller = NavigationController(workflow_id=workflow_id)
            
            # Load state
            success = controller.load_state(state_id)
            
            if success:
                # Cache the controller
                cache_key = f"nav_controller_{workflow_id}"
                cache.set(cache_key, controller, timeout=3600)
                
                return Response({
                    'success': True,
                    'navigation_state': {
                        'current_step': controller.current_step,
                        'mode': controller.mode.value,
                        'progress': controller.get_progress()['percentage']
                    },
                    'context': controller.context
                })
            else:
                return Response(
                    {'error': 'Failed to load state'},
                    status=status.HTTP_404_NOT_FOUND
                )
                
        except Exception as e:
            logger.error(f"Load state failed: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], url_path='recommendations')
    def get_recommendations(self, request):
        """
        Get recommendations for current step.
        
        Expected data:
        - workflow_id: string
        - current_step: string
        - context: dict
        """
        try:
            workflow_id = request.data.get('workflow_id')
            current_step = request.data.get('current_step')
            context_data = request.data.get('context', {})
            
            # Get controller
            cache_key = f"nav_controller_{workflow_id}"
            controller = cache.get(cache_key)
            
            if not controller:
                controller = NavigationController(workflow_id=workflow_id)
                controller.current_step = current_step
            
            # Update context
            controller.context.update(context_data)
            
            # Get recommendations
            recommendations = controller.get_recommendations()
            
            return Response({
                'recommendations': recommendations
            })
            
        except Exception as e:
            logger.error(f"Get recommendations failed: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], url_path='decide')
    def make_decision(self, request):
        """
        Make a decision at a decision node.
        
        Expected data:
        - workflow_id: string
        - decision_node_id: string
        - selected_option: string
        - context: dict
        """
        try:
            workflow_id = request.data.get('workflow_id')
            decision_node_id = request.data.get('decision_node_id')
            selected_option = request.data.get('selected_option')
            context_data = request.data.get('context', {})
            
            # Get controller and decision engine
            cache_key = f"nav_controller_{workflow_id}"
            controller = cache.get(cache_key)
            
            if not controller:
                controller = NavigationController(workflow_id=workflow_id)
            
            # Simple decision logic for MVP
            next_step_map = {
                'continuous': 'test_selection',
                'categorical': 'test_selection',
                'one_sample_t': 'assumption_check',
                'two_sample_t': 'assumption_check',
                'chi_square': 'assumption_check'
            }
            
            next_step = next_step_map.get(selected_option, 'test_execution')
            
            return Response({
                'success': True,
                'next_step': next_step,
                'next_decision_node': None  # Simplified for MVP
            })
            
        except Exception as e:
            logger.error(f"Make decision failed: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class WorkflowContextAPI(APIView):
    """
    Simple API for workflow context management.
    """
    
    def post(self, request):
        """
        Update workflow context.
        """
        try:
            workflow_id = request.data.get('workflow_id')
            action = request.data.get('action')
            data = request.data.get('data')
            
            # Get or create context
            cache_key = f"workflow_context_{workflow_id}"
            context = cache.get(cache_key)
            
            if not context:
                context = WorkflowContext(workflow_id=workflow_id)
            
            # Handle different actions
            if action == 'set_data':
                # Simplified - just store the data reference
                context.metadata['data_uploaded'] = True
                context.metadata['data_shape'] = data.get('shape', [0, 0])
                
            elif action == 'set_parameter':
                key = data.get('key')
                value = data.get('value')
                category = data.get('category', 'general')
                context.set_parameter(key, value, category)
                
            elif action == 'add_result':
                result_key = data.get('key')
                result_data = data.get('data')
                result_type = data.get('type', 'analysis')
                context.add_result(result_key, result_data, result_type)
                
            elif action == 'save_checkpoint':
                checkpoint_name = data.get('name')
                checkpoint_id = context.save_checkpoint(checkpoint_name)
                return Response({'checkpoint_id': checkpoint_id})
                
            elif action == 'get_summary':
                summary = context.get_summary()
                return Response(summary)
            
            # Update cache
            cache.set(cache_key, context, timeout=3600)
            
            return Response({'success': True})
            
        except Exception as e:
            logger.error(f"Context update failed: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )