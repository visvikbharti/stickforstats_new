import React from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  Button,
  Container,
  IconButton,
  Menu,
  MenuItem,
  Chip
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useAuth } from '../context/AuthContext';
import DarkModeToggle from './common/DarkModeToggle';

const SimpleNavigation = () => {
  const location = useLocation();
  const { user, isAuthenticated, logout, isDemoMode } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState(null);

  const menuItems = [
    { name: 'Home', path: '/' },
    { name: 'Learning Hub 🎓', path: '/learn' },
    { name: 'Statistical Analysis', path: '/statistical-analysis' },
    { name: 'Confidence Intervals', path: '/confidence-intervals' },
    { name: 'PCA Analysis', path: '/pca-analysis' },
    { name: 'DOE Analysis', path: '/doe-analysis' },
    { name: 'SQC Analysis', path: '/sqc-analysis' },
    { name: 'Probability Distributions', path: '/probability-distributions' }
  ];

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <AppBar position="static">
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          <Typography
            variant="h6"
            noWrap
            component={RouterLink}
            to="/"
            sx={{
              mr: 2,
              fontFamily: 'monospace',
              fontWeight: 700,
              letterSpacing: '.1rem',
              color: 'inherit',
              textDecoration: 'none',
              flexGrow: { xs: 1, md: 0 }
            }}
          >
            StickForStats
          </Typography>

          {/* Desktop menu */}
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
            {menuItems.map((item) => (
              <Button
                key={item.name}
                component={RouterLink}
                to={item.path}
                sx={{ 
                  my: 2, 
                  color: 'white', 
                  display: 'block',
                  backgroundColor: location.pathname === item.path ? 'rgba(255, 255, 255, 0.1)' : 'transparent'
                }}
              >
                {item.name}
              </Button>
            ))}
          </Box>

          {/* Mobile menu */}
          <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              size="large"
              aria-label="menu"
              onClick={handleMenu}
              color="inherit"
            >
              <MenuIcon />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              {menuItems.map((item) => (
                <MenuItem 
                  key={item.name} 
                  onClick={handleClose}
                  component={RouterLink}
                  to={item.path}
                >
                  {item.name}
                </MenuItem>
              ))}
            </Menu>
          </Box>

          {/* Dark Mode Toggle */}
          <DarkModeToggle />

          {/* User section */}
          <Box sx={{ flexGrow: 0, ml: 2 }}>
            {isDemoMode ? (
              <Chip 
                label="Demo Mode" 
                color="secondary" 
                size="small"
                sx={{ color: 'white' }}
              />
            ) : isAuthenticated ? (
              <Button color="inherit" onClick={logout}>
                Logout
              </Button>
            ) : (
              <Button color="inherit" component={RouterLink} to="/login">
                Login
              </Button>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default SimpleNavigation;