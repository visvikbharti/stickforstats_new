"""
Statistical Quality Score (SQS) Scoring Engine

This module implements the scoring algorithm that analyzes manuscript text
and calculates the Statistical Quality Score based on detection rules.

The SQS ranges from 0-100 and evaluates:
- Effect size reporting (20 points)
- Assumption transparency (15 points)
- Sample and power (15 points)
- Statistical precision (15 points)
- Reproducibility indicators (20 points)
- Guideline compliance (15 points)
"""

import re
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime
import json

from .sqs_rules import (
    ALL_RULES, CATEGORIES, FIELD_WEIGHTS,
    get_rules_by_category, RULE_SUMMARY
)


@dataclass
class Finding:
    """Represents a single rule finding."""
    rule_id: str
    rule_name: str
    category: str
    found: bool
    severity: str
    points_awarded: float
    points_possible: float
    evidence: Optional[str] = None
    location: Optional[str] = None
    recommendation: str = ""
    is_penalty: bool = False


@dataclass
class CategoryScore:
    """Represents the score for a single category."""
    category: str
    name: str
    score: float
    max_score: float
    percentage: float
    findings: List[Finding] = field(default_factory=list)

    @property
    def status(self) -> str:
        """Return status based on percentage."""
        if self.percentage >= 80:
            return "excellent"
        elif self.percentage >= 60:
            return "good"
        elif self.percentage >= 40:
            return "needs_improvement"
        else:
            return "poor"


@dataclass
class SQSReport:
    """Complete SQS analysis report."""
    total_score: float
    max_score: float
    percentage: float
    grade: str
    percentile: Optional[float]
    category_scores: Dict[str, CategoryScore]
    all_findings: List[Finding]
    recommendations: List[str]
    field: str
    analyzed_at: datetime
    manuscript_stats: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        """Convert report to dictionary for JSON serialization."""
        return {
            'total_score': round(self.total_score, 2),
            'max_score': self.max_score,
            'percentage': round(self.percentage, 1),
            'grade': self.grade,
            'percentile': self.percentile,
            'category_scores': {
                cat: {
                    'name': score.name,
                    'score': round(score.score, 2),
                    'max_score': score.max_score,
                    'percentage': round(score.percentage, 1),
                    'status': score.status,
                    'findings_count': len(score.findings)
                }
                for cat, score in self.category_scores.items()
            },
            'findings_summary': {
                'total': len(self.all_findings),
                'found': len([f for f in self.all_findings if f.found]),
                'missing': len([f for f in self.all_findings if not f.found]),
                'critical_missing': len([
                    f for f in self.all_findings
                    if not f.found and f.severity == 'critical'
                ])
            },
            'top_recommendations': self.recommendations[:10],
            'field': self.field,
            'analyzed_at': self.analyzed_at.isoformat(),
            'manuscript_stats': self.manuscript_stats
        }

    def to_json(self) -> str:
        """Convert report to JSON string."""
        return json.dumps(self.to_dict(), indent=2)


