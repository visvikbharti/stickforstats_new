/**
 * Statistical Debugger Panel
 *
 * A collapsible panel that provides comprehensive debugging analysis
 * for statistical test results. Integrates with test components to
 * help researchers understand unexpected results.
 *
 * Features:
 * - P-value analysis (borderline, suspicious values)
 * - Retrospective power analysis
 * - Assumption violation impact
 * - Data quality assessment
 * - Test-specific pitfalls and checklist
 * - Actionable recommendations
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  Collapse,
  Alert,
  AlertTitle,
  Chip,
  Divider,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme
} from '@mui/material';
import {
  BugReport as DebugIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Lightbulb as TipIcon,
  Psychology as InsightIcon,
  Speed as PowerIcon,
  DataUsage as DataIcon,
  Assignment as ChecklistIcon,
  Healing as FixIcon,
  TrendingUp as TrendIcon,
  Help as HelpIcon
} from '@mui/icons-material';

import { analyzeTestResults } from './utils/debuggerEngine';
import { getPitfallsForTest, getChecklistForTest, getGeneralPitfalls } from './utils/pitfallsDatabase';

/**
 * Status badge colors
 */
const STATUS_COLORS = {
  good: 'success',
  caution: 'warning',
  warning: 'warning',
  critical: 'error',
  unknown: 'default'
};

/**
 * Severity icons
 */
const SEVERITY_ICONS = {
  error: <ErrorIcon color="error" />,
  warning: <WarningIcon color="warning" />,
  info: <InfoIcon color="info" />,
  success: <CheckIcon color="success" />
};

/**
 * Main Debugger Panel Component
 */
