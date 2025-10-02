/**
 * TestRecommendation Component Type Definitions
 * 
 * Complete type system for statistical test recommendations with scientific accuracy.
 * 
 * @timestamp 2025-08-06 22:15:00 UTC
 * @scientific_rigor ABSOLUTE
 */

import { ReactNode } from 'react';

// Test category types
export type TestCategory = 
  | 'comparison'
  | 'correlation'
  | 'regression'
  | 'anova'
  | 'nonparametric'
  | 'time_series'
  | 'survival'
  | 'multivariate';

// Assumption status
export type AssumptionStatus = 'met' | 'violated' | 'partial' | 'unknown';

// Test complexity level
export type ComplexityLevel = 'basic' | 'intermediate' | 'advanced' | 'expert';

// Power analysis status
export type PowerStatus = 'adequate' | 'low' | 'insufficient' | 'not_calculated';

/**
 * Individual assumption for a statistical test
 */
export interface TestAssumption {
  name: string;
  description: string;
  status: AssumptionStatus;
  evidence: string;
  impact: 'critical' | 'major' | 'minor';
  remediation?: string;
  testStatistic?: number;
  pValue?: number;
  visualization?: string; // Base64 encoded image or chart config
}

/**
 * Sample size requirements
 */
export interface SampleSizeRequirement {
  minimum: number;
  recommended: number;
  current: number;
  powerAnalysis?: {
    alpha: number;
    power: number;
    effectSize: number;
    calculatedN: number;
  };
}

/**
 * Effect size information
 */
export interface EffectSizeInfo {
  measure: string; // Cohen's d, r, eta-squared, etc.
  expectedSmall: number;
  expectedMedium: number;
  expectedLarge: number;
  interpretation: string;
}

/**
 * Test implementation details
 */
export interface TestImplementation {
  pythonCode: string;
  rCode: string;
  spsseSyntax?: string;
  sasCode?: string;
  libraries: string[];
  dataPreparation: string[];
}

/**
 * Individual statistical test recommendation
 */
export interface TestRecommendation {
  id: string;
  name: string;
  fullName: string;
  category: TestCategory;
  description: string;
  confidenceScore: number; // 0-1
  complexity: ComplexityLevel;
  
  // Why this test?
  rationale: string[];
  advantages: string[];
  limitations: string[];
  
  // Assumptions
  assumptions: TestAssumption[];
  assumptionsSummary: {
    total: number;
    met: number;
    violated: number;
    partial: number;
  };
  
  // Requirements
  sampleSize: SampleSizeRequirement;
  dataRequirements: string[];
  
  // Statistical properties
  parametric: boolean;
  robust: boolean;
  effectSize: EffectSizeInfo;
  
  // Alternative tests
  alternatives: {
    testId: string;
    testName: string;
    reason: string;
  }[];
  
  // Implementation
  implementation?: TestImplementation;
  
  // Educational content
  interpretation: string;
  example?: string;
  references: {
    title: string;
    authors: string;
    year: number;
    doi?: string;
  }[];
  
  // User interaction
  selected?: boolean;
  notes?: string;
}

/**
 * Test comparison result
 */
export interface TestComparison {
  test1: string;
  test2: string;
  differences: {
    aspect: string;
    test1Value: string;
    test2Value: string;
    recommendation: string;
  }[];
  overallRecommendation: string;
}

/**
 * Filter options for test recommendations
 */
export interface TestFilterOptions {
  categories?: TestCategory[];
  complexityLevels?: ComplexityLevel[];
  parametricOnly?: boolean;
  minConfidence?: number;
  assumptionsMet?: boolean;
  searchQuery?: string;
}

/**
 * Sort options for test recommendations
 */
export interface TestSortOptions {
  field: 'confidence' | 'name' | 'complexity' | 'assumptions';
  direction: 'asc' | 'desc';
}

/**
 * Main TestRecommendation component props
 */
export interface TestRecommendationProps {
  recommendations: TestRecommendation[];
  isLoading?: boolean;
  error?: string | null;
  
  // Display options
  showAssumptions?: boolean;
  showImplementation?: boolean;
  showAlternatives?: boolean;
  showEducational?: boolean;
  
