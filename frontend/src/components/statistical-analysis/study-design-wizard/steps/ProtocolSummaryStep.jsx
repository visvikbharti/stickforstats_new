/**
 * Protocol Summary Step
 *
 * Step 6 of the Study Design Wizard.
 * Generates a comprehensive study protocol document that can be exported.
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  Paper,
  Alert,
  Button,
  Divider,
  FormControlLabel,
  Checkbox,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Snackbar,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  ExpandMore as ExpandIcon,
  Download as DownloadIcon,
  ContentCopy as CopyIcon,
  CheckCircle as CheckIcon,
  Science as ScienceIcon,
  Psychology as AIIcon,
  Assessment as AssessmentIcon,
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  Description as ProtocolIcon,
  Article as ArticleIcon,
} from '@mui/icons-material';

/**
 * Format date for display
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Generate methods section text
 */
function generateMethodsSection(data) {
  const { studyType, variables, testSelection, powerAnalysis, feasibility } = data;

  const paragraphs = [];

  // Design paragraph
  const designMap = {
    between: 'between-subjects',
    within: 'within-subjects (repeated measures)',
    mixed: 'mixed factorial',
    correlational: 'correlational',
    regression: 'regression',
  };

  paragraphs.push(
    `This study employed a ${designMap[studyType.design] || studyType.design} design` +
    (studyType.purpose === 'confirmatory' ? ' to test pre-specified hypotheses' :
     studyType.purpose === 'exploratory' ? ' for exploratory analysis' :
     ' to replicate previous findings') +
    `.`
  );

  // Variables paragraph
  if (variables.independentVariables.length > 0) {
    const ivNames = variables.independentVariables.map(v =>
      `${v.name} (${v.type}${v.levels?.length ? `: ${v.levels.join(', ')}` : ''})`
    ).join('; ');
    paragraphs.push(`The independent variable(s) were: ${ivNames}.`);
  }

  if (variables.dependentVariables.length > 0) {
    const dvNames = variables.dependentVariables.map(v =>
      `${v.name} (${v.type})`
    ).join('; ');
    paragraphs.push(`The dependent variable(s) were: ${dvNames}.`);
  }

  if (variables.covariates.length > 0) {
    const covNames = variables.covariates.map(v => v.name).join(', ');
    paragraphs.push(`The following covariates were included: ${covNames}.`);
  }

  // Power analysis paragraph
  if (powerAnalysis.calculatedSampleSize) {
    paragraphs.push(
      `A priori power analysis (conducted using StickForStats, based on G*Power methodology) ` +
      `indicated that a minimum sample size of ${powerAnalysis.sampleSizePerGroup} participants per group ` +
      `(${powerAnalysis.totalSampleSize} total) was required to detect a ` +
      `${powerAnalysis.effectSize >= 0.8 ? 'large' : powerAnalysis.effectSize >= 0.5 ? 'medium' : 'small'} ` +
      `effect (${powerAnalysis.effectSizeType} = ${powerAnalysis.effectSize?.toFixed(2)}) ` +
      `with ${(powerAnalysis.power * 100).toFixed(0)}% power at α = ${powerAnalysis.alpha}.`
    );

    if (feasibility.attritionRate > 0) {
      paragraphs.push(
        `Accounting for an anticipated ${(feasibility.attritionRate * 100).toFixed(0)}% attrition rate, ` +
        `we aimed to recruit ${feasibility.adjustedSampleSize || Math.ceil(powerAnalysis.totalSampleSize / (1 - feasibility.attritionRate))} participants.`
      );
    }
  }

  // Statistical analysis paragraph
  if (testSelection.selectedTest) {
    const testNames = {
      'independent-t': 'independent samples t-test',
      'paired-t': 'paired samples t-test',
      'one-sample-t': 'one-sample t-test',
      'one-way-anova': 'one-way analysis of variance (ANOVA)',
      'repeated-measures-anova': 'repeated measures ANOVA',
      'factorial-anova': 'factorial ANOVA',
      'mixed-anova': 'mixed ANOVA',
      'pearson': 'Pearson correlation',
      'spearman': 'Spearman rank correlation',
      'linear-regression': 'linear regression',
      'multiple-regression': 'multiple regression',
      'chi-square': 'chi-square test',
      'mann-whitney': 'Mann-Whitney U test',
      'kruskal-wallis': 'Kruskal-Wallis H test',
    };

    paragraphs.push(
      `Data were analyzed using ${testNames[testSelection.selectedTest] || testSelection.selectedTest}. ` +
      `Statistical assumptions (${testSelection.assumptions?.join(', ') || 'normality, homogeneity of variance'}) ` +
      `were checked prior to analysis using the Guardian Statistical Protection System. ` +
      `Statistical significance was set at α = ${powerAnalysis.alpha || 0.05}. ` +
      `Effect sizes were calculated and reported. ` +
      `All analyses were conducted using StickForStats v1.0.`
    );
  }

  return paragraphs.join('\n\n');
}

