import os
import tempfile
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import numpy as np
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from io import BytesIO
from django.conf import settings
from datetime import datetime
from .report_generator_static import generate_report as generate_report_static


class ReportGeneratorService:
    """Service for generating PDF reports for DOE analysis"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self.title_style = self.styles['Heading1']
        self.subtitle_style = self.styles['Heading2']
        self.normal_style = self.styles['Normal']
        
        # Create a custom style for tables
        self.table_style = ParagraphStyle(
            'TableCell',
            parent=self.normal_style,
            fontSize=8,
            leading=10
        )
    
    def generate_report(self, analysis_results, design_info=None, optimization_results=None, include_raw_data=True):
        """
        Generate a comprehensive DOE report
        
        Args:
            analysis_results: Dictionary containing analysis results
            design_info: Dictionary containing design information
            optimization_results: Dictionary containing optimization results
            include_raw_data: Whether to include raw data in the report
        
        Returns:
            dict: Report data including file path or content
        """
        # Use the static generate_report function
        return generate_report_static(
            analysis_results=analysis_results,
            design_info=design_info,
            optimization_results=optimization_results,
            include_raw_data=include_raw_data
        )
    
    def generate_model_analysis_report(self, model_analysis):
        """
        Generate a PDF report for a model analysis
        
        Args:
            model_analysis: ModelAnalysis instance
        
        Returns:
            str: Path to the generated PDF file
        """
        # Create a temporary file for the PDF
        fd, temp_filename = tempfile.mkstemp(suffix='.pdf')
        os.close(fd)
        
        # Create the PDF document
        doc = SimpleDocTemplate(
            temp_filename,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72
        )
        
        # Container for PDF elements
        elements = []
        
        # Add title and metadata
        self._add_title_section(
            elements, 
            f"Model Analysis Report: {model_analysis.name}",
            model_analysis.experiment_design.name,
            model_analysis.user.username,
            model_analysis.created_at
        )
        
        # Add experiment design section
        self._add_experiment_design_section(elements, model_analysis.experiment_design)
        
        # Add model analysis results
        self._add_model_analysis_results(elements, model_analysis)
        
        # Build the PDF
        doc.build(elements)
        
        return temp_filename
    
    def generate_optimization_report(self, optimization_analysis):
        """
        Generate a PDF report for an optimization analysis
        
        Args:
            optimization_analysis: OptimizationAnalysis instance
        
        Returns:
            str: Path to the generated PDF file
        """
        # Create a temporary file for the PDF
        fd, temp_filename = tempfile.mkstemp(suffix='.pdf')
        os.close(fd)
        
        # Create the PDF document
        doc = SimpleDocTemplate(
            temp_filename,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72
        )
        
        # Container for PDF elements
        elements = []
        
        # Add title and metadata
        self._add_title_section(
            elements, 
            f"Optimization Report: {optimization_analysis.name}",
            optimization_analysis.model_analysis.experiment_design.name,
            optimization_analysis.user.username,
            optimization_analysis.created_at
        )
        
        # Add experiment design section
        self._add_experiment_design_section(
            elements, 
            optimization_analysis.model_analysis.experiment_design
        )
        
        # Add model analysis summary
        self._add_model_analysis_summary(elements, optimization_analysis.model_analysis)
        
        # Add optimization results
        self._add_optimization_results(elements, optimization_analysis)
        
        # Build the PDF
        doc.build(elements)
        
        return temp_filename
    
    def _add_title_section(self, elements, title, experiment_name, username, timestamp):
        """Add the title section to the report"""
        elements.append(Paragraph(title, self.title_style))
        elements.append(Spacer(1, 0.25*inch))
        
        # Add metadata
        elements.append(Paragraph(f"Experiment: {experiment_name}", self.subtitle_style))
        elements.append(Paragraph(f"Generated by: {username}", self.normal_style))
        elements.append(Paragraph(f"Date: {timestamp.strftime('%Y-%m-%d %H:%M:%S')}", 
                                self.normal_style))
        elements.append(Spacer(1, 0.5*inch))
    
    def _add_experiment_design_section(self, elements, experiment_design):
        """Add the experiment design section to the report"""
        elements.append(Paragraph("Experiment Design", self.subtitle_style))
        elements.append(Spacer(1, 0.1*inch))
        
        # Design info
        elements.append(Paragraph(f"Design Type: {experiment_design.design_type}", 
                                self.normal_style))
        elements.append(Paragraph(f"Description: {experiment_design.description}", 
                                self.normal_style))
        elements.append(Spacer(1, 0.1*inch))
        
        # Factors
        elements.append(Paragraph("Factors:", self.normal_style))
        factors = experiment_design.factordefinition_set.all()
        factor_data = [["Factor", "Unit", "Type", "Low Level", "High Level"]]
        
        for factor in factors:
            data_type = "Categorical" if factor.is_categorical else "Continuous"
            low_level = factor.low_level if not factor.is_categorical else "N/A"
            high_level = factor.high_level if not factor.is_categorical else "N/A"
            
            factor_data.append([
                factor.name,
                factor.unit,
                data_type,
                str(low_level),
                str(high_level)
            ])
        
        factor_table = Table(factor_data, colWidths=[1.2*inch, 0.8*inch, inch, inch, inch])
        factor_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('GRID', (0, 0), (-1, -1), 0.25, colors.black),
            ('FONTSIZE', (0, 0), (-1, -1), 8)
        ]))
        
        elements.append(factor_table)
        elements.append(Spacer(1, 0.1*inch))
        
        # Responses
        elements.append(Paragraph("Responses:", self.normal_style))
        responses = experiment_design.responsedefinition_set.all()
        response_data = [["Response", "Unit", "Target", "Lower Bound", "Upper Bound"]]
        
        for response in responses:
            response_data.append([
                response.name,
                response.unit,
                str(response.target_value if response.target_value is not None else "N/A"),
                str(response.lower_bound if response.lower_bound is not None else "N/A"),
                str(response.upper_bound if response.upper_bound is not None else "N/A")
            ])
        
        response_table = Table(response_data, colWidths=[1.2*inch, 0.8*inch, inch, inch, inch])
        response_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('GRID', (0, 0), (-1, -1), 0.25, colors.black),
            ('FONTSIZE', (0, 0), (-1, -1), 8)
        ]))
        
        elements.append(response_table)
        elements.append(Spacer(1, 0.25*inch))
    
    def _add_model_analysis_results(self, elements, model_analysis):
        """Add the model analysis results to the report"""
        elements.append(Paragraph("Model Analysis Results", self.subtitle_style))
        elements.append(Spacer(1, 0.1*inch))
        
        # Analysis info
        elements.append(Paragraph(f"Analysis Type: {model_analysis.analysis_type}", 
                                self.normal_style))
        elements.append(Paragraph(f"Description: {model_analysis.description}", 
                                self.normal_style))
        elements.append(Spacer(1, 0.1*inch))
        
        # Get results from the analysis
        results = model_analysis.results
        
        # ANOVA table
        if 'anova_tables' in results:
            for response, anova in results['anova_tables'].items():
                elements.append(Paragraph(f"ANOVA for {response}:", self.normal_style))
                
                # Convert the ANOVA table to a list for the PDF table
                anova_df = pd.DataFrame(anova)
                anova_data = [list(anova_df.columns)]
                for _, row in anova_df.iterrows():
                    anova_data.append([str(round(val, 6)) if isinstance(val, (int, float)) 
                                     else str(val) for val in row])
                
                anova_table = Table(anova_data)
                anova_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                    ('GRID', (0, 0), (-1, -1), 0.25, colors.black),
                    ('FONTSIZE', (0, 0), (-1, -1), 8)
                ]))
                
                elements.append(anova_table)
                elements.append(Spacer(1, 0.1*inch))
        
        # Model coefficients
        if 'model_coefficients' in results:
            for response, coeffs in results['model_coefficients'].items():
                elements.append(Paragraph(f"Model Coefficients for {response}:", 
                                        self.normal_style))
                
                # Format the coefficients table
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
                elements.append(Spacer(1, 0.1*inch))
        
        # Model equations
        if 'model_equations' in results:
            elements.append(Paragraph("Model Equations:", self.normal_style))
            for response, equation in results['model_equations'].items():
                elements.append(Paragraph(f"{response} = {equation}", self.normal_style))
            elements.append(Spacer(1, 0.1*inch))
        
        # Model statistics
        if 'model_statistics' in results:
            elements.append(Paragraph("Model Statistics:", self.normal_style))
            for response, stats in results['model_statistics'].items():
                elements.append(Paragraph(f"Statistics for {response}:", self.normal_style))
                stats_data = [["Statistic", "Value"]]
                for stat, value in stats.items():
                    stats_data.append([stat, str(round(value, 6)) if isinstance(value, (int, float)) 
                                     else str(value)])
                
                stats_table = Table(stats_data)
                stats_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                    ('GRID', (0, 0), (-1, -1), 0.25, colors.black),
                    ('FONTSIZE', (0, 0), (-1, -1), 8)
                ]))
                
                elements.append(stats_table)
                elements.append(Spacer(1, 0.1*inch))
        
        # Add plots
        if 'plots' in results:
            elements.append(Paragraph("Diagnostic Plots:", self.normal_style))
            
            for plot_name, plot_data in results['plots'].items():
                if 'residual_vs_predicted' in plot_name or 'normal_probability' in plot_name:
                    # Create the figure from stored data
                    fig = plt.figure(figsize=(6, 4))
                    
                    if 'residual_vs_predicted' in plot_name:
                        response = plot_name.split('_')[0]
                        ax = fig.add_subplot(111)
                        ax.scatter(plot_data['predicted'], plot_data['residuals'])
                        ax.axhline(y=0, color='r', linestyle='-')
                        ax.set_xlabel('Predicted')
                        ax.set_ylabel('Residuals')
                        ax.set_title(f'Residuals vs Predicted for {response}')
                    
                    elif 'normal_probability' in plot_name:
                        response = plot_name.split('_')[0]
                        ax = fig.add_subplot(111)
                        sm.qqplot(np.array(plot_data), line='45', ax=ax)
                        ax.set_title(f'Normal Probability Plot for {response}')
                    
                    # Save the figure to a buffer
                    buf = BytesIO()
                    fig.savefig(buf, format='png', dpi=100)
                    buf.seek(0)
                    
                    # Add the image to the PDF
                    img = Image(buf, width=5*inch, height=3*inch)
                    elements.append(img)
                    elements.append(Spacer(1, 0.1*inch))
                    
                    # Close the figure to release memory
                    plt.close(fig)
        
        elements.append(Spacer(1, 0.25*inch))
    
    def _add_model_analysis_summary(self, elements, model_analysis):
        """Add a summary of the model analysis to the report"""
        elements.append(Paragraph("Model Analysis Summary", self.subtitle_style))
        elements.append(Spacer(1, 0.1*inch))
        
        # Analysis info
        elements.append(Paragraph(f"Analysis Type: {model_analysis.analysis_type}", 
                                self.normal_style))
        elements.append(Paragraph(f"Description: {model_analysis.description}", 
                                self.normal_style))
        elements.append(Spacer(1, 0.1*inch))
        
        # Model equations
        results = model_analysis.results
        if 'model_equations' in results:
            elements.append(Paragraph("Model Equations:", self.normal_style))
            for response, equation in results['model_equations'].items():
                elements.append(Paragraph(f"{response} = {equation}", self.normal_style))
        
        # Model statistics summary
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
        
        elements.append(Spacer(1, 0.25*inch))
    
    def _add_optimization_results(self, elements, optimization_analysis):
        """Add the optimization results to the report"""
        elements.append(Paragraph("Optimization Results", self.subtitle_style))
        elements.append(Spacer(1, 0.1*inch))
        
        # Optimization info
        elements.append(Paragraph(f"Optimization Type: {optimization_analysis.optimization_type}", 
                                self.normal_style))
        elements.append(Paragraph(f"Description: {optimization_analysis.description}", 
                                self.normal_style))
        elements.append(Spacer(1, 0.1*inch))
        
        # Response goals
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
        elements.append(Spacer(1, 0.1*inch))
        
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
            elements.append(Spacer(1, 0.1*inch))
        
        # Get results from the optimization
        results = optimization_analysis.results
        
        # Optimal solutions
        if 'optimal_solutions' in results:
            elements.append(Paragraph("Optimal Solutions:", self.normal_style))
            
            for i, solution in enumerate(results['optimal_solutions']):
                elements.append(Paragraph(f"Solution {i+1} (Desirability: {solution.get('desirability', 0):.4f}):", 
                                        self.normal_style))
                
                # Factor settings
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
                elements.append(Spacer(1, 0.05*inch))
                
                # Predicted responses
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
                elements.append(Spacer(1, 0.1*inch))
        
        # Add plots if available
        if 'plots' in results:
            elements.append(Paragraph("Optimization Plots:", self.normal_style))
            
            for plot_name, plot_data in results['plots'].items():
                # Create figures from stored data
                if 'contour' in plot_name or 'surface' in plot_name:
                    response, factor1, factor2 = plot_name.split('_')[-3:]
                    
                    fig = plt.figure(figsize=(6, 4))
                    ax = fig.add_subplot(111)
                    
                    if 'contour' in plot_name:
                        x = np.array(plot_data['x'])
                        y = np.array(plot_data['y'])
                        z = np.array(plot_data['z'])
                        
                        # Create a contour plot
                        contour = ax.contourf(x, y, z, cmap='viridis')
                        fig.colorbar(contour)
                        ax.set_xlabel(factor1)
                        ax.set_ylabel(factor2)
                        ax.set_title(f'Contour Plot for {response}')
                    
                    # Save the figure to a buffer
                    buf = BytesIO()
                    fig.savefig(buf, format='png', dpi=100)
                    buf.seek(0)
                    
                    # Add the image to the PDF
                    img = Image(buf, width=5*inch, height=3*inch)
                    elements.append(img)
                    elements.append(Spacer(1, 0.1*inch))
                    
                    # Close the figure to release memory
                    plt.close(fig)
        
        elements.append(Spacer(1, 0.25*inch))    
    # Add static method from imported module
    generate_report = staticmethod(generate_report_static)
