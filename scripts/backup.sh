#!/bin/bash
# Database Backup Script for StickForStats
# This script creates timestamped PostgreSQL backups

set -e

# Configuration from environment
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/stickforstats_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

echo "[$(date)] Starting database backup..."

# Create backup directory if it doesn't exist
mkdir -p ${BACKUP_DIR}

# Create compressed backup
pg_dump -h ${PGHOST:-postgres} -U ${PGUSER:-stickforstats} -d ${PGDATABASE:-stickforstats} | gzip > ${BACKUP_FILE}

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "[$(date)] Backup created successfully: ${BACKUP_FILE}"
    echo "[$(date)] Backup size: $(du -h ${BACKUP_FILE} | cut -f1)"
else
    echo "[$(date)] ERROR: Backup failed!"
    exit 1
fi

# Remove backups older than retention period
echo "[$(date)] Cleaning up backups older than ${RETENTION_DAYS} days..."
find ${BACKUP_DIR} -name "stickforstats_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete

# List current backups
echo "[$(date)] Current backups:"
ls -lh ${BACKUP_DIR}/stickforstats_*.sql.gz 2>/dev/null || echo "No backups found"

echo "[$(date)] Backup completed successfully"
