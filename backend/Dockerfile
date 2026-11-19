# Production Dockerfile for StickForStats Backend
# Multi-stage build for optimized production image

# Stage 1: Build stage with compilation dependencies
FROM python:3.11-slim-bookworm AS builder

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    gfortran \
    libopenblas-dev \
    liblapack-dev \
    zlib1g-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies, in the versions of the image that is live.
#
# requirements.txt gives ranges. Installed by itself, it takes whatever versions pip resolves on
# the day of the build, so every new image used to change the libraries under every page along
# with the application's code. image/constraints-live.txt holds the versions of the live image;
# pip installs under it, and fails if one of them cannot be installed. The check after it fails
# the build if anything was installed that the file does not name, or in another version.
# pip, setuptools and wheel have their versions in image/build-tools.txt, and the check
# compares those three as well. Two of the libraries (factor-analyzer and autograd-gamma) come
# as source and are built during the install, in a build environment of their own that the
# constraints do not reach; --build-constraint holds the tools of that environment to the same
# file.
COPY requirements.txt .
COPY image/ image/
RUN pip install --upgrade -r image/build-tools.txt && \
    pip install -r requirements.txt -c image/constraints-live.txt -c image/build-tools.txt --build-constraint image/build-tools.txt && \
    python image/check_installed_versions.py image/constraints-live.txt --tools image/build-tools.txt

# Stage 2: Production image
FROM python:3.11-slim-bookworm AS production

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONFAULTHANDLER=1 \
    PATH="/opt/venv/bin:$PATH" \
    DJANGO_SETTINGS_MODULE=stickforstats.settings

# Install runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libopenblas0 \
    liblapack3 \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user for security
RUN groupadd --gid 1000 appgroup && \
    useradd --uid 1000 --gid appgroup --shell /bin/bash --create-home appuser

# Set working directory
WORKDIR /app

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv

# Copy application code
COPY --chown=appuser:appgroup . .

# Create necessary directories
RUN mkdir -p /app/static /app/media /app/logs /app/audit_logs && \
    chown -R appuser:appgroup /app

# Collect static files
RUN python manage.py collectstatic --noinput --clear 2>/dev/null || true

# Health check.
#
# This check used to be `curl -f http://localhost:8000/api/health/`, and it passed
# VACUOUSLY: that path does not exist (404), but plain HTTP is 301-redirected to
# HTTPS by Django's SECURE_SSL_REDIRECT *before routing*, and `curl -f` treats a
# 301 as success (exit 0). So the container reported "healthy" because of a
# redirect — it would have kept reporting healthy with Django 500-ing on every
# request. Verified on the live host: raw -> 301/exit 0; with the proto header ->
# 404/exit 22.
#
# The real endpoint is /api/v1/health/ (api/v1/urls.py), and it reports database
# connectivity, not just liveness. X-Forwarded-Proto tells Django this is already
# HTTPS so it routes instead of redirecting. Verified non-vacuous in the running
# container: /api/v1/health/ -> 200/exit 0, a bogus path -> 404/exit 22.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -fsS -H "X-Forwarded-Proto: https" http://localhost:8000/api/v1/health/ || exit 1

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Set labels for metadata
LABEL maintainer="StickForStats Platform Team" \
    version="1.0.0" \
    description="StickForStats Statistical Analysis Platform - Backend API"

# Default command - run with gunicorn for production
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "--threads", "2", \
    "--worker-class", "gthread", "--worker-tmp-dir", "/dev/shm", \
    "--access-logfile", "-", "--error-logfile", "-", \
    "--capture-output", "--enable-stdio-inheritance", \
    "stickforstats.wsgi:application"]