/**
 * Generate full protocol document
 */
function generateProtocolDocument(data) {
  const { protocol, studyType, variables, testSelection, powerAnalysis, feasibility } = data;

  const sections = [];

  // Title
  sections.push(`# ${protocol.title || 'Study Protocol'}`);
  sections.push('');

  // Metadata
  if (protocol.authors) sections.push(`**Authors:** ${protocol.authors}`);
  if (protocol.institution) sections.push(`**Institution:** ${protocol.institution}`);
  sections.push(`**Date Created:** ${formatDate(protocol.dateCreated)}`);
  if (protocol.preregistration) {
    sections.push(`**Pre-registered:** Yes${protocol.preregistrationPlatform ? ` (${protocol.preregistrationPlatform})` : ''}`);
  }
  sections.push('');

  // Study Design
  sections.push('## Study Design');
  sections.push(`- **Design Type:** ${studyType.design}`);
  sections.push(`- **Purpose:** ${studyType.purpose}`);
  if (studyType.setting) sections.push(`- **Setting:** ${studyType.setting}`);
  if (studyType.participants) sections.push(`- **Participant Type:** ${studyType.participants}`);
  sections.push('');

  // Variables
  sections.push('## Variables');

  if (variables.independentVariables.length > 0) {
    sections.push('### Independent Variables');
    variables.independentVariables.forEach(v => {
      sections.push(`- **${v.name}** (${v.type})${v.levels?.length ? `: ${v.levels.join(', ')}` : ''}`);
      if (v.description) sections.push(`  - ${v.description}`);
    });
    sections.push('');
  }

  if (variables.dependentVariables.length > 0) {
    sections.push('### Dependent Variables');
    variables.dependentVariables.forEach(v => {
      sections.push(`- **${v.name}** (${v.type})`);
      if (v.description) sections.push(`  - ${v.description}`);
    });
    sections.push('');
  }

  if (variables.covariates.length > 0) {
    sections.push('### Covariates');
    variables.covariates.forEach(v => {
      sections.push(`- **${v.name}** (${v.type})`);
    });
    sections.push('');
  }

  // Hypothesis
  if (variables.hypothesis) {
    sections.push('## Hypothesis');
    sections.push(variables.hypothesis);
    sections.push(`- **Direction:** ${variables.hypothesisType}`);
    sections.push('');
  }

  // Statistical Analysis Plan
  sections.push('## Statistical Analysis Plan');
  sections.push(`- **Primary Test:** ${testSelection.selectedTest?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Not specified'}`);
  sections.push(`- **Test Family:** ${testSelection.testFamily}`);
  if (testSelection.assumptions?.length) {
    sections.push('- **Assumptions to Check:**');
    testSelection.assumptions.forEach(a => sections.push(`  - ${a}`));
  }
  if (testSelection.rationale) {
    sections.push(`- **Rationale:** ${testSelection.rationale}`);
  }
  sections.push('');

  // Power Analysis
  sections.push('## Power Analysis');
  sections.push(`- **Required Sample Size:** ${powerAnalysis.sampleSizePerGroup || '—'} per group (${powerAnalysis.totalSampleSize || '—'} total)`);
  sections.push(`- **Effect Size:** ${powerAnalysis.effectSizeType} = ${powerAnalysis.effectSize?.toFixed(2) || '—'}`);
  sections.push(`- **Statistical Power:** ${powerAnalysis.power ? (powerAnalysis.power * 100).toFixed(0) + '%' : '—'}`);
  sections.push(`- **Alpha Level:** ${powerAnalysis.alpha || 0.05}`);
  sections.push(`- **Number of Groups:** ${powerAnalysis.numberOfGroups || '—'}`);
  sections.push('');

  // Feasibility
  if (feasibility.adjustedSampleSize) {
    sections.push('## Feasibility Assessment');
    sections.push(`- **Recruitment Target:** ${feasibility.adjustedSampleSize} participants`);
    sections.push(`- **Expected Attrition:** ${(feasibility.attritionRate * 100).toFixed(0)}%`);
    sections.push(`- **Available Participants:** ${feasibility.availableParticipants || 'Not specified'}`);
    sections.push(`- **Feasibility Status:** ${feasibility.feasibilityStatus}`);
    if (feasibility.constraints?.length) {
      sections.push('- **Identified Constraints:**');
      feasibility.constraints.forEach(c => sections.push(`  - ${c}`));
    }
    sections.push('');
  }

  // Methods Section Draft
  sections.push('## Methods Section Draft');
  sections.push('');
  sections.push(generateMethodsSection(data));
  sections.push('');

  // Notes
  if (protocol.notes) {
    sections.push('## Additional Notes');
    sections.push(protocol.notes);
    sections.push('');
  }

  // Footer
  sections.push('---');
  sections.push(`*Protocol generated by StickForStats Study Design Wizard on ${formatDate(new Date().toISOString())}*`);

  return sections.join('\n');
}

