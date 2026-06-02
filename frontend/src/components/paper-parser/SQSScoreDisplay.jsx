/**
 * Statistical Quality Score (SQS) Display Component
 *
 * Displays the SQS analysis results from the backend API.
 * Shows score breakdown, recommendations, and journal-ready summary.
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  Alert,
  AlertTitle,
  Chip,
  LinearProgress,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme,
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Download as DownloadIcon,
  Science as ScienceIcon,
  LocalHospital as MedicalIcon,
  Psychology as PsychologyIcon,
  Nature as EcologyIcon,
  TrendingUp as EconomicsIcon
} from '@mui/icons-material';

// API configuration
const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:8000/api') + '/v1';

/**
 * Grade color mapping
 */
const getGradeColors = (theme) => ({
  'A': theme.palette.success.main,
  'B': theme.palette.success.light,
  'C': theme.palette.warning.main,
  'D': theme.palette.warning.dark,
  'F': theme.palette.error.main,
});

/**
 * Field icons mapping
 */
const FIELD_ICONS = {
  'psychology': <PsychologyIcon />,
  'medicine': <MedicalIcon />,
  'biology': <ScienceIcon />,
  'ecology': <EcologyIcon />,
  'economics': <EconomicsIcon />,
  'general': <AssessmentIcon />
};

/**
 * Circular Score Display Component
 */
const ScoreCircle = ({ score, grade, size = 140 }) => {
  const theme = useTheme();
  const gradeColors = getGradeColors(theme);
  const gradeColor = gradeColors[grade] || theme.palette.grey[600];

  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <CircularProgress
        variant="determinate"
        value={score}
        size={size}
        thickness={4}
        sx={{
          color: gradeColor,
          '& .MuiCircularProgress-circle': {
            strokeLinecap: 'round'
          }
        }}
      />
      <Box
        sx={{
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column'
        }}
      >
        <Typography
          variant="h2"
          component="div"
          sx={{ fontWeight: 'bold', color: gradeColor, lineHeight: 1 }}
        >
          {grade}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {Math.round(score)}/100
        </Typography>
      </Box>
    </Box>
  );
};

/**
 * Category Score Bar Component
 */
const CategoryScoreBar = ({ name, score, maxScore, percentage, status }) => {
  const theme = useTheme();
  const statusColors = {
    'excellent': theme.palette.success.main,
    'good': theme.palette.success.light,
    'needs_improvement': theme.palette.warning.main,
    'poor': theme.palette.error.main,
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {score.toFixed(1)}/{maxScore} ({Math.round(percentage)}%)
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={Math.min(percentage, 100)}
        sx={{
          height: 8,
          borderRadius: 4,
          bgcolor: 'grey.200',
          '& .MuiLinearProgress-bar': {
            borderRadius: 4,
            bgcolor: statusColors[status] || theme.palette.primary.main
          }
        }}
      />
    </Box>
  );
};

/**
 * Main SQS Score Display Component
 */
