"""
Comprehensive Tests for Reproducibility Bundle System
=====================================================
Created: 2025-01-10
Author: StickForStats Development Team

Test all components of the reproducibility system to ensure
perfect reproducibility of statistical analyses.
"""

import pytest
import numpy as np
import pandas as pd
import tempfile
import json
import gzip
from pathlib import Path
from datetime import datetime
import hashlib

# Import reproducibility components
from backend.core.reproducibility import (
    ReproducibilityBundle,
    DataFingerprinter,
    PipelineTracker,
    StateCapture,
    SeedManager,
    MethodsGenerator,
    BundleSerializer,
    ReproducibilityVerifier
)


class TestReproducibilityBundle:
    """Test the main ReproducibilityBundle class"""
    
    def test_bundle_creation(self):
        """Test basic bundle creation"""
        bundle = ReproducibilityBundle(
            title="Test Analysis",
            description="Testing reproducibility bundle"
        )
        
        assert bundle.bundle_id is not None
        assert bundle.title == "Test Analysis"
        assert bundle.version == "1.5.0"
        assert bundle.environment is not None
    
    def test_data_fingerprinting(self):
        """Test data fingerprint addition"""
        bundle = ReproducibilityBundle()
        
        # Create test data
        df = pd.DataFrame({
            'A': np.random.randn(100),
            'B': np.random.randn(100),
            'C': ['group1', 'group2'] * 50
        })
        
        # Add fingerprint
        bundle.add_data_fingerprint('test_data', df)
        
        assert 'test_data' in bundle.data_fingerprints
        fingerprint = bundle.data_fingerprints['test_data']
        assert fingerprint.shape == (100, 3)
        assert fingerprint.hash is not None
    
    def test_random_seed_setting(self):
        """Test random seed management"""
        bundle = ReproducibilityBundle()
        bundle.set_random_seeds(42)
        
        assert bundle.master_seed == 42
        assert 'numpy' in bundle.module_seeds
        assert 'scipy' in bundle.module_seeds
        
        # Test reproducibility
        np.random.seed(bundle.module_seeds['numpy'])
        vals1 = np.random.randn(10)
        
        np.random.seed(bundle.module_seeds['numpy'])
        vals2 = np.random.randn(10)
        
        np.testing.assert_array_equal(vals1, vals2)
    
    def test_bundle_validation(self):
        """Test bundle validation"""
        bundle = ReproducibilityBundle()
        
        # Empty bundle should fail validation
        assert not bundle.validate()
        assert len(bundle.validation_errors) > 0
        
        # Add required components
        bundle.set_random_seeds(42)
        df = pd.DataFrame({'A': [1, 2, 3]})
        bundle.add_data_fingerprint('data', df)
        
        # Add a pipeline step
        from backend.core.reproducibility.bundle import PipelineStep
        step = PipelineStep(
            step_id='step1',
            name='Test Step',
            module='test',
            function='test_func',
            timestamp=datetime.now(),
            duration=0.1,
            input_params={},
            output_summary={}
        )
        bundle.add_pipeline_step(step)
        
        # Should validate now
        assert bundle.validate()
        assert bundle.is_complete
        assert bundle.checksum is not None
    
    def test_bundle_summary(self):
        """Test bundle summary generation"""
        bundle = ReproducibilityBundle(title="Test Analysis")
        bundle.set_random_seeds(42)
        
        summary = bundle.get_summary()
        
        assert summary['title'] == "Test Analysis"
        assert summary['statistics']['master_seed'] == 42
        assert 'bundle_id' in summary
        assert 'checksum' in summary


