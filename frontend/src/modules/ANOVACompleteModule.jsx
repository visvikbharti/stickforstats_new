import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Tabs,
  Tab,
  Grid,
  Alert,
  Chip,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper as MuiPaper
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  School as SchoolIcon,
  Science as ScienceIcon,
  ArrowBack as BackIcon,
  CheckCircle as CheckIcon,
  Functions as FunctionsIcon,
  CompareArrows as CompareIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl, endpoints } from '../config/apiConfig';
import guardianService from '../services/GuardianService';
import GuardianFallbackCard from '../components/Guardian/GuardianFallbackCard';
import { GuardianReportDisplay } from '../components/Guardian';
import {
  adaptAnovaResponse,
  adaptTwoWayResponse,
  adaptRepeatedMeasuresResponse,
  buildTwoWayCells,
  formatStat,
  formatPValue
} from './anovaResultAdapter';

// Import shared components
import {
  DataInput,
  FactorialDataInput,
  ResultDisplay,
  InterpretationPanel,
  DistributionPlot,
  TheoryCard,
  SimulationControl
} from '../components/statistical';

// The three designs this module can actually run. Each maps to a real backend
// `anova_type` and a real Guardian `design`, so picking one changes the test that runs,
// the assumptions that are checked, and the results that come back.
//
// These used to be three decorative <Chip>s -- one filled, two outlined -- which looked
// exactly like a toggle group with two broken options. They were not controls at all; the
// module hard-coded one_way. Meanwhile the Theory tab taught all three designs and the
// backend had implemented all three for months.
const DESIGNS = {
  one_way: {
    label: 'One-Way',
    anovaType: 'one_way',
    guardianDesign: 'independent',
    description: 'One factor, independent groups. Compares the means of 3+ separate samples.',
  },
  repeated_measures: {
    label: 'Repeated Measures',
    anovaType: 'repeated_measures',
    guardianDesign: 'repeated_measures',
    description:
      'One factor measured on the SAME subjects under every condition. Adds Mauchly’s test of sphericity and the Greenhouse-Geisser correction.',
  },
  two_way: {
    label: 'Two-Way',
    anovaType: 'two_way',
    guardianDesign: 'independent',
    description:
      'Two factors and their interaction. Needs one row per observation with a level for each factor.',
  },
};

