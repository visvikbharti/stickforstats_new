/**
 * ProfileViewer Component Barrel Export
 * 
 * @timestamp 2025-08-06 21:42:00 UTC
 */

export { default } from './ProfileViewer';
export { default as VariableCard } from './VariableCard';
export { default as QualityMetrics } from './QualityMetrics';
export { default as CorrelationMatrix } from './CorrelationMatrix';
export { default as RecommendationCard } from './RecommendationCard';

export type {
  ProfileViewerProps,
  ViewMode,
  ViewConfig,
  VariableCardProps,
  QualityMetricsProps,
  CorrelationMatrixProps,
  RecommendationCardProps,
  InteractionState,
  FilterOptions,
  SortOptions,
  SummaryStatistics,
  QualityIssue,
  MissingDataSummary,
  DistributionSummary,
  ExportOptions,
} from './ProfileViewer.types';