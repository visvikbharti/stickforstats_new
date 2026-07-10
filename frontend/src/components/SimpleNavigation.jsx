import React, { useState, useRef } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
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
  Chip,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Collapse,
  ListItemIcon,
  useTheme,
  alpha
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import HomeIcon from '@mui/icons-material/Home';
import BarChartIcon from '@mui/icons-material/BarChart';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import StackedBarChartIcon from '@mui/icons-material/StackedBarChart';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import ScienceIcon from '@mui/icons-material/Science';
import FunctionsIcon from '@mui/icons-material/Functions';
import BuildIcon from '@mui/icons-material/Build';
import SchoolIcon from '@mui/icons-material/School';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import PsychologyIcon from '@mui/icons-material/Psychology';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import TuneIcon from '@mui/icons-material/Tune';
import TimelineIcon from '@mui/icons-material/Timeline';
import ScatterPlotIcon from '@mui/icons-material/ScatterPlot';
import BiotechIcon from '@mui/icons-material/Biotech';
import GrainIcon from '@mui/icons-material/Grain';
import BoltIcon from '@mui/icons-material/Bolt';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import ArticleIcon from '@mui/icons-material/Article';
import BrushIcon from '@mui/icons-material/Brush';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import CasinoIcon from '@mui/icons-material/Casino';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import DescriptionIcon from '@mui/icons-material/Description';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import StorefrontIcon from '@mui/icons-material/Storefront';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import ApiIcon from '@mui/icons-material/Api';
import SecurityIcon from '@mui/icons-material/Security';
import RateReviewIcon from '@mui/icons-material/RateReview';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { useAuth } from '../context/AuthContext';
import DarkModeToggle from './common/DarkModeToggle';
import ExpertModeToggle from './common/ExpertModeToggle';
import LanguageSelector from './common/LanguageSelector';

// Navigation structure with dropdown categories
const NAV_CATEGORIES = [
  {
    label: 'Analysis',
    icon: <BarChartIcon fontSize="small" />,
    items: [
      { name: 'Statistical Analysis', path: '/statistical-analysis-tools', icon: <QueryStatsIcon fontSize="small" /> },
      { name: 'Enhanced Analysis', path: '/enhanced-analysis', icon: <BarChartIcon fontSize="small" /> },
      { name: 'Hypothesis Testing', path: '/modules/hypothesis-testing', icon: <ScienceIcon fontSize="small" /> },
      { name: 'T-Test', path: '/modules/t-test', icon: <CompareArrowsIcon fontSize="small" /> },
      { name: 'ANOVA', path: '/modules/anova', icon: <StackedBarChartIcon fontSize="small" /> },
      { name: 'Correlation & Regression', path: '/modules/correlation-regression', icon: <ShowChartIcon fontSize="small" /> },
      { name: 'Non-Parametric Tests', path: '/modules/nonparametric-real', icon: <FunctionsIcon fontSize="small" /> },
      { name: 'Meta-Analysis', path: '/meta-analysis', icon: <AccountTreeIcon fontSize="small" /> },
      { name: 'Survival Analysis', path: '/survival-analysis', icon: <TimelineIcon fontSize="small" /> },
      { name: 'Factor Analysis', path: '/factor-analysis', icon: <ScatterPlotIcon fontSize="small" /> },
      { name: 'PCA Analysis', path: '/pca-analysis', icon: <BiotechIcon fontSize="small" /> },
      { name: 'Genomics Analysis', path: '/genomics-analysis', icon: <GrainIcon fontSize="small" /> },
    ],
  },
  {
    label: 'Advanced Methods',
    icon: <ScienceIcon fontSize="small" />,
    items: [
      { name: 'Power Analysis', path: '/modules/power-analysis-real', icon: <BoltIcon fontSize="small" /> },
      { name: 'Mixed Models (Preview)', path: '/modules/mixed-models', icon: <PsychologyIcon fontSize="small" /> },
      { name: 'Causal Inference (Preview)', path: '/modules/causal-inference', icon: <AccountTreeIcon fontSize="small" /> },
      { name: 'Multiple Testing', path: '/modules/multiplicity', icon: <FactCheckIcon fontSize="small" /> },
      { name: 'DOE Analysis', path: '/doe-analysis', icon: <PrecisionManufacturingIcon fontSize="small" /> },
      { name: 'SQC Analysis', path: '/sqc-analysis', icon: <TuneIcon fontSize="small" /> },
    ],
  },
  {
    label: 'Tools',
    icon: <BuildIcon fontSize="small" />,
    items: [
      { name: 'Publication Plots', path: '/publication-plots', icon: <BrushIcon fontSize="small" /> },
      { name: 'Paper Parser', path: '/paper-parser', icon: <ArticleIcon fontSize="small" /> },
      { name: 'Confidence Intervals', path: '/confidence-intervals', icon: <ConfirmationNumberIcon fontSize="small" /> },
      { name: 'Probability Distributions', path: '/probability-distributions', icon: <CasinoIcon fontSize="small" /> },
    ],
  },
  {
    label: 'Platform',
    icon: <SmartToyIcon fontSize="small" />,
    items: [
      { name: 'Smart Analysis', path: '/smart-analysis', icon: <AutoFixHighIcon fontSize="small" /> },
      {
        name: 'Manuscript Review',
        path: '/manuscript-review',
        icon: <DescriptionIcon fontSize="small" />,
        description: 'Check reported stats for consistency — no data needed',
      },
      {
        name: 'Manuscript Verifier',
        path: '/manuscript-verifier',
        icon: <FactCheckIcon fontSize="small" />,
        description: 'Re-run the authors’ tests on their raw data',
      },
      {
        name: 'Reviewer Mode',
        path: '/reviewer',
        icon: <RateReviewIcon fontSize="small" />,
        description: 'Editor triage view of a review',
      },
      { name: 'Journal Analytics', path: '/journal-analytics', icon: <AnalyticsIcon fontSize="small" /> },
      { name: 'API Documentation', path: '/api-docs', icon: <ApiIcon fontSize="small" /> },
    ],
  },
  {
    label: 'More',
    icon: <DashboardIcon fontSize="small" />,
    items: [
      { name: 'Marketplace', path: '/marketplace', icon: <StorefrontIcon fontSize="small" /> },
      { name: 'Certification', path: '/certification', icon: <VerifiedUserIcon fontSize="small" /> },
      { name: 'Privacy Settings', path: '/privacy-settings', icon: <SecurityIcon fontSize="small" /> },
      { name: 'Platform Dashboard', path: '/platform', icon: <DashboardIcon fontSize="small" /> },
    ],
  },
  {
    label: 'Learn',
    icon: <SchoolIcon fontSize="small" />,
    items: [
      { name: 'Learning Hub', path: '/learn', icon: <SchoolIcon fontSize="small" /> },
      { name: 'Why Guardian?', path: '/why-guardian', icon: <SecurityIcon fontSize="small" /> },
    ],
  },
];

