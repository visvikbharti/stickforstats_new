/**
 * Paper Parser Module
 *
 * Analyzes scientific papers for statistical quality and reproducibility.
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

// Main Component
export { default as PaperParserHub } from './PaperParserHub';
export { default } from './PaperParserHub';

// Utilities
export { extractTextFromPDF, extractSections, isValidPDF, formatFileSize } from './utils/pdfParser';
export { extractStatisticalContent, parsePValue, categorizePValue, getPrimarySampleSize } from './utils/statisticalPatterns';
export { detectErrors, getSeverityColor, getSeverityLabel, calculateQualityScore, SEVERITY, CATEGORY, ERROR_RULES } from './utils/errorRules';
export { generateReport, generateTextReport, generateJSONReport, generateSummaryStatement, JARS_CHECKLIST } from './utils/reportGenerator';
