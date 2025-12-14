/**
 * Guardian-AI Integration Module
 *
 * Exports all utilities for bridging Guardian Statistical Protection
 * with the AI Advisor system.
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

export {
  GuardianSeverity,
  AssumptionStatus,
  formatAssumptionForAI,
  formatGuardianReportForAI,
  generateGuardianPromptContext,
  createAIDataContext,
  mergeGuardianIntoContext,
  checkGuardianWarningStatus,
  getAssumptionsForTest,
  createGuardianSummaryCard,
  default as guardianAIUtils
} from '../guardianAIIntegration';
