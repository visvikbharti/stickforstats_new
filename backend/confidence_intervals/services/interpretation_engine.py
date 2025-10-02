"""
Confidence Interval Interpretation Engine
Provides multi-level explanations for all users.
From beginners to expert statisticians.

Author: StickForStats Development Team
Date: August 19, 2025
"""

from typing import Dict, Optional, Any
import numpy as np


class InterpretationEngine:
    """
    Generate clear, educational interpretations of confidence intervals.
    Multiple levels of explanation for different user expertise.
    """
    
    def __init__(self):
        """Initialize interpretation engine with effect size thresholds."""
        # Cohen's d effect size thresholds
        self.effect_size_thresholds = {
            'small': 0.2,
            'medium': 0.5,
            'large': 0.8,
            'very_large': 1.2
        }
    
    def interpret_mean_ci(self,
                         mean: float,
                         ci_lower: float,
                         ci_upper: float,
                         confidence_level: float,
                         sample_size: int,
                         context: Optional[str] = None) -> Dict[str, str]:
        """
        Interpret confidence interval for mean.
        
        Parameters:
        -----------
        mean : float
            Point estimate (sample mean)
        ci_lower : float
            Lower bound of CI
        ci_upper : float
            Upper bound of CI
        confidence_level : float
            Confidence level (e.g., 0.95)
        sample_size : int
            Sample size
        context : str, optional
            Context for interpretation (e.g., "treatment effect")
        
        Returns:
        --------
        dict : Multi-level interpretations
        """
        confidence_pct = int(confidence_level * 100)
        ci_width = ci_upper - ci_lower
        precision = ci_width / (2 * abs(mean)) * 100 if mean != 0 else float('inf')
        
        interpretations = {}
        
        # Beginner interpretation
        interpretations['beginner'] = (
            f"Based on your sample of {sample_size} observations, the average is {mean:.2f}. "
            f"We are {confidence_pct}% confident that the true population average falls between "
            f"{ci_lower:.2f} and {ci_upper:.2f}. This means if we repeated this study 100 times, "
            f"about {confidence_pct} of the confidence intervals would contain the true average."
        )
        
        # Intermediate interpretation
        interpretations['intermediate'] = (
            f"Sample mean: {mean:.4f} (n = {sample_size})\n"
            f"{confidence_pct}% Confidence Interval: [{ci_lower:.4f}, {ci_upper:.4f}]\n"
            f"Margin of Error: ±{(ci_width/2):.4f}\n"
            f"Relative Precision: ±{precision:.1f}%\n\n"
            f"Interpretation: We are {confidence_pct}% confident that the population mean (μ) "
            f"lies within this interval. The interval width of {ci_width:.4f} suggests "
            f"{'good precision' if precision < 10 else 'moderate precision' if precision < 20 else 'limited precision'} "
            f"in our estimate."
        )
        
        # Expert interpretation
        dist_method = "Student's t-distribution" if sample_size < 30 else "either t or z distribution"
        small_sample_note = "Small sample inference applied." if sample_size < 30 else ""
        interpretations['expert'] = (
            f"Point Estimate: x̄ = {mean:.6f}\n"
            f"{confidence_pct}% CI: [{ci_lower:.6f}, {ci_upper:.6f}]\n"
            f"Sample Size: n = {sample_size}\n"
            f"Margin of Error: ±{(ci_width/2):.6f}\n"
            f"CI Width: {ci_width:.6f}\n"
            f"Relative Margin: {precision:.2f}%\n\n"
            f"The confidence interval was constructed using {dist_method} "
            f"with df = {sample_size - 1}. "
            f"{small_sample_note}"
        )
        
        # APA format
        interpretations['apa_format'] = (
            f"M = {mean:.2f}, {confidence_pct}% CI [{ci_lower:.2f}, {ci_upper:.2f}]"
        )
        
        # Practical recommendation
        if ci_lower > 0:
            direction = "positive"
        elif ci_upper < 0:
            direction = "negative"
        else:
            direction = "uncertain (includes zero)"
        
        interpretations['recommendation'] = (
            f"The effect appears to be {direction}. "
            f"{'The interval excludes zero, suggesting a significant effect.' if ci_lower > 0 or ci_upper < 0 else 'The interval includes zero, suggesting the effect may not be significant.'} "
            f"{'Consider increasing sample size for more precision.' if precision > 20 else 'The estimate appears reasonably precise.'}"
        )
        
        return interpretations
    
    def interpret_proportion_ci(self,
                               proportion: float,
                               ci_lower: float,
                               ci_upper: float,
                               confidence_level: float,
                               successes: int,
                               trials: int) -> Dict[str, str]:
        """
        Interpret confidence interval for proportion.
        """
        confidence_pct = int(confidence_level * 100)
        percentage = proportion * 100
        ci_lower_pct = ci_lower * 100
        ci_upper_pct = ci_upper * 100
        
        interpretations = {}
        
        # Beginner interpretation
        interpretations['beginner'] = (
            f"Out of {trials} trials, {successes} were successful ({percentage:.1f}%). "
            f"We are {confidence_pct}% confident that the true success rate in the population "
            f"is between {ci_lower_pct:.1f}% and {ci_upper_pct:.1f}%. "
            f"This gives us a good estimate of how often this outcome occurs."
        )
        
        # Intermediate interpretation
        interpretations['intermediate'] = (
            f"Sample Proportion: {proportion:.4f} ({successes}/{trials})\n"
            f"{confidence_pct}% Confidence Interval: [{ci_lower:.4f}, {ci_upper:.4f}]\n"
            f"In percentage: {percentage:.2f}% [{ci_lower_pct:.2f}%, {ci_upper_pct:.2f}%]\n\n"
            f"This interval estimates the population proportion with {confidence_pct}% confidence. "
            f"The width of {(ci_upper - ci_lower):.4f} indicates "
            f"{'good precision' if (ci_upper - ci_lower) < 0.1 else 'moderate precision' if (ci_upper - ci_lower) < 0.2 else 'limited precision'}."
        )
        
        # Expert interpretation
        interpretations['expert'] = (
            f"p̂ = {proportion:.6f} ({successes}/{trials})\n"
            f"{confidence_pct}% CI: [{ci_lower:.6f}, {ci_upper:.6f}]\n"
            f"Standard Error: {np.sqrt(proportion * (1 - proportion) / trials):.6f}\n"
            f"Method: Wilson score interval (recommended for all sample sizes)\n"
            f"{'Small sample correction applied.' if trials < 30 else ''}"
        )
        
        # APA format
        interpretations['apa_format'] = (
            f"p = {proportion:.3f}, {confidence_pct}% CI [{ci_lower:.3f}, {ci_upper:.3f}]"
        )
        
        # Practical recommendation
        if ci_lower > 0.5:
            interpretations['recommendation'] = "The success rate is significantly above 50%."
        elif ci_upper < 0.5:
            interpretations['recommendation'] = "The success rate is significantly below 50%."
        else:
            interpretations['recommendation'] = "The success rate is not significantly different from 50%."
        
        if trials < 30:
            interpretations['recommendation'] += " Note: Small sample size may affect reliability."
        
        return interpretations
    
    def interpret_bootstrap_ci(self,
                              estimate: float,
                              ci_lower: float,
                              ci_upper: float,
                              confidence_level: float,
                              n_iterations: int) -> Dict[str, str]:
        """
        Interpret bootstrap confidence interval.
        """
        confidence_pct = int(confidence_level * 100)
        ci_width = ci_upper - ci_lower
        
        interpretations = {}
        
        # Beginner interpretation
        interpretations['beginner'] = (
            f"Using a computer simulation technique called 'bootstrap', we estimated that "
            f"the true value is {estimate:.2f}. We are {confidence_pct}% confident it falls "
            f"between {ci_lower:.2f} and {ci_upper:.2f}. This method works well even when "
            f"the data doesn't follow a normal distribution."
        )
        
        # Intermediate interpretation
        interpretations['intermediate'] = (
            f"Bootstrap Estimate: {estimate:.4f}\n"
            f"{confidence_pct}% Bootstrap CI: [{ci_lower:.4f}, {ci_upper:.4f}]\n"
            f"Based on {n_iterations:,} resamples\n\n"
            f"The bootstrap method provides a non-parametric confidence interval "
            f"that doesn't assume any particular distribution. This makes it robust "
            f"for non-normal data or complex statistics."
        )
        
        # Expert interpretation
        interpretations['expert'] = (
            f"Bootstrap Estimate: {estimate:.6f}\n"
            f"{confidence_pct}% Percentile CI: [{ci_lower:.6f}, {ci_upper:.6f}]\n"
            f"Bootstrap Replications: {n_iterations:,}\n"
            f"CI Width: {ci_width:.6f}\n\n"
            f"Non-parametric bootstrap confidence interval using the percentile method. "
            f"Particularly useful for skewed distributions or when the sampling distribution "
            f"is unknown or complex."
        )
        
        # APA format
        interpretations['apa_format'] = (
            f"Bootstrap estimate = {estimate:.2f}, "
            f"{confidence_pct}% CI [{ci_lower:.2f}, {ci_upper:.2f}], "
            f"based on {n_iterations:,} samples"
        )
        
        # Recommendation
        interpretations['recommendation'] = (
            f"The bootstrap CI is particularly appropriate here as it makes no distributional assumptions. "
            f"{'The narrow interval suggests good precision.' if ci_width < abs(estimate) * 0.2 else 'Consider increasing bootstrap iterations or sample size for more precision.'}"
        )
        
        return interpretations
    
    def interpret_comparison_ci(self,
                               mean_diff: float,
                               ci_lower: float,
                               ci_upper: float,
                               p_value: Optional[float],
                               cohens_d: Optional[float],
                               confidence_level: float) -> Dict[str, str]:
        """
        Interpret confidence interval for difference between groups.
        """
        confidence_pct = int(confidence_level * 100)
        
        interpretations = {}
        
        # Determine effect size interpretation
        effect_size_text = self._interpret_effect_size(cohens_d) if cohens_d else ""
        
        # Beginner interpretation
        if ci_lower > 0:
            direction = f"Group 1 is higher by {abs(mean_diff):.2f} units on average"
        elif ci_upper < 0:
            direction = f"Group 2 is higher by {abs(mean_diff):.2f} units on average"
        else:
            direction = "The groups may not differ significantly"
        
        interpretations['beginner'] = (
            f"{direction}. We are {confidence_pct}% confident that the true difference "
            f"between the groups is between {ci_lower:.2f} and {ci_upper:.2f}. "
            f"{'This difference is statistically significant.' if p_value and p_value < 0.05 else 'This difference may not be statistically significant.'}"
        )
        
        # Intermediate interpretation
        interpretations['intermediate'] = (
            f"Mean Difference: {mean_diff:.4f}\n"
            f"{confidence_pct}% CI for Difference: [{ci_lower:.4f}, {ci_upper:.4f}]\n"
        )
        
        if p_value:
            interpretations['intermediate'] += f"p-value: {p_value:.4f}\n"
        
        if cohens_d:
            interpretations['intermediate'] += f"Cohen's d: {cohens_d:.3f} ({effect_size_text})\n"
        
        interpretations['intermediate'] += (
            f"\n{'The confidence interval excludes zero, indicating a significant difference.' if (ci_lower > 0 or ci_upper < 0) else 'The confidence interval includes zero, suggesting no significant difference.'}"
        )
        
        # Expert interpretation
        interpretations['expert'] = (
            f"Mean Difference (μ₁ - μ₂): {mean_diff:.6f}\n"
            f"{confidence_pct}% CI: [{ci_lower:.6f}, {ci_upper:.6f}]\n"
        )
        
        if p_value:
            interpretations['expert'] += f"Two-tailed p-value: {p_value:.6f}\n"
        
        if cohens_d:
            interpretations['expert'] += (
                f"Effect Size (Cohen's d): {cohens_d:.4f}\n"
                f"Effect Size Interpretation: {effect_size_text}\n"
            )
        
        # APA format
        apa_parts = [f"Mean difference = {mean_diff:.2f}"]
        apa_parts.append(f"{confidence_pct}% CI [{ci_lower:.2f}, {ci_upper:.2f}]")
        
        if p_value:
            if p_value < 0.001:
                apa_parts.append("p < .001")
            else:
                apa_parts.append(f"p = {p_value:.3f}")
        
        if cohens_d:
            apa_parts.append(f"d = {cohens_d:.2f}")
        
        interpretations['apa_format'] = ", ".join(apa_parts)
        
        # Practical recommendation
        if ci_lower > 0 or ci_upper < 0:
            interpretations['recommendation'] = (
                f"There is a statistically significant difference between the groups. "
            )
            if cohens_d:
                interpretations['recommendation'] += f"The effect size is {effect_size_text}, "
                if abs(cohens_d) < 0.5:
                    interpretations['recommendation'] += "suggesting limited practical significance."
                else:
                    interpretations['recommendation'] += "suggesting meaningful practical significance."
        else:
            interpretations['recommendation'] = (
                "No statistically significant difference was found between the groups. "
                "Consider whether the study had adequate power to detect meaningful differences."
            )
        
        return interpretations
    
    def _interpret_effect_size(self, cohens_d: float) -> str:
        """
        Interpret Cohen's d effect size.
        
        Parameters:
        -----------
        cohens_d : float
            Cohen's d value
            
        Returns:
        --------
        str : Interpretation of effect size
        """
        abs_d = abs(cohens_d)
        
        if abs_d < self.effect_size_thresholds['small']:
            return "negligible effect"
        elif abs_d < self.effect_size_thresholds['medium']:
            return "small effect"
        elif abs_d < self.effect_size_thresholds['large']:
            return "medium effect"
        elif abs_d < self.effect_size_thresholds['very_large']:
            return "large effect"
        else:
            return "very large effect"
    
    def generate_educational_content(self, ci_type: str) -> Dict[str, str]:
        """
        Generate educational content about confidence intervals.
        
        Parameters:
        -----------
        ci_type : str
            Type of CI ('mean', 'proportion', 'bootstrap', 'comparison')
            
        Returns:
        --------
        dict : Educational content at different levels
        """
        content = {}
        
        if ci_type == 'mean':
            content['concept'] = (
                "A confidence interval for the mean provides a range of plausible values "
                "for the population mean based on sample data."
            )
            content['when_to_use'] = (
                "Use when estimating the average of a continuous variable, such as height, "
                "weight, test scores, or response times."
            )
            content['assumptions'] = (
                "1. Random sampling from the population\n"
                "2. For small samples (n < 30): Data should be approximately normal\n"
                "3. For large samples: Central Limit Theorem applies"
            )
            content['formula'] = "CI = x̄ ± t(α/2, n-1) × (s/√n)"
            
        elif ci_type == 'proportion':
            content['concept'] = (
                "A confidence interval for a proportion estimates the true population "
                "proportion of a binary outcome (success/failure, yes/no)."
            )
            content['when_to_use'] = (
                "Use when estimating percentages or rates, such as response rates, "
                "success rates, or prevalence of a condition."
            )
            content['assumptions'] = (
                "1. Random sampling\n"
                "2. Independent observations\n"
                "3. Sample size adequate (np ≥ 5 and n(1-p) ≥ 5 for normal approximation)"
            )
            content['formula'] = "Wilson CI: (p̂ + z²/2n ± z√(p̂(1-p̂)/n + z²/4n²)) / (1 + z²/n)"
            
        elif ci_type == 'bootstrap':
            content['concept'] = (
                "Bootstrap confidence intervals use resampling to estimate the sampling "
                "distribution without making parametric assumptions."
            )
            content['when_to_use'] = (
                "Use when:\n"
                "- Data is not normally distributed\n"
                "- Sample size is small\n"
                "- Calculating CI for complex statistics (median, correlation, etc.)\n"
                "- Parametric assumptions are questionable"
            )
            content['assumptions'] = (
                "1. Sample is representative of the population\n"
                "2. Observations are independent\n"
                "3. Original sample size is adequate (typically n ≥ 20)"
            )
            content['method'] = (
                "1. Resample data with replacement B times\n"
                "2. Calculate statistic for each resample\n"
                "3. Use percentiles of bootstrap distribution for CI"
            )
            
        elif ci_type == 'comparison':
            content['concept'] = (
                "A confidence interval for the difference between groups estimates "
                "how much two populations differ on average."
            )
            content['when_to_use'] = (
                "Use when comparing:\n"
                "- Treatment vs. control groups\n"
                "- Before vs. after measurements\n"
                "- Two different methods or conditions"
            )
            content['assumptions'] = (
                "Independent samples:\n"
                "1. Random sampling\n"
                "2. Independence between groups\n"
                "3. Normality (for small samples)\n\n"
                "Paired samples:\n"
                "1. Paired observations\n"
                "2. Differences are approximately normal"
            )
            content['interpretation'] = (
                "If CI excludes 0: Significant difference exists\n"
                "If CI includes 0: No significant difference found"
            )
        
        return content