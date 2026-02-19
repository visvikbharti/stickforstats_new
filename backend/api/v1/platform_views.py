"""
Platform API Views
===================

REST API endpoints for the Universal Platform layer:
- Organization management (CRUD, members, invites)
- Usage analytics and dashboards
- Billing and subscription management
- Platform API key management
- Tier information (public)
"""

import logging
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import JSONParser

logger = logging.getLogger(__name__)


# =============================================================================
# PUBLIC ENDPOINTS
# =============================================================================


class TierInfoView(APIView):
    """
    GET /api/v1/platform/tiers/
    Public endpoint listing all available subscription tiers.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        from core.services.billing_service import BillingService
        tiers = BillingService.get_tier_info_list()
        return Response({
            'tiers': tiers,
            'currency': 'USD',
            'billing_periods': ['monthly', 'yearly'],
        })


# =============================================================================
# ORGANIZATION MANAGEMENT
# =============================================================================


class OrganizationCreateView(APIView):
    """
    POST /api/v1/platform/organizations/
    Create a new organization. The creating user becomes the owner.
    """
    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    def get(self, request):
        """List organizations for the current user."""
        if not request.user.is_authenticated:
            return Response({'organizations': []})

        from core.models import OrganizationMembership
        memberships = OrganizationMembership.objects.filter(
            user=request.user, is_active=True
        ).select_related('organization', 'organization__tier')

        orgs = []
        for m in memberships:
            org = m.organization
            orgs.append({
                'id': str(org.id),
                'name': org.name,
                'slug': org.slug,
                'tier': org.tier.display_name if org.tier else 'Free',
                'tier_slug': org.tier.slug if org.tier else 'free',
                'role': m.role,
                'member_count': org.memberships.filter(is_active=True).count(),
                'is_active': org.is_active,
            })

        return Response({'organizations': orgs})

    def post(self, request):
        from core.models import Organization, OrganizationMembership, SubscriptionTier

        name = request.data.get('name', '').strip()
        if not name:
            return Response(
                {'error': 'Organization name is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Generate slug
        import re
        slug = re.sub(r'[^a-z0-9-]', '-', name.lower()).strip('-')[:100]
        if Organization.objects.filter(slug=slug).exists():
            slug = f"{slug}-{timezone.now().strftime('%Y%m%d%H%M')}"

        # Get default tier
        default_tier = SubscriptionTier.objects.filter(is_default=True).first()

        org = Organization.objects.create(
            name=name,
            slug=slug,
            description=request.data.get('description', ''),
            tier=default_tier,
            contact_email=request.data.get('contact_email', ''),
        )

        # Make the creator the owner
        if request.user.is_authenticated:
            OrganizationMembership.objects.create(
                organization=org,
                user=request.user,
                role='owner',
                invitation_accepted=True,
            )

        return Response({
            'id': str(org.id),
            'name': org.name,
            'slug': org.slug,
            'tier': default_tier.display_name if default_tier else 'Free',
        }, status=status.HTTP_201_CREATED)


class OrganizationDetailView(APIView):
    """
    GET/PATCH /api/v1/platform/organizations/<slug>/
    View or update organization details.
    """
    permission_classes = [AllowAny]

    def get(self, request, org_slug):
        from core.models import Organization
        try:
            org = Organization.objects.select_related('tier').get(slug=org_slug, is_active=True)
        except Organization.DoesNotExist:
            return Response({'error': 'Organization not found'}, status=404)

        return Response({
            'id': str(org.id),
            'name': org.name,
            'slug': org.slug,
            'description': org.description,
            'tier': {
                'slug': org.tier.slug if org.tier else 'free',
                'name': org.tier.display_name if org.tier else 'Free',
                'features': org.tier.features if org.tier else {},
            },
            'subscription_status': org.subscription_status,
            'settings': org.settings,
            'member_count': org.memberships.filter(is_active=True).count(),
            'created_at': org.created_at.isoformat(),
        })

    def patch(self, request, org_slug):
        from core.models import Organization
        try:
            org = Organization.objects.get(slug=org_slug, is_active=True)
        except Organization.DoesNotExist:
            return Response({'error': 'Organization not found'}, status=404)

        # Update allowed fields
        for field_name in ('name', 'description', 'contact_email', 'website'):
            if field_name in request.data:
                setattr(org, field_name, request.data[field_name])

        if 'settings' in request.data and isinstance(request.data['settings'], dict):
            org.settings.update(request.data['settings'])

        org.save()
        return Response({'status': 'updated', 'slug': org.slug})


class OrganizationMembersView(APIView):
    """
    GET /api/v1/platform/organizations/<slug>/members/
    List members of an organization.
    """
    permission_classes = [AllowAny]

    def get(self, request, org_slug):
        from core.models import Organization, OrganizationMembership
        try:
            org = Organization.objects.get(slug=org_slug, is_active=True)
        except Organization.DoesNotExist:
            return Response({'error': 'Organization not found'}, status=404)

        memberships = OrganizationMembership.objects.filter(
            organization=org, is_active=True
        ).select_related('user')

        members = []
        for m in memberships:
            members.append({
                'id': str(m.id),
                'username': m.user.username,
                'email': m.user.email,
                'role': m.role,
                'joined_at': m.joined_at.isoformat(),
            })

        return Response({
            'organization': org.name,
            'members': members,
            'total': len(members),
        })


class InviteMemberView(APIView):
    """
    POST /api/v1/platform/organizations/<slug>/invite/
    Invite a user to an organization by email.
    """
    permission_classes = [AllowAny]

    def post(self, request, org_slug):
        from core.models import Organization, OrganizationMembership
        import uuid as uuid_mod

        try:
            org = Organization.objects.get(slug=org_slug, is_active=True)
        except Organization.DoesNotExist:
            return Response({'error': 'Organization not found'}, status=404)

        email = request.data.get('email', '').strip()
        role = request.data.get('role', 'member')

        if not email:
            return Response({'error': 'Email is required'}, status=400)
        if role not in ('admin', 'member', 'viewer'):
            return Response({'error': 'Invalid role. Use: admin, member, or viewer'}, status=400)

        # Check tier limit
        if org.tier and org.tier.max_team_members > 0:
            current_count = org.memberships.filter(is_active=True).count()
            if current_count >= org.tier.max_team_members:
                return Response({
                    'error': 'Team member limit reached for your tier',
                    'limit': org.tier.max_team_members,
                    'upgrade_url': '/platform/billing',
                }, status=429)

        # Check for existing membership
        from django.contrib.auth.models import User
        try:
            user = User.objects.get(email=email)
            if OrganizationMembership.objects.filter(organization=org, user=user).exists():
                return Response({'error': 'User is already a member'}, status=400)
        except User.DoesNotExist:
            user = None

        # Create invitation
        token = uuid_mod.uuid4().hex

        if user:
            OrganizationMembership.objects.create(
                organization=org,
                user=user,
                role=role,
                invited_by=request.user if request.user.is_authenticated else None,
                invitation_email=email,
                invitation_accepted=False,
                invitation_token=token,
            )
        else:
            # Store invitation for user who hasn't registered yet
            OrganizationMembership.objects.create(
                organization=org,
                user_id=1,  # placeholder — will be resolved on registration
                role=role,
                invited_by=request.user if request.user.is_authenticated else None,
                invitation_email=email,
                invitation_accepted=False,
                invitation_token=token,
            )

        return Response({
            'status': 'invited',
            'email': email,
            'role': role,
            'token': token,
        }, status=201)


# =============================================================================
# USAGE & ANALYTICS
# =============================================================================


class UsageDashboardView(APIView):
    """
    GET /api/v1/platform/usage/
    Returns usage analytics for the current organization.
    Query params: ?days=30 (default 30)
    """
    permission_classes = [AllowAny]

    def get(self, request):
        org = getattr(request, 'organization', None)

        if not org:
            # Try from query param
            from core.models import Organization
            org_slug = request.query_params.get('org')
            if org_slug:
                try:
                    org = Organization.objects.select_related('tier').get(slug=org_slug)
                except Organization.DoesNotExist:
                    pass

        if not org:
            return Response({
                'message': 'No organization context. Pass ?org=slug or X-Organization header.',
                'usage': None,
            })

        from core.services.billing_service import BillingService

        days = int(request.query_params.get('days', 30))
        days = min(days, 365)  # Cap at 1 year

        summary = BillingService.get_usage_summary(org, days=days)
        limits = BillingService.check_tier_limits(org)

        return Response({
            'organization': org.name,
            'usage': summary.to_dict(),
            'limits': limits,
        })


# =============================================================================
# BILLING
# =============================================================================


class BillingView(APIView):
    """
    GET /api/v1/platform/billing/
    Get subscription status and billing info.

    POST /api/v1/platform/billing/checkout/
    Create a checkout session for tier upgrade.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        org = getattr(request, 'organization', None)
        if not org:
            from core.models import Organization
            org_slug = request.query_params.get('org')
            if org_slug:
                try:
                    org = Organization.objects.select_related('tier').get(slug=org_slug)
                except Organization.DoesNotExist:
                    pass

        if not org:
            return Response({'message': 'No organization context'})

        from core.services.billing_service import BillingService
        subscription = BillingService.get_subscription_status(org)
        return Response(subscription)

    def post(self, request):
        """Create a Stripe checkout session."""
        org = getattr(request, 'organization', None)
        if not org:
            return Response({'error': 'Organization required'}, status=400)

        tier_slug = request.data.get('tier')
        billing_period = request.data.get('period', 'monthly')

        if not tier_slug:
            return Response({'error': 'tier is required'}, status=400)

        from core.services.billing_service import BillingService
        result = BillingService.create_checkout_session(org, tier_slug, billing_period)

        if 'error' in result:
            return Response(result, status=400)
        return Response(result)


