/**
 * Skip navigation link for keyboard/screen reader users.
 * Hidden visually but accessible via keyboard Tab.
 * First focusable element on the page per WCAG 2.1 AA (2.4.1).
 */

import React from 'react';
import { Box, Link } from '@mui/material';

const SkipNavigation = () => (
  <Box
    component="nav"
    aria-label="Skip navigation"
    sx={{
      position: 'absolute',
      '& a': {
        position: 'absolute',
        left: '-10000px',
        top: 'auto',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
        '&:focus': {
          position: 'fixed',
          top: 8,
          left: 8,
          width: 'auto',
          height: 'auto',
          padding: '12px 24px',
          backgroundColor: 'primary.main',
          color: 'primary.contrastText',
          zIndex: 9999,
          borderRadius: 1,
          fontSize: '1rem',
          fontWeight: 600,
          boxShadow: 4,
        },
      },
    }}
  >
    <Link href="#main-content" underline="none">
      Skip to main content
    </Link>
  </Box>
);

export default SkipNavigation;
