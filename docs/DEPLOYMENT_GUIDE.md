# 🚀 StickForStats Production Deployment Guide

## Executive Summary

Complete production deployment configuration for the StickForStats Statistical Analysis Platform, ensuring **enterprise-grade reliability**, **FDA compliance**, and **optimal performance** for scientists, researchers, and industries.

---

## 📦 Deployment Architecture

```
StickForStats v2.0 Production Stack
├── Frontend (React + Nginx) — 25 pages, PWA-enabled
├── Backend API (Python/Django) — 195 endpoints
├── PostgreSQL Database
├── Redis Cache + Message Broker
├── Celery Workers (7 queue routes)
├── Celery Beat (4 periodic tasks)
├── Keycloak SSO (SAML/OIDC)
├── Kong API Gateway
├── Prometheus Monitoring
├── Grafana Dashboards
└── Kubernetes Orchestration
```

---

## 🐳 Docker Deployment

### Prerequisites
- Docker Engine 20.10+
- Docker Compose 2.0+
- 16GB RAM minimum
- 100GB storage

### Quick Start

1. **Clone the repository**
```bash
git clone https://github.com/stickforstats/platform.git
cd platform
```

2. **Configure environment**
```bash
cp .env.production .env
# Edit .env with your production values
vim .env
```

3. **Build images**
```bash
docker-compose build --no-cache
```

4. **Start services**
```bash
docker-compose up -d
```

5. **Verify health**
```bash
docker-compose ps
curl http://localhost/health
curl http://localhost:8000/api/v1/health/
```

### Container Details

| Service | Image | Port | Resources |
|---------|-------|------|-----------|
| frontend | nginx:alpine | 80, 443 | 512MB RAM, 0.5 CPU |
| backend | python:3.11 | 8000 | 1GB RAM, 1 CPU |
| postgres | postgres:15 | 5432 | 2GB RAM, 1 CPU |
| redis | redis:7 | 6379 | 512MB RAM, 0.5 CPU |
| celery | python:3.11 | - | 1GB RAM, 1 CPU |
| keycloak | quay.io/keycloak | 8080 | 1GB RAM, 1 CPU |
| kong | kong:3.4 | 8001, 8443 | 512MB RAM, 0.5 CPU |
| celery-worker | python:3.11 | - | 2GB RAM, 2 CPU |
| celery-beat | python:3.11 | - | 256MB RAM, 0.25 CPU |
| flower | mher/flower | 5555 | 256MB RAM, 0.25 CPU |
| prometheus | prom/prometheus | 9090 | 512MB RAM, 0.5 CPU |
| grafana | grafana/grafana | 3000 | 512MB RAM, 0.5 CPU |

---

## ☸️ Kubernetes Deployment

### Prerequisites
- Kubernetes 1.24+
- kubectl configured
- Helm 3.0+
- 3+ worker nodes

### Installation Steps

1. **Create namespace**
```bash
kubectl create namespace production
```

2. **Create secrets**
```bash
kubectl create secret generic stickforstats-secrets \
  --from-literal=database.url='postgresql://user:pass@postgres:5432/db' \
  --from-literal=redis.url='redis://:password@redis:6379/0' \
  --from-literal=secret.key='your-secret-key' \
  --from-literal=jwt.secret='your-jwt-secret' \
  --from-literal=db.user='stickforstats_user' \
  --from-literal=db.password='secure_password' \
  --from-literal=redis.password='redis_password' \
  -n production
```

3. **Create ConfigMap**
```bash
kubectl create configmap stickforstats-config \
  --from-literal=api.url='https://api.stickforstats.com/api' \
  --from-literal=ws.url='wss://api.stickforstats.com/ws' \
  --from-literal=cors.origins='https://stickforstats.com' \
  -n production
```

4. **Deploy PersistentVolumes**
```bash
kubectl apply -f kubernetes/production/storage.yaml
```

5. **Deploy applications**
```bash
kubectl apply -f kubernetes/production/deployment.yaml
kubectl apply -f kubernetes/production/services.yaml
```

6. **Configure Ingress**
```bash
kubectl apply -f kubernetes/production/ingress.yaml
```