class StripeWebhookView(APIView):
    """
    POST /api/v1/platform/billing/webhook/
    Stripe webhook endpoint for subscription events.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        from core.services.billing_service import BillingService

        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE', '')

        result = BillingService.handle_stripe_webhook(payload, sig_header)

        if 'error' in result:
            return Response(result, status=400)
        return Response(result)


# =============================================================================
# API KEY MANAGEMENT
# =============================================================================


class APIKeyManageView(APIView):
    """
    GET /api/v1/platform/api-keys/
    List API keys for the current organization.

    POST /api/v1/platform/api-keys/
    Create a new API key.

    DELETE /api/v1/platform/api-keys/<key_id>/
    Revoke an API key.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        org = getattr(request, 'organization', None)
        if not org:
            from core.models import Organization
            org_slug = request.query_params.get('org')
            if org_slug:
                try:
                    org = Organization.objects.get(slug=org_slug)
                except Organization.DoesNotExist:
                    pass

        if not org:
            return Response({'keys': [], 'message': 'No organization context'})

        from core.models import PlatformAPIKey
        keys = PlatformAPIKey.objects.filter(organization=org, is_active=True)

        return Response({
            'keys': [
                {
                    'id': str(k.id),
                    'name': k.name,
                    'prefix': k.key_prefix,
                    'scopes': k.scopes,
                    'created_at': k.created_at.isoformat(),
                    'last_used_at': k.last_used_at.isoformat() if k.last_used_at else None,
                    'expires_at': k.expires_at.isoformat() if k.expires_at else None,
                }
                for k in keys
            ],
            'total': keys.count(),
        })

    def post(self, request):
        org = getattr(request, 'organization', None)
        if not org:
            return Response({'error': 'Organization required'}, status=400)

        # Check tier limit
        from core.models import PlatformAPIKey
        if org.tier and org.tier.max_api_keys > 0:
            current_count = org.api_keys.filter(is_active=True).count()
            if current_count >= org.tier.max_api_keys:
                return Response({
                    'error': 'API key limit reached for your tier',
                    'limit': org.tier.max_api_keys,
                }, status=429)

        name = request.data.get('name', 'Default Key')
        scopes = request.data.get('scopes', [])

        raw_key, key_prefix, key_hash = PlatformAPIKey.generate_key()

        key_obj = PlatformAPIKey.objects.create(
            organization=org,
            created_by=request.user if request.user.is_authenticated else None,
            name=name,
            key_prefix=key_prefix,
            key_hash=key_hash,
            scopes=scopes,
        )

        return Response({
            'id': str(key_obj.id),
            'name': name,
            'key': raw_key,  # Only shown once!
            'prefix': key_prefix,
            'message': 'Save this key — it will not be shown again.',
        }, status=201)


class APIKeyRevokeView(APIView):
    """DELETE /api/v1/platform/api-keys/<key_id>/"""
    permission_classes = [AllowAny]

    def delete(self, request, key_id):
        from core.models import PlatformAPIKey
        try:
            key = PlatformAPIKey.objects.get(id=key_id, is_active=True)
            key.is_active = False
            key.save()
            return Response({'status': 'revoked', 'id': str(key_id)})
        except PlatformAPIKey.DoesNotExist:
            return Response({'error': 'API key not found'}, status=404)
