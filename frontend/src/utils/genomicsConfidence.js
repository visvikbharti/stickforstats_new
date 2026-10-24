/**
 * What the genomics results mean by "confidence" (issue #31 item 6).
 *
 * The per-gene Guardian confidence is computed by the genomics service itself
 * (backend/core/services/genomics/differential_expression.py, _test_two_groups) -- not by
 * GuardianCore -- so it is narrower than the Guardian score shown elsewhere in the app. Three
 * checks run: Shapiro-Wilk normality in each group of at least 3 samples, and Levene's test of
 * equal variances, both at alpha = 0.05. Each failed check costs 2 points, or 3 if p < 0.01, and
 * each check that cannot be computed costs 2; the score is 1 - points / 10.8. The percentages
 * quoted below are those the formula produces, pinned against the service by
 * backend/tests/test_genomics_confidence_definition.py.
 */

export const CONFIDENCE_DEFINITION =
  "Confidence is Guardian's assumption-check score for a gene, not a probability and not a " +
  'confidence level. It is 100% when every check that ran passed: Shapiro-Wilk normality in ' +
  "each group of 3 or more samples, and Levene's test of equal variances, both at α = 0.05. " +
  'Each failed or uncomputable check lowers it: one failure at 0.01 ≤ p < 0.05, or one check ' +
  'that could not be computed, gives 81%; one failure at p < 0.01 gives 72%; the lowest ' +
  'possible score is 17%.';

export const MEAN_CONFIDENCE_DEFINITION =
  'Average of the per-gene confidence scores over all genes, including genes whose test gave no ' +
  'p-value.';

export const MIN_CONFIDENCE_DEFINITION =
  'Lowest per-gene confidence score. With two groups it cannot fall below 16.7%.';

export const GUARDIAN_COLUMN_DEFINITION =
  "Guardian column: the gene's confidence score. ✓ marks 80% or more, meaning no check failed, " +
  'or one failed at 0.01 ≤ p < 0.05 or could not be computed, so the gene may still have been ' +
  "switched to Welch's t-test or Mann-Whitney U. ⚠ marks less than 80%.";