7. **Verify deployment**
```bash
kubectl get all -n production
kubectl get pods -n production -w
```

### Scaling

**Horizontal Pod Autoscaling**
```bash
kubectl autoscale deployment stickforstats-frontend \
  --cpu-percent=70 \
  --min=3 \
  --max=10 \
  -n production

kubectl autoscale deployment stickforstats-backend \
  --cpu-percent=80 \
  --min=3 \
  --max=20 \
  -n production
```

**Manual Scaling**
```bash
kubectl scale deployment stickforstats-frontend --replicas=5 -n production
kubectl scale deployment stickforstats-backend --replicas=10 -n production
```

---

## Celery Configuration

### Starting Celery Services

```bash
# Start Celery worker with all queues
celery -A stickforstats worker -l info -Q default,analysis,manuscript,reports,gdpr,analytics,webhooks

# Start Celery beat scheduler
celery -A stickforstats beat -l info

# Monitor with Flower
celery -A stickforstats flower --port=5555
```

### Queue Routes

| Queue | Purpose |
|-------|---------|
| `analysis` | Statistical analysis tasks |
| `manuscript` | Manuscript processing |
| `reports` | Report generation |
| `gdpr` | Data export/erasure |
| `analytics` | Journal analytics |
| `webhooks` | Webhook delivery |
| `default` | Everything else |

### Celery Settings

```python
CELERY_BROKER_URL = "redis://redis:6379/0"
CELERY_RESULT_BACKEND = "redis://redis:6379/1"
CELERY_TASK_TIME_LIMIT = 600        # Hard time limit: 600s
CELERY_TASK_SOFT_TIME_LIMIT = 300   # Soft time limit: 300s
CELERY_WORKER_MAX_TASKS_PER_CHILD = 100
```

### Periodic Tasks (Celery Beat)

Celery Beat runs 4 periodic tasks on a configured schedule. Ensure the beat scheduler is running alongside the workers for scheduled task execution.

---

## Keycloak SSO Setup

StickForStats v2.0 uses Keycloak for Single Sign-On via SAML and OIDC protocols.

### Realm Configuration

1. **Import the StickForStats realm**
```bash
# Import realm on first startup
docker exec keycloak /opt/keycloak/bin/kc.sh import \
  --file /opt/keycloak/data/import/realm-export.json
```

2. **Verify realm is active**
```bash
curl -s http://localhost:8080/realms/stickforstats | jq .realm
```

### Client Registration

- **SAML Client**: Configured for enterprise SSO integrations (e.g., institutional IdPs)
- **OIDC Client**: Configured for the StickForStats web and mobile applications

### User Federation

Connect Keycloak to external user directories (LDAP, Active Directory) for institutional deployments.

### Role Mapping to StickForStats RBAC

Keycloak roles are mapped to the StickForStats role-based access control system:
- `admin` -- Full platform administration
- `researcher` -- Standard research user
- `reviewer` -- Read-only review access
- `tenant-admin` -- Tenant-scoped administration

**Reference**: `infrastructure/keycloak/realm-export.json`

---

## Kong API Gateway

Kong serves as the API gateway for all inbound traffic, handling routing, rate limiting, and authentication validation.

### Route Configuration

```yaml
services:
  - name: stickforstats-api-v1
    url: http://backend:8000/api/v1/
    routes:
      - name: api-v1-route
        paths:
          - /api/v1/
  - name: stickforstats-api-v2
    url: http://backend:8000/api/v2/
    routes:
      - name: api-v2-route
        paths:
          - /api/v2/
```

### Rate Limiting Plugin

```yaml
plugins:
  - name: rate-limiting
    config:
      minute: 60
      hour: 1000
      policy: redis
      redis_host: redis
      redis_port: 6379
```

### JWT Validation Plugin

```yaml
plugins:
  - name: jwt
    config:
      uri_param_names:
        - jwt
      claims_to_verify:
        - exp
```

### Tenant Routing

Kong routes requests to the correct tenant schema based on the `X-Tenant-ID` header or subdomain, working in conjunction with the tenant context middleware.

**Reference**: `infrastructure/kong/kong.yml`

---

