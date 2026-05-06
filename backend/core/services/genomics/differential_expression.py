"""
Genomics Differential Expression Service
==========================================

Performs per-gene differential expression analysis with Guardian assumption
validation and Benjamini-Hochberg FDR correction.

Workflow:
    1. Parse gene expression matrix (genes x samples)
    2. For each gene, Guardian validates assumptions (normality, variance homogeneity)
    3. If assumptions met: t-test / ANOVA
    4. If violated: cascade to Mann-Whitney / Kruskal-Wallis
    5. Apply BH-FDR correction across all raw p-values
    6. Return significant genes with fold changes, adjusted p-values, Guardian summary

Author: StickForStats Development Team
Date: April 2026
"""

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Tuple

import numpy as np
from scipy import stats

logger = logging.getLogger(__name__)


@dataclass
class GeneResult:
    """Result for a single gene's differential expression analysis.

    When ``test_failed`` is True, ``raw_p_value`` and
    ``adjusted_p_value`` are NaN and the gene is reported as
    inconclusive rather than as "not significant" --- the previous
    behaviour silently substituted ``(0.0, 1.0)`` on test failure,
    which marked thousands of true-positive genes "not significant"
    without telling the user the test could not be computed. See
    docs/CRITICAL_REVIEW_2026-05-06.md §P0-1 (genomics fallback) and
    §P1-12 (silent exception swallows).
    """
    gene_name: str
    test_used: str  # 't_test', 'mann_whitney', 'anova', 'kruskal_wallis'
    statistic: float
    raw_p_value: float
    adjusted_p_value: float = 1.0  # Set after FDR correction
    log2_fold_change: float = 0.0
    mean_group1: float = 0.0
    mean_group2: float = 0.0
    guardian_confidence: float = 1.0
    assumptions_passed: bool = True
    cascaded: bool = False  # True if Guardian triggered nonparametric cascade
    violations: List[str] = field(default_factory=list)
    test_failed: bool = False
    test_failure_reason: str = ""

    def to_dict(self) -> Dict[str, Any]:
        # When the test failed, raw_p_value is NaN. JSON does not
        # support NaN, so emit None and flag the failure for the
        # caller. "significant" is False in this case (we cannot
        # claim significance from a failed test).
        raw_p = self.raw_p_value
        adj_p = self.adjusted_p_value
        if self.test_failed or (
            isinstance(raw_p, float) and np.isnan(raw_p)
        ):
            raw_p_out: Any = None
            adj_p_out: Any = None
            significant = False
        else:
            raw_p_out = raw_p
            adj_p_out = adj_p
            significant = adj_p < 0.05

        return {
            "gene_name": self.gene_name,
            "test_used": self.test_used,
            "statistic": round(self.statistic, 6) if not np.isnan(self.statistic) else None,
            "raw_p_value": raw_p_out,
            "adjusted_p_value": adj_p_out,
            "log2_fold_change": round(self.log2_fold_change, 4),
            "mean_group1": round(self.mean_group1, 4),
            "mean_group2": round(self.mean_group2, 4),
            "guardian_confidence": round(self.guardian_confidence, 4),
            "assumptions_passed": self.assumptions_passed,
            "cascaded": self.cascaded,
            "violations": self.violations,
            "test_failed": self.test_failed,
            "test_failure_reason": self.test_failure_reason,
            "significant": significant,
        }


@dataclass
class DifferentialExpressionResult:
    """Complete result of a differential expression analysis."""
    n_genes: int
    n_samples: int
    n_group1: int
    n_group2: int
    group1_name: str
    group2_name: str
    n_significant: int = 0
    n_cascaded: int = 0
    fdr_method: str = "benjamini_hochberg"
    alpha: float = 0.05
    gene_results: List[GeneResult] = field(default_factory=list)
    volcano_data: List[Dict] = field(default_factory=list)
    guardian_summary: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "summary": {
                "n_genes": self.n_genes,
                "n_samples": self.n_samples,
                "n_group1": self.n_group1,
                "n_group2": self.n_group2,
                "group1_name": self.group1_name,
                "group2_name": self.group2_name,
                "n_significant": self.n_significant,
                "n_cascaded": self.n_cascaded,
                "fdr_method": self.fdr_method,
                "alpha": self.alpha,
            },
            "gene_results": [g.to_dict() for g in self.gene_results],
            "volcano_data": self.volcano_data,
            "guardian_summary": self.guardian_summary,
        }


