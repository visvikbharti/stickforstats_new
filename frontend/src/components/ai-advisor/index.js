/**
 * AI Statistical Advisor Module
 *
 * StickForStats' intelligent statistical guidance system.
 *
 * Features:
 * - Natural language Q&A about statistics
 * - Automatic test selection recommendations
 * - Result interpretation and explanation
 * - Assumption violation guidance
 * - Publication-ready methods generation
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

// Main components
export { default as AIAdvisorHub } from './AIAdvisorHub';
export { default as AIAdvisorChat } from './AIAdvisorChat';
export { default as AIAdvisorSuggestions } from './AIAdvisorSuggestions';
export { default as AIAdvisorDataContext } from './AIAdvisorDataContext';
export { default as MethodsSectionGenerator } from './MethodsSectionGenerator';

// Hooks
export { useAIAdvisor } from './hooks/useAIAdvisor';

// Utilities
export {
  SYSTEM_PROMPT,
  buildTestSelectionPrompt,
  buildInterpretationPrompt,
  buildAssumptionPrompt,
  buildMethodsSectionPrompt,
  buildPowerAnalysisPrompt,
  extractRecommendations,
  formatStatistic,
  generateAPAResult,
} from './utils/promptTemplates';

export {
  TEST_CATALOG,
  selectAppropriateTest,
  getTestById,
  getTestsByCategory,
  getNonParametricAlternative,
  getSampleSizeGuidance,
} from './utils/testSelector';

// Default export
export { default } from './AIAdvisorHub';