// A two-way ANOVA produces THREE effects (two main effects and their interaction), which is
// why it could never be shown through the single-effect ResultDisplay the module was built
// around.
const TwoWayResults = ({ results, names }) => {
  const label = (effect) => {
    if (!names) return effect.label;
    if (effect.key === 'factor1') return `${names.factor1} (main effect)`;
    if (effect.key === 'factor2') return `${names.factor2} (main effect)`;
    if (effect.key === 'interaction') return `${names.factor1} × ${names.factor2} (interaction)`;
    return effect.label;
  };

  const interaction = results.effects.find((effect) => effect.key === 'interaction');

  return (
    <>
      <Grid item xs={12}>
        <MuiPaper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Two-Way ANOVA
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <Chip
              size="small"
              label={results.balanced ? 'Balanced design' : 'Unbalanced design'}
              color={results.balanced ? 'success' : 'warning'}
            />
            <Chip size="small" variant="outlined" label={`Type ${results.sumOfSquaresType} sum of squares`} />
            <Chip size="small" variant="outlined" label={`n = ${results.nTotal}`} />
            {typeof results.modelRSquared === 'number' && (
              <Chip size="small" variant="outlined" label={`Model R² = ${formatStat(results.modelRSquared, 3)}`} />
            )}
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Effect</TableCell>
                  <TableCell align="right">F</TableCell>
                  <TableCell align="right">df</TableCell>
                  <TableCell align="right">p</TableCell>
                  <TableCell align="right">Partial η²</TableCell>
                  <TableCell align="right">Sum of squares</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.effects.map((effect) => (
                  <TableRow key={effect.key}>
                    <TableCell>
                      {label(effect)}
                      {effect.significant && (
                        <Chip size="small" color="primary" label="significant" sx={{ ml: 1 }} />
                      )}
                    </TableCell>
                    <TableCell align="right">{formatStat(effect.f_statistic, 4)}</TableCell>
                    <TableCell align="right">
                      {formatStat(effect.df, 0)}, {formatStat(effect.df_residual, 0)}
                    </TableCell>
                    <TableCell align="right">{formatPValue(effect.p_value)}</TableCell>
                    <TableCell align="right">{formatStat(effect.partial_eta_squared, 3)}</TableCell>
                    <TableCell align="right">{formatStat(effect.sum_of_squares, 2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </MuiPaper>
      </Grid>

      {interaction && (
        <Grid item xs={12}>
          <Alert severity={interaction.significant ? 'warning' : 'info'}>
            {interaction.significant ? (
              <>
                <strong>The interaction is significant</strong> (p = {formatPValue(interaction.p_value)}). The
                effect of one factor depends on the level of the other, so the two main effects above should
                not be interpreted on their own — look at the simple effects within each level instead.
              </>
            ) : (
              <>
                <strong>No significant interaction</strong> (p = {formatPValue(interaction.p_value)}). The two
                main effects can be interpreted independently.
              </>
            )}
          </Alert>
        </Grid>
      )}
    </>
  );
};

// Repeated measures adds Mauchly's test of sphericity and the Greenhouse-Geisser
// correction. Reporting the uncorrected F when sphericity is violated inflates the Type I
// error rate, so the recommended p-value is shown first and the basis for it is named.
const RepeatedMeasuresResults = ({ results }) => {
  const spherical = results.sphericity.assumption_met;

  return (
    <>
      <Grid item xs={12}>
        <MuiPaper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Repeated-Measures ANOVA
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <Chip size="small" variant="outlined" label={`${results.n_subjects} subjects`} />
            <Chip size="small" variant="outlined" label={`${results.n_conditions} conditions`} />
          </Box>

          <TableContainer>
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell><strong>F</strong></TableCell>
                  <TableCell align="right">{formatStat(results.f_statistic, 4)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>df</strong></TableCell>
                  <TableCell align="right">
                    {formatStat(results.degrees_of_freedom_between, 0)},{' '}
                    {formatStat(results.degrees_of_freedom_within, 0)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <strong>p (recommended)</strong>
                    <Typography variant="caption" display="block" color="text.secondary">
                      {results.recommended_p_basis === 'greenhouse_geisser'
                        ? 'Greenhouse-Geisser corrected — sphericity is violated'
                        : 'Uncorrected — sphericity holds'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <strong>{formatPValue(results.recommended_p_value)}</strong>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>p (uncorrected)</TableCell>
                  <TableCell align="right">{formatPValue(results.p_value)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Partial η²</TableCell>
                  <TableCell align="right">{formatStat(results.partial_eta_squared, 3)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </MuiPaper>
      </Grid>

      <Grid item xs={12}>
        <Alert severity={spherical ? 'success' : 'warning'}>
          <strong>Mauchly’s test of sphericity: {spherical ? 'passed' : 'violated'}</strong>
          {typeof results.sphericity.p_value === 'number' && (
            <> (W = {formatStat(results.sphericity.mauchly_w, 3)}, p = {formatPValue(results.sphericity.p_value)})</>
          )}
          .{' '}
          {spherical ? (
            <>The uncorrected F-test is valid; that is the p-value reported above.</>
          ) : (
            <>
              The variances of the differences between conditions are not equal, which inflates the Type I
              error rate of the uncorrected test. The Greenhouse-Geisser correction (ε ={' '}
              {formatStat(results.greenhouse_geisser.epsilon, 3)}) has been applied, giving p ={' '}
              {formatPValue(results.greenhouse_geisser.p_value)} — that is the p-value reported above.
            </>
          )}
        </Alert>
      </Grid>
    </>
  );
};

const ANOVACompleteModule = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [design, setDesign] = useState('one_way');
  const [anovaData, setAnovaData] = useState(null);
  const [anovaResults, setAnovaResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [guardianReport, setGuardianReport] = useState(null);
  const [factorNames, setFactorNames] = useState(null);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Switching design invalidates everything computed under the previous one. Leaving the
  // old F-statistic on screen under a new design label would be exactly the kind of quiet
  // mislabelling this module already had too much of.
  const handleDesignChange = (nextDesign) => {
    if (!nextDesign || nextDesign === design) return;
    setDesign(nextDesign);
    setAnovaData(null);
    setAnovaResults(null);
    setGuardianReport(null);
    setError(null);
  };

  // Hand the user's groups to the Non-Parametric module and auto-run
  // Kruskal-Wallis (the distribution-free one-way ANOVA alternative).
  const runNonParametricFallback = () => {
    if (!anovaData || !anovaData.length) return;
    navigate('/modules/nonparametric-real', {
      state: {
        fromGuardian: true,
        selectedTest: 'kruskal-wallis',
        autoRun: true,
        datasetLabel: 'Imported from your ANOVA',
        dataGroups: anovaData.map((values, i) => ({ name: `Group ${i + 1}`, values })),
      },
    });
  };

  // One-way and repeated-measures take the same k-group shape: one column per group
  // (one-way) or per condition (repeated measures, rows aligned by subject).
  const handleDataSubmit = async (data) => {
    const spec = DESIGNS[design];
    setAnovaData(data);
    setError(null);
    setGuardianReport(null);

    if (design === 'repeated_measures') {
      const sizes = new Set(data.map((group) => group.length));
      if (sizes.size > 1) {
        setError(
          'Repeated measures requires the same number of subjects in every condition — each row is one subject measured under all conditions.'
        );
        return;
      }
    }

    // Backend Guardian assumption check (non-blocking): runs on the real submitted groups
    // regardless of whether the ANOVA call itself succeeds. The design matters: for a
    // repeated-measures design the Guardian checks normality of the DIFFERENCES and drops
    // the between-groups variance test, which is why it is passed through explicitly.
    guardianService
      .checkAssumptions(data, 'anova', 0.05, { design: spec.guardianDesign })
      .then(setGuardianReport)
      .catch(() => setGuardianReport(null));

    // Perform ANOVA analysis
    try {
      setLoading(true);
      setAnovaResults(null);

      // The backend rejects a post-hoc request with fewer than three groups, and post-hoc
      // is a one-way concept here.
      const wantsPostHoc = design === 'one_way' && data.length >= 3;

      const response = await axios.post(getApiUrl(endpoints.stats.anova), {
        anova_type: spec.anovaType,
        groups: data,
        ...(wantsPostHoc ? { post_hoc: 'bonferroni' } : {}),
        options: {
          check_assumptions: true,
          calculate_effect_sizes: true,
          generate_visualizations: false,
        },
      });

      setAnovaResults(
        design === 'repeated_measures'
          ? adaptRepeatedMeasuresResponse(response.data)
          : adaptAnovaResponse(response.data)
      );
    } catch (err) {
      console.error('ANOVA calculation error:', err);
      setError(
        err.response?.data?.error ||
          'Failed to perform ANOVA analysis. Please check your data and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Two-way needs a level of EACH factor per observation, which the k-column input cannot
  // express -- hence the separate long-format input.
  const handleTwoWaySubmit = async ({ rows, names }) => {
    setError(null);
    setGuardianReport(null);
    setAnovaResults(null);

    let cells;
    let factor1Levels;
    let factor2Levels;
    try {
      ({ cells, factor1Levels, factor2Levels } = buildTwoWayCells(rows));
    } catch (err) {
      setError(err.message);
      return;
    }

    setAnovaData(cells);
    setFactorNames(names);

    guardianService
      .checkAssumptions(cells, 'anova', 0.05, { design: 'independent' })
      .then(setGuardianReport)
      .catch(() => setGuardianReport(null));

    try {
      setLoading(true);
      const response = await axios.post(getApiUrl(endpoints.stats.anova), {
        anova_type: 'two_way',
        groups: cells,
        factor1_levels: factor1Levels,
        factor2_levels: factor2Levels,
        options: { calculate_effect_sizes: true, generate_visualizations: false },
      });
      setAnovaResults(adaptTwoWayResponse(response.data));
    } catch (err) {
      console.error('Two-way ANOVA error:', err);
      setError(
        err.response?.data?.error ||
          'Failed to perform the two-way ANOVA. Please check your data and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const TheoryTab = () => (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TheoryCard
            title="Analysis of Variance (ANOVA)"
            concept="ANOVA is a statistical method used to test differences between two or more means. It examines whether the variance between groups is significantly larger than the variance within groups."
            formula={`F = MS_between / MS_within

Where:
MS_between = SS_between / df_between
MS_within = SS_within / df_within

SS = Sum of Squares
df = degrees of freedom
MS = Mean Square`}
            assumptions={[
              'Independence: Observations are independent',
              'Normality: Data within each group is normally distributed',
              'Homogeneity of Variance: Groups have equal variances (homoscedasticity)'
            ]}
            whenToUse={[
              'Comparing means of 3+ groups',
              'Testing treatment effects',
              'Experimental design analysis',
              'Quality control studies'
            ]}
            examples={[
              'Example 1: Testing if different teaching methods lead to different test scores among three classrooms.',
              'Example 2: Comparing the effectiveness of four different medications on reducing blood pressure.',
              'Example 3: Analyzing if sales differ significantly across multiple store locations.'
            ]}
            prerequisites={[
              'Understanding of hypothesis testing',
              'Knowledge of variance and standard deviation',
              'Familiarity with F-distribution',
              'Basic understanding of degrees of freedom'
            ]}
            difficulty="intermediate"
            estimatedTime="15 min"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <CompareIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                Types of ANOVA
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CheckIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="One-Way ANOVA"
                    secondary="Compares means across one factor with multiple levels"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Two-Way ANOVA"
                    secondary="Examines effects of two factors and their interaction"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Repeated Measures ANOVA"
                    secondary="For within-subjects designs with repeated measurements"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="MANOVA"
                    secondary="Multivariate ANOVA for multiple dependent variables"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <FunctionsIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                Effect Size Measures
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Eta Squared (η²)"
                    secondary="Proportion of variance explained (0 to 1)"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Omega Squared (ω²)"
                    secondary="Less biased estimate of effect size"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Cohen's f"
                    secondary="Standardized effect size measure"
                  />
                </ListItem>
              </List>

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Interpretation Guidelines:</strong><br />
                  • Small: η² = 0.01, f = 0.10<br />
                  • Medium: η² = 0.06, f = 0.25<br />
                  • Large: η² = 0.14, f = 0.40
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Post-Hoc Tests
              </Typography>
              <Typography variant="body2" paragraph>
                When ANOVA shows significant differences, post-hoc tests determine which specific groups differ:
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2">Tukey's HSD</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Controls family-wise error rate, good for all pairwise comparisons
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2">Bonferroni</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Very conservative, adjusts α for multiple comparisons
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2">Scheffé</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Most conservative, allows complex comparisons
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2">Fisher's LSD</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Least conservative, use only after significant F-test
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  const AnalysisTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        {design === 'two_way' ? (
          <FactorialDataInput onSubmit={handleTwoWaySubmit} disabled={loading} />
        ) : (
          <DataInput
            onDataSubmit={handleDataSubmit}
            multiSample={true}
            maxSamples={10}
            labels={Array.from(
              { length: 10 },
              (_, i) =>
                design === 'repeated_measures' ? `Condition ${i + 1}` : `Group ${i + 1}`
            )}
            placeholder={
              design === 'repeated_measures'
                ? 'Enter each condition’s values — one value per subject, subjects in the same order in every condition'
                : 'Enter comma-separated values for each group'
            }
            validation={(values, groupIndex) => {
              if (values.length < 3) {
                return 'Each group must have at least 3 observations';
              }
              return true;
            }}
          />
        )}
      </Grid>

      {error && (
        <Grid item xs={12}>
          <Alert severity="error">{error}</Alert>
        </Grid>
      )}

      {/* Assumptions come from the backend Guardian -- the same Shapiro-Wilk / Levene /
          design-aware checks the rest of the app runs -- not from a second opinion computed
          here. This module used to render its own AssumptionChecker whose "normality" test
          was |skewness| < 2 and whose "equal variances" test was a max/min variance ratio
          < 3. Neither is a statistical test, both were invented thresholds, and they could
          (and did) contradict the Guardian card directly below them on the same screen. */}
      {guardianReport && (
        <Grid item xs={12}>
          <GuardianReportDisplay
            guardianReport={guardianReport}
            assumptionsChecked={guardianReport.assumptions_checked || []}
            violations={guardianReport.violations || []}
            confidenceScore={guardianReport.confidence_score ?? 0}
            canProceed={guardianReport.can_proceed ?? true}
            alternativeTests={guardianReport.alternative_tests || []}
          />
        </Grid>
      )}

      {guardianReport && (
        <Grid item xs={12}>
          <GuardianFallbackCard
            report={guardianReport}
            actionLabel="Run Kruskal-Wallis instead"
            onRun={runNonParametricFallback}
          />
        </Grid>
      )}

      {anovaResults?.design === 'two_way' && <TwoWayResults results={anovaResults} names={factorNames} />}

      {anovaResults?.design === 'repeated_measures' && <RepeatedMeasuresResults results={anovaResults} />}

      {anovaResults?.design === 'one_way' && (
        <>
          <Grid item xs={12}>
            <ResultDisplay
              results={{
                test_statistic: anovaResults.f_statistic,
                p_value: anovaResults.p_value,
                degrees_of_freedom: `Between: ${anovaResults.degrees_of_freedom_between}, Within: ${anovaResults.degrees_of_freedom_within}`,
                effect_size: anovaResults.eta_squared
              }}
              testName="One-Way ANOVA"
              customMetrics={[
                {
                  label: 'Sum of Squares (Between)',
                  value: anovaResults.sum_of_squares_between,
                  precision: 2
                },
                {
                  label: 'Sum of Squares (Within)',
                  value: anovaResults.sum_of_squares_within,
                  precision: 2
                },
                {
                  label: 'Omega Squared (ω²)',
                  value: anovaResults.omega_squared,
                  precision: 3,
                  description: 'Less biased effect size estimate'
                }
              ]}
            />
          </Grid>

          <Grid item xs={12}>
            <InterpretationPanel
              results={anovaResults}
              testType="One-Way ANOVA"
              context="research"
              customInterpretations={[
                {
                  type: 'post-hoc',
                  text: anovaResults.p_value < 0.05
                    ? 'Significant differences found. Review post-hoc tests to identify which groups differ.'
                    : 'No significant differences found between groups.',
                  priority: 'high'
                },
                {
                  type: 'effect',
                  text: `Effect size (η² = ${formatStat(anovaResults.eta_squared, 3)}) indicates ${
                    anovaResults.eta_squared < 0.01 ? 'negligible' :
                    anovaResults.eta_squared < 0.06 ? 'small' :
                    anovaResults.eta_squared < 0.14 ? 'medium' : 'large'
                  } practical significance.`,
                  priority: 'medium'
                }
              ]}
            />
          </Grid>

          {anovaResults.post_hoc && anovaResults.p_value < 0.05 && (
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Post-Hoc Comparisons (Bonferroni-corrected pairwise t-tests)
                </Typography>
                <Box sx={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '8px', borderBottom: '2px solid var(--divider-color, #ddd)' }}>Comparison</th>
                        <th style={{ padding: '8px', borderBottom: '2px solid var(--divider-color, #ddd)' }}>Mean Difference</th>
                        <th style={{ padding: '8px', borderBottom: '2px solid var(--divider-color, #ddd)' }}>Adjusted p-value</th>
                        <th style={{ padding: '8px', borderBottom: '2px solid var(--divider-color, #ddd)' }}>Significant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {anovaResults.post_hoc.map((comparison, index) => (
                        <tr key={index}>
                          <td style={{ padding: '8px', borderBottom: '1px solid var(--divider-color, #eee)' }}>
                            {comparison.group1} vs {comparison.group2}
                          </td>
                          <td style={{ padding: '8px', borderBottom: '1px solid var(--divider-color, #eee)', textAlign: 'center' }}>
                            {formatStat(comparison.mean_diff, 3)}
                          </td>
                          <td style={{ padding: '8px', borderBottom: '1px solid var(--divider-color, #eee)', textAlign: 'center' }}>
                            {formatPValue(comparison.p_value, 4)}
                          </td>
                          <td style={{ padding: '8px', borderBottom: '1px solid var(--divider-color, #eee)', textAlign: 'center' }}>
                            {comparison.significant ? (
                              <CheckIcon color="success" fontSize="small" />
                            ) : (
                              <span>—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>
              </Paper>
            </Grid>
          )}

          {anovaData && (
            <Grid item xs={12}>
              <DistributionPlot
                data={anovaData}
                title="Group Distributions"
                showNormalCurve={true}
                showMean={true}
                showMedian={true}
              />
            </Grid>
          )}
        </>
      )}

      {error && (
        <Grid item xs={12}>
          <Alert severity="error">
            {error}
          </Alert>
        </Grid>
      )}
    </Grid>
  );

  const SimulationsTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <SimulationControl
          simulationType="hypothesis"
          parameters={[
            {
              id: 'numGroups',
              label: 'Number of Groups',
              type: 'slider',
              min: 2,
              max: 8,
              default: 3,
              step: 1
            },
            {
              id: 'sampleSize',
              label: 'Sample Size per Group',
              type: 'slider',
              min: 5,
              max: 100,
              default: 20,
              step: 5
            },
            {
              id: 'effectSize',
              label: 'Effect Size (Cohen\'s f)',
              type: 'slider',
              min: 0,
              max: 1,
              default: 0.25,
              step: 0.05,
              decimal: 2
            },
            {
              id: 'alpha',
              label: 'Significance Level (α)',
              type: 'slider',
              min: 0.01,
              max: 0.10,
              default: 0.05,
              step: 0.01,
              decimal: 2
            },
            {
              id: 'variance',
              label: 'Within-Group Variance',
              type: 'slider',
              min: 0.5,
              max: 5,
              default: 1,
              step: 0.5
            }
          ]}
          onRun={(params) => {
            // Running ANOVA simulation
          }}
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Power Analysis
            </Typography>
            <Typography variant="body2" paragraph>
              Statistical power is the probability of correctly rejecting a false null hypothesis.
            </Typography>
            <Alert severity="info">
              Factors affecting power in ANOVA:
              <List dense>
                <ListItem>• Sample size (larger = more power)</ListItem>
                <ListItem>• Effect size (larger = more power)</ListItem>
                <ListItem>• Alpha level (higher = more power)</ListItem>
                <ListItem>• Number of groups</ListItem>
                <ListItem>• Within-group variability (lower = more power)</ListItem>
              </List>
            </Alert>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Sample Size Planning
            </Typography>
            <Typography variant="body2" paragraph>
              Use these guidelines for adequate sample size:
            </Typography>
            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                For 80% Power (α = 0.05):
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="caption">Small effect (f=0.1):</Typography>
                  <Typography variant="body2" fontWeight="bold">~400 per group</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption">Medium effect (f=0.25):</Typography>
                  <Typography variant="body2" fontWeight="bold">~65 per group</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption">Large effect (f=0.4):</Typography>
                  <Typography variant="body2" fontWeight="bold">~25 per group</Typography>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/statistical-analysis-tools')}>
            <BackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AssessmentIcon color="primary" />
              ANOVA Analysis Module
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Comprehensive Analysis of Variance Testing
            </Typography>
          </Box>
        </Box>
        <ToggleButtonGroup
          value={design}
          exclusive
          size="small"
          onChange={(event, next) => handleDesignChange(next)}
          aria-label="ANOVA design"
        >
          {Object.entries(DESIGNS).map(([key, spec]) => (
            <ToggleButton key={key} value={key} aria-label={spec.label}>
              {spec.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      <Alert severity="info" icon={<FunctionsIcon />} sx={{ mb: 3 }}>
        <strong>{DESIGNS[design].label} ANOVA.</strong> {DESIGNS[design].description}
      </Alert>

      <Paper sx={{ width: '100%', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab icon={<SchoolIcon />} label="Theory" />
          <Tab icon={<AssessmentIcon />} label="Analysis" />
          <Tab icon={<ScienceIcon />} label="Simulations" />
        </Tabs>
      </Paper>

      <Box sx={{ mt: 3 }}>
        {activeTab === 0 && <TheoryTab />}
        {activeTab === 1 && <AnalysisTab />}
        {activeTab === 2 && <SimulationsTab />}
      </Box>
    </Container>
  );
};

export default ANOVACompleteModule;