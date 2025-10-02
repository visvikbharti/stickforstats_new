import React from 'react';
import { useMediaQuery, useTheme, Grid, Box } from '@mui/material';

/**
 * Custom hook to check if current viewport is mobile size
 * @returns {boolean} True if viewport is mobile size
 */
export const useIsMobile = () => {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down('sm'));
};

/**
 * Custom hook to check if current viewport is tablet size
 * @returns {boolean} True if viewport is tablet size
 */
export const useIsTablet = () => {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.between('sm', 'md'));
};

/**
 * Custom hook to check if current viewport is desktop size
 * @returns {boolean} True if viewport is desktop size
 */
export const useIsDesktop = () => {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.up('md'));
};

/**
 * Component that renders different content based on viewport size
 */
export const ResponsiveView = ({ 
  mobileContent, 
  tabletContent, 
  desktopContent 
}) => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  
  if (isMobile) {
    return mobileContent;
  } else if (isTablet) {
    return tabletContent;
  } else {
    return desktopContent;
  }
};

/**
 * Component that only renders on mobile devices
 */
export const MobileOnly = ({ children }) => {
  const isMobile = useIsMobile();
  return isMobile ? children : null;
};

/**
 * Component that only renders on tablet devices
 */
export const TabletOnly = ({ children }) => {
  const isTablet = useIsTablet();
  return isTablet ? children : null;
};

/**
 * Component that only renders on desktop devices
 */
export const DesktopOnly = ({ children }) => {
  const isDesktop = useIsDesktop();
  return isDesktop ? children : null;
};

/**
 * Component that renders on everything except mobile devices
 */
export const NotMobile = ({ children }) => {
  const isMobile = useIsMobile();
  return !isMobile ? children : null;
};

/**
 * Responsive grid that changes column count based on viewport size
 */
export const ResponsiveGrid = ({
  children,
  mobileColumns = 1,
  tabletColumns = 2,
  desktopColumns = 3,
  spacing = 2,
  ...props
}) => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  
  let columns;
  if (isMobile) {
    columns = mobileColumns;
  } else if (isTablet) {
    columns = tabletColumns;
  } else {
    columns = desktopColumns;
  }
  
  return (
    <Grid container spacing={spacing} {...props}>
      {React.Children.map(children, (child) => (
        <Grid item xs={12/columns}>
          {child}
        </Grid>
      ))}
    </Grid>
  );
};

export default {
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  ResponsiveView,
  MobileOnly,
  TabletOnly,
  DesktopOnly,
  NotMobile,
  ResponsiveGrid
};