/**
 * Protocol Summary Step Component
 */
const ProtocolSummaryStep = ({ data, updateData, errors }) => {
  const { protocol, studyType, variables, testSelection, powerAnalysis, feasibility } = data;

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  /**
   * Handle field change
   */
  const handleChange = (field) => (event) => {
    updateData('protocol', { [field]: event.target.value });
  };

  /**
   * Handle checkbox change
   */
  const handleCheckboxChange = (field) => (event) => {
    updateData('protocol', { [field]: event.target.checked });
  };

  /**
   * Generate methods section
   */
  const methodsSection = useMemo(() => {
    return generateMethodsSection(data);
  }, [data]);

  /**
   * Generate full protocol
   */
  const fullProtocol = useMemo(() => {
    return generateProtocolDocument(data);
  }, [data]);

  /**
   * Copy to clipboard
   */
  const copyToClipboard = useCallback(async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setSnackbarMessage(`${label} copied to clipboard!`);
      setSnackbarOpen(true);
    } catch (err) {
      console.error('Copy failed:', err);
      setSnackbarMessage('Failed to copy. Please select and copy manually.');
      setSnackbarOpen(true);
    }
  }, []);

  /**
   * Download protocol as markdown
   */
  const downloadProtocol = useCallback(() => {
    const blob = new Blob([fullProtocol], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `study_protocol_${protocol.title?.replace(/\s+/g, '_').toLowerCase() || 'untitled'}_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setSnackbarMessage('Protocol downloaded!');
    setSnackbarOpen(true);
  }, [fullProtocol, protocol.title]);

  return (
    <Box>
      {/* Guidance */}
      <Alert severity="success" sx={{ mb: 3 }} icon={<CheckIcon />}>
        <Typography variant="body2">
          <strong>Final Step!</strong> Review your study protocol, add any final details,
          and export for pre-registration or grant applications.
        </Typography>
      </Alert>

      {errors.title && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errors.title}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Protocol Metadata */}
        <Grid item xs={12}>
          <Paper elevation={1} sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              <ArticleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Protocol Information
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Study Title *"
                  value={protocol.title}
                  onChange={handleChange('title')}
                  placeholder="e.g., Effects of Mindfulness on Anxiety in College Students"
                  error={!!errors.title}
                  helperText={errors.title}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Author(s)"
                  value={protocol.authors}
                  onChange={handleChange('authors')}
                  placeholder="e.g., Smith, J., Jones, M."
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Institution"
                  value={protocol.institution}
                  onChange={handleChange('institution')}
                  placeholder="e.g., University of XYZ"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', height: '100%' }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={protocol.preregistration}
                        onChange={handleCheckboxChange('preregistration')}
                      />
                    }
                    label="Pre-registration planned"
                  />
                  {protocol.preregistration && (
                    <TextField
                      size="small"
                      label="Platform"
                      value={protocol.preregistrationPlatform}
                      onChange={handleChange('preregistrationPlatform')}
                      placeholder="e.g., OSF, AsPredicted"
                      sx={{ minWidth: 150 }}
                    />
                  )}
                </Box>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Additional Notes"
                  value={protocol.notes}
                  onChange={handleChange('notes')}
                  placeholder="Any additional notes or comments about the study..."
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Study Summary */}
        <Grid item xs={12}>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandIcon />}>
              <Typography variant="subtitle1" fontWeight={600}>
                <ScienceIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Study Summary
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <ScienceIcon color="primary" />
                      <Typography variant="body2" color="text.secondary">Design</Typography>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {studyType.design?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '—'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <AssessmentIcon color="primary" />
                      <Typography variant="body2" color="text.secondary">Statistical Test</Typography>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {testSelection.selectedTest?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '—'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <PeopleIcon color="primary" />
                      <Typography variant="body2" color="text.secondary">Sample Size</Typography>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {feasibility.adjustedSampleSize || powerAnalysis.totalSampleSize || '—'} total
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <ScheduleIcon color="primary" />
                      <Typography variant="body2" color="text.secondary">Status</Typography>
                      <Chip
                        label={feasibility.feasibilityStatus || 'Pending'}
                        size="small"
                        color={
                          feasibility.feasibilityStatus === 'feasible' ? 'success' :
                          feasibility.feasibilityStatus === 'marginal' ? 'warning' : 'default'
                        }
                      />
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Variables Table */}
              <Typography variant="subtitle2" fontWeight={600} sx={{ mt: 3, mb: 1 }}>
                Variables
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Role</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Levels</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {variables.independentVariables.map((v, i) => (
                      <TableRow key={`iv-${i}`}>
                        <TableCell><Chip label="IV" size="small" color="primary" /></TableCell>
                        <TableCell>{v.name}</TableCell>
                        <TableCell>{v.type}</TableCell>
                        <TableCell>{v.levels?.join(', ') || '—'}</TableCell>
                      </TableRow>
                    ))}
                    {variables.dependentVariables.map((v, i) => (
                      <TableRow key={`dv-${i}`}>
                        <TableCell><Chip label="DV" size="small" color="success" /></TableCell>
                        <TableCell>{v.name}</TableCell>
                        <TableCell>{v.type}</TableCell>
                        <TableCell>{v.levels?.join(', ') || '—'}</TableCell>
                      </TableRow>
                    ))}
                    {variables.covariates.map((v, i) => (
                      <TableRow key={`cov-${i}`}>
                        <TableCell><Chip label="Covariate" size="small" color="warning" /></TableCell>
                        <TableCell>{v.name}</TableCell>
                        <TableCell>{v.type}</TableCell>
                        <TableCell>—</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Methods Section Draft */}
        <Grid item xs={12}>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandIcon />}>
              <Typography variant="subtitle1" fontWeight={600}>
                <ProtocolIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Methods Section Draft
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="caption">
                  This is an automatically generated draft. Review and edit as needed before use.
                </Typography>
              </Alert>

              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  bgcolor: 'background.default',
                  fontFamily: 'serif',
                  fontSize: '0.95rem',
                  lineHeight: 1.8,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {methodsSection}
              </Paper>

              <Button
                variant="outlined"
                startIcon={<CopyIcon />}
                onClick={() => copyToClipboard(methodsSection, 'Methods section')}
                sx={{ mt: 2 }}
              >
                Copy Methods Section
              </Button>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Export Options */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3, bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.12 : 0.08) }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              <DownloadIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Export Protocol
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Download your complete study protocol for pre-registration or reference.
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={downloadProtocol}
              >
                Download Protocol (Markdown)
              </Button>
              <Button
                variant="outlined"
                startIcon={<CopyIcon />}
                onClick={() => copyToClipboard(fullProtocol, 'Full protocol')}
              >
                Copy Full Protocol
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Box>
  );
};

export default ProtocolSummaryStep;
