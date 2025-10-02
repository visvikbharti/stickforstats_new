/**
 * ProfileViewer Type Definitions
 * 
 * Types for displaying dataset profiling results with scientific accuracy.
 * 
 * @timestamp 2025-08-06 21:25:00 UTC
 * @scientific-rigor ABSOLUTE
 */

import { 
  DatasetProfile, 
  VariableProfile,
  VariableType,
  DistributionType 
} from '../../types/api.types';

// ============================================================
// Component Props
// ============================================================

export interface ProfileViewerProps {
  /**
   * Dataset profile to display
   */
  profile: DatasetProfile | null;
  
  /**
   * Loading state
   */
  isLoading?: boolean;
  
  /**
   * Error state
   */
  error?: string | null;
  
  /**
   * Show advanced statistics
   */
  showAdvanced?: boolean;
  
  /**
   * Enable variable selection for analysis
   */
  enableSelection?: boolean;
  
  /**
   * Callback when variables are selected
   */
  onVariableSelect?: (variables: string[]) => void;
  
  /**
   * Show educational tooltips
   */
  showEducational?: boolean;
  
  /**
   * Enable export functionality
   */
  enableExport?: boolean;
  
  /**
   * Compact view mode
   */
  compact?: boolean;
}

// ============================================================
// View Modes
// ============================================================

export type ViewMode = 'overview' | 'variables' | 'quality' | 'correlations' | 'recommendations';

export interface ViewConfig {
  mode: ViewMode;
  title: string;
  icon: React.ReactNode;
  description: string;
}

// ============================================================
// Variable Display
// ============================================================

export interface VariableCardProps {
  variable: VariableProfile;
  isSelected: boolean;
  onSelect: (name: string) => void;
  showDetails: boolean;
  compact: boolean;
}

export interface VariableStatistics {
  centralTendency: {
    mean?: number;
    median?: number;
    mode?: number;
  };
  dispersion: {
    std?: number;
    variance?: number;
    iqr?: number;
    range?: number;
    cv?: number;
  };
  shape: {
    skewness?: number;
    kurtosis?: number;
  };
  quantiles: {
    min?: number;
    q1?: number;
    q2?: number;
    q3?: number;
    max?: number;
  };
}

// ============================================================
// Quality Metrics Display
// ============================================================

export interface QualityMetricsProps {
  overallScore: number;
  missingDataScore: number;
  outlierScore: number;
  consistencyScore: number;
  showDetails: boolean;
}

export interface QualityIssue {
  severity: 'critical' | 'warning' | 'info';
  category: 'missing' | 'outlier' | 'type' | 'distribution' | 'correlation';
  message: string;
  affectedVariables: string[];
  recommendation: string;
}

// ============================================================
// Distribution Display
// ============================================================

export interface DistributionChartProps {
  variable: VariableProfile;
  width?: number;
  height?: number;
  showFittedCurve?: boolean;
  showOutliers?: boolean;
  interactive?: boolean;
}

export interface DistributionSummary {
  type: DistributionType;
  parameters: Record<string, number>;
  goodnessOfFit: {
    statistic: number;
    pValue: number;
    interpretation: string;
  };
  visualization: 'histogram' | 'boxplot' | 'violin' | 'qq';
}

// ============================================================
// Correlation Display
// ============================================================

export interface CorrelationMatrixProps {
  correlations: number[][] | null;
  variableNames: string[];
  method: 'pearson' | 'spearman';
  threshold?: number;
  interactive?: boolean;
}

export interface CorrelationCell {
  row: string;
  column: string;
  value: number;
  significance: 'high' | 'medium' | 'low' | 'none';
  pValue?: number;
}

// ============================================================
// Missing Data Display
// ============================================================

export interface MissingDataViewProps {
  variables: VariableProfile[];
  pattern: 'MCAR' | 'MAR' | 'MNAR';
  confidence: number;
  showHeatmap?: boolean;
}

export interface MissingDataSummary {
  totalCells: number;
  missingCells: number;
  percentage: number;
  byVariable: Record<string, {
    count: number;
    percentage: number;
  }>;
  pattern: {
    type: 'MCAR' | 'MAR' | 'MNAR';
    evidence: string[];
    confidence: number;
  };
}

// ============================================================
// Recommendations Display
// ============================================================

export interface RecommendationCardProps {
  category: 'cleaning' | 'transformation' | 'feature_engineering' | 'analysis';
  recommendations: string[];
  priority: 'high' | 'medium' | 'low';
  icon?: React.ReactNode;
}

// ============================================================
// Export Options
// ============================================================

export interface ExportOptions {
  format: 'pdf' | 'html' | 'json' | 'csv';
  includeCharts: boolean;
  includeRawData: boolean;
  includeRecommendations: boolean;
  customTitle?: string;
}

// ============================================================
// Filter & Sort Options
// ============================================================

export interface FilterOptions {
  variableTypes: VariableType[];
  missingThreshold?: number;
  qualityThreshold?: number;
  searchTerm?: string;
}

export interface SortOptions {
  field: 'name' | 'type' | 'missing' | 'unique' | 'quality';
  direction: 'asc' | 'desc';
}

// ============================================================
// Summary Statistics
// ============================================================

export interface SummaryStatistics {
  dataset: {
    name: string;
    rows: number;
    columns: number;
    sizeBytes: number;
    created: string;
  };
  variables: {
    total: number;
    continuous: number;
    categorical: number;
    ordinal: number;
    binary: number;
    date: number;
    text: number;
    identifier: number;
  };
  quality: {
    overall: number;
    missingData: number;
    outliers: number;
    consistency: number;
  };
  issues: {
    critical: number;
    warnings: number;
    info: number;
  };
}

// ============================================================
// Interactive Features
// ============================================================

export interface InteractionState {
  selectedVariables: Set<string>;
  hoveredVariable: string | null;
  expandedSections: Set<string>;
  activeView: ViewMode;
  filters: FilterOptions;
  sorting: SortOptions;
}

// ============================================================
// Chart Types
// ============================================================

export type ChartType = 
  | 'histogram'
  | 'boxplot'
  | 'violin'
  | 'scatter'
  | 'heatmap'
  | 'bar'
  | 'line'
  | 'qq'
  | 'pie';

export interface ChartConfig {
  type: ChartType;
  data: any;
  options: Record<string, any>;
  responsive: boolean;
  interactive: boolean;
}

// ============================================================
// Tooltip Content
// ============================================================

export interface TooltipContent {
  title: string;
  description: string;
  formula?: string;
  example?: string;
  learnMore?: string;
}

// ============================================================
// Color Schemes
// ============================================================

export interface ColorScheme {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  continuous: string[];
  categorical: string[];
  diverging: string[];
}

export const DEFAULT_COLOR_SCHEME: ColorScheme = {
  primary: '#1976D2',
  secondary: '#FF9800',
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#F44336',
  info: '#2196F3',
  continuous: ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b'],
  categorical: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'],
  diverging: ['#d73027', '#f46d43', '#fdae61', '#fee090', '#ffffbf', '#e0f3f8', '#abd9e9', '#74add1', '#4575b4']
};