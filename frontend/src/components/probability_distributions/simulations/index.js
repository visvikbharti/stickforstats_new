// Simulation components index file

// Enhanced D3.js simulation components
import EmailArrivalsD3 from './EmailArrivalsD3';
import QualityControlD3 from './QualityControlD3';
import ClinicalTrialD3 from './ClinicalTrialD3';
import NetworkTrafficD3 from './NetworkTrafficD3';
import ManufacturingDefectsD3 from './ManufacturingDefectsD3';

// Export individual components
export {
  EmailArrivalsD3,
  QualityControlD3,
  ClinicalTrialD3,
  NetworkTrafficD3,
  ManufacturingDefectsD3
};

/**
 * Get simulation component by name
 * @param {string} name - Simulation component name
 * @returns {React.Component} Simulation component
 */
export const getSimulationComponent = (name) => {
  switch (name) {
    case 'EmailArrivals':
      return EmailArrivalsD3;
    case 'QualityControl':
      return QualityControlD3;
    case 'ClinicalTrial':
      return ClinicalTrialD3;
    case 'NetworkTraffic':
      return NetworkTrafficD3;
    case 'ManufacturingDefects':
      return ManufacturingDefectsD3;
    default:
      return null;
  }
};

// Default export
export default {
  EmailArrivalsD3,
  QualityControlD3,
  ClinicalTrialD3,
  NetworkTrafficD3,
  ManufacturingDefectsD3,
  getSimulationComponent
};