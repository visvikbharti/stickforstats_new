import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  Card,
  CardContent,
  CardActions,
  Button,
  Avatar,
  AvatarGroup,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  ListItemIcon,
  IconButton,
  Chip,
  TextField,
  Tab,
  Tabs,
  Badge,
  Menu,
  MenuItem,
  Divider
} from '@mui/material';
import {
  Group as GroupIcon,
  Share as ShareIcon,
  Comment as CommentIcon,
  Edit as EditIcon,
  MoreVert as MoreVertIcon,
  Add as AddIcon,
  FolderShared as FolderSharedIcon,
  Assignment as AssignmentIcon,
  Chat as ChatIcon,
  VideoCall as VideoCallIcon,
  Notifications as NotificationsIcon,
  Star as StarIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';

const CollaborationHubPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);

  const projects = [
    {
      id: 1,
      name: 'Clinical Trial Analysis Q3',
      description: 'Statistical analysis of Phase III clinical trial data',
      members: ['AS', 'JD', 'MK', 'RP'],
      lastActivity: '2 hours ago',
      status: 'active',
      shared: 15,
      comments: 23
    },
    {
      id: 2,
      name: 'Manufacturing Quality Control',
      description: 'SQC analysis for production line optimization',
      members: ['TL', 'SK', 'AB'],
      lastActivity: '1 day ago',
      status: 'active',
      shared: 8,
      comments: 12
    },
    {
      id: 3,
      name: 'Gene Expression Study',
      description: 'PCA analysis of microarray data',
      members: ['DR', 'NP'],
      lastActivity: '3 days ago',
      status: 'completed',
      shared: 4,
      comments: 7
    }
  ];

  const teamMembers = [
    {
      id: 1,
      name: 'Alice Smith',
      role: 'Lead Statistician',
      avatar: 'AS',
      status: 'online',
      email: 'alice.smith@example.com'
    },
    {
      id: 2,
      name: 'John Doe',
      role: 'Data Scientist',
      avatar: 'JD',
      status: 'online',
      email: 'john.doe@example.com'
    },
    {
      id: 3,
      name: 'Maria Kim',
      role: 'Research Analyst',
      avatar: 'MK',
      status: 'away',
      email: 'maria.kim@example.com'
    },
    {
      id: 4,
      name: 'Robert Park',
      role: 'PhD Student',
      avatar: 'RP',
      status: 'offline',
      email: 'robert.park@example.com'
    }
  ];

  const recentActivities = [
    {
      id: 1,
      user: 'Alice Smith',
      action: 'shared analysis results',
      project: 'Clinical Trial Analysis Q3',
      time: '2 hours ago',
      type: 'share'
    },
    {
      id: 2,
      user: 'John Doe',
      action: 'commented on',
      project: 'Manufacturing Quality Control',
      time: '5 hours ago',
      type: 'comment'
    },
    {
      id: 3,
      user: 'Maria Kim',
      action: 'completed review of',
      project: 'Gene Expression Study',
      time: '1 day ago',
      type: 'complete'
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
      case 'online': return 'success';
      case 'away': return 'warning';
      case 'offline': return 'default';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={2} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Collaboration Hub
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Work together on statistical analyses, share insights, and collaborate in real-time with your team.
        </Typography>
      </Paper>

      <Grid container spacing={3}>
        {/* Projects Section */}
        <Grid item xs={12} md={8}>
          <Paper elevation={1} sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6">
                Shared Projects
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />}>
                New Project
              </Button>
            </Box>

            <Grid container spacing={2}>
              {projects.map((project) => (
                <Grid item xs={12} key={project.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="start">
                        <Box flex={1}>
                          <Typography variant="h6" gutterBottom>
                            {project.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" paragraph>
                            {project.description}
                          </Typography>
                          <Box display="flex" alignItems="center" gap={2}>
                            <AvatarGroup max={4} sx={{ flexDirection: 'row' }}>
                              {project.members.map((member, index) => (
                                <Avatar key={index} sx={{ width: 30, height: 30, fontSize: '0.875rem' }}>
                                  {member}
                                </Avatar>
                              ))}
                            </AvatarGroup>
                            <Typography variant="caption" color="text.secondary">
                              {project.lastActivity}
                            </Typography>
                          </Box>
                        </Box>
                        <Box>
                          <IconButton size="small" onClick={handleMenuClick}>
                            <MoreVertIcon />
                          </IconButton>
                        </Box>
                      </Box>
                    </CardContent>
                    <CardActions sx={{ px: 2, py: 1 }}>
                      <Button size="small" startIcon={<FolderSharedIcon />}>
                        Open
                      </Button>
                      <Button size="small" startIcon={<ShareIcon />}>
                        Share
                      </Button>
                      <Box sx={{ flexGrow: 1 }} />
                      <Chip 
                        icon={<CommentIcon />} 
                        label={project.comments} 
                        size="small" 
                        variant="outlined" 
                      />
                      <Chip 
                        icon={<ShareIcon />} 
                        label={project.shared} 
                        size="small" 
                        variant="outlined" 
                      />
                      {project.status === 'completed' && (
                        <Chip label="Completed" size="small" color="success" />
                      )}
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>

          {/* Activity Feed */}
          <Paper elevation={1} sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <List>
              {recentActivities.map((activity, index) => (
                <React.Fragment key={activity.id}>
                  <ListItem alignItems="flex-start">
                    <ListItemAvatar>
                      <Avatar>{activity.user.split(' ').map(n => n[0]).join('')}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="body2">
                          <strong>{activity.user}</strong> {activity.action} <strong>{activity.project}</strong>
                        </Typography>
                      }
                      secondary={activity.time}
                    />
                  </ListItem>
                  {index < recentActivities.length - 1 && <Divider variant="inset" component="li" />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Team Members Section */}
        <Grid item xs={12} md={4}>
          <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Team Members
              </Typography>
              <IconButton size="small">
                <AddIcon />
              </IconButton>
            </Box>
            <List dense>
              {teamMembers.map((member) => (
                <ListItem key={member.id}>
                  <ListItemAvatar>
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      variant="dot"
                      color={getStatusColor(member.status)}
                    >
                      <Avatar>{member.avatar}</Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={member.name}
                    secondary={member.role}
                  />
                  <ListItemSecondaryAction>
                    <IconButton edge="end" size="small">
                      <ChatIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Paper>

          {/* Quick Actions */}
          <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Button fullWidth variant="outlined" sx={{ mb: 1 }} startIcon={<VideoCallIcon />}>
              Start Video Meeting
            </Button>
            <Button fullWidth variant="outlined" sx={{ mb: 1 }} startIcon={<ScheduleIcon />}>
              Schedule Review
            </Button>
            <Button fullWidth variant="outlined" sx={{ mb: 1 }} startIcon={<AssignmentIcon />}>
              Create Task
            </Button>
            <Button fullWidth variant="outlined" startIcon={<NotificationsIcon />}>
              Team Notifications
            </Button>
          </Paper>

          {/* Shared Resources */}
          <Paper elevation={1} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Shared Resources
            </Typography>
            <List dense>
              <ListItem button>
                <ListItemIcon>
                  <FolderSharedIcon color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Analysis Templates"
                  secondary="12 files"
                />
              </ListItem>
              <ListItem button>
                <ListItemIcon>
                  <FolderSharedIcon color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Datasets"
                  secondary="8 files"
                />
              </ListItem>
              <ListItem button>
                <ListItemIcon>
                  <FolderSharedIcon color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Documentation"
                  secondary="5 files"
                />
              </ListItem>
            </List>
          </Paper>
        </Grid>
      </Grid>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleMenuClose}>Edit Project</MenuItem>
        <MenuItem onClick={handleMenuClose}>Manage Members</MenuItem>
        <MenuItem onClick={handleMenuClose}>Project Settings</MenuItem>
        <Divider />
        <MenuItem onClick={handleMenuClose}>Archive Project</MenuItem>
      </Menu>
    </Container>
  );
};

export default CollaborationHubPage;