  // Interaction
  enableSelection?: boolean;
  multiSelect?: boolean;
  maxSelections?: number;
  onTestSelect?: (tests: TestRecommendation[]) => void;
  onTestCompare?: (test1: string, test2: string) => void;
  
  // Filtering and sorting
  enableFiltering?: boolean;
  enableSorting?: boolean;
  defaultFilters?: TestFilterOptions;
  defaultSort?: TestSortOptions;
  
  // Layout
  viewMode?: 'cards' | 'list' | 'table' | 'comparison';
  compact?: boolean;
  
  // Actions
  onRunTest?: (testId: string) => void;
  onExportRecommendations?: () => void;
  onSaveSelection?: (tests: TestRecommendation[]) => void;
}

/**
 * Test card component props
 */
export interface TestCardProps {
  test: TestRecommendation;
  isSelected?: boolean;
  onSelect?: (test: TestRecommendation) => void;
  showDetails?: boolean;
  compact?: boolean;
  onCompare?: (testId: string) => void;
  onRunTest?: (testId: string) => void;
}

/**
 * Assumption panel props
 */
export interface AssumptionPanelProps {
  assumptions: TestAssumption[];
  summary: TestRecommendation['assumptionsSummary'];
  showDetails?: boolean;
  onRemediate?: (assumption: TestAssumption) => void;
}

/**
 * Test comparison view props
 */
export interface TestComparisonViewProps {
  tests: TestRecommendation[];
  maxCompare?: number;
  onClose?: () => void;
}

/**
 * Filter panel props
 */
export interface FilterPanelProps {
  filters: TestFilterOptions;
  onFiltersChange: (filters: TestFilterOptions) => void;
  availableCategories: TestCategory[];
  onReset?: () => void;
}

/**
 * Implementation code viewer props
 */
export interface ImplementationViewerProps {
  implementation: TestImplementation;
  language: 'python' | 'r' | 'spss' | 'sas';
  onCopy?: (code: string) => void;
  onDownload?: (code: string, filename: string) => void;
}

/**
 * Educational content props
 */
export interface EducationalContentProps {
  test: TestRecommendation;
  showExample?: boolean;
  showReferences?: boolean;
  showInterpretation?: boolean;
}

/**
 * Export configuration
 */
export interface ExportConfig {
  format: 'pdf' | 'html' | 'json' | 'csv';
  includeAssumptions: boolean;
  includeImplementation: boolean;
  includeReferences: boolean;
  selectedTestsOnly: boolean;
}

/**
 * Component state management
 */
export interface TestRecommendationState {
  selectedTests: string[];
  filters: TestFilterOptions;
  sort: TestSortOptions;
  viewMode: TestRecommendationProps['viewMode'];
  expandedCards: string[];
  comparisonTests: string[];
  showImplementation: boolean;
  showAssumptionDetails: boolean;
}

/**
 * API response types
 */
export interface TestRecommendationResponse {
  success: boolean;
  recommendations: TestRecommendation[];
  metadata: {
    totalTests: number;
    datasetId: string;
    profileId: string;
    generatedAt: string;
    confidenceThreshold: number;
  };
  warnings?: string[];
}

/**
 * Test execution request
 */
export interface TestExecutionRequest {
  testId: string;
  datasetId: string;
  parameters?: Record<string, any>;
  options?: {
    alpha?: number;
    confidence?: number;
    tails?: 'one' | 'two';
    correction?: string;
  };
}

/**
 * Test execution result
 */
export interface TestExecutionResult {
  testId: string;
  testName: string;
  executedAt: string;
  duration: number;
  
  // Results
  statistic: number;
  pValue: number;
  degreesOfFreedom?: number;
  confidenceInterval?: [number, number];
  effectSize?: {
    value: number;
    measure: string;
    interpretation: string;
  };
  
  // Interpretation
  conclusion: string;
  apaFormat: string;
  plainLanguage: string;
  
  // Visualizations
  plots?: {
    type: string;
    data: any;
    config: any;
  }[];
  
  // Diagnostics
  diagnostics?: {
    residuals?: number[];
    outliers?: number[];
    influentialPoints?: number[];
  };
}