class SQSScorer:
    """
    Statistical Quality Score calculator.

    Analyzes manuscript text and calculates a score based on
    statistical reporting quality criteria.
    """

    def __init__(self, field: str = 'general'):
        """
        Initialize scorer with field-specific weights.

        Args:
            field: Research field for weight adjustments
        """
        self.field = field if field in FIELD_WEIGHTS else 'general'
        self.weights = FIELD_WEIGHTS[self.field]

    def analyze(self, text: str, title: Optional[str] = None) -> SQSReport:
        """
        Run full SQS analysis on manuscript text.

        Args:
            text: Extracted text from manuscript PDF
            title: Optional manuscript title

        Returns:
            SQSReport with complete analysis results
        """
        # Preprocess text
        processed_text = self._preprocess_text(text)

        # Collect manuscript statistics
        manuscript_stats = self._get_manuscript_stats(processed_text)

        # Run all rules and collect findings
        all_findings = []
        category_findings: Dict[str, List[Finding]] = {cat: [] for cat in CATEGORIES}

        for rule in ALL_RULES:
            finding = self._evaluate_rule(rule, processed_text)
            all_findings.append(finding)
            category_findings[rule['category']].append(finding)

        # Calculate category scores
        category_scores = {}
        for cat, cat_info in CATEGORIES.items():
            findings = category_findings[cat]
            raw_score = sum(f.points_awarded for f in findings)
            max_score = cat_info['max_points']

            # Apply field weight
            weighted_score = raw_score * self.weights.get(cat, 1.0)
            weighted_max = max_score * self.weights.get(cat, 1.0)

            # Cap at max
            final_score = min(weighted_score, weighted_max)

            percentage = (final_score / weighted_max * 100) if weighted_max > 0 else 0

            category_scores[cat] = CategoryScore(
                category=cat,
                name=cat_info['name'],
                score=final_score,
                max_score=weighted_max,
                percentage=percentage,
                findings=findings
            )

        # Calculate total score
        total_score = sum(cs.score for cs in category_scores.values())
        max_total = sum(cs.max_score for cs in category_scores.values())
        percentage = (total_score / max_total * 100) if max_total > 0 else 0

        # Generate grade and recommendations
        grade = self._score_to_grade(percentage)
        recommendations = self._generate_recommendations(all_findings)

        return SQSReport(
            total_score=total_score,
            max_score=max_total,
            percentage=percentage,
            grade=grade,
            percentile=None,  # Would need benchmark data
            category_scores=category_scores,
            all_findings=all_findings,
            recommendations=recommendations,
            field=self.field,
            analyzed_at=datetime.now(),
            manuscript_stats=manuscript_stats
        )

    def _preprocess_text(self, text: str) -> str:
        """
        Preprocess manuscript text for analysis.

        Args:
            text: Raw extracted text

        Returns:
            Cleaned and normalized text
        """
        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text)

        # Normalize common statistical symbols
        text = re.sub(r'η2', 'η²', text)
        text = re.sub(r'χ2', 'χ²', text)
        text = re.sub(r'ω2', 'ω²', text)

        # Normalize quotes
        text = re.sub(r'[''´`]', "'", text)
        text = re.sub(r'[""„]', '"', text)

        # Normalize dashes for ranges
        text = re.sub(r'[–—]', '-', text)

        return text

    def _get_manuscript_stats(self, text: str) -> Dict[str, Any]:
        """
        Extract basic statistics about the manuscript.

        Args:
            text: Processed manuscript text

        Returns:
            Dictionary of manuscript statistics
        """
        words = text.split()

        # Count statistical tests mentioned
        test_patterns = {
            't-test': r't[- ]?test|independent\s+samples?\s+t',
            'ANOVA': r'ANOVA|analysis\s+of\s+variance',
            'regression': r'regression|linear\s+model',
            'correlation': r'correlation|Pearson|Spearman',
            'chi-square': r'chi[- ]?square|χ²',
            'mann-whitney': r'Mann[- ]?Whitney|Wilcoxon',
            'mixed-model': r'mixed[- ]?(?:model|effects?)|multilevel|HLM'
        }

        tests_found = {}
        for test_name, pattern in test_patterns.items():
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                tests_found[test_name] = len(matches)

        return {
            'word_count': len(words),
            'character_count': len(text),
            'statistical_tests_mentioned': tests_found,
            'has_methods_section': bool(re.search(
                r'(?:method|methodology|materials?\s+and\s+methods?|procedure)',
                text, re.IGNORECASE
            )),
            'has_results_section': bool(re.search(
                r'(?:result|finding)',
                text, re.IGNORECASE
            ))
        }

    def _evaluate_rule(self, rule: Dict[str, Any], text: str) -> Finding:
        """
        Evaluate a single rule against the manuscript text.

        Args:
            rule: Rule definition dictionary
            text: Processed manuscript text

        Returns:
            Finding object with evaluation results
        """
        pattern = rule['pattern']
        is_penalty = rule.get('is_penalty', False)

        try:
            matches = re.findall(pattern, text, re.IGNORECASE)
            found = len(matches) > 0

            # For penalties, finding the pattern is bad
            if is_penalty:
                points_awarded = rule['points'] if found else 0  # Negative points
            else:
                points_awarded = rule['points'] if found else 0

            # Get evidence (first match, truncated)
            evidence = None
            if found and matches:
                match = matches[0] if isinstance(matches[0], str) else str(matches[0])
                # Get surrounding context
                idx = text.lower().find(match.lower())
                if idx >= 0:
                    start = max(0, idx - 30)
                    end = min(len(text), idx + len(match) + 30)
                    evidence = "..." + text[start:end] + "..."

            return Finding(
                rule_id=rule['id'],
                rule_name=rule['name'],
                category=rule['category'],
                found=found,
                severity=rule['severity'],
                points_awarded=points_awarded,
                points_possible=rule['points'] if not is_penalty else 0,
                evidence=evidence,
                recommendation=rule['recommendation'] if not found else "",
                is_penalty=is_penalty
            )

        except re.error as e:
            # Handle regex errors gracefully
            return Finding(
                rule_id=rule['id'],
                rule_name=rule['name'],
                category=rule['category'],
                found=False,
                severity=rule['severity'],
                points_awarded=0,
                points_possible=rule['points'] if not is_penalty else 0,
                recommendation=f"Error evaluating rule: {str(e)}",
                is_penalty=is_penalty
            )

    def _score_to_grade(self, percentage: float) -> str:
        """
        Convert percentage score to letter grade.

        Args:
            percentage: Score as percentage (0-100)

        Returns:
            Letter grade (A, B, C, D, F)
        """
        if percentage >= 90:
            return 'A'
        elif percentage >= 80:
            return 'B'
        elif percentage >= 70:
            return 'C'
        elif percentage >= 60:
            return 'D'
        else:
            return 'F'

    def _generate_recommendations(self, findings: List[Finding]) -> List[str]:
        """
        Generate prioritized recommendations based on findings.

        Args:
            findings: List of all findings

        Returns:
            Sorted list of recommendation strings
        """
        recommendations = []

        # Sort by severity (critical first) and then by points possible
        severity_order = {'critical': 0, 'important': 1, 'suggested': 2}

        missing_findings = [f for f in findings if not f.found and f.recommendation]
        missing_findings.sort(
            key=lambda f: (severity_order.get(f.severity, 3), -f.points_possible)
        )

        for finding in missing_findings:
            rec = f"[{finding.severity.upper()}] {finding.recommendation}"
            if rec not in recommendations:
                recommendations.append(rec)

        return recommendations[:15]  # Top 15 recommendations


