import React from 'react';
import { Box, Paper, Typography, Button } from '@mui/material';
import { useAuth } from '../../context/AuthContext';

const AuthDebug = () => {
  const { user, isAuthenticated, login, logout } = useAuth();

  const handleTestLogin = async () => {
    await login({
      username: 'test@stickforstats.com',
      password: 'testpassword123'
    });
  };

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Box sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999 }}>
      <Paper sx={{ p: 2, maxWidth: 300 }}>
        <Typography variant="h6" gutterBottom>Auth Debug</Typography>
        <Typography variant="body2">
          Authenticated: {isAuthenticated ? 'Yes' : 'No'}
        </Typography>
        {user && (
          <>
            <Typography variant="body2">User: {user.email}</Typography>
            <Typography variant="body2">Role: {user.role || 'user'}</Typography>
          </>
        )}
        <Box sx={{ mt: 2 }}>
          {!isAuthenticated ? (
            <Button variant="contained" size="small" onClick={handleTestLogin}>
              Test Login
            </Button>
          ) : (
            <Button variant="outlined" size="small" onClick={logout}>
              Logout
            </Button>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default AuthDebug;