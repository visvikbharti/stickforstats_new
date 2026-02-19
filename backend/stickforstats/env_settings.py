"""
Environment-Driven Settings
=============================

Provides environment variable parsing for production deployment.
All settings fall back to safe defaults for local development.

Environment Variables:
- DATABASE_URL: PostgreSQL connection string (fallback: SQLite)
- REDIS_URL: Redis connection string (fallback: local memory cache)
- STRIPE_SECRET_KEY: Stripe API key for billing
- STRIPE_WEBHOOK_SECRET: Stripe webhook verification secret
- STICKFORSTATS_TIER_ENFORCEMENT: Enable tier limit enforcement (default: False)
- STICKFORSTATS_USAGE_METERING: Enable usage metering (default: False)
- S3_BUCKET_NAME: S3/MinIO bucket for file storage
- S3_ENDPOINT_URL: S3-compatible endpoint URL
- S3_ACCESS_KEY_ID: S3 access key
- S3_SECRET_ACCESS_KEY: S3 secret key
- FRONTEND_URL: Frontend base URL for redirects (default: http://localhost:3000)
- SENTRY_DSN: Sentry error tracking DSN
"""

import os


def parse_database_url(url: str) -> dict:
    """
    Parse a DATABASE_URL into Django DATABASES dict format.
    Supports: postgres://, postgresql://, sqlite:///

    Examples:
        postgres://user:pass@host:5432/dbname
        sqlite:///path/to/db.sqlite3
    """
    if not url:
        return {}

    if url.startswith('sqlite'):
        # sqlite:///path/to/db.sqlite3
        path = url.replace('sqlite:///', '').replace('sqlite://', '')
        return {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': path or 'db.sqlite3',
        }

    # PostgreSQL
    url = url.replace('postgres://', 'postgresql://', 1)

    from urllib.parse import urlparse
    parsed = urlparse(url)

    config = {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': parsed.path.lstrip('/'),
        'USER': parsed.username or '',
        'PASSWORD': parsed.password or '',
        'HOST': parsed.hostname or 'localhost',
        'PORT': str(parsed.port or 5432),
    }

    # Parse query string options
    if parsed.query:
        from urllib.parse import parse_qs
        params = parse_qs(parsed.query)
        if 'sslmode' in params:
            config.setdefault('OPTIONS', {})['sslmode'] = params['sslmode'][0]
        if 'connect_timeout' in params:
            config['CONN_MAX_AGE'] = int(params['connect_timeout'][0])

    return config


def get_database_config(base_dir) -> dict:
    """Get database configuration from DATABASE_URL or fallback to SQLite."""
    database_url = os.environ.get('DATABASE_URL', '')

    if database_url:
        config = parse_database_url(database_url)
        # Add connection pooling defaults for PostgreSQL
        if 'postgresql' in config.get('ENGINE', ''):
            config.setdefault('CONN_MAX_AGE', 600)  # 10 minutes
            config.setdefault('OPTIONS', {})
        return config

    # Default: SQLite for local development
    return {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': base_dir / 'db.sqlite3',
    }


def get_s3_config() -> dict:
    """Get S3/MinIO configuration from environment."""
    return {
        'bucket_name': os.environ.get('S3_BUCKET_NAME', ''),
        'endpoint_url': os.environ.get('S3_ENDPOINT_URL', ''),
        'access_key_id': os.environ.get('S3_ACCESS_KEY_ID', ''),
        'secret_access_key': os.environ.get('S3_SECRET_ACCESS_KEY', ''),
        'region_name': os.environ.get('S3_REGION_NAME', 'us-east-1'),
        'use_ssl': os.environ.get('S3_USE_SSL', 'true').lower() == 'true',
    }


def get_platform_config() -> dict:
    """Get platform-specific configuration from environment."""
    return {
        'TIER_ENFORCEMENT': os.environ.get('STICKFORSTATS_TIER_ENFORCEMENT', 'false').lower() == 'true',
        'USAGE_METERING': os.environ.get('STICKFORSTATS_USAGE_METERING', 'false').lower() == 'true',
        'FRONTEND_URL': os.environ.get('FRONTEND_URL', 'http://localhost:3000'),
        'STRIPE_SECRET_KEY': os.environ.get('STRIPE_SECRET_KEY', ''),
        'STRIPE_WEBHOOK_SECRET': os.environ.get('STRIPE_WEBHOOK_SECRET', ''),
        'SENTRY_DSN': os.environ.get('SENTRY_DSN', ''),
    }
