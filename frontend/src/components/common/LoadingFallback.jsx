import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import PageSkeleton from './SkeletonLoader';

/**
 * Loading fallback that shows skeleton screens for page loads
 * and a spinner with message for smaller module loads.
 *
 * @param {Object} props
 * @param {string} props.message - Loading message text
 * @param {'dashboard'|'analysis'|'table'|'form'|null} props.skeleton - Skeleton variant to show instead of spinner
 */
const LoadingFallback = ({ message = "Loading module...", skeleton = null }) => {
  // Use skeleton screen when a variant is specified
  if (skeleton) {
    return <PageSkeleton variant={skeleton} />;
  }

  // Fallback to spinner for generic module loading
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        p: 4,
      }}
      role="status"
      aria-label={message}
    >
      <CircularProgress size={40} aria-hidden="true" />
      <Typography variant="h6" sx={{ mt: 2 }}>
        {message}
      </Typography>
    </Box>
  );
};

export default LoadingFallback;
