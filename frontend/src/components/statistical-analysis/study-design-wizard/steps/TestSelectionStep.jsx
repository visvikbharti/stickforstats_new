/**
 * Test Selection Step
 *
 * Step 3 of the Study Design Wizard.
 * Provides intelligent test recommendations based on study design and variables.
 * Includes Guardian-style assumption checking guidance.
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

import React, { useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
  TextField,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Science as ScienceIcon,
  Psychology as AIIcon,
  TrendingUp as ParametricIcon,
  Shuffle as NonParametricIcon,
  Star as StarIcon,
} from '@mui/icons-material';

/**
 * Statistical test database with metadata
 */
const STATISTICAL_TESTS = {
  // Parametric tests for comparing means
  'independent-t': {
    id: 'independent-t',
    name: 'Independent Samples t-test',
    family: 'parametric',
    purpose: 'Compare means of two independent groups',
    assumptions: ['Normality', 'Homogeneity of variance', 'Independence'],
    effectSizeType: 'd',
    effectSizeName: "Cohen's d",
    applicableDesigns: ['between'],
    applicableIVTypes: ['categorical', 'binary'],
    applicableDVTypes: ['continuous'],
    groupRequirement: 2,
    robustAlternative: 'Welch\'s t-test',
    nonParametricAlternative: 'mann-whitney',
  },
  'paired-t': {
    id: 'paired-t',
    name: 'Paired Samples t-test',
    family: 'parametric',
    purpose: 'Compare means from the same participants at two time points',
    assumptions: ['Normality of differences', 'Independence between pairs'],
    effectSizeType: 'd',
    effectSizeName: "Cohen's d",
    applicableDesigns: ['within'],
    applicableIVTypes: ['categorical', 'binary'],
    applicableDVTypes: ['continuous'],
    groupRequirement: 2,
    robustAlternative: null,
    nonParametricAlternative: 'wilcoxon',
  },
  'one-sample-t': {
    id: 'one-sample-t',
    name: 'One-Sample t-test',
    family: 'parametric',
    purpose: 'Compare sample mean to a known population value',
    assumptions: ['Normality', 'Independence'],
    effectSizeType: 'd',
    effectSizeName: "Cohen's d",
    applicableDesigns: ['between'],
    applicableIVTypes: [],
    applicableDVTypes: ['continuous'],
    groupRequirement: 1,
    robustAlternative: null,
    nonParametricAlternative: 'wilcoxon-signed-rank',
  },
  'one-way-anova': {
    id: 'one-way-anova',
    name: 'One-Way ANOVA',
    family: 'parametric',
    purpose: 'Compare means across 3+ independent groups',
    assumptions: ['Normality', 'Homogeneity of variance', 'Independence'],
    effectSizeType: 'f',
    effectSizeName: "Cohen's f (or η²)",
    applicableDesigns: ['between'],
    applicableIVTypes: ['categorical'],
    applicableDVTypes: ['continuous'],
    groupRequirement: '3+',
    robustAlternative: 'Welch\'s ANOVA',
    nonParametricAlternative: 'kruskal-wallis',
  },
  'repeated-measures-anova': {
    id: 'repeated-measures-anova',
    name: 'Repeated Measures ANOVA',
    family: 'parametric',
    purpose: 'Compare means across 3+ related conditions',
    assumptions: ['Normality', 'Sphericity', 'Independence between subjects'],
    effectSizeType: 'f',
    effectSizeName: "Cohen's f (or η²)",
    applicableDesigns: ['within'],
    applicableIVTypes: ['categorical'],
    applicableDVTypes: ['continuous'],
    groupRequirement: '3+',
    robustAlternative: 'Greenhouse-Geisser correction',
    nonParametricAlternative: 'friedman',
  },
  'factorial-anova': {
    id: 'factorial-anova',
    name: 'Factorial ANOVA',
    family: 'parametric',
    purpose: 'Examine main effects and interactions of 2+ IVs',
    assumptions: ['Normality', 'Homogeneity of variance', 'Independence'],
    effectSizeType: 'f',
    effectSizeName: "Partial η²",
    applicableDesigns: ['between', 'mixed'],
    applicableIVTypes: ['categorical'],
    applicableDVTypes: ['continuous'],
    groupRequirement: '2+ factors',
    robustAlternative: null,
    nonParametricAlternative: null,
  },
  'mixed-anova': {
    id: 'mixed-anova',
    name: 'Mixed ANOVA',
    family: 'parametric',
    purpose: 'Analyze designs with both between and within factors',
    assumptions: ['Normality', 'Sphericity', 'Homogeneity of variance'],
    effectSizeType: 'f',
    effectSizeName: "Partial η²",
    applicableDesigns: ['mixed'],
    applicableIVTypes: ['categorical'],
    applicableDVTypes: ['continuous'],
    groupRequirement: '2+ factors',
    robustAlternative: null,
    nonParametricAlternative: null,
  },

  // Correlation tests
  'pearson': {
    id: 'pearson',
    name: 'Pearson Correlation',
    family: 'parametric',
    purpose: 'Measure linear relationship between two continuous variables',
    assumptions: ['Normality', 'Linearity', 'Homoscedasticity'],
    effectSizeType: 'r',
    effectSizeName: "Pearson's r",
    applicableDesigns: ['correlational'],
    applicableIVTypes: [],
    applicableDVTypes: ['continuous'],
    groupRequirement: '2 variables',
    robustAlternative: null,
    nonParametricAlternative: 'spearman',
  },
  'spearman': {
    id: 'spearman',
    name: 'Spearman Correlation',
    family: 'non-parametric',
    purpose: 'Measure monotonic relationship between variables',
    assumptions: ['Monotonic relationship'],
    effectSizeType: 'r',
    effectSizeName: "Spearman's ρ",
    applicableDesigns: ['correlational'],
    applicableIVTypes: [],
    applicableDVTypes: ['continuous', 'ordinal'],
    groupRequirement: '2 variables',
    robustAlternative: null,
    nonParametricAlternative: null,
  },

  // Regression tests
  'linear-regression': {
    id: 'linear-regression',
    name: 'Linear Regression',
    family: 'parametric',
    purpose: 'Predict continuous outcome from predictors',
    assumptions: ['Linearity', 'Normality of residuals', 'Homoscedasticity', 'Independence'],
    effectSizeType: 'f2',
    effectSizeName: "Cohen's f² (or R²)",
    applicableDesigns: ['regression'],
    applicableIVTypes: ['continuous', 'categorical'],
    applicableDVTypes: ['continuous'],
    groupRequirement: '1+ predictors',
    robustAlternative: 'Robust regression',
    nonParametricAlternative: null,
  },
  'multiple-regression': {
    id: 'multiple-regression',
    name: 'Multiple Regression',
    family: 'parametric',
    purpose: 'Predict continuous outcome from multiple predictors',
    assumptions: ['Linearity', 'Normality of residuals', 'Homoscedasticity', 'No multicollinearity'],
    effectSizeType: 'f2',
    effectSizeName: "Cohen's f² (or R²)",
    applicableDesigns: ['regression'],
    applicableIVTypes: ['continuous', 'categorical'],
    applicableDVTypes: ['continuous'],
    groupRequirement: '2+ predictors',
    robustAlternative: 'Robust regression',
    nonParametricAlternative: null,
  },
  'logistic-regression': {
    id: 'logistic-regression',
    name: 'Logistic Regression',
    family: 'parametric',
    purpose: 'Predict binary outcome from predictors',
    assumptions: ['Independence', 'Large sample', 'No multicollinearity'],
    effectSizeType: 'odds_ratio',
    effectSizeName: 'Odds Ratio',
    applicableDesigns: ['regression'],
    applicableIVTypes: ['continuous', 'categorical'],
    applicableDVTypes: ['binary'],
    groupRequirement: '1+ predictors',
    robustAlternative: null,
    nonParametricAlternative: null,
  },

  // Non-parametric tests
  'mann-whitney': {
    id: 'mann-whitney',
    name: 'Mann-Whitney U Test',
    family: 'non-parametric',
    purpose: 'Compare distributions of two independent groups',
    assumptions: ['Similar distribution shapes', 'Independence'],
    effectSizeType: 'r',
    effectSizeName: 'Rank-biserial r',
    applicableDesigns: ['between'],
    applicableIVTypes: ['categorical', 'binary'],
    applicableDVTypes: ['continuous', 'ordinal'],
    groupRequirement: 2,
    robustAlternative: null,
    nonParametricAlternative: null,
  },
  'wilcoxon': {
    id: 'wilcoxon',
    name: 'Wilcoxon Signed-Rank Test',
    family: 'non-parametric',
    purpose: 'Compare related samples (non-parametric paired test)',
    assumptions: ['Symmetric distribution of differences'],
    effectSizeType: 'r',
    effectSizeName: 'Rank-biserial r',
    applicableDesigns: ['within'],
    applicableIVTypes: ['categorical', 'binary'],
    applicableDVTypes: ['continuous', 'ordinal'],
    groupRequirement: 2,
    robustAlternative: null,
    nonParametricAlternative: null,
  },
  'kruskal-wallis': {
    id: 'kruskal-wallis',
    name: 'Kruskal-Wallis H Test',
    family: 'non-parametric',
    purpose: 'Compare distributions of 3+ independent groups',
    assumptions: ['Similar distribution shapes', 'Independence'],
    effectSizeType: 'eta2',
    effectSizeName: 'Epsilon-squared (ε²)',
    applicableDesigns: ['between'],
    applicableIVTypes: ['categorical'],
    applicableDVTypes: ['continuous', 'ordinal'],
    groupRequirement: '3+',
    robustAlternative: null,
    nonParametricAlternative: null,
  },
  'friedman': {
    id: 'friedman',
    name: 'Friedman Test',
    family: 'non-parametric',
    purpose: 'Compare distributions of 3+ related conditions',
    assumptions: ['Independence between subjects'],
    effectSizeType: 'w',
    effectSizeName: 'Kendall\'s W',
    applicableDesigns: ['within'],
    applicableIVTypes: ['categorical'],
    applicableDVTypes: ['continuous', 'ordinal'],
    groupRequirement: '3+',
    robustAlternative: null,
    nonParametricAlternative: null,
  },

  // Chi-square tests
  'chi-square': {
    id: 'chi-square',
    name: 'Chi-Square Test',
    family: 'non-parametric',
    purpose: 'Test association between categorical variables',
    assumptions: ['Expected frequency ≥ 5 in each cell', 'Independence'],
    effectSizeType: 'w',
    effectSizeName: "Cramér's V (or Cohen's w)",
    applicableDesigns: ['between', 'correlational'],
    applicableIVTypes: ['categorical'],
    applicableDVTypes: ['categorical'],
    groupRequirement: '2+ categories',
    robustAlternative: "Fisher's exact test",
    nonParametricAlternative: null,
  },
};

