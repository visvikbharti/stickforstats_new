import React, { useState, useCallback, useMemo } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  Container,
  Avatar,
  Button,
  Tooltip,
  MenuItem,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  useMediaQuery,
  Dialog,
  Chip
} from '@mui/material';
import PrefetchLink from './navigation/PrefetchLink';
import ButtonLink from './navigation/ButtonLink';
import { useAuth } from '../context/AuthContext';
import KeyboardShortcutHint from './common/KeyboardShortcutHint';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import BarChartIcon from '@mui/icons-material/BarChart';
import FunctionsIcon from '@mui/icons-material/Functions';
import TimelineIcon from '@mui/icons-material/Timeline';
import SchoolIcon from '@mui/icons-material/School';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SettingsIcon from '@mui/icons-material/Settings';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import CalculateIcon from '@mui/icons-material/Calculate';
import ScienceIcon from '@mui/icons-material/Science';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import CloseIcon from '@mui/icons-material/Close';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import DescriptionIcon from '@mui/icons-material/Description';
import BugReportIcon from '@mui/icons-material/BugReport';
import SpeedIcon from '@mui/icons-material/Speed';
import MonitorIcon from '@mui/icons-material/Monitor';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import StorageIcon from '@mui/icons-material/Storage';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import InsightsIcon from '@mui/icons-material/Insights';
import SummarizeIcon from '@mui/icons-material/Summarize';
import SecurityIcon from '@mui/icons-material/Security';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ModelTrainingIcon from '@mui/icons-material/Psychology';
import PsychologyIcon from '@mui/icons-material/Psychology';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import PeopleIcon from '@mui/icons-material/People';
import BgColorsOutlined from '@mui/icons-material/PaletteOutlined';

// Logo import
import logo from '../assets/logo.png';
import StorefrontIcon from '@mui/icons-material/Storefront';

// Import branded components
import BrandedLogo from './common/BrandedLogo';
import { useBranding } from '../context/BrandingContext';

// Import the RAG components
import { QueryInterface } from './rag';

// Import ThemeToggle
import ThemeToggle from './common/ThemeToggle';

// Import LanguageSelector
import LanguageSelector from './common/LanguageSelector';

// Import Search context
import { useSearch } from '../context/SearchContext';

// Import translation hook
import { useTranslation } from '../hooks/useTranslation';

// Memoized constant arrays - ensure they are always arrays
const pages = Object.freeze([
  { name: 'Home', path: '/' },
  { name: 'Statistics', path: '/statistics' },
  { name: 'Advanced Statistics', path: '/advanced-statistics' },
  { name: 'Visualization Studio', path: '/visualization-studio' },
  { name: 'Probability Distributions', path: '/probability-distributions' },
  { name: 'Confidence Intervals', path: '/confidence-intervals' },
  { name: 'DOE Analysis', path: '/doe-analysis' },
  { name: 'PCA Analysis', path: '/pca-analysis' },
  { name: 'SQC Analysis', path: '/sqc-analysis' },
  { name: 'Workflows', path: '/workflows' },
  { name: 'Reports', path: '/reports' },
  { name: 'Reporting Studio', path: '/reporting-studio' },
  { name: 'ML Studio', path: '/ml-studio' },
  { name: 'Collaboration', path: '/collaboration' },
  { name: 'Marketplace', path: '/marketplace' }
]);

const testPages = [
  { name: 'Test Calculator', path: '/test/calculator', iconName: 'calculate' },
  { name: 'Performance Testing', path: '/test/performance', iconName: 'speed' }
];

const monitoringPages = [
  { name: 'WebSocket Monitor', path: '/monitoring/websocket', iconName: 'network' },
  { name: 'RAG Performance', path: '/monitoring/rag-performance', iconName: 'storage' }
];

const adminPages = [
  { name: 'Security Dashboard', path: '/security', iconName: 'security' },
  { name: 'Branding Settings', path: '/admin/branding', iconName: 'palette' },
  { name: 'Admin Panel', path: '/admin', iconName: 'admin' }
];

