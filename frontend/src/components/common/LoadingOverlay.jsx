import React from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Backdrop,
  LinearProgress,
  Fade,
  Paper,
} from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';

// Pulse animation
const pulse = keyframes`
  0% {
    transform: scale(0.95);
    opacity: 0.7;
  }
  50% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(0.95);
    opacity: 0.7;
  }
`;

// Styled components
const LoadingContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '200px',
  padding: theme.spacing(3),
}));

const AnimatedLogo = styled(Box)(({ theme }) => ({
  animation: `${pulse} 2s ease-in-out infinite`,
  marginBottom: theme.spacing(2),
}));

const LoadingOverlay = ({
  open = true,
  message = 'Loading...',
  submessage = null,
  progress = null,
  variant = 'circular',
  fullScreen = false,
  blur = false,
  logo = false,
  color = 'primary',
  size = 40,
  thickness = 3.6,
}) => {
  const content = (
    <LoadingContainer>
      {logo && (
        <AnimatedLogo>
          <img
            src="/logo192.png"
            alt="Loading"
            style={{ width: 64, height: 64 }}
          />
        </AnimatedLogo>
      )}
      
      {variant === 'circular' && (
        <CircularProgress
          size={size}
          thickness={thickness}
          color={color}
          sx={{ mb: 2 }}
        />
      )}
      
      {variant === 'linear' && (
        <Box sx={{ width: '100%', maxWidth: 400, mb: 2 }}>
          <LinearProgress
            variant={progress !== null ? 'determinate' : 'indeterminate'}
            value={progress}
            color={color}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
      )}
      
      {variant === 'dots' && (
        <Box display="flex" gap={1} mb={2}>
          {[0, 1, 2].map((i) => (
            <Box
              key={i}
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: 'primary.main',
                animation: `${pulse} 1.4s ease-in-out ${i * 0.16}s infinite`,
              }}
            />
          ))}
        </Box>
      )}
      
      <Typography
        variant="h6"
        color="text.primary"
        align="center"
        gutterBottom
      >
        {message}
      </Typography>
      
      {submessage && (
        <Typography
          variant="body2"
          color="text.secondary"
          align="center"
        >
          {submessage}
        </Typography>
      )}
      
      {progress !== null && (
        <Typography
          variant="body2"
          color="text.secondary"
          align="center"
          sx={{ mt: 1 }}
        >
          {Math.round(progress)}%
        </Typography>
      )}
    </LoadingContainer>
  );

  if (fullScreen) {
    return (
      <Backdrop
        open={open}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: blur ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: blur ? 'blur(4px)' : 'none',
        }}
      >
        <Fade in={open}>
          <Paper
            elevation={3}
            sx={{
              p: 4,
              borderRadius: 2,
              backgroundColor: 'background.paper',
            }}
          >
            {content}
          </Paper>
        </Fade>
      </Backdrop>
    );
  }

  return (
    <Fade in={open}>
      <Box>{content}</Box>
    </Fade>
  );
};

// Skeleton loading variant
export const SkeletonLoading = ({ rows = 3, width = '100%' }) => {
  return (
    <Box sx={{ width }}>
      {Array.from({ length: rows }).map((_, index) => (
        <Box key={index} sx={{ mb: 1 }}>
          <Box
            sx={{
              height: 20,
              backgroundColor: 'action.hover',
              borderRadius: 1,
              animation: `${pulse} 1.5s ease-in-out infinite`,
              width: index === rows - 1 ? '60%' : '100%',
            }}
          />
        </Box>
      ))}
    </Box>
  );
};

// Inline loading indicator
export const InlineLoading = ({ size = 20, message = 'Loading...' }) => {
  return (
    <Box display="flex" alignItems="center" gap={1}>
      <CircularProgress size={size} thickness={4} />
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
};

// Loading button content
export const LoadingButton = ({ loading = false, children, ...props }) => {
  return (
    <Box position="relative" display="inline-flex">
      {children}
      {loading && (
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          display="flex"
          alignItems="center"
          justifyContent="center"
          backgroundColor="rgba(255, 255, 255, 0.7)"
          borderRadius="inherit"
        >
          <CircularProgress size={20} />
        </Box>
      )}
    </Box>
  );
};

export default LoadingOverlay;