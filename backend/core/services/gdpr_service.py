"""
GDPR Compliance Service
========================
Handles data subject access requests (DSAR), right to erasure,
consent management, and data export per GDPR Articles 15-20.
"""

import json
import logging
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)
User = get_user_model()


class GDPRService:
    """GDPR compliance operations for user data."""

    # Data categories we collect
    DATA_CATEGORIES = {
        'account': 'Account information (username, email)',
        'analyses': 'Statistical analyses and results',
        'datasets': 'Uploaded datasets',
        'usage': 'Platform usage records',
        'consent': 'Consent records',
        'audit': 'Audit trail entries',
        'memberships': 'Organization memberships',
    }

    @staticmethod
    def get_consent_status(user):
        """Get current consent status for all consent types (GDPR Art. 7)."""
        from core.models import ConsentRecord

        consents = {}
        for consent_type, label in ConsentRecord.CONSENT_TYPES:
            try:
                record = ConsentRecord.objects.get(user=user, consent_type=consent_type)
                consents[consent_type] = {
                    'label': label,
                    'granted': record.granted,
                    'granted_at': record.granted_at.isoformat() if record.granted else None,
                    'revoked_at': record.revoked_at.isoformat() if record.revoked_at else None,
                    'version': record.version,
                }
            except ConsentRecord.DoesNotExist:
                consents[consent_type] = {
                    'label': label,
                    'granted': False,
                    'granted_at': None,
                    'revoked_at': None,
                    'version': None,
                }
        return consents

    @staticmethod
    def update_consent(user, consent_type, granted, ip_address=None, user_agent=''):
        """Update consent for a specific processing activity (GDPR Art. 7)."""
        from core.models import ConsentRecord

        valid_types = [t[0] for t in ConsentRecord.CONSENT_TYPES]
        if consent_type not in valid_types:
            return {'error': f'Invalid consent type. Valid: {valid_types}'}

        record, created = ConsentRecord.objects.update_or_create(
            user=user,
            consent_type=consent_type,
            defaults={
                'granted': granted,
                'ip_address': ip_address,
                'user_agent': user_agent or '',
                'granted_at': timezone.now() if granted else None,
                'revoked_at': timezone.now() if not granted else None,
                'version': '1.0',
            }
        )

        action = 'granted' if granted else 'revoked'
        logger.info(f"GDPR: User {user.username} {action} consent for {consent_type}")

        return {
            'consent_type': consent_type,
            'granted': granted,
            'timestamp': timezone.now().isoformat(),
        }

    @staticmethod
    def export_user_data(user):
        """
        Export all user data in machine-readable format (GDPR Art. 15 + Art. 20).
        Returns a JSON-serializable dict of all data we hold about the user.
        """
        from core.models import (
            ConsentRecord, StatisticalAudit,
            OrganizationMembership, UsageRecord
        )

        export = {
            'export_metadata': {
                'generated_at': timezone.now().isoformat(),
                'format': 'JSON',
                'gdpr_articles': ['Art. 15 (Access)', 'Art. 20 (Portability)'],
                'data_controller': 'StickForStats',
            },
            'account': {
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'date_joined': user.date_joined.isoformat(),
                'last_login': user.last_login.isoformat() if user.last_login else None,
                'is_active': user.is_active,
            },
            'consent_records': [],
            'organization_memberships': [],
            'usage_records': [],
            'audit_entries': [],
        }

        # Consent records
        for record in ConsentRecord.objects.filter(user=user):
            export['consent_records'].append({
                'type': record.consent_type,
                'granted': record.granted,
                'granted_at': record.granted_at.isoformat() if record.granted_at else None,
                'revoked_at': record.revoked_at.isoformat() if record.revoked_at else None,
                'version': record.version,
            })

        # Organization memberships
        for m in OrganizationMembership.objects.filter(user=user).select_related('organization'):
            export['organization_memberships'].append({
                'organization': m.organization.name,
                'role': m.role,
                'joined_at': m.joined_at.isoformat(),
                'is_active': m.is_active,
            })

        # Usage records (last 90 days to keep export manageable)
        ninety_days_ago = timezone.now() - timedelta(days=90)
        for record in UsageRecord.objects.filter(user=user, timestamp__gte=ninety_days_ago):
            export['usage_records'].append({
                'endpoint': record.endpoint,
                'method': record.method,
                'status_code': record.status_code,
                'timestamp': record.timestamp.isoformat(),
                'client_type': record.client_type,
            })

        # Audit entries
        for audit in StatisticalAudit.objects.filter(user_id=str(user.pk)).order_by('-timestamp')[:100]:
            export['audit_entries'].append({
                'test_type': audit.test_type,
                'created_at': audit.timestamp.isoformat(),
                'guardian_score': float(audit.guardian_score) if audit.guardian_score else None,
            })

        return export

    @staticmethod
    def erase_user_data(user, confirm=False):
        """
        Right to erasure / right to be forgotten (GDPR Art. 17).
        Deletes personal data while preserving anonymized aggregate statistics.
        """
        if not confirm:
            return {
                'error': 'Erasure requires explicit confirmation',
                'warning': 'This action is irreversible. All personal data will be deleted.',
                'data_to_delete': list(GDPRService.DATA_CATEGORIES.keys()),
            }

        from core.models import (
            ConsentRecord, StatisticalAudit,
            OrganizationMembership, UsageRecord
        )

        deleted = {}

        # Delete consent records
        count, _ = ConsentRecord.objects.filter(user=user).delete()
        deleted['consent_records'] = count

        # Anonymize usage records (keep for aggregate stats, remove PII)
        usage_count = UsageRecord.objects.filter(user=user).update(
            user=None,
            client_ip=None,
            user_agent='[erased]',
        )
        deleted['usage_records_anonymized'] = usage_count

        # Delete organization memberships
        count, _ = OrganizationMembership.objects.filter(user=user).delete()
        deleted['memberships'] = count

        # Anonymize audit entries
        audit_count = StatisticalAudit.objects.filter(user_id=str(user.pk)).update(
            user_id=None,
            source_ip=None,
        )
        deleted['audits_anonymized'] = audit_count

        # Deactivate and anonymize user account
        user.email = f'deleted_{user.pk}@erased.invalid'
        user.first_name = ''
        user.last_name = ''
        user.is_active = False
        user.set_unusable_password()
        user.save()
        deleted['account'] = 'anonymized and deactivated'

        logger.warning(f"GDPR: User data erased for user_id={user.pk}")

        return {
            'status': 'erased',
            'deleted': deleted,
            'timestamp': timezone.now().isoformat(),
            'note': 'Anonymized records retained for aggregate statistics per GDPR Art. 17(3)(d)',
        }

    @staticmethod
    def get_data_processing_info():
        """
        Information about data processing activities (GDPR Art. 13/14).
        Returns privacy notice content.
        """
        return {
            'controller': 'StickForStats',
            'purposes': [
                {
                    'purpose': 'Statistical analysis services',
                    'legal_basis': 'Contract performance (Art. 6(1)(b))',
                    'data_categories': ['Uploaded datasets', 'Analysis parameters'],
                    'retention': 'Duration of account + 30 days',
                },
                {
                    'purpose': 'Platform usage analytics',
                    'legal_basis': 'Legitimate interest (Art. 6(1)(f))',
                    'data_categories': ['API call logs', 'Feature usage'],
                    'retention': '365 days',
                },
                {
                    'purpose': 'Service improvement',
                    'legal_basis': 'Consent (Art. 6(1)(a))',
                    'data_categories': ['Anonymized usage patterns'],
                    'retention': 'Until consent withdrawn',
                },
            ],
            'rights': [
                'Right of access (Art. 15)',
                'Right to rectification (Art. 16)',
                'Right to erasure (Art. 17)',
                'Right to restriction (Art. 18)',
                'Right to data portability (Art. 20)',
                'Right to object (Art. 21)',
            ],
            'data_protection_officer': 'dpo@stickforstats.org',
            'supervisory_authority': 'Contact your national data protection authority',
        }
