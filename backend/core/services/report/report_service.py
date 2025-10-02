import os
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend for server-side rendering
import seaborn as sns
from datetime import datetime
from io import BytesIO
from typing import List, Dict, Any, Optional, Union, Tuple, Callable, ContextManager
import logging
import base64
from dataclasses import dataclass
from pathlib import Path
import uuid
import tempfile
import shutil
import contextlib
from functools import wraps

# PDF Generation
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak

# For plotting
import plotly.io as pio
import plotly.graph_objects as go
import plotly.express as px

# Django models
# from ...models import Report, Analysis, Visualization, User, Dataset  # Models don't exist yet
from typing import Any as Report  # Placeholder type
from typing import Any as Analysis  # Placeholder type
from typing import Any as Visualization  # Placeholder type
from typing import Any as User  # Placeholder type
from typing import Any as Dataset  # Placeholder type
from core.services.error_handler import safe_operation, try_except

logger = logging.getLogger(__name__)

@dataclass
class ReportSection:
    """Class for storing report sections."""
    title: str
    content: str
    level: int = 1  # 1 for main heading, 2 for subheading, etc.
    plots: List[Dict[str, Any]] = None
    tables: List[Dict[str, Any]] = None
    subsections: List['ReportSection'] = None
    
    def __post_init__(self):
        if self.plots is None:
            self.plots = []
        if self.tables is None:
            self.tables = []
        if self.subsections is None:
            self.subsections = []

