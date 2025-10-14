# Production Dockerfile for StickForStats Frontend
# Multi-stage build for optimized production image

# Stage 1: Build the React application
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Add package files
COPY package*.json ./

# Install dependencies with clean install for production
RUN npm ci --only=production

# Copy source code
COPY . .

# Build arguments for environment configuration
ARG REACT_APP_API_URL
ARG REACT_APP_WS_URL
ARG REACT_APP_ENVIRONMENT
ARG REACT_APP_VERSION

# Set environment variables for build
ENV REACT_APP_API_URL=${REACT_APP_API_URL}
ENV REACT_APP_WS_URL=${REACT_APP_WS_URL}
ENV REACT_APP_ENVIRONMENT=${REACT_APP_ENVIRONMENT}
ENV REACT_APP_VERSION=${REACT_APP_VERSION}
ENV GENERATE_SOURCEMAP=false
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Build the application
RUN npm run build

# Stage 2: Production server with Nginx
FROM nginx:alpine

# Install necessary packages
RUN apk add --no-cache \
    curl \
    tzdata \
    && cp /usr/share/zoneinfo/UTC /etc/localtime \
    && echo "UTC" > /etc/timezone

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY default.conf /etc/nginx/conf.d/default.conf

# Copy built application from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Copy environment configuration script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Create non-root user for security
RUN adduser -D -g '' appuser \
    && chown -R appuser:appuser /usr/share/nginx/html \
    && chown -R appuser:appuser /var/cache/nginx \
    && chown -R appuser:appuser /var/log/nginx \
    && chown -R appuser:appuser /etc/nginx/conf.d \
    && touch /var/run/nginx.pid \
    && chown -R appuser:appuser /var/run/nginx.pid

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Switch to non-root user
USER appuser

# Expose port 80
EXPOSE 80

# Set labels for metadata
LABEL maintainer="StickForStats Platform Team"
LABEL version="1.0.0"
LABEL description="StickForStats Statistical Analysis Platform - Frontend"

# Start nginx with custom entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]