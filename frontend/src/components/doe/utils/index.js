// Responsive Utilities
import ResponsiveDoePage from './ResponsiveDoePage';
import {
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  ResponsiveView,
  MobileOnly,
  TabletOnly,
  DesktopOnly,
  NotMobile,
  ResponsiveGrid
} from './ResponsiveUtils';

// DOE Calculation Utilities
export {
  // Factorial Design Generation
  generateFullFactorial,
  generateCentralComposite,

  // Effect Estimation
  calculateMainEffect,
  calculateInteractionEffect,
  calculateAllEffects,

  // ANOVA
  calculateSST,
  calculateSSFactor,
  calculateSSInteraction,
  performANOVA,

  // Response Surface Methodology
  fitSecondOrderModel,
  predictResponse,
  findStationaryPoint,

  // Coding/Decoding
  codeValue,
  decodeValue,

  // Desirability Functions
  targetDesirability,
  maximizeDesirability,
  minimizeDesirability,
  overallDesirability
} from './designCalculations';

// Responsive Utilities Exports
export {
  ResponsiveDoePage,
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

export default {
  ResponsiveDoePage,
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