class ReportService:
    """
    Service for generating comprehensive statistical reports.

    This service compiles analyses, visualizations, and interpretations
    into well-formatted reports in various formats.

    Features:
    - Generate reports from analyses and visualizations
    - Support for PDF, HTML, and DOCX formats
    - Executive summaries and conclusions
    - Customizable report sections and formatting
    - Report history management
    - Safe file operations with atomic writing
    """

    _instance = None

    @classmethod
    def get_instance(cls):
        """Get singleton instance of report service."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def __init__(self, reports_dir: str = 'reports', history_dir: str = 'data/reports/history'):
        """
        Initialize the report service.

        Args:
            reports_dir: Directory to store generated reports
            history_dir: Directory to store report history
        """
        self.reports_dir = Path(reports_dir)
        self.reports_dir.mkdir(parents=True, exist_ok=True)

        self.history_dir = Path(history_dir)
        self.history_dir.mkdir(parents=True, exist_ok=True)

        # Set up styles for PDF reports
        self.styles = getSampleStyleSheet()
        self.setup_custom_styles()

        # Initialize report configuration
        self.default_config = {
            'include_executive_summary': True,
            'include_methodology': True,
            'include_conclusions': True,
            'include_visualizations': True,
            'include_raw_data': False,
            'max_items_per_page': 25,
            'page_numbering': True,
            'watermark': None,
            'logo_path': None
        }
    
    def setup_custom_styles(self):
        """Set up custom styles for PDF reports."""
        self.custom_styles = {
            'Title': ParagraphStyle(
                'CustomTitle',
                parent=self.styles['Heading1'],
                fontSize=24,
                spaceAfter=30,
                alignment=1,  # Center
                textColor=colors.HexColor('#1a237e')
            ),
            'Heading1': ParagraphStyle(
                'CustomHeading1',
                parent=self.styles['Heading1'],
                fontSize=18,
                spaceBefore=20,
                spaceAfter=10,
                textColor=colors.HexColor('#283593')
            ),
            'Heading2': ParagraphStyle(
                'CustomHeading2',
                parent=self.styles['Heading2'],
                fontSize=14,
                spaceBefore=15,
                spaceAfter=8,
                textColor=colors.HexColor('#303f9f')
            ),
            'Heading3': ParagraphStyle(
                'CustomHeading3',
                parent=self.styles['Heading3'],
                fontSize=12,
                spaceBefore=10,
                spaceAfter=6,
                textColor=colors.HexColor('#3949ab')
            ),
            'Normal': ParagraphStyle(
                'CustomNormal',
                parent=self.styles['Normal'],
                fontSize=10,
                spaceBefore=6,
                spaceAfter=6
            ),
            'Code': ParagraphStyle(
                'Code',
                parent=self.styles['Normal'],
                fontName='Courier',
                fontSize=9,
                leftIndent=36,
                spaceBefore=6,
                spaceAfter=6,
                backColor=colors.lightgrey
            ),
            'Caption': ParagraphStyle(
                'Caption',
                parent=self.styles['Normal'],
                fontSize=8,
                alignment=1,  # Center
                italics=True
            )
        }
    
    def generate_report_from_analyses(self, 
                                   user: User,
                                   analyses: List[Analysis],
                                   title: str = "Statistical Analysis Report",
                                   description: Optional[str] = None,
                                   report_format: str = 'pdf',
                                   include_visualizations: bool = True,
                                   include_raw_data: bool = False) -> Tuple[Report, BytesIO]:
        """
        Generate a report from a list of analyses.
        
        Args:
            user: The user generating the report
            analyses: The analyses to include in the report
            title: The report title
            description: Optional report description
            report_format: The output format ('pdf', 'html', 'docx')
            include_visualizations: Whether to include visualizations
            include_raw_data: Whether to include raw data tables
            
        Returns:
            A tuple of (Report object, report binary data)
        """
        # Prepare report data structure
        report_data = {
            'title': title,
            'description': description or "Comprehensive statistical analysis report",
            'user': user.username,
            'date': datetime.now().strftime('%Y-%m-%d %H:%M'),
            'analyses': []
        }
        
        # Create report configuration
        report_config = {
            'include_executive_summary': True,
            'include_methodology': True,
            'include_conclusions': True,
            'include_visualizations': include_visualizations,
            'include_raw_data': include_raw_data
        }

        # Create report object in database
        report_obj = Report.objects.create(
            user=user,
            name=title,
            description=description,
            report_type=report_format,
            parameters=report_config
        )
        
        # Add analyses to report object
        for analysis in analyses:
            report_obj.analyses.add(analysis)
            
            # Extract analysis data for report
            analysis_data = {
                'id': str(analysis.id),
                'name': analysis.name,
                'type': analysis.analysis_type,
                'parameters': analysis.parameters,
                'results': analysis.results,
                'visualizations': []
            }
            
            # Include visualizations if requested
            if include_visualizations:
                visualizations = Visualization.objects.filter(analysis=analysis)
                for viz in visualizations:
                    analysis_data['visualizations'].append({
                        'id': str(viz.id),
                        'title': viz.title,
                        'type': viz.visualization_type,
                        'description': viz.description,
                        'figure_data': viz.figure_data
                    })
            
            report_data['analyses'].append(analysis_data)
        
        # Generate report in requested format
        if report_format == 'pdf':
            report_buffer = self.generate_pdf_report(report_data)
        elif report_format == 'html':
            report_buffer = self.generate_html_report(report_data)
        elif report_format == 'docx':
            report_buffer = self.generate_docx_report(report_data)
        else:
            raise ValueError(f"Unsupported report format: {report_format}")
        
        # Save report file
        filename = f"report_{report_obj.id}.{report_format}"
        report_path = self.reports_dir / filename
        with open(report_path, 'wb') as f:
            f.write(report_buffer.getvalue())
        
        # Update report object with file path
        report_obj.file_path = str(report_path)
        report_obj.save()
        
        return report_obj, report_buffer
    
    @contextlib.contextmanager
    def _atomic_write(self, filepath: Union[str, Path], mode='wb') -> ContextManager[Any]:
        """
        Context manager for safely writing files atomically.

        Creates a temporary file during writing, then replaces the target file
        only if the write operation completes successfully.

        Args:
            filepath: Path to the file to write
            mode: File open mode (defaults to binary write)

        Yields:
            A file-like object for writing
        """
        filepath = Path(filepath)
        filepath.parent.mkdir(parents=True, exist_ok=True)
        temp = None
        try:
            # Create a temp file in the same directory
            with tempfile.NamedTemporaryFile(dir=filepath.parent, delete=False) as temp:
                temp_path = temp.name
            # Open the temp file for writing
            with open(temp_path, mode=mode) as f:
                yield f
            # If we get here, the write succeeded, so move the temp file to the target
            shutil.move(temp_path, filepath)
        except Exception as e:
            # If we failed, clean up the temp file if it exists
            if temp is not None and Path(temp.name).exists():
                os.unlink(temp.name)
            raise e

    @safe_operation
    def get_user_reports(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Get reports history for a user.

        Args:
            user_id: User ID to retrieve reports for
            limit: Maximum number of reports to return

        Returns:
            List of report metadata dictionaries
        """
        try:
            reports = Report.objects.filter(user_id=user_id).order_by('-created_at')[:limit]
            return [
                {
                    'id': str(report.id),
                    'name': report.name,
                    'description': report.description,
                    'created_at': report.created_at.isoformat() if report.created_at else None,
                    'report_type': report.report_type,
                    'file_path': report.file_path,
                }
                for report in reports
            ]
        except Exception as e:
            logger.error(f"Error retrieving reports for user {user_id}: {e}")
            return []

    @safe_operation
    def _save_report_copy(self, report_id: str, buffer: BytesIO, report_format: str) -> str:
        """
        Save a copy of a report to the history directory.

        Args:
            report_id: ID of the report
            buffer: Report data buffer
            report_format: Report format (pdf, html, docx)

        Returns:
            Path to the saved report file
        """
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"report_{report_id}_{timestamp}.{report_format}"
        filepath = self.history_dir / filename

        with self._atomic_write(filepath) as f:
            f.write(buffer.getvalue())

        return str(filepath)

    @safe_operation
    def generate_pdf_report(self, report_data: Dict[str, Any]) -> BytesIO:
        """
        Generate a PDF report.

        Args:
            report_data: The report data dictionary

        Returns:
            A BytesIO containing the PDF report
        """
        buffer = BytesIO()
        
        # Create PDF document
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72
        )
        
        # Build content
        story = []
        
        # Add title page
        story.append(Paragraph(report_data['title'], self.custom_styles['Title']))
        story.append(Spacer(1, 0.5*inch))
        
        # Add report metadata
        story.append(Paragraph(f"Generated for: {report_data['user']}", self.custom_styles['Normal']))
        story.append(Paragraph(f"Date: {report_data['date']}", self.custom_styles['Normal']))
        story.append(Paragraph(f"Report ID: {uuid.uuid4()}", self.custom_styles['Normal']))
        
        if report_data['description']:
            story.append(Spacer(1, 0.5*inch))
            story.append(Paragraph("Description:", self.custom_styles['Heading3']))
            story.append(Paragraph(report_data['description'], self.custom_styles['Normal']))
        
        story.append(PageBreak())
        
        # Add table of contents
        story.append(Paragraph("Table of Contents", self.custom_styles['Heading1']))
        story.append(Spacer(1, 0.1*inch))

        toc_data = [["Section", "Page"]]

        # Add Executive Summary to TOC if included
        if report_data.get('config', {}).get('include_executive_summary', True):
            toc_data.append(["Executive Summary", ""])

        toc_style = TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ])

        # Add analyses to TOC (page numbers will be added later)
        for i, analysis in enumerate(report_data['analyses']):
            toc_data.append([f"{i+1}. {analysis['name']}", ""])

        # Add Conclusions to TOC if included
        if report_data.get('config', {}).get('include_conclusions', True):
            toc_data.append(["Conclusions", ""])

        toc_table = Table(toc_data, colWidths=[5*inch, 0.5*inch])
        toc_table.setStyle(toc_style)
        story.append(toc_table)

        story.append(PageBreak())

        # Add executive summary if requested
        if report_data.get('config', {}).get('include_executive_summary', True):
            self._add_executive_summary(story, report_data)
            story.append(PageBreak())

        # Add each analysis
        for i, analysis in enumerate(report_data['analyses']):
            # Section header
            story.append(Paragraph(f"{i+1}. {analysis['name']}", self.custom_styles['Heading1']))
            story.append(Paragraph(f"Analysis Type: {analysis['type']}", self.custom_styles['Normal']))
            story.append(Spacer(1, 0.1*inch))

            # Add methodology section if requested
            if report_data.get('config', {}).get('include_methodology', True):
                self._add_methodology_section(story, analysis)
            
            # Parameters section
            story.append(Paragraph("Parameters:", self.custom_styles['Heading2']))
            
            # Format parameters as a table
            param_data = [["Parameter", "Value"]]
            for key, value in analysis['parameters'].items():
                param_data.append([key, str(value)])
            
            param_table = Table(param_data, colWidths=[2*inch, 3.5*inch])
            param_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(param_table)
            story.append(Spacer(1, 0.2*inch))
            
            # Results section
            story.append(Paragraph("Results:", self.custom_styles['Heading2']))
            
            # Format based on result type
            if analysis['type'] == 'descriptive_statistics':
                self._add_descriptive_stats_section(story, analysis['results'])
            elif analysis['type'] == 'correlation_analysis':
                self._add_correlation_section(story, analysis['results'])
            elif analysis['type'] in ['t_test_independent', 't_test_paired']:
                self._add_ttest_section(story, analysis['results'])
            elif analysis['type'] == 'anova':
                self._add_anova_section(story, analysis['results'])
            elif analysis['type'] == 'regression':
                self._add_regression_section(story, analysis['results'])
            elif analysis['type'] == 'chi_squared':
                self._add_chi_squared_section(story, analysis['results'])
            else:
                # Generic results formatting for other analysis types
                self._add_generic_results_section(story, analysis['results'])
            
            # Visualizations section
            if analysis['visualizations']:
                story.append(Paragraph("Visualizations:", self.custom_styles['Heading2']))
                
                for j, viz in enumerate(analysis['visualizations']):
                    try:
                        # Add visualization title
                        story.append(Paragraph(f"Figure {i+1}.{j+1}: {viz['title']}", self.custom_styles['Heading3']))
                        
                        # Add description if available
                        if viz['description']:
                            story.append(Paragraph(viz['description'], self.custom_styles['Normal']))
                        
                        # Convert visualization to image
                        if 'figure_data' in viz and viz['figure_data']:
                            img_buf = self._figure_to_image(viz['figure_data'])
                            if img_buf:
                                img = Image(img_buf)
                                img.drawHeight = 4*inch
                                img.drawWidth = 6*inch
                                story.append(img)
                    except Exception as e:
                        logger.error(f"Error adding visualization {j} to report: {str(e)}")
                        story.append(Paragraph(f"Error rendering visualization: {str(e)}", self.custom_styles['Normal']))
            
            # Add page break between analyses
            if i < len(report_data['analyses']) - 1:
                story.append(PageBreak())

        # Add conclusions if requested
        if report_data.get('config', {}).get('include_conclusions', True):
            story.append(PageBreak())
            self._add_conclusions(story, report_data)
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        return buffer
    
    def _add_descriptive_stats_section(self, story: List, results: Dict[str, Any]):
        """Add descriptive statistics section to the report."""
        if 'summary' in results:
            # Create summary table
            summary_data = [["Variable", "Mean", "Median", "Std Dev", "Min", "Max"]]
            for var, stats in results['summary'].items():
                summary_data.append([
                    var,
                    f"{stats['mean']:.4f}",
                    f"{stats['median']:.4f}",
                    f"{stats['std']:.4f}",
                    f"{stats['min']:.4f}",
                    f"{stats['max']:.4f}"
                ])
            
            summary_table = Table(summary_data)
            summary_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(summary_table)
            story.append(Spacer(1, 0.2*inch))
        
        # Add normality tests if available
        if 'normality_tests' in results:
            story.append(Paragraph("Normality Tests:", self.custom_styles['Heading3']))
            
            norm_data = [["Variable", "Test", "Statistic", "p-value", "Normal?"]]
            for var, tests in results['normality_tests'].items():
                for test, result in tests.items():
                    is_normal = result.get('p_value', 0) > 0.05
                    norm_data.append([
                        var,
                        test,
                        f"{result['statistic']:.4f}",
                        f"{result['p_value']:.4f}",
                        "Yes" if is_normal else "No"
                    ])
            
            norm_table = Table(norm_data)
            norm_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(norm_table)
    
    def _add_correlation_section(self, story: List, results: Dict[str, Any]):
        """Add correlation analysis section to the report."""
        if 'correlation_matrix' in results:
            story.append(Paragraph("Correlation Matrix:", self.custom_styles['Heading3']))
            
            # Extract matrix
            matrix = results['correlation_matrix']
            variables = list(matrix.keys())
            
            # Create correlation table
            corr_data = [[""] + variables]
            for var1 in variables:
                row = [var1]
                for var2 in variables:
                    # Format correlation value
                    corr = matrix[var1].get(var2, "")
                    row.append(f"{corr:.4f}" if isinstance(corr, (int, float)) else "")
                corr_data.append(row)
            
            corr_table = Table(corr_data)
            
            # Create style based on correlation values
            styles = [
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                ('TEXTCOLOR', (0, 0), (0, -1), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]
            
            # Color cells based on correlation value
            for i, var1 in enumerate(variables):
                for j, var2 in enumerate(variables):
                    if i > 0 and j > 0:
                        corr = matrix[variables[i-1]].get(variables[j-1], 0)
                        if isinstance(corr, (int, float)):
                            if abs(corr) > 0.7:
                                styles.append(('BACKGROUND', (j, i), (j, i), colors.pink))
                            elif abs(corr) > 0.5:
                                styles.append(('BACKGROUND', (j, i), (j, i), colors.lavender))
            
            corr_table.setStyle(TableStyle(styles))
            story.append(corr_table)
            story.append(Spacer(1, 0.2*inch))
        
        # Add significant correlations
        if 'significant_correlations' in results:
            story.append(Paragraph("Significant Correlations:", self.custom_styles['Heading3']))
            
            sig_data = [["Variable 1", "Variable 2", "Correlation", "p-value"]]
            for corr in results['significant_correlations']:
                sig_data.append([
                    corr['var1'],
                    corr['var2'],
                    f"{corr['correlation']:.4f}",
                    f"{corr['p_value']:.4f}"
                ])
            
            sig_table = Table(sig_data)
            sig_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(sig_table)
    
    def _add_ttest_section(self, story: List, results: Dict[str, Any]):
        """Add t-test results section to the report."""
        # Basic t-test results
        story.append(Paragraph("T-Test Results:", self.custom_styles['Heading3']))
        
        # Create summary table
        summary_data = [
            ["Statistic", "Value"],
            ["T-value", f"{results.get('t_statistic', 0):.4f}"],
            ["p-value", f"{results.get('p_value', 0):.4f}"],
            ["Degrees of Freedom", str(results.get('df', 'N/A'))],
            ["Effect Size (Cohen's d)", f"{results.get('cohens_d', 0):.4f}"]
        ]
        
        # Add significance statement
        if 'p_value' in results:
            if results['p_value'] < 0.05:
                summary_data.append(["Significance", "Significant (p < 0.05)"])
            else:
                summary_data.append(["Significance", "Not significant (p e 0.05)"])
        
        # Create table
        summary_table = Table(summary_data)
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(summary_table)
        story.append(Spacer(1, 0.2*inch))
        
        # Group statistics if available
        if 'group_stats' in results:
            story.append(Paragraph("Group Statistics:", self.custom_styles['Heading3']))
            
            group_data = [["Group", "N", "Mean", "Std Dev", "Std Error"]]
            for group, stats in results['group_stats'].items():
                group_data.append([
                    group,
                    str(stats.get('n', 'N/A')),
                    f"{stats.get('mean', 0):.4f}",
                    f"{stats.get('std', 0):.4f}",
                    f"{stats.get('stderr', 0):.4f}"
                ])
            
            group_table = Table(group_data)
            group_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(group_table)
        
        # Add interpretation
        if 'interpretation' in results:
            story.append(Spacer(1, 0.2*inch))
            story.append(Paragraph("Interpretation:", self.custom_styles['Heading3']))
            story.append(Paragraph(results['interpretation'], self.custom_styles['Normal']))
    
    def _add_anova_section(self, story: List, results: Dict[str, Any]):
        """Add ANOVA results section to the report."""
        story.append(Paragraph("ANOVA Results:", self.custom_styles['Heading3']))
        
        # Main ANOVA table
        if 'anova_table' in results:
            anova_data = [["Source", "SS", "df", "MS", "F", "p-value"]]
            for source, stats in results['anova_table'].items():
                anova_data.append([
                    source,
                    f"{stats.get('sum_sq', 0):.4f}",
                    str(stats.get('df', 'N/A')),
                    f"{stats.get('mean_sq', 0):.4f}",
                    f"{stats.get('F', 0):.4f}",
                    f"{stats.get('PR(>F)', 0):.4f}"
                ])
            
            anova_table = Table(anova_data)
            anova_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(anova_table)
            story.append(Spacer(1, 0.2*inch))
        
        # Effect size
        if 'effect_size' in results:
            story.append(Paragraph(f"Effect Size (��): {results['effect_size']:.4f}", self.custom_styles['Normal']))
            story.append(Spacer(1, 0.1*inch))
        
        # Post-hoc tests if available
        if 'posthoc' in results:
            story.append(Paragraph("Post-hoc Tests:", self.custom_styles['Heading3']))
            
            posthoc_data = [["Group 1", "Group 2", "Mean Diff", "p-value", "Significant"]]
            for test in results['posthoc']:
                posthoc_data.append([
                    test.get('group1', ''),
                    test.get('group2', ''),
                    f"{test.get('mean_diff', 0):.4f}",
                    f"{test.get('p_value', 0):.4f}",
                    "Yes" if test.get('p_value', 1) < 0.05 else "No"
                ])
            
            posthoc_table = Table(posthoc_data)
            posthoc_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(posthoc_table)
        
        # Add interpretation
        if 'interpretation' in results:
            story.append(Spacer(1, 0.2*inch))
            story.append(Paragraph("Interpretation:", self.custom_styles['Heading3']))
            story.append(Paragraph(results['interpretation'], self.custom_styles['Normal']))
    
    def _add_regression_section(self, story: List, results: Dict[str, Any]):
        """Add regression analysis section to the report."""
        story.append(Paragraph("Regression Results:", self.custom_styles['Heading3']))
        
        # Model summary
        if 'model_summary' in results:
            summary = results['model_summary']
            summary_data = [
                ["Metric", "Value"],
                ["R�", f"{summary.get('r_squared', 0):.4f}"],
                ["Adjusted R�", f"{summary.get('adj_r_squared', 0):.4f}"],
                ["F-statistic", f"{summary.get('f_statistic', 0):.4f}"],
                ["p-value", f"{summary.get('p_value', 0):.4f}"],
                ["Number of observations", str(summary.get('n_observations', 'N/A'))]
            ]
            
            summary_table = Table(summary_data)
            summary_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(summary_table)
            story.append(Spacer(1, 0.2*inch))
        
        # Coefficients table
        if 'coefficients' in results:
            story.append(Paragraph("Coefficients:", self.custom_styles['Heading3']))
            
            coef_data = [["Variable", "Coefficient", "Std Error", "t-value", "p-value"]]
            for var, coef in results['coefficients'].items():
                coef_data.append([
                    var,
                    f"{coef.get('value', 0):.4f}",
                    f"{coef.get('std_err', 0):.4f}",
                    f"{coef.get('t_value', 0):.4f}",
                    f"{coef.get('p_value', 0):.4f}"
                ])
            
            coef_table = Table(coef_data)
            coef_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(coef_table)
        
        # Equation
        if 'equation' in results:
            story.append(Spacer(1, 0.2*inch))
            story.append(Paragraph("Regression Equation:", self.custom_styles['Heading3']))
            story.append(Paragraph(results['equation'], self.custom_styles['Normal']))
        
        # Add interpretation
        if 'interpretation' in results:
            story.append(Spacer(1, 0.2*inch))
            story.append(Paragraph("Interpretation:", self.custom_styles['Heading3']))
            story.append(Paragraph(results['interpretation'], self.custom_styles['Normal']))
    
    def _add_chi_squared_section(self, story: List, results: Dict[str, Any]):
        """Add chi-squared test results section to the report."""
        story.append(Paragraph("Chi-squared Test Results:", self.custom_styles['Heading3']))
        
        # Test statistics
        stats_data = [
            ["Statistic", "Value"],
            ["Chi-squared", f"{results.get('chi2', 0):.4f}"],
            ["p-value", f"{results.get('p_value', 0):.4f}"],
            ["Degrees of Freedom", str(results.get('df', 'N/A'))]
        ]
        
        # Add significance statement
        if 'p_value' in results:
            if results['p_value'] < 0.05:
                stats_data.append(["Significance", "Significant (p < 0.05)"])
            else:
                stats_data.append(["Significance", "Not significant (p e 0.05)"])
        
        stats_table = Table(stats_data)
        stats_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(stats_table)
        story.append(Spacer(1, 0.2*inch))
        
        # Contingency table
        if 'contingency_table' in results:
            story.append(Paragraph("Contingency Table:", self.custom_styles['Heading3']))
            
            # Get row and column labels
            rows = list(results['contingency_table'].keys())
            cols = list(results['contingency_table'][rows[0]].keys()) if rows else []
            
            # Create table data
            table_data = [[""] + cols]
            for row in rows:
                table_row = [row]
                for col in cols:
                    table_row.append(str(results['contingency_table'][row].get(col, 0)))
                table_data.append(table_row)
            
            cont_table = Table(table_data)
            cont_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                ('TEXTCOLOR', (0, 0), (0, -1), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(cont_table)
        
        # Add interpretation
        if 'interpretation' in results:
            story.append(Spacer(1, 0.2*inch))
            story.append(Paragraph("Interpretation:", self.custom_styles['Heading3']))
            story.append(Paragraph(results['interpretation'], self.custom_styles['Normal']))
    
    def _add_generic_results_section(self, story: List, results: Dict[str, Any]):
        """Add generic results section for analysis types without specific formatting."""
        # Create a table of key-value pairs for simple results
        simple_results = []
        table_results = {}
        
        # Categorize results
        for key, value in results.items():
            if isinstance(value, (int, float, str, bool)):
                # Simple scalar values go in a key-value table
                simple_results.append([key, str(value)])
            elif isinstance(value, dict):
                # Dictionaries might be tables
                table_results[key] = value
            # Ignore lists and complex objects for now
        
        # Add simple results
        if simple_results:
            simple_data = [["Metric", "Value"]] + simple_results
            simple_table = Table(simple_data)
            simple_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(simple_table)
            story.append(Spacer(1, 0.2*inch))
        
        # Add table results
        for table_name, table_data in table_results.items():
            # Check if this looks like a table (dict of dicts or list of dicts)
            if table_data:
                story.append(Paragraph(f"{table_name}:", self.custom_styles['Heading3']))
                
                # Format based on structure
                if isinstance(next(iter(table_data.values())), dict):
                    # This looks like a 2D table
                    rows = list(table_data.keys())
                    cols = list(table_data[rows[0]].keys()) if rows else []
                    
                    t_data = [[""] + cols]
                    for row in rows:
                        r_data = [row]
                        for col in cols:
                            val = table_data[row].get(col, "")
                            r_data.append(str(val) if not isinstance(val, float) else f"{val:.4f}")
                        t_data.append(r_data)
                    
                    t = Table(t_data)
                    t.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                        ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                        ('TEXTCOLOR', (0, 0), (0, -1), colors.black),
                        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                        ('GRID', (0, 0), (-1, -1), 1, colors.black)
                    ]))
                    
                    story.append(t)
                else:
                    # This is a simple key-value dict
                    t_data = [["Key", "Value"]]
                    for k, v in table_data.items():
                        val = str(v) if not isinstance(v, float) else f"{v:.4f}"
                        t_data.append([k, val])
                    
                    t = Table(t_data)
                    t.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('GRID', (0, 0), (-1, -1), 1, colors.black)
                    ]))
                    
                    story.append(t)
                
                story.append(Spacer(1, 0.2*inch))
    
    def _figure_to_image(self, figure_data: Dict[str, Any]) -> Optional[BytesIO]:
        """
        Convert a figure data dictionary to an image buffer.
        
        Args:
            figure_data: The figure data dictionary (Plotly format)
            
        Returns:
            A BytesIO containing the image, or None if conversion fails
        """
        try:
            # Create a Plotly figure
            if 'data' in figure_data and 'layout' in figure_data:
                fig = go.Figure(data=figure_data['data'], layout=figure_data['layout'])
            else:
                fig = go.Figure(figure_data)
            
            # Convert to image
            img_bytes = BytesIO()
            fig.write_image(img_bytes, format='png', width=800, height=600)
            img_bytes.seek(0)
            return img_bytes
        except Exception as e:
            logger.error(f"Error converting figure to image: {str(e)}")
            return None
    
    def generate_html_report(self, report_data: Dict[str, Any]) -> BytesIO:
        """
        Generate an HTML report.
        
        Args:
            report_data: The report data dictionary
            
        Returns:
            A BytesIO containing the HTML report
        """
        # This would be implemented with HTML templates
        # For now, return a minimal HTML implementation
        buffer = BytesIO()
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>{report_data['title']}</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                h1 {{ color: #1a237e; }}
                h2 {{ color: #283593; }}
                h3 {{ color: #303f9f; }}
                table {{ border-collapse: collapse; width: 100%; margin-bottom: 20px; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                th {{ background-color: #f2f2f2; }}
            </style>
        </head>
        <body>
            <h1>{report_data['title']}</h1>
            <p>Generated for: {report_data['user']}</p>
            <p>Date: {report_data['date']}</p>
            
            <h2>Contents</h2>
            <ul>
        """
        
        # Add TOC
        for i, analysis in enumerate(report_data['analyses']):
            html += f"<li><a href='#analysis_{i}'>{analysis['name']}</a></li>\n"
        
        html += "</ul>\n"
        
        # Add analyses (simplified)
        for i, analysis in enumerate(report_data['analyses']):
            html += f"<h2 id='analysis_{i}'>{i+1}. {analysis['name']}</h2>\n"
            html += f"<p>Analysis Type: {analysis['type']}</p>\n"
            
            # Parameters
            html += "<h3>Parameters</h3>\n<table>\n<tr><th>Parameter</th><th>Value</th></tr>\n"
            for key, value in analysis['parameters'].items():
                html += f"<tr><td>{key}</td><td>{value}</td></tr>\n"
            html += "</table>\n"
            
            # Results (simplified)
            html += "<h3>Results</h3>\n<pre>" + json.dumps(analysis['results'], indent=2) + "</pre>\n"
            
            # Visualizations placeholder
            if analysis['visualizations']:
                html += "<h3>Visualizations</h3>\n"
                html += "<p>Visualizations are not supported in this HTML report preview.</p>\n"
        
        html += """
        </body>
        </html>
        """
        
        buffer.write(html.encode('utf-8'))
        buffer.seek(0)
        return buffer
    
    def _add_executive_summary(self, story: List, report_data: Dict[str, Any]):
        """Add executive summary section to the report."""
        story.append(Paragraph("Executive Summary", self.custom_styles['Heading1']))

        # Generate a summary based on analyses
        summary_text = f"This report presents a comprehensive analysis of {len(report_data['analyses'])} "
        summary_text += f"statistical analyses conducted on the dataset."

        # Add analysis types to summary
        analysis_types = set(analysis['type'] for analysis in report_data['analyses'])
        if analysis_types:
            summary_text += f" The analyses include {', '.join(analysis_types)}."

        # Add key findings if available
        if 'key_findings' in report_data:
            summary_text += "\n\nKey Findings:\n"
            for finding in report_data['key_findings']:
                summary_text += f"\n- {finding}"

        story.append(Paragraph(summary_text, self.custom_styles['Normal']))
        story.append(Spacer(1, 0.3*inch))

    def _add_methodology_section(self, story: List, analysis: Dict[str, Any]):
        """Add methodology section to explain the analysis approach."""
        story.append(Paragraph("Methodology", self.custom_styles['Heading2']))

        # Create methodology description based on analysis type
        methodology_text = ""
        if analysis['type'] == 'descriptive_statistics':
            methodology_text = (
                "Descriptive statistics provide a summary of the central tendency, dispersion, and "
                "shape of the dataset's distribution. Key metrics include mean, median, standard "
                "deviation, minimum, maximum, and quartiles. Normality tests were performed to assess "
                "the distribution shape."
            )
        elif analysis['type'] in ['t_test_independent', 't_test_paired']:
            methodology_text = (
                f"The {analysis['type'].replace('_', ' ')} was performed to compare the means "
                "between two groups. The test calculates a t-statistic and corresponding p-value "
                "to determine statistical significance. Effect size (Cohen's d) was calculated to "
                "quantify the magnitude of the difference."
            )
        elif analysis['type'] == 'anova':
            methodology_text = (
                "Analysis of Variance (ANOVA) was conducted to compare means across multiple groups. "
                "The F-statistic tests the hypothesis that group means are equal. Post-hoc tests "
                "were performed for pairwise comparisons when the overall test was significant."
            )
        elif analysis['type'] == 'correlation_analysis':
            methodology_text = (
                "Correlation analysis measures the strength and direction of relationships between "
                "variables. The correlation coefficient ranges from -1 to 1, where values close to "
                "-1 or 1 indicate strong relationships, and values near 0 indicate weak relationships."
            )
        elif analysis['type'] == 'regression':
            methodology_text = (
                "Regression analysis models the relationship between a dependent variable and one "
                "or more independent variables. The model fits a line or curve to the data, and "
                "statistical tests evaluate the goodness of fit and significance of predictors."
            )
        elif analysis['type'] == 'chi_squared':
            methodology_text = (
                "The Chi-squared test evaluates whether there is a significant association between "
                "categorical variables. It compares observed frequencies to expected frequencies "
                "under the assumption of independence."
            )
        else:
            methodology_text = f"A {analysis['type']} analysis was performed on the data."

        story.append(Paragraph(methodology_text, self.custom_styles['Normal']))
        story.append(Spacer(1, 0.2*inch))

    def _add_conclusions(self, story: List, report_data: Dict[str, Any]):
        """Add conclusions section to the report."""
        story.append(Paragraph("Conclusions", self.custom_styles['Heading1']))

        # Generate conclusions based on analyses
        conclusions_text = ""

        # Extract significant findings from analyses
        significant_findings = []
        for analysis in report_data['analyses']:
            # Extract interpretation if available
            if 'results' in analysis and 'interpretation' in analysis['results']:
                significant_findings.append(analysis['results']['interpretation'])

            # Check for significant p-values
            if 'results' in analysis and 'p_value' in analysis['results']:
                if analysis['results']['p_value'] < 0.05:
                    finding = f"The {analysis['type']} for {analysis['name']} showed significant results "
                    finding += f"(p={analysis['results']['p_value']:.4f})."
                    significant_findings.append(finding)

        if significant_findings:
            conclusions_text = "Based on the analyses conducted, the following conclusions can be drawn:\n\n"
            for i, finding in enumerate(significant_findings):
                conclusions_text += f"{i+1}. {finding}\n\n"
        else:
            conclusions_text = (
                "Based on the analyses conducted, no statistically significant findings were observed. "
                "This suggests that the observed patterns may be due to random variation rather than "
                "underlying relationships in the data."
            )

        # Add recommendations if available
        if 'recommendations' in report_data:
            conclusions_text += "\nRecommendations:\n\n"
            for i, rec in enumerate(report_data['recommendations']):
                conclusions_text += f"{i+1}. {rec}\n\n"

        story.append(Paragraph(conclusions_text, self.custom_styles['Normal']))

    def _add_statistical_analysis_section(self, story: List, analysis: Dict[str, Any]):
        """Add a comprehensive statistical analysis section."""
        story.append(Paragraph("Statistical Analysis", self.custom_styles['Heading2']))

        # Add statistical summary based on analysis type
        if analysis['type'] == 'descriptive_statistics':
            self._add_descriptive_stats_section(story, analysis['results'])
        elif analysis['type'] in ['t_test_independent', 't_test_paired']:
            self._add_ttest_section(story, analysis['results'])
        elif analysis['type'] == 'anova':
            self._add_anova_section(story, analysis['results'])
        elif analysis['type'] == 'correlation_analysis':
            self._add_correlation_section(story, analysis['results'])
        elif analysis['type'] == 'regression':
            self._add_regression_section(story, analysis['results'])
        elif analysis['type'] == 'chi_squared':
            self._add_chi_squared_section(story, analysis['results'])
        else:
            self._add_generic_results_section(story, analysis['results'])

    def _get_plot_description(self, plot_type: str, metadata: Dict[str, Any]) -> str:
        """Generate a standardized description for a plot type."""
        if plot_type == 'histogram':
            return (
                f"This histogram shows the distribution of {metadata.get('x_axis', 'values')}. "
                f"The x-axis represents {metadata.get('x_axis', 'values')} and the y-axis represents frequency. "
                f"The shape of the distribution provides insights into data centrality and spread."
            )
        elif plot_type == 'boxplot':
            return (
                f"This box plot displays the distribution of {metadata.get('y_axis', 'values')}. "
                f"The box represents the interquartile range (IQR), the horizontal line is the median, "
                f"and the whiskers extend to the minimum and maximum values within 1.5 * IQR. "
                f"Points outside the whiskers are potential outliers."
            )
        elif plot_type == 'scatter':
            return (
                f"This scatter plot shows the relationship between {metadata.get('x_axis', 'x')} and "
                f"{metadata.get('y_axis', 'y')}. Each point represents an observation, and the pattern "
                f"of points indicates the strength and direction of the relationship."
            )
        elif plot_type == 'line':
            return (
                f"This line plot shows how {metadata.get('y_axis', 'values')} changes with respect to "
                f"{metadata.get('x_axis', 'time or category')}. The line connects sequential data points "
                f"to highlight trends or patterns over the independent variable."
            )
        elif plot_type == 'pie':
            return (
                f"This pie chart illustrates the composition of {metadata.get('title', 'categories')}. "
                f"Each slice represents a category's proportion of the total, with the entire circle "
                f"representing 100% of the data."
            )
        elif plot_type == 'heatmap':
            return (
                f"This heatmap visualizes the relationship between variables using color intensity. "
                f"Darker colors typically represent higher values, while lighter colors represent lower values."
            )
        else:
            return f"This visualization shows {metadata.get('title', 'data relationships')}."

    def _ensure_plots_data_valid(self, plots: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Validate plot data before inclusion in report."""
        valid_plots = []
        for plot in plots:
            # Check for required fields
            if 'plot_data' not in plot or not plot['plot_data']:
                logger.warning(f"Plot {plot.get('id', 'unknown')} missing plot_data, skipping")
                continue

            # Check if plot data is properly structured for Plotly
            try:
                if 'data' not in plot['plot_data'] and 'layout' not in plot['plot_data']:
                    logger.warning(f"Plot {plot.get('id', 'unknown')} has invalid plot_data structure")
                    continue
            except Exception as e:
                logger.warning(f"Error validating plot {plot.get('id', 'unknown')}: {e}")
                continue

            valid_plots.append(plot)

        return valid_plots

    def generate_docx_report(self, report_data: Dict[str, Any]) -> BytesIO:
        """
        Generate a DOCX report.

        Args:
            report_data: The report data dictionary

        Returns:
            A BytesIO containing the DOCX report
        """
        # This would typically use the python-docx library
        # For now, return a placeholder
        buffer = BytesIO()
        buffer.write(b"DOCX report placeholder")
        buffer.seek(0)
        return buffer