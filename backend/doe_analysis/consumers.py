import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from .models import ExperimentDesign, ModelAnalysis, OptimizationAnalysis

User = get_user_model()


class DOEAnalysisConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for real-time DOE analysis updates"""
    
    async def connect(self):
        """
        Connect to the WebSocket and join user-specific group
        """
        user_id = self.scope['url_route']['kwargs']['user_id']
        experiment_id = self.scope['url_route']['kwargs']['experiment_id']
        
        # Verify the user has access to this experiment
        if not await self.user_has_access(user_id, experiment_id):
            await self.close()
            return
        
        self.room_group_name = f"analysis_{user_id}_{experiment_id}"
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
    
    async def disconnect(self, close_code):
        """
        Leave room group
        """
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
    
    async def receive(self, text_data):
        """
        Receive message from WebSocket
        """
        text_data_json = json.loads(text_data)
        message_type = text_data_json.get('type')
        
        # Handle different message types
        if message_type == 'subscribe_analysis':
            analysis_id = text_data_json.get('analysis_id')
            # Get the current status of the analysis
            status = await self.get_analysis_status(analysis_id)
            # Send back the current status
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'analysis_status',
                    'message': {
                        'status': status,
                        'analysis_id': analysis_id
                    }
                }
            )
    
    async def analysis_status(self, event):
        """
        Receive status update from room group and send to WebSocket
        """
        message = event['message']
        
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'analysis_status',
            'message': message
        }))
    
    async def optimization_status(self, event):
        """
        Receive optimization status update from room group and send to WebSocket
        """
        message = event['message']
        
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'optimization_status',
            'message': message
        }))
    
    @database_sync_to_async
    def user_has_access(self, user_id, experiment_id):
        """
        Check if the user has access to the experiment
        """
        try:
            # Convert string IDs to integers if needed
            try:
                user_id = int(user_id)
                experiment_id = int(experiment_id)
            except ValueError:
                # If conversion fails, it might be a UUID or another format
                pass

            user = User.objects.get(id=user_id)
            experiment = ExperimentDesign.objects.get(id=experiment_id)

            # Check if the user is the owner of the experiment
            return experiment.user == user
        except (User.DoesNotExist, ExperimentDesign.DoesNotExist):
            return False
    
    @database_sync_to_async
    def get_analysis_status(self, analysis_id):
        """
        Get the current status of a model analysis
        """
        try:
            # Convert string ID to integer if needed
            try:
                analysis_id = int(analysis_id)
            except ValueError:
                # If conversion fails, it might be a UUID or another format
                pass

            analysis = ModelAnalysis.objects.get(id=analysis_id)
            return analysis.status
        except ModelAnalysis.DoesNotExist:
            return "NOT_FOUND"


class DOEOptimizationConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for real-time DOE optimization updates"""
    
    async def connect(self):
        """
        Connect to the WebSocket and join user-specific group
        """
        user_id = self.scope['url_route']['kwargs']['user_id']
        analysis_id = self.scope['url_route']['kwargs']['analysis_id']
        
        # Verify the user has access to this analysis
        if not await self.user_has_access(user_id, analysis_id):
            await self.close()
            return
        
        self.room_group_name = f"optimization_{user_id}_{analysis_id}"
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
    
    async def disconnect(self, close_code):
        """
        Leave room group
        """
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
    
    async def receive(self, text_data):
        """
        Receive message from WebSocket
        """
        text_data_json = json.loads(text_data)
        message_type = text_data_json.get('type')
        
        # Handle different message types
        if message_type == 'subscribe_optimization':
            optimization_id = text_data_json.get('optimization_id')
            # Get the current status of the optimization
            status = await self.get_optimization_status(optimization_id)
            # Send back the current status
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'optimization_status',
                    'message': {
                        'status': status,
                        'optimization_id': optimization_id
                    }
                }
            )
    
    async def optimization_status(self, event):
        """
        Receive status update from room group and send to WebSocket
        """
        message = event['message']
        
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'optimization_status',
            'message': message
        }))
    
    @database_sync_to_async
    def user_has_access(self, user_id, analysis_id):
        """
        Check if the user has access to the model analysis
        """
        try:
            # Convert string IDs to integers if needed
            try:
                user_id = int(user_id)
                analysis_id = int(analysis_id)
            except ValueError:
                # If conversion fails, it might be a UUID or another format
                pass

            user = User.objects.get(id=user_id)
            analysis = ModelAnalysis.objects.get(id=analysis_id)

            # Check if the user is the owner of the analysis
            return analysis.user == user
        except (User.DoesNotExist, ModelAnalysis.DoesNotExist):
            return False
    
    @database_sync_to_async
    def get_optimization_status(self, optimization_id):
        """
        Get the current status of an optimization analysis
        """
        try:
            # Convert string ID to integer if needed
            try:
                optimization_id = int(optimization_id)
            except ValueError:
                # If conversion fails, it might be a UUID or another format
                pass

            optimization = OptimizationAnalysis.objects.get(id=optimization_id)
            return optimization.status
        except OptimizationAnalysis.DoesNotExist:
            return "NOT_FOUND"