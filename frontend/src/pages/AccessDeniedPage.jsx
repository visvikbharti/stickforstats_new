import React from 'react';
import { Box, Typography, Button } from '@mui/material';

const AccessDeniedPage = () => (
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
    <Typography variant="h4" gutterBottom>Access Denied</Typography>
    <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>You don't have permission to access this page.</Typography>
    <Button variant="contained" href="/">Return Home</Button>
  </Box>
);

export default AccessDeniedPage;
