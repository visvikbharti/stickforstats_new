/**
 * Meta-Analysis Module
 *
 * Comprehensive meta-analysis tools for StickForStats.
 *
 * Features:
 * - Study data input with validation
 * - Fixed and random effects models
 * - Forest plot visualization
 * - Funnel plot for publication bias
 * - Heterogeneity statistics (Q, I², τ²)
 * - Subgroup analysis
 * - Leave-one-out sensitivity analysis
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

// Main components
export { default as MetaAnalysisHub } from './MetaAnalysisHub';
export { default as StudyDataInput } from './StudyDataInput';
export { default as ForestPlot } from './ForestPlot';
export { default as FunnelPlot } from './FunnelPlot';
export { default as HeterogeneityPanel } from './HeterogeneityPanel';
export { default as SensitivityAnalysis } from './SensitivityAnalysis';

// Default export
export { default } from './MetaAnalysisHub';