class TestDataFingerprinter:
    """Test data fingerprinting functionality"""
    
    def test_dataframe_fingerprinting(self):
        """Test DataFrame fingerprinting"""
        fingerprinter = DataFingerprinter()
        
        df = pd.DataFrame({
            'numeric': [1.0, 2.0, 3.0, np.nan],
            'categorical': ['A', 'B', 'A', 'B']
        })
        
        fingerprint = fingerprinter.fingerprint_dataframe(df, name='test_df')
        
        assert fingerprint['name'] == 'test_df'
        assert fingerprint['shape'] == (4, 2)
        assert fingerprint['hash'] is not None
        assert len(fingerprint['columns']) == 2
        assert fingerprint['metadata']['has_missing'] == True
    
    def test_array_fingerprinting(self):
        """Test numpy array fingerprinting"""
        fingerprinter = DataFingerprinter()
        
        arr = np.random.randn(50, 10)
        fingerprint = fingerprinter.fingerprint_array(arr, name='test_array')
        
        assert fingerprint['name'] == 'test_array'
        assert fingerprint['shape'] == (50, 10)
        assert fingerprint['dtype'] == 'float64'
        assert 'stats' in fingerprint['metadata']
    
    def test_fingerprint_verification(self):
        """Test fingerprint verification"""
        fingerprinter = DataFingerprinter()
        
        # Create and fingerprint data
        df1 = pd.DataFrame({'A': [1, 2, 3], 'B': [4, 5, 6]})
        fp1 = fingerprinter.fingerprint_dataframe(df1)
        
        # Verify with same data
        is_valid, diffs = fingerprinter.verify_dataframe(df1, fp1)
        assert is_valid
        assert len(diffs) == 0
        
        # Verify with modified data
        df2 = pd.DataFrame({'A': [1, 2, 4], 'B': [4, 5, 6]})  # Changed one value
        is_valid, diffs = fingerprinter.verify_dataframe(df2, fp1)
        assert not is_valid
        assert 'Data hash mismatch' in str(diffs)
    
    def test_fingerprint_comparison(self):
        """Test comparing fingerprints"""
        fingerprinter = DataFingerprinter()
        
        df1 = pd.DataFrame({'A': [1, 2, 3]})
        df2 = pd.DataFrame({'A': [1, 2, 3]})
        df3 = pd.DataFrame({'A': [1, 2, 4]})
        
        fp1 = fingerprinter.fingerprint_dataframe(df1)
        fp2 = fingerprinter.fingerprint_dataframe(df2)
        fp3 = fingerprinter.fingerprint_dataframe(df3)
        
        # Same data should have same hash
        assert fp1['hash'] == fp2['hash']
        
        # Different data should have different hash
        assert fp1['hash'] != fp3['hash']
        
        # Test comparison
        comp = fingerprinter.compare_fingerprints(fp1, fp2)
        assert comp['identical']
        
        comp = fingerprinter.compare_fingerprints(fp1, fp3)
        assert not comp['identical']


class TestPipelineTracker:
    """Test pipeline tracking functionality"""
    
    def test_step_tracking_decorator(self):
        """Test tracking with decorator"""
        tracker = PipelineTracker()
        
        @tracker.track_step(name="Test Function")
        def test_func(x, y):
            return x + y
        
        result = test_func(2, 3)
        
        assert result == 5
        assert len(tracker.steps) == 1
        
        step = tracker.steps[0]
        assert step.name == "Test Function"
        assert step.input_params['x'] == 2
        assert step.input_params['y'] == 3
        assert step.duration > 0
    
    def test_context_tracking(self):
        """Test tracking with context manager"""
        tracker = PipelineTracker()
        
        with tracker.track_context("Data Processing") as step:
            # Simulate some processing
            data = [1, 2, 3]
            processed = [x * 2 for x in data]
            step.output_summary = {'n_items': len(processed)}
        
        assert len(tracker.steps) == 1
        step = tracker.steps[0]
        assert step.name == "Data Processing"
        assert step.output_summary['n_items'] == 3
    
    def test_decision_recording(self):
        """Test recording analytical decisions"""
        tracker = PipelineTracker()
        
        decision = tracker.record_decision(
            decision_type='test_selection',
            options=['t-test', 'Mann-Whitney', 'Wilcoxon'],
            chosen='t-test',
            rationale='Data is normally distributed',
            automated=False,
            confidence=0.95
        )
        
        assert len(tracker.decision_points) == 1
        assert decision.option_chosen == 't-test'
        assert decision.confidence == 0.95
    
    def test_pipeline_graph(self):
        """Test pipeline graph generation"""
        tracker = PipelineTracker()
        
        # Create nested steps
        @tracker.track_step(name="Parent")
        def parent_func():
            @tracker.track_step(name="Child")
            def child_func():
                return 1
            return child_func()
        
        parent_func()
        
        graph = tracker.get_pipeline_graph()
        assert graph['total_steps'] == 2
        assert len(graph['nodes']) == 2
        assert len(graph['edges']) == 1