## Multi-Tenant Configuration

### Database Configuration

Replace SQLite with PostgreSQL for multi-tenant production deployments:

```env
DATABASE_URL=postgresql://stickforstats_user:secure_password@postgres:5432/stickforstats
```

### Schema-Per-Tenant via django-tenants

StickForStats uses `django-tenants` to isolate tenant data at the PostgreSQL schema level. Each tenant receives its own schema, ensuring complete data separation.

```python
# settings.py
DATABASES = {
    "default": {
        "ENGINE": "django_tenants.postgresql_backend",
        "NAME": "stickforstats",
        "USER": "stickforstats_user",
        "PASSWORD": "secure_password",
        "HOST": "postgres",
        "PORT": "5432",
    }
}

DATABASE_ROUTERS = ("django_tenants.routers.TenantSyncRouter",)
```

### Tenant Context Middleware

```python
MIDDLEWARE = [
    "django_tenants.middleware.main.TenantMainMiddleware",
    # ... other middleware
]
```

The middleware resolves the current tenant from the request (via subdomain or header) and sets the PostgreSQL `search_path` accordingly.

### Usage Metering Configuration

```env
USAGE_METERING_ENABLED=true
USAGE_METERING_BACKEND=redis
USAGE_METERING_FLUSH_INTERVAL=60  # seconds
```

Usage metering tracks per-tenant API calls, computation time, and storage consumption for billing and quota enforcement.

---

## 🔒 Security Configuration

### SSL/TLS Setup

1. **Obtain certificates**
```bash
certbot certonly --standalone -d stickforstats.com -d www.stickforstats.com
```

2. **Configure Nginx**
```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/stickforstats.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/stickforstats.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
}
```

### Security Headers
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security: max-age=31536000
- Content-Security-Policy: [configured]

### Network Policies
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-netpol
spec:
  podSelector:
    matchLabels:
      component: backend
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          component: frontend
    ports:
    - protocol: TCP
      port: 8000
```

---

## 📊 FDA Compliance Configuration

### Required Settings
```env
FDA_COMPLIANCE_MODE=true
AUDIT_ENABLED=true
AUDIT_LOG_RETENTION_DAYS=2555  # 7 years
DIGITAL_SIGNATURES_ENABLED=true
DATA_INTEGRITY_CHECKS=true
ACCESS_CONTROL_ENABLED=true
VALIDATION_ENABLED=true
ELECTRONIC_RECORDS_COMPLIANT=true
```

### Audit Log Storage
- Location: `/app/audit_logs/`
- Format: JSON with digital signatures
- Retention: 7 years minimum
- Backup: Daily to S3
- Integrity: SHA-256 hash chain

### Compliance Checklist
- [x] Electronic signatures (21 CFR Part 11.50)
- [x] Audit trails (21 CFR Part 11.10(e))
- [x] Access controls (21 CFR Part 11.10(d))
- [x] Data integrity (21 CFR Part 11.10(a))
- [x] System validation (21 CFR Part 11.10(a))
- [x] Change control (21 CFR Part 11.10(k))
- [x] Backup and recovery (21 CFR Part 11.10(c))
- [x] Training records (21 CFR Part 11.10(i))

---

## 📈 Performance Optimization

### Frontend Optimization
```dockerfile
# Build optimizations
ENV GENERATE_SOURCEMAP=false
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Nginx caching
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Backend Optimization
```python
# Gunicorn configuration
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "uvicorn.workers.UvicornWorker"
max_requests = 1000
max_requests_jitter = 50
```

### Database Optimization
```sql
-- Connection pooling
max_connections = 200
shared_buffers = 2GB
effective_cache_size = 6GB
work_mem = 10MB
maintenance_work_mem = 512MB

-- Query optimization
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_calculations_user_id ON calculations(user_id);
```

### Redis Configuration
```conf
maxmemory 512mb
maxmemory-policy allkeys-lru
save 900 1 300 10 60 10000
appendonly yes
```

---

## 🔍 Monitoring & Alerts

### Prometheus Metrics
- Request rate
- Response time (p50, p95, p99)
- Error rate
- CPU usage
- Memory usage
- Database connections
- Cache hit rate