// Collect all paths per category for active-route highlighting
const getCategoryPaths = (category) => category.items.map((item) => item.path);

const SimpleNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const { isAuthenticated, logout, isDemoMode } = useAuth();

  // Desktop dropdown anchors - one per category
  const [anchorEls, setAnchorEls] = useState({});
  // Mobile drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Mobile accordion open sections
  const [mobileOpen, setMobileOpen] = useState({});
  // Hover timeout ref for delayed close
  const closeTimeouts = useRef({});

  const isDark = theme.palette.mode === 'dark';

  // --- Desktop dropdown handlers ---
  const handleDropdownOpen = (key, event) => {
    if (closeTimeouts.current[key]) {
      clearTimeout(closeTimeouts.current[key]);
      closeTimeouts.current[key] = null;
    }
    setAnchorEls((prev) => ({ ...prev, [key]: event.currentTarget }));
  };

  const handleDropdownClose = (key) => {
    setAnchorEls((prev) => ({ ...prev, [key]: null }));
  };

  const handleDropdownDelayedClose = (key) => {
    closeTimeouts.current[key] = setTimeout(() => {
      handleDropdownClose(key);
    }, 150);
  };

  const handleDropdownCancelClose = (key) => {
    if (closeTimeouts.current[key]) {
      clearTimeout(closeTimeouts.current[key]);
      closeTimeouts.current[key] = null;
    }
  };

  const handleNavigate = (path, key) => {
    navigate(path);
    handleDropdownClose(key);
  };

  // --- Mobile handlers ---
  const toggleMobileSection = (key) => {
    setMobileOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleMobileNavigate = (path) => {
    navigate(path);
    setDrawerOpen(false);
  };

  // Check if current route is in a category
  const isCategoryActive = (category) => {
    return getCategoryPaths(category).some(
      (p) => location.pathname === p || location.pathname.startsWith(p + '/')
    );
  };

  // Active button styling
  const getButtonSx = (isActive) => ({
    color: 'inherit',
    textTransform: 'none',
    fontWeight: isActive ? 700 : 500,
    fontSize: '0.875rem',
    px: 1.5,
    py: 0.75,
    borderRadius: 1,
    backgroundColor: isActive
      ? alpha(theme.palette.common.white, isDark ? 0.12 : 0.15)
      : 'transparent',
    '&:hover': {
      backgroundColor: alpha(theme.palette.common.white, isDark ? 0.18 : 0.22),
    },
    transition: 'background-color 0.2s ease',
  });

  return (
    <AppBar position="static" elevation={1} component="header">
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ minHeight: { xs: 56, md: 64 } }} component="nav" role="navigation" aria-label="Main navigation">
          {/* Logo */}
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
              flexShrink: 0,
            }}
          >
            StickForStats
          </Typography>

          {/* === Desktop Navigation === */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 0.5 }}>
            {/* Home button */}
            <Button
              component={RouterLink}
              to="/"
              startIcon={<HomeIcon fontSize="small" />}
              sx={getButtonSx(location.pathname === '/')}
              aria-current={location.pathname === '/' ? 'page' : undefined}
            >
              Home
            </Button>

            {/* Category dropdowns */}
            {NAV_CATEGORIES.map((category) => {
              const key = category.label;
              const isActive = isCategoryActive(category);
              const isOpen = Boolean(anchorEls[key]);

              return (
                <Box
                  key={key}
                  onMouseEnter={(e) => handleDropdownOpen(key, e)}
                  onMouseLeave={() => handleDropdownDelayedClose(key)}
                  sx={{ display: 'inline-flex' }}
                >
                  <Button
                    onClick={(e) => {
                      if (isOpen) {
                        handleDropdownClose(key);
                      } else {
                        handleDropdownOpen(key, e);
                      }
                    }}
                    endIcon={<ArrowDropDownIcon sx={{
                      transition: 'transform 0.2s',
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    }} />}
                    sx={getButtonSx(isActive)}
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                  >
                    {category.label}
                  </Button>
                  <Menu
                    anchorEl={anchorEls[key]}
                    open={isOpen}
                    onClose={() => handleDropdownClose(key)}
                    MenuListProps={{
                      onMouseEnter: () => handleDropdownCancelClose(key),
                      onMouseLeave: () => handleDropdownDelayedClose(key),
                    }}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                    slotProps={{
                      paper: {
                        elevation: 4,
                        sx: {
                          mt: 0.5,
                          minWidth: 220,
                          maxWidth: 300,
                          borderRadius: 1.5,
                          overflow: 'visible',
                          '&::before': {
                            content: '""',
                            display: 'block',
                            position: 'absolute',
                            top: 0,
                            left: 20,
                            width: 10,
                            height: 10,
                            bgcolor: 'background.paper',
                            transform: 'translateY(-50%) rotate(45deg)',
                            zIndex: 0,
                          },
                        },
                      },
                    }}
                  >
                    {category.items.map((item) => {
                      const itemActive = location.pathname === item.path;
                      return (
                        <MenuItem
                          key={item.path}
                          onClick={() => handleNavigate(item.path, key)}
                          selected={itemActive}
                          aria-current={itemActive ? 'page' : undefined}
                          sx={{
                            py: 1,
                            px: 2,
                            gap: 1.5,
                            borderRadius: 0.5,
                            mx: 0.5,
                            my: 0.25,
                            '&.Mui-selected': {
                              backgroundColor: alpha(theme.palette.primary.main, 0.12),
                              '&:hover': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.18),
                              },
                            },
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 28, color: itemActive ? 'primary.main' : 'text.secondary' }}>
                            {item.icon}
                          </ListItemIcon>
                          <ListItemText
                            primary={item.name}
                            secondary={item.description}
                            primaryTypographyProps={{
                              variant: 'body2',
                              fontWeight: itemActive ? 600 : 400,
                            }}
                            secondaryTypographyProps={{
                              variant: 'caption',
                              sx: { whiteSpace: 'normal', lineHeight: 1.3, mt: 0.25 },
                            }}
                          />
                        </MenuItem>
                      );
                    })}
                  </Menu>
                </Box>
              );
            })}
          </Box>

          {/* Spacer to push right section to edge */}
          <Box sx={{ flexGrow: 1 }} />

          {/* === Right section (always visible) === */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, md: 0.5 }, flexShrink: 0 }}>
            {/* Language Selector */}
            <LanguageSelector variant="icon" size="small" />

            {/* Dark Mode Toggle */}
            <DarkModeToggle />

            {/* Expert Mode Toggle */}
            <Box sx={{ display: { xs: 'none', sm: 'flex' } }}>
              <ExpertModeToggle variant="chip" />
            </Box>

            {/* User section */}
            <Box sx={{ ml: 0.5 }}>
              {isDemoMode ? (
                <Chip
                  label="Demo"
                  color="secondary"
                  size="small"
                  sx={{ color: 'white' }}
                />
              ) : isAuthenticated ? (
                <Button color="inherit" onClick={logout} size="small">
                  Logout
                </Button>
              ) : (
                <Button color="inherit" component={RouterLink} to="/login" size="small">
                  Login
                </Button>
              )}
            </Box>

            {/* Mobile hamburger */}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, ml: 0.5 }}>
              <IconButton
                size="large"
                aria-label="open navigation menu"
                onClick={() => setDrawerOpen(true)}
                color="inherit"
              >
                <MenuIcon />
              </IconButton>
            </Box>
          </Box>
        </Toolbar>
      </Container>

      {/* === Mobile Drawer === */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: 280,
            bgcolor: 'background.paper',
          },
        }}
      >
        {/* Drawer header */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}>
          <Typography variant="h6" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
            StickForStats
          </Typography>
          <IconButton onClick={() => setDrawerOpen(false)} size="small" aria-label="Close navigation menu">
            <CloseIcon />
          </IconButton>
        </Box>

        <List component="nav" sx={{ px: 1, py: 1 }}>
          {/* Home */}
          <ListItemButton
            onClick={() => handleMobileNavigate('/')}
            selected={location.pathname === '/'}
            aria-current={location.pathname === '/' ? 'page' : undefined}
            sx={{ borderRadius: 1, mb: 0.5 }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <HomeIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Home" primaryTypographyProps={{ fontWeight: location.pathname === '/' ? 600 : 400 }} />
          </ListItemButton>

          {/* Category sections */}
          {NAV_CATEGORIES.map((category) => {
            const key = category.label;
            const isOpen = mobileOpen[key] || false;
            const isActive = isCategoryActive(category);

            return (
              <React.Fragment key={key}>
                <ListItemButton
                  onClick={() => toggleMobileSection(key)}
                  aria-expanded={isOpen}
                  sx={{
                    borderRadius: 1,
                    mb: 0.25,
                    backgroundColor: isActive ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36, color: isActive ? 'primary.main' : 'text.secondary' }}>
                    {category.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={category.label}
                    primaryTypographyProps={{ fontWeight: isActive ? 600 : 500 }}
                  />
                  {isOpen ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
                <Collapse in={isOpen} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {category.items.map((item) => {
                      const itemActive = location.pathname === item.path;
                      return (
                        <ListItemButton
                          key={item.path}
                          onClick={() => handleMobileNavigate(item.path)}
                          selected={itemActive}
                          aria-current={itemActive ? 'page' : undefined}
                          sx={{ pl: 4, borderRadius: 1, mx: 1, mb: 0.25 }}
                        >
                          <ListItemIcon sx={{ minWidth: 28, color: itemActive ? 'primary.main' : 'text.secondary' }}>
                            {item.icon}
                          </ListItemIcon>
                          <ListItemText
                            primary={item.name}
                            secondary={item.description}
                            primaryTypographyProps={{
                              variant: 'body2',
                              fontWeight: itemActive ? 600 : 400,
                            }}
                            secondaryTypographyProps={{
                              variant: 'caption',
                              sx: { whiteSpace: 'normal', lineHeight: 1.3, mt: 0.25 },
                            }}
                          />
                        </ListItemButton>
                      );
                    })}
                  </List>
                </Collapse>
              </React.Fragment>
            );
          })}
        </List>

        {/* Mobile Expert Mode (shown at bottom of drawer) */}
        <Box sx={{
          mt: 'auto',
          px: 2,
          py: 1.5,
          borderTop: `1px solid ${theme.palette.divider}`,
          display: 'flex',
          justifyContent: 'center',
        }}>
          <ExpertModeToggle variant="chip" />
        </Box>
      </Drawer>
    </AppBar>
  );
};

export default SimpleNavigation;
