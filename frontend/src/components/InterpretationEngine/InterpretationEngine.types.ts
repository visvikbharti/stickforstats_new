/**
 * InterpretationEngine Component Type Definitions
 * 
 * Complete type system for statistical result interpretation with scientific accuracy.
 * 
 * @timestamp 2025-08-06 22:35:00 UTC
 * @scientific_rigor ABSOLUTE
 */

import { ReactNode } from 'react';

// Result significance levels
export type SignificanceLevel = 'highly_significant' | 'significant' | 'marginally_significant' | 'not_significant';

// Effect size magnitude
export type EffectMagnitude = 'negligible' | 'small' | 'medium' | 'large' | 'very_large';

// Confidence level
export type ConfidenceLevel = 0.90 | 0.95 | 0.99;

// Test result status
export type ResultStatus = 'success' | 'warning' | 'error' | 'info';

/**
 * Statistical test result structure
 */
export interface TestResult {
  testId: string;
  testName: string;
  testType: string;
  executedAt: string;
  duration: number;
  
  // Core statistics
  statistic: number;
  statisticName: string; // t, F, chi-square, etc.
  pValue: number;
  alpha: number;
  
  // Degrees of freedom
  degreesOfFreedom?: number | { numerator: number; denominator: number };
  
  // Confidence intervals
  confidenceInterval?: {
    lower: number;
    upper: number;
    level: ConfidenceLevel;
  };
  
  // Effect size
  effectSize?: {
    value: number;
    measure: string; // Cohen's d, eta-squared, r, etc.
    magnitude: EffectMagnitude;
    interpretation: string;
    confidenceInterval?: {
      lower: number;
      upper: number;
    };
  };
  
  // Multiple comparisons
  multipleComparisons?: {
    method: string; // Bonferroni, Tukey, etc.
    adjustedAlpha: number;
    comparisons: {
      group1: string;
      group2: string;
      meanDifference: number;
      standardError: number;
      pValue: number;
      adjustedPValue: number;
      significant: boolean;
    }[];
  };
  
  // Assumptions
  assumptionsChecked?: {
    assumption: string;
    met: boolean;
    details: string;
    impact?: string;
  }[];
  
  // Sample information
  sampleInfo: {
    totalN: number;
    groups?: {
      name: string;
      n: number;
      mean?: number;
      sd?: number;
      median?: number;
      iqr?: number;
    }[];
  };
  
  // Power analysis
  powerAnalysis?: {
    observedPower: number;
    requiredN?: number;
    detectedEffectSize?: number;
  };
  
  // Model fit (for regression/ANOVA)
  modelFit?: {
    rSquared?: number;
    adjustedRSquared?: number;
    aic?: number;
    bic?: number;
    logLikelihood?: number;
  };
  
  // Residuals
  residuals?: {
    mean: number;
    standardError: number;
    shapiroWilkP?: number;
    durbinWatson?: number;
  };
  
  // Warnings
  warnings?: string[];
}

/**
 * APA format result
 */
export interface APAResult {
  inText: string;
  statistical: string;
  effectSize?: string;
  tableFormat?: string;
  notes?: string[];
}

/**
 * Plain language interpretation
 */
export interface PlainLanguageInterpretation {
  summary: string;
  finding: string;
  meaning: string;
  confidence: string;
  limitations?: string[];
  recommendations?: string[];
}

/**
 * Visual representation configuration
 */
export interface VisualizationConfig {
  type: 'bar' | 'box' | 'scatter' | 'line' | 'histogram' | 'forest' | 'funnel';
  data: any;
  options: {
    title?: string;
    xLabel?: string;
    yLabel?: string;
    showCI?: boolean;
    showEffectSize?: boolean;
    colorScheme?: string;
  };
}

/**
 * Interpretation context
 */
export interface InterpretationContext {
  studyDesign?: string;
  hypothesis?: {
    null: string;
    alternative: string;
    direction: 'two-tailed' | 'one-tailed';
  };
  practicalSignificance?: {
    threshold: number;
    context: string;
  };
  domain?: string;
  audience?: 'academic' | 'professional' | 'general';
}

/**
 * Main InterpretationEngine component props
 */
export interface InterpretationEngineProps {
  result: TestResult | null;
  context?: InterpretationContext;
  isLoading?: boolean;
  error?: string | null;
  
  // Display options
  showAPA?: boolean;
  showPlainLanguage?: boolean;
  showTechnical?: boolean;
  showVisualization?: boolean;
  showAssumptions?: boolean;
  showRecommendations?: boolean;
  
