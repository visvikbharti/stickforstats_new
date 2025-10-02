import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.core.exceptions import ObjectDoesNotExist
import numpy as np

from ..models import ConfidenceIntervalProject
from ..services.bootstrap_service import BootstrapService


class SimulationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.project_id = self.scope['url_route']['kwargs']['project_id']
        self.user = self.scope['user']
        
        # Check if the user has access to this project
        if not await self.has_project_permission():
            await self.close()
            return
        
        # Set up the group name
        self.group_name = f'simulation_{self.project_id}'
        
        # Join the group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        await self.accept()
    
    async def disconnect(self, close_code):
        # Leave the group
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        """
        Receive message from WebSocket.
        Parse the received JSON and perform the requested action.
        """
        text_data_json = json.loads(text_data)
        action = text_data_json.get('action')
        
        if action == 'start_bootstrap_simulation':
            simulation_params = text_data_json.get('params', {})
            asyncio.create_task(self.run_bootstrap_simulation(simulation_params))
        
        elif action == 'cancel_simulation':
            # Implement cancel logic here if needed
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'simulation_cancelled',
                    'message': 'Simulation was cancelled'
                }
            )
    
    async def run_bootstrap_simulation(self, params):
        """Run a bootstrap simulation and send updates during the process."""
        try:
            # Send initial status
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'simulation_update',
                    'progress': 0,
                    'status': 'starting',
                    'message': 'Starting bootstrap simulation...'
                }
            )
            
            # Extract parameters
            true_param = params.get('true_param')
            sample_size = params.get('sample_size')
            n_simulations = params.get('n_simulations', 1000)
            n_bootstrap = params.get('n_bootstrap', 1000)
            distribution = params.get('distribution', 'normal')
            statistic = params.get('statistic', 'mean')
            confidence_level = params.get('confidence_level', 0.95)
            method = params.get('method', 'percentile')
            dist_params = params.get('dist_params', {})
            
            # Run the simulation in chunks to provide progress updates
            chunk_size = 50
            n_chunks = n_simulations // chunk_size
            
            # Initialize results containers
            coverage_results = []
            interval_widths = []
            
            # Simulate in chunks for progress reporting
            for chunk in range(n_chunks):
                # Calculate chunk results
                chunk_results = await self.run_simulation_chunk(
                    true_param, sample_size, chunk_size, n_bootstrap,
                    distribution, statistic, confidence_level, method, dist_params
                )
                
                # Update results
                coverage_results.extend(chunk_results['coverages'])
                interval_widths.extend(chunk_results['widths'])
                
                # Calculate progress
                progress = (chunk + 1) / n_chunks * 100
                
                # Current coverage rate
                current_coverage = np.mean(coverage_results)
                
                # Send progress update
                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        'type': 'simulation_update',
                        'progress': progress,
                        'status': 'running',
                        'current_coverage': float(current_coverage),
                        'samples_completed': len(coverage_results),
                        'message': f'Processed {len(coverage_results)} of {n_simulations} simulations...'
                    }
                )
            
            # Process final results
            final_results = {
                'coverage_rate': float(np.mean(coverage_results)),
                'mean_interval_width': float(np.mean(interval_widths)),
                'median_interval_width': float(np.median(interval_widths)),
                'coverages': coverage_results[:100],  # Just send a subset for plotting
                'widths': interval_widths[:100],  # Just send a subset for plotting
                'n_simulations': n_simulations,
                'n_bootstrap': n_bootstrap,
                'confidence_level': confidence_level,
                'true_param': true_param,
                'sample_size': sample_size
            }
            
            # Send final results
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'simulation_complete',
                    'status': 'complete',
                    'results': final_results,
                    'message': 'Simulation completed successfully'
                }
            )
        
        except Exception as e:
            # Send error message
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'simulation_error',
                    'status': 'error',
                    'error': str(e),
                    'message': f'Error occurred during simulation: {str(e)}'
                }
            )
    
    @database_sync_to_async
    def run_simulation_chunk(self, true_param, sample_size, chunk_size, n_bootstrap,
                           distribution, statistic, confidence_level, method, dist_params):
        """Run a chunk of the simulation and return the results."""
        # Create containers for results
        coverages = []
        widths = []
        
        # Run the simulations
        for _ in range(chunk_size):
            # Generate sample from the appropriate distribution
            if distribution == 'normal':
                mean = dist_params.get('mean', true_param)
                std = dist_params.get('std', 1.0)
                sample = np.random.normal(mean, std, sample_size)
            elif distribution == 'bernoulli':
                p = dist_params.get('p', true_param)
                sample = np.random.binomial(1, p, sample_size)
            elif distribution == 'exponential':
                rate = dist_params.get('rate', 1/true_param)
                sample = np.random.exponential(1/rate, sample_size)
            else:
                # Default to normal
                sample = np.random.normal(true_param, 1.0, sample_size)
            
            # Calculate bootstrap interval
            result = BootstrapService.bootstrap_ci(
                data=sample,
                confidence_level=confidence_level,
                n_resamples=n_bootstrap,
                method=method
            )
            
            # Check if the interval covers the true parameter
            lower = result['lower']
            upper = result['upper']
            covers = lower <= true_param <= upper
            width = upper - lower
            
            # Save results
            coverages.append(int(covers))
            widths.append(float(width))
        
        return {
            'coverages': coverages,
            'widths': widths
        }
    
    @database_sync_to_async
    def has_project_permission(self):
        """Check if the user has permission to access this project."""
        try:
            ConfidenceIntervalProject.objects.get(id=self.project_id, user=self.user)
            return True
        except ObjectDoesNotExist:
            return False
    
    async def simulation_update(self, event):
        """Send simulation update to WebSocket."""
        await self.send(text_data=json.dumps(event))
    
    async def simulation_complete(self, event):
        """Send simulation complete notification to WebSocket."""
        await self.send(text_data=json.dumps(event))
    
    async def simulation_error(self, event):
        """Send simulation error notification to WebSocket."""
        await self.send(text_data=json.dumps(event))
    
    async def simulation_cancelled(self, event):
        """Send simulation cancelled notification to WebSocket."""
        await self.send(text_data=json.dumps(event))