class TestSeedManager:
    """Test seed management for reproducibility"""
    
    def test_seed_initialization(self):
        """Test seed manager initialization"""
        manager = SeedManager(master_seed=12345)
        
        assert manager.master_seed == 12345
        assert len(manager.module_seeds) > 0
        assert 'numpy' in manager.module_seeds
    
    def test_seed_reproducibility(self):
        """Test that seeds produce reproducible results"""
        manager1 = SeedManager(master_seed=42)
        manager2 = SeedManager(master_seed=42)
        
        # Module seeds should be identical
        assert manager1.module_seeds == manager2.module_seeds
        
        # Random generation should be identical
        rng1 = manager1.get_random_generator('test')
        rng2 = manager2.get_random_generator('test')
        
        vals1 = rng1.randn(100)
        vals2 = rng2.randn(100)
        
        np.testing.assert_array_equal(vals1, vals2)
    
    def test_temporary_seed(self):
        """Test temporary seed context manager"""
        manager = SeedManager(master_seed=42)
        
        # Get initial random values
        np.random.seed(42)
        initial = np.random.randn(5)
        
        # Use temporary seed
        with manager.temporary_seed(999):
            temp_vals = np.random.randn(5)
        
        # Should be restored
        np.random.seed(42)
        restored = np.random.randn(5)
        
        np.testing.assert_array_equal(initial, restored)
        assert not np.array_equal(initial, temp_vals)
    
    def test_reproducibility_verification(self):
        """Test reproducibility verification"""
        manager = SeedManager(master_seed=42)
        
        def random_func():
            return np.random.randn(10).mean()
        
        # Should be reproducible
        is_reproducible = manager.verify_reproducibility(random_func, n_runs=5)
        assert is_reproducible


class TestMethodsGenerator:
    """Test automatic methods text generation"""
    
    def test_methods_generation(self):
        """Test generating methods section"""
        generator = MethodsGenerator()
        bundle = ReproducibilityBundle(title="Test Study")
        
        # Add some test data
        bundle.hypothesis_tests = [
            {'test_name': 't-test', 'p_value': 0.03, 'statistic': 2.5}
        ]
        bundle.effect_sizes = [
            {'effect_type': 'cohen_d', 'value': 0.8, 'ci_lower': 0.4, 'ci_upper': 1.2}
        ]
        
        methods = generator.generate_methods(bundle)
        
        assert 'Statistical Software' in methods
        assert 'Hypothesis Testing' in methods
        assert 'Effect Sizes' in methods
        assert len(generator.citations_used) > 0
    
    def test_summary_paragraph(self):
        """Test summary paragraph generation"""
        generator = MethodsGenerator()
        bundle = ReproducibilityBundle()
        
        # Add test fingerprint
        bundle.data_fingerprints['data'] = type('obj', (object,), {
            'shape': (100, 5),
            'missing_count': 0
        })()
        
        bundle.hypothesis_tests = [{}] * 5
        bundle.effect_sizes = [{}]
        
        summary = generator.generate_summary_paragraph(bundle)
        
        assert '100 observations' in summary
        assert '5 hypothesis tests' in summary
        assert 'Effect sizes' in summary
    
    def test_limitations_generation(self):
        """Test generating limitations"""
        generator = MethodsGenerator()
        bundle = ReproducibilityBundle()
        
        # Add assumption check that failed
        bundle.assumption_checks = [
            {'test_type': 'normality', 'passed': False}
        ]
        
        # Add low power analysis
        bundle.power_analyses = [
            {'power': 0.65}
        ]
        
        limitations = generator.generate_limitations(bundle)
        
        assert len(limitations) > 0
        assert any('non-normal' in lim for lim in limitations)
        assert any('power' in lim.lower() for lim in limitations)


