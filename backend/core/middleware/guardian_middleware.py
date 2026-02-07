"""
Guardian Compliance Middleware
==============================

Middleware to ensure all statistical API responses include Guardian context,
enforcing the Design Contract requirement:

    "No statistical result may exist without an explicit, traceable assumption context."

This middleware:
1. Identifies statistical API endpoints
2. Validates that responses include Guardian context
3. Logs warnings for non-compliant responses
4. Optionally blocks non-compliant responses (strict mode)

Author: StickForStats Development Team
Date: 2026-01-26
"""

import json
import logging
from typing import List, Set, Optional
from django.conf import settings
from django.http import JsonResponse

logger = logging.getLogger(__name__)


class GuardianComplianceMiddleware:
    """
    Middleware ensuring statistical endpoints return Guardian-compliant responses.

    Design Contract Compliance:
    - All statistical results MUST include Guardian context
    - Guardian context includes: assumptions_checked, violations, confidence_score
    - Non-compliant responses are logged as warnings (or blocked in strict mode)

    Configuration (in settings.py):
        GUARDIAN_MIDDLEWARE = {
            'ENABLED': True,
            'STRICT_MODE': False,  # If True, blocks non-compliant responses
            'LOG_LEVEL': 'WARNING',
            'STATISTICAL_ENDPOINTS': [...]  # Custom endpoint patterns
        }
    """

    # Default statistical endpoint patterns to monitor
    DEFAULT_STATISTICAL_ENDPOINTS = [
        '/api/core/test/execute/',
        '/api/core/bayesian/',
        '/api/core/correlation/',
        '/api/core/regression/',
        '/api/core/anova/',
        '/api/core/chi-square/',
        '/api/core/nonparametric/',
        '/api/core/mixed/',
        '/api/core/causal/',
    ]

    # Required Guardian context fields
    REQUIRED_GUARDIAN_FIELDS = [
        'guardian_report',
        'assumptions_checked',
        'violations',
        'confidence_score',
    ]

    # Optional but recommended Guardian context fields
    RECOMMENDED_GUARDIAN_FIELDS = [
        'can_proceed',
        'alternative_tests',
        '_guardian_context',
        '_contract_compliant',
    ]

    def __init__(self, get_response):
        """Initialize middleware with response handler."""
        self.get_response = get_response
        self._load_configuration()

    def _load_configuration(self):
        """Load middleware configuration from Django settings."""
        config = getattr(settings, 'GUARDIAN_MIDDLEWARE', {})

        self.enabled = config.get('ENABLED', True)
        self.strict_mode = config.get('STRICT_MODE', False)
        self.log_level = config.get('LOG_LEVEL', 'WARNING')
        self.statistical_endpoints = set(
            config.get('STATISTICAL_ENDPOINTS', self.DEFAULT_STATISTICAL_ENDPOINTS)
        )

        # Log configuration
        if self.enabled:
            logger.info(
                f"GuardianComplianceMiddleware enabled. "
                f"Strict mode: {self.strict_mode}. "
                f"Monitoring {len(self.statistical_endpoints)} endpoint patterns."
            )

    def __call__(self, request):
        """Process request and validate response for Guardian compliance."""
        # Get the response
        response = self.get_response(request)

        # Skip if middleware is disabled
        if not self.enabled:
            return response

        # Check if this is a statistical endpoint
        if not self._is_statistical_endpoint(request.path):
            return response

        # Skip non-JSON responses
        if not self._is_json_response(response):
            return response

        # Skip error responses (4xx, 5xx)
        if response.status_code >= 400:
            return response

        # Validate Guardian compliance
        compliance_result = self._validate_guardian_compliance(response)

        if not compliance_result['compliant']:
            self._log_compliance_violation(request.path, compliance_result)

            if self.strict_mode:
                return self._create_compliance_error_response(
                    request.path,
                    compliance_result
                )

        return response

    def _is_statistical_endpoint(self, path: str) -> bool:
        """Check if the request path matches a statistical endpoint pattern."""
        for pattern in self.statistical_endpoints:
            if path.startswith(pattern) or pattern in path:
                return True
        return False

    def _is_json_response(self, response) -> bool:
        """Check if response is JSON content type."""
        content_type = response.get('Content-Type', '')
        return 'application/json' in content_type

    def _validate_guardian_compliance(self, response) -> dict:
        """
        Validate that response includes required Guardian context.

        Returns:
            dict with 'compliant' boolean and details about violations
        """
        try:
            # Parse response content
            content = json.loads(response.content.decode('utf-8'))

            # Check for blocked flag (indicates Guardian blocked the analysis)
            if content.get('blocked', False):
                # Blocked responses are compliant if they include Guardian context
                has_guardian = '_guardian_context' in content or 'guardian_report' in content
                return {
                    'compliant': has_guardian,
                    'blocked_by_guardian': True,
                    'missing_fields': [] if has_guardian else ['guardian_report']
                }

            # Check required fields
            missing_required = []
            for field in self.REQUIRED_GUARDIAN_FIELDS:
                if field not in content:
                    missing_required.append(field)

            # Check recommended fields
            missing_recommended = []
            for field in self.RECOMMENDED_GUARDIAN_FIELDS:
                if field not in content:
                    missing_recommended.append(field)

            # Check for contract compliance flag
            contract_compliant = content.get('_contract_compliant', False)
            guardian_context = content.get('_guardian_context', False)

            return {
                'compliant': len(missing_required) == 0,
                'contract_flag_present': contract_compliant,
                'guardian_context_flag': guardian_context,
                'missing_required': missing_required,
                'missing_recommended': missing_recommended,
            }

        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            return {
                'compliant': False,
                'error': f'Failed to parse response: {str(e)}',
                'missing_required': self.REQUIRED_GUARDIAN_FIELDS,
            }

    def _log_compliance_violation(self, path: str, compliance_result: dict):
        """Log Guardian compliance violation with appropriate severity."""
        missing = compliance_result.get('missing_required', [])
        missing_str = ', '.join(missing) if missing else 'unknown'

        message = (
            f"DESIGN CONTRACT VIOLATION: Statistical endpoint '{path}' "
            f"returned response without Guardian context. "
            f"Missing fields: [{missing_str}]. "
            f"Contract requirement: 'No statistical result may exist "
            f"without an explicit, traceable assumption context.'"
        )

        if self.log_level == 'ERROR':
            logger.error(message)
        elif self.log_level == 'WARNING':
            logger.warning(message)
        else:
            logger.info(message)

    def _create_compliance_error_response(
        self,
        path: str,
        compliance_result: dict
    ) -> JsonResponse:
        """
        Create an error response when strict mode blocks non-compliant response.

        This enforces the Design Contract by refusing to return statistical
        results without Guardian context.
        """
        return JsonResponse({
            'error': 'Design Contract Violation',
            'message': (
                'This statistical endpoint returned results without Guardian '
                'assumption context, violating the StickForStats Design Contract. '
                'Statistical results must always include assumption validation.'
            ),
            'endpoint': path,
            'missing_fields': compliance_result.get('missing_required', []),
            'contract_requirement': (
                'No statistical result may exist without an explicit, '
                'traceable assumption context.'
            ),
            'resolution': (
                'Ensure the endpoint uses GuardianStatisticalTestService or '
                'GuardianServiceWrapper to include Guardian context in responses.'
            ),
            '_guardian_compliance_error': True,
        }, status=500)


