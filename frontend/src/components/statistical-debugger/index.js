/**
 * Statistical Debugger Module
 *
 * Exports for the Statistical Debugger feature that helps researchers
 * understand and debug their statistical analyses.
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

// Main Panel Component
export { default as DebuggerPanel } from './DebuggerPanel';

// Core Analysis Engine
export {
  default as analyzeTestResults,
  analyzePValue,
  analyzeRetrospectivePower,
  analyzeAssumptions,
  analyzeDataQuality,
  performSensitivityAnalysis,
  generateRecommendations,
  calculateObservedEffectSize,
  detectOutliers,
  getAlternativeTests,
  interpretEffectSize
} from './utils/debuggerEngine';

// Pitfalls Database
export {
  PITFALLS_BY_TEST,
  GENERAL_PITFALLS,
  getPitfallsForTest,
  getChecklistForTest,
  getGeneralPitfalls,
  checkPitfall
} from './utils/pitfallsDatabase';

// Default export
export { default } from './DebuggerPanel';
