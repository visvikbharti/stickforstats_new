import React from 'react';
import { Container, Typography, Button, Box } from '@mui/material';
import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <Container>
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="calc(100vh - 200px)"
      >
        <Typography variant="h1" component="h1" color="primary">
          404
        </Typography>
        <Typography variant="h4" component="h2" gutterBottom>
          Page Not Found
        </Typography>
        <Typography variant="body1" align="center" paragraph>
          Sorry, we couldn't find the page you're looking for.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          component={Link}
          to="/"
          size="large"
        >
          Return to Home
        </Button>
      </Box>
    </Container>
  );
}

export default NotFoundPage;