### Grafana Dashboards
1. **System Overview**: Overall health metrics
2. **API Performance**: Request/response analytics
3. **Database Performance**: Query performance
4. **Validation System**: Audit logs, compliance metrics
5. **Business Metrics**: User activity, calculations

### Alert Rules
```yaml
groups:
- name: stickforstats
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"

  - alert: LowDiskSpace
    expr: node_filesystem_avail_bytes / node_filesystem_size_bytes < 0.1
    for: 10m
    labels:
      severity: warning
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow
```yaml
name: Deploy to Production
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Build and push Docker images
      run: |
        docker build -t stickforstats/frontend:${{ github.sha }} ./frontend
        docker build -t stickforstats/backend:${{ github.sha }} ./backend
        docker push stickforstats/frontend:${{ github.sha }}
        docker push stickforstats/backend:${{ github.sha }}
    - name: Deploy to Kubernetes
      run: |
        kubectl set image deployment/stickforstats-frontend \
          frontend=stickforstats/frontend:${{ github.sha }} \
          -n production
        kubectl set image deployment/stickforstats-backend \
          backend=stickforstats/backend:${{ github.sha }} \
          -n production
        kubectl rollout status deployment/stickforstats-frontend -n production
        kubectl rollout status deployment/stickforstats-backend -n production
```

---

## 📋 Backup & Recovery

### Automated Backups
```bash
# Database backup (daily at 2 AM)
0 2 * * * pg_dump -U $DB_USER -h $DB_HOST $DB_NAME | gzip > /backups/db_$(date +\%Y\%m\%d).sql.gz

# Audit logs backup (hourly)
0 * * * * tar -czf /backups/audit_logs_$(date +\%Y\%m\%d_\%H).tar.gz /app/audit_logs/

# S3 sync (every 6 hours)
0 */6 * * * aws s3 sync /backups s3://stickforstats-backups/ --delete
```

### Recovery Procedures
1. **Database Recovery**
```bash
gunzip < /backups/db_20240101.sql.gz | psql -U $DB_USER -h $DB_HOST $DB_NAME
```

2. **Point-in-Time Recovery**
```bash
pg_basebackup -D /var/lib/postgresql/recovery -Ft -z -P
```

3. **Disaster Recovery**
- RTO: 4 hours
- RPO: 1 hour
- Backup retention: 30 days
- Geographic redundancy: Multi-region

---

## 🚦 Health Checks

### Frontend Health
```bash
curl -f http://localhost/health
```

### Backend Health
```bash
curl -f http://localhost:8000/api/v1/health/
```

### Database Health
```bash
pg_isready -h localhost -p 5432
```

### Redis Health
```bash
redis-cli ping
```

### Complete Stack Health
```bash
docker-compose ps
kubectl get pods -n production
```

---

## 🐛 Troubleshooting

### Common Issues

**1. Container fails to start**
```bash
docker logs stickforstats-frontend
kubectl logs -f pod/frontend-xxxxx -n production
```

**2. Database connection errors**
```bash
# Check connectivity
nc -zv postgres 5432

# Check credentials
psql -U $DB_USER -h $DB_HOST -d $DB_NAME -c "SELECT 1"
```

**3. High memory usage**
```bash
# Check memory
docker stats
kubectl top pods -n production

# Restart with increased limits
kubectl edit deployment stickforstats-backend
```

**4. SSL certificate issues**
```bash
# Renew certificates
certbot renew --force-renewal

# Restart nginx
docker-compose restart frontend
```

---

## 📚 Additional Resources

### Documentation
- [Docker Documentation](https://docs.docker.com)
- [Kubernetes Documentation](https://kubernetes.io/docs)
- [FDA 21 CFR Part 11](https://www.fda.gov/regulatory-information)
- [OWASP Security Guidelines](https://owasp.org)

### Support
- Email: support@stickforstats.com
- Slack: stickforstats.slack.com
- Documentation: docs.stickforstats.com

---

## Mobile App Deployment

### iOS (App Store)

1. **Build the iOS app**
```bash
cd mobile/ios
xcodebuild -workspace StickForStats.xcworkspace \
  -scheme StickForStats \
  -configuration Release \
  -archivePath build/StickForStats.xcarchive \
  archive
