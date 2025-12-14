/**
 * Methods Section Generator
 *
 * Generates publication-ready statistical methods sections in APA format.
 * Collects study details and calls the AI backend to produce formatted output.
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stepper,
  Step,
  StepLabel,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Divider,
  Card,
  CardContent,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  NavigateNext,
  NavigateBefore,
  Description,
  ContentCopy,
  Check,
  Add,
  Delete,
  ExpandMore,
  Download,
  Science,
  People,
  Assessment,
  Settings,
} from '@mui/icons-material';

const STUDY_DESIGNS = [
  'Between-subjects experimental',
  'Within-subjects experimental',
  'Mixed design (between + within)',
  'Cross-sectional observational',
  'Longitudinal observational',
  'Case-control',
  'Cohort study',
  'Randomized controlled trial (RCT)',
  'Quasi-experimental',
  'Survey/Questionnaire study',
  'Meta-analysis',
  'Other',
];

const STATISTICAL_TESTS = [
  { id: 'independent-t', name: 'Independent Samples t-test', category: 'Comparison' },
  { id: 'paired-t', name: 'Paired Samples t-test', category: 'Comparison' },
  { id: 'one-sample-t', name: 'One-Sample t-test', category: 'Comparison' },
  { id: 'one-way-anova', name: 'One-Way ANOVA', category: 'Comparison' },
  { id: 'two-way-anova', name: 'Two-Way ANOVA', category: 'Comparison' },
  { id: 'rm-anova', name: 'Repeated Measures ANOVA', category: 'Comparison' },
  { id: 'mixed-anova', name: 'Mixed ANOVA', category: 'Comparison' },
  { id: 'ancova', name: 'ANCOVA', category: 'Comparison' },
  { id: 'manova', name: 'MANOVA', category: 'Comparison' },
  { id: 'mann-whitney', name: 'Mann-Whitney U Test', category: 'Non-parametric' },
  { id: 'wilcoxon', name: 'Wilcoxon Signed-Rank Test', category: 'Non-parametric' },
  { id: 'kruskal-wallis', name: 'Kruskal-Wallis H Test', category: 'Non-parametric' },
  { id: 'friedman', name: 'Friedman Test', category: 'Non-parametric' },
  { id: 'pearson', name: 'Pearson Correlation', category: 'Relationship' },
  { id: 'spearman', name: 'Spearman Correlation', category: 'Relationship' },
  { id: 'linear-reg', name: 'Linear Regression', category: 'Regression' },
  { id: 'multiple-reg', name: 'Multiple Regression', category: 'Regression' },
  { id: 'logistic-reg', name: 'Logistic Regression', category: 'Regression' },
  { id: 'chi-square', name: 'Chi-Square Test', category: 'Categorical' },
  { id: 'fisher-exact', name: "Fisher's Exact Test", category: 'Categorical' },
];

const ALPHA_LEVELS = ['0.05', '0.01', '0.001', '0.10'];

const CORRECTIONS = [
  'None',
  'Bonferroni',
  'Holm-Bonferroni',
  'Benjamini-Hochberg (FDR)',
  'Tukey HSD',
  'Scheffé',
  'Dunnett',
];

const steps = ['Study Design', 'Participants', 'Variables', 'Statistical Tests', 'Generate'];

const MethodsSectionGenerator = ({ onGenerate, onClose }) => {
  // Stepper state
  const [activeStep, setActiveStep] = useState(0);

  // Form state
  const [studyDesign, setStudyDesign] = useState('');
  const [customDesign, setCustomDesign] = useState('');
  const [participants, setParticipants] = useState({
    n: '',
    description: '',
    recruitment: '',
    inclusionCriteria: '',
    exclusionCriteria: '',
  });
  const [variables, setVariables] = useState([
    { name: '', type: 'continuous', role: 'dependent' },
  ]);
  const [selectedTests, setSelectedTests] = useState([]);
  const [alphaLevel, setAlphaLevel] = useState('0.05');
  const [corrections, setCorrections] = useState(['None']);
  const [assumptionChecks, setAssumptionChecks] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Output state
  const [generatedMethods, setGeneratedMethods] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Variable management
  const addVariable = () => {
    setVariables([...variables, { name: '', type: 'continuous', role: 'independent' }]);
  };

  const removeVariable = (index) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  const updateVariable = (index, field, value) => {
    const updated = [...variables];
    updated[index][field] = value;
    setVariables(updated);
  };

  // Test selection
  const toggleTest = (testId) => {
    if (selectedTests.includes(testId)) {
      setSelectedTests(selectedTests.filter((t) => t !== testId));
    } else {
      setSelectedTests([...selectedTests, testId]);
    }
  };

  // Navigation
  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  // Generate methods section
  const handleGenerate = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const testsUsed = selectedTests.map((testId) => {
        const test = STATISTICAL_TESTS.find((t) => t.id === testId);
        return { name: test?.name || testId, purpose: '' };
      });

      const variablesData = variables
        .filter((v) => v.name)
        .map((v) => ({
          name: v.name,
          type: v.type,
          role: v.role,
        }));

      const response = await fetch('/api/v1/ai-advisor/methods-section/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          design: studyDesign === 'Other' ? customDesign : studyDesign,
          participants: {
            n: parseInt(participants.n) || null,
            description: participants.description,
            recruitment: participants.recruitment,
            inclusion_criteria: participants.inclusionCriteria,
            exclusion_criteria: participants.exclusionCriteria,
          },
          variables: variablesData,
          tests_used: testsUsed,
          alpha_level: parseFloat(alphaLevel),
          corrections: corrections.filter((c) => c !== 'None'),
          assumption_checks: assumptionChecks,
          additional_notes: additionalNotes,
          software: 'StickForStats v1.0',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setGeneratedMethods(data.content);
        if (onGenerate) {
          onGenerate(data.content);
        }
      } else {
        // Fallback to local generation if API fails
        setGeneratedMethods(generateLocalMethods());
      }
    } catch (err) {
      console.error('Methods generation error:', err);
      // Use local generation as fallback
      setGeneratedMethods(generateLocalMethods());
    } finally {
      setIsLoading(false);
    }
  }, [
    studyDesign,
    customDesign,
    participants,
    variables,
    selectedTests,
    alphaLevel,
    corrections,
    assumptionChecks,
    additionalNotes,
    onGenerate,
  ]);

  // Local fallback generation
  const generateLocalMethods = () => {
    const design = studyDesign === 'Other' ? customDesign : studyDesign;
    const testsNames = selectedTests
      .map((id) => STATISTICAL_TESTS.find((t) => t.id === id)?.name)
      .filter(Boolean)
      .join(', ');

    const varsStr = variables
      .filter((v) => v.name)
      .map((v) => `${v.name} (${v.type}, ${v.role})`)
      .join('; ');

    return `## Statistical Analysis

### Participants
${participants.n ? `A total of *N* = ${participants.n} participants` : 'Participants'} ${participants.description ? `(${participants.description})` : ''} were included in the analysis. ${participants.recruitment || ''} ${participants.inclusionCriteria ? `Inclusion criteria: ${participants.inclusionCriteria}.` : ''} ${participants.exclusionCriteria ? `Exclusion criteria: ${participants.exclusionCriteria}.` : ''}

### Study Design
This study employed a ${design || 'research'} design.${varsStr ? ` Variables measured included: ${varsStr}.` : ''}

### Statistical Analysis
${testsNames ? `Statistical analyses included ${testsNames}.` : 'Appropriate statistical tests were conducted.'} All analyses were performed using StickForStats v1.0 with a significance level of α = ${alphaLevel}. ${corrections.filter((c) => c !== 'None').length > 0 ? `Multiple comparison corrections (${corrections.filter((c) => c !== 'None').join(', ')}) were applied where appropriate.` : ''} ${assumptionChecks ? `Assumption checks included ${assumptionChecks}.` : 'Assumptions for all statistical tests were verified prior to analysis.'}

${additionalNotes ? `### Additional Notes\n${additionalNotes}` : ''}

---
*Generated with StickForStats Methods Section Generator*`;
  };

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedMethods);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  // Download as file
  const handleDownload = () => {
    const blob = new Blob([generatedMethods], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'methods_section.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Render step content
  const renderStepContent = (step) => {
    switch (step) {
      case 0: // Study Design
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Science /> Study Design
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Select the type of study design used in your research.
            </Typography>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Study Design</InputLabel>
              <Select
                value={studyDesign}
                onChange={(e) => setStudyDesign(e.target.value)}
                label="Study Design"
              >
                {STUDY_DESIGNS.map((design) => (
                  <MenuItem key={design} value={design}>
                    {design}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {studyDesign === 'Other' && (
              <TextField
                fullWidth
                label="Custom Design Description"
                value={customDesign}
                onChange={(e) => setCustomDesign(e.target.value)}
                placeholder="Describe your study design"
                sx={{ mb: 2 }}
              />
            )}
          </Box>
        );

      case 1: // Participants
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <People /> Participants
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Describe your study participants and recruitment.
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Sample Size (N)"
                  type="number"
                  value={participants.n}
                  onChange={(e) => setParticipants({ ...participants, n: e.target.value })}
                  placeholder="e.g., 120"
                />
              </Grid>
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  label="Participant Description"
                  value={participants.description}
                  onChange={(e) => setParticipants({ ...participants, description: e.target.value })}
                  placeholder="e.g., university students aged 18-25"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Recruitment Method"
                  value={participants.recruitment}
                  onChange={(e) => setParticipants({ ...participants, recruitment: e.target.value })}
                  placeholder="e.g., Participants were recruited via online advertisements"
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Inclusion Criteria"
                  value={participants.inclusionCriteria}
                  onChange={(e) => setParticipants({ ...participants, inclusionCriteria: e.target.value })}
                  placeholder="e.g., Age 18+, fluent in English"
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Exclusion Criteria"
                  value={participants.exclusionCriteria}
                  onChange={(e) => setParticipants({ ...participants, exclusionCriteria: e.target.value })}
                  placeholder="e.g., History of neurological disorders"
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 2: // Variables
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Assessment /> Variables
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Add the variables measured in your study.
            </Typography>

            {variables.map((variable, index) => (
              <Card key={index} sx={{ mb: 2, bgcolor: 'grey.50' }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Variable Name"
                        value={variable.name}
                        onChange={(e) => updateVariable(index, 'name', e.target.value)}
                        placeholder="e.g., Anxiety Score"
                      />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Type</InputLabel>
                        <Select
                          value={variable.type}
                          onChange={(e) => updateVariable(index, 'type', e.target.value)}
                          label="Type"
                        >
                          <MenuItem value="continuous">Continuous</MenuItem>
                          <MenuItem value="categorical">Categorical</MenuItem>
                          <MenuItem value="ordinal">Ordinal</MenuItem>
                          <MenuItem value="binary">Binary</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Role</InputLabel>
                        <Select
                          value={variable.role}
                          onChange={(e) => updateVariable(index, 'role', e.target.value)}
                          label="Role"
                        >
                          <MenuItem value="dependent">Dependent (DV)</MenuItem>
                          <MenuItem value="independent">Independent (IV)</MenuItem>
                          <MenuItem value="covariate">Covariate</MenuItem>
                          <MenuItem value="moderator">Moderator</MenuItem>
                          <MenuItem value="mediator">Mediator</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={2}>
                      <IconButton
                        onClick={() => removeVariable(index)}
                        disabled={variables.length === 1}
                        color="error"
                        size="small"
                      >
                        <Delete />
                      </IconButton>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}

            <Button startIcon={<Add />} onClick={addVariable} variant="outlined" size="small">
              Add Variable
            </Button>
          </Box>
        );

      case 3: // Statistical Tests
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Settings /> Statistical Tests & Settings
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Select the statistical tests used and analysis settings.
            </Typography>

            {/* Tests by category */}
            {['Comparison', 'Non-parametric', 'Relationship', 'Regression', 'Categorical'].map((category) => (
              <Accordion key={category} defaultExpanded={category === 'Comparison'}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="subtitle2">{category} Tests</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {STATISTICAL_TESTS.filter((t) => t.category === category).map((test) => (
                      <Chip
                        key={test.id}
                        label={test.name}
                        onClick={() => toggleTest(test.id)}
                        color={selectedTests.includes(test.id) ? 'primary' : 'default'}
                        variant={selectedTests.includes(test.id) ? 'filled' : 'outlined'}
                        sx={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}

            <Divider sx={{ my: 3 }} />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Alpha Level</InputLabel>
                  <Select
                    value={alphaLevel}
                    onChange={(e) => setAlphaLevel(e.target.value)}
                    label="Alpha Level"
                  >
                    {ALPHA_LEVELS.map((level) => (
                      <MenuItem key={level} value={level}>
                        α = {level}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Multiple Comparison Correction</InputLabel>
                  <Select
                    multiple
                    value={corrections}
                    onChange={(e) => setCorrections(e.target.value)}
                    label="Multiple Comparison Correction"
                    renderValue={(selected) => selected.join(', ')}
                  >
                    {CORRECTIONS.map((correction) => (
                      <MenuItem key={correction} value={correction}>
                        {correction}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Assumption Checks Performed"
                  value={assumptionChecks}
                  onChange={(e) => setAssumptionChecks(e.target.value)}
                  placeholder="e.g., Shapiro-Wilk normality test, Levene's test for homogeneity"
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Additional Notes"
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Any additional information to include in the methods section"
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 4: // Generate
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Description /> Generated Methods Section
            </Typography>

            {!generatedMethods && !isLoading && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  Ready to generate your APA-formatted methods section!
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleGenerate}
                  startIcon={<Description />}
                  sx={{ bgcolor: '#1976d2' }}
                >
                  Generate Methods Section
                </Button>
              </Box>
            )}

            {isLoading && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CircularProgress size={40} />
                <Typography variant="body2" sx={{ mt: 2 }}>
                  Generating your methods section...
                </Typography>
              </Box>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {generatedMethods && (
              <>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
                    <Button
                      startIcon={copied ? <Check /> : <ContentCopy />}
                      onClick={handleCopy}
                      variant="outlined"
                      size="small"
                      color={copied ? 'success' : 'primary'}
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                  </Tooltip>
                  <Button
                    startIcon={<Download />}
                    onClick={handleDownload}
                    variant="outlined"
                    size="small"
                  >
                    Download
                  </Button>
                  <Button
                    onClick={handleGenerate}
                    variant="outlined"
                    size="small"
                    disabled={isLoading}
                  >
                    Regenerate
                  </Button>
                </Box>

                <Paper
                  sx={{
                    p: 3,
                    bgcolor: '#fafafa',
                    border: '1px solid #e0e0e0',
                    maxHeight: 400,
                    overflow: 'auto',
                    fontFamily: 'Georgia, serif',
                    fontSize: '14px',
                    lineHeight: 1.8,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {generatedMethods}
                </Paper>
              </>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Paper elevation={0} sx={{ border: '1px solid #e0e0e0', minHeight: 300 }}>
        {renderStepContent(activeStep)}
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
        <Button
          onClick={handleBack}
          disabled={activeStep === 0}
          startIcon={<NavigateBefore />}
        >
          Back
        </Button>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {onClose && (
            <Button onClick={onClose} variant="outlined">
              Close
            </Button>
          )}
          {activeStep < steps.length - 1 && (
            <Button
              variant="contained"
              onClick={handleNext}
              endIcon={<NavigateNext />}
            >
              Next
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default MethodsSectionGenerator;
