import React, { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { styled } from '@mui/material/styles';

// Custom ButtonLink component that acts as both a button and a router link
const ButtonLink = forwardRef(({ to, children, ...props }, ref) => {
  // If there's a 'to' prop, render as a Link
  if (to) {
    return (
      <StyledLink ref={ref} to={to} {...props}>
        {children}
      </StyledLink>
    );
  }
  
  // Otherwise, render as a regular button/div
  return (
    <StyledButton ref={ref} {...props}>
      {children}
    </StyledButton>
  );
});

ButtonLink.displayName = 'ButtonLink';

// Styled components
const StyledLink = styled(Link)(({ theme }) => ({
  textDecoration: 'none',
  color: 'inherit',
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  padding: '8px 16px',
  borderRadius: theme.shape.borderRadius,
  transition: theme.transitions.create(['background-color', 'color'], {
    duration: theme.transitions.duration.shortest,
  }),
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
  '&:focus': {
    outline: 'none',
    backgroundColor: theme.palette.action.selected,
  },
}));

const StyledButton = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  padding: '8px 16px',
  borderRadius: theme.shape.borderRadius,
  cursor: 'pointer',
  transition: theme.transitions.create(['background-color', 'color'], {
    duration: theme.transitions.duration.shortest,
  }),
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
  '&:focus': {
    outline: 'none',
    backgroundColor: theme.palette.action.selected,
  },
}));

export default ButtonLink;