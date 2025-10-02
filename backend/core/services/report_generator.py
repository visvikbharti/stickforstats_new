"""
Report Generation Service
=========================

Simple, functional report generation for MVP.
Focuses on APA formatting and basic PDF export.

Author: Vishal Bharti
Date: 2025-08-26
Version: 1.0.0 (MVP)
"""

import os
import json
from datetime import datetime
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np
from io import BytesIO
import base64

# For PDF generation
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, 
    Spacer, PageBreak, Image, KeepTogether
)
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER, TA_LEFT

import logging

logger = logging.getLogger(__name__)


class APAFormatter:
    """
    Formats statistical results in APA style.
    Focuses on common statistical tests for MVP.
    """
    
    @staticmethod
    def format_p_value(p_value: float) -> str:
        """Format p-value according to APA guidelines."""
        if p_value < 0.001:
            return "p < .001"
        elif p_value < 0.01:
            return f"p = {p_value:.3f}"
        else:
            return f"p = {p_value:.2f}" if p_value >= 0.01 else f"p = {p_value:.3f}"
    
    @staticmethod
    def format_t_test(result: Dict[str, Any]) -> str:
        """
        Format t-test results in APA style.
        
        Example output: t(df) = 2.45, p = .015
        """
        t_stat = result.get('statistic', 0)
        df = result.get('df', 0)
        p_value = result.get('p_value', 1)
        
        # Format the result
        p_formatted = APAFormatter.format_p_value(p_value)
        
        return f"t({df:.0f}) = {t_stat:.2f}, {p_formatted}"
    
    @staticmethod
    def format_anova(result: Dict[str, Any]) -> str:
        """
        Format ANOVA results in APA style.
        
        Example output: F(df1, df2) = 4.56, p = .012
        """
        f_stat = result.get('statistic', 0)
        df1 = result.get('df_between', 0)
        df2 = result.get('df_within', 0)
        p_value = result.get('p_value', 1)
        
        p_formatted = APAFormatter.format_p_value(p_value)
        
        return f"F({df1:.0f}, {df2:.0f}) = {f_stat:.2f}, {p_formatted}"
    
    @staticmethod
    def format_chi_square(result: Dict[str, Any]) -> str:
        """
        Format chi-square results in APA style.
        
        Example output: χ²(df) = 7.89, p = .019
        """
        chi2_stat = result.get('statistic', 0)
        df = result.get('df', 0)
        p_value = result.get('p_value', 1)
        
        p_formatted = APAFormatter.format_p_value(p_value)
        
        return f"χ²({df:.0f}) = {chi2_stat:.2f}, {p_formatted}"
    
    @staticmethod
    def format_correlation(result: Dict[str, Any]) -> str:
        """
        Format correlation results in APA style.
        
        Example output: r(df) = .45, p = .001
        """
        r_value = result.get('correlation', 0)
        df = result.get('df', 0)
        p_value = result.get('p_value', 1)
        
        p_formatted = APAFormatter.format_p_value(p_value)
        
        return f"r({df:.0f}) = {r_value:.2f}, {p_formatted}"
    
    @staticmethod
    def format_confidence_interval(lower: float, upper: float, confidence: float = 0.95) -> str:
        """
        Format confidence interval in APA style.
        
        Example output: 95% CI [2.34, 5.67]
        """
        percentage = int(confidence * 100)
        return f"{percentage}% CI [{lower:.2f}, {upper:.2f}]"
    
    @staticmethod
    def format_descriptive_stats(data: pd.Series) -> str:
        """
        Format descriptive statistics in APA style.
        
        Example output: (M = 4.56, SD = 1.23)
        """
        mean = data.mean()
        std = data.std()
        return f"(M = {mean:.2f}, SD = {std:.2f})"


