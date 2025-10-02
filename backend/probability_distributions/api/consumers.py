import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.core.exceptions import ObjectDoesNotExist

from ..models import Distribution, DistributionProject
from ..services.distribution_service import DistributionService


class DistributionConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time distribution calculations.
    Allows for interactive adjustments to distribution parameters.
    """
    
    async def connect(self):
        """
        Connect to the WebSocket and join the distribution group.
        """
        self.distribution_id = self.scope['url_route']['kwargs']['distribution_id']
        self.distribution_group_name = f'distribution_{self.distribution_id}'
        
        # Join distribution group
        await self.channel_layer.group_add(
            self.distribution_group_name,
            self.channel_name
        )
        
        # Accept the connection
        await self.accept()
        
        # Check if the distribution exists and belongs to the user
        try:
            distribution = await self.get_distribution()
            if not distribution:
                await self.close()
        except ObjectDoesNotExist:
            await self.close()
    
    async def disconnect(self, close_code):
        """
        Leave the distribution group when disconnecting.
        """
        # Leave distribution group
        await self.channel_layer.group_discard(
            self.distribution_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        """
        Receive message from WebSocket.
        Handle different types of calculation requests.
        """
        data = json.loads(text_data)
        action = data.get('action')
        
        if action == 'update_parameters':
            await self.update_parameters(data)
        elif action == 'calculate_pmf_pdf':
            await self.calculate_pmf_pdf(data)
        elif action == 'calculate_cdf':
            await self.calculate_cdf(data)
        elif action == 'calculate_probability':
            await self.calculate_probability(data)
        elif action == 'generate_random_sample':
            await self.generate_random_sample(data)
    
    async def update_parameters(self, data):
        """
        Update distribution parameters and broadcast the changes.
        """
        parameters = data.get('parameters', {})
        distribution = await self.get_distribution()
        
        if distribution:
            # Update parameters
            await self.update_distribution_parameters(distribution, parameters)
            
            # Broadcast to group
            await self.channel_layer.group_send(
                self.distribution_group_name,
                {
                    'type': 'distribution_parameters_updated',
                    'parameters': parameters
                }
            )
    
    async def calculate_pmf_pdf(self, data):
        """
        Calculate PMF or PDF based on current parameters and x values.
        """
        distribution = await self.get_distribution()
        
        if distribution:
            x_values = data.get('x_values', [])
            
            # Calculate PMF/PDF
            result = await self.perform_pmf_pdf_calculation(distribution, x_values)
            
            # Send result directly to the client
            await self.send(text_data=json.dumps({
                'type': 'pmf_pdf_calculated',
                'result': result
            }))
    
    async def calculate_cdf(self, data):
        """
        Calculate CDF based on current parameters and x values.
        """
        distribution = await self.get_distribution()
        
        if distribution:
            x_values = data.get('x_values', [])
            
            # Calculate CDF
            result = await self.perform_cdf_calculation(distribution, x_values)
            
            # Send result directly to the client
            await self.send(text_data=json.dumps({
                'type': 'cdf_calculated',
                'result': result
            }))
    
    async def calculate_probability(self, data):
        """
        Calculate probability based on current parameters and bounds.
        """
        distribution = await self.get_distribution()
        
        if distribution:
            probability_type = data.get('probability_type', 'less_than')
            lower_bound = data.get('lower_bound')
            upper_bound = data.get('upper_bound')
            x_value = data.get('x_value')
            
            # Calculate probability
            result = await self.perform_probability_calculation(
                distribution, probability_type, lower_bound, upper_bound, x_value
            )
            
            # Send result directly to the client
            await self.send(text_data=json.dumps({
                'type': 'probability_calculated',
                'result': result
            }))
    
    async def generate_random_sample(self, data):
        """
        Generate random samples from the distribution.
        """
        distribution = await self.get_distribution()
        
        if distribution:
            sample_size = data.get('sample_size', 100)
            seed = data.get('seed')
            
            # Generate samples
            result = await self.perform_sample_generation(distribution, sample_size, seed)
            
            # Send result directly to the client
            await self.send(text_data=json.dumps({
                'type': 'random_sample_generated',
                'result': result
            }))
    
    # Channel layer handlers
    
    async def distribution_parameters_updated(self, event):
        """
        Receive parameter update from group and forward to client.
        """
        parameters = event['parameters']
        
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'parameters_updated',
            'parameters': parameters
        }))
    
    # Database access methods
    
    @database_sync_to_async
    def get_distribution(self):
        """
        Get the distribution object if it belongs to the connected user.
        """
        user = self.scope['user']
        
        # Anonymous users are not allowed
        if user.is_anonymous:
            return None
        
        try:
            return Distribution.objects.select_related('project').get(
                id=self.distribution_id,
                project__user=user
            )
        except Distribution.DoesNotExist:
            return None
    
    @database_sync_to_async
    def update_distribution_parameters(self, distribution, parameters):
        """
        Update distribution parameters in the database.
        """
        distribution.parameters = parameters
        distribution.save(update_fields=['parameters'])
        return distribution
    
    # Calculation methods
    
    @database_sync_to_async
    def perform_pmf_pdf_calculation(self, distribution, x_values):
        """
        Perform PMF/PDF calculation using the distribution service.
        """
        return DistributionService.calculate_pmf_pdf(
            distribution.distribution_type,
            distribution.parameters,
            x_values
        )
    
    @database_sync_to_async
    def perform_cdf_calculation(self, distribution, x_values):
        """
        Perform CDF calculation using the distribution service.
        """
        return DistributionService.calculate_cdf(
            distribution.distribution_type,
            distribution.parameters,
            x_values
        )
    
    @database_sync_to_async
    def perform_probability_calculation(self, distribution, probability_type, lower_bound, upper_bound, x_value):
        """
        Perform probability calculation using the distribution service.
        """
        return DistributionService.calculate_probability(
            distribution.distribution_type,
            distribution.parameters,
            probability_type,
            lower_bound=lower_bound,
            upper_bound=upper_bound,
            x_value=x_value
        )
    
    @database_sync_to_async
    def perform_sample_generation(self, distribution, sample_size, seed):
        """
        Generate random samples using the distribution service.
        """
        return DistributionService.generate_random_sample(
            distribution.distribution_type,
            distribution.parameters,
            sample_size,
            seed
        )