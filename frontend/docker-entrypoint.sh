#!/bin/sh
# Docker entrypoint script for StickForStats Frontend
# Handles runtime environment variable injection and configuration

set -e

echo "Starting StickForStats Frontend..."
echo "Environment: ${REACT_APP_ENVIRONMENT:-production}"
echo "Version: ${REACT_APP_VERSION:-1.0.0}"

# Runtime environment variable injection
# React apps need env vars at build time, but we can inject runtime config
if [ -n "$RUNTIME_API_URL" ]; then
    echo "Configuring runtime API URL: $RUNTIME_API_URL"
    find /usr/share/nginx/html -name "*.js" -exec sed -i "s|REACT_APP_API_URL_PLACEHOLDER|$RUNTIME_API_URL|g" {} +
fi

if [ -n "$RUNTIME_WS_URL" ]; then
    echo "Configuring runtime WebSocket URL: $RUNTIME_WS_URL"
    find /usr/share/nginx/html -name "*.js" -exec sed -i "s|REACT_APP_WS_URL_PLACEHOLDER|$RUNTIME_WS_URL|g" {} +
fi

# Create runtime configuration file
cat > /usr/share/nginx/html/runtime-config.js <<EOF
window._env_ = {
  API_URL: "${RUNTIME_API_URL:-http://localhost:8000/api}",
  WS_URL: "${RUNTIME_WS_URL:-ws://localhost:8000/ws}",
  ENVIRONMENT: "${REACT_APP_ENVIRONMENT:-production}",
  VERSION: "${REACT_APP_VERSION:-1.0.0}",
  ENABLE_ANALYTICS: "${ENABLE_ANALYTICS:-false}",
  ENABLE_DEBUG: "${ENABLE_DEBUG:-false}",
  VALIDATION_ENABLED: "${VALIDATION_ENABLED:-true}",
  AUDIT_ENABLED: "${AUDIT_ENABLED:-true}",
  SYNC_INTERVAL: "${SYNC_INTERVAL:-30000}",
  SESSION_TIMEOUT: "${SESSION_TIMEOUT:-1800000}",
  MAX_UPLOAD_SIZE: "${MAX_UPLOAD_SIZE:-10485760}",
  ENABLE_OFFLINE: "${ENABLE_OFFLINE:-true}",
  CACHE_DURATION: "${CACHE_DURATION:-3600000}"
};
EOF

echo "Runtime configuration created"

# Health check file
cat > /usr/share/nginx/html/health <<EOF
{
  "status": "healthy",
  "timestamp": "$(date -Iseconds)",
  "version": "${REACT_APP_VERSION:-1.0.0}",
  "environment": "${REACT_APP_ENVIRONMENT:-production}"
}
EOF

# Set proper permissions
chmod -R 755 /usr/share/nginx/html

# Validate nginx configuration
nginx -t

echo "StickForStats Frontend ready to serve"

# Execute the main command
exec "$@"