const userSettings = ['Profile', 'Account', 'Dashboard', 'Logout'];

// Helper function to get icon from icon name
const getIconFromName = (iconName) => {
  switch (iconName) {
    case 'calculate':
      return <CalculateIcon />;
    case 'speed':
      return <SpeedIcon />;
    case 'network':
      return <NetworkCheckIcon />;
    case 'storage':
      return <StorageIcon />;
    case 'security':
      return <SecurityIcon />;
    case 'palette':
      return <BgColorsOutlined />;
    case 'admin':
      return <AdminPanelSettingsIcon />;
    default:
      return <BarChartIcon />;
  }
};

// Helper function to get icon for page - moved outside component
const getIconForPage = (pageName) => {
  switch (pageName) {
    case 'Home':
      return <BarChartIcon />;
    case 'Statistics':
      return <FunctionsIcon />;
    case 'Advanced Statistics':
      return <QueryStatsIcon />;
    case 'Visualization Studio':
      return <InsightsIcon />;
    case 'Probability Distributions':
      return <TimelineIcon />;
    case 'Confidence Intervals':
      return <CalculateIcon />;
    case 'DOE Analysis':
      return <ScienceIcon />;
    case 'PCA Analysis':
      return <AssessmentIcon />;
    case 'SQC Analysis':
      return <SchoolIcon />;
    case 'Workflows':
      return <AccountTreeIcon />;
    case 'Reports':
      return <DescriptionIcon />;
    case 'Reporting Studio':
      return <SummarizeIcon />;
    case 'ML Studio':
      return <PsychologyIcon />;
    case 'Collaboration':
      return <GroupWorkIcon />;
    case 'Marketplace':
      return <StorefrontIcon />;
    default:
      return <BarChartIcon />;
  }
};

// Memoized menu item components
const UserMenuItem = React.memo(({ setting, onClick }) => (
  <MenuItem onClick={onClick}>
    <Typography textAlign="center">{setting}</Typography>
  </MenuItem>
));

const DevMenuItem = React.memo(({ page, onClick, selected }) => (
  <MenuItem 
    onClick={onClick}
    component={ButtonLink}
    to={page.path}
    prefetchStrategy="eager"
    selected={selected}
  >
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Box sx={{ mr: 1 }}>{getIconFromName(page.iconName)}</Box>
      <Typography textAlign="center">{page.name}</Typography>
    </Box>
  </MenuItem>
));

// Memoized navigation button component
const NavButton = React.memo(({ page, isActive }) => (
  <Button
    component={ButtonLink}
    to={page.path}
    prefetchStrategy="hover"
    sx={{ 
      my: 2, 
      color: 'white', 
      display: 'block',
      backgroundColor: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
      '&:hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
      }
    }}
  >
    {page.name}
  </Button>
));

// Memoized drawer list item component
const DrawerListItem = React.memo(({ page, icon, isActive, prefetchStrategy = "visible", onClick = null, sx = {} }) => (
  <ListItem 
    button 
    component={onClick ? undefined : ButtonLink} 
    to={onClick ? undefined : page.path}
    prefetchStrategy={prefetchStrategy}
    selected={isActive}
    onClick={onClick}
    sx={sx}
  >
    <ListItemIcon>
      {icon}
    </ListItemIcon>
    <ListItemText primary={page.name || page} />
  </ListItem>
));