class ReportGenerator:
    """
    Generates statistical analysis reports in various formats.
    MVP version focuses on PDF with basic formatting.
    """
    
    def __init__(self):
        """Initialize report generator."""
        self.apa_formatter = APAFormatter()
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Setup custom paragraph styles."""
        # Title style
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Title'],
            fontSize=24,
            textColor=colors.HexColor('#1a1a1a'),
            spaceAfter=30,
            alignment=TA_CENTER
        ))
        
        # Heading style
        self.styles.add(ParagraphStyle(
            name='CustomHeading',
            parent=self.styles['Heading1'],
            fontSize=14,
            textColor=colors.HexColor('#2c3e50'),
            spaceAfter=12,
            spaceBefore=12,
            leftIndent=0
        ))
        
        # Body text style
        self.styles.add(ParagraphStyle(
            name='CustomBody',
            parent=self.styles['BodyText'],
            fontSize=11,
            alignment=TA_JUSTIFY,
            spaceAfter=12
        ))
    
    def generate_report(self, 
                       analysis_type: str,
                       results: Dict[str, Any],
                       metadata: Dict[str, Any] = None,
                       format: str = 'pdf') -> bytes:
        """
        Generate a complete analysis report.
        
        Args:
            analysis_type: Type of analysis performed
            results: Analysis results dictionary
            metadata: Additional metadata (title, author, etc.)
            format: Output format ('pdf', 'html', 'docx')
        
        Returns:
            Report content as bytes
        """
        metadata = metadata or {}
        
        # For MVP, we only support PDF
        if format == 'pdf':
            return self._generate_pdf_report(analysis_type, results, metadata)
        elif format == 'html':
            return self._generate_html_report(analysis_type, results, metadata)
        else:
            raise ValueError(f"Format {format} not supported in MVP")
    
    def _generate_pdf_report(self, 
                            analysis_type: str,
                            results: Dict[str, Any],
                            metadata: Dict[str, Any]) -> bytes:
        """Generate PDF report using ReportLab."""
        
        # Create PDF in memory
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18,
        )
        
        # Container for the 'Flowable' objects
        elements = []
        
        # Title
        title = metadata.get('title', f'{analysis_type.replace("_", " ").title()} Analysis Report')
        elements.append(Paragraph(title, self.styles['CustomTitle']))
        elements.append(Spacer(1, 12))
        
        # Metadata section
        if metadata.get('author'):
            elements.append(Paragraph(f"<b>Author:</b> {metadata['author']}", self.styles['CustomBody']))
        elements.append(Paragraph(f"<b>Date:</b> {datetime.now().strftime('%B %d, %Y')}", self.styles['CustomBody']))
        elements.append(Paragraph(f"<b>Analysis Type:</b> {analysis_type.replace('_', ' ').title()}", self.styles['CustomBody']))
        elements.append(Spacer(1, 20))
        
        # Executive Summary
        elements.append(Paragraph("Executive Summary", self.styles['CustomHeading']))
        summary = self._generate_summary(analysis_type, results)
        elements.append(Paragraph(summary, self.styles['CustomBody']))
        elements.append(Spacer(1, 12))
        
        # Methods Section
        elements.append(Paragraph("Methods", self.styles['CustomHeading']))
        methods = self._generate_methods(analysis_type, results)
        elements.append(Paragraph(methods, self.styles['CustomBody']))
        elements.append(Spacer(1, 12))
        
        # Results Section
        elements.append(Paragraph("Results", self.styles['CustomHeading']))
        results_text = self._generate_results_text(analysis_type, results)
        elements.append(Paragraph(results_text, self.styles['CustomBody']))
        elements.append(Spacer(1, 12))
        
        # Tables if applicable
        if 'table_data' in results:
            elements.append(Paragraph("Statistical Tables", self.styles['CustomHeading']))
            table = self._create_results_table(results['table_data'])
            elements.append(table)
            elements.append(Spacer(1, 12))
        
        # Interpretation
        elements.append(Paragraph("Interpretation", self.styles['CustomHeading']))
        interpretation = self._generate_interpretation(analysis_type, results)
        elements.append(Paragraph(interpretation, self.styles['CustomBody']))
        elements.append(Spacer(1, 12))
        
        # Assumptions
        if 'assumptions' in results:
            elements.append(Paragraph("Statistical Assumptions", self.styles['CustomHeading']))
            assumptions = self._generate_assumptions_text(results['assumptions'])
            elements.append(Paragraph(assumptions, self.styles['CustomBody']))
            elements.append(Spacer(1, 12))
        
        # References
        elements.append(Paragraph("References", self.styles['CustomHeading']))
        elements.append(Paragraph(
            "Statistical analysis performed using StickForStats (Version 1.0.0). "
            "All statistical methods follow APA guidelines (7th Edition).",
            self.styles['CustomBody']
        ))
        
        # Build PDF
        doc.build(elements)
        pdf_content = buffer.getvalue()
        buffer.close()
        
        return pdf_content
    
    def _generate_summary(self, analysis_type: str, results: Dict[str, Any]) -> str:
        """Generate executive summary based on results."""
        
        # Check significance
        p_value = results.get('p_value', 1)
        is_significant = p_value < 0.05
        
        if analysis_type == 't_test':
            if is_significant:
                return (
                    f"The analysis revealed a statistically significant difference between groups "
                    f"({self.apa_formatter.format_t_test(results)}). "
                    f"This suggests that the groups differ meaningfully on the measured variable."
                )
            else:
                return (
                    f"The analysis did not reveal a statistically significant difference between groups "
                    f"({self.apa_formatter.format_t_test(results)}). "
                    f"There is insufficient evidence to conclude that the groups differ."
                )
        
        elif analysis_type == 'anova':
            if is_significant:
                return (
                    f"The ANOVA revealed a statistically significant difference among groups "
                    f"({self.apa_formatter.format_anova(results)}). "
                    f"At least one group differs from the others."
                )
            else:
                return (
                    f"The ANOVA did not reveal a statistically significant difference among groups "
                    f"({self.apa_formatter.format_anova(results)}). "
                    f"There is insufficient evidence of group differences."
                )
        
        elif analysis_type == 'chi_square':
            if is_significant:
                return (
                    f"The chi-square test revealed a statistically significant association "
                    f"({self.apa_formatter.format_chi_square(results)}). "
                    f"The variables appear to be related."
                )
            else:
                return (
                    f"The chi-square test did not reveal a statistically significant association "
                    f"({self.apa_formatter.format_chi_square(results)}). "
                    f"The variables appear to be independent."
                )
        
        else:
            return "Statistical analysis was completed successfully. See results below for details."
    
    def _generate_methods(self, analysis_type: str, results: Dict[str, Any]) -> str:
        """Generate methods section text."""
        
        methods_map = {
            't_test': (
                "An independent samples t-test was conducted to compare the means of two groups. "
                "The t-test assumes normality of distributions and homogeneity of variance. "
                "Alpha level was set at .05 for determining statistical significance."
            ),
            'anova': (
                "A one-way analysis of variance (ANOVA) was conducted to examine differences among groups. "
                "ANOVA assumes normality, homogeneity of variance, and independence of observations. "
                "Alpha level was set at .05 for determining statistical significance."
            ),
            'chi_square': (
                "A chi-square test of independence was performed to examine the relationship between categorical variables. "
                "The test assumes independence of observations and expected frequencies greater than 5. "
                "Alpha level was set at .05 for determining statistical significance."
            ),
            'correlation': (
                "Pearson correlation coefficient was calculated to assess the linear relationship between variables. "
                "The analysis assumes normality, linearity, and homoscedasticity. "
                "Alpha level was set at .05 for determining statistical significance."
            ),
            'regression': (
                "Linear regression analysis was conducted to examine the predictive relationship between variables. "
                "The analysis assumes linearity, independence, homoscedasticity, and normality of residuals. "
                "Alpha level was set at .05 for determining statistical significance."
            )
        }
        
        return methods_map.get(
            analysis_type,
            "Statistical analysis was performed using appropriate methods for the data type and research question."
        )
    
    def _generate_results_text(self, analysis_type: str, results: Dict[str, Any]) -> str:
        """Generate results section text in APA format."""
        
        # Get formatted statistical results
        if analysis_type == 't_test':
            stats_text = self.apa_formatter.format_t_test(results)
            
            # Add effect size if available
            if 'effect_size' in results:
                stats_text += f", d = {results['effect_size']:.2f}"
            
            # Add confidence interval if available
            if 'ci_lower' in results and 'ci_upper' in results:
                ci_text = self.apa_formatter.format_confidence_interval(
                    results['ci_lower'], 
                    results['ci_upper']
                )
                stats_text += f", {ci_text}"
        
        elif analysis_type == 'anova':
            stats_text = self.apa_formatter.format_anova(results)
            
            # Add effect size (eta squared) if available
            if 'eta_squared' in results:
                stats_text += f", η² = {results['eta_squared']:.3f}"
        
        elif analysis_type == 'chi_square':
            stats_text = self.apa_formatter.format_chi_square(results)
            
            # Add effect size (Cramer's V) if available
            if 'cramers_v' in results:
                stats_text += f", V = {results['cramers_v']:.3f}"
        
        elif analysis_type == 'correlation':
            stats_text = self.apa_formatter.format_correlation(results)
            
            # Add R-squared if available
            if 'r_squared' in results:
                stats_text += f", R² = {results['r_squared']:.3f}"
        
        else:
            # Generic result formatting
            stats_text = f"Statistical analysis completed with p = {results.get('p_value', 'N/A')}"
        
        return f"The statistical analysis yielded the following results: {stats_text}."
    
    def _generate_interpretation(self, analysis_type: str, results: Dict[str, Any]) -> str:
        """Generate interpretation of results."""
        
        p_value = results.get('p_value', 1)
        is_significant = p_value < 0.05
        
        base_interpretation = "Based on the statistical analysis, " 
        
        if is_significant:
            base_interpretation += (
                "the results are statistically significant at the .05 alpha level. "
                "This provides evidence to reject the null hypothesis. "
            )
            
            # Add effect size interpretation if available
            if 'effect_size' in results:
                d = results['effect_size']
                if abs(d) < 0.2:
                    effect = "negligible"
                elif abs(d) < 0.5:
                    effect = "small"
                elif abs(d) < 0.8:
                    effect = "medium"
                else:
                    effect = "large"
                base_interpretation += f"The effect size indicates a {effect} practical significance. "
        else:
            base_interpretation += (
                "the results are not statistically significant at the .05 alpha level. "
                "There is insufficient evidence to reject the null hypothesis. "
                "This does not prove the null hypothesis is true, only that we lack evidence against it."
            )
        
        return base_interpretation
    
    def _generate_assumptions_text(self, assumptions: Dict[str, Any]) -> str:
        """Generate text about assumption checking."""
        
        text = "The following statistical assumptions were evaluated:\n\n"
        
        for assumption, result in assumptions.items():
            if isinstance(result, dict):
                passed = result.get('passed', False)
                test_used = result.get('test', 'visual inspection')
                p_value = result.get('p_value')
                
                status = "satisfied" if passed else "violated"
                text += f"• {assumption.replace('_', ' ').title()}: {status}"
                
                if p_value is not None:
                    text += f" ({test_used}, p = {p_value:.3f})"
                text += "\n"
        
        return text
    
    def _create_results_table(self, table_data: Dict[str, Any]) -> Table:
        """Create a formatted table for results."""
        
        # Simple table creation for MVP
        data = table_data.get('data', [])
        if not data:
            return Table([["No table data available"]])
        
        # Create table with styling
        table = Table(data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        return table
    
    def _generate_html_report(self, 
                            analysis_type: str,
                            results: Dict[str, Any],
                            metadata: Dict[str, Any]) -> bytes:
        """Generate simple HTML report for MVP."""
        
        title = metadata.get('title', f'{analysis_type.replace("_", " ").title()} Analysis Report')
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>{title}</title>
            <style>
                body {{
                    font-family: 'Times New Roman', serif;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                    line-height: 1.6;
                }}
                h1 {{ color: #2c3e50; }}
                h2 {{ color: #34495e; margin-top: 30px; }}
                .metadata {{ color: #7f8c8d; margin-bottom: 20px; }}
                .results {{ background: #ecf0f1; padding: 15px; border-radius: 5px; }}
                .significant {{ color: #27ae60; font-weight: bold; }}
                .not-significant {{ color: #e74c3c; }}
            </style>
        </head>
        <body>
            <h1>{title}</h1>
            
            <div class="metadata">
                <p><strong>Date:</strong> {datetime.now().strftime('%B %d, %Y')}</p>
                <p><strong>Analysis Type:</strong> {analysis_type.replace('_', ' ').title()}</p>
            </div>
            
            <h2>Executive Summary</h2>
            <p>{self._generate_summary(analysis_type, results)}</p>
            
            <h2>Methods</h2>
            <p>{self._generate_methods(analysis_type, results)}</p>
            
            <h2>Results</h2>
            <div class="results">
                <p>{self._generate_results_text(analysis_type, results)}</p>
            </div>
            
            <h2>Interpretation</h2>
            <p>{self._generate_interpretation(analysis_type, results)}</p>
            
            <hr>
            <p style="font-size: 0.9em; color: #95a5a6;">
                Generated by StickForStats v1.0.0 | Statistical analysis with integrity
            </p>
        </body>
        </html>
        """
        
        return html.encode('utf-8')


# Simple factory function for easy use
def generate_report(analysis_type: str, 
                   results: Dict[str, Any],
                   metadata: Dict[str, Any] = None,
                   format: str = 'pdf') -> bytes:
    """
    Convenience function to generate reports.
    
    Example:
        report_bytes = generate_report('t_test', results, {'title': 'My Analysis'})
    """
    generator = ReportGenerator()
    return generator.generate_report(analysis_type, results, metadata, format)