class GuardianContextInjectorMiddleware:
    """
    Middleware that can inject minimal Guardian context into legacy responses.

    USE WITH CAUTION: This middleware exists for backwards compatibility during
    migration. New endpoints should use proper Guardian integration, not this.

    This middleware:
    1. Detects responses without Guardian context
    2. Injects a minimal "unchecked" Guardian report
    3. Marks the response as requiring proper Guardian integration
    """

    def __init__(self, get_response):
        """Initialize middleware."""
        self.get_response = get_response
        config = getattr(settings, 'GUARDIAN_MIDDLEWARE', {})
        self.enabled = config.get('INJECT_CONTEXT', False)

    def __call__(self, request):
        """Process request and inject Guardian context if needed."""
        response = self.get_response(request)

        if not self.enabled:
            return response

        # Only process JSON responses
        content_type = response.get('Content-Type', '')
        if 'application/json' not in content_type:
            return response

        # Skip error responses
        if response.status_code >= 400:
            return response

        try:
            content = json.loads(response.content.decode('utf-8'))

            # Skip if already has Guardian context
            if '_guardian_context' in content or 'guardian_report' in content:
                return response

            # Inject minimal Guardian context
            content.update({
                'guardian_report': {
                    'test_type': 'unknown',
                    'assumptions_checked': [],
                    'violations': [],
                    'can_proceed': True,
                    'confidence_score': 0,
                    'alternative_tests': [],
                    '_injected_by_middleware': True,
                    '_requires_proper_integration': True,
                    'warning': (
                        'This Guardian report was injected by middleware. '
                        'The endpoint should be updated to use proper Guardian integration.'
                    )
                },
                'assumptions_checked': [],
                'violations': [],
                'confidence_score': 0,
                'can_proceed': True,
                'alternative_tests': [],
                '_guardian_context': True,
                '_contract_compliant': False,  # Mark as NOT compliant
                '_middleware_injected': True,
            })

            # Update response content
            response.content = json.dumps(content).encode('utf-8')
            response['Content-Length'] = len(response.content)

        except (json.JSONDecodeError, UnicodeDecodeError):
            pass

        return response
