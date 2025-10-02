import os
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
import uuid
from pathlib import Path
import pandas as pd

from django.conf import settings
from django.core.cache import cache

from core.services.error_handler import safe_operation

logger = logging.getLogger(__name__)

class WorkflowService:
    """
    Manages analysis workflows, including saving and loading states,
    handling data persistence, and workflow lifecycle management.
    
    This service provides methods for:
    - Creating and managing workflow definitions
    - Saving and loading workflow states
    - Managing workflow data and execution
    - Versioning and tracking workflow changes
    """
    
    def __init__(self, storage_dir: Optional[str] = None):
        """
        Initialize workflow manager with storage path.
        
        Args:
            storage_dir: Directory for workflow storage (optional)
        """
        self.storage_dir = storage_dir or os.path.join(settings.BASE_DIR, "data", "workflows")
        os.makedirs(self.storage_dir, exist_ok=True)
        
    @safe_operation
    def save_workflow_state(self, workflow_id: str, state: Dict[str, Any], 
                          data: Optional[pd.DataFrame] = None,
                          username: Optional[str] = None) -> bool:
        """
        Save workflow state and associated data.
        
        Args:
            workflow_id: Unique identifier for the workflow
            state: State data to save
            data: Associated DataFrame to save
            username: Optional username for user-specific workflows
            
        Returns:
            True if save successful, False otherwise
        """
        # Prepare workflow directory
        workflow_path = self._get_workflow_path(workflow_id, username)
        os.makedirs(workflow_path, exist_ok=True)

        # Add metadata to state
        current_time = datetime.now().isoformat()
        state['last_modified'] = current_time
        if 'created_at' not in state:
            state['created_at'] = current_time
        
        if username:
            state['username'] = username
            
        # Add version tracking
        if 'version' in state:
            state['version'] += 1
        else:
            state['version'] = 1
            
        # Save state atomically
        state_file = os.path.join(workflow_path, "state.json")
        temp_file = f"{state_file}.tmp"
        with open(temp_file, 'w') as f:
            json.dump(state, f, indent=2)
        os.replace(temp_file, state_file)
        
        # Cache the state for quick access
        cache_key = f"workflow_{workflow_id}"
        cache.set(cache_key, state, timeout=3600)  # 1 hour cache

        # Save data if provided
        if data is not None:
            data_file = os.path.join(workflow_path, "data.csv")
            # Save to temporary file first to avoid partial writes
            temp_data_file = f"{data_file}.tmp"
            data.to_csv(temp_data_file, index=False)
            os.replace(temp_data_file, data_file)
            
            # Store data shape in state
            with open(state_file, 'r') as f:
                updated_state = json.load(f)
            updated_state['data_shape'] = data.shape
            with open(temp_file, 'w') as f:
                json.dump(updated_state, f, indent=2)
            os.replace(temp_file, state_file)

        return True
        
    @safe_operation
    def load_workflow_state(self, workflow_id: str, 
                          username: Optional[str] = None) -> Tuple[Optional[Dict[str, Any]], 
                                                                Optional[pd.DataFrame]]:
        """
        Load workflow state and associated data.
        
        Args:
            workflow_id: Unique identifier for the workflow
            username: Optional username for user-specific workflows
            
        Returns:
            Tuple of (state, data) if found, (None, None) if not found
        """
        # Check cache first for state
        cache_key = f"workflow_{workflow_id}"
        cached_state = cache.get(cache_key)
        
        if cached_state and not username:
            # Use cached state, but still need to load data
            workflow_path = self._get_workflow_path(workflow_id, cached_state.get('username'))
        else:
            # Try to find the workflow
            workflow_path = self._get_workflow_path(workflow_id, username)
            
            if not os.path.exists(workflow_path):
                # Try global workflows if username-specific not found
                workflow_path = self._get_workflow_path(workflow_id)
                
            if not os.path.exists(workflow_path):
                logger.warning(f"Workflow {workflow_id} not found")
                return None, None
                
            # Load state
            state_file = os.path.join(workflow_path, "state.json")
            if not os.path.exists(state_file):
                logger.error(f"State file missing for workflow {workflow_id}")
                return None, None
                
            with open(state_file, 'r') as f:
                cached_state = json.load(f)
                
            # Update cache
            cache.set(cache_key, cached_state, timeout=3600)  # 1 hour cache

        # Load data if exists
        data = None
        data_file = os.path.join(workflow_path, "data.csv")
        if os.path.exists(data_file):
            try:
                data = pd.read_csv(data_file)
            except Exception as e:
                logger.error(f"Error loading workflow data: {str(e)}")

        return cached_state, data
        
    def _get_workflow_path(self, workflow_id: str, username: Optional[str] = None) -> str:
        """
        Get the filesystem path for a workflow.
        
        Args:
            workflow_id: Unique identifier for the workflow
            username: Optional username for user-specific workflows
            
        Returns:
            Filesystem path for the workflow
        """
        if username:
            # User-specific workflow
            return os.path.join(self.storage_dir, username, workflow_id)
        else:
            # Global workflow
            return os.path.join(self.storage_dir, workflow_id)
        
    @safe_operation
    def create_workflow(self, name: str, description: str, 
                      workflow_type: str, username: Optional[str] = None) -> Dict[str, Any]:
        """
        Create a new workflow.
        
        Args:
            name: Human-readable workflow name
            description: Workflow description
            workflow_type: Type of workflow
            username: Optional username for user-specific workflows
            
        Returns:
            New workflow information
        """
        workflow_id = str(uuid.uuid4())
        created_at = datetime.now().isoformat()
        
        workflow_state = {
            'id': workflow_id,
            'name': name,
            'description': description,
            'type': workflow_type,
            'created_at': created_at,
            'last_modified': created_at,
            'status': 'created',
            'version': 1,
            'steps': [],
            'current_step': 0,
            'metadata': {}
        }
        
        if username:
            workflow_state['username'] = username
            
        # Save the new workflow
        success = self.save_workflow_state(workflow_id, workflow_state, username=username)
        
        if not success:
            return {'error': 'Failed to create workflow'}
            
        return workflow_state
        
    @safe_operation
    def list_workflows(self, username: Optional[str] = None, 
                     workflow_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        List all available workflows with their metadata.
        
        Args:
            username: Optional username for user-specific workflows
            workflow_type: Optional type filter
            
        Returns:
            List of workflow information dictionaries
        """
        workflows = []
        
        # First, check global workflows
        global_path = self.storage_dir
        if os.path.exists(global_path):
            for workflow_id in os.listdir(global_path):
                workflow_path = os.path.join(global_path, workflow_id)
                if os.path.isdir(workflow_path):
                    # Skip user directories
                    if workflow_id == username:
                        continue
                        
                    state = self._load_workflow_metadata(workflow_path)
                    if state:
                        # Apply type filter if specified
                        if workflow_type and state.get('type') != workflow_type:
                            continue
                            
                        workflows.append(state)
        
        # Then, check user-specific workflows if username provided
        if username:
            user_path = os.path.join(self.storage_dir, username)
            if os.path.exists(user_path):
                for workflow_id in os.listdir(user_path):
                    workflow_path = os.path.join(user_path, workflow_id)
                    if os.path.isdir(workflow_path):
                        state = self._load_workflow_metadata(workflow_path)
                        if state:
                            # Apply type filter if specified
                            if workflow_type and state.get('type') != workflow_type:
                                continue
                                
                            workflows.append(state)
        
        # Sort workflows by last modification date
        workflows.sort(key=lambda x: x.get('last_modified', ''), reverse=True)
        
        return workflows
        
    def _load_workflow_metadata(self, workflow_path: str) -> Optional[Dict[str, Any]]:
        """
        Load workflow metadata without loading the full data.
        
        Args:
            workflow_path: Filesystem path to the workflow
            
        Returns:
            Workflow state or None if not found
        """
        state_file = os.path.join(workflow_path, "state.json")
        if os.path.exists(state_file):
            try:
                with open(state_file, 'r') as f:
                    state = json.load(f)
                    
                # Include data info but not the actual data
                data_file = os.path.join(workflow_path, "data.csv")
                if os.path.exists(data_file):
                    state['has_data'] = True
                    # Include data shape if available
                    if 'data_shape' not in state:
                        try:
                            data = pd.read_csv(data_file, nrows=1)
                            state['data_shape'] = (
                                sum(1 for _ in open(data_file)) - 1,  # Count rows
                                len(data.columns)
                            )
                        except Exception as e:
                            logger.warning(f"Could not determine data shape: {str(e)}")
                else:
                    state['has_data'] = False
                    
                return state
            except Exception as e:
                logger.error(f"Error loading workflow metadata: {str(e)}")
                
        return None
        
    @safe_operation
    def delete_workflow(self, workflow_id: str, username: Optional[str] = None) -> bool:
        """
        Delete a workflow and its associated data.
        
        Args:
            workflow_id: Unique identifier for the workflow
            username: Optional username for user-specific workflows
            
        Returns:
            True if deletion successful, False otherwise
        """
        workflow_path = self._get_workflow_path(workflow_id, username)
        
        if not os.path.exists(workflow_path):
            # Try global workflows if username-specific not found
            workflow_path = self._get_workflow_path(workflow_id)
            
        if not os.path.exists(workflow_path):
            logger.warning(f"Workflow {workflow_id} not found")
            return False
            
        try:
            # Delete all files in the workflow directory
            for file in os.listdir(workflow_path):
                os.remove(os.path.join(workflow_path, file))
                
            # Remove the directory itself
            os.rmdir(workflow_path)
            
            # Clear cache
            cache.delete(f"workflow_{workflow_id}")
            
            return True
        except Exception as e:
            logger.error(f"Error deleting workflow {workflow_id}: {str(e)}")
            return False
            
    @safe_operation
    def update_workflow_state(self, workflow_id: str, state_updates: Dict[str, Any],
                            username: Optional[str] = None) -> Dict[str, Any]:
        """
        Update specific fields in a workflow's state.
        
        Args:
            workflow_id: Unique identifier for the workflow
            state_updates: Dictionary of state updates to apply
            username: Optional username for user-specific workflows
            
        Returns:
            Updated workflow state
        """
        current_state, data = self.load_workflow_state(workflow_id, username)
        if current_state is None:
            return {'error': 'Workflow not found'}
            
        # Prevent overwriting certain fields
        protected_fields = ['id', 'created_at', 'version']
        for field in protected_fields:
            if field in state_updates:
                del state_updates[field]
                
        # Update state with new values
        current_state.update(state_updates)
        
        # Save updated state
        success = self.save_workflow_state(workflow_id, current_state, data, username)
        
        if not success:
            return {'error': 'Failed to update workflow'}
            
        return current_state
        
    @safe_operation
    def add_workflow_step(self, workflow_id: str, step_data: Dict[str, Any],
                        username: Optional[str] = None) -> Dict[str, Any]:
        """
        Add a step to a workflow.
        
        Args:
            workflow_id: Unique identifier for the workflow
            step_data: Step data to add
            username: Optional username for user-specific workflows
            
        Returns:
            Updated workflow state
        """
        current_state, data = self.load_workflow_state(workflow_id, username)
        if current_state is None:
            return {'error': 'Workflow not found'}
            
        # Create step with metadata
        step_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        
        step = {
            'id': step_id,
            'created_at': timestamp,
            'status': 'pending',
            **step_data
        }
        
        # Add step to workflow
        if 'steps' not in current_state:
            current_state['steps'] = []
            
        current_state['steps'].append(step)
        
        # Update workflow status
        current_state['status'] = 'in_progress'
        current_state['last_modified'] = timestamp
        
        # Save updated state
        success = self.save_workflow_state(workflow_id, current_state, data, username)
        
        if not success:
            return {'error': 'Failed to add workflow step'}
            
        return current_state
        
    @safe_operation
    def update_workflow_step(self, workflow_id: str, step_id: str, 
                           step_updates: Dict[str, Any],
                           username: Optional[str] = None) -> Dict[str, Any]:
        """
        Update a workflow step.
        
        Args:
            workflow_id: Unique identifier for the workflow
            step_id: Unique identifier for the step
            step_updates: Dictionary of step updates to apply
            username: Optional username for user-specific workflows
            
        Returns:
            Updated workflow state
        """
        current_state, data = self.load_workflow_state(workflow_id, username)
        if current_state is None:
            return {'error': 'Workflow not found'}
            
        # Find step
        if 'steps' not in current_state:
            return {'error': 'Workflow has no steps'}
            
        step_index = None
        for i, step in enumerate(current_state['steps']):
            if step.get('id') == step_id:
                step_index = i
                break
                
        if step_index is None:
            return {'error': 'Step not found'}
            
        # Update step
        step = current_state['steps'][step_index]
        step.update(step_updates)
        step['last_modified'] = datetime.now().isoformat()
        
        # Update workflow status based on step status
        if step.get('status') == 'completed':
            # Check if this is the last step
            if step_index == len(current_state['steps']) - 1:
                # Check if all steps are completed
                all_completed = all(s.get('status') == 'completed' for s in current_state['steps'])
                if all_completed:
                    current_state['status'] = 'completed'
        
        # Save updated state
        success = self.save_workflow_state(workflow_id, current_state, data, username)
        
        if not success:
            return {'error': 'Failed to update workflow step'}
            
        return current_state
        
    @safe_operation
    def get_workflow_history(self, workflow_id: str, username: Optional[str] = None,
                           include_internal: bool = False) -> List[Dict[str, Any]]:
        """
        Get history of workflow executions.
        
        Args:
            workflow_id: Unique identifier for the workflow
            username: Optional username for user-specific workflows
            include_internal: Whether to include internal workflow history
            
        Returns:
            List of workflow execution records
        """
        # This is a more advanced feature that would typically rely on database logging
        # For simplicity, we'll return version history from the state files
        
        workflow_path = self._get_workflow_path(workflow_id, username)
        history_dir = os.path.join(workflow_path, 'history')
        
        if not os.path.exists(history_dir):
            return []
            
        history = []
        for filename in os.listdir(history_dir):
            if filename.endswith('.json'):
                try:
                    with open(os.path.join(history_dir, filename), 'r') as f:
                        state = json.load(f)
                        
                        # Filter out internal fields if needed
                        if not include_internal:
                            state = {k: v for k, v in state.items() 
                                    if not k.startswith('_')}
                                    
                        history.append(state)
                except Exception as e:
                    logger.error(f"Error loading workflow history: {str(e)}")
                    
        # Sort by version or timestamp
        history.sort(key=lambda x: (x.get('version', 0), x.get('last_modified', '')))
        
        return history
        
    @safe_operation
    def export_workflow(self, workflow_id: str, username: Optional[str] = None,
                      include_data: bool = True) -> Dict[str, Any]:
        """
        Export a workflow for sharing or backup.
        
        Args:
            workflow_id: Unique identifier for the workflow
            username: Optional username for user-specific workflows
            include_data: Whether to include workflow data
            
        Returns:
            Dictionary with workflow definition and optional data
        """
        state, data = self.load_workflow_state(workflow_id, username)
        if state is None:
            return {'error': 'Workflow not found'}
            
        export_data = {
            'workflow': state,
            'export_date': datetime.now().isoformat(),
            'export_version': '1.0'
        }
        
        if include_data and data is not None:
            # Convert DataFrame to dictionary
            export_data['data'] = {
                'columns': data.columns.tolist(),
                'index': data.index.tolist(),
                'values': data.values.tolist()
            }
            
        return export_data
        
    @safe_operation
    def import_workflow(self, workflow_data: Dict[str, Any], 
                      username: Optional[str] = None) -> Dict[str, Any]:
        """
        Import a workflow from an export.
        
        Args:
            workflow_data: Exported workflow data
            username: Optional username for user-specific workflows
            
        Returns:
            Imported workflow information
        """
        if 'workflow' not in workflow_data:
            return {'error': 'Invalid workflow data'}
            
        workflow = workflow_data['workflow']
        
        # Generate new ID to avoid conflicts
        original_id = workflow.get('id')
        workflow['id'] = str(uuid.uuid4())
        
        # Update metadata
        workflow['imported_from'] = original_id
        workflow['import_date'] = datetime.now().isoformat()
        
        # Recreate data if included
        data = None
        if 'data' in workflow_data:
            data_dict = workflow_data['data']
            try:
                data = pd.DataFrame(
                    data=data_dict['values'],
                    columns=data_dict['columns'],
                    index=data_dict['index']
                )
            except Exception as e:
                logger.error(f"Error recreating data: {str(e)}")
                
        # Save the imported workflow
        success = self.save_workflow_state(workflow['id'], workflow, data, username)
        
        if not success:
            return {'error': 'Failed to import workflow'}
            
        return workflow

# Initialize global workflow service
workflow_service = WorkflowService()

def get_workflow_service() -> WorkflowService:
    """Get the global workflow service instance."""
    return workflow_service