/**
 * InterpretationEngine Component Barrel Export
 * 
 * @timestamp 2025-08-06 22:50:00 UTC
 */

export { default } from './InterpretationEngine';
export { default as ResultSummary } from './ResultSummary';
export { default as APAFormatter } from './APAFormatter';
export { default as PlainLanguageInterpreter } from './PlainLanguageInterpreter';
export { default as EffectSizeDisplay } from './EffectSizeDisplay';
export { default as PowerAnalysisDisplay } from './PowerAnalysisDisplay';
export { default as AssumptionsDisplay } from './AssumptionsDisplay';
export { default as MultipleComparisonsTable } from './MultipleComparisonsTable';
export { default as ResultVisualization } from './ResultVisualization';

export type {
  InterpretationEngineProps,
  TestResult,
  SignificanceLevel,
  EffectMagnitude,
  ConfidenceLevel,
  ResultStatus,
  APAResult,
  PlainLanguageInterpretation,
  InterpretationContext,
  ResultSummaryProps,
  APAFormatterProps,
  PlainLanguageProps,
  EffectSizeDisplayProps,
  PowerAnalysisProps,
  AssumptionsDisplayProps,
  MultipleComparisonsProps,
  ResultVisualizationProps,
  InterpretationEngineState,
  InterpretationResponse,
  InterpretationRequest,
} from './InterpretationEngine.types';