  // Formatting
  decimalPlaces?: number;
  useScientificNotation?: boolean;
  highlightSignificance?: boolean;
  
  // Export options
  enableExport?: boolean;
  exportFormats?: ('pdf' | 'docx' | 'latex' | 'markdown')[];
  onExport?: (format: string, content: string) => void;
  
  // Actions
  onRerunTest?: () => void;
  onAdjustParameters?: () => void;
  onViewDetails?: (section: string) => void;
}

/**
 * Result summary card props
 */
export interface ResultSummaryProps {
  result: TestResult;
  significance: SignificanceLevel;
  showEffectSize?: boolean;
  showConfidenceInterval?: boolean;
  compact?: boolean;
}

/**
 * APA formatter props
 */
export interface APAFormatterProps {
  result: TestResult;
  includeEffectSize?: boolean;
  includeConfidenceInterval?: boolean;
  inTextFormat?: boolean;
  tableFormat?: boolean;
  onCopy?: (text: string) => void;
}

/**
 * Plain language interpreter props
 */
export interface PlainLanguageProps {
  result: TestResult;
  context?: InterpretationContext;
  audienceLevel?: 'academic' | 'professional' | 'general';
  includeRecommendations?: boolean;
}

/**
 * Effect size display props
 */
export interface EffectSizeDisplayProps {
  effectSize: TestResult['effectSize'];
  showInterpretation?: boolean;
  showConfidenceInterval?: boolean;
  showBenchmarks?: boolean;
}

/**
 * Visualization component props
 */
export interface ResultVisualizationProps {
  result: TestResult;
  type?: VisualizationConfig['type'];
  interactive?: boolean;
  downloadable?: boolean;
  onDownload?: (imageData: string) => void;
}

/**
 * Assumptions checker props
 */
export interface AssumptionsDisplayProps {
  assumptions: TestResult['assumptionsChecked'];
  showRemediation?: boolean;
  onRemediate?: (assumption: string) => void;
}

/**
 * Multiple comparisons table props
 */
export interface MultipleComparisonsProps {
  comparisons: TestResult['multipleComparisons'];
  showAdjusted?: boolean;
  highlightSignificant?: boolean;
  sortBy?: 'pValue' | 'meanDifference' | 'groups';
}

/**
 * Power analysis display props
 */
export interface PowerAnalysisProps {
  powerAnalysis: TestResult['powerAnalysis'];
  showRecommendations?: boolean;
  targetPower?: number;
}

/**
 * Export dialog props
 */
export interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  result: TestResult;
  interpretation: PlainLanguageInterpretation;
  apaFormat: APAResult;
  availableFormats: string[];
  onExport: (format: string) => void;
}

/**
 * Component state
 */
export interface InterpretationEngineState {
  activeView: 'summary' | 'technical' | 'apa' | 'plain' | 'visual';
  exportDialogOpen: boolean;
  copiedToClipboard: boolean;
  selectedVisualization: VisualizationConfig['type'];
  showAllAssumptions: boolean;
  showAllComparisons: boolean;
}

/**
 * Interpretation quality metrics
 */
export interface InterpretationQuality {
  clarity: number; // 0-1
  completeness: number; // 0-1
  accuracy: number; // 0-1
  actionability: number; // 0-1
}

/**
 * Educational content
 */
export interface EducationalContent {
  concept: string;
  explanation: string;
  example?: string;
  furtherReading?: {
    title: string;
    url: string;
  }[];
}

/**
 * Interpretation presets
 */
export interface InterpretationPreset {
  name: string;
  description: string;
  settings: {
    showAPA: boolean;
    showPlainLanguage: boolean;
    showTechnical: boolean;
    showVisualization: boolean;
    decimalPlaces: number;
    audienceLevel: 'academic' | 'professional' | 'general';
  };
}

/**
 * API response types
 */
export interface InterpretationResponse {
  success: boolean;
  result: TestResult;
  interpretation: {
    apa: APAResult;
    plainLanguage: PlainLanguageInterpretation;
    quality: InterpretationQuality;
  };
  visualizations?: VisualizationConfig[];
  warnings?: string[];
}

/**
 * Interpretation request
 */
export interface InterpretationRequest {
  testResultId: string;
  context?: InterpretationContext;
  options?: {
    includeVisualization?: boolean;
    includeEducational?: boolean;
    audienceLevel?: 'academic' | 'professional' | 'general';
  };
}