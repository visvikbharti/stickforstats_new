"""
WebSocket consumers for SQC Analysis.

This module provides WebSocket consumers for real-time updates during SQC analysis.
"""

import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model

User = get_user_model()
logger = logging.getLogger(__name__)


class SQCAnalysisConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for SQC analysis progress updates."""
    
    async def connect(self):
        """Handle WebSocket connection."""
        # Get user from scope (requires AuthMiddlewareStack)
        self.user = self.scope["user"]
        
        if not self.user.is_authenticated:
            # Reject connection if user is not authenticated
            await self.close()
            return
        
        # Get analysis ID from URL route
        self.analysis_id = self.scope['url_route']['kwargs'].get('analysis_id')
        if not self.analysis_id:
            # Close connection if no analysis ID provided
            await self.close()
            return
        
        # Create group name for this analysis
        self.group_name = f"sqc_analysis_{self.analysis_id}"
        
        # Check if user has access to the analysis
        has_access = await self.check_analysis_access()
        if not has_access:
            # Close connection if user doesn't have access
            await self.close()
            return
        
        # Join channel group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        # Accept connection
        await self.accept()
        
        # Send initial status
        await self.send_initial_status()
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        # Leave group
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )
    
    async def receive(self, text_data):
        """Handle received messages from WebSocket."""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'request_status':
                # Client requests current status update
                await self.send_initial_status()
                
        except json.JSONDecodeError:
            logger.error(f"Received invalid JSON: {text_data}")
        except Exception as e:
            logger.error(f"Error handling message: {str(e)}")
    
    @database_sync_to_async
    def check_analysis_access(self):
        """Check if user has access to the analysis session."""
# from core.models import AnalysisSession  # Models don't exist yet
from typing import Any as AnalysisSession  # Placeholder type
        try:
            # Filter by both ID and user to ensure user has access
            return AnalysisSession.objects.filter(
                id=self.analysis_id, 
                user=self.user
            ).exists()
        except Exception as e:
            logger.error(f"Error checking analysis access: {str(e)}")
            return False
    
    @database_sync_to_async
    def get_analysis_status(self):
        """Get current status of the analysis session."""
# from core.models import AnalysisSession  # Models don't exist yet
from typing import Any as AnalysisSession  # Placeholder type
        try:
            session = AnalysisSession.objects.get(id=self.analysis_id)
            return {
                'id': str(session.id),
                'name': session.name,
                'status': session.status,
                'updated_at': session.updated_at.isoformat(),
                'results_count': session.results.count()
            }
        except AnalysisSession.DoesNotExist:
            return {'error': 'Analysis session not found'}
        except Exception as e:
            logger.error(f"Error getting analysis status: {str(e)}")
            return {'error': str(e)}
    
    async def send_initial_status(self):
        """Send initial status update to client."""
        status = await self.get_analysis_status()
        await self.send(text_data=json.dumps({
            'type': 'status_update',
            'data': status
        }))
    
    async def status_update(self, event):
        """Handle status update event from channel layer."""
        # Send status update to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'status_update',
            'data': event['data']
        }))
    
    async def analysis_complete(self, event):
        """Handle analysis complete event from channel layer."""
        # Send completion message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'analysis_complete',
            'data': event['data']
        }))
    
    async def progress_update(self, event):
        """Handle progress update event from channel layer."""
        # Send progress update to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'progress_update',
            'data': event['data']
        }))