class DifferentialExpressionService:
    """
    Performs differential expression analysis with Guardian validation.

    For each gene:
    - Checks normality (Shapiro-Wilk) for each group
    - Checks variance homogeneity (Levene's test)
    - If both pass: independent t-test (2 groups) or ANOVA (3+ groups)
    - If either fails: Mann-Whitney U (2 groups) or Kruskal-Wallis (3+ groups)
    - Records Guardian confidence score per gene

    After all genes tested:
    - Applies Benjamini-Hochberg FDR correction
    - Generates volcano plot data (log2FC vs -log10 adjusted p)
    """

    def __init__(self, alpha: float = 0.05, normality_alpha: float = 0.05):
        self.alpha = alpha
        self.normality_alpha = normality_alpha

    def analyze(
        self,
        expression_matrix: np.ndarray,
        gene_names: List[str],
        group_labels: List[str],
        group1_name: str = "control",
        group2_name: str = "treatment",
    ) -> DifferentialExpressionResult:
        """
        Run differential expression analysis.

        Args:
            expression_matrix: numpy array of shape (n_genes, n_samples)
            gene_names: list of gene names (length = n_genes)
            group_labels: list of group labels per sample (length = n_samples)
            group1_name: name of reference group
            group2_name: name of comparison group

        Returns:
            DifferentialExpressionResult with per-gene results and FDR-corrected p-values
        """
        n_genes, n_samples = expression_matrix.shape
        unique_groups = sorted(set(group_labels))

        if len(unique_groups) < 2:
            raise ValueError("At least 2 groups required for differential expression")

        # Identify sample indices per group
        group_indices = {}
        for g in unique_groups:
            group_indices[g] = [i for i, label in enumerate(group_labels) if label == g]

        is_two_group = len(unique_groups) == 2
        g1_idx = group_indices.get(group1_name, group_indices[unique_groups[0]])
        g2_idx = group_indices.get(group2_name, group_indices[unique_groups[1]])

        gene_results = []
        n_cascaded = 0

        for gene_i in range(n_genes):
            row = expression_matrix[gene_i]

            if is_two_group:
                result = self._test_two_groups(
                    gene_names[gene_i], row[g1_idx], row[g2_idx]
                )
            else:
                groups_data = [row[group_indices[g]] for g in unique_groups]
                result = self._test_multi_groups(gene_names[gene_i], groups_data)

            # Compute fold change (for two-group)
            if is_two_group:
                mean1 = np.mean(row[g1_idx])
                mean2 = np.mean(row[g2_idx])
                result.mean_group1 = mean1
                result.mean_group2 = mean2
                if mean1 > 0:
                    result.log2_fold_change = np.log2(max(mean2, 1e-10) / max(mean1, 1e-10))

            if result.cascaded:
                n_cascaded += 1

            gene_results.append(result)

        # Apply BH-FDR correction
        raw_pvals = np.array([g.raw_p_value for g in gene_results])
        adjusted_pvals = self._benjamini_hochberg(raw_pvals)

        for i, gene_r in enumerate(gene_results):
            gene_r.adjusted_p_value = adjusted_pvals[i]

        n_significant = sum(1 for g in gene_results if g.adjusted_p_value < self.alpha)

        # Generate volcano plot data
        volcano_data = []
        for g in gene_results:
            neg_log10_p = -np.log10(max(g.adjusted_p_value, 1e-300))
            volcano_data.append({
                "gene": g.gene_name,
                "log2fc": round(g.log2_fold_change, 4),
                "neg_log10_padj": round(neg_log10_p, 4),
                "significant": g.adjusted_p_value < self.alpha,
                "cascaded": g.cascaded,
            })

        # Guardian summary across all genes
        confidences = [g.guardian_confidence for g in gene_results]
        guardian_summary = {
            "mean_confidence": round(np.mean(confidences), 4),
            "min_confidence": round(np.min(confidences), 4),
            "n_genes_cascaded": n_cascaded,
            "cascade_rate": round(n_cascaded / n_genes, 4) if n_genes > 0 else 0,
            "n_normality_violations": sum(
                1 for g in gene_results
                if any("normality" in v.lower() for v in g.violations)
            ),
            "n_variance_violations": sum(
                1 for g in gene_results
                if any("variance" in v.lower() for v in g.violations)
            ),
        }

        return DifferentialExpressionResult(
            n_genes=n_genes,
            n_samples=n_samples,
            n_group1=len(g1_idx),
            n_group2=len(g2_idx),
            group1_name=group1_name,
            group2_name=group2_name,
            n_significant=n_significant,
            n_cascaded=n_cascaded,
            gene_results=gene_results,
            volcano_data=volcano_data,
            guardian_summary=guardian_summary,
        )

    def _test_two_groups(
        self, gene_name: str, group1: np.ndarray, group2: np.ndarray
    ) -> GeneResult:
        """Test a single gene between two groups with Guardian validation."""
        violations = []
        confidence_penalty = 0.0
        cascaded = False

        # Check normality for each group. When Shapiro-Wilk cannot be
        # computed --- either because it raises (n too small in some
        # scipy versions) or because it silently returns NaN (modern
        # scipy on all-tied / all-NaN data) --- do NOT mark the group
        # as passing normality. Force a cascade to nonparametric so
        # the parametric test is not run on data whose assumptions
        # could not be verified.
        norm_pass = True
        for label, data in [("group1", group1), ("group2", group2)]:
            if len(data) >= 3:
                try:
                    w, p = stats.shapiro(data)
                except Exception as exc:
                    violations.append(
                        f"Normality test could not be computed ({label}): {exc}"
                    )
                    norm_pass = False
                    confidence_penalty += 2.0
                    logger.debug(
                        "shapiro raised for %s: %s", gene_name, exc, exc_info=False
                    )
                    continue
                # NaN result also means the test could not be evaluated
                # (e.g., zero-variance input). Treat as un-checkable.
                if np.isnan(p) or np.isnan(w):
                    violations.append(
                        f"Normality test returned NaN ({label}); likely zero-variance or degenerate input"
                    )
                    norm_pass = False
                    confidence_penalty += 2.0
                elif p < self.normality_alpha:
                    violations.append(f"Normality violation ({label}): W={w:.4f}, p={p:.4f}")
                    norm_pass = False
                    confidence_penalty += 2.0 if p >= 0.01 else 3.0

        # Check variance homogeneity. Same conservative handling as
        # above: if Levene cannot be computed (raised or returned NaN),
        # force the cascade.
        var_pass = True
        try:
            f_lev, p_lev = stats.levene(group1, group2)
        except Exception as exc:
            violations.append(f"Variance test could not be computed: {exc}")
            var_pass = False
            confidence_penalty += 2.0
            logger.debug("levene raised for %s: %s", gene_name, exc, exc_info=False)
        else:
            if np.isnan(p_lev) or np.isnan(f_lev):
                violations.append(
                    "Variance test returned NaN; likely zero-variance input"
                )
                var_pass = False
                confidence_penalty += 2.0
            elif p_lev < self.normality_alpha:
                violations.append(
                    f"Variance heterogeneity: Levene F={f_lev:.4f}, p={p_lev:.4f}"
                )
                var_pass = False
                confidence_penalty += 2.0 if p_lev >= 0.01 else 3.0

        # Compute confidence score
        max_penalty = 3 * 3.0  # 3 checks × max weight
        confidence = max(0, 1 - confidence_penalty / (max_penalty * 1.2))

        # Choose test based on Guardian validation
        if norm_pass and var_pass:
            # Parametric: independent t-test
            stat, p_val = stats.ttest_ind(group1, group2, equal_var=True)
            test_used = "t_test"
        elif norm_pass and not var_pass:
            # Welch's t-test (unequal variances)
            stat, p_val = stats.ttest_ind(group1, group2, equal_var=False)
            test_used = "welch_t_test"
            cascaded = True
        else:
            # Nonparametric: Mann-Whitney U. When the test cannot be
            # computed (e.g., all values tied across both groups), do
            # NOT silently substitute (0.0, 1.0) --- that marked
            # potentially-true-positive genes "not significant" without
            # the user knowing. Emit NaN and flag test_failed so the
            # caller can exclude/inspect the gene.
            test_used = "mann_whitney"
            cascaded = True
            try:
                stat, p_val = stats.mannwhitneyu(group1, group2, alternative="two-sided")
                test_failed_local = False
                failure_reason = ""
            except ValueError as exc:
                stat = float("nan")
                p_val = float("nan")
                test_failed_local = True
                failure_reason = f"mannwhitneyu raised ValueError: {exc}"
                logger.debug(
                    "mannwhitneyu failed for %s: %s", gene_name, exc, exc_info=False
                )
                violations.append(failure_reason)

            return GeneResult(
                gene_name=gene_name,
                test_used=test_used,
                statistic=float(stat),
                raw_p_value=float(p_val),
                guardian_confidence=confidence,
                assumptions_passed=norm_pass and var_pass,
                cascaded=cascaded,
                violations=violations,
                test_failed=test_failed_local,
                test_failure_reason=failure_reason,
            )

        return GeneResult(
            gene_name=gene_name,
            test_used=test_used,
            statistic=float(stat),
            raw_p_value=float(p_val),
            guardian_confidence=confidence,
            assumptions_passed=norm_pass and var_pass,
            cascaded=cascaded,
            violations=violations,
        )

    def _test_multi_groups(
        self, gene_name: str, groups: List[np.ndarray]
    ) -> GeneResult:
        """Test a single gene across multiple groups with Guardian validation."""
        violations = []
        confidence_penalty = 0.0
        cascaded = False

        # Check normality per group. When Shapiro-Wilk cannot be
        # computed (raised or returned NaN), force the cascade rather
        # than silently letting the parametric test run on un-checkable
        # data.
        norm_pass = True
        for i, data in enumerate(groups):
            if len(data) >= 3:
                try:
                    w, p = stats.shapiro(data)
                except Exception as exc:
                    violations.append(
                        f"Normality test could not be computed (group {i+1}): {exc}"
                    )
                    norm_pass = False
                    confidence_penalty += 2.0
                    logger.debug(
                        "shapiro raised for %s group %d: %s",
                        gene_name, i + 1, exc, exc_info=False,
                    )
                    continue
                if np.isnan(p) or np.isnan(w):
                    violations.append(
                        f"Normality test returned NaN (group {i+1}); "
                        "likely zero-variance or degenerate input"
                    )
                    norm_pass = False
                    confidence_penalty += 2.0
                elif p < self.normality_alpha:
                    violations.append(
                        f"Normality violation (group {i+1}): p={p:.4f}"
                    )
                    norm_pass = False
                    confidence_penalty += 2.0

        # Check variance homogeneity (multi-group Levene). Same
        # conservative handling as above.
        var_pass = True
        try:
            f_lev, p_lev = stats.levene(*groups)
        except Exception as exc:
            violations.append(f"Variance test could not be computed: {exc}")
            var_pass = False
            confidence_penalty += 2.0
            logger.debug(
                "levene raised for %s: %s", gene_name, exc, exc_info=False
            )
        else:
            if np.isnan(p_lev) or np.isnan(f_lev):
                violations.append(
                    "Variance test returned NaN; likely zero-variance input"
                )
                var_pass = False
                confidence_penalty += 2.0
            elif p_lev < self.normality_alpha:
                violations.append(f"Variance heterogeneity: p={p_lev:.4f}")
                var_pass = False
                confidence_penalty += 2.0

        max_penalty = (len(groups) + 1) * 3.0
        confidence = max(0, 1 - confidence_penalty / (max_penalty * 1.2))

        if norm_pass and var_pass:
            stat, p_val = stats.f_oneway(*groups)
            test_used = "anova"
        else:
            stat, p_val = stats.kruskal(*groups)
            test_used = "kruskal_wallis"
            cascaded = True

        return GeneResult(
            gene_name=gene_name,
            test_used=test_used,
            statistic=float(stat),
            raw_p_value=float(p_val),
            guardian_confidence=confidence,
            assumptions_passed=norm_pass and var_pass,
            cascaded=cascaded,
            violations=violations,
        )

    @staticmethod
    def _benjamini_hochberg(p_values: np.ndarray) -> np.ndarray:
        """Apply Benjamini-Hochberg FDR correction."""
        n = len(p_values)
        if n == 0:
            return np.array([])

        # Handle NaN
        valid = ~np.isnan(p_values)
        adjusted = np.ones(n)

        if valid.sum() == 0:
            return adjusted

        # Sort valid p-values
        valid_p = p_values[valid]
        sorted_idx = np.argsort(valid_p)
        sorted_p = valid_p[sorted_idx]

        # BH adjustment
        ranks = np.arange(1, len(sorted_p) + 1)
        adjusted_sorted = sorted_p * len(sorted_p) / ranks

        # Enforce monotonicity (step-up)
        for i in range(len(adjusted_sorted) - 2, -1, -1):
            adjusted_sorted[i] = min(adjusted_sorted[i], adjusted_sorted[i + 1])

        # Clip to [0, 1]
        adjusted_sorted = np.clip(adjusted_sorted, 0, 1)

        # Map back to original indices
        result = np.ones(len(valid_p))
        result[sorted_idx] = adjusted_sorted
        adjusted[valid] = result

        return adjusted

    @staticmethod
    def parse_expression_matrix(csv_content: str) -> Tuple[np.ndarray, List[str], List[str]]:
        """
        Parse a CSV expression matrix.

        Expected format:
            gene,sample1,sample2,...
            GENE_001,123.4,456.7,...

        Returns:
            (expression_matrix, gene_names, sample_names)
        """
        lines = csv_content.strip().split("\n")
        header = lines[0].split(",")
        sample_names = header[1:]

        gene_names = []
        rows = []
        for line in lines[1:]:
            parts = line.split(",")
            gene_names.append(parts[0])
            rows.append([float(x) for x in parts[1:]])

        expression_matrix = np.array(rows)
        return expression_matrix, gene_names, sample_names
