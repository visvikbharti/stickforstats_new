/**
 * Guardian Components Module
 * ==========================
 *
 * React components for displaying Guardian assumption validation reports.
 *
 * Design Contract Compliance:
 * - "No statistical result may exist without an explicit, traceable assumption context."
 * - All statistical results MUST be displayed alongside their Guardian context
 */

export { default as GuardianReportDisplay } from './GuardianReportDisplay';
export { default as GuardianBadge } from './GuardianBadge';
export { default as ViolationCard } from './ViolationCard';
export { default as ConfidenceGauge } from './ConfidenceGauge';