class TestBundleSerializer:
    """Test bundle serialization and deserialization"""
    
    def test_json_export_import(self):
        """Test JSON format export/import"""
        serializer = BundleSerializer()
        
        # Create bundle
        bundle = ReproducibilityBundle(title="Test")
        bundle.set_random_seeds(42)
        
        with tempfile.NamedTemporaryFile(suffix='.json', delete=False) as f:
            filepath = Path(f.name)
        
        try:
            # Export
            success = serializer.export_bundle(bundle, filepath, format='json')
            assert success
            assert filepath.exists()
            
            # Import
            imported = serializer.import_bundle(filepath, format='json')
            assert imported is not None
            assert imported.title == "Test"
            assert imported.master_seed == 42
        finally:
            filepath.unlink()
    
    def test_compressed_json(self):
        """Test compressed JSON format"""
        serializer = BundleSerializer()
        bundle = ReproducibilityBundle(title="Compressed Test")
        
        with tempfile.NamedTemporaryFile(suffix='.json.gz', delete=False) as f:
            filepath = Path(f.name)
        
        try:
            # Export compressed
            success = serializer.export_bundle(bundle, filepath, format='json.gz')
            assert success
            
            # Check it's actually compressed
            with gzip.open(filepath, 'rt') as f:
                data = json.load(f)
                assert data['title'] == "Compressed Test"
            
            # Import
            imported = serializer.import_bundle(filepath)
            assert imported.title == "Compressed Test"
        finally:
            filepath.unlink()
    
    def test_format_detection(self):
        """Test automatic format detection"""
        serializer = BundleSerializer()
        
        # Test with different file extensions
        test_files = {
            'test.json': 'json',
            'test.json.gz': 'json.gz',
            'test.pickle': 'pickle',
            'test.zip': 'zip',
            'test.tar.gz': 'tar.gz'
        }
        
        for filename, expected_format in test_files.items():
            detected = serializer._detect_format(Path(filename))
            assert detected == expected_format
    
    def test_special_types_conversion(self):
        """Test conversion of numpy/pandas types"""
        serializer = BundleSerializer()
        
        # Test data
        data = {
            'array': np.array([1, 2, 3]),
            'dataframe': pd.DataFrame({'A': [1, 2]}),
            'series': pd.Series([1, 2, 3], name='test'),
            'datetime': datetime.now()
        }
        
        # Convert to serializable
        converted = serializer._convert_special_types(data)
        
        assert converted['array']['_type'] == 'numpy.ndarray'
        assert converted['dataframe']['_type'] == 'pandas.DataFrame'
        assert converted['series']['_type'] == 'pandas.Series'
        assert converted['datetime']['_type'] == 'datetime'
        
        # Reconstruct
        reconstructed = serializer._reconstruct_special_types(converted)
        
        assert isinstance(reconstructed['array'], np.ndarray)
        assert isinstance(reconstructed['dataframe'], pd.DataFrame)
        assert isinstance(reconstructed['series'], pd.Series)
        assert isinstance(reconstructed['datetime'], datetime)


