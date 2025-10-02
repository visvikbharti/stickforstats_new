# stickforstats/core/services/__init__.py

# Core Services
# DataService has issues with Dataset model that doesn't exist yet
# from .data_service import DataService
from .dataset_service import DatasetService
from .error_handler import ErrorHandler, safe_operation, try_except, ApiErrorResponse

# Import services from submodules
from .analytics.statistical import (
    AdvancedStatisticalAnalysisService,
    StatisticalTestService
)

from .data_processing import (
    DataValidator,
    EnhancedDataValidator,
    StatisticalUtilsService
)

from .visualization import VisualizationService

from .report import ReportService

from .guidance import GuidanceService

from .session import SessionService, get_session_service

from .auth import AuthService, get_auth_service, JWTAuthentication

from .workflow import WorkflowService, get_workflow_service

__all__ = [
    # Core services
    # 'DataService',  # Disabled until Dataset model is implemented
    'DatasetService',
    'ErrorHandler',
    'safe_operation',
    'try_except',
    'ApiErrorResponse',
    
    # Analytics services
    'AdvancedStatisticalAnalysisService',
    'StatisticalTestService',
    
    # Data processing services
    'DataValidator',
    'EnhancedDataValidator',
    'StatisticalUtilsService',
    
    # Visualization services
    'VisualizationService',
    
    # Report services
    'ReportService',
    
    # Guidance services
    'GuidanceService',
    
    # Session management
    'SessionService',
    'get_session_service',
    
    # Authentication
    'AuthService',
    'get_auth_service',
    'JWTAuthentication',
    
    # Workflow management
    'WorkflowService',
    'get_workflow_service'
]