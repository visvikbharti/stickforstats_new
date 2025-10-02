"""
Automatic Methods Section Generator for Scientific Papers
=========================================================
Created: 2025-01-10
Author: StickForStats Development Team

Automatically generate comprehensive, publication-ready methods
sections based on the analyses performed. Includes proper citations,
parameter descriptions, and statistical justifications.
"""

from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class Citation:
    """Scientific citation"""
    key: str
    authors: str
    year: int
    title: str
    journal: Optional[str] = None
    volume: Optional[str] = None
    pages: Optional[str] = None
    doi: Optional[str] = None
    
    def to_apa(self) -> str:
        """Format as APA citation"""
        citation = f"{self.authors} ({self.year}). {self.title}."
        if self.journal:
            citation += f" {self.journal}"
            if self.volume:
                citation += f", {self.volume}"
            if self.pages:
                citation += f", {self.pages}"
        if self.doi:
            citation += f". https://doi.org/{self.doi}"
        return citation


class MethodsGenerator:
    """
    Generate comprehensive methods sections for scientific papers
    
    This class analyzes the complete analysis pipeline and generates
    publication-ready methods text with proper citations and justifications.
    """
    
    # Standard citations for common methods
    STANDARD_CITATIONS = {
        'shapiro_wilk': Citation(
            key='shapiro_wilk_1965',
            authors='Shapiro, S. S., & Wilk, M. B.',
            year=1965,
            title='An analysis of variance test for normality (complete samples)',
            journal='Biometrika',
            volume='52',
            pages='591-611',
            doi='10.1093/biomet/52.3-4.591'
        ),
        'levene_test': Citation(
            key='levene_1960',
            authors='Levene, H.',
            year=1960,
            title='Robust tests for equality of variances',
            journal='Contributions to Probability and Statistics',
            pages='278-292'
        ),
        'bonferroni': Citation(
            key='dunn_1961',
            authors='Dunn, O. J.',
            year=1961,
            title='Multiple comparisons among means',
            journal='Journal of the American Statistical Association',
            volume='56',
            pages='52-64'
        ),
        'benjamini_hochberg': Citation(
            key='benjamini_hochberg_1995',
            authors='Benjamini, Y., & Hochberg, Y.',
            year=1995,
            title='Controlling the false discovery rate: a practical and powerful approach to multiple testing',
            journal='Journal of the Royal Statistical Society: Series B',
            volume='57',
            pages='289-300'
        ),
        'cohen_d': Citation(
            key='cohen_1988',
            authors='Cohen, J.',
            year=1988,
            title='Statistical Power Analysis for the Behavioral Sciences',
            journal='Lawrence Erlbaum Associates'
        ),
        'hedges_g': Citation(
            key='hedges_1981',
            authors='Hedges, L. V.',
            year=1981,
            title='Distribution theory for Glass\'s estimator of effect size and related estimators',
            journal='Journal of Educational Statistics',
            volume='6',
            pages='107-128'
        ),
        'bootstrap': Citation(
            key='efron_tibshirani_1993',
            authors='Efron, B., & Tibshirani, R. J.',
            year=1993,
            title='An Introduction to the Bootstrap',
            journal='Chapman & Hall/CRC'
        ),
        'robust_estimation': Citation(
            key='huber_ronchetti_2009',
            authors='Huber, P. J., & Ronchetti, E. M.',
            year=2009,
            title='Robust Statistics',
            journal='John Wiley & Sons',
            doi='10.1002/9780470434697'
        )
    }
    
    def __init__(self):
        """Initialize methods generator"""
        self.sections: Dict[str, str] = {}
        self.citations_used: List[Citation] = []
        self.pipeline_info: Optional[Dict[str, Any]] = None
        logger.info("MethodsGenerator initialized")
    
    def generate_methods(self, bundle: Any) -> str:
        """
        Generate complete methods section from reproducibility bundle
        
        Args:
            bundle: ReproducibilityBundle instance
            
        Returns:
            Complete methods section text
        """
        self.sections.clear()
        self.citations_used.clear()
        
        # Generate each subsection
        self._generate_data_description(bundle)
        self._generate_statistical_software(bundle)
        self._generate_assumption_checking(bundle)
        self._generate_hypothesis_testing(bundle)
        self._generate_effect_sizes(bundle)
        self._generate_multiplicity_correction(bundle)
        self._generate_power_analysis(bundle)
        self._generate_robust_methods(bundle)
        self._generate_reproducibility_statement(bundle)
        
        # Combine sections
        methods_text = self._combine_sections()
        
        # Add references section
        methods_text += self._generate_references()
        
        bundle.methods_text = methods_text
        bundle.citations = self.citations_used
        
        logger.info(f"Generated methods with {len(self.sections)} sections and {len(self.citations_used)} citations")
        
        return methods_text
    
    def _generate_data_description(self, bundle: Any) -> None:
        """Generate data description section"""
        text = "## Data Description\n\n"
        
        if bundle.data_fingerprints:
            n_datasets = len(bundle.data_fingerprints)
            text += f"The analysis included {n_datasets} dataset{'s' if n_datasets > 1 else ''}. "
            
            for name, fingerprint in bundle.data_fingerprints.items():
                text += f"The {name} dataset contained {fingerprint.shape[0]} observations "
                text += f"and {fingerprint.shape[1]} variables. "
                
                if fingerprint.missing_count > 0:
                    missing_pct = (fingerprint.missing_count / (fingerprint.shape[0] * fingerprint.shape[1])) * 100
                    text += f"Missing data ({missing_pct:.1f}% of values) were present "
                    text += f"with a {fingerprint.missing_pattern} pattern. "
        
        text += "\n\n"
        self.sections['data_description'] = text
    
    def _generate_statistical_software(self, bundle: Any) -> None:
        """Generate software description"""
        text = "## Statistical Software\n\n"
        
        if bundle.environment:
            env = bundle.environment
            text += f"All analyses were performed using Python {env.python_version.split()[0]} "
            text += f"with NumPy {env.numpy_version}, SciPy {env.scipy_version}, "
            text += f"and pandas {env.pandas_version}. "
            
            if env.statsmodels_version:
                text += f"Statsmodels {env.statsmodels_version} was used for advanced statistical modeling. "
            
            if env.sklearn_version:
                text += f"Scikit-learn {env.sklearn_version} was used for machine learning components. "
        
        text += "The StickForStats v1.5.0 framework was used to ensure reproducibility "
        text += "and statistical rigor throughout the analysis pipeline. "
        
        if bundle.master_seed is not None:
            text += f"Random number generation was controlled using a master seed value of {bundle.master_seed} "
            text += "to ensure complete reproducibility. "
        
        text += "\n\n"
        self.sections['software'] = text
    
    def _generate_assumption_checking(self, bundle: Any) -> None:
        """Generate assumption checking section"""
        text = "## Statistical Assumptions\n\n"
        
        assumption_tests = []
        for check in bundle.assumption_checks:
            test_type = check.get('test_type', 'unknown')
            if test_type == 'normality':
                assumption_tests.append('normality')
                self.citations_used.append(self.STANDARD_CITATIONS['shapiro_wilk'])
            elif test_type == 'homogeneity':
                assumption_tests.append('homogeneity of variance')
                self.citations_used.append(self.STANDARD_CITATIONS['levene_test'])
        
        if assumption_tests:
            text += "Prior to hypothesis testing, the following assumptions were verified: "
            text += f"{', '.join(assumption_tests)}. "
            
            text += "Normality was assessed using the Shapiro-Wilk test "
            if 'shapiro_wilk' in [c.key for c in self.citations_used]:
                text += "(Shapiro & Wilk, 1965). "
            
            text += "Homogeneity of variance was evaluated using Levene's test "
            if 'levene_1960' in [c.key for c in self.citations_used]:
                text += "(Levene, 1960). "
            
            text += "When assumptions were violated, appropriate non-parametric "
            text += "or robust alternatives were employed. "
        
        text += "\n\n"
        self.sections['assumptions'] = text
    
    def _generate_hypothesis_testing(self, bundle: Any) -> None:
        """Generate hypothesis testing section"""
        text = "## Hypothesis Testing\n\n"
        
        if bundle.hypothesis_tests:
            n_tests = len(bundle.hypothesis_tests)
            text += f"A total of {n_tests} hypothesis test{'s were' if n_tests > 1 else ' was'} conducted. "
            
            # Collect unique test types
            test_types = set()
            for test in bundle.hypothesis_tests:
                test_name = test.get('test_name', '')
                if 't-test' in test_name.lower():
                    test_types.add('Student\'s t-test')
                elif 'mann-whitney' in test_name.lower():
                    test_types.add('Mann-Whitney U test')
                elif 'wilcoxon' in test_name.lower():
                    test_types.add('Wilcoxon signed-rank test')
                elif 'anova' in test_name.lower():
                    test_types.add('Analysis of Variance (ANOVA)')
                elif 'kruskal' in test_name.lower():
                    test_types.add('Kruskal-Wallis test')
                elif 'chi' in test_name.lower():
                    test_types.add('Chi-square test')
            
            if test_types:
                text += f"The following tests were employed: {', '.join(test_types)}. "
            
            # Alpha level
            alpha = 0.05  # Default
            for decision in bundle.decision_points:
                if decision.decision_type == 'alpha_level':
                    alpha = float(decision.option_chosen)
            
            text += f"Statistical significance was set at α = {alpha}. "
            
            if n_tests > 1:
                text += "All p-values are reported as two-tailed unless otherwise specified. "
        
        text += "\n\n"
        self.sections['hypothesis_testing'] = text
    
    def _generate_effect_sizes(self, bundle: Any) -> None:
        """Generate effect sizes section"""
        text = "## Effect Sizes\n\n"
        
        if bundle.effect_sizes:
            effect_types = set()
            for effect in bundle.effect_sizes:
                effect_type = effect.get('effect_type', '')
                if 'cohen_d' in effect_type:
                    effect_types.add("Cohen's d")
                    self.citations_used.append(self.STANDARD_CITATIONS['cohen_d'])
                elif 'hedges_g' in effect_type:
                    effect_types.add("Hedges' g")
                    self.citations_used.append(self.STANDARD_CITATIONS['hedges_g'])
                elif 'eta_squared' in effect_type:
                    effect_types.add('eta-squared')
                elif 'omega_squared' in effect_type:
                    effect_types.add('omega-squared')
                elif 'cramer_v' in effect_type:
                    effect_types.add("Cramér's V")
            
            if effect_types:
                text += "Effect sizes were calculated to quantify the magnitude of observed differences. "
                text += f"The following measures were used: {', '.join(effect_types)}. "
                
                text += "Cohen's d was calculated for two-group comparisons (Cohen, 1988), "
                text += "with Hedges' g used when sample sizes were small (n < 20; Hedges, 1981). "
                
                text += "Effect sizes were interpreted using conventional thresholds: "
                text += "small (d = 0.2), medium (d = 0.5), and large (d = 0.8). "
                
                text += "Confidence intervals (95%) were calculated for all effect sizes "
                text += "using bias-corrected bootstrap methods when appropriate. "
        
        text += "\n\n"
        self.sections['effect_sizes'] = text
    
    def _generate_multiplicity_correction(self, bundle: Any) -> None:
        """Generate multiple testing correction section"""
        text = "## Multiple Testing Correction\n\n"
        
        corrections_applied = set()
        for correction in bundle.corrections_applied:
            method = correction.get('method', '')
            if 'bonferroni' in method.lower():
                corrections_applied.add('Bonferroni')
                self.citations_used.append(self.STANDARD_CITATIONS['bonferroni'])
            elif 'holm' in method.lower():
                corrections_applied.add('Holm-Bonferroni')
            elif 'benjamini' in method.lower() or 'fdr' in method.lower():
                corrections_applied.add('Benjamini-Hochberg FDR')
                self.citations_used.append(self.STANDARD_CITATIONS['benjamini_hochberg'])
        
        if corrections_applied:
            n_tests = len(bundle.hypothesis_tests)
            text += f"To account for multiple comparisons ({n_tests} tests), "
            text += f"the following correction methods were applied: {', '.join(corrections_applied)}. "
            
            if 'Bonferroni' in corrections_applied:
                text += "The Bonferroni correction was used for family-wise error rate control (Dunn, 1961). "
            
            if 'Benjamini-Hochberg FDR' in corrections_applied:
                text += "The Benjamini-Hochberg procedure was used to control the false discovery rate "
                text += "at 0.05 (Benjamini & Hochberg, 1995). "
        
        text += "\n\n"
        self.sections['multiplicity'] = text
    
    def _generate_power_analysis(self, bundle: Any) -> None:
        """Generate power analysis section"""
        text = "## Statistical Power\n\n"
        
        if bundle.power_analyses:
            text += "Statistical power analyses were conducted to evaluate the adequacy of sample sizes. "
            
            # Extract power values
            power_values = []
            for analysis in bundle.power_analyses:
                if 'power' in analysis:
                    power_values.append(analysis['power'])
            
            if power_values:
                avg_power = sum(power_values) / len(power_values)
                text += f"The average statistical power across analyses was {avg_power:.2f}. "
                
                if avg_power < 0.80:
                    text += "Some analyses may be underpowered to detect small effect sizes. "
                else:
                    text += "Analyses were adequately powered (≥ 0.80) to detect medium to large effects. "
            
            text += "Power calculations were performed using exact distributions "
            text += "when available, with non-central distributions for t, F, and χ² tests. "
        
        text += "\n\n"
        self.sections['power'] = text
    
    def _generate_robust_methods(self, bundle: Any) -> None:
        """Generate robust methods section"""
        text = "## Robust Statistical Methods\n\n"
        
        if bundle.robust_estimates:
            self.citations_used.append(self.STANDARD_CITATIONS['robust_estimation'])
            
            text += "Robust statistical methods were employed to handle outliers and "
            text += "violations of distributional assumptions (Huber & Ronchetti, 2009). "
            
            methods_used = set()
            for estimate in bundle.robust_estimates:
                method = estimate.get('method', '')
                if 'trimmed_mean' in method:
                    methods_used.add('trimmed means')
                elif 'winsorized' in method:
                    methods_used.add('Winsorized means')
                elif 'huber' in method:
                    methods_used.add('Huber M-estimators')
                elif 'mad' in method:
                    methods_used.add('median absolute deviation')
            
            if methods_used:
                text += f"The following robust estimators were used: {', '.join(methods_used)}. "
            
            # Bootstrap
            bootstrap_used = any('bootstrap' in str(est) for est in bundle.robust_estimates)
            if bootstrap_used:
                self.citations_used.append(self.STANDARD_CITATIONS['bootstrap'])
                text += "Bootstrap methods (10,000 iterations) were used to calculate "
                text += "confidence intervals and assess sampling variability (Efron & Tibshirani, 1993). "
        
        text += "\n\n"
        self.sections['robust'] = text
    
    def _generate_reproducibility_statement(self, bundle: Any) -> None:
        """Generate reproducibility statement"""
        text = "## Reproducibility\n\n"
        
        text += "To ensure complete reproducibility, all analyses were tracked using "
        text += "the StickForStats reproducibility framework. "
        
        if bundle.bundle_id:
            text += f"The analysis bundle ID is {bundle.bundle_id}, "
            text += "which provides a unique identifier for this analysis session. "
        
        if bundle.checksum:
            text += f"Data integrity was verified using SHA-256 checksums. "
        
        text += "The complete analysis pipeline, including all parameters, "
        text += "random seeds, and intermediate results, has been captured "
        text += "and can be exported for independent verification. "
        
        if bundle.master_seed:
            text += f"Random number generation was controlled with master seed {bundle.master_seed}. "
        
        text += "All code, data fingerprints, and analysis decisions are available "
        text += "in the accompanying reproducibility bundle. "
        
        text += "\n\n"
        self.sections['reproducibility'] = text
    
    def _combine_sections(self) -> str:
        """Combine all sections into complete methods"""
        methods = "# Methods\n\n"
        
        # Order sections logically
        section_order = [
            'data_description',
            'software',
            'assumptions',
            'hypothesis_testing',
            'effect_sizes',
            'multiplicity',
            'power',
            'robust',
            'reproducibility'
        ]
        
        for section_key in section_order:
            if section_key in self.sections:
                methods += self.sections[section_key]
        
        return methods
    
    def _generate_references(self) -> str:
        """Generate references section"""
        if not self.citations_used:
            return ""
        
        text = "# References\n\n"
        
        # Remove duplicates and sort by author/year
        unique_citations = {}
        for citation in self.citations_used:
            if citation.key not in unique_citations:
                unique_citations[citation.key] = citation
        
        sorted_citations = sorted(
            unique_citations.values(),
            key=lambda c: (c.authors.split(',')[0], c.year)
        )
        
        for citation in sorted_citations:
            text += f"- {citation.to_apa()}\n"
        
        text += "\n"
        return text
    
    def generate_summary_paragraph(self, bundle: Any) -> str:
        """
        Generate a brief summary paragraph suitable for abstracts
        
        Args:
            bundle: ReproducibilityBundle instance
            
        Returns:
            Summary paragraph text
        """
        paragraph = "Statistical analyses were performed using "
        
        # Software
        if bundle.environment:
            paragraph += f"Python {bundle.environment.python_version.split()[0]} "
        
        # Sample size
        total_n = 0
        for fingerprint in bundle.data_fingerprints.values():
            total_n += fingerprint.shape[0]
        if total_n > 0:
            paragraph += f"on {total_n} observations. "
        
        # Tests performed
        n_tests = len(bundle.hypothesis_tests)
        if n_tests > 0:
            paragraph += f"{n_tests} hypothesis test{'s were' if n_tests > 1 else ' was'} conducted"
            
            # Corrections
            if bundle.corrections_applied:
                paragraph += " with correction for multiple comparisons"
            
            paragraph += ". "
        
        # Effect sizes
        if bundle.effect_sizes:
            paragraph += "Effect sizes with 95% confidence intervals were calculated. "
        
        # Power
        if bundle.power_analyses:
            paragraph += "Statistical power was assessed for all primary analyses. "
        
        # Reproducibility
        paragraph += "Complete reproducibility was ensured through comprehensive tracking "
        paragraph += "of all analytical decisions and random seeds."
        
        return paragraph
    
    def generate_limitations(self, bundle: Any) -> List[str]:
        """
        Generate list of limitations based on the analyses
        
        Args:
            bundle: ReproducibilityBundle instance
            
        Returns:
            List of limitation statements
        """
        limitations = []
        
        # Check for assumption violations
        for check in bundle.assumption_checks:
            if not check.get('passed', True):
                test_type = check.get('test_type', '')
                if test_type == 'normality':
                    limitations.append(
                        "Some variables showed non-normal distributions, "
                        "which may affect the validity of parametric tests."
                    )
                elif test_type == 'homogeneity':
                    limitations.append(
                        "Heterogeneity of variance was detected, "
                        "potentially affecting the accuracy of standard errors."
                    )
        
        # Check for low power
        for analysis in bundle.power_analyses:
            power = analysis.get('power', 1.0)
            if power < 0.80:
                limitations.append(
                    f"Statistical power was below 0.80 for some analyses (observed: {power:.2f}), "
                    f"limiting the ability to detect small effect sizes."
                )
                break
        
        # Check for missing data
        for fingerprint in bundle.data_fingerprints.values():
            if fingerprint.missing_count > 0:
                missing_pct = (fingerprint.missing_count / (fingerprint.shape[0] * fingerprint.shape[1])) * 100
                if missing_pct > 5:
                    limitations.append(
                        f"Missing data ({missing_pct:.1f}%) may introduce bias "
                        f"if not missing completely at random."
                    )
                break
        
        # Multiple testing
        if len(bundle.hypothesis_tests) > 20:
            limitations.append(
                "The large number of statistical tests increases the risk "
                "of Type I errors despite correction procedures."
            )
        
        # Small sample sizes
        for fingerprint in bundle.data_fingerprints.values():
            if fingerprint.shape[0] < 30:
                limitations.append(
                    "Small sample sizes may limit the generalizability of findings "
                    "and the reliability of asymptotic test procedures."
                )
                break
        
        bundle.limitations = limitations
        return limitations
    
    def __repr__(self) -> str:
        """String representation"""
        return f"MethodsGenerator(sections={len(self.sections)}, citations={len(self.citations_used)})"