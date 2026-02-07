import os
import tempfile
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from io import BytesIO
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class ReportGeneratorService:
    """Service for generating PDF reports for DOE analysis"""

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self.title_style = self.styles['Heading1']
        self.subtitle_style = self.styles['Heading2']
        self.normal_style = self.styles['Normal']

        self.table_style = ParagraphStyle(
            'TableCell',
            parent=self.normal_style,
            fontSize=8,
            leading=10
        )

    def generate_report(self, analysis_results, design_info=None,
                        optimization_results=None, include_raw_data=True):
        """
        Generate a comprehensive DOE report from raw data dictionaries.

        Returns:
            dict: Report data including file path or content
        """
        fd, temp_filename = tempfile.mkstemp(suffix='.pdf')
        os.close(fd)

        doc = SimpleDocTemplate(
            temp_filename, pagesize=letter,
            rightMargin=72, leftMargin=72,
            topMargin=72, bottomMargin=72
        )

        elements = []
        elements.append(Paragraph("DOE Analysis Report", self.title_style))
        elements.append(Spacer(1, 0.25 * inch))
        elements.append(Paragraph(
            f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            self.normal_style
        ))
        elements.append(Spacer(1, 0.5 * inch))

        if design_info:
            elements.append(Paragraph("Design Information", self.subtitle_style))
            for key, value in design_info.items():
                elements.append(Paragraph(f"{key}: {value}", self.normal_style))
            elements.append(Spacer(1, 0.25 * inch))

        if analysis_results:
            elements.append(Paragraph("Analysis Results", self.subtitle_style))
            self._add_dict_as_table(elements, analysis_results)

        if optimization_results:
            elements.append(Paragraph("Optimization Results", self.subtitle_style))
            self._add_dict_as_table(elements, optimization_results)

        doc.build(elements)
        return {'file_path': temp_filename}

    def generate_model_analysis_report(self, model_analysis):
        """
        Generate a PDF report for a model analysis.

        Args:
            model_analysis: ModelAnalysis instance

        Returns:
            str: Path to the generated PDF file
        """
        fd, temp_filename = tempfile.mkstemp(suffix='.pdf')
        os.close(fd)

        doc = SimpleDocTemplate(
            temp_filename, pagesize=letter,
            rightMargin=72, leftMargin=72,
            topMargin=72, bottomMargin=72
        )

        elements = []

        # Title section
        self._add_title_section(
            elements,
            f"Model Analysis Report: {model_analysis.name}",
            model_analysis.experiment_design.name,
            model_analysis.created_at
        )

        # Experiment design section
        self._add_experiment_design_section(elements, model_analysis.experiment_design)

        # Model analysis results
        self._add_model_analysis_results(elements, model_analysis)

        doc.build(elements)

        return temp_filename

    def generate_optimization_report(self, optimization_analysis):
        """
        Generate a PDF report for an optimization analysis.

        Args:
            optimization_analysis: OptimizationAnalysis instance

        Returns:
            str: Path to the generated PDF file
        """
        fd, temp_filename = tempfile.mkstemp(suffix='.pdf')
        os.close(fd)

        doc = SimpleDocTemplate(
            temp_filename, pagesize=letter,
            rightMargin=72, leftMargin=72,
            topMargin=72, bottomMargin=72
        )

        elements = []

        experiment_name = 'N/A'
        if optimization_analysis.model_analysis:
            experiment_name = optimization_analysis.model_analysis.experiment_design.name
        elif optimization_analysis.experiment_design:
            experiment_name = optimization_analysis.experiment_design.name

        self._add_title_section(
            elements,
            f"Optimization Report: {optimization_analysis.name}",
            experiment_name,
            optimization_analysis.created_at
        )

        # Add experiment design section
        experiment = None
        if optimization_analysis.model_analysis:
            experiment = optimization_analysis.model_analysis.experiment_design
        elif optimization_analysis.experiment_design:
            experiment = optimization_analysis.experiment_design

        if experiment:
            self._add_experiment_design_section(elements, experiment)

        # Model analysis summary
        if optimization_analysis.model_analysis:
            self._add_model_analysis_summary(elements, optimization_analysis.model_analysis)

        # Optimization results
        self._add_optimization_results(elements, optimization_analysis)

        doc.build(elements)

        return temp_filename

    def _add_title_section(self, elements, title, experiment_name, timestamp):
        """Add the title section to the report"""
        elements.append(Paragraph(title, self.title_style))
        elements.append(Spacer(1, 0.25 * inch))
        elements.append(Paragraph(f"Experiment: {experiment_name}", self.subtitle_style))
        elements.append(Paragraph(
            f"Date: {timestamp.strftime('%Y-%m-%d %H:%M:%S')}",
            self.normal_style
        ))
        elements.append(Spacer(1, 0.5 * inch))

    def _add_experiment_design_section(self, elements, experiment_design):
        """Add the experiment design section to the report"""
        elements.append(Paragraph("Experiment Design", self.subtitle_style))
        elements.append(Spacer(1, 0.1 * inch))

        elements.append(Paragraph(
            f"Design Type: {experiment_design.design_type}",
            self.normal_style
        ))
        elements.append(Paragraph(
            f"Description: {experiment_design.description}",
            self.normal_style
        ))
        elements.append(Spacer(1, 0.1 * inch))

        # Factors (use related_name 'factors')
        elements.append(Paragraph("Factors:", self.normal_style))
        factors = experiment_design.factors.all()
        factor_data = [["Factor", "Unit", "Type", "Low Level", "High Level"]]

        for factor in factors:
            is_categorical = factor.factor_type == 'CATEGORICAL'
            data_type = "Categorical" if is_categorical else "Continuous"
            low_level = factor.low_level if not is_categorical else "N/A"
            high_level = factor.high_level if not is_categorical else "N/A"

            factor_data.append([
                factor.name,
                factor.units,
                data_type,
                str(low_level),
                str(high_level)
            ])

        factor_table = Table(factor_data, colWidths=[1.2 * inch, 0.8 * inch, inch, inch, inch])
        factor_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('GRID', (0, 0), (-1, -1), 0.25, colors.black),
            ('FONTSIZE', (0, 0), (-1, -1), 8)
        ]))

        elements.append(factor_table)
        elements.append(Spacer(1, 0.1 * inch))

        # Responses (use related_name 'responses')
        elements.append(Paragraph("Responses:", self.normal_style))
        responses = experiment_design.responses.all()
        response_data = [["Response", "Unit", "Target", "Lower Bound", "Upper Bound"]]

        for response in responses:
            response_data.append([
                response.name,
                response.units,
                str(response.target_value if response.target_value is not None else "N/A"),
                str(response.lower_bound if response.lower_bound is not None else "N/A"),
                str(response.upper_bound if response.upper_bound is not None else "N/A")
            ])

        response_table = Table(response_data, colWidths=[1.2 * inch, 0.8 * inch, inch, inch, inch])
        response_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('GRID', (0, 0), (-1, -1), 0.25, colors.black),
            ('FONTSIZE', (0, 0), (-1, -1), 8)
        ]))

        elements.append(response_table)
        elements.append(Spacer(1, 0.25 * inch))

    def _add_model_analysis_results(self, elements, model_analysis):
        """Add the model analysis results to the report"""
        elements.append(Paragraph("Model Analysis Results", self.subtitle_style))
        elements.append(Spacer(1, 0.1 * inch))

        elements.append(Paragraph(
            f"Analysis Type: {model_analysis.model_type}",
            self.normal_style
        ))
        elements.append(Paragraph(
            f"Description: {model_analysis.description}",
            self.normal_style
        ))
        elements.append(Spacer(1, 0.1 * inch))

        results = model_analysis.results

        # ANOVA table
        if 'anova_tables' in results:
            for response, anova in results['anova_tables'].items():
                elements.append(Paragraph(f"ANOVA for {response}:", self.normal_style))
                anova_df = pd.DataFrame(anova)
                anova_data = [list(anova_df.columns)]
                for _, row in anova_df.iterrows():
                    anova_data.append([
                        str(round(val, 6)) if isinstance(val, (int, float)) else str(val)
                        for val in row
                    ])

                anova_table = Table(anova_data)
                anova_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                    ('GRID', (0, 0), (-1, -1), 0.25, colors.black),
                    ('FONTSIZE', (0, 0), (-1, -1), 8)
                ]))

                elements.append(anova_table)
                elements.append(Spacer(1, 0.1 * inch))

        # Model coefficients
        if 'model_coefficients' in results:
            for response, coeffs in results['model_coefficients'].items():
                elements.append(Paragraph(
                    f"Model Coefficients for {response}:",
                    self.normal_style
                ))

                coeff_data = [["Term", "Estimate", "Std Error", "t-value", "p-value"]]
                for term, values in coeffs.items():
                    coeff_data.append([
                        term,
                        str(round(values.get('estimate', 0), 6)),
                        str(round(values.get('std_error', 0), 6)),
                        str(round(values.get('t_value', 0), 6)),
                        str(round(values.get('p_value', 0), 6))
                    ])

                coeff_table = Table(coeff_data)
                coeff_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                    ('GRID', (0, 0), (-1, -1), 0.25, colors.black),
                    ('FONTSIZE', (0, 0), (-1, -1), 8)
                ]))

                elements.append(coeff_table)
                elements.append(Spacer(1, 0.1 * inch))

        # Model equations
        if 'model_equations' in results:
            elements.append(Paragraph("Model Equations:", self.normal_style))
            for response, equation in results['model_equations'].items():
                elements.append(Paragraph(f"{response} = {equation}", self.normal_style))
            elements.append(Spacer(1, 0.1 * inch))

        # Model statistics
        if 'model_statistics' in results:
            elements.append(Paragraph("Model Statistics:", self.normal_style))
            for response, stats in results['model_statistics'].items():
                elements.append(Paragraph(f"Statistics for {response}:", self.normal_style))
                stats_data = [["Statistic", "Value"]]
                for stat, value in stats.items():
                    stats_data.append([
                        stat,
                        str(round(value, 6)) if isinstance(value, (int, float)) else str(value)
                    ])

                stats_table = Table(stats_data)
                stats_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                    ('GRID', (0, 0), (-1, -1), 0.25, colors.black),
                    ('FONTSIZE', (0, 0), (-1, -1), 8)
                ]))

                elements.append(stats_table)
                elements.append(Spacer(1, 0.1 * inch))

        # Diagnostic plots
        if 'plots' in results:
            elements.append(Paragraph("Diagnostic Plots:", self.normal_style))

            for plot_name, plot_data in results['plots'].items():
                try:
                    if 'residual_vs_predicted' in plot_name:
                        fig = plt.figure(figsize=(6, 4))
                        ax = fig.add_subplot(111)
                        ax.scatter(plot_data['predicted'], plot_data['residuals'])
                        ax.axhline(y=0, color='r', linestyle='-')
                        ax.set_xlabel('Predicted')
                        ax.set_ylabel('Residuals')
                        response = plot_name.split('_')[0]
                        ax.set_title(f'Residuals vs Predicted for {response}')

                        buf = BytesIO()
                        fig.savefig(buf, format='png', dpi=100)
                        buf.seek(0)

                        img = Image(buf, width=5 * inch, height=3 * inch)
                        elements.append(img)
                        elements.append(Spacer(1, 0.1 * inch))

                        plt.close(fig)
                except Exception:
                    logger.debug("Skipping plot %s", plot_name)

        elements.append(Spacer(1, 0.25 * inch))

    def _add_model_analysis_summary(self, elements, model_analysis):
        """Add a summary of the model analysis to the report"""
        elements.append(Paragraph("Model Analysis Summary", self.subtitle_style))
        elements.append(Spacer(1, 0.1 * inch))

        elements.append(Paragraph(
            f"Analysis Type: {model_analysis.model_type}",
            self.normal_style
        ))
        elements.append(Paragraph(
            f"Description: {model_analysis.description}",
            self.normal_style
        ))
        elements.append(Spacer(1, 0.1 * inch))

        results = model_analysis.results
        if 'model_equations' in results:
            elements.append(Paragraph("Model Equations:", self.normal_style))
            for response, equation in results['model_equations'].items():
                elements.append(Paragraph(f"{response} = {equation}", self.normal_style))

        if 'model_statistics' in results:
            elements.append(Paragraph("Model Statistics Summary:", self.normal_style))
            stats_data = [["Response", "R-squared", "Adj R-squared", "RMSE"]]

            for response, stats in results['model_statistics'].items():
                stats_data.append([
                    response,
                    str(round(stats.get('r_squared', 0), 4)),
                    str(round(stats.get('adj_r_squared', 0), 4)),
                    str(round(stats.get('rmse', 0), 4))
                ])

            stats_table = Table(stats_data)
            stats_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('GRID', (0, 0), (-1, -1), 0.25, colors.black),
                ('FONTSIZE', (0, 0), (-1, -1), 8)
            ]))

            elements.append(stats_table)

        elements.append(Spacer(1, 0.25 * inch))

    def _add_optimization_results(self, elements, optimization_analysis):
        """Add the optimization results to the report"""
        elements.append(Paragraph("Optimization Results", self.subtitle_style))
        elements.append(Spacer(1, 0.1 * inch))

        elements.append(Paragraph(
            f"Optimization Type: {optimization_analysis.optimization_type}",
            self.normal_style
        ))
        elements.append(Paragraph(
            f"Description: {optimization_analysis.description}",
            self.normal_style
        ))
        elements.append(Spacer(1, 0.1 * inch))

        # Response goals
        if optimization_analysis.response_goals:
            elements.append(Paragraph("Response Goals:", self.normal_style))
            goals_data = [["Response", "Goal", "Target", "Lower Bound", "Upper Bound", "Weight"]]

            for response, goal in optimization_analysis.response_goals.items():
                goals_data.append([
                    response,
                    goal.get('goal', ''),
                    str(goal.get('target', 'N/A')),
                    str(goal.get('lower_bound', 'N/A')),
                    str(goal.get('upper_bound', 'N/A')),
                    str(goal.get('weight', 1.0))
                ])

            goals_table = Table(goals_data)
            goals_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('GRID', (0, 0), (-1, -1), 0.25, colors.black),
                ('FONTSIZE', (0, 0), (-1, -1), 8)
            ]))

            elements.append(goals_table)
            elements.append(Spacer(1, 0.1 * inch))

        # Constraints
        if optimization_analysis.constraints:
            elements.append(Paragraph("Constraints:", self.normal_style))
            constraints_data = [["Factor", "Lower Bound", "Upper Bound"]]

            for constraint in optimization_analysis.constraints:
                constraints_data.append([
                    constraint.get('factor', ''),
                    str(constraint.get('lower_bound', 'N/A')),
                    str(constraint.get('upper_bound', 'N/A'))
                ])

            constraints_table = Table(constraints_data)
            constraints_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('GRID', (0, 0), (-1, -1), 0.25, colors.black),
                ('FONTSIZE', (0, 0), (-1, -1), 8)
            ]))

            elements.append(constraints_table)
            elements.append(Spacer(1, 0.1 * inch))

        # Results
        results = optimization_analysis.results

        if 'optimal_solutions' in results:
            elements.append(Paragraph("Optimal Solutions:", self.normal_style))

            for i, solution in enumerate(results['optimal_solutions']):
                elements.append(Paragraph(
                    f"Solution {i+1} (Desirability: {solution.get('desirability', 0):.4f}):",
                    self.normal_style
                ))

                factors_data = [["Factor", "Value"]]
                for factor, value in solution.get('factor_settings', {}).items():
                    factors_data.append([factor, str(value)])

                factors_table = Table(factors_data)
                factors_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                    ('GRID', (0, 0), (-1, -1), 0.25, colors.black),
                    ('FONTSIZE', (0, 0), (-1, -1), 8)
                ]))

                elements.append(factors_table)
                elements.append(Spacer(1, 0.05 * inch))

                responses_data = [["Response", "Predicted Value"]]
                for response, value in solution.get('predicted_responses', {}).items():
                    responses_data.append([response, str(round(value, 4))])

                responses_table = Table(responses_data)
                responses_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                    ('GRID', (0, 0), (-1, -1), 0.25, colors.black),
                    ('FONTSIZE', (0, 0), (-1, -1), 8)
                ]))

                elements.append(responses_table)
                elements.append(Spacer(1, 0.1 * inch))

        # Plots
        if 'plots' in results:
            elements.append(Paragraph("Optimization Plots:", self.normal_style))

            for plot_name, plot_data in results['plots'].items():
                try:
                    if 'contour' in plot_name:
                        fig = plt.figure(figsize=(6, 4))
                        ax = fig.add_subplot(111)

                        x = np.array(plot_data['x'])
                        y = np.array(plot_data['y'])
                        z = np.array(plot_data['z'])

                        contour = ax.contourf(x, y, z, cmap='viridis')
                        fig.colorbar(contour)

                        parts = plot_name.split('_')
                        ax.set_title(f'Contour Plot - {plot_name}')

                        buf = BytesIO()
                        fig.savefig(buf, format='png', dpi=100)
                        buf.seek(0)

                        img = Image(buf, width=5 * inch, height=3 * inch)
                        elements.append(img)
                        elements.append(Spacer(1, 0.1 * inch))

                        plt.close(fig)
                except Exception:
                    logger.debug("Skipping plot %s", plot_name)

        elements.append(Spacer(1, 0.25 * inch))

    def _add_dict_as_table(self, elements, data, max_depth=2):
        """Helper to render a dict as a table"""
        if not isinstance(data, dict):
            elements.append(Paragraph(str(data), self.normal_style))
            return

        table_data = [["Key", "Value"]]
        for key, value in data.items():
            if isinstance(value, (dict, list)):
                table_data.append([str(key), str(value)[:200]])
            else:
                table_data.append([str(key), str(value)])

        table = Table(table_data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('GRID', (0, 0), (-1, -1), 0.25, colors.black),
            ('FONTSIZE', (0, 0), (-1, -1), 8)
        ]))

        elements.append(table)
        elements.append(Spacer(1, 0.1 * inch))
