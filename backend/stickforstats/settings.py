"""
Django settings for the StickForStats v1.0 Production project.
"""

import os
import secrets
import sys
from datetime import timedelta
from pathlib import Path
from .env_settings import get_database_config, get_platform_config, get_s3_config

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", secrets.token_urlsafe(50))

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get("DJANGO_DEBUG", "False") == "True"

# Are we running the test suite? True for `manage.py test` and pytest. Used to
# disable request rate limiting during tests so the throttle does not 429 the
# rapid-fire test client (which otherwise produces ~78 spurious API-suite
# failures — these are NOT real endpoint bugs).
TESTING = ("test" in sys.argv) or ("pytest" in sys.modules) or bool(os.environ.get("PYTEST_CURRENT_TEST"))

# Allowed hosts — set DJANGO_ALLOWED_HOSTS in production (e.g., "yourdomain.com")
ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,testserver").split(
    ","
)

# Application definition
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third party apps
    "rest_framework",
    "rest_framework.authtoken",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "channels",
    # StickForStats apps - Core
    "core.apps.CoreConfig",
    "authentication",
    # StickForStats apps - Statistical Modules
    # Note: Some apps have import issues - enable carefully and run migrations
    "confidence_intervals.apps.ConfidenceIntervalsConfig",  # Re-enabled
    "probability_distributions.apps.ProbabilityDistributionsConfig",
    "sqc_analysis.apps.SQCAnalysisConfig",  # ENABLED for backend integration
    "doe_analysis.apps.DOEAnalysisConfig",
    "pca_analysis.apps.PCAAnalysisConfig",
]

MIDDLEWARE = [
    "django.middleware.gzip.GZipMiddleware",
    "django.middleware.security.SecurityMiddleware",
    # Security headers (CSP, Permissions-Policy, Referrer-Policy) — production only
    "core.middleware.SecurityHeadersMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    # Request logging with correlation IDs (after auth, before rate limiting)
    "core.middleware.RequestLoggingMiddleware",
    # Rate limiting (API key limits + IP-based fallback)
    "core.middleware.RateLimitMiddleware",
    # Guardian Design Contract Compliance Middleware
    # Ensures all statistical API responses include assumption context
    "core.middleware.GuardianComplianceMiddleware",
    # Platform: Tenant context resolution (org from header/API key)
    "core.middleware.TenantContextMiddleware",
    # Platform: Usage metering (records API calls)
    "core.middleware.UsageMeteringMiddleware",
]

ROOT_URLCONF = "stickforstats.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "stickforstats.wsgi.application"

# ASGI application (Django Channels / WebSocket support)
ASGI_APPLICATION = "stickforstats.asgi.application"

# Database — supports DATABASE_URL env var, falls back to SQLite
DATABASES = {"default": get_database_config(BASE_DIR)}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

# Internationalization
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "static"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# WhiteNoise compressed + forever-cacheable static files
STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# Default primary key field type
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# REST Framework settings
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer" if DEBUG else "rest_framework.renderers.JSONRenderer",
    ],
}

# JWT Authentication settings
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
}

# CORS settings
CORS_ALLOW_ALL_ORIGINS = DEBUG  # Allow all origins in development
_cors_env = os.environ.get("CORS_ALLOWED_ORIGINS", "")
CORS_ALLOWED_ORIGINS = (
    [o.strip() for o in _cors_env.split(",") if o.strip()]
    if _cors_env
    else ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001"]
)
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = [
    "DELETE",
    "GET",
    "OPTIONS",
    "PATCH",
    "POST",
    "PUT",
]
CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
    "x-request-id",  # Added to allow the X-Request-ID header from frontend
]

# Cache settings
# Try Redis first, fallback to local memory if Redis is unavailable
REDIS_URL = os.environ.get("REDIS_URL", "redis://127.0.0.1:6379/1")
try:
    import redis as _redis_module

    _redis_client = _redis_module.StrictRedis.from_url(REDIS_URL)
    _redis_client.ping()
    REDIS_AVAILABLE = True
except Exception:
    REDIS_AVAILABLE = False
    print("WARNING: Redis not available, using local memory cache")

if REDIS_AVAILABLE:
    CACHES = {
        "default": {
            "BACKEND": "django_redis.cache.RedisCache",
            "LOCATION": REDIS_URL,
            "OPTIONS": {
                "CLIENT_CLASS": "django_redis.client.DefaultClient",
                "CONNECTION_POOL_CLASS": "redis.BlockingConnectionPool",
                "CONNECTION_POOL_CLASS_KWARGS": {
                    "max_connections": 50,
                    "timeout": 20,
                },
                "MAX_CONNECTIONS": 1000,
                "PICKLE_VERSION": -1,
            },
            "KEY_PREFIX": "stickforstats",
            "TIMEOUT": 3600,  # 1 hour default timeout
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "unique-snowflake",
            "OPTIONS": {
                "MAX_ENTRIES": 1000,
            },
        }
    }

