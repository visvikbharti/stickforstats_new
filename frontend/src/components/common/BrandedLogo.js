import React from 'react';
import { Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import BarChartIcon from '@mui/icons-material/BarChart';

const LogoContainer = styled(Box)(({ theme, variant, size }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: variant === 'header' ? 'scale(1.05)' : 'none',
  },
  ...(variant === 'footer' && {
    opacity: 0.8,
    '&:hover': {
      opacity: 1,
    },
  }),
}));

const LogoIcon = styled(BarChartIcon)(({ theme, size }) => ({
  fontSize: size === 'small' ? '24px' : size === 'medium' ? '32px' : '40px',
  color: theme.palette.primary.main,
  transition: 'color 0.3s ease',
}));

const LogoText = styled(Typography)(({ theme, size }) => ({
  fontWeight: 700,
  fontSize: size === 'small' ? '1rem' : size === 'medium' ? '1.25rem' : '1.5rem',
  background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  letterSpacing: '-0.5px',
}));

const TaglineText = styled(Typography)(({ theme }) => ({
  fontSize: '0.75rem',
  color: theme.palette.text.secondary,
  fontWeight: 400,
  letterSpacing: '0.5px',
}));

const BrandedLogo = ({ 
  variant = 'header', 
  size = 'medium', 
  showText = true,
  showTagline = false,
  onClick,
  ...props 
}) => {
  return (
    <LogoContainer 
      variant={variant} 
      size={size} 
      onClick={onClick}
      {...props}
    >
      <LogoIcon size={size} />
      {showText && (
        <Box>
          <LogoText variant="h6" size={size}>
            StickForStats
          </LogoText>
          {showTagline && size !== 'small' && (
            <TaglineText>
              Statistical Analysis Made Simple
            </TaglineText>
          )}
        </Box>
      )}
    </LogoContainer>
  );
};

export default BrandedLogo;