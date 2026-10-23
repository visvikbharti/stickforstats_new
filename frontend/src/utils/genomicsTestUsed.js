/**
 * How the genomics results name the test each gene was given.
 *
 * Guardian starts every two-group gene on Student's t-test and switches away from it in two
 * different directions, only one of which is nonparametric: unequal variances route to Welch's
 * t-test, which is still a parametric test, and non-normality routes to Mann-Whitney U. The backend
 * marks both switches `cascaded`, and the results table used to describe every cascaded gene as
 * "Guardian cascaded to nonparametric" -- wrong for every gene that went to Welch (issue #31).
 * So the description is taken from `test_used`, the test that actually ran.
 */

const TEST_NAMES = {
  t_test: "Student's t-test (parametric)",
  welch_t_test: "Welch's t-test (unequal variances)",
  mann_whitney: 'Mann-Whitney U (nonparametric)',
  anova: 'One-way ANOVA (parametric)',
  kruskal_wallis: 'Kruskal-Wallis (nonparametric)',
};

/** The tooltip for a gene's test chip: the test that ran, and whether Guardian switched to it. */
export const describeTestUsed = ({ test_used: testUsed, cascaded }) => {
  const name = TEST_NAMES[testUsed] || testUsed;
  return cascaded ? `Guardian switched to ${name}` : name;
};
