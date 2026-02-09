"""
Data Processing Service for PCA Analysis

This module contains services for processing gene expression data for PCA analysis,
including data import, validation, and sample group detection.
"""

import pandas as pd
import numpy as np
import re
import logging
from django.db import transaction
from django.conf import settings
import os
import uuid

from pca_analysis.models import (
    PCAProject,
    Sample,
    SampleGroup,
    Gene,
    ExpressionValue
)

logger = logging.getLogger(__name__)

class DataProcessorService:
    """Service for processing gene expression data files"""
    
    @staticmethod
    def read_data_file(file_path):
        """
        Read gene expression data from various file formats.
        
        Args:
            file_path: Path to the data file
            
        Returns:
            pd.DataFrame: DataFrame with genes as index and samples as columns
        """
        file_extension = file_path.split('.')[-1].lower()
        
        try:
            if file_extension in ['xlsx', 'xls']:
                df = pd.read_excel(file_path, index_col=0)
            elif file_extension == 'csv':
                df = pd.read_csv(file_path, index_col=0)
            elif file_extension in ['tsv', 'txt']:
                df = pd.read_csv(file_path, sep='\t', index_col=0)
            else:
                raise ValueError(f"Unsupported file extension: {file_extension}")
                
            return df
        except Exception as e:
            logger.error(f"Error reading data file: {str(e)}")
            raise
    
    @staticmethod
    def detect_sample_groups(column_names):
        """
        Automatically detect sample groups and replicates from column names.
        This preserves the exact pattern matching logic from the original implementation.
        
        Args:
            column_names: List of column names
            
        Returns:
            dict: Dictionary mapping column names to detected groups and replicates
        """
        col_info = {}
        
        for col in column_names:
            # Extract sample information
            sample_info = {}
            
            # Try different patterns to extract sample metadata
            # This matches lines 126-142 in the original code
            patterns = [
                # Pattern like "F2: 127N, Control, R1"
                r"(?:.*?,\s*)?(.*?)(?:,\s*)(R\d+|Rep\d+|Replicate\d+)$",
                # Pattern like "Control_R1" or "Sample_R2"
                r"(.+?)[-_]+(R\d+|Rep\d+|Replicate\d+)$",
                # Check for numerical replicate indicators at the end
                r"(.+?)[-_]+(\d+)$",
                # Try to extract any word followed by any number
                r"(.+?)(\d+)$"
            ]
            
            metadata_extracted = False
            for pattern in patterns:
                match = re.search(pattern, col)
                if match:
                    sample_info['group'] = match.group(1).strip()
                    sample_info['replicate'] = match.group(2).strip()
                    metadata_extracted = True
                    break
            
            # If no pattern matches, use the entire column name
            if not metadata_extracted:
                sample_info['group'] = col
                sample_info['replicate'] = 'NA'
            
            col_info[col] = sample_info
            
        return col_info
    
    @staticmethod
    def validate_data(df):
        """
        Validate gene expression data for PCA analysis.
        
        Args:
            df: DataFrame with genes as index and samples as columns
            
        Returns:
            tuple: (is_valid, validation_messages)
        """
        validation_messages = []
        
        # Check if dataframe is empty
        if df.empty:
            validation_messages.append("The data file is empty.")
            return False, validation_messages
        
        # Check if there are enough samples for PCA (at least 2)
        if len(df.columns) < 2:
            validation_messages.append("At least 2 samples are required for PCA.")
            return False, validation_messages
        
        # Check if there are enough genes for PCA (at least 3)
        if len(df.index) < 3:
            validation_messages.append("At least 3 genes are required for PCA.")
            return False, validation_messages
        
        # Check if data is numeric
        if not df.map(np.isreal).all().all():
            validation_messages.append("All expression values must be numeric.")
            return False, validation_messages
        
        # Check for excessive missing values (> 50%)
        missing_percent = df.isnull().mean().mean() * 100
        if missing_percent > 50:
            validation_messages.append(f"Data contains {missing_percent:.1f}% missing values, which is too high.")
            return False, validation_messages
        elif missing_percent > 0:
            validation_messages.append(f"Data contains {missing_percent:.1f}% missing values, which will be imputed.")
        
        return True, validation_messages
    
    @staticmethod
    @transaction.atomic
    def import_data(project_id, df):
        """
        Import gene expression data into the database.
        
        Args:
            project_id: UUID of the PCA project
            df: DataFrame with genes as index and samples as columns
            
        Returns:
            dict: Import summary statistics
        """
        project = PCAProject.objects.get(id=project_id)
        
        # Detect sample groups
        col_info = DataProcessorService.detect_sample_groups(df.columns)
        
        # Get unique groups
        unique_groups = list(set(info['group'] for info in col_info.values()))
        
        # Create sample groups
        group_objects = {}
        for group_name in unique_groups:
            group, _ = SampleGroup.objects.get_or_create(
                project=project,
                name=group_name
            )
            group_objects[group_name] = group
        
        # Create samples
        sample_objects = {}
        for column in df.columns:
            group_name = col_info[column]['group']
            replicate_id = col_info[column]['replicate']
            
            sample = Sample.objects.create(
                project=project,
                name=column,
                group=group_objects[group_name],
                replicate_id=replicate_id
            )
            sample_objects[column] = sample
        
        # Create genes
        gene_objects = {}
        for gene_name in df.index:
            gene = Gene.objects.create(
                project=project,
                name=gene_name
            )
            gene_objects[gene_name] = gene
        
        # Create expression values
        expression_values = []
        for gene_name, gene in gene_objects.items():
            for column, sample in sample_objects.items():
                # Only create if the value is not NaN
                if not pd.isna(df.loc[gene_name, column]):
                    expression_values.append(
                        ExpressionValue(
                            project=project,
                            sample=sample,
                            gene=gene,
                            value=float(df.loc[gene_name, column])
                        )
                    )

        # Bulk create expression values
        ExpressionValue.objects.bulk_create(expression_values)
        
        # Return summary statistics
        return {
            'samples_count': len(sample_objects),
            'genes_count': len(gene_objects),
            'expression_values_count': len(expression_values),
            'groups_count': len(group_objects),
            'missing_values_count': (df.size - len(expression_values))
        }
    
    @staticmethod
    def save_uploaded_file(uploaded_file):
        """
        Save an uploaded file to a temporary location.
        
        Args:
            uploaded_file: InMemoryUploadedFile object
            
        Returns:
            str: Path to the saved file
        """
        # Create directory if it doesn't exist
        temp_dir = os.path.join(settings.MEDIA_ROOT, 'temp', 'pca_uploads')
        os.makedirs(temp_dir, exist_ok=True)
        
        # Generate a unique filename
        filename = f"{uuid.uuid4()}_{uploaded_file.name}"
        file_path = os.path.join(temp_dir, filename)
        
        # Save the file
        with open(file_path, 'wb+') as destination:
            for chunk in uploaded_file.chunks():
                destination.write(chunk)
                
        return file_path
    
    @staticmethod
    @transaction.atomic
    def process_uploaded_file(project, uploaded_file):
        """
        Process an uploaded file and import data into the project.

        Args:
            project: PCAProject instance
            uploaded_file: Django UploadedFile object
        """
        # Save the file temporarily
        file_path = DataProcessorService.save_uploaded_file(uploaded_file)

        try:
            # Read the data
            df = DataProcessorService.read_data_file(file_path)

            # Validate
            is_valid, messages = DataProcessorService.validate_data(df)
            if not is_valid:
                raise ValueError('; '.join(messages))

            # Import into database
            DataProcessorService.import_data(project.id, df)
        finally:
            # Clean up temp file
            if os.path.exists(file_path):
                os.remove(file_path)

    @staticmethod
    def detect_and_assign_sample_groups(project):
        """
        Detect sample groups from sample names already stored in the database
        and assign groups accordingly.

        Args:
            project: PCAProject instance
        """
        samples = Sample.objects.filter(project=project)
        column_names = [s.name for s in samples]

        col_info = DataProcessorService.detect_sample_groups(column_names)

        # Create groups and assign samples
        for sample in samples:
            info = col_info.get(sample.name, {})
            group_name = info.get('group', sample.name)
            group, _ = SampleGroup.objects.get_or_create(
                project=project,
                name=group_name
            )
            if sample.group != group:
                sample.group = group
                sample.save(update_fields=['group'])

    @staticmethod
    @transaction.atomic
    def create_demo_data(project):
        """
        Create demo data for a PCA project with simulated gene expression.

        Args:
            project: PCAProject instance
        """
        np.random.seed(42)

        n_genes = 100
        n_samples_per_group = 5
        group_names = ['Control', 'Treatment_A', 'Treatment_B']

        # Create sample groups and samples
        sample_objects = []
        for group_name in group_names:
            group = SampleGroup.objects.create(project=project, name=group_name)
            for rep in range(1, n_samples_per_group + 1):
                sample = Sample.objects.create(
                    project=project,
                    name=f'{group_name}_R{rep}',
                    group=group,
                    replicate_id=f'R{rep}'
                )
                sample_objects.append((sample, group_name))

        # Create genes
        gene_objects = []
        for i in range(n_genes):
            gene = Gene.objects.create(project=project, name=f'Gene_{i+1}')
            gene_objects.append(gene)

        # Generate expression values with group-specific patterns
        expression_values = []
        for sample, group_name in sample_objects:
            base = np.random.normal(5, 1, n_genes)
            if group_name == 'Treatment_A':
                base[:20] += 3  # First 20 genes upregulated
            elif group_name == 'Treatment_B':
                base[20:40] += 3  # Next 20 genes upregulated
            base = np.maximum(base, 0)

            for gene, val in zip(gene_objects, base):
                expression_values.append(
                    ExpressionValue(
                        project=project,
                        sample=sample,
                        gene=gene,
                        value=float(val)
                    )
                )

        ExpressionValue.objects.bulk_create(expression_values)