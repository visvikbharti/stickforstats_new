/**
 * Biophysics Utilities Index
 *
 * Central export point for all biophysics analysis utilities.
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

// Import everything we need for the default export
import {
  levenbergMarquardt,
  MODELS,
  fitMichaelisMenten,
  fitHill,
  fitBinding,
  fit4PL,
  fitThermalDenaturation,
  calculateRSquared,
  calculateAIC,
  calculateBIC,
  estimateMMParams,
  estimateBindingParams,
  estimate4PLParams
} from './nonLinearRegression';

import {
  analyzeMichaelisMenten,
  analyzeHill,
  analyzeInhibition,
  analyzeSubstrateInhibition,
  calculateLineweaverBurk,
  calculateEadieHofstee,
  calculateHanesWoolf,
  calculateHillPlot,
  calculateKiFromIC50,
  validateEnzymeData,
  INHIBITION_TYPES,
  generateMichaelisMentenCurve,
  generateHillCurve
} from './enzymeKineticsUtils';

import {
  analyzeSaturationBinding,
  analyzeDoseResponse,
  analyzeCompetitionBinding,
  analyzeBindingWithHill,
  calculateScatchard,
  calculateEffectLevels,
  classifyAffinity,
  formatKd,
  validateBindingData,
  validateDoseResponseData,
  generateBindingCurve,
  generateDoseResponseCurve,
  AFFINITY_CLASSIFICATION
} from './bindingUtils';

// Named exports - Non-linear regression engine
export {
  levenbergMarquardt,
  MODELS,
  fitMichaelisMenten,
  fitHill,
  fitBinding,
  fit4PL,
  fitThermalDenaturation,
  calculateRSquared,
  calculateAIC,
  calculateBIC,
  estimateMMParams,
  estimateBindingParams,
  estimate4PLParams
};

// Named exports - Enzyme kinetics utilities
export {
  analyzeMichaelisMenten,
  analyzeHill,
  analyzeInhibition,
  analyzeSubstrateInhibition,
  calculateLineweaverBurk,
  calculateEadieHofstee,
  calculateHanesWoolf,
  calculateHillPlot,
  calculateKiFromIC50,
  validateEnzymeData,
  INHIBITION_TYPES,
  generateMichaelisMentenCurve,
  generateHillCurve
};

// Named exports - Binding affinity utilities
export {
  analyzeSaturationBinding,
  analyzeDoseResponse,
  analyzeCompetitionBinding,
  analyzeBindingWithHill,
  calculateScatchard,
  calculateEffectLevels,
  classifyAffinity,
  formatKd,
  validateBindingData,
  validateDoseResponseData,
  generateBindingCurve,
  generateDoseResponseCurve,
  AFFINITY_CLASSIFICATION
};

// Default export with all utilities organized by category
export default {
  regression: {
    levenbergMarquardt,
    MODELS
  },
  enzymeKinetics: {
    analyzeMichaelisMenten,
    analyzeHill,
    analyzeInhibition,
    analyzeSubstrateInhibition,
    calculateLineweaverBurk,
    calculateEadieHofstee,
    calculateHanesWoolf,
    INHIBITION_TYPES
  },
  binding: {
    analyzeSaturationBinding,
    analyzeDoseResponse,
    analyzeCompetitionBinding,
    analyzeBindingWithHill,
    calculateScatchard,
    AFFINITY_CLASSIFICATION
  }
};
