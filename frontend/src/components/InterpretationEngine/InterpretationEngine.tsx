/**
 * InterpretationEngine Component
 * 
 * Intelligent interpretation of statistical test results with absolute scientific accuracy.
 * Provides APA formatting, plain language interpretation, and actionable insights.
 * 
 * @timestamp 2025-08-06 22:40:00 UTC
 * @scientific_rigor ABSOLUTE
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Alert,
  Button,
  IconButton,
  Chip,
  Divider,
  Grid,
  Tooltip,
  LinearProgress,
  Snackbar,
  Card,
  CardContent,
} from '@mui/material';
import {
  Insights as InsightsIcon,
  Description as APAIcon,
  Language as PlainIcon,
  Code as TechnicalIcon,
  BarChart as VisualIcon,
  Download as ExportIcon,
  ContentCopy as CopyIcon,
  CheckCircle as SignificantIcon,
  Cancel as NotSignificantIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Refresh as RerunIcon,
  Settings as SettingsIcon,
  School as LearnIcon,
} from '@mui/icons-material';

import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { setTestResults } from '../../store/slices/analysisSlice';

import ResultSummary from './ResultSummary';
import APAFormatter from './APAFormatter';
import PlainLanguageInterpreter from './PlainLanguageInterpreter';
import EffectSizeDisplay from './EffectSizeDisplay';
import ResultVisualization from './ResultVisualization';
import AssumptionsDisplay from './AssumptionsDisplay';
import PowerAnalysisDisplay from './PowerAnalysisDisplay';
import MultipleComparisonsTable from './MultipleComparisonsTable';

import {
  InterpretationEngineProps,
  InterpretationEngineState,
  SignificanceLevel,
  APAResult,
  PlainLanguageInterpretation,
} from './InterpretationEngine.types';

const InterpretationEngine: React.FC<InterpretationEngineProps> = ({
  result,
  context,
  isLoading = false,
  error = null,
  showAPA = true,
  showPlainLanguage = true,
  showTechnical = true,
  showVisualization = true,
  showAssumptions = true,
  showRecommendations = true,
  decimalPlaces = 3,
  useScientificNotation = false,
  highlightSignificance = true,
  enableExport = true,
  exportFormats = ['pdf', 'docx', 'markdown'],
  onExport,
  onRerunTest,
  onAdjustParameters,
  onViewDetails,
}) => {
  const dispatch = useDispatch();
  
  // Component state
  const [state, setState] = useState<InterpretationEngineState>({
    activeView: 'summary',
    exportDialogOpen: false,
    copiedToClipboard: false,
    selectedVisualization: 'bar',
    showAllAssumptions: false,
    showAllComparisons: false,
  });

  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  // Calculate significance level
  const getSignificanceLevel = useMemo((): SignificanceLevel | null => {
    if (!result) return null;
    
    const { pValue, alpha } = result;
    if (pValue < 0.001) return 'highly_significant';
    if (pValue < alpha) return 'significant';
    if (pValue < alpha * 1.5) return 'marginally_significant';
    return 'not_significant';
  }, [result]);

  // Generate APA format
  const generateAPAFormat = useMemo((): APAResult | null => {
    if (!result) return null;

    const { testName, statistic, statisticName, pValue, degreesOfFreedom, effectSize } = result;
    
    // Format p-value
    const pFormatted = pValue < 0.001 ? 'p < .001' : `p = ${pValue.toFixed(3)}`;
    
    // Format degrees of freedom
    let dfFormatted = '';
    if (degreesOfFreedom) {
      if (typeof degreesOfFreedom === 'number') {
        dfFormatted = `(${degreesOfFreedom})`;
      } else {
        dfFormatted = `(${degreesOfFreedom.numerator}, ${degreesOfFreedom.denominator})`;
      }
    }
    
    // Statistical format
    const statistical = `${statisticName}${dfFormatted} = ${statistic.toFixed(decimalPlaces)}, ${pFormatted}`;
    
    // Effect size format
    let effectSizeText = '';
    if (effectSize) {
      effectSizeText = `${effectSize.measure} = ${effectSize.value.toFixed(decimalPlaces)}`;
      if (effectSize.confidenceInterval) {
        effectSizeText += `, 95% CI [${effectSize.confidenceInterval.lower.toFixed(decimalPlaces)}, ${effectSize.confidenceInterval.upper.toFixed(decimalPlaces)}]`;
      }
    }
    
    // In-text format
    const inText = getSignificanceLevel === 'significant' || getSignificanceLevel === 'highly_significant'
      ? `The ${testName} revealed a statistically significant difference, ${statistical}`
      : `The ${testName} did not reveal a statistically significant difference, ${statistical}`;
    
    return {
      inText,
      statistical,
      effectSize: effectSizeText,
      notes: [
        'Format: APA 7th Edition',
        'Report exact p-values when p ≥ .001',
        'Include effect sizes for all primary outcomes',
      ],
    };
  }, [result, getSignificanceLevel, decimalPlaces]);

  // Generate plain language interpretation
  const generatePlainLanguage = useMemo((): PlainLanguageInterpretation | null => {
    if (!result) return null;

    const significance = getSignificanceLevel;
    const { testName, pValue, alpha, effectSize, sampleInfo } = result;
    
    // Summary
    const summary = significance === 'significant' || significance === 'highly_significant'
      ? `Your statistical test found a meaningful difference in your data.`
      : `Your statistical test did not find a meaningful difference in your data.`;
    
    // Finding
    const finding = `The ${testName} compared your groups and found that the probability of seeing these results by chance alone is ${(pValue * 100).toFixed(1)}%.`;
    
    // Meaning
    let meaning = '';
    if (significance === 'highly_significant') {
      meaning = 'This is very strong evidence that there is a real difference between your groups.';
    } else if (significance === 'significant') {
      meaning = 'This provides good evidence that there is a real difference between your groups.';
    } else if (significance === 'marginally_significant') {
      meaning = 'This provides weak evidence of a difference. More data might help clarify the relationship.';
    } else {
      meaning = 'We cannot conclude that there is a real difference between your groups based on this data.';
    }
    
    // Effect size interpretation
    if (effectSize) {
      meaning += ` The effect size is ${effectSize.magnitude}, which means the practical importance is ${effectSize.interpretation}.`;
    }
    
    // Confidence
    const confidence = `We can be ${((1 - alpha) * 100).toFixed(0)}% confident in this statistical conclusion.`;
    
    // Limitations
    const limitations = [];
    if (sampleInfo.totalN < 30) {
      limitations.push('Small sample size may limit the generalizability of results');
    }
    if (result.assumptionsChecked?.some(a => !a.met)) {
      limitations.push('Some statistical assumptions were not fully met');
    }
    
    // Recommendations
    const recommendations = [];
    if (significance === 'marginally_significant') {
      recommendations.push('Consider collecting more data to increase statistical power');
    }
    if (effectSize && effectSize.magnitude === 'negligible') {
      recommendations.push('Although statistically significant, the practical impact may be minimal');
    }
    if (!effectSize) {
      recommendations.push('Calculate effect size to understand practical significance');
    }
    
    return {
      summary,
      finding,
      meaning,
      confidence,
      limitations: limitations.length > 0 ? limitations : undefined,
      recommendations: recommendations.length > 0 ? recommendations : undefined,
    };
  }, [result, getSignificanceLevel]);

  // Handle copy to clipboard
  const handleCopyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setSnackbar({ open: true, message: 'Copied to clipboard!' });
    });
  }, []);

  // Handle export
  const handleExport = useCallback((format: string) => {
    if (!onExport || !result) return;
    
    let content = '';
    
    // Generate content based on format
    switch (format) {
      case 'markdown':
        content = `# Statistical Test Results\n\n`;
        content += `## Test: ${result.testName}\n\n`;
        if (generateAPAFormat) {
          content += `### APA Format\n${generateAPAFormat.statistical}\n\n`;
        }
        if (generatePlainLanguage) {
          content += `### Plain Language\n${generatePlainLanguage.summary}\n\n`;
          content += `${generatePlainLanguage.finding}\n\n`;
          content += `${generatePlainLanguage.meaning}\n\n`;
        }
        break;
      
      default:
        content = JSON.stringify({ result, apa: generateAPAFormat, plainLanguage: generatePlainLanguage }, null, 2);
    }
    
    onExport(format, content);
    setSnackbar({ open: true, message: `Exported as ${format.toUpperCase()}` });
  }, [result, generateAPAFormat, generatePlainLanguage, onExport]);

  // Loading state
  if (isLoading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Box sx={{ textAlign: 'center' }}>
          <LinearProgress sx={{ mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            Analyzing test results and generating interpretations...
          </Typography>
        </Box>
      </Paper>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        <Typography variant="subtitle2">Error Loading Results</Typography>
        <Typography variant="body2">{error}</Typography>
        {onRerunTest && (
          <Button
            startIcon={<RerunIcon />}
            onClick={onRerunTest}
            sx={{ mt: 1 }}
            size="small"
          >
            Rerun Test
          </Button>
        )}
      </Alert>
    );
  }

  // Empty state
  if (!result) {
    return (
      <Alert severity="info">
        <Typography variant="subtitle2">No Test Results Available</Typography>
        <Typography variant="body2">
          Please run a statistical test first to see results and interpretations.
        </Typography>
      </Alert>
    );
  }

  const significance = getSignificanceLevel;
  const apaFormat = generateAPAFormat;
  const plainLanguage = generatePlainLanguage;

  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <InsightsIcon color="primary" sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h5">
                {result.testName} Results
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Executed at {new Date(result.executedAt).toLocaleString()}
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {onAdjustParameters && (
              <Button
                startIcon={<SettingsIcon />}
                onClick={onAdjustParameters}
                variant="outlined"
                size="small"
              >
                Adjust
              </Button>
            )}
            {onRerunTest && (
              <Button
                startIcon={<RerunIcon />}
                onClick={onRerunTest}
                variant="outlined"
                size="small"
              >
                Rerun
              </Button>
            )}
            {enableExport && (
              <Button
                startIcon={<ExportIcon />}
                onClick={() => setState(prev => ({ ...prev, exportDialogOpen: true }))}
                variant="contained"
                size="small"
              >
                Export
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Significance Alert */}
      {significance && highlightSignificance && (
        <Alert
          severity={
            significance === 'highly_significant' || significance === 'significant' ? 'success' :
            significance === 'marginally_significant' ? 'warning' : 'info'
          }
          icon={
            significance === 'highly_significant' || significance === 'significant' ? <SignificantIcon /> :
            significance === 'marginally_significant' ? <WarningIcon /> : <NotSignificantIcon />
          }
          sx={{ mb: 2 }}
        >
          <Typography variant="subtitle2">
            {significance === 'highly_significant' && 'Highly Statistically Significant Result'}
            {significance === 'significant' && 'Statistically Significant Result'}
            {significance === 'marginally_significant' && 'Marginally Significant Result'}
            {significance === 'not_significant' && 'Not Statistically Significant'}
          </Typography>
          <Typography variant="body2">
            p-value: {result.pValue < 0.001 ? '< 0.001' : result.pValue.toFixed(4)} 
            (α = {result.alpha})
          </Typography>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={state.activeView}
          onChange={(e, value) => setState(prev => ({ ...prev, activeView: value }))}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Summary" value="summary" icon={<InsightsIcon />} iconPosition="start" />
          {showAPA && <Tab label="APA Format" value="apa" icon={<APAIcon />} iconPosition="start" />}
          {showPlainLanguage && <Tab label="Plain Language" value="plain" icon={<PlainIcon />} iconPosition="start" />}
          {showTechnical && <Tab label="Technical Details" value="technical" icon={<TechnicalIcon />} iconPosition="start" />}
          {showVisualization && <Tab label="Visualization" value="visual" icon={<VisualIcon />} iconPosition="start" />}
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* Summary View */}
          {state.activeView === 'summary' && (
            <ResultSummary
              result={result}
              significance={significance!}
              showEffectSize={true}
              showConfidenceInterval={true}
            />
          )}

          {/* APA Format View */}
          {state.activeView === 'apa' && apaFormat && (
            <APAFormatter
              result={result}
              includeEffectSize={true}
              includeConfidenceInterval={true}
              onCopy={handleCopyToClipboard}
            />
          )}

          {/* Plain Language View */}
          {state.activeView === 'plain' && plainLanguage && (
            <PlainLanguageInterpreter
              result={result}
              context={context}
              audienceLevel={context?.audience || 'general'}
              includeRecommendations={showRecommendations}
            />
          )}

          {/* Technical Details View */}
          {state.activeView === 'technical' && (
            <Box>
              <Grid container spacing={3}>
                {/* Test Statistics */}
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Test Statistics
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">Statistic:</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {result.statisticName} = {result.statistic.toFixed(decimalPlaces)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">p-value:</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {result.pValue < 0.001 ? '< 0.001' : result.pValue.toFixed(4)}
                          </Typography>
                        </Box>
                        {result.degreesOfFreedom && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">Degrees of Freedom:</Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {typeof result.degreesOfFreedom === 'number' 
                                ? result.degreesOfFreedom 
                                : `${result.degreesOfFreedom.numerator}, ${result.degreesOfFreedom.denominator}`}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Effect Size */}
                {result.effectSize && (
                  <Grid item xs={12} md={6}>
                    <EffectSizeDisplay
                      effectSize={result.effectSize}
                      showInterpretation={true}
                      showConfidenceInterval={true}
                      showBenchmarks={true}
                    />
                  </Grid>
                )}

                {/* Power Analysis */}
                {result.powerAnalysis && (
                  <Grid item xs={12} md={6}>
                    <PowerAnalysisDisplay
                      powerAnalysis={result.powerAnalysis}
                      showRecommendations={true}
                      targetPower={0.8}
                    />
                  </Grid>
                )}

                {/* Model Fit */}
                {result.modelFit && (
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Model Fit
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {result.modelFit.rSquared !== undefined && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="text.secondary">R²:</Typography>
                              <Typography variant="body2" fontWeight="bold">
                                {result.modelFit.rSquared.toFixed(3)}
                              </Typography>
                            </Box>
                          )}
                          {result.modelFit.adjustedRSquared !== undefined && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="text.secondary">Adjusted R²:</Typography>
                              <Typography variant="body2" fontWeight="bold">
                                {result.modelFit.adjustedRSquared.toFixed(3)}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>

              {/* Assumptions */}
              {showAssumptions && result.assumptionsChecked && (
                <Box sx={{ mt: 3 }}>
                  <AssumptionsDisplay
                    assumptions={result.assumptionsChecked}
                    showRemediation={true}
                  />
                </Box>
              )}

              {/* Multiple Comparisons */}
              {result.multipleComparisons && (
                <Box sx={{ mt: 3 }}>
                  <MultipleComparisonsTable
                    comparisons={result.multipleComparisons}
                    showAdjusted={true}
                    highlightSignificant={true}
                  />
                </Box>
              )}
            </Box>
          )}

          {/* Visualization View */}
          {state.activeView === 'visual' && showVisualization && (
            <ResultVisualization
              result={result}
              type={state.selectedVisualization}
              interactive={true}
              downloadable={true}
            />
          )}
        </Box>
      </Paper>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
};

export default InterpretationEngine;