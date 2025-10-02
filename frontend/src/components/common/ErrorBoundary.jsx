import React, { Component } from 'react';
import { Typography, Paper, Button, Box, Alert, AlertTitle } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

/**
 * Error Boundary component that catches errors in its child component tree
 * and displays a fallback UI instead of the component tree that crashed.
 * 
 * @component
 * @example
 * <ErrorBoundary
 *   fallback={<CustomErrorComponent />}
 *   onError={(error, info) => logErrorToService(error, info)}
 * >
 *   <ComponentThatMightThrow />
 * </ErrorBoundary>
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to an error reporting service
    this.setState({ errorInfo });
    
    // Call onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // Log error details to console in development environment
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error caught by ErrorBoundary:', error);
      console.error('Component stack:', errorInfo.componentStack);
    }
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
  }

  render() {
    if (this.state.hasError) {
      // Render custom fallback if provided or default error UI
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }
      
      return (
        <Paper
          elevation={3}
          sx={{
            p: 4,
            m: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fff',
            borderRadius: 2,
            maxWidth: 600,
            mx: 'auto'
          }}
        >
          <ErrorOutlineIcon color="error" sx={{ fontSize: 60, mb: 2 }} />
          
          <Typography variant="h5" color="error" gutterBottom>
            Something went wrong
          </Typography>
          
          <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
            <AlertTitle>Application Error</AlertTitle>
            {this.state.error && this.state.error.toString()}
          </Alert>
          
          {process.env.NODE_ENV !== 'production' && this.state.errorInfo && (
            <Box 
              sx={{ 
                mt: 2, 
                p: 2, 
                bgcolor: '#f5f5f5', 
                borderRadius: 1,
                width: '100%',
                overflow: 'auto',
                maxHeight: '200px',
              }}
            >
              <Typography variant="subtitle2" gutterBottom>
                Component Stack:
              </Typography>
              <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                {this.state.errorInfo.componentStack}
              </Typography>
            </Box>
          )}
          
          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={this.handleReset}
            >
              Retry
            </Button>
            
            <Button 
              variant="outlined"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </Button>
          </Box>
        </Paper>
      );
    }

    // When there's no error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;