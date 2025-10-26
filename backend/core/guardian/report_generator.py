"""
Guardian Validation Report Generator
=====================================
Generates publication-ready validation reports in PDF and JSON formats.
Ensures complete reproducibility and scientific transparency.

Author: StickForStats Development Team
Date: October 2025
"""

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.charts.lineplots import LinePlot
from reportlab.pdfgen import canvas
from datetime import datetime
import json
import io
import base64
from typing import Dict, Any, List
import numpy as np

from .guardian_core import GuardianReport, AssumptionViolation


class GuardianReportGenerator:
    """
    Generates comprehensive validation reports for Guardian checks.

    Supports two formats:
    - PDF: Publication-ready, human-readable format
    - JSON: Machine-readable format for programmatic access
    """

    def __init__(self):
        """Initialize report generator with styling"""
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Create custom paragraph styles for professional appearance"""
        # Title style
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1976d2'),
            spaceAfter=30,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))

        # Section header style
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#1976d2'),
            spaceAfter=12,
            spaceBefore=12,
            fontName='Helvetica-Bold'
        ))

        # Subsection header style
        self.styles.add(ParagraphStyle(
            name='SubsectionHeader',
            parent=self.styles['Heading3'],
            fontSize=13,
            textColor=colors.HexColor('#2e7d32'),
            spaceAfter=8,
            spaceBefore=8,
            fontName='Helvetica-Bold'
        ))

        # Body text style - use unique name to avoid conflicts
        self.styles.add(ParagraphStyle(
            name='GuardianBodyText',
            parent=self.styles['Normal'],
            fontSize=10,
            leading=14,
            alignment=TA_JUSTIFY,
            spaceAfter=8
        ))

        # Critical violation style
        self.styles.add(ParagraphStyle(
            name='CriticalText',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#d32f2f'),
            leading=14,
            fontName='Helvetica-Bold'
        ))

        # Success text style
        self.styles.add(ParagraphStyle(
            name='SuccessText',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#2e7d32'),
            leading=14,
            fontName='Helvetica-Bold'
        ))

    def generate_pdf(self, report: GuardianReport, filename: str = None) -> bytes:
        """
        Generate PDF validation report

        Parameters:
        -----------
        report : GuardianReport
            The Guardian validation report to document
        filename : str, optional
            Output filename (if None, returns bytes)

        Returns:
        --------
        bytes : PDF file content
        """
        # Create PDF buffer
        buffer = io.BytesIO()

        # Create PDF document
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18
        )

        # Build content
        story = []

        # Add header
        story.extend(self._build_header(report))

        # Add executive summary
        story.extend(self._build_executive_summary(report))

        # Add test information
        story.extend(self._build_test_information(report))

        # Add data summary
        story.extend(self._build_data_summary(report))

        # Add assumption checks
        story.extend(self._build_assumption_checks(report))

        # Add diagnostic visualizations
        if report.visual_evidence:
            story.extend(self._build_diagnostic_visualizations(report))

        # Add violations detail
        if report.violations:
            story.extend(self._build_violations_detail(report))

        # Add effect sizes
        if report.effect_size_report:
            story.extend(self._build_effect_sizes(report))

        # Add recommendations
        story.extend(self._build_recommendations(report))

        # Add footer with timestamp
        story.extend(self._build_footer())

        # Build PDF
        doc.build(story)

        # Get PDF bytes
        pdf_bytes = buffer.getvalue()
        buffer.close()

        return pdf_bytes

    def _build_header(self, report: GuardianReport) -> List:
        """Build report header section"""
        elements = []

        # Title
        title = Paragraph(
            "Guardian Validation Report",
            self.styles['CustomTitle']
        )
        elements.append(title)
        elements.append(Spacer(1, 0.2*inch))

        # Subtitle with timestamp
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        subtitle = Paragraph(
            f"<font size=10>Generated: {timestamp}</font><br/>"
            f"<font size=10>StickForStats Platform v1.0</font>",
            self.styles['GuardianBodyText']
        )
        elements.append(subtitle)
        elements.append(Spacer(1, 0.3*inch))

        # Status badge
        if report.can_proceed:
            status_text = "✅ VALIDATION PASSED"
            status_color = colors.HexColor('#2e7d32')
        else:
            status_text = "⛔ VALIDATION FAILED - CRITICAL VIOLATIONS DETECTED"
            status_color = colors.HexColor('#d32f2f')

        status_para = Paragraph(
            f"<font color='{status_color}' size=12><b>{status_text}</b></font>",
            self.styles['GuardianBodyText']
        )
        elements.append(status_para)
        elements.append(Spacer(1, 0.3*inch))

        return elements

    def _build_executive_summary(self, report: GuardianReport) -> List:
        """Build executive summary section"""
        elements = []

        elements.append(Paragraph("Executive Summary", self.styles['SectionHeader']))

        # Summary statistics
        critical_count = sum(1 for v in report.violations if v.severity == 'critical')
        warning_count = sum(1 for v in report.violations if v.severity == 'warning')

        summary_text = f"""
        This report documents the automatic validation performed by the Guardian system
        on {datetime.now().strftime("%Y-%m-%d")} for a <b>{report.test_type}</b> statistical test.
        <br/><br/>
        <b>Validation Summary:</b><br/>
        • Total assumptions checked: <b>{len(report.assumptions_checked)}</b><br/>
        • Critical violations: <b>{critical_count}</b><br/>
        • Warnings: <b>{warning_count}</b><br/>
        • Confidence score: <b>{report.confidence_score * 100:.1f}%</b><br/>
        • Decision: <b>{'PROCEED' if report.can_proceed else 'BLOCKED'}</b>
        """

        elements.append(Paragraph(summary_text, self.styles['GuardianBodyText']))
        elements.append(Spacer(1, 0.2*inch))

        return elements

    def _build_test_information(self, report: GuardianReport) -> List:
        """Build test information section"""
        elements = []

        elements.append(Paragraph("Statistical Test Information", self.styles['SectionHeader']))

        # Test type mapping
        test_names = {
            't_test': 'Student\'s t-test',
            'anova': 'Analysis of Variance (ANOVA)',
            'pearson': 'Pearson Correlation',
            'regression': 'Linear Regression',
            'chi_square': 'Chi-Square Test',
            'mann_whitney': 'Mann-Whitney U Test',
            'kruskal_wallis': 'Kruskal-Wallis Test'
        }

        test_full_name = test_names.get(report.test_type, report.test_type)

        test_info = f"""
        <b>Test Type:</b> {test_full_name}<br/>
        <b>Test Code:</b> {report.test_type}<br/>
        <b>Assumptions Checked:</b> {', '.join(report.assumptions_checked)}
        """

        elements.append(Paragraph(test_info, self.styles['GuardianBodyText']))
        elements.append(Spacer(1, 0.2*inch))

        return elements

    def _build_data_summary(self, report: GuardianReport) -> List:
        """Build data summary section"""
        elements = []

        elements.append(Paragraph("Data Summary", self.styles['SectionHeader']))

        # Create summary table from nested data structure
        data_summary = report.data_summary

        summary_data = [
            ['Statistic', 'Value']
        ]

        # Handle nested dictionary structure (group_1, group_2, or data)
        if isinstance(data_summary, dict):
            # Check if we have grouped data
            if any(key.startswith('group_') for key in data_summary.keys()):
                # Multiple groups - show each group
                for group_name, group_stats in data_summary.items():
                    if isinstance(group_stats, dict):
                        summary_data.append([f"--- {group_name.replace('_', ' ').title()} ---", ""])
                        for stat_name, stat_value in group_stats.items():
                            formatted_value = f"{stat_value:.4f}" if isinstance(stat_value, float) else str(stat_value)
                            summary_data.append([f"  {stat_name.replace('_', ' ').title()}", formatted_value])
            else:
                # Single data group
                for key in ['data', 'group_1']:  # Try both possible keys
                    if key in data_summary and isinstance(data_summary[key], dict):
                        for stat_name, stat_value in data_summary[key].items():
                            formatted_value = f"{stat_value:.4f}" if isinstance(stat_value, float) else str(stat_value)
                            summary_data.append([stat_name.replace('_', ' ').title(), formatted_value])
                        break

        # If still only header, add direct key-value pairs as fallback
        if len(summary_data) == 1:
            for key, value in data_summary.items():
                if not isinstance(value, dict):
                    formatted_value = f"{value:.4f}" if isinstance(value, float) else str(value)
                    summary_data.append([key.replace('_', ' ').title(), formatted_value])

        summary_table = Table(summary_data, colWidths=[2.5*inch, 3.5*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1976d2')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTSIZE', (0, 1), (-1, -1), 9)
        ]))

        elements.append(summary_table)
        elements.append(Spacer(1, 0.3*inch))

        return elements

    def _build_assumption_checks(self, report: GuardianReport) -> List:
        """Build assumption checks section"""
        elements = []

        elements.append(Paragraph("Assumption Validation Results", self.styles['SectionHeader']))

        # Create results table
        results_data = [
            ['Assumption', 'Status', 'Test Statistic', 'P-value', 'Severity']
        ]

        # Add row for each assumption checked
        for assumption in report.assumptions_checked:
            # Find if this assumption was violated
            violation = next((v for v in report.violations if v.assumption == assumption), None)

            if violation:
                status = '❌ Violated'
                stat = f"{violation.statistic:.4f}" if violation.statistic else 'N/A'
                pval = f"{violation.p_value:.4f}" if violation.p_value else 'N/A'
                severity = violation.severity.upper()
            else:
                status = '✅ Satisfied'
                stat = 'N/A'
                pval = 'N/A'
                severity = 'PASSED'

            results_data.append([
                assumption.replace('_', ' ').title(),
                status,
                stat,
                pval,
                severity
            ])

        results_table = Table(results_data, colWidths=[1.5*inch, 1.2*inch, 1.3*inch, 1*inch, 1*inch])
        results_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1976d2')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTSIZE', (0, 1), (-1, -1), 9)
        ]))

        elements.append(results_table)
        elements.append(Spacer(1, 0.3*inch))

        return elements

    def _build_diagnostic_visualizations(self, report: GuardianReport) -> List:
        """Build diagnostic visualizations section"""
        elements = []

        elements.append(PageBreak())  # Start on new page for better layout
        elements.append(Paragraph("Diagnostic Visualizations", self.styles['SectionHeader']))

        intro_text = """
        The following diagnostic plots provide visual evidence for the assumption validation
        results. These plots follow academic publication standards and can be directly
        included in research reports.
        """
        elements.append(Paragraph(intro_text, self.styles['GuardianBodyText']))
        elements.append(Spacer(1, 0.2*inch))

        # Add each visualization
        plot_titles = {
            'qq_plot': 'Q-Q Plot: Normality Assessment',
            'histogram': 'Distribution Analysis',
            'boxplot': 'Outlier Detection',
            'group_comparison': 'Group Comparison'
        }

        for plot_key, plot_title in plot_titles.items():
            if plot_key in report.visual_evidence and report.visual_evidence[plot_key]:
                try:
                    # Get base64 image data
                    img_data = report.visual_evidence[plot_key]

                    # Convert base64 to Image object
                    import base64
                    from io import BytesIO
                    img_bytes = base64.b64decode(img_data)
                    img_buffer = BytesIO(img_bytes)

                    # Create Image object
                    img = Image(img_buffer, width=5*inch, height=3.3*inch)

                    # Add title
                    elements.append(Paragraph(
                        f"<b>{plot_title}</b>",
                        self.styles['SubsectionHeader']
                    ))

                    # Add image
                    elements.append(img)
                    elements.append(Spacer(1, 0.2*inch))

                except Exception as e:
                    # If image loading fails, add error message
                    error_text = f"<font color='red'>Failed to load {plot_title}: {str(e)}</font>"
                    elements.append(Paragraph(error_text, self.styles['GuardianBodyText']))

        elements.append(Spacer(1, 0.2*inch))

        return elements

    def _build_effect_sizes(self, report: GuardianReport) -> List:
        """Build effect sizes section"""
        elements = []

        effect_report = report.effect_size_report
        if not effect_report or not effect_report.get('effect_sizes'):
            return elements

        elements.append(Paragraph("Effect Size Analysis", self.styles['SectionHeader']))

        intro_text = """
        Effect sizes quantify the magnitude of the statistical effect, independent of
        sample size. Reporting effect sizes is essential for scientific transparency and
        is required by many journals (APA 7th edition guidelines).
        """
        elements.append(Paragraph(intro_text, self.styles['GuardianBodyText']))
        elements.append(Spacer(1, 0.15*inch))

        # Create effect sizes table
        effect_data = [['Effect Size', 'Value', 'Magnitude', 'Interpretation']]

        for effect_name, effect_info in effect_report['effect_sizes'].items():
            if effect_info and effect_info.get('value') is not None:
                value = effect_info['value']
                magnitude = effect_info.get('magnitude', 'unknown')
                interpretation = effect_info.get('interpretation', 'N/A')

                # Format value with confidence interval if available
                if effect_info.get('ci_lower') and effect_info.get('ci_upper'):
                    value_str = f"{value:.3f}\n95% CI [{effect_info['ci_lower']:.3f}, {effect_info['ci_upper']:.3f}]"
                else:
                    value_str = f"{value:.3f}"

                effect_data.append([
                    effect_name.replace('_', ' ').title(),
                    value_str,
                    magnitude.replace('_', ' ').title(),
                    interpretation
                ])

        if len(effect_data) > 1:  # Has data rows
            effect_table = Table(effect_data, colWidths=[1.5*inch, 1.5*inch, 1.2*inch, 2.8*inch])
            effect_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2e7d32')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.lightgreen),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('FONTSIZE', (0, 1), (-1, -1), 9)
            ]))

            elements.append(effect_table)
            elements.append(Spacer(1, 0.2*inch))

        # Add reporting recommendations
        if effect_report.get('recommendations'):
            elements.append(Paragraph("Reporting Template:", self.styles['SubsectionHeader']))
            for recommendation in effect_report['recommendations']:
                elements.append(Paragraph(
                    f"• {recommendation}",
                    self.styles['GuardianBodyText']
                ))
            elements.append(Spacer(1, 0.2*inch))

        return elements

    def _build_violations_detail(self, report: GuardianReport) -> List:
        """Build detailed violations section"""
        elements = []

        elements.append(Paragraph("Detailed Violation Analysis", self.styles['SectionHeader']))

        for i, violation in enumerate(report.violations, 1):
            # Violation header
            severity_color = {
                'critical': '#d32f2f',
                'warning': '#f57c00',
                'minor': '#fbc02d'
            }.get(violation.severity, '#666666')

            violation_header = Paragraph(
                f"<font color='{severity_color}'><b>Violation {i}: {violation.assumption.replace('_', ' ').title()}</b></font>",
                self.styles['SubsectionHeader']
            )
            elements.append(violation_header)

            # Violation details - format numbers properly
            test_stat_str = f"{violation.statistic:.4f}" if violation.statistic is not None else 'N/A'
            p_value_str = f"{violation.p_value:.4f}" if violation.p_value is not None else 'N/A'

            details = f"""
            <b>Test Used:</b> {violation.test_name}<br/>
            <b>Severity:</b> {violation.severity.upper()}<br/>
            <b>Test Statistic:</b> {test_stat_str}<br/>
            <b>P-value:</b> {p_value_str}<br/><br/>
            <b>Issue:</b> {violation.message}<br/><br/>
            <b>Recommendation:</b> {violation.recommendation}
            """

            elements.append(Paragraph(details, self.styles['GuardianBodyText']))
            elements.append(Spacer(1, 0.15*inch))

        return elements

    def _build_recommendations(self, report: GuardianReport) -> List:
        """Build enhanced recommendations section with step-by-step guidance"""
        elements = []

        elements.append(PageBreak())  # Start on new page
        elements.append(Paragraph("Guardian Recommendations & Guidance", self.styles['SectionHeader']))

        if report.can_proceed:
            recommendation_text = """
            <font color='#2e7d32'><b>✅ APPROVED TO PROCEED</b></font><br/><br/>
            The Guardian system has validated your data and found no critical violations
            of statistical assumptions. You may proceed with the planned analysis with confidence.
            <br/><br/>
            <b>Next Steps:</b><br/>
            1. Execute your planned statistical test<br/>
            2. Report results including effect sizes (see Effect Size Analysis section above)<br/>
            3. Include this validation report as supplementary material in your publication<br/>
            4. Cite the Guardian system in your methods section
            """
            if report.violations:
                recommendation_text += """<br/><br/>
                <b>⚠️ Minor Warnings Detected:</b><br/>
                Some non-critical warnings were detected. Please review the violation
                details and diagnostic plots above. Consider whether they impact your specific
                research context and report them in your manuscript's limitations section.
                """
        else:
            recommendation_text = """
            <font color='#d32f2f'><b>⛔ ANALYSIS BLOCKED</b></font><br/><br/>
            The Guardian system has detected critical violations of statistical assumptions
            that would make the results of this test unreliable or invalid. To ensure
            scientific integrity, this test has been blocked from execution.<br/><br/>
            <b>⚠️ DO NOT proceed with this analysis.</b> Using inappropriate statistical methods
            can lead to Type I errors, false discoveries, and irreproducible research.
            """

        elements.append(Paragraph(recommendation_text, self.styles['GuardianBodyText']))
        elements.append(Spacer(1, 0.2*inch))

        # Enhanced alternative tests with guidance
        if report.alternative_tests:
            elements.append(Paragraph("Recommended Alternative Tests with Step-by-Step Guidance",
                                    self.styles['SubsectionHeader']))

            # Test guidance mapping
            test_guidance = {
                'mann_whitney': {
                    'full_name': 'Mann-Whitney U Test',
                    'why': 'Non-parametric alternative that does not assume normal distributions',
                    'how': 'Navigate to Module 4 → Statistical Tests → Non-Parametric Tests → Mann-Whitney U Test',
                    'reporting': 'A Mann-Whitney U test was used due to non-normal distributions (Shapiro-Wilk p < 0.05). Results showed U = X, p = Y, r = Z.'
                },
                'welch_t_test': {
                    'full_name': "Welch's t-Test",
                    'why': "Robust to unequal variances (does not assume equal variance)",
                    'how': "Navigate to Module 4 → Statistical Tests → Parametric Tests → Welch's t-Test",
                    'reporting': "A Welch's t-test was used due to unequal variances (Levene's test p < 0.05). Results showed t(df) = X, p = Y, d = Z."
                },
                'permutation_test': {
                    'full_name': 'Permutation Test',
                    'why': 'Distribution-free method using randomization, makes no assumptions about data distribution',
                    'how': 'Navigate to Module 4 → Statistical Tests → Non-Parametric Tests → Permutation Test',
                    'reporting': 'A permutation test (10,000 iterations) was used due to assumption violations. Results showed p = X.'
                },
                'bootstrap': {
                    'full_name': 'Bootstrap Confidence Intervals',
                    'why': 'Resampling method that estimates sampling distribution without parametric assumptions',
                    'how': 'Navigate to Module 4 → Statistical Tests → Non-Parametric Tests → Bootstrap Methods',
                    'reporting': 'Bootstrap confidence intervals (10,000 iterations, BCa method) were computed. 95% CI = [X, Y].'
                },
                'kruskal_wallis': {
                    'full_name': 'Kruskal-Wallis H Test',
                    'why': 'Non-parametric alternative to one-way ANOVA, does not assume normality',
                    'how': 'Navigate to Module 4 → Statistical Tests → Non-Parametric Tests → Kruskal-Wallis Test',
                    'reporting': 'A Kruskal-Wallis H test was used due to non-normal distributions. Results showed H = X, p = Y, η² = Z.'
                },
                'spearman': {
                    'full_name': "Spearman's Rank Correlation",
                    'why': 'Non-parametric correlation that assesses monotonic (not just linear) relationships',
                    'how': 'Navigate to Module 4 → Statistical Tests → Correlation Tests → Spearman Correlation',
                    'reporting': "Spearman's rank correlation was used due to non-normal distributions. Results showed rs = X, p = Y."
                }
            }

            for alt in report.alternative_tests:
                if alt in test_guidance:
                    guidance = test_guidance[alt]

                    # Build text without f-string to avoid format spec issues
                    alt_text = (
                        "<font size=11><b>" + guidance['full_name'] + "</b></font><br/><br/>"
                        "<b>Why Recommended:</b><br/>"
                        + guidance['why'] + "<br/><br/>"
                        "<b>How to Run in StickForStats:</b><br/>"
                        + guidance['how'] + "<br/><br/>"
                        "<b>Reporting Template:</b><br/>"
                        "<font color='#0066cc'><i>\"" + guidance['reporting'] + "\"</i></font><br/><br/>"
                        "<b>References:</b><br/>"
                        "See your statistics textbook or consult appropriate methodology papers "
                        "for detailed information about this test.<br/>"
                    )

                    elements.append(Paragraph(alt_text, self.styles['GuardianBodyText']))
                    elements.append(Spacer(1, 0.15*inch))
                else:
                    # Fallback for tests without detailed guidance
                    alt_text = f"• <b>{alt.replace('_', ' ').title()}</b>"
                    elements.append(Paragraph(alt_text, self.styles['GuardianBodyText']))

        # Add general guidance section
        elements.append(Spacer(1, 0.2*inch))
        elements.append(Paragraph("General Guidance", self.styles['SubsectionHeader']))

        general_guidance = """
        <b>Data Transformation Options:</b><br/>
        If you prefer to use parametric tests, consider transforming your data:<br/>
        • Log transformation: for right-skewed data<br/>
        • Square root transformation: for count data<br/>
        • Inverse transformation: for severely skewed data<br/>
        • Box-Cox transformation: automatic optimal transformation<br/><br/>

        <b>Sample Size Considerations:</b><br/>
        Some tests are robust to assumption violations with large samples (n > 30).
        However, Guardian prioritizes scientific rigor and recommends appropriate
        alternatives when assumptions are clearly violated.<br/><br/>

        <b>Consulting a Statistician:</b><br/>
        If you're unsure which alternative test to use, or if your research design
        is complex, we recommend consulting with a statistician or methodologist.
        """

        elements.append(Paragraph(general_guidance, self.styles['GuardianBodyText']))
        elements.append(Spacer(1, 0.2*inch))

        return elements

    def _build_footer(self) -> List:
        """Build report footer"""
        elements = []

        elements.append(Spacer(1, 0.3*inch))

        footer_text = """
        <font size=8 color='#666666'>
        <b>About Guardian System:</b><br/>
        The Guardian system is an automatic assumption validation system that protects
        researchers from statistical malpractice by validating assumptions before test
        execution. It implements evidence-based blocking to ensure scientific integrity.<br/><br/>

        <b>Citation:</b> If you use this validation report in your research, please cite:<br/>
        StickForStats Platform (2025). Guardian Validation System. https://stickforstats.com<br/><br/>

        <b>Report ID:</b> {report_id}<br/>
        <b>Generated:</b> {timestamp}<br/>
        <b>Platform Version:</b> StickForStats v1.0<br/>
        <b>Guardian Version:</b> 1.0.0
        </font>
        """.format(
            report_id=self._generate_report_id(),
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        )

        elements.append(Paragraph(footer_text, self.styles['GuardianBodyText']))

        return elements

    def _generate_report_id(self) -> str:
        """Generate unique report ID"""
        import hashlib
        timestamp = datetime.now().isoformat()
        return hashlib.md5(timestamp.encode()).hexdigest()[:12].upper()

    def generate_json(self, report: GuardianReport) -> Dict[str, Any]:
        """
        Generate JSON validation report

        Parameters:
        -----------
        report : GuardianReport
            The Guardian validation report to document

        Returns:
        --------
        dict : Complete report in JSON-serializable format
        """
        return {
            'report_metadata': {
                'report_id': self._generate_report_id(),
                'generated_at': datetime.now().isoformat(),
                'generator': 'Guardian Validation System v1.0.0',
                'platform': 'StickForStats v1.0'
            },
            'test_information': {
                'test_type': report.test_type,
                'assumptions_checked': report.assumptions_checked,
                'confidence_score': report.confidence_score
            },
            'data_summary': report.data_summary,
            'validation_results': {
                'can_proceed': report.can_proceed,
                'total_violations': len(report.violations),
                'critical_violations': sum(1 for v in report.violations if v.severity == 'critical'),
                'warnings': sum(1 for v in report.violations if v.severity == 'warning'),
                'minor_issues': sum(1 for v in report.violations if v.severity == 'minor')
            },
            'violations': [
                {
                    'assumption': v.assumption,
                    'test_name': v.test_name,
                    'severity': v.severity,
                    'statistic': v.statistic,
                    'p_value': v.p_value,
                    'message': v.message,
                    'recommendation': v.recommendation,
                    'visual_evidence': v.visual_evidence
                }
                for v in report.violations
            ],
            'alternative_tests': report.alternative_tests,
            'visual_evidence': report.visual_evidence,
            'effect_size_report': report.effect_size_report if report.effect_size_report else {},
            'citation': {
                'text': 'StickForStats Platform (2025). Guardian Validation System.',
                'url': 'https://stickforstats.com',
                'bibtex': '@software{stickforstats2025,\n  title={Guardian Validation System},\n  author={{StickForStats Development Team}},\n  year={2025},\n  url={https://stickforstats.com}\n}'
            }
        }
