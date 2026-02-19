/**
 * PlainEnglishResults Component
 * =============================
 *
 * Displays statistical analysis results in three modes: Plain English,
 * Researcher View, and APA Format. Part of the StickForStats v2.0
 * Autonomous Intelligence Layer.
 *
 * Features:
 * - Significance banner with contextual coloring
 * - Tabbed output (plain English, researcher, APA)
 * - Effect size gauge with color gradient
 * - Cascade path visualization (Stepper)
 * - Guardian confidence score (circular progress)
 * - Warnings display
 * - Next steps cards with priority-based styling
 * - "Why this test?" expandable accordion
 *
 * @author StickForStats Development Team
 * @date 2026-02-19
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Alert,
  AlertTitle,
  Tabs,
  Tab,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  IconButton,
  Tooltip,
  Stack,
  LinearProgress,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  useTheme,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Cancel as FailIcon,
  ContentCopy as CopyIcon,
  ExpandMore as ExpandMoreIcon,
  Science as ScienceIcon,
  Description as DescriptionIcon,
  Person as PersonIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  ArrowForward as ArrowForwardIcon,
  HelpOutline as HelpIcon,
  Shield as ShieldIcon,
} from '@mui/icons-material';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MODE_TABS = [
  { value: 'plain_english', label: 'Plain English', icon: <PersonIcon /> },
  { value: 'researcher', label: 'Researcher View', icon: <ScienceIcon /> },
  { value: 'apa_format', label: 'APA Format', icon: <DescriptionIcon /> },
];

const PRIORITY_CONFIG = {
  high: { color: 'error', borderColor: 'error.main', label: 'High Priority' },
  medium: { color: 'warning', borderColor: 'warning.main', label: 'Medium Priority' },
  low: { color: 'info', borderColor: 'info.main', label: 'Optional' },
};

// ---------------------------------------------------------------------------
// TabPanel helper
// ---------------------------------------------------------------------------

const TabPanel = ({ children, value, index, ...other }) => (
  <Box
    role="tabpanel"
    hidden={value !== index}
    id={`results-tabpanel-${index}`}
    aria-labelledby={`results-tab-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
  </Box>
);

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Significance Banner
 */
const SignificanceBanner = ({ isSignificant, summary }) => (
  <Alert
    severity={isSignificant ? 'success' : 'warning'}
    variant="filled"
    sx={{ mb: 3 }}
    icon={isSignificant ? <CheckIcon fontSize="large" /> : <WarningIcon fontSize="large" />}
  >
    <AlertTitle sx={{ fontSize: '1.1rem', fontWeight: 700 }}>
      {isSignificant ? 'Statistically Significant Result' : 'Not Statistically Significant'}
    </AlertTitle>
    <Typography variant="body1" sx={{ mt: 0.5 }}>
      {summary}
    </Typography>
  </Alert>
);

/**
 * Plain English Tab Content
 */
const PlainEnglishTab = ({ translation }) => {
  if (!translation) return null;
  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
        What does this mean?
      </Typography>
      <Typography variant="body1" sx={{ fontSize: '1.15rem', lineHeight: 1.8, mb: 3 }}>
        {translation.summary}
      </Typography>
      {translation.details && (
        <Paper variant="outlined" sx={{ p: 3, bgcolor: 'background.default' }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
            More detail
          </Typography>
          <Typography variant="body1" sx={{ lineHeight: 1.7 }}>
            {translation.details}
          </Typography>
        </Paper>
      )}
      {translation.recommendation && (
        <Alert severity="info" sx={{ mt: 3 }}>
          <AlertTitle>Recommendation</AlertTitle>
          {translation.recommendation}
        </Alert>
      )}
    </Box>
  );
};

/**
 * Researcher View Tab Content
 */
