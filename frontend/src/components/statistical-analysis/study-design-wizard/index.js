/**
 * Study Design Wizard Module
 *
 * Exports all components for the Study Design Wizard feature.
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

export { default as StudyDesignWizard } from './StudyDesignWizard';
export { default } from './StudyDesignWizard';

// Export step components for potential individual use
export { default as StudyTypeStep } from './steps/StudyTypeStep';
export { default as VariablesStep } from './steps/VariablesStep';
export { default as TestSelectionStep } from './steps/TestSelectionStep';
export { default as PowerAnalysisStep } from './steps/PowerAnalysisStep';
export { default as FeasibilityStep } from './steps/FeasibilityStep';
export { default as ProtocolSummaryStep } from './steps/ProtocolSummaryStep';