```

2. **Export for App Store submission**
```bash
xcodebuild -exportArchive \
  -archivePath build/StickForStats.xcarchive \
  -exportPath build/AppStore \
  -exportOptionsPlist ExportOptions.plist
```

3. **Upload to App Store Connect**
```bash
xcrun altool --upload-app \
  -f build/AppStore/StickForStats.ipa \
  -u "$APPLE_ID" -p "$APP_SPECIFIC_PASSWORD"
```

### Android (Play Store)

1. **Build the Android release APK/AAB**
```bash
cd mobile/android
./gradlew bundleRelease
```

2. **Sign the release bundle**
```bash
jarsigner -verbose -sigalg SHA256withRSA \
  -digestalg SHA-256 \
  -keystore release-keystore.jks \
  app/build/outputs/bundle/release/app-release.aab \
  stickforstats-key
```

3. **Upload to Google Play Console** via the Play Developer API or the web console.

**Reference**: `mobile/` directory

---

## Desktop App Deployment

### Tauri Build (macOS / Windows / Linux)

1. **Build the desktop application**
```bash
cd desktop
npm run tauri build
```

This produces platform-specific installers:
- **macOS**: `.dmg` in `src-tauri/target/release/bundle/dmg/`
- **Windows**: `.msi` in `src-tauri/target/release/bundle/msi/`
- **Linux**: `.AppImage` / `.deb` in `src-tauri/target/release/bundle/`

### Code Signing

- **macOS**: Sign with an Apple Developer ID certificate and notarize via `xcrun notarytool`.
- **Windows**: Sign with an EV code signing certificate using `signtool`.
- **Linux**: GPG-sign the release artifacts.

### Auto-Update Configuration

```json
{
  "tauri": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://releases.stickforstats.com/{{target}}/{{current_version}}"
      ],
      "dialog": true,
      "pubkey": "<your-public-key>"
    }
  }
}
```

The desktop app checks for updates on launch and prompts the user to install new versions automatically.

**Reference**: `desktop/` directory

---

## Compliance Deployment

### SOC 2 Audit Trail Configuration

```env
SOC2_AUDIT_TRAIL=true
SOC2_LOG_RETENTION_DAYS=365
SOC2_CHANGE_MANAGEMENT=true
```

Enable comprehensive audit trails for all administrative actions, data access events, and configuration changes to satisfy SOC 2 Type II requirements.

### FDA 21 CFR Part 11 Validation Mode

```env
FDA_VALIDATION_MODE=true
FDA_ELECTRONIC_SIGNATURES=true
FDA_AUDIT_TRAIL_INTEGRITY=sha256
```

When validation mode is active, the system enforces electronic signature requirements, maintains tamper-evident audit logs, and restricts system changes to authorized personnel only. See the FDA Compliance Configuration section above for the full checklist.

### GDPR Data Residency (EU Region)

```env
GDPR_DATA_RESIDENCY=eu
GDPR_DPA_ENABLED=true
GDPR_RIGHT_TO_ERASURE=true
GDPR_DATA_EXPORT_FORMAT=json
```

For EU-region deployments, all personal data is stored within EU data centers. The GDPR Celery queue (`gdpr`) handles data export and erasure requests asynchronously.

### Compliance Documents

**Reference**: `compliance/` directory (4 documents)
- SOC 2 controls mapping
- FDA 21 CFR Part 11 validation protocol
- GDPR Data Protection Impact Assessment
- Compliance deployment runbook

---

## ✅ Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] SSL certificates obtained and configured
- [ ] Database backups configured and tested
- [ ] Monitoring dashboards set up
- [ ] Alert rules configured
- [ ] Security headers configured
- [ ] FDA compliance settings enabled
- [ ] Load testing completed
- [ ] Disaster recovery plan tested
- [ ] Documentation updated
- [ ] Team trained on procedures

---

**Deployment Version**: 2.0.0
**Last Updated**: February 2026
**Platform Status**: Production-Ready

🎉 **StickForStats is ready for production deployment!**