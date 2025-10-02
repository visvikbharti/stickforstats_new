import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  Card,
  CardContent,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Avatar,
  AvatarGroup,
  LinearProgress,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Menu,
  MenuItem,
  Divider,
  Alert
} from '@mui/material';
import {
  Business as BusinessIcon,
  Group as GroupIcon,
  Storage as StorageIcon,
  Security as SecurityIcon,
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  CloudQueue as CloudIcon,
  MoreVert as MoreVertIcon,
  Add as AddIcon,
  Settings as SettingsIcon,
  Assignment as AssignmentIcon,
  AttachMoney as AttachMoneyIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const EnterpriseDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);

  // Enterprise metrics
  const metrics = {
    totalUsers: 1248,
    activeUsers: 892,
    storageUsed: '2.4 TB',
    storageTotal: '5 TB',
    apiCalls: '1.2M',
    uptime: 99.97,
    licenseUtilization: 78
  };

  // Department data
  const departments = [
    {
      id: 1,
      name: 'Research & Development',
      users: 324,
      activeProjects: 45,
      storageUsed: '850 GB',
      lead: 'Dr. Sarah Johnson',
      status: 'active'
    },
    {
      id: 2,
      name: 'Quality Assurance',
      users: 156,
      activeProjects: 23,
      storageUsed: '420 GB',
      lead: 'Michael Chen',
      status: 'active'
    },
    {
      id: 3,
      name: 'Data Science',
      users: 289,
      activeProjects: 38,
      storageUsed: '680 GB',
      lead: 'Emily Rodriguez',
      status: 'active'
    },
    {
      id: 4,
      name: 'Clinical Research',
      users: 198,
      activeProjects: 31,
      storageUsed: '520 GB',
      lead: 'Dr. James Wilson',
      status: 'active'
    }
  ];

  // License information
  const licenses = [
    {
      type: 'Enterprise Pro',
      seats: 1500,
      used: 1248,
      expires: '2025-12-31',
      status: 'active'
    },
    {
      type: 'Advanced Analytics',
      seats: 500,
      used: 423,
      expires: '2025-12-31',
      status: 'active'
    },
    {
      type: 'ML Studio',
      seats: 200,
      used: 178,
      expires: '2025-06-30',
      status: 'warning'
    }
  ];

  // Recent activity
  const recentActivity = [
    {
      id: 1,
      user: 'Sarah Johnson',
      action: 'Created new project',
      department: 'R&D',
      time: '2 hours ago',
      type: 'project'
    },
    {
      id: 2,
      user: 'Admin',
      action: 'Added 50 user licenses',
      department: 'IT',
      time: '5 hours ago',
      type: 'license'
    },
    {
      id: 3,
      user: 'Michael Chen',
      action: 'Completed compliance audit',
      department: 'QA',
      time: '1 day ago',
      type: 'compliance'
    }
  ];

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'warning': return 'warning';
      case 'inactive': return 'error';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 4, mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h3" component="h1" gutterBottom>
              Enterprise Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your organization's StickForStats deployment
            </Typography>
          </Box>
          <Box>
            <Button variant="outlined" startIcon={<SettingsIcon />} sx={{ mr: 1 }}>
              Settings
            </Button>
            <Button variant="contained" startIcon={<AddIcon />}>
              Add Users
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Total Users
                  </Typography>
                  <Typography variant="h4">
                    {metrics.totalUsers.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="success.main">
                    +12% from last month
                  </Typography>
                </Box>
                <GroupIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Active Users
                  </Typography>
                  <Typography variant="h4">
                    {metrics.activeUsers}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {((metrics.activeUsers / metrics.totalUsers) * 100).toFixed(0)}% of total
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Storage Used
                  </Typography>
                  <Typography variant="h4">
                    {metrics.storageUsed}
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={48} 
                    sx={{ mt: 1 }}
                  />
                </Box>
                <StorageIcon sx={{ fontSize: 40, color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    System Uptime
                  </Typography>
                  <Typography variant="h4">
                    {metrics.uptime}%
                  </Typography>
                  <Typography variant="body2" color="success.main">
                    Excellent
                  </Typography>
                </Box>
                <CloudIcon sx={{ fontSize: 40, color: 'info.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Paper elevation={1}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="Departments" />
          <Tab label="Licenses" />
          <Tab label="Usage Analytics" />
          <Tab label="Billing" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* Departments Tab */}
          {activeTab === 0 && (
            <>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">
                  Department Overview
                </Typography>
                <Button variant="outlined" startIcon={<AddIcon />}>
                  Add Department
                </Button>
              </Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Department</TableCell>
                      <TableCell align="right">Users</TableCell>
                      <TableCell align="right">Active Projects</TableCell>
                      <TableCell align="right">Storage Used</TableCell>
                      <TableCell>Department Lead</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {departments.map((dept) => (
                      <TableRow key={dept.id}>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <BusinessIcon color="primary" />
                            {dept.name}
                          </Box>
                        </TableCell>
                        <TableCell align="right">{dept.users}</TableCell>
                        <TableCell align="right">{dept.activeProjects}</TableCell>
                        <TableCell align="right">{dept.storageUsed}</TableCell>
                        <TableCell>{dept.lead}</TableCell>
                        <TableCell>
                          <Chip 
                            label={dept.status} 
                            size="small" 
                            color={getStatusColor(dept.status)}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={handleMenuClick}>
                            <MoreVertIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}

          {/* Licenses Tab */}
          {activeTab === 1 && (
            <>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">
                  License Management
                </Typography>
                <Button variant="contained" startIcon={<AttachMoneyIcon />}>
                  Purchase Licenses
                </Button>
              </Box>
              <Grid container spacing={3}>
                {licenses.map((license, index) => (
                  <Grid item xs={12} md={4} key={index}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                          <Typography variant="h6">
                            {license.type}
                          </Typography>
                          <Chip 
                            label={license.status} 
                            size="small" 
                            color={getStatusColor(license.status)}
                          />
                        </Box>
                        <Box mb={2}>
                          <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="body2" color="text.secondary">
                              License Usage
                            </Typography>
                            <Typography variant="body2">
                              {license.used} / {license.seats}
                            </Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={(license.used / license.seats) * 100}
                            color={license.status === 'warning' ? 'warning' : 'primary'}
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          Expires: {license.expires}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              <Alert severity="info" sx={{ mt: 3 }}>
                Contact your account manager to adjust license quantities or explore additional features.
              </Alert>
            </>
          )}

          {/* Usage Analytics Tab */}
          {activeTab === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Usage Analytics
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper elevation={0} sx={{ p: 3, bgcolor: 'grey.100' }}>
                    <Typography variant="subtitle1" gutterBottom>
                      API Usage (Last 30 Days)
                    </Typography>
                    <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography color="text.secondary">
                        Chart visualization would go here
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper elevation={0} sx={{ p: 3, bgcolor: 'grey.100' }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Storage Growth
                    </Typography>
                    <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography color="text.secondary">
                        Chart visualization would go here
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Billing Tab */}
          {activeTab === 3 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Billing & Invoices
              </Typography>
              <Alert severity="success" sx={{ mb: 3 }}>
                Your account is in good standing. Next payment due on January 1, 2025.
              </Alert>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Invoice Date</TableCell>
                      <TableCell>Period</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Dec 1, 2024</TableCell>
                      <TableCell>Dec 2024</TableCell>
                      <TableCell>$12,450.00</TableCell>
                      <TableCell>
                        <Chip label="Paid" size="small" color="success" />
                      </TableCell>
                      <TableCell>
                        <Button size="small">Download</Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Nov 1, 2024</TableCell>
                      <TableCell>Nov 2024</TableCell>
                      <TableCell>$12,450.00</TableCell>
                      <TableCell>
                        <Chip label="Paid" size="small" color="success" />
                      </TableCell>
                      <TableCell>
                        <Button size="small">Download</Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Recent Activity Sidebar */}
      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid item xs={12} md={8}>
          <Paper elevation={1} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              System Health
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="success" />
                </ListItemIcon>
                <ListItemText 
                  primary="All systems operational"
                  secondary="Last checked 5 minutes ago"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <SecurityIcon color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Security scan completed"
                  secondary="No vulnerabilities detected"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <SpeedIcon color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Performance optimal"
                  secondary="Average response time: 124ms"
                />
              </ListItem>
            </List>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper elevation={1} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <List dense>
              {recentActivity.map((activity, index) => (
                <React.Fragment key={activity.id}>
                  <ListItem>
                    <ListItemText
                      primary={activity.action}
                      secondary={`${activity.user} • ${activity.time}`}
                    />
                  </ListItem>
                  {index < recentActivity.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleMenuClose}>View Details</MenuItem>
        <MenuItem onClick={handleMenuClose}>Edit Department</MenuItem>
        <MenuItem onClick={handleMenuClose}>Manage Users</MenuItem>
        <Divider />
        <MenuItem onClick={handleMenuClose}>Export Data</MenuItem>
      </Menu>
    </Container>
  );
};

export default EnterpriseDashboard;