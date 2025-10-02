import React from 'react';
import {
  Box,
  Tabs,
  Tab,
  Paper,
  Container,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  AppBar,
  Toolbar,
  Typography,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';

/**
 * ResponsiveDoePage - A responsive layout container for the DOE module pages
 * 
 * This component provides a responsive layout that adapts to different screen sizes:
 * - Desktop: Side tabs with wide content area
 * - Tablet: Top tabs with full-width content
 * - Mobile: Drawer navigation with full-width content
 * 
 * @param {Object} props - Component props
 * @param {Array} props.tabs - Array of tab objects with label and icon
 * @param {number} props.activeTab - Index of the currently active tab
 * @param {Function} props.onTabChange - Function to call when tab is changed
 * @param {string} props.title - Page title
 * @param {React.ReactNode} props.children - Page content
 */
function ResponsiveDoePage({ tabs, activeTab, onTabChange, title, children }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  
  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };
  
  const handleDrawerTabClick = (index) => {
    onTabChange(null, index);
    setDrawerOpen(false);
  };
  
  // Mobile drawer navigation
  const mobileDrawer = (
    <>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={toggleDrawer}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            {title}
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer}
      >
        <Box sx={{ width: 250 }} role="presentation">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              Navigation
            </Typography>
            <IconButton onClick={toggleDrawer}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Divider />
          <List>
            {tabs.map((tab, index) => (
              <ListItem 
                button 
                key={tab.label} 
                onClick={() => handleDrawerTabClick(index)}
                sx={{ bgcolor: activeTab === index ? 'rgba(0, 0, 0, 0.08)' : 'transparent' }}
              >
                <ListItemIcon>
                  {tab.icon}
                </ListItemIcon>
                <ListItemText primary={tab.label} />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
      
      <Container maxWidth="lg" sx={{ mt: 2 }}>
        {children}
      </Container>
    </>
  );
  
  // Tablet layout with top tabs
  const tabletLayout = (
    <Box sx={{ width: '100%' }}>
      <AppBar position="static" color="default">
        <Typography variant="h6" component="div" sx={{ p: 2 }}>
          {title}
        </Typography>
        <Tabs
          value={activeTab}
          onChange={onTabChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="DOE navigation tabs"
        >
          {tabs.map((tab) => (
            <Tab key={tab.label} label={tab.label} icon={tab.icon} iconPosition="start" />
          ))}
        </Tabs>
      </AppBar>
      
      <Container maxWidth="lg" sx={{ mt: 3 }}>
        {children}
      </Container>
    </Box>
  );
  
  // Desktop layout with side tabs
  const desktopLayout = (
    <Box sx={{ display: 'flex', width: '100%', height: '100%' }}>
      <Paper elevation={0} sx={{ width: 200, height: '100%', borderRight: 1, borderColor: 'divider' }}>
        <Typography variant="h6" component="div" sx={{ p: 2, textAlign: 'center' }}>
          {title}
        </Typography>
        <Tabs
          orientation="vertical"
          variant="scrollable"
          value={activeTab}
          onChange={onTabChange}
          aria-label="DOE navigation tabs"
          sx={{ borderRight: 1, borderColor: 'divider' }}
        >
          {tabs.map((tab) => (
            <Tab 
              key={tab.label} 
              label={tab.label} 
              icon={tab.icon} 
              iconPosition="start"
              sx={{ 
                minHeight: 64, 
                alignItems: 'flex-start', 
                textAlign: 'left',
                pl: 3
              }} 
            />
          ))}
        </Tabs>
      </Paper>
      
      <Box sx={{ flexGrow: 1, p: 3, overflowY: 'auto' }}>
        {children}
      </Box>
    </Box>
  );
  
  // Render appropriate layout based on screen size
  if (isMobile) {
    return mobileDrawer;
  } else if (isTablet) {
    return tabletLayout;
  } else {
    return desktopLayout;
  }
}

export default ResponsiveDoePage;