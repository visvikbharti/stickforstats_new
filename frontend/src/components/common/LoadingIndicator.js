import React from 'react';
import { Box, CircularProgress, Typography, LinearProgress } from '@mui/material';

const LoadingIndicator = ({ 
  variant = 'circular', 
  message = 'Loading...', 
  fullScreen = false,
  showProgress = false,
  progress = 0,
  size = 40
}) => {
  const content = (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      gap={2}
      p={3}
    >
      {variant === 'circular' ? (
        <CircularProgress size={size} />
      ) : (
        <Box width="100%" maxWidth={300}>
          <LinearProgress 
            variant={showProgress ? 'determinate' : 'indeterminate'} 
            value={progress}
          />
        </Box>
      )}
      
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
      
      {showProgress && (
        <Typography variant="caption" color="text.secondary">
          {Math.round(progress)}%
        </Typography>
      )}
    </Box>
  );

  if (fullScreen) {
    return (
      <Box
        position="fixed"
        top={0}
        left={0}
        right={0}
        bottom={0}
        bgcolor="background.default"
        display="flex"
        alignItems="center"
        justifyContent="center"
        zIndex={9999}
      >
        {content}
      </Box>
    );
  }

  return content;
};

export default LoadingIndicator;