/**
 * Get test recommendations based on study design
 */
function getTestRecommendations(data) {
  const { studyType, variables } = data;
  const recommendations = [];

  // Get variable types
  const ivTypes = variables.independentVariables.map(v => v.type);
  const dvTypes = variables.dependentVariables.map(v => v.type);
  const numGroups = variables.independentVariables[0]?.levels?.length || 2;

  // Filter tests based on design
  Object.values(STATISTICAL_TESTS).forEach(test => {
    if (!test.applicableDesigns.includes(studyType.design)) return;

    let score = 0;
    let reasons = [];

    // Check DV type compatibility
    const dvCompatible = dvTypes.some(dvType =>
      test.applicableDVTypes.includes(dvType)
    );
    if (!dvCompatible && test.applicableDVTypes.length > 0) return;

    // Check IV type compatibility (if applicable)
    if (test.applicableIVTypes.length > 0 && ivTypes.length > 0) {
      const ivCompatible = ivTypes.some(ivType =>
        test.applicableIVTypes.includes(ivType)
      );
      if (!ivCompatible) return;
    }

    // Check group requirements
    if (typeof test.groupRequirement === 'number') {
      if (test.groupRequirement !== numGroups) return;
      score += 20;
      reasons.push(`Matches ${numGroups} groups`);
    } else if (test.groupRequirement === '3+' && numGroups >= 3) {
      score += 20;
      reasons.push(`Handles ${numGroups} groups`);
    } else if (test.groupRequirement === '3+' && numGroups < 3) {
      return;
    }

    // Score based on design match
    score += 30;
    reasons.push(`Matches ${studyType.design} design`);

    // Score parametric higher if confirmatory
    if (studyType.purpose === 'confirmatory' && test.family === 'parametric') {
      score += 10;
      reasons.push('Parametric test for confirmatory study');
    }

    // Score for DV type match
    if (dvCompatible) {
      score += 20;
      reasons.push('Compatible with DV type');
    }

    recommendations.push({
      ...test,
      score,
      reasons,
      isRecommended: score >= 50,
    });
  });

  // Sort by score
  recommendations.sort((a, b) => b.score - a.score);

  return recommendations;
}

