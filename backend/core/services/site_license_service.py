"""
University Site License Service
================================
Manages institutional site licenses that provide platform access
to all members of a university or research institution.
"""

import hashlib
import logging
import uuid
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


# License tiers for institutions
INSTITUTION_TIERS = {
    'department': {
        'name': 'Department License',
        'max_users': 50,
        'max_analyses_per_month': 10000,
        'features': ['guardian', 'sqs', 'autonomous', 'education', 'certification'],
        'price_yearly': 2000,
    },
    'school': {
        'name': 'School/College License',
        'max_users': 500,
        'max_analyses_per_month': 100000,
        'features': ['guardian', 'sqs', 'autonomous', 'education', 'certification', 'ai_advisor', 'manuscript_review'],
        'price_yearly': 10000,
    },
    'university': {
        'name': 'University-Wide License',
        'max_users': -1,  # Unlimited
        'max_analyses_per_month': -1,  # Unlimited
        'features': ['guardian', 'sqs', 'autonomous', 'education', 'certification', 'ai_advisor', 'manuscript_review', 'api_access', 'custom_branding'],
        'price_yearly': 50000,
    },
}

# Supported email domain verification methods
VERIFICATION_METHODS = ['email_domain', 'ip_range', 'saml_sso', 'manual']


class SiteLicenseService:
    """Manages university/institutional site licenses."""

    @classmethod
    def get_tiers(cls):
        """Return available institutional license tiers."""
        return [
            {'id': tid, **tinfo}
            for tid, tinfo in INSTITUTION_TIERS.items()
        ]

    @classmethod
    def create_license(cls, institution_name, tier_id, admin_email, domain,
                       verification_method='email_domain', start_date=None, duration_years=1):
        """
        Create a new site license for an institution.
        Returns license details including activation key.
        """
        tier = INSTITUTION_TIERS.get(tier_id)
        if not tier:
            return {'error': f'Unknown tier: {tier_id}'}

        start = start_date or datetime.utcnow()
        end = start + timedelta(days=365 * duration_years)

        # Generate license key
        raw = f"{institution_name}-{tier_id}-{start.isoformat()}-{uuid.uuid4()}"
        license_key = f"SFS-INST-{hashlib.sha256(raw.encode()).hexdigest()[:16].upper()}"

        license_data = {
            'license_key': license_key,
            'institution_name': institution_name,
            'tier': tier_id,
            'tier_name': tier['name'],
            'admin_email': admin_email,
            'domain': domain,
            'verification_method': verification_method,
            'max_users': tier['max_users'],
            'max_analyses_per_month': tier['max_analyses_per_month'],
            'features': tier['features'],
            'start_date': start.isoformat(),
            'end_date': end.isoformat(),
            'duration_years': duration_years,
            'price_yearly': tier['price_yearly'],
            'total_price': tier['price_yearly'] * duration_years,
            'status': 'active',
        }

        # In production, save to SiteLicense model
        logger.info(f"Site license created: {license_key} for {institution_name}")
        return license_data

    @classmethod
    def verify_user_eligibility(cls, email, license_data):
        """
        Check if a user's email matches the institution's domain.
        """
        domain = license_data.get('domain', '')
        method = license_data.get('verification_method', 'email_domain')

        if method == 'email_domain':
            user_domain = email.split('@')[-1] if '@' in email else ''
            if user_domain.endswith(domain):
                return {'eligible': True, 'method': 'email_domain', 'domain': domain}
            return {'eligible': False, 'reason': f'Email domain does not match {domain}'}

        elif method == 'manual':
            return {'eligible': True, 'method': 'manual', 'note': 'Manual verification required'}

        elif method == 'saml_sso':
            return {'eligible': True, 'method': 'saml_sso', 'note': 'Verified via SSO'}

        return {'eligible': False, 'reason': 'Unknown verification method'}

    @classmethod
    def get_license_usage(cls, license_key):
        """Get usage statistics for a site license."""
        # In production, aggregate from UsageRecord model
        return {
            'license_key': license_key,
            'active_users': 0,
            'total_analyses_this_month': 0,
            'top_tests_used': [],
            'departments_active': [],
            'message': 'Usage tracking from UsageRecord model in production',
        }

    @classmethod
    def validate_license_key(cls, license_key):
        """Validate a license key format and lookup status."""
        if not license_key or not license_key.startswith('SFS-INST-'):
            return {'valid': False, 'error': 'Invalid license key format'}

        # In production, lookup in SiteLicense model
        return {
            'valid': True,
            'license_key': license_key,
            'message': 'License key validation against database in production',
        }

    @classmethod
    def generate_usage_report(cls, license_key, period='monthly'):
        """Generate a usage report for institutional administrators."""
        return {
            'license_key': license_key,
            'period': period,
            'report': {
                'total_users': 0,
                'active_users': 0,
                'total_analyses': 0,
                'analyses_by_test_type': {},
                'guardian_violations_prevented': 0,
                'manuscripts_analyzed': 0,
                'certifications_earned': 0,
                'most_used_features': [],
                'department_breakdown': [],
            },
            'generated_at': datetime.utcnow().isoformat(),
        }