const ResearcherTab = ({ cascadeResult }) => {
  if (!cascadeResult?.result) return null;
  const r = cascadeResult.result;

  const rows = [
    { label: 'Test Name', value: r.test_name },
    { label: 'Test Statistic', value: r.statistic != null ? r.statistic.toFixed(4) : 'N/A' },
    { label: 'p-value', value: r.p_value != null ? formatPValue(r.p_value) : 'N/A' },
    { label: 'Effect Size', value: r.effect_size != null ? r.effect_size.toFixed(4) : 'N/A' },
    { label: 'Degrees of Freedom', value: r.df != null ? r.df : 'N/A' },
    { label: 'Confidence Interval', value: formatCI(r.confidence_interval) },
  ];

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        Technical Results
      </Typography>
      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        {rows.map((row, idx) => (
          <Box
            key={row.label}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              px: 3,
              py: 1.5,
              bgcolor: idx % 2 === 0 ? 'background.default' : 'transparent',
              borderBottom: idx < rows.length - 1 ? '1px solid' : 'none',
              borderColor: 'divider',
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              {row.label}
            </Typography>
            <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
              {row.value}
            </Typography>
          </Box>
        ))}
      </Paper>
      {cascadeResult.n_cascades > 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Note: The original test ({cascadeResult.original_test}) was cascaded{' '}
          {cascadeResult.n_cascades} time(s) before arriving at {r.test_name}.
        </Alert>
      )}
    </Box>
  );
};

/**
 * APA Format Tab Content with copy-to-clipboard
 */
const APAFormatTab = ({ cascadeResult, translation }) => {
  const [copied, setCopied] = useState(false);

  const apaText = useMemo(() => {
    if (!cascadeResult?.result) return '';
    const r = cascadeResult.result;
    const parts = [];

    if (r.test_name) {
      parts.push(`A ${r.test_name} was conducted.`);
    }

    if (r.statistic != null && r.p_value != null) {
      const stat = r.statistic.toFixed(2);
      const pStr = formatPValue(r.p_value);
      const dfStr = r.df != null ? `(${r.df})` : '';
      parts.push(`The result was statistically ${r.p_value < 0.05 ? 'significant' : 'non-significant'}, ${r.test_name} ${dfStr} = ${stat}, p ${pStr}.`);
    }

    if (r.effect_size != null && translation?.effect_size_interpretation) {
      parts.push(
        `The effect size was ${r.effect_size.toFixed(2)}, indicating a ${translation.effect_size_interpretation} effect.`
      );
    }

    if (r.confidence_interval) {
      parts.push(`95% CI ${formatCI(r.confidence_interval)}.`);
    }

    return parts.join(' ');
  }, [cascadeResult, translation]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(apaText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = apaText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [apaText]);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          APA-Formatted Result
        </Typography>
        <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
          <IconButton onClick={handleCopy} color={copied ? 'success' : 'default'} size="small">
            <CopyIcon />
          </IconButton>
        </Tooltip>
      </Stack>
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          bgcolor: 'background.default',
          fontFamily: '"Times New Roman", Times, serif',
          fontSize: '1rem',
          lineHeight: 2,
          fontStyle: 'italic',
          position: 'relative',
        }}
      >
        <Typography sx={{ fontFamily: 'inherit', fontSize: 'inherit', fontStyle: 'inherit', lineHeight: 'inherit' }}>
          {apaText || 'Insufficient data to generate APA text.'}
        </Typography>
      </Paper>
      {copied && (
        <Typography variant="caption" color="success.main" sx={{ mt: 1, display: 'block' }}>
          APA text copied to clipboard.
        </Typography>
      )}
    </Box>
  );
};

/**
 * Effect Size Gauge
 *
 * Horizontal progress bar with color gradient from red (negligible) to green (large).
 */