const SQSScoreDisplay = ({ extractedText, paperData, onAnalysisComplete }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  // State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedField, setSelectedField] = useState('general');

  // Available fields
  const fields = [
    { id: 'general', name: 'General Research' },
    { id: 'psychology', name: 'Psychology' },
    { id: 'medicine', name: 'Medicine / Clinical' },
    { id: 'biology', name: 'Biology' },
    { id: 'ecology', name: 'Ecology' },
    { id: 'economics', name: 'Economics' }
  ];

  /**
   * Analyze manuscript using backend API
   */
  const analyzeManuscript = async () => {
    if (!extractedText || extractedText.length < 100) {
      setError('Insufficient text extracted from manuscript. Please ensure the PDF contains readable text.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/sqs/analyze-text/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: extractedText,
          field: selectedField
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze manuscript');
      }

      const result = await response.json();
      setAnalysisResult(result);

      if (onAnalysisComplete) {
        onAnalysisComplete(result);
      }

    } catch (err) {
      console.error('SQS Analysis error:', err);
      setError(err.message || 'An error occurred during analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Download report as text file
   */
  const handleDownloadReport = () => {
    if (!analysisResult || !analysisResult.text_report) return;

    const blob = new Blob([analysisResult.text_report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sqs_report_${paperData?.filename?.replace('.pdf', '') || 'manuscript'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Get severity icon
   */
  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <ErrorIcon sx={{ color: theme.palette.error.main }} />;
      case 'important':
        return <WarningIcon sx={{ color: theme.palette.warning.main }} />;
      case 'suggested':
        return <InfoIcon sx={{ color: theme.palette.info.main }} />;
      default:
        return <InfoIcon color="disabled" />;
    }
  };

  return (
    <Box>
      {/* Header and Field Selection */}
      {!analysisResult && (
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <AssessmentIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                Statistical Quality Score (SQS)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Journal-ready statistical reporting quality assessment
              </Typography>
            </Box>
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            <AlertTitle>About SQS</AlertTitle>
            The Statistical Quality Score evaluates your manuscript against 50+ criteria across 6 categories:
            effect sizes, assumptions, sample/power, precision, reproducibility, and guideline compliance.
          </Alert>

          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Research Field</InputLabel>
                <Select
                  value={selectedField}
                  onChange={(e) => setSelectedField(e.target.value)}
                  label="Research Field"
                  disabled={isAnalyzing}
                >
                  {fields.map(field => (
                    <MenuItem key={field.id} value={field.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {FIELD_ICONS[field.id]}
                        {field.name}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={analyzeManuscript}
                disabled={isAnalyzing || !extractedText}
                startIcon={isAnalyzing ? <CircularProgress size={20} color="inherit" /> : <AssessmentIcon />}
              >
                {isAnalyzing ? 'Analyzing...' : 'Calculate SQS Score'}
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          <AlertTitle>Analysis Error</AlertTitle>
          {error}
        </Alert>
      )}

      {/* Results Display */}
      {analysisResult && (
        <>
          {/* Score Overview */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <Card elevation={3}>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Statistical Quality Score
                  </Typography>
                  <ScoreCircle
                    score={analysisResult.percentage}
                    grade={analysisResult.grade}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Field: {selectedField.charAt(0).toUpperCase() + selectedField.slice(1)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={8}>
              <Card elevation={3}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Category Breakdown
                  </Typography>
                  {Object.entries(analysisResult.category_scores).map(([key, cat]) => (
                    <CategoryScoreBar
                      key={key}
                      name={cat.name}
                      score={cat.score}
                      maxScore={cat.max_score}
                      percentage={cat.percentage}
                      status={cat.status}
                    />
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Findings Summary */}
          <Card elevation={2} sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Findings Summary
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip
                    icon={<CheckIcon />}
                    label={`${analysisResult.findings_summary.found} Found`}
                    color="success"
                    size="small"
                  />
                  <Chip
                    icon={<WarningIcon />}
                    label={`${analysisResult.findings_summary.missing} Missing`}
                    color="warning"
                    size="small"
                  />
                  {analysisResult.findings_summary.critical_missing > 0 && (
                    <Chip
                      icon={<ErrorIcon />}
                      label={`${analysisResult.findings_summary.critical_missing} Critical`}
                      color="error"
                      size="small"
                    />
                  )}
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Top Recommendations
              </Typography>
              <List dense>
                {analysisResult.top_recommendations.slice(0, 8).map((rec, index) => (
                  <ListItem key={index} sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {getSeverityIcon(rec.includes('[CRITICAL]') ? 'critical' : rec.includes('[IMPORTANT]') ? 'important' : 'suggested')}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body2">
                          {rec.replace('[CRITICAL] ', '').replace('[IMPORTANT] ', '').replace('[SUGGESTED] ', '')}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>

          {/* Journal Summary */}
          <Card elevation={2} sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Journal-Ready Summary
              </Typography>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  bgcolor: theme.palette.grey[isDarkMode ? 800 : 100],
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  fontSize: '0.875rem'
                }}
              >
                {analysisResult.journal_summary}
              </Paper>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadReport}
            >
              Download Full Report
            </Button>
            <Button
              variant="outlined"
              onClick={() => setAnalysisResult(null)}
            >
              Analyze with Different Field
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
};

export default SQSScoreDisplay;
