"""
WebSocket consumers for PCA Analysis.
"""

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist

from .models import PCAProject

User = get_user_model()

class PCAAnalysisConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for PCA Analysis real-time updates."""
    
    async def connect(self):
        """Handle WebSocket connection."""
        # Get user and project IDs from URL route
        self.user_id = self.scope['url_route']['kwargs']['user_id']
        self.project_id = self.scope['url_route']['kwargs']['project_id']
        
        # Validate user has access to this project
        if not await self.validate_access():
            await self.close()
            return
        
        # Set group name
        self.group_name = f"pca_analysis_{self.user_id}_{self.project_id}"
        
        # Join group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        # Accept the connection
        await self.accept()
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        # Leave group
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        """Receive message from WebSocket."""
        # Not used in this implementation - we only send updates
        pass
    
    async def pca_status(self, event):
        """Handle PCA status updates."""
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'pca_status',
            'data': event['message']
        }))
    
    async def pca_progress(self, event):
        """Handle PCA progress updates."""
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'pca_progress',
            'data': event['message']
        }))
    
    async def new_visualization(self, event):
        """Handle new visualization creation updates."""
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'new_visualization',
            'data': event['message']
        }))
    
    @database_sync_to_async
    def validate_access(self):
        """Validate user has access to this project."""
        try:
            # Get the authenticated user from the scope
            user = self.scope['user']
            
            # Anonymous users cannot access
            if user.is_anonymous:
                return False
            
            # Check if user ID matches
            if str(user.id) != self.user_id:
                return False
            
            # Check if user owns the project
            project = PCAProject.objects.get(id=self.project_id)
            return project.user_id == user.id
            
        except ObjectDoesNotExist:
            return False
        except Exception:
            return False