const EffectSizeGauge = ({ effectSize, interpretation }) => {
  const theme = useTheme();

  if (effectSize == null) return null;

  // Normalize effect size to 0-100 range for the bar (cap at 1.0 for display)
  const normalizedValue = Math.min(Math.abs(effectSize), 1.0) * 100;

  const getBarColor = (value) => {
    if (value < 25) return theme.palette.error.main; // negligible
    if (value < 50) return theme.palette.warning.main; // small
    if (value < 75) return theme.palette.info.main; // medium
    return theme.palette.success.main; // large
  };

  const barColor = getBarColor(normalizedValue);

  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <TrendingUpIcon color="action" />
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Effect Size
        </Typography>
      </Stack>

      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Magnitude
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, color: barColor }}>
          {Math.abs(effectSize).toFixed(3)}
        </Typography>
      </Stack>

      {/* Gradient track */}
      <Box sx={{ position: 'relative', mb: 1 }}>
        <LinearProgress
          variant="determinate"
          value={100}
          sx={{
            height: 14,
            borderRadius: 1,
            bgcolor: theme.palette.grey[200],
            '& .MuiLinearProgress-bar': {
              borderRadius: 1,
              background: `linear-gradient(to right, ${theme.palette.error.main}, ${theme.palette.warning.main}, ${theme.palette.info.main}, ${theme.palette.success.main})`,
            },
          }}
        />
        {/* Indicator marker */}
        <Box
          sx={{
            position: 'absolute',
            top: -3,
            left: `${normalizedValue}%`,
            transform: 'translateX(-50%)',
            width: 4,
            height: 20,
            bgcolor: theme.palette.text.primary,
            borderRadius: 1,
          }}
        />
      </Box>

      <Stack direction="row" justifyContent="space-between">
        <Typography variant="caption" color="error.main">Negligible</Typography>
        <Typography variant="caption" color="warning.main">Small</Typography>
        <Typography variant="caption" color="info.main">Medium</Typography>
        <Typography variant="caption" color="success.main">Large</Typography>
      </Stack>

      {interpretation && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, fontStyle: 'italic' }}>
          {interpretation}
        </Typography>
      )}
    </Paper>
  );
};

/**
 * Cascade Path Visualization
 *
 * MUI Stepper showing each test attempted and whether it passed or failed.
 */
const CascadePathVisualization = ({ cascadeResult }) => {
  const { cascade_path, original_test, final_test } = cascadeResult || {};

  // Build steps from cascade_path if available, otherwise from original/final
  const steps = useMemo(() => {
    if (!cascadeResult || cascadeResult.n_cascades === 0) return [];

    if (Array.isArray(cascade_path) && cascade_path.length > 0) {
      return cascade_path.map((entry, idx) => {
        // Each entry may be a string (test name) or an object { test, status }
        if (typeof entry === 'string') {
          const isLast = idx === cascade_path.length - 1;
          return { test: entry, passed: isLast };
        }
        return { test: entry.test || entry.name || String(entry), passed: !!entry.passed };
      });
    }
    // Fallback: original failed, final passed
    const result = [];
    if (original_test) {
      result.push({ test: original_test, passed: false });
    }
    if (final_test && final_test !== original_test) {
      result.push({ test: final_test, passed: true });
    }
    return result;
  }, [cascade_path, original_test, final_test]);

  if (steps.length === 0) return null;

  // The active step is the last one (the passing test)
  const activeStep = steps.findIndex((s) => s.passed);

  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
        Test Cascade Path
      </Typography>
      <Stepper
        activeStep={activeStep >= 0 ? activeStep : steps.length - 1}
        alternativeLabel
      >
        {steps.map((step) => (
          <Step key={step.test} completed={step.passed}>
            <StepLabel
              error={!step.passed}
              icon={
                step.passed ? (
                  <CheckIcon color="success" />
                ) : (
                  <FailIcon color="error" />
                )
              }
              optional={
                <Typography variant="caption" color={step.passed ? 'success.main' : 'error.main'}>
                  {step.passed ? 'passed' : 'failed'}
                </Typography>
              }
            >
              {step.test}
            </StepLabel>
          </Step>
        ))}
      </Stepper>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
        Original: {original_test} -- Final: {final_test} ({cascadeResult.n_cascades} cascade(s))
      </Typography>
    </Paper>
  );
};

/**
 * Guardian Confidence Score
 *
 * Circular progress indicator colored by confidence level.
 */
