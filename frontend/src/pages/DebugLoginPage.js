import React from 'react';
import {
  Container,
  Paper,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DebugLoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const testUsers = [
    {
      email: 'admin@stickforstats.com',
      password: 'admin123',
      role: 'Admin',
      description: 'Full system access'
    },
    {
      email: 'researcher@stickforstats.com',
      password: 'researcher123',
      role: 'Researcher',
      description: 'Access to all analysis modules'
    },
    {
      email: 'student@stickforstats.com',
      password: 'student123',
      role: 'Student',
      description: 'Limited access with educational content'
    },
    {
      email: 'demo@stickforstats.com',
      password: 'demo123',
      role: 'Demo User',
      description: 'Read-only access for demonstration'
    }
  ];

  const handleQuickLogin = async (user) => {
    const result = await login({
      username: user.email,
      password: user.password
    });

    if (result.success) {
      navigate('/');
    }
  };

  if (process.env.NODE_ENV === 'production') {
    navigate('/login');
    return null;
  }

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            Debug Login
          </Typography>
          
          <Alert severity="warning" sx={{ mb: 3 }}>
            This page is only available in development mode
          </Alert>

          <Typography variant="body1" paragraph>
            Quick login with test accounts:
          </Typography>

          <List>
            {testUsers.map((user, index) => (
              <React.Fragment key={user.email}>
                <ListItem>
                  <ListItemText
                    primary={
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="subtitle1">{user.role}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {user.email}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {user.description}
                          </Typography>
                        </Box>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleQuickLogin(user)}
                        >
                          Login
                        </Button>
                      </Box>
                    }
                  />
                </ListItem>
                {index < testUsers.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button variant="outlined" onClick={() => navigate('/login')}>
              Go to Normal Login
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default DebugLoginPage;