# Session settings
SESSION_ENGINE = "django.contrib.sessions.backends.db"

# Logging configuration
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
            "style": "{",
        },
        "simple": {
            "format": "{levelname} {message}",
            "style": "{",
        },
        "json": {
            "()": "core.logging.JsonFormatter",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json" if not DEBUG else "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": os.environ.get("DJANGO_LOG_LEVEL", "INFO"),
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": os.environ.get("DJANGO_LOG_LEVEL", "INFO"),
            "propagate": False,
        },
        "stickforstats": {
            "handlers": ["console"],
            "level": "DEBUG" if DEBUG else "INFO",
            "propagate": False,
        },
    },
}

# =============================================================================
# GUARDIAN MIDDLEWARE CONFIGURATION
# =============================================================================
# Enforces the Design Contract requirement:
# "No statistical result may exist without an explicit, traceable assumption context."
#
# Configuration options:
# - ENABLED: Turn middleware on/off (default: True)
# - STRICT_MODE: Block non-compliant responses (default: False for development)
# - LOG_LEVEL: Logging severity for violations (WARNING, ERROR, INFO)
# - STATISTICAL_ENDPOINTS: URL patterns to monitor
# - INJECT_CONTEXT: Enable legacy context injection (default: False)

GUARDIAN_MIDDLEWARE = {
    "ENABLED": True,
    "STRICT_MODE": False,  # Set to True in production to enforce compliance
    "LOG_LEVEL": "WARNING",
    "INJECT_CONTEXT": False,  # Don't inject - require proper integration
    "STATISTICAL_ENDPOINTS": [
        "/api/core/test/execute/",
        "/api/core/bayesian/",
        "/api/core/correlation/",
        "/api/core/regression/",
        "/api/core/anova/",
        "/api/core/chi-square/",
        "/api/core/nonparametric/",
        "/api/core/mixed/",
        "/api/core/causal/",
        "/api/core/mediation/",
        "/api/core/did/",
    ],
}

# =============================================================================
# RATE LIMITING
# =============================================================================
# Disabled in DEBUG mode by default. Override with ENABLE_RATE_LIMITING=true env var.
# Always disabled under the test runner (TESTING) so the throttle does not 429
# the test client; tests that specifically exercise rate limiting should opt in
# with @override_settings(RATE_LIMIT_ENABLED=True).
RATE_LIMIT_ENABLED = (not TESTING) and (
    not DEBUG or os.environ.get("ENABLE_RATE_LIMITING", "false").lower() == "true"
)
RATE_LIMIT_DEFAULT_AUTHENTICATED = 60   # requests per minute (IP-based, logged-in users)
RATE_LIMIT_DEFAULT_ANONYMOUS = 20       # requests per minute (IP-based, anonymous users)

# =============================================================================
# SECURITY HARDENING
# =============================================================================
# Always-on security headers (safe for both development and production)
X_FRAME_OPTIONS = "DENY"
SECURE_CONTENT_TYPE_NOSNIFF = True

# Production-only security settings (gated by DEBUG=False)
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    CSRF_COOKIE_SECURE = True
    SESSION_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_BROWSER_XSS_FILTER = True
    SESSION_COOKIE_HTTPONLY = True
    CSRF_COOKIE_HTTPONLY = True
    SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"

# =============================================================================
# PLATFORM CONFIGURATION (Pillar 3 — Universal Platform)
# =============================================================================
_platform_config = get_platform_config()

# Tenant/billing enforcement (disabled by default for local dev)
STICKFORSTATS_TIER_ENFORCEMENT = _platform_config["TIER_ENFORCEMENT"]
STICKFORSTATS_USAGE_METERING = _platform_config["USAGE_METERING"]

# Frontend URL for OAuth/Stripe redirects
FRONTEND_URL = _platform_config["FRONTEND_URL"]

# Stripe billing integration
STRIPE_SECRET_KEY = _platform_config["STRIPE_SECRET_KEY"]
STRIPE_WEBHOOK_SECRET = _platform_config["STRIPE_WEBHOOK_SECRET"]

# S3/MinIO object storage
S3_CONFIG = get_s3_config()

# Allow X-API-Key and X-Organization headers through CORS
CORS_ALLOW_HEADERS += [
    "x-api-key",
    "x-organization",
]

# ── Celery Configuration ──────────────────────────────────
CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/1")
CELERY_RESULT_BACKEND = os.environ.get("CELERY_RESULT_BACKEND", "redis://localhost:6379/2")
CELERY_TASK_ALWAYS_EAGER = os.environ.get("CELERY_TASK_ALWAYS_EAGER", "True").lower() == "true"  # Sync in dev
CELERY_TASK_EAGER_PROPAGATES = True

# ── Channel Layers (WebSocket backend) ───────────────────────
if REDIS_AVAILABLE:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {
                "hosts": [os.environ.get("REDIS_URL", "redis://127.0.0.1:6379/1")],
            },
        }
    }
else:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        }
    }
