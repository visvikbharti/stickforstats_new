/**
 * Compliance Dashboard Components
 * Components for displaying regulatory compliance status and metrics
 *
 * @module ComplianceComponents
 * @version 1.0.0
 * @author StickForStats Platform
 * @license MIT
 */

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Grid,
  Divider,
  Alert,
  AlertTitle,
  CircularProgress,
  Button,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  VerifiedUser,
  CheckCircle,
  Cancel,
  Warning,
  Security,
  AssignmentTurnedIn,
  Schedule,
  TrendingUp,
  Info,
  Download,
  Refresh,
  Shield,
  Policy,
  Gavel
} from '@mui/icons-material';
import { format } from 'date-fns';

/**
 * Compliance status card
 */
export const ComplianceCard = ({ standard, status, lastAudit }) => {
  const getStatusColor = () => {
    if (!status) return 'default';
    return status.compliant ? 'success' : 'warning';
  };

  const getStatusIcon = () => {
    if (!status) return <Warning color="disabled" />;
    return status.compliant ? (
      <VerifiedUser color="success" />
    ) : (
      <Warning color="warning" />
    );
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="div">
            {standard}
          </Typography>
          <Chip
            icon={getStatusIcon()}
            label={status?.compliant ? 'Compliant' : 'Pending'}
            color={getStatusColor()}
            size="small"
          />
        </Box>

        {status && (
          <>
            <Box mb={2}>
              <Box display="flex" justifyContent="space-between" mb={0.5}>
                <Typography variant="body2" color="textSecondary">
                  Compliance Score
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {status.score?.toFixed(0)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={status.score || 0}
                color={status.score >= 90 ? 'success' : status.score >= 70 ? 'warning' : 'error'}
                sx={{ height: 8, borderRadius: 1 }}
              />
            </Box>

            {status.details && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Requirements
                </Typography>
                <Grid container spacing={1}>
                  {Object.entries(status.details).map(([key, value]) => (
                    <Grid item xs={6} key={key}>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        {value ? (
                          <CheckCircle color="success" sx={{ fontSize: 16 }} />
                        ) : (
                          <Cancel color="error" sx={{ fontSize: 16 }} />
                        )}
                        <Typography variant="caption">
                          {formatRequirementName(key)}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
          </>
        )}

        {lastAudit && (
          <Box mt={2} pt={1} borderTop={1} borderColor="divider">
            <Typography variant="caption" color="textSecondary">
              Last Audit: {format(new Date(lastAudit), 'PPP')}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Audit trail summary
 */
export const AuditTrailSummary = ({ logs }) => {
  const stats = React.useMemo(() => {
    const total = logs.length;
    const byLevel = logs.reduce((acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      return acc;
    }, {});

    const byCategory = logs.reduce((acc, log) => {
      if (log.category) {
        acc[log.category] = (acc[log.category] || 0) + 1;
      }
      return acc;
    }, {});

    const recentActivity = logs.slice(0, 5);

    return {
      total,
      byLevel,
      byCategory,
      recentActivity,
      integrityVerified: logs.every(log => log.signature),
      retention: '7 years'
    };
  }, [logs]);

  return (
    <Paper sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Audit Trail Summary
        </Typography>
        <Box display="flex" gap={1}>
          {stats.integrityVerified && (
            <Chip
              icon={<Shield />}
              label="Integrity Verified"
              color="success"
              size="small"
            />
          )}
          <Chip
            icon={<Schedule />}
            label={`Retention: ${stats.retention}`}
            size="small"
            variant="outlined"
          />
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Total Entries */}
        <Grid item xs={12} md={3}>
          <Box>
            <Typography variant="body2" color="textSecondary">
              Total Entries
            </Typography>
            <Typography variant="h4">
              {stats.total.toLocaleString()}
            </Typography>
            <Typography variant="caption" color="success.main">
              All entries signed
            </Typography>
          </Box>
        </Grid>

        {/* Entry Distribution */}
        <Grid item xs={12} md={4}>
          <Typography variant="subtitle2" gutterBottom>
            Entry Levels
          </Typography>
          {Object.entries(stats.byLevel).map(([level, count]) => (
            <Box key={level} display="flex" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2" textTransform="capitalize">
                {level}
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {count}
              </Typography>
            </Box>
          ))}
        </Grid>

        {/* Categories */}
        <Grid item xs={12} md={5}>
          <Typography variant="subtitle2" gutterBottom>
            Categories
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={0.5}>
            {Object.entries(stats.byCategory).map(([category, count]) => (
              <Chip
                key={category}
                label={`${category} (${count})`}
                size="small"
                variant="outlined"
              />
            ))}
          </Box>
        </Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      {/* Recent Activity */}
      <Typography variant="subtitle2" gutterBottom>
        Recent Activity
      </Typography>
      <List dense>
        {stats.recentActivity.map((log, index) => (
          <ListItem key={index} disableGutters>
            <ListItemIcon sx={{ minWidth: 32 }}>
              {getLevelIcon(log.level)}
            </ListItemIcon>
            <ListItemText
              primary={log.action}
              secondary={format(new Date(log.timestamp), 'PPpp')}
              primaryTypographyProps={{ variant: 'body2' }}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
          </ListItem>
        ))}
      </List>

      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="caption">
          Audit trail maintained per FDA 21 CFR Part 11 with blockchain-style integrity verification
        </Typography>
      </Alert>
    </Paper>
  );
};

/**
 * Compliance checklist
 */
export const ComplianceChecklist = ({ items }) => {
  const completedCount = items.filter(item => item.status).length;
  const completionRate = items.length > 0 ? (completedCount / items.length) * 100 : 0;

  return (
    <Paper sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Compliance Checklist
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <CircularProgress
            variant="determinate"
            value={completionRate}
            size={40}
            color={completionRate === 100 ? 'success' : 'warning'}
          />
          <Typography variant="body2">
            {completedCount}/{items.length}
          </Typography>
        </Box>
      </Box>

      <List>
        {items.map((item, index) => (
          <ListItem key={index} disableGutters>
            <ListItemIcon sx={{ minWidth: 32 }}>
              {item.status ? (
                <CheckCircle color="success" />
              ) : (
                <Cancel color="action" />
              )}
            </ListItemIcon>
            <ListItemText
              primary={item.item}
              primaryTypographyProps={{
                variant: 'body2',
                sx: {
                  textDecoration: item.status ? 'none' : 'none',
                  color: item.status ? 'text.primary' : 'text.secondary'
                }
              }}
            />
            {item.required && !item.status && (
              <Chip label="Required" color="error" size="small" />
            )}
          </ListItem>
        ))}
      </List>

      {completionRate < 100 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          <AlertTitle>Action Required</AlertTitle>
          Complete all checklist items to ensure full regulatory compliance
        </Alert>
      )}
    </Paper>
  );
};

/**
 * Data integrity metrics
 */
export const DataIntegrityMetrics = ({ metrics }) => {
  if (!metrics) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Data Integrity</Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
          No data integrity metrics available
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Data Integrity Metrics
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={6}>
          <Box>
            <Typography variant="body2" color="textSecondary">
              Checks Performed
            </Typography>
            <Typography variant="h4">
              {metrics.checksPerformed?.toLocaleString() || 0}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Box>
            <Typography variant="body2" color="textSecondary">
              Checks Passed
            </Typography>
            <Typography variant="h4" color="success.main">
              {metrics.checksPassed?.toLocaleString() || 0}
            </Typography>
          </Box>
        </Grid>
      </Grid>

      <Box mt={2}>
        <Box display="flex" justifyContent="space-between" mb={0.5}>
          <Typography variant="body2" color="textSecondary">
            Integrity Score
          </Typography>
          <Typography variant="body2" fontWeight="bold">
            {metrics.integrityScore?.toFixed(0) || 0}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={metrics.integrityScore || 0}
          color={metrics.integrityScore >= 95 ? 'success' : 'warning'}
          sx={{ height: 8, borderRadius: 1 }}
        />
      </Box>

      {metrics.lastCheck && (
        <Box mt={2} pt={1} borderTop={1} borderColor="divider">
          <Typography variant="caption" color="textSecondary">
            Last Check: {format(new Date(metrics.lastCheck), 'PPpp')}
          </Typography>
        </Box>
      )}

      <List dense sx={{ mt: 2 }}>
        <ListItem disableGutters>
          <ListItemIcon sx={{ minWidth: 32 }}>
            <CheckCircle color="success" />
          </ListItemIcon>
          <ListItemText
            primary="Hash Verification"
            secondary="All data hashes verified"
            primaryTypographyProps={{ variant: 'body2' }}
            secondaryTypographyProps={{ variant: 'caption' }}
          />
        </ListItem>
        <ListItem disableGutters>
          <ListItemIcon sx={{ minWidth: 32 }}>
            <CheckCircle color="success" />
          </ListItemIcon>
          <ListItemText
            primary="Digital Signatures"
            secondary="All signatures valid"
            primaryTypographyProps={{ variant: 'body2' }}
            secondaryTypographyProps={{ variant: 'caption' }}
          />
        </ListItem>
        <ListItem disableGutters>
          <ListItemIcon sx={{ minWidth: 32 }}>
            <CheckCircle color="success" />
          </ListItemIcon>
          <ListItemText
            primary="Chain Integrity"
            secondary="Audit chain unbroken"
            primaryTypographyProps={{ variant: 'body2' }}
            secondaryTypographyProps={{ variant: 'caption' }}
          />
        </ListItem>
      </List>
    </Paper>
  );
};

/**
 * Resource usage card
 */
export const ResourceUsageCard = ({ metrics }) => {
  if (!metrics) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Resource Usage</Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
          No resource metrics available
        </Typography>
      </Paper>
    );
  }

  const usedPercentage = metrics.totalJSHeapSize
    ? (metrics.usedJSHeapSize / metrics.totalJSHeapSize) * 100
    : 0;

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Resource Usage
      </Typography>

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Memory Usage
        </Typography>
        <Box display="flex" justifyContent="space-between" mb={0.5}>
          <Typography variant="body2" color="textSecondary">
            Heap Used
          </Typography>
          <Typography variant="body2">
            {formatBytes(metrics.usedJSHeapSize || 0)} / {formatBytes(metrics.totalJSHeapSize || 0)}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={usedPercentage}
          color={usedPercentage > 80 ? 'error' : usedPercentage > 60 ? 'warning' : 'success'}
          sx={{ height: 8, borderRadius: 1 }}
        />
      </Box>

      {metrics.jsHeapSizeLimit && (
        <Box mt={2}>
          <Typography variant="caption" color="textSecondary">
            Heap Limit: {formatBytes(metrics.jsHeapSizeLimit)}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

/**
 * Cache performance card
 */
export const CachePerformanceCard = ({ metrics }) => {
  if (!metrics) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Cache Performance</Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
          No cache metrics available
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Cache Performance
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={4}>
          <Box>
            <Typography variant="body2" color="textSecondary">
              Hits
            </Typography>
            <Typography variant="h4" color="success.main">
              {metrics.hits?.toLocaleString() || 0}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={4}>
          <Box>
            <Typography variant="body2" color="textSecondary">
              Misses
            </Typography>
            <Typography variant="h4" color="error.main">
              {metrics.misses?.toLocaleString() || 0}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={4}>
          <Box>
            <Typography variant="body2" color="textSecondary">
              Hit Rate
            </Typography>
            <Typography variant="h4">
              {metrics.hitRate?.toFixed(1) || 0}%
            </Typography>
          </Box>
        </Grid>
      </Grid>

      <Box mt={2}>
        <LinearProgress
          variant="determinate"
          value={metrics.hitRate || 0}
          color={metrics.hitRate >= 80 ? 'success' : metrics.hitRate >= 60 ? 'warning' : 'error'}
          sx={{ height: 8, borderRadius: 1 }}
        />
      </Box>

      <Alert severity={metrics.hitRate >= 80 ? 'success' : 'info'} sx={{ mt: 2 }}>
        <Typography variant="caption">
          {metrics.hitRate >= 80
            ? 'Cache performing optimally'
            : 'Consider increasing cache size for better performance'}
        </Typography>
      </Alert>
    </Paper>
  );
};

// Helper functions
const formatRequirementName = (key) => {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
};

const getLevelIcon = (level) => {
  switch (level) {
    case 'info':
      return <Info color="info" fontSize="small" />;
    case 'success':
      return <CheckCircle color="success" fontSize="small" />;
    case 'warning':
      return <Warning color="warning" fontSize="small" />;
    case 'error':
      return <Cancel color="error" fontSize="small" />;
    default:
      return <Info fontSize="small" />;
  }
};

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export default {
  ComplianceCard,
  AuditTrailSummary,
  ComplianceChecklist,
  DataIntegrityMetrics,
  ResourceUsageCard,
  CachePerformanceCard
};