// Memoized drawer content component
const DrawerContent = React.memo(({ 
  pages = [], 
  testPages = [], 
  monitoringPages = [], 
  adminPages = [], 
  location, 
  toggleDrawer, 
  handleOpenRagDialog, 
  handleOpenSearch, 
  user 
}) => {
  // Ensure arrays are valid
  const safePages = Array.isArray(pages) ? pages : [];
  const safeTestPages = Array.isArray(testPages) ? testPages : [];
  const safeMonitoringPages = Array.isArray(monitoringPages) ? monitoringPages : [];
  const safeAdminPages = Array.isArray(adminPages) ? adminPages : [];

  // Add debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('DrawerContent props:', { 
      pages: pages, 
      pagesIsArray: Array.isArray(pages),
      testPages: testPages,
      testPagesIsArray: Array.isArray(testPages),
      monitoringPages: monitoringPages,
      monitoringPagesIsArray: Array.isArray(monitoringPages),
      adminPages: adminPages,
      adminPagesIsArray: Array.isArray(adminPages)
    });
  }

  const openRagAndCloseDrawer = useCallback(() => {
    toggleDrawer(false)({});
    handleOpenRagDialog();
  }, [toggleDrawer, handleOpenRagDialog]);
  
  const openSearchAndCloseDrawer = useCallback(() => {
    toggleDrawer(false)({});
    handleOpenSearch();
  }, [toggleDrawer, handleOpenSearch]);

  // Add try-catch for the entire render
  try {
    return (
    <Box
      sx={{ width: 250 }}
      role="presentation"
      onClick={toggleDrawer(false)}
      onKeyDown={toggleDrawer(false)}
    >
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <BrandedLogo variant="header" size="medium" />
      </Box>
      <Divider />
      <List>
        {safePages.map((page) => (
          <DrawerListItem 
            key={page.name} 
            page={page} 
            icon={getIconForPage(page.name)} 
            isActive={location.pathname === page.path} 
          />
        ))}
      </List>
      <Divider />
      <List>
        {/* Test Pages */}
        <ListItem>
          <ListItemText 
            primary="Development" 
            primaryTypographyProps={{ 
              variant: 'overline',
              color: 'primary',
              fontWeight: 'bold'
            }} 
          />
        </ListItem>
        {safeTestPages.map((page) => (
          <DrawerListItem 
            key={page.name} 
            page={page} 
            icon={getIconFromName(page.iconName)} 
            isActive={location.pathname === page.path}
            sx={{ pl: 3 }}
          />
        ))}
        <Divider />
        
        {/* Monitoring Pages */}
        <ListItem>
          <ListItemText 
            primary="Monitoring" 
            primaryTypographyProps={{ 
              variant: 'overline',
              color: 'primary',
              fontWeight: 'bold'
            }} 
          />
        </ListItem>
        {safeMonitoringPages.map((page) => (
          <DrawerListItem 
            key={page.name} 
            page={page} 
            icon={getIconFromName(page.iconName)} 
            isActive={location.pathname === page.path}
            sx={{ pl: 3 }}
          />
        ))}
        
        {/* Admin Pages - Only show for admin users */}
        {user?.role === 'admin' && (
          <>
            <Divider />
            <ListItem>
              <ListItemText 
                primary="Administration" 
                primaryTypographyProps={{ 
                  variant: 'overline',
                  color: 'error',
                  fontWeight: 'bold'
                }} 
              />
            </ListItem>
            {safeAdminPages.map((page) => (
              <DrawerListItem 
                key={page.name} 
                page={page} 
                icon={getIconFromName(page.iconName)} 
                isActive={location.pathname === page.path}
                sx={{ pl: 3 }}
              />
            ))}
          </>
        )}
        <Divider />
        
        {/* Search */}
        <DrawerListItem
          page={{ name: "Search" }}
          icon={<SearchIcon />}
          isActive={false}
          onClick={openSearchAndCloseDrawer}
        />
        
        {/* Stats Assistant */}
        <DrawerListItem
          page={{ name: "Stats Assistant" }}
          icon={<QuestionAnswerIcon />}
          isActive={false}
          onClick={openRagAndCloseDrawer}
        />
        <Divider />
        
        {/* Theme Toggle in Drawer */}
        <ListItem sx={{ px: 2, py: 1 }}>
          <ListItemIcon>
            <ThemeToggle showTooltip={false} />
          </ListItemIcon>
          <ListItemText primary="Dark Mode" />
        </ListItem>
        
        <DrawerListItem
          page="Settings"
          icon={<SettingsIcon />}
          isActive={false}
        />
        <DrawerListItem
          page="Profile"
          icon={<AccountCircleIcon />}
          isActive={false}
        />
        <DrawerListItem
          page="Logout"
          icon={<LogoutIcon />}
          isActive={false}
        />
      </List>
    </Box>
  );
  } catch (error) {
    console.error('DrawerContent render error:', error);
    return (
      <Box sx={{ width: 250, p: 2 }}>
        <Typography color="error">Navigation error occurred</Typography>
      </Box>
    );
  }
});