const DebuggerPanel = ({
  testType,
  data,
  results,
  assumptions,
  options,
  defaultExpanded = false,
  title = 'Debug Analysis'
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [activeSection, setActiveSection] = useState('overview');

  // Run comprehensive analysis
  const debugReport = useMemo(() => {
    try {
      return analyzeTestResults({
        testType,
        data,
        results,
        assumptions,
        options
      });
    } catch (error) {
      console.error('Debug analysis error:', error);
      return null;
    }
  }, [testType, data, results, assumptions, options]);

  // Get test-specific pitfalls
  const pitfalls = useMemo(() => {
    return getPitfallsForTest(testType);
  }, [testType]);

  // Get checklist
  const checklist = useMemo(() => {
    return getChecklistForTest(testType);
  }, [testType]);

  // Count issues by severity
  const issueCounts = useMemo(() => {
    if (!debugReport) return { error: 0, warning: 0, info: 0 };
    return {
      error: debugReport.issues.filter(i => i.severity === 'error').length,
      warning: debugReport.issues.filter(i => i.severity === 'warning').length,
      info: debugReport.issues.filter(i => i.severity === 'info').length
    };
  }, [debugReport]);

  // Get overall status color
  const statusColor = debugReport ? STATUS_COLORS[debugReport.overallStatus] : 'default';

  if (!debugReport) {
    return null;
  }

  return (
    <Paper
      elevation={2}
      sx={{
        mt: 3,
        overflow: 'hidden',
        border: `1px solid ${theme.palette.divider}`,
        borderLeft: `4px solid ${theme.palette[statusColor]?.main || theme.palette.grey[500]}`
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
          cursor: 'pointer'
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <DebugIcon color={statusColor} />
          <Typography variant="subtitle1" fontWeight="medium">
            {title}
          </Typography>

          {/* Issue count badges */}
          <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
            {issueCounts.error > 0 && (
              <Chip
                size="small"
                icon={<ErrorIcon />}
                label={issueCounts.error}
                color="error"
                variant="filled"
              />
            )}
            {issueCounts.warning > 0 && (
              <Chip
                size="small"
                icon={<WarningIcon />}
                label={issueCounts.warning}
                color="warning"
                variant="filled"
              />
            )}
            {issueCounts.error === 0 && issueCounts.warning === 0 && (
              <Chip
                size="small"
                icon={<CheckIcon />}
                label="No issues"
                color="success"
                variant="outlined"
              />
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={debugReport.overallStatus.toUpperCase()}
            color={statusColor}
            size="small"
            variant="filled"
          />
          <IconButton size="small">
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ p: 2 }}>
          {/* Quick Summary */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {/* P-Value Status */}
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent sx={{ py: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    P-Value
                  </Typography>
                  <Typography variant="h6">
                    {results.pValue?.toFixed(4) || 'N/A'}
                  </Typography>
                  <Chip
                    size="small"
                    label={debugReport.pValueAnalysis?.interpretation || 'unknown'}
                    color={results.pValue < (options?.alpha || 0.05) ? 'success' : 'default'}
                    sx={{ mt: 0.5 }}
                  />
                </CardContent>
              </Card>
            </Grid>

            {/* Power Status */}
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent sx={{ py: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Observed Power
                  </Typography>
                  <Typography variant="h6">
                    {debugReport.powerAnalysis?.observedPower
                      ? `${(debugReport.powerAnalysis.observedPower * 100).toFixed(0)}%`
                      : 'N/A'}
                  </Typography>
                  <Chip
                    size="small"
                    label={debugReport.powerAnalysis?.powerStatus || 'unknown'}
                    color={debugReport.powerAnalysis?.powerStatus === 'adequate' ? 'success' : 'warning'}
                    sx={{ mt: 0.5 }}
                  />
                </CardContent>
              </Card>
            </Grid>

            {/* Effect Size */}
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent sx={{ py: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Effect Size
                  </Typography>
                  <Typography variant="h6">
                    {debugReport.powerAnalysis?.observedEffectSize?.toFixed(3) || 'N/A'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {debugReport.powerAnalysis?.observedEffectSize
                      ? (debugReport.powerAnalysis.observedEffectSize < 0.2 ? 'Small'
                        : debugReport.powerAnalysis.observedEffectSize < 0.5 ? 'Medium' : 'Large')
                      : ''}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Data Quality */}
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent sx={{ py: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Data Quality
                  </Typography>
                  <Typography variant="h6">
                    {debugReport.dataQuality?.quality?.toUpperCase() || 'N/A'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    n = {debugReport.dataQuality?.sampleSize || 'N/A'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Issues Section */}
          {debugReport.issues.length > 0 && (
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WarningIcon color="warning" />
                  <Typography fontWeight="medium">
                    Issues Detected ({debugReport.issues.length})
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <List dense>
                  {debugReport.issues.map((issue, index) => (
                    <ListItem key={index} sx={{ alignItems: 'flex-start', py: 1 }}>
                      <ListItemIcon sx={{ mt: 0.5, minWidth: 36 }}>
                        {SEVERITY_ICONS[issue.severity]}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography fontWeight="medium">
                            {issue.message}
                          </Typography>
                        }
                        secondary={
                          <Box sx={{ mt: 0.5 }}>
                            <Typography variant="body2" color="text.secondary">
                              {issue.explanation}
                            </Typography>
                            {issue.recommendation && (
                              <Alert severity="info" sx={{ mt: 1, py: 0 }}>
                                <Typography variant="body2">
                                  <strong>Recommendation:</strong> {issue.recommendation}
                                </Typography>
                              </Alert>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Recommendations Section */}
          {debugReport.recommendations.length > 0 && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TipIcon color="primary" />
                  <Typography fontWeight="medium">
                    Recommendations ({debugReport.recommendations.length})
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <List dense>
                  {debugReport.recommendations.map((rec, index) => (
                    <ListItem key={index} sx={{ alignItems: 'flex-start' }}>
                      <ListItemIcon sx={{ mt: 0.5, minWidth: 36 }}>
                        <Chip
                          size="small"
                          label={rec.priority}
                          color={rec.priority === 'high' ? 'error' : rec.priority === 'medium' ? 'warning' : 'default'}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={rec.title}
                        secondary={rec.content}
                      />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Insights Section */}
          {debugReport.insights.length > 0 && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <InsightIcon color="info" />
                  <Typography fontWeight="medium">
                    Insights
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {debugReport.insights.map((insight, index) => (
                  <Alert key={index} severity="info" sx={{ mb: 1 }}>
                    <AlertTitle>{insight.title}</AlertTitle>
                    {insight.content}
                  </Alert>
                ))}
              </AccordionDetails>
            </Accordion>
          )}

          {/* Power Analysis Details */}
          {debugReport.powerAnalysis && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PowerIcon color="primary" />
                  <Typography fontWeight="medium">
                    Power Analysis Details
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">
                      Observed Power
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {debugReport.powerAnalysis.observedPower
                        ? `${(debugReport.powerAnalysis.observedPower * 100).toFixed(1)}%`
                        : 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">
                      Effect Size
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {debugReport.powerAnalysis.observedEffectSize?.toFixed(3) || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">
                      Actual Sample Size
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {debugReport.powerAnalysis.actualSampleSize || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">
                      Required for 80% Power
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {debugReport.powerAnalysis.requiredSampleSize || 'N/A'}
                    </Typography>
                  </Grid>
                </Grid>

                {debugReport.powerAnalysis.requiredSampleSize &&
                  debugReport.powerAnalysis.actualSampleSize &&
                  debugReport.powerAnalysis.requiredSampleSize > debugReport.powerAnalysis.actualSampleSize && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      <AlertTitle>Underpowered Study</AlertTitle>
                      You would need approximately{' '}
                      <strong>{debugReport.powerAnalysis.requiredSampleSize - debugReport.powerAnalysis.actualSampleSize}</strong>{' '}
                      more participants to achieve 80% power for this effect size.
                    </Alert>
                  )}
              </AccordionDetails>
            </Accordion>
          )}

          {/* Test-Specific Pitfalls */}
          {pitfalls.commonPitfalls && pitfalls.commonPitfalls.length > 0 && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <HelpIcon color="warning" />
                  <Typography fontWeight="medium">
                    Common Pitfalls for {pitfalls.name}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {pitfalls.commonPitfalls.map((pitfall, index) => (
                  <Accordion key={index} variant="outlined" sx={{ mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          size="small"
                          label={pitfall.severity}
                          color={pitfall.severity === 'high' ? 'error' : pitfall.severity === 'medium' ? 'warning' : 'default'}
                        />
                        <Typography>{pitfall.title}</Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" paragraph>
                        {pitfall.description}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        <strong>When it matters:</strong> {pitfall.whenItMatters}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        <strong>How to detect:</strong> {pitfall.howToDetect}
                      </Typography>
                      <Alert severity="info" sx={{ mt: 1 }}>
                        <strong>Solution:</strong> {pitfall.solution}
                      </Alert>
                      {pitfall.reference && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          Reference: {pitfall.reference}
                        </Typography>
                      )}
                    </AccordionDetails>
                  </Accordion>
                ))}
              </AccordionDetails>
            </Accordion>
          )}

          {/* Checklist */}
          {checklist.length > 0 && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ChecklistIcon color="primary" />
                  <Typography fontWeight="medium">
                    Pre-Analysis Checklist
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <List dense>
                  {checklist.map((item, index) => (
                    <ListItem key={index}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <CheckIcon color="action" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={item} />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Sensitivity Analysis */}
          {debugReport.sensitivity && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendIcon color="primary" />
                  <Typography fontWeight="medium">
                    Sensitivity Analysis
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {debugReport.sensitivity.alphaLevelSensitivity && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Significance at Different Alpha Levels
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {Object.entries(debugReport.sensitivity.alphaLevelSensitivity.significantAt).map(([level, sig]) => (
                        <Chip
                          key={level}
                          label={`α = ${level.replace('alpha_', '').replace('_', '.')}: ${sig ? 'Sig' : 'NS'}`}
                          color={sig ? 'success' : 'default'}
                          variant={sig ? 'filled' : 'outlined'}
                          size="small"
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                {debugReport.sensitivity.outlierSensitivity && (
                  <Alert severity="info">
                    <AlertTitle>Outlier Sensitivity</AlertTitle>
                    {debugReport.sensitivity.outlierSensitivity.recommendation}
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Original n: {debugReport.sensitivity.outlierSensitivity.originalN} →
                      Clean n: {debugReport.sensitivity.outlierSensitivity.cleanN}
                      ({debugReport.sensitivity.outlierSensitivity.outliersRemoved} removed)
                    </Typography>
                  </Alert>
                )}
              </AccordionDetails>
            </Accordion>
          )}

          {/* No Issues Message */}
          {debugReport.issues.length === 0 && debugReport.warnings.length === 0 && (
            <Alert severity="success" sx={{ mt: 2 }}>
              <AlertTitle>Analysis Looks Good</AlertTitle>
              No major issues detected. Your analysis appears to be methodologically sound.
              Always consider the practical significance of your results in addition to
              statistical significance.
            </Alert>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};

export default DebuggerPanel;
