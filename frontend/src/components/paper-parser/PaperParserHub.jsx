/**
 * Paper Parser Hub
 *
 * Main component for analyzing scientific papers for statistical quality.
 * Extracts statistical content, detects common errors, and generates
 * reproducibility reports based on JARS guidelines.
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

import React, { useState, useCallback } from 'react';
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
  Divider,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tab,
  Tabs
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Assessment as AssessmentIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Description as DocumentIcon,
  Analytics as AnalyticsIcon,
  BugReport as BugIcon,
  Lightbulb as LightbulbIcon,
  School as SchoolIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';

// Import utilities
import { extractTextFromPDF, extractSections, isValidPDF, formatFileSize } from './utils/pdfParser';
import { extractStatisticalContent, getPrimarySampleSize } from './utils/statisticalPatterns';
import { detectErrors, getSeverityColor, getSeverityLabel, SEVERITY, CATEGORY } from './utils/errorRules';
import { generateReport, generateTextReport, generateSummaryStatement } from './utils/reportGenerator';

/**
 * Tab Panel Component
 */
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`parser-tabpanel-${index}`}
      aria-labelledby={`parser-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

/**
 * Quality Score Circle Component
 */
function QualityScoreCircle({ score, grade, gradeColor }) {
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <CircularProgress
        variant="determinate"
        value={score}
        size={120}
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
        <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', color: gradeColor }}>
          {grade}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {score}/100
        </Typography>
      </Box>
    </Box>
  );
}

/**
 * Issue Card Component
 */
function IssueCard({ issue }) {
  const severityIcons = {
    [SEVERITY.CRITICAL]: <ErrorIcon sx={{ color: getSeverityColor(SEVERITY.CRITICAL) }} />,
    [SEVERITY.HIGH]: <WarningIcon sx={{ color: getSeverityColor(SEVERITY.HIGH) }} />,
    [SEVERITY.MEDIUM]: <WarningIcon sx={{ color: getSeverityColor(SEVERITY.MEDIUM) }} />,
    [SEVERITY.LOW]: <InfoIcon sx={{ color: getSeverityColor(SEVERITY.LOW) }} />,
    [SEVERITY.INFO]: <InfoIcon sx={{ color: getSeverityColor(SEVERITY.INFO) }} />
  };

  return (
    <Accordion sx={{ mb: 1 }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
          {severityIcons[issue.severity]}
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle2">{issue.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {issue.category.charAt(0).toUpperCase() + issue.category.slice(1)}
            </Typography>
          </Box>
          <Chip
            label={getSeverityLabel(issue.severity)}
            size="small"
            sx={{
              bgcolor: getSeverityColor(issue.severity),
              color: 'white',
              fontWeight: 'bold'
            }}
          />
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Typography variant="body2" paragraph>
          {issue.description}
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          <AlertTitle>Recommendation</AlertTitle>
          {issue.recommendation}
        </Alert>
        {issue.references && issue.references.length > 0 && (
          <Box>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              References:
            </Typography>
            <List dense>
              {issue.references.map((ref, idx) => (
                <ListItem key={idx} sx={{ py: 0 }}>
                  <ListItemIcon sx={{ minWidth: 24 }}>
                    <SchoolIcon fontSize="small" color="disabled" />
                  </ListItemIcon>
                  <ListItemText
                    primary={<Typography variant="caption">{ref}</Typography>}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
        {issue.jarsStandard && (
          <Chip
            label="JARS Standard"
            size="small"
            color="primary"
            variant="outlined"
            sx={{ mt: 1 }}
          />
        )}
      </AccordionDetails>
    </Accordion>
  );
}

/**
 * Main Paper Parser Hub Component
 */
const PaperParserHub = () => {
  // State
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [error, setError] = useState(null);
  const [paperData, setPaperData] = useState(null);
  const [statisticalContent, setStatisticalContent] = useState(null);
  const [detectedIssues, setDetectedIssues] = useState(null);
  const [report, setReport] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  /**
   * Handle file drop
   */
  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];

    if (!file) return;

    // Validate file type
    if (!isValidPDF(file)) {
      setError('Please upload a PDF file.');
      return;
    }

    // Reset state
    setError(null);
    setPaperData(null);
    setStatisticalContent(null);
    setDetectedIssues(null);
    setReport(null);
    setIsProcessing(true);
    setProgress(0);

    try {
      // Step 1: Extract text from PDF
      setProgressMessage('Extracting text from PDF...');
      setProgress(10);
      const extractedData = await extractTextFromPDF(file);

      if (!extractedData.success) {
        throw new Error(extractedData.error || 'Failed to extract text from PDF');
      }

      setPaperData(extractedData);
      setProgress(40);

      // Step 2: Extract statistical content
      setProgressMessage('Identifying statistical content...');
      const sections = extractSections(extractedData.fullText);
      const stats = extractStatisticalContent(extractedData.fullText);

      // Add sections to stats for context
      stats.sections = sections;
      setStatisticalContent(stats);
      setProgress(60);

      // Step 3: Detect errors and issues
      setProgressMessage('Analyzing for common issues...');
      const issues = detectErrors(stats, extractedData.fullText);
      setDetectedIssues(issues);
      setProgress(80);

      // Step 4: Generate report
      setProgressMessage('Generating reproducibility report...');
      const generatedReport = generateReport(extractedData, stats, issues);
      setReport(generatedReport);
      setProgress(100);

      setProgressMessage('Analysis complete!');

    } catch (err) {
      console.error('Paper parsing error:', err);
      setError(err.message || 'An error occurred while processing the paper.');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Dropzone configuration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    disabled: isProcessing
  });

  /**
   * Download report as text file
   */
  const handleDownloadReport = () => {
    if (!report) return;

    const textReport = generateTextReport(report);
    const blob = new Blob([textReport], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reproducibility_report_${paperData.filename.replace('.pdf', '')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Reset and analyze a new paper
   */
  const handleReset = () => {
    setPaperData(null);
    setStatisticalContent(null);
    setDetectedIssues(null);
    setReport(null);
    setError(null);
    setActiveTab(0);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 3, mb: 3, bgcolor: '#f8f9fa' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <AssessmentIcon sx={{ fontSize: 40, color: '#1976d2' }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
              Paper Parser
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Analyze scientific papers for statistical quality and reproducibility
            </Typography>
          </Box>
        </Box>

        <Alert severity="info" sx={{ mt: 2 }}>
          <AlertTitle>How It Works</AlertTitle>
          Upload a scientific paper (PDF) and we'll extract statistical content, identify common reporting
          issues, and generate a reproducibility report based on JARS (Journal Article Reporting Standards).
        </Alert>
      </Paper>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      {/* Upload Zone - Show when no paper loaded */}
      {!paperData && !isProcessing && (
        <Paper
          {...getRootProps()}
          elevation={isDragActive ? 6 : 2}
          sx={{
            p: 6,
            textAlign: 'center',
            cursor: 'pointer',
            border: '2px dashed',
            borderColor: isDragActive ? 'primary.main' : 'grey.300',
            bgcolor: isDragActive ? 'action.hover' : 'background.paper',
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: 'action.hover'
            }
          }}
        >
          <input {...getInputProps()} />
          <UploadIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            {isDragActive ? 'Drop your paper here...' : 'Upload Scientific Paper'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Drag and drop a PDF file, or click to browse
          </Typography>
          <Typography variant="caption" display="block" sx={{ mt: 2, color: 'text.disabled' }}>
            Supported: PDF files only
          </Typography>
        </Paper>
      )}

      {/* Processing Indicator */}
      {isProcessing && (
        <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            {progressMessage}
          </Typography>
          <LinearProgress variant="determinate" value={progress} sx={{ mt: 2, mb: 1 }} />
          <Typography variant="caption" color="text.secondary">
            {progress}% complete
          </Typography>
        </Paper>
      )}

      {/* Results Display */}
      {report && !isProcessing && (
        <>
          {/* Action Bar */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <DocumentIcon color="primary" />
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  {paperData.metadata.title?.substring(0, 60)}
                  {paperData.metadata.title?.length > 60 ? '...' : ''}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {paperData.numPages} pages | {formatFileSize(paperData.fileSize)} | {paperData.statistics.wordCount.toLocaleString()} words
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadReport}
              >
                Download Report
              </Button>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleReset}
              >
                Analyze New Paper
              </Button>
            </Box>
          </Box>

          {/* Quality Summary Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <Card elevation={2}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Quality Score
                  </Typography>
                  <QualityScoreCircle
                    score={report.qualitySummary.score}
                    grade={report.qualitySummary.grade}
                    gradeColor={report.qualitySummary.gradeColor}
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Issues Detected
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                    {report.qualitySummary.breakdown.critical > 0 && (
                      <Chip
                        icon={<ErrorIcon />}
                        label={`${report.qualitySummary.breakdown.critical} Critical`}
                        size="small"
                        sx={{ bgcolor: getSeverityColor(SEVERITY.CRITICAL), color: 'white' }}
                      />
                    )}
                    {report.qualitySummary.breakdown.high > 0 && (
                      <Chip
                        icon={<WarningIcon />}
                        label={`${report.qualitySummary.breakdown.high} High`}
                        size="small"
                        sx={{ bgcolor: getSeverityColor(SEVERITY.HIGH), color: 'white' }}
                      />
                    )}
                    {report.qualitySummary.breakdown.medium > 0 && (
                      <Chip
                        label={`${report.qualitySummary.breakdown.medium} Medium`}
                        size="small"
                        sx={{ bgcolor: getSeverityColor(SEVERITY.MEDIUM), color: 'white' }}
                      />
                    )}
                    {report.qualitySummary.breakdown.low > 0 && (
                      <Chip
                        label={`${report.qualitySummary.breakdown.low} Low`}
                        size="small"
                        sx={{ bgcolor: getSeverityColor(SEVERITY.LOW), color: 'white' }}
                      />
                    )}
                    {report.qualitySummary.totalIssues === 0 && (
                      <Chip
                        icon={<CheckIcon />}
                        label="No Issues Found"
                        size="small"
                        color="success"
                      />
                    )}
                  </Box>
                  <Typography variant="h4" sx={{ mt: 2 }}>
                    {report.qualitySummary.totalIssues}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total issues
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Statistical Content Found
                  </Typography>
                  <Grid container spacing={1} sx={{ mt: 1 }}>
                    <Grid item xs={6}>
                      <Typography variant="body2">P-values</Typography>
                      <Typography variant="h6">{report.statisticalSummary.pValuesFound}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">Test Stats</Typography>
                      <Typography variant="h6">{report.statisticalSummary.testStatisticsFound}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">Effect Sizes</Typography>
                      <Typography variant="h6">{report.statisticalSummary.effectSizesFound}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">Sample Sizes</Typography>
                      <Typography variant="h6">{report.statisticalSummary.sampleSizesFound}</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Summary Statement */}
          <Alert severity={report.qualitySummary.score >= 70 ? 'success' : report.qualitySummary.score >= 50 ? 'warning' : 'error'} sx={{ mb: 3 }}>
            <AlertTitle>Summary</AlertTitle>
            {generateSummaryStatement(report)}
          </Alert>

          {/* Detailed Tabs */}
          <Paper elevation={2} sx={{ mb: 3 }}>
            <Tabs
              value={activeTab}
              onChange={(e, newValue) => setActiveTab(newValue)}
              variant="fullWidth"
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab icon={<BugIcon />} label="Issues" iconPosition="start" />
              <Tab icon={<AnalyticsIcon />} label="Statistics" iconPosition="start" />
              <Tab icon={<LightbulbIcon />} label="Recommendations" iconPosition="start" />
            </Tabs>

            {/* Issues Tab */}
            <TabPanel value={activeTab} index={0}>
              <Box sx={{ p: 2 }}>
                {report.issues.length === 0 ? (
                  <Alert severity="success">
                    <AlertTitle>No Issues Detected</AlertTitle>
                    This paper appears to follow good statistical reporting practices.
                  </Alert>
                ) : (
                  <>
                    <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
                      {report.issues.length} issue(s) detected - sorted by severity
                    </Typography>
                    {report.issues.map((issue, index) => (
                      <IssueCard key={index} issue={issue} />
                    ))}
                  </>
                )}
              </Box>
            </TabPanel>

            {/* Statistics Tab */}
            <TabPanel value={activeTab} index={1}>
              <Box sx={{ p: 2 }}>
                <Grid container spacing={3}>
                  {/* P-Values */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip label={report.extractedStatistics.pValues.length} size="small" color="primary" />
                      P-Values Found
                    </Typography>
                    {report.extractedStatistics.pValues.length > 0 ? (
                      <Box sx={{ maxHeight: 200, overflow: 'auto', bgcolor: '#f5f5f5', p: 1, borderRadius: 1 }}>
                        {report.extractedStatistics.pValues.map((p, i) => (
                          <Chip key={i} label={p} size="small" sx={{ m: 0.5 }} />
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">None found</Typography>
                    )}
                  </Grid>

                  {/* Test Statistics */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip label={report.extractedStatistics.testStatistics.length} size="small" color="primary" />
                      Test Statistics
                    </Typography>
                    {report.extractedStatistics.testStatistics.length > 0 ? (
                      <Box sx={{ maxHeight: 200, overflow: 'auto', bgcolor: '#f5f5f5', p: 1, borderRadius: 1 }}>
                        {report.extractedStatistics.testStatistics.map((stat, i) => (
                          <Chip key={i} label={stat.value} size="small" sx={{ m: 0.5 }} />
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">None found</Typography>
                    )}
                  </Grid>

                  {/* Effect Sizes */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip label={report.extractedStatistics.effectSizes.length} size="small" color="success" />
                      Effect Sizes
                    </Typography>
                    {report.extractedStatistics.effectSizes.length > 0 ? (
                      <Box sx={{ maxHeight: 200, overflow: 'auto', bgcolor: '#f5f5f5', p: 1, borderRadius: 1 }}>
                        {report.extractedStatistics.effectSizes.map((es, i) => (
                          <Chip key={i} label={es} size="small" color="success" sx={{ m: 0.5 }} />
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="error">None found - this is a concern</Typography>
                    )}
                  </Grid>

                  {/* Sample Sizes */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip label={report.extractedStatistics.sampleSizes.length} size="small" color="info" />
                      Sample Sizes
                    </Typography>
                    {report.extractedStatistics.sampleSizes.length > 0 ? (
                      <Box sx={{ maxHeight: 200, overflow: 'auto', bgcolor: '#f5f5f5', p: 1, borderRadius: 1 }}>
                        {report.extractedStatistics.sampleSizes.map((ss, i) => (
                          <Chip key={i} label={`n = ${ss.value}`} size="small" color="info" sx={{ m: 0.5 }} />
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="error">None found - critical gap</Typography>
                    )}
                  </Grid>

                  {/* Tests Identified */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>
                      Statistical Tests Identified
                    </Typography>
                    {report.statisticalSummary.testsIdentified.length > 0 ? (
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {report.statisticalSummary.testsIdentified.map((test, i) => (
                          <Chip key={i} label={test} variant="outlined" />
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">No specific tests identified</Typography>
                    )}
                  </Grid>
                </Grid>
              </Box>
            </TabPanel>

            {/* Recommendations Tab */}
            <TabPanel value={activeTab} index={2}>
              <Box sx={{ p: 2 }}>
                {report.recommendations.length === 0 ? (
                  <Alert severity="success">
                    <AlertTitle>Excellent Work!</AlertTitle>
                    No specific recommendations - this paper follows good reporting practices.
                  </Alert>
                ) : (
                  report.recommendations.map((rec, index) => (
                    <Paper key={index} elevation={1} sx={{ p: 2, mb: 2, borderLeft: `4px solid ${rec.priority === 1 ? '#d32f2f' : rec.priority === 2 ? '#f57c00' : '#1976d2'}` }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label={`Priority ${rec.priority}`} size="small" color={rec.priority === 1 ? 'error' : rec.priority === 2 ? 'warning' : 'primary'} />
                        {rec.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                        {rec.description}
                      </Typography>
                      <List dense>
                        {rec.items.map((item, i) => (
                          <ListItem key={i}>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <LightbulbIcon fontSize="small" color="action" />
                            </ListItemIcon>
                            <ListItemText primary={item} />
                          </ListItem>
                        ))}
                      </List>
                    </Paper>
                  ))
                )}

                {/* JARS Compliance */}
                <Divider sx={{ my: 3 }} />
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SchoolIcon color="primary" />
                  JARS Compliance Estimate
                </Typography>
                <Alert severity={report.jarsCompliance.overallScore >= 70 ? 'success' : report.jarsCompliance.overallScore >= 50 ? 'warning' : 'error'} sx={{ mb: 2 }}>
                  <AlertTitle>{report.jarsCompliance.overallScore}% Compliance</AlertTitle>
                  {report.jarsCompliance.summary}
                </Alert>
                <Typography variant="caption" color="text.secondary">
                  Based on APA JARS (Journal Article Reporting Standards) for quantitative research.
                </Typography>
              </Box>
            </TabPanel>
          </Paper>
        </>
      )}

      {/* Footer */}
      <Paper elevation={1} sx={{ p: 2, bgcolor: '#f8f9fa', textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Paper Parser uses pattern matching to identify statistical content. Results should be verified manually.
          Based on JARS (Journal Article Reporting Standards) and best practices in statistical reporting.
        </Typography>
      </Paper>
    </Box>
  );
};

export default PaperParserHub;