const GuardianConfidenceScore = ({ score }) => {
  const theme = useTheme();

  if (score == null) return null;

  const percentage = Math.round(score * 100);

  const getColor = () => {
    if (score > 0.8) return theme.palette.success.main;
    if (score > 0.5) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const color = getColor();

  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <ShieldIcon color="action" />
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Guardian Confidence Score
        </Typography>
      </Stack>
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
          {/* Background circle */}
          <CircularProgress
            variant="determinate"
            value={100}
            size={120}
            thickness={6}
            sx={{ color: theme.palette.grey[200] }}
          />
          {/* Colored progress circle */}
          <CircularProgress
            variant="determinate"
            value={percentage}
            size={120}
            thickness={6}
            sx={{
              color,
              position: 'absolute',
              left: 0,
            }}
          />
          {/* Center label */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              right: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: 700, color, lineHeight: 1 }}>
              {percentage}%
            </Typography>
          </Box>
        </Box>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
        {percentage >= 80
          ? 'High confidence -- assumptions well supported'
          : percentage >= 50
            ? 'Moderate confidence -- some assumptions may be violated'
            : 'Low confidence -- significant assumption violations detected'}
      </Typography>
    </Paper>
  );
};

/**
 * Warnings Section
 */
const WarningsSection = ({ warnings }) => {
  if (!warnings || warnings.length === 0) return null;
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
        Warnings
      </Typography>
      <Stack spacing={1}>
        {warnings.map((warning, idx) => (
          <Alert key={idx} severity="warning" variant="outlined">
            {warning}
          </Alert>
        ))}
      </Stack>
    </Box>
  );
};

/**
 * Next Steps Section
 */
const NextStepsSection = ({ steps, onNextStep }) => {
  if (!steps || steps.length === 0) return null;

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
        Suggested Next Steps
      </Typography>
      <Stack spacing={1.5}>
        {steps.map((item, idx) => {
          const priorityCfg = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.low;
          return (
            <Card
              key={idx}
              variant="outlined"
              sx={{
                borderLeft: 4,
                borderColor: priorityCfg.borderColor,
                transition: 'box-shadow 0.2s',
                '&:hover': { boxShadow: 3 },
              }}
            >
              <CardActionArea
                onClick={() => onNextStep && onNextStep(item.action)}
                sx={{ p: 0 }}
              >
                <CardContent sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {item.step}
                      </Typography>
                      <Chip
                        label={priorityCfg.label}
                        size="small"
                        color={priorityCfg.color}
                        variant="outlined"
                      />
                    </Stack>
                    {item.description && (
                      <Typography variant="body2" color="text.secondary">
                        {item.description}
                      </Typography>
                    )}
                  </Box>
                  <ArrowForwardIcon color="action" sx={{ mt: 0.5 }} />
                </CardContent>
              </CardActionArea>
            </Card>
          );
        })}
      </Stack>
    </Box>
  );
};

/**
 * "Why this test?" Accordion
 */