/**
 * Test Selection Step Component
 */
const TestSelectionStep = ({ data, updateData, errors }) => {
  const theme = useTheme();
  const { testSelection, studyType, variables } = data;

  /**
   * Get test recommendations
   */
  const recommendations = useMemo(() => {
    return getTestRecommendations(data);
  }, [data]);

  /**
   * Get primary recommendation
   */
  const primaryRecommendation = recommendations[0];

  /**
   * Handle test selection
   */
  const handleTestSelect = useCallback((testId) => {
    const test = STATISTICAL_TESTS[testId];
    updateData('testSelection', {
      selectedTest: testId,
      recommendedTest: primaryRecommendation?.id || '',
      testFamily: test?.family || '',
      assumptions: test?.assumptions || [],
      alternativeTests: test?.nonParametricAlternative
        ? [test.nonParametricAlternative]
        : [],
    });
  }, [primaryRecommendation, updateData]);

  /**
   * Handle test family filter
   */
  const handleFamilyChange = (event) => {
    updateData('testSelection', { testFamily: event.target.value });
  };

  /**
   * Handle rationale change
   */
  const handleRationaleChange = (event) => {
    updateData('testSelection', { rationale: event.target.value });
  };

  // Filter recommendations by family if selected
  const filteredRecommendations = testSelection.testFamily
    ? recommendations.filter(r => r.family === testSelection.testFamily)
    : recommendations;

  return (
    <Box>
      {/* AI Recommendation Banner */}
      {primaryRecommendation && (
        <Alert
          severity="info"
          icon={<AIIcon />}
          sx={{ mb: 3, bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.12 : 0.08) }}
        >
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            Recommended Test: {primaryRecommendation.name}
          </Typography>
          <Typography variant="body2">
            Based on your {studyType.design} design with{' '}
            {variables.independentVariables.length > 0 &&
              `${variables.independentVariables.length} IV(s) and `}
            {variables.dependentVariables.length} DV(s), we recommend the{' '}
            <strong>{primaryRecommendation.name}</strong>.
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
            {primaryRecommendation.reasons.map((reason, idx) => (
              <Chip
                key={idx}
                label={reason}
                size="small"
                sx={{ fontSize: '0.7rem', bgcolor: 'background.paper' }}
              />
            ))}
          </Box>
        </Alert>
      )}

      {errors.selectedTest && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errors.selectedTest}
        </Alert>
      )}

      {/* Test Family Filter */}
      <Box sx={{ mb: 3 }}>
        <FormControl component="fieldset">
          <FormLabel component="legend" sx={{ fontSize: '0.875rem', fontWeight: 600, mb: 1 }}>
            Filter by Test Family
          </FormLabel>
          <RadioGroup
            row
            value={testSelection.testFamily}
            onChange={handleFamilyChange}
          >
            <FormControlLabel
              value=""
              control={<Radio size="small" />}
              label="All Tests"
            />
            <FormControlLabel
              value="parametric"
              control={<Radio size="small" />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ParametricIcon fontSize="small" />
                  Parametric
                </Box>
              }
            />
            <FormControlLabel
              value="non-parametric"
              control={<Radio size="small" />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <NonParametricIcon fontSize="small" />
                  Non-Parametric
                </Box>
              }
            />
          </RadioGroup>
        </FormControl>
      </Box>

      {/* Test Selection Grid */}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        Select Statistical Test
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Choose the test that best fits your research design. Recommended tests are marked with a star.
      </Typography>

      <Grid container spacing={2}>
        {filteredRecommendations.slice(0, 8).map((test) => {
          const isSelected = testSelection.selectedTest === test.id;
          const isRecommended = test.id === primaryRecommendation?.id;

          return (
            <Grid item xs={12} sm={6} md={4} key={test.id}>
              <Card
                elevation={isSelected ? 8 : 1}
                sx={{
                  height: '100%',
                  border: isSelected
                    ? `3px solid ${theme.palette.primary.main}`
                    : isRecommended
                      ? `2px solid ${theme.palette.success.main}`
                      : `1px solid ${theme.palette.divider}`,
                  position: 'relative',
                  transition: 'all 0.3s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
              >
                {isRecommended && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      bgcolor: 'success.main',
                      color: 'white',
                      borderRadius: '50%',
                      width: 28,
                      height: 28,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <StarIcon sx={{ fontSize: 18 }} />
                  </Box>
                )}

                <CardActionArea
                  onClick={() => handleTestSelect(test.id)}
                  sx={{ height: '100%' }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Chip
                        label={test.family}
                        size="small"
                        color={test.family === 'parametric' ? 'primary' : 'secondary'}
                        sx={{ fontSize: '0.65rem', height: 20 }}
                      />
                      {isSelected && (
                        <CheckIcon sx={{ color: 'primary.main', fontSize: 20, ml: 'auto' }} />
                      )}
                    </Box>

                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      {test.name}
                    </Typography>

                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                      {test.purpose}
                    </Typography>

                    <Typography variant="caption" color="text.secondary" display="block">
                      <strong>Effect size:</strong> {test.effectSizeName}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Selected Test Details */}
      {testSelection.selectedTest && STATISTICAL_TESTS[testSelection.selectedTest] && (
        <Paper elevation={2} sx={{ mt: 3, p: 2, bgcolor: 'background.default' }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
            Selected: {STATISTICAL_TESTS[testSelection.selectedTest].name}
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Assumptions to Check
              </Typography>
              <List dense>
                {STATISTICAL_TESTS[testSelection.selectedTest].assumptions.map((assumption, idx) => (
                  <ListItem key={idx} disablePadding>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <WarningIcon color="warning" sx={{ fontSize: 18 }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={assumption}
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                ))}
              </List>

              {STATISTICAL_TESTS[testSelection.selectedTest].nonParametricAlternative && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="caption">
                    <strong>If assumptions violated:</strong> Consider{' '}
                    {STATISTICAL_TESTS[STATISTICAL_TESTS[testSelection.selectedTest].nonParametricAlternative]?.name ||
                      STATISTICAL_TESTS[testSelection.selectedTest].nonParametricAlternative}
                  </Typography>
                </Alert>
              )}
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Test Information
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 500 }}>Family</TableCell>
                      <TableCell>
                        <Chip
                          label={STATISTICAL_TESTS[testSelection.selectedTest].family}
                          size="small"
                          color={STATISTICAL_TESTS[testSelection.selectedTest].family === 'parametric' ? 'primary' : 'secondary'}
                        />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 500 }}>Effect Size</TableCell>
                      <TableCell>{STATISTICAL_TESTS[testSelection.selectedTest].effectSizeName}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 500 }}>Groups</TableCell>
                      <TableCell>{STATISTICAL_TESTS[testSelection.selectedTest].groupRequirement}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 500 }}>Robust Alternative</TableCell>
                      <TableCell>
                        {STATISTICAL_TESTS[testSelection.selectedTest].robustAlternative || 'N/A'}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>

          {/* Rationale */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Rationale for Test Selection (Optional)
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={2}
              value={testSelection.rationale}
              onChange={handleRationaleChange}
              placeholder="Document why you chose this test (useful for pre-registration and methods section)"
              size="small"
            />
          </Box>
        </Paper>
      )}

      {/* Guardian-style assumption guidance */}
      <Alert severity="success" sx={{ mt: 3 }} icon={<ScienceIcon />}>
        <Typography variant="body2">
          <strong>Guardian Tip:</strong> Before running your analysis, the Guardian system
          will automatically check assumptions for your selected test. If assumptions are
          violated, it will recommend appropriate alternatives or corrections.
        </Typography>
      </Alert>
    </Box>
  );
};

export default TestSelectionStep;