// Main RAG dialog component
const RagDialog = React.memo(({ open, onClose }) => (
  <Dialog
    fullWidth
    maxWidth="md"
    open={open}
    onClose={onClose}
    PaperProps={{
      sx: {
        height: '80vh',
        maxHeight: '800px',
        display: 'flex',
        flexDirection: 'column',
      }
    }}
  >
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
      <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
        <CloseIcon />
      </IconButton>
    </Box>
    <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
      <QueryInterface />
    </Box>
  </Dialog>
));

/**
 * Main navigation component for the application
 */
const Navigation = () => {
  // All hooks must be called at the top level, before any conditional logic
  const { t } = useTranslation('common');
  const [anchorElNav, setAnchorElNav] = useState(null);
  const [anchorElUser, setAnchorElUser] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [ragDialogOpen, setRagDialogOpen] = useState(false);
  const [devMenuOpen, setDevMenuOpen] = useState(null);
  const [monitoringMenuOpen, setMonitoringMenuOpen] = useState(null);
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, isAuthenticated, logout, hasRole } = useAuth();
  const { openSearch } = useSearch();

  // Memoized event handlers
  // We keep setAnchorElNav for potential future use
  
  const handleOpenUserMenu = useCallback((event) => {
    setAnchorElUser(event.currentTarget);
  }, []);

  const handleOpenDevMenu = useCallback((event) => {
    setDevMenuOpen(event.currentTarget);
  }, []);
  
  const handleOpenMonitoringMenu = useCallback((event) => {
    setMonitoringMenuOpen(event.currentTarget);
  }, []);

  // We don't use handleCloseNavMenu in the optimized version but keep it for potential future use

  const handleCloseUserMenu = useCallback(() => {
    setAnchorElUser(null);
  }, []);
  
  const handleUserMenuClick = useCallback((setting) => {
    handleCloseUserMenu();
    
    switch(setting) {
      case 'Logout':
        logout();
        break;
      case 'Profile':
        // Navigate to profile page when implemented
        break;
      case 'Account':
        // Navigate to account settings when implemented
        break;
      case 'Dashboard':
        // Navigate to dashboard when implemented
        break;
      default:
        break;
    }
  }, [handleCloseUserMenu, logout]);

  const handleCloseDevMenu = useCallback(() => {
    setDevMenuOpen(null);
  }, []);
  
  const handleCloseMonitoringMenu = useCallback(() => {
    setMonitoringMenuOpen(null);
  }, []);
  
  const toggleDrawer = useCallback((open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setDrawerOpen(open);
  }, []);

  // RAG Dialog handlers
  const handleOpenRagDialog = useCallback(() => {
    setRagDialogOpen(true);
  }, []);

  const handleCloseRagDialog = useCallback(() => {
    setRagDialogOpen(false);
  }, []);

  // Memoized navigation buttons
  const navigationButtons = useMemo(() => (
    pages && Array.isArray(pages) ? pages.map((page) => (
      <NavButton 
        key={page.name} 
        page={page} 
        isActive={location.pathname === page.path} 
      />
    )) : []
  ), [location.pathname]);

  // Memoized user menu items
  const userMenuItems = useMemo(() => (
    userSettings && Array.isArray(userSettings) ? userSettings.map((setting) => (
      <UserMenuItem key={setting} setting={setting} onClick={() => handleUserMenuClick(setting)} />
    )) : []
  ), [handleUserMenuClick]);

  // Memoized dev menu items
  const devMenuItems = useMemo(() => (
    testPages && Array.isArray(testPages) ? testPages.map((page) => (
      <DevMenuItem 
        key={page.name} 
        page={page} 
        onClick={handleCloseDevMenu}
        selected={location.pathname === page.path}
      />
    )) : []
  ), [location.pathname, handleCloseDevMenu]);
  
  // Memoized monitoring menu items
  const monitoringMenuItems = useMemo(() => (
    monitoringPages && Array.isArray(monitoringPages) ? monitoringPages.map((page) => (
      <DevMenuItem 
        key={page.name} 
        page={page} 
        onClick={handleCloseMonitoringMenu}
        selected={location.pathname === page.path}
      />
    )) : []
  ), [location.pathname, handleCloseMonitoringMenu]);

  // Memoized drawer content
  const memoizedDrawerContent = useMemo(() => (
    <DrawerContent 
      pages={pages} 
      testPages={testPages}
      monitoringPages={monitoringPages}
      adminPages={adminPages}
      location={location} 
      toggleDrawer={toggleDrawer}
      handleOpenRagDialog={handleOpenRagDialog}
      handleOpenSearch={openSearch}
      user={user}
    />
  ), [location, toggleDrawer, handleOpenRagDialog, openSearch, user]);

  // Memoized RAG dialog
  const memoizedRagDialog = useMemo(() => (
    <RagDialog open={ragDialogOpen} onClose={handleCloseRagDialog} />
  ), [ragDialogOpen, handleCloseRagDialog]);

  // Add debugging to help identify the issue
  if (process.env.NODE_ENV === 'development' || process.env.REACT_APP_ENABLE_DEBUG === 'true') {
    console.log('Navigation render debug:', {
      pages: pages,
      pagesType: typeof pages,
      pagesIsArray: Array.isArray(pages),
      navigationButtons: navigationButtons,
      navButtonsType: typeof navigationButtons,
      navButtonsIsArray: Array.isArray(navigationButtons)
    });
  }

  // Wrap the JSX return in try-catch, not the hooks
  try {
    return (
      <>
        <AppBar position="static">
        <Container maxWidth="xl">
          <Toolbar disableGutters>
            {/* Logo for desktop */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, mr: 1 }}>
              <BrandedLogo variant="header" size="small" showText={false} />
            </Box>
            
            <Typography
              variant="h6"
              noWrap
              component={RouterLink}
              to="/"
              sx={{
                mr: 2,
                display: { xs: 'none', md: 'flex' },
                fontFamily: 'monospace',
                fontWeight: 700,
                letterSpacing: '.1rem',
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              {'StickForStats'}
            </Typography>

            {/* Mobile hamburger menu */}
            <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={toggleDrawer(true)}
                color="inherit"
              >
                <MenuIcon />
              </IconButton>
            </Box>
            
            {/* Logo for mobile */}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, mx: 'auto' }}>
              <BrandedLogo variant="header" size="small" showText={false} />
            </Box>

            {/* Desktop navigation */}
            <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}>
              {navigationButtons || null}
              <Box sx={{ ml: 'auto', mr: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <KeyboardShortcutHint shortcut="cmd+k" description="Search" variant="subtle" />
                <Tooltip title="Search (Cmd+K or Ctrl+K)">
                  <IconButton
                    color="inherit"
                    onClick={openSearch}
                    sx={{
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.2)',
                      }
                    }}
                  >
                    <SearchIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {/* Development Menu - Only for authenticated users in dev mode */}
            {isAuthenticated && process.env.NODE_ENV === 'development' && (
              <Box sx={{ mr: 1 }}>
                <Tooltip title="Development Tools">
                  <IconButton
                    onClick={handleOpenDevMenu}
                    color="inherit"
                    sx={{
                      bgcolor: location.pathname.startsWith('/test') ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.2)',
                      }
                    }}
                  >
                    <BugReportIcon />
                  </IconButton>
                </Tooltip>
                <Menu
                  sx={{ mt: '45px' }}
                  id="dev-menu"
                  anchorEl={devMenuOpen}
                  anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  keepMounted
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  open={Boolean(devMenuOpen)}
                  onClose={handleCloseDevMenu}
                >
                  {devMenuItems}
                </Menu>
              </Box>
            )}
            
            {/* Monitoring Menu - Only for admin users */}
            {isAuthenticated && hasRole('admin') && (
              <Box sx={{ mr: 1 }}>
                <Tooltip title="System Monitoring">
                  <IconButton
                    onClick={handleOpenMonitoringMenu}
                    color="inherit"
                    sx={{
                      bgcolor: location.pathname.startsWith('/monitoring') ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.2)',
                      }
                    }}
                  >
                    <MonitorIcon />
                  </IconButton>
                </Tooltip>
                <Menu
                  sx={{ mt: '45px' }}
                  id="monitoring-menu"
                  anchorEl={monitoringMenuOpen}
                  anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  keepMounted
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  open={Boolean(monitoringMenuOpen)}
                  onClose={handleCloseMonitoringMenu}
                >
                  {monitoringMenuItems}
                </Menu>
              </Box>
            )}

            {/* Theme Toggle Button */}
            <Box sx={{ mr: 1 }}>
              <ThemeToggle />
            </Box>

            {/* RAG Assistant Button */}
            <Box sx={{ mr: 2 }}>
              <Tooltip title="Stats Assistant">
                <IconButton
                  color="inherit"
                  onClick={handleOpenRagDialog}
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                    }
                  }}
                >
                  <QuestionAnswerIcon />
                </IconButton>
              </Tooltip>
            </Box>

            {/* User menu */}
            <Box sx={{ flexGrow: 0 }}>
              {isAuthenticated ? (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {user && (
                      <Typography variant="body2" sx={{ display: { xs: 'none', md: 'block' } }}>
                        {user.first_name || user.email}
                      </Typography>
                    )}
                    <Tooltip title="Open settings">
                      <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                        <Avatar alt={user?.first_name || 'User'}>
                          {user?.first_name?.[0] || user?.email?.[0] || 'U'}
                        </Avatar>
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Menu
                    sx={{ mt: '45px' }}
                    id="menu-appbar"
                    anchorEl={anchorElUser}
                    anchorOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                    keepMounted
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                    open={Boolean(anchorElUser)}
                    onClose={handleCloseUserMenu}
                  >
                    {userMenuItems}
                  </Menu>
                </>
              ) : (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    color="inherit"
                    component={RouterLink}
                    to="/login"
                    variant="outlined"
                    size="small"
                  >
                    Sign In
                  </Button>
                  <Button
                    color="inherit"
                    component={RouterLink}
                    to="/register"
                    variant="contained"
                    size="small"
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}
                  >
                    Sign Up
                  </Button>
                </Box>
              )}
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
      
      {/* Sidebar drawer for mobile */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
      >
        {memoizedDrawerContent}
      </Drawer>

      {/* RAG Assistant Dialog */}
      {memoizedRagDialog}
    </>
  );
  } catch (error) {
    console.error('Navigation component error:', error);
    // Return a minimal navigation that won't crash
    return (
      <AppBar position="fixed" sx={{ backgroundColor: 'rgba(18, 18, 18, 0.95)' }}>
        <Container maxWidth="xl">
          <Toolbar disableGutters>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              StickForStats
            </Typography>
          </Toolbar>
        </Container>
      </AppBar>
    );
  }
};

export default Navigation;