class TestReproducibilityVerifier:
    """Test reproducibility verification"""
    
    def test_data_integrity_verification(self):
        """Test data integrity checks"""
        verifier = ReproducibilityVerifier()
        bundle = ReproducibilityBundle()
        
        # Create test data
        df = pd.DataFrame({'A': [1, 2, 3], 'B': [4, 5, 6]})
        bundle.add_data_fingerprint('test_data', df)
        
        # Verify with same data
        data = {'test_data': df}
        result = verifier.verify_data_integrity(bundle, data)
        
        assert result['passed']
        assert 'hash verified' in str(result['details'])
        
        # Verify with modified data
        df_modified = pd.DataFrame({'A': [1, 2, 4], 'B': [4, 5, 6]})
        data_modified = {'test_data': df_modified}
        result = verifier.verify_data_integrity(bundle, data_modified)
        
        assert not result['passed']
        assert 'Hash mismatch' in str(result['details'])
    
    def test_seed_verification(self):
        """Test random seed verification"""
        verifier = ReproducibilityVerifier()
        bundle = ReproducibilityBundle()
        bundle.set_random_seeds(12345)
        
        result = verifier.verify_random_seeds(bundle)
        
        assert result['passed']
        assert 'Master seed 12345 verified' in str(result['details'])
    
    def test_numerical_verification(self):
        """Test numerical result verification"""
        verifier = ReproducibilityVerifier()
        
        # Exact match
        passed, msg = verifier.verify_numerical_result(1.234567, 1.234567)
        assert passed
        
        # Within tolerance
        passed, msg = verifier.verify_numerical_result(1.0, 1.0 + 1e-11)
        assert passed
        
        # Outside tolerance
        passed, msg = verifier.verify_numerical_result(1.0, 1.01)
        assert not passed
        
        # Special cases
        passed, msg = verifier.verify_numerical_result(np.nan, np.nan)
        assert passed
        
        passed, msg = verifier.verify_numerical_result(np.inf, np.inf)
        assert passed
    
    def test_bundle_comparison(self):
        """Test comparing two bundles"""
        verifier = ReproducibilityVerifier()
        
        bundle1 = ReproducibilityBundle(title="Bundle 1")
        bundle1.set_random_seeds(42)
        
        bundle2 = ReproducibilityBundle(title="Bundle 2")
        bundle2.set_random_seeds(99)
        
        comparison = verifier.compare_bundles(bundle1, bundle2)
        
        assert not comparison['identical']
        assert 'Different master seeds' in str(comparison['differences'])
    
    def test_verification_report(self):
        """Test generating verification report"""
        verifier = ReproducibilityVerifier()
        
        verification = {
            'bundle_id': 'test-123',
            'timestamp': datetime.now().isoformat(),
            'passed': True,
            'summary': {
                'total_checks': 5,
                'passed_checks': 5,
                'failed_checks': 0,
                'warnings': 2
            },
            'checks': [
                {
                    'check_type': 'data_integrity',
                    'passed': True,
                    'details': ['All data verified'],
                    'warnings': []
                }
            ]
        }
        
        report = verifier.generate_verification_report(verification)
        
        assert 'PASSED' in report
        assert 'Bundle ID: test-123' in report
        assert 'Data Integrity' in report


class TestIntegration:
    """Integration tests for the complete reproducibility system"""
    
    def test_complete_workflow(self):
        """Test complete reproducibility workflow"""
        # 1. Create bundle
        bundle = ReproducibilityBundle(
            title="Integration Test",
            description="Testing complete workflow"
        )
        
        # 2. Set random seeds
        bundle.set_random_seeds(42)
        
        # 3. Add data fingerprint
        df = pd.DataFrame({
            'treatment': np.random.randn(50),
            'control': np.random.randn(50)
        })
        bundle.add_data_fingerprint('experiment_data', df)
        
        # 4. Track pipeline
        tracker = PipelineTracker()
        
        @tracker.track_step(name="Statistical Test")
        def run_test(data):
            from scipy import stats
            return stats.ttest_ind(data['treatment'], data['control'])
        
        result = run_test(df)
        bundle.hypothesis_tests.append({
            'test_name': 't-test',
            'p_value': result.pvalue,
            'statistic': result.statistic
        })
        
        # 5. Generate methods
        generator = MethodsGenerator()
        methods = generator.generate_methods(bundle)
        assert len(methods) > 0
        
        # 6. Validate bundle
        assert bundle.validate()
        
        # 7. Serialize bundle
        serializer = BundleSerializer()
        with tempfile.NamedTemporaryFile(suffix='.json.gz', delete=False) as f:
            filepath = Path(f.name)
        
        try:
            success = serializer.export_bundle(bundle, filepath)
            assert success
            
            # 8. Import bundle
            imported = serializer.import_bundle(filepath)
            assert imported is not None
            
            # 9. Verify reproducibility
            verifier = ReproducibilityVerifier()
            verification = verifier.verify_bundle(
                imported,
                modules={},
                data={'experiment_data': df}
            )
            
            assert verification['passed']
            
        finally:
            filepath.unlink()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])