class SQSReportGenerator:
    """
    Generate formatted reports from SQS analysis.
    """

    @staticmethod
    def generate_text_report(report: SQSReport) -> str:
        """
        Generate a plain text summary report.

        Args:
            report: SQSReport object

        Returns:
            Formatted text report
        """
        lines = []
        lines.append("=" * 60)
        lines.append("STATISTICAL QUALITY SCORE (SQS) REPORT")
        lines.append("=" * 60)
        lines.append("")
        lines.append(f"Overall Score: {report.total_score:.1f} / {report.max_score:.0f} ({report.percentage:.1f}%)")
        lines.append(f"Grade: {report.grade}")
        lines.append(f"Field: {report.field.title()}")
        lines.append(f"Analyzed: {report.analyzed_at.strftime('%Y-%m-%d %H:%M')}")
        lines.append("")
        lines.append("-" * 60)
        lines.append("CATEGORY BREAKDOWN")
        lines.append("-" * 60)

        for cat, score in report.category_scores.items():
            status_icon = {
                'excellent': '✓',
                'good': '○',
                'needs_improvement': '⚠',
                'poor': '✗'
            }.get(score.status, '?')

            lines.append(f"{status_icon} {score.name}: {score.score:.1f}/{score.max_score:.0f} ({score.percentage:.0f}%)")

        lines.append("")
        lines.append("-" * 60)
        lines.append("TOP RECOMMENDATIONS")
        lines.append("-" * 60)

        for i, rec in enumerate(report.recommendations[:10], 1):
            lines.append(f"{i}. {rec}")

        lines.append("")
        lines.append("=" * 60)

        return "\n".join(lines)

    @staticmethod
    def generate_html_report(report: SQSReport) -> str:
        """
        Generate an HTML formatted report.

        Args:
            report: SQSReport object

        Returns:
            HTML formatted report
        """
        grade_colors = {
            'A': '#28a745',
            'B': '#5cb85c',
            'C': '#ffc107',
            'D': '#fd7e14',
            'F': '#dc3545'
        }

        grade_color = grade_colors.get(report.grade, '#6c757d')

        html = f"""
<!DOCTYPE html>
<html>
<head>
    <title>Statistical Quality Score Report</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
               max-width: 800px; margin: 0 auto; padding: 20px; }}
        .header {{ text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px; }}
        .score-circle {{
            width: 120px; height: 120px; border-radius: 50%;
            background: {grade_color}; color: white;
            display: flex; align-items: center; justify-content: center;
            font-size: 36px; font-weight: bold; margin: 20px auto;
        }}
        .category {{ padding: 15px; margin: 10px 0; background: #fff; border: 1px solid #dee2e6; border-radius: 4px; }}
        .category-name {{ font-weight: bold; }}
        .progress {{ height: 20px; background: #e9ecef; border-radius: 4px; overflow: hidden; }}
        .progress-bar {{ height: 100%; background: #007bff; }}
        .recommendation {{ padding: 10px; margin: 5px 0; background: #fff3cd; border-left: 4px solid #ffc107; }}
        .critical {{ background: #f8d7da; border-left-color: #dc3545; }}
        .important {{ background: #fff3cd; border-left-color: #ffc107; }}
        .suggested {{ background: #d1ecf1; border-left-color: #17a2b8; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Statistical Quality Score Report</h1>
        <div class="score-circle">{report.grade}</div>
        <h2>{report.total_score:.1f} / {report.max_score:.0f} ({report.percentage:.1f}%)</h2>
        <p>Field: {report.field.title()} | Analyzed: {report.analyzed_at.strftime('%Y-%m-%d')}</p>
    </div>

    <h2>Category Breakdown</h2>
"""

        for cat, score in report.category_scores.items():
            bar_width = min(score.percentage, 100)
            html += f"""
    <div class="category">
        <div class="category-name">{score.name}</div>
        <div class="progress">
            <div class="progress-bar" style="width: {bar_width}%"></div>
        </div>
        <small>{score.score:.1f} / {score.max_score:.0f} ({score.percentage:.0f}%)</small>
    </div>
"""

        html += "<h2>Recommendations</h2>"

        for rec in report.recommendations[:10]:
            severity = 'suggested'
            if '[CRITICAL]' in rec:
                severity = 'critical'
            elif '[IMPORTANT]' in rec:
                severity = 'important'

            html += f'<div class="recommendation {severity}">{rec}</div>\n'

        html += """
</body>
</html>
"""
        return html

    @staticmethod
    def generate_journal_summary(report: SQSReport) -> str:
        """
        Generate a brief summary suitable for journal reviewers.

        Args:
            report: SQSReport object

        Returns:
            Brief summary text
        """
        critical_missing = len([
            f for f in report.all_findings
            if not f.found and f.severity == 'critical'
        ])

        summary = f"""
Statistical Quality Score: {report.total_score:.0f}/100 (Grade: {report.grade})

Category Summary:
"""
        for cat, score in report.category_scores.items():
            summary += f"- {score.name}: {score.percentage:.0f}%\n"

        if critical_missing > 0:
            summary += f"\n⚠ {critical_missing} critical element(s) missing.\n"

        if report.recommendations:
            summary += "\nKey Recommendations:\n"
            for rec in report.recommendations[:5]:
                summary += f"• {rec.replace('[CRITICAL] ', '').replace('[IMPORTANT] ', '').replace('[SUGGESTED] ', '')}\n"

        return summary.strip()


# Convenience function for quick analysis
def analyze_manuscript(text: str, field: str = 'general') -> SQSReport:
    """
    Convenience function to analyze a manuscript.

    Args:
        text: Manuscript text
        field: Research field

    Returns:
        SQSReport object
    """
    scorer = SQSScorer(field=field)
    return scorer.analyze(text)


if __name__ == '__main__':
    # Test with sample text
    sample_text = """
    Methods: Participants (N = 120) were randomly assigned to treatment (n = 60)
    or control (n = 60) conditions. A priori power analysis (G*Power) indicated
    this sample size would provide 80% power to detect a medium effect (d = 0.5).

    Normality was assessed using the Shapiro-Wilk test. Levene's test indicated
    homogeneity of variance, F(1, 118) = 0.34, p = .562.

    Results: An independent samples t-test revealed a significant difference,
    t(118) = 2.45, p = .016, Cohen's d = 0.45, 95% CI [0.08, 0.81].

    Data are available at OSF (https://osf.io/xxxxx). Analyses were conducted
    using R version 4.2.1 with the car package.
    """

    report = analyze_manuscript(sample_text, field='psychology')
    print(SQSReportGenerator.generate_text_report(report))