const WhyThisTestAccordion = ({ cascadeResult }) => {
  if (!cascadeResult) return null;

  const { original_test, final_test, n_cascades, cascade_path } = cascadeResult;

  // Nothing to explain if no cascade happened
  const didCascade = n_cascades > 0 && original_test !== final_test;

  return (
    <Accordion variant="outlined" sx={{ mb: 3 }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" spacing={1} alignItems="center">
          <HelpIcon color="action" />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Why this test?
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        {didCascade ? (
          <Box>
            <Typography variant="body1" gutterBottom>
              The system originally selected <strong>{original_test}</strong>, but assumption
              checks indicated it was not appropriate for your data. The Guardian system
              automatically cascaded through {n_cascades} alternative(s) before finding a
              valid test.
            </Typography>
            <Typography variant="body1" gutterBottom sx={{ mt: 1 }}>
              The final test used was <strong>{final_test}</strong>, which passed all
              required assumption checks for your dataset.
            </Typography>
            {Array.isArray(cascade_path) && cascade_path.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Cascade path:
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {cascade_path.map((entry, idx) => {
                    const testName = typeof entry === 'string' ? entry : entry.test || entry.name || String(entry);
                    const passed = typeof entry === 'object' ? !!entry.passed : idx === cascade_path.length - 1;
                    return (
                      <React.Fragment key={idx}>
                        <Chip
                          label={testName}
                          color={passed ? 'success' : 'default'}
                          variant={passed ? 'filled' : 'outlined'}
                          size="small"
                          icon={passed ? <CheckIcon /> : <FailIcon />}
                        />
                        {idx < cascade_path.length - 1 && (
                          <ArrowForwardIcon fontSize="small" color="action" sx={{ alignSelf: 'center' }} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </Stack>
              </Box>
            )}
          </Box>
        ) : (
          <Typography variant="body1">
            The originally selected test (<strong>{final_test || original_test || 'unknown'}</strong>)
            passed all assumption checks and was used directly. No cascade was needed.
          </Typography>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/**
 * Format a p-value for display.
 */
function formatPValue(p) {
  if (p == null) return 'N/A';
  if (p < 0.001) return '< .001';
  return `= ${p.toFixed(3).replace(/^0/, '')}`;
}

/**
 * Format a confidence interval for display.
 */
function formatCI(ci) {
  if (!ci) return 'N/A';
  if (Array.isArray(ci) && ci.length === 2) {
    return `[${ci[0].toFixed(3)}, ${ci[1].toFixed(3)}]`;
  }
  if (ci.lower != null && ci.upper != null) {
    return `[${ci.lower.toFixed(3)}, ${ci.upper.toFixed(3)}]`;
  }
  return String(ci);
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const PlainEnglishResults = ({ result, mode, onModeChange, onNextStep }) => {
  const [activeTab, setActiveTab] = useState(() => {
    const idx = MODE_TABS.findIndex((t) => t.value === mode);
    return idx >= 0 ? idx : 0;
  });

  const handleTabChange = useCallback(
    (_event, newValue) => {
      setActiveTab(newValue);
      if (onModeChange) {
        onModeChange(MODE_TABS[newValue].value);
      }
    },
    [onModeChange]
  );

  // Do not render when there is no result
  if (!result) return null;

  const { translation, cascade_result: cascadeResult, warnings, suggested_next_steps: nextSteps } = result;
  const isSignificant = translation?.is_significant ?? false;
  const confidenceScore = cascadeResult?.confidence_score;
  const effectSize = cascadeResult?.result?.effect_size;
  const effectInterpretation = translation?.effect_size_interpretation;

  return (
    <Box>
      {/* 1. Significance Banner */}
      <SignificanceBanner isSignificant={isSignificant} summary={translation?.summary || ''} />

      {/* 2. Tab Panel */}
      <Paper variant="outlined" sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          textColor="primary"
          indicatorColor="primary"
          aria-label="Result view mode"
        >
          {MODE_TABS.map((tab, idx) => (
            <Tab
              key={tab.value}
              label={tab.label}
              icon={tab.icon}
              iconPosition="start"
              id={`results-tab-${idx}`}
              aria-controls={`results-tabpanel-${idx}`}
            />
          ))}
        </Tabs>
        <Divider />
        <Box sx={{ p: 3 }}>
          <TabPanel value={activeTab} index={0}>
            <PlainEnglishTab translation={translation} />
          </TabPanel>
          <TabPanel value={activeTab} index={1}>
            <ResearcherTab cascadeResult={cascadeResult} />
          </TabPanel>
          <TabPanel value={activeTab} index={2}>
            <APAFormatTab cascadeResult={cascadeResult} translation={translation} />
          </TabPanel>
        </Box>
      </Paper>

      {/* 3. Effect Size Gauge */}
      <EffectSizeGauge effectSize={effectSize} interpretation={effectInterpretation} />

      {/* 4. Cascade Path Visualization */}
      <CascadePathVisualization cascadeResult={cascadeResult} />

      {/* 5. Guardian Confidence Score */}
      <GuardianConfidenceScore score={confidenceScore} />

      {/* 6. Warnings */}
      <WarningsSection warnings={warnings} />

      {/* 7. Next Steps */}
      <NextStepsSection steps={nextSteps} onNextStep={onNextStep} />

      {/* 8. "Why this test?" Accordion */}
      <WhyThisTestAccordion cascadeResult={cascadeResult} />
    </Box>
  );
};

export default PlainEnglishResults;
