import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const LoadingFallback = ({ message = "Loading module..." }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '50vh',
      p: 4
    }}
  >
    <CircularProgress size={40} />
    <Typography variant="h6" sx={{ mt: 2 }}>
      {message}
    </Typography>
  </Box>
);

export default LoadingFallback;
