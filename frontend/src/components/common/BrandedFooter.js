import React from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Link,
  IconButton,
  Divider,
  Stack,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import GitHubIcon from '@mui/icons-material/GitHub';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import TwitterIcon from '@mui/icons-material/Twitter';
import EmailIcon from '@mui/icons-material/Email';
import BrandedLogo from './BrandedLogo';

const FooterContainer = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? '#0a0a0a' : '#f8f9fa',
  borderTop: `1px solid ${theme.palette.divider}`,
  marginTop: 'auto',
  padding: theme.spacing(6, 0, 3),
}));

const FooterLink = styled(Link)(({ theme }) => ({
  color: theme.palette.text.secondary,
  textDecoration: 'none',
  fontSize: '0.875rem',
  transition: 'color 0.3s ease',
  '&:hover': {
    color: theme.palette.primary.main,
    textDecoration: 'underline',
  },
}));

const SocialButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.text.secondary,
  transition: 'all 0.3s ease',
  '&:hover': {
    color: theme.palette.primary.main,
    transform: 'translateY(-2px)',
  },
}));

const BrandedFooter = ({
  showSocial = true,
  showLinks = true,
  showStats = true,
  companyName = "StickForStats",
  companyTagline = "Statistical Analysis Made Simple",
  ...props
}) => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { label: 'Features', href: '/features' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Documentation', href: '/docs' },
      { label: 'API', href: '/api' },
    ],
    company: [
      { label: 'About', href: '/about' },
      { label: 'Blog', href: '/blog' },
      { label: 'Careers', href: '/careers' },
      { label: 'Contact', href: '/contact' },
    ],
    support: [
      { label: 'Help Center', href: '/help' },
      { label: 'Community', href: '/community' },
      { label: 'Status', href: '/status' },
      { label: 'Terms', href: '/terms' },
    ],
  };

  const socialLinks = [
    { icon: <GitHubIcon />, href: 'https://github.com', label: 'GitHub' },
    { icon: <LinkedInIcon />, href: 'https://linkedin.com', label: 'LinkedIn' },
    { icon: <TwitterIcon />, href: 'https://twitter.com', label: 'Twitter' },
    { icon: <EmailIcon />, href: 'mailto:contact@stickforstats.com', label: 'Email' },
  ];

  return (
    <FooterContainer component="footer" {...props}>
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* Brand Section */}
          <Grid item xs={12} md={4}>
            <Box mb={3}>
              <BrandedLogo 
                variant="footer" 
                size="large" 
                showTagline 
                onClick={() => window.location.href = '/'}
              />
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ mt: 2, maxWidth: 300 }}
              >
                {companyTagline}. Empowering scientists and researchers with 
                advanced statistical tools and insights.
              </Typography>
            </Box>
            
            {showSocial && (
              <Stack direction="row" spacing={1}>
                {socialLinks.map((social) => (
                  <SocialButton
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    size="small"
                  >
                    {social.icon}
                  </SocialButton>
                ))}
              </Stack>
            )}
          </Grid>

          {/* Links Sections */}
          {showLinks && (
            <>
              <Grid item xs={6} sm={4} md={2}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Product
                </Typography>
                <Stack spacing={1}>
                  {footerLinks.product.map((link) => (
                    <FooterLink key={link.label} href={link.href}>
                      {link.label}
                    </FooterLink>
                  ))}
                </Stack>
              </Grid>

              <Grid item xs={6} sm={4} md={2}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Company
                </Typography>
                <Stack spacing={1}>
                  {footerLinks.company.map((link) => (
                    <FooterLink key={link.label} href={link.href}>
                      {link.label}
                    </FooterLink>
                  ))}
                </Stack>
              </Grid>

              <Grid item xs={6} sm={4} md={2}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Support
                </Typography>
                <Stack spacing={1}>
                  {footerLinks.support.map((link) => (
                    <FooterLink key={link.label} href={link.href}>
                      {link.label}
                    </FooterLink>
                  ))}
                </Stack>
              </Grid>
            </>
          )}

          {/* Stats Section */}
          {showStats && (
            <Grid item xs={12} sm={12} md={2}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Project Status
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  Pre-Alpha Version
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  In Development
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Open Source
                </Typography>
              </Stack>
            </Grid>
          )}
        </Grid>

        <Divider sx={{ my: 4 }} />

        {/* Copyright Section */}
        <Box 
          display="flex" 
          justifyContent="space-between" 
          alignItems="center"
          flexWrap="wrap"
          gap={2}
        >
          <Typography variant="body2" color="text.secondary">
            © {currentYear} {companyName}. All rights reserved.
          </Typography>
          
          <Stack direction="row" spacing={3}>
            <FooterLink href="/privacy">
              Privacy Policy
            </FooterLink>
            <FooterLink href="/terms">
              Terms of Service
            </FooterLink>
            <FooterLink href="/cookies">
              Cookie Policy
            </FooterLink>
          </Stack>
        </Box>
      </Container>
    </FooterContainer>
  );
};

export default BrandedFooter;