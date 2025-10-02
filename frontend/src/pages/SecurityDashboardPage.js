import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Alert,
  Button,
  LinearProgress,
  Switch
} from '@mui/material';
import {
  Security as SecurityIcon,
  VpnKey as VpnKeyIcon,
  Lock as LockIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Settings as SettingsIcon,
  History as HistoryIcon,
  Shield as ShieldIcon,
  PersonAdd as PersonAddIcon
} from '@mui/icons-material';

const SecurityDashboardPage = () => {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [encryptionEnabled, setEncryptionEnabled] = useState(true);

  const securityMetrics = [
    {
      label: 'Account Security',
      value: 85,
      status: 'good',
      description: 'Strong password, 2FA recommended'
    },
    {
      label: 'Data Protection',
      value: 100,
      status: 'excellent',
      description: 'All data encrypted at rest'
    },
    {
      label: 'Access Control',
      value: 90,
      status: 'good',
      description: 'Proper permissions configured'
    },
    {
      label: 'Audit Compliance',
      value: 95,
      status: 'excellent',
      description: 'All activities logged'
    }
  ];

  const recentActivities = [
    { id: 1, action: 'Login', location: 'New York, USA', time: '2 hours ago', status: 'success' },
    { id: 2, action: 'Data Export', details: 'SQC Analysis Results', time: '5 hours ago', status: 'success' },
    { id: 3, action: 'Password Changed', location: 'Boston, USA', time: '2 days ago', status: 'warning' },
    { id: 4, action: 'API Key Generated', details: 'For integration', time: '3 days ago', status: 'info' }
  ];

  const securityFeatures = [
    {
      title: 'Two-Factor Authentication',
      description: 'Add an extra layer of security to your account',
      icon: <VpnKeyIcon />,
      enabled: twoFactorEnabled,
      toggle: setTwoFactorEnabled
    },
    {
      title: 'Data Encryption',
      description: 'Encrypt all data at rest and in transit',
      icon: <LockIcon />,
      enabled: encryptionEnabled,
      toggle: setEncryptionEnabled
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'excellent': return 'success';
      case 'good': return 'primary';
      case 'warning': return 'warning';
      case 'danger': return 'error';
      default: return 'default';
    }
  };

  const getActivityIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircleIcon color="success" />;
      case 'warning': return <WarningIcon color="warning" />;
      case 'info': return <InfoIcon color="info" />;
      default: return <InfoIcon />;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={2} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Security Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Monitor and manage your account security, data protection, and compliance status.
        </Typography>
      </Paper>

      {/* Security Score Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {securityMetrics.map((metric, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  {metric.label}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h4" component="div">
                    {metric.value}%
                  </Typography>
                  <Chip 
                    label={metric.status}
                    size="small"
                    color={getStatusColor(metric.status)}
                    sx={{ ml: 1 }}
                  />
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={metric.value} 
                  color={getStatusColor(metric.status)}
                  sx={{ mb: 1 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {metric.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Security Features */}
        <Grid item xs={12} md={6}>
          <Paper elevation={1} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Security Features
            </Typography>
            <List>
              {securityFeatures.map((feature, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    {feature.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={feature.title}
                    secondary={feature.description}
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      edge="end"
                      checked={feature.enabled}
                      onChange={(e) => feature.toggle(e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
              <ListItem button>
                <ListItemIcon>
                  <ShieldIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Session Management"
                  secondary="View and manage active sessions"
                />
              </ListItem>
              <ListItem button>
                <ListItemIcon>
                  <PersonAddIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Authorized Devices"
                  secondary="Manage trusted devices"
                />
              </ListItem>
            </List>
          </Paper>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <Paper elevation={1} sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Recent Activity
              </Typography>
              <Button size="small" startIcon={<HistoryIcon />}>
                View All
              </Button>
            </Box>
            <List>
              {recentActivities.map((activity) => (
                <ListItem key={activity.id}>
                  <ListItemIcon>
                    {getActivityIcon(activity.status)}
                  </ListItemIcon>
                  <ListItemText
                    primary={activity.action}
                    secondary={
                      <React.Fragment>
                        {activity.location || activity.details} • {activity.time}
                      </React.Fragment>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton edge="end" size="small">
                      <InfoIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Security Recommendations */}
        <Grid item xs={12}>
          <Paper elevation={1} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Security Recommendations
            </Typography>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <strong>Action Required:</strong> Enable two-factor authentication to enhance your account security.
            </Alert>
            <Alert severity="info">
              <strong>Tip:</strong> Regular password updates and unique passwords for each service improve security.
            </Alert>
          </Paper>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12}>
          <Paper elevation={1} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Grid container spacing={2}>
              <Grid item>
                <Button variant="outlined" startIcon={<VpnKeyIcon />}>
                  Change Password
                </Button>
              </Grid>
              <Grid item>
                <Button variant="outlined" startIcon={<SecurityIcon />}>
                  Download Security Report
                </Button>
              </Grid>
              <Grid item>
                <Button variant="outlined" startIcon={<SettingsIcon />}>
                  Privacy Settings
                </Button>
              </Grid>
              <Grid item>
                <Button variant="outlined" startIcon={<LockIcon />}>
                  Manage API Keys
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default SecurityDashboardPage;