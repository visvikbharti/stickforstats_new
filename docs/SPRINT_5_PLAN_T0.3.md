# Sprint 5: Reproducibility/Provenance Bundle (T0.3)
**Feature ID**: T0.3  
**Priority**: CRITICAL (Last Tier 0 Feature)  
**Sprint Duration**: 2025-01-10 → 2025-01-11  
**Scientific Rigor**: MAXIMUM  

## 🎯 Why T0.3 is the Keystone Feature

This is the feature that transforms StickForStats from a statistical tool into a **scientific instrument**. Without reproducibility, analyses are just numbers. With it, they become verifiable science.

### The Reproducibility Crisis Context:
- **70%** of researchers have failed to reproduce another's experiments (Nature, 2016)
- **50%** have failed to reproduce their own experiments
- Statistical analyses are particularly vulnerable due to:
  - Researcher degrees of freedom
  - Multiple testing without correction
  - Data-dependent analysis choices
  - Version sensitivity of algorithms

### What T0.3 Solves:
1. **Perfect Reproducibility**: Exact same results, every time
2. **Complete Provenance**: Know exactly how every result was obtained
3. **Transparent Methods**: Auto-generated methods sections
4. **Collaboration**: Share complete analysis workflows
5. **Journal Compliance**: Meet reproducibility requirements

## 📦 The Reproducibility Bundle Architecture

```python
@dataclass
class ReproducibilityBundle:
    """
    A complete, self-contained snapshot of an analysis session.
    Can be shared, archived, and re-executed to produce identical results.
    """
    
    # Metadata
    bundle_id: str  # UUID for unique identification
    created_at: datetime
    created_by: str  # User/system identifier
    description: str  # Human-readable description
    
    # Data Fingerprints
    data_hashes: Dict[str, str]  # SHA-256 of all input data
    data_shapes: Dict[str, Tuple]  # Dimensions of datasets
    data_types: Dict[str, Dict]  # Column types and ranges
    missing_data: Dict[str, Dict]  # Missing data patterns
    
    # Complete Analysis Pipeline
    pipeline_steps: List[PipelineStep]  # Ordered analysis steps
    decision_points: List[DecisionPoint]  # Where choices were made
    
    # Module States
    test_recommender_state: Dict  # All recommendation decisions
    assumption_checks: List[AssumptionResult]  # All checks performed
    hypothesis_registry: HypothesisRegistry  # All tests performed
    power_analyses: List[PowerAnalysisResult]  # All power calcs
    effect_sizes: List[EffectSizeResult]  # All effect sizes
    corrections_applied: List[CorrectionResult]  # Multiplicity
    
    # Environment Snapshot
    environment: EnvironmentInfo
    dependencies: Dict[str, str]  # Package versions
    system_info: SystemInfo
    
    # Random State Management
    master_seed: int
    module_seeds: Dict[str, int]  # Per-module seeds
    
    # Results Archive
    all_results: Dict[str, Any]  # Complete results
    figures: List[FigureData]  # Reproducible plots
    tables: List[TableData]  # Formatted tables
    
    # Methods Generation
    methods_text: str  # Auto-generated methods
    citations: List[Citation]  # All references used
    assumptions: List[str]  # Stated assumptions
    limitations: List[str]  # Known limitations
```

## 🏗️ Technical Implementation Plan

### Module Structure:
```
backend/core/reproducibility/
├── __init__.py
├── bundle.py               # Main ReproducibilityBundle class
├── fingerprinting.py       # Data hashing and verification
├── pipeline_tracker.py     # Track analysis pipeline
├── state_capture.py        # Capture module states
├── environment_snapshot.py # System/package info
├── seed_manager.py         # Random state management
├── methods_generator.py    # Auto-generate methods text
├── serialization.py        # Bundle I/O (JSON/HDF5)
├── verification.py         # Verify reproducibility
└── migrations.py           # Handle version changes
```

### Core Components:

#### 1. Data Fingerprinting System
```python
class DataFingerprinter:
    """Create unique, verifiable fingerprints of datasets"""
    
    def fingerprint_dataframe(self, df: pd.DataFrame) -> DataFingerprint:
        """
        Create comprehensive fingerprint including:
        - SHA-256 hash of sorted data
        - Column names and types
        - Shape and size
        - Missing data pattern
        - Statistical summary
        """
        
    def fingerprint_array(self, arr: np.ndarray) -> DataFingerprint:
        """Fingerprint numpy arrays"""
        
    def verify_fingerprint(self, data: Any, fingerprint: DataFingerprint) -> bool:
        """Verify data matches fingerprint"""
```

#### 2. Pipeline Tracking System
```python
class PipelineTracker:
    """Track every step of the analysis pipeline"""
    
    def __init__(self):
        self.steps = []
        self.decision_points = []
        
    @contextmanager
    def track_step(self, name: str, module: str):
        """Context manager to track a pipeline step"""
        start_time = time.time()
        params_before = self.capture_params()
        
        yield
        
        params_after = self.capture_params()
        step = PipelineStep(
            name=name,
            module=module,
            timestamp=start_time,
            duration=time.time() - start_time,
            input_params=params_before,
            output_params=params_after
        )
        self.steps.append(step)
    
    def record_decision(self, decision: DecisionPoint):
        """Record a decision point in the analysis"""
        self.decision_points.append(decision)
```

#### 3. State Capture System
```python
class StateCapture:
    """Capture complete state of all modules"""
    
    def capture_test_recommender(self, recommender: TestRecommender) -> Dict:
        """Capture test recommender state"""
        return {
            'recommendations': recommender.get_all_recommendations(),
            'assumption_checks': recommender.get_assumption_results(),
            'fallback_decisions': recommender.get_fallback_history(),
            'confidence_scores': recommender.get_confidence_scores()
        }
    
    def capture_hypothesis_registry(self, registry: HypothesisRegistry) -> Dict:
        """Capture all hypothesis tests"""
        return {
            'all_tests': registry.get_all_tests(),
            'corrections_applied': registry.get_corrections(),
            'p_hacking_risk': registry.get_risk_assessment(),
            'session_id': registry.session_id
        }
    
    def capture_power_analysis(self, analyzer: PowerAnalyzer) -> Dict:
        """Capture power calculations"""
        
    def capture_effect_sizes(self, calculator: EffectSizeCalculator) -> Dict:
        """Capture effect size calculations"""
```

#### 4. Seed Management System
```python
class SeedManager:
    """Manage random seeds for perfect reproducibility"""
    
    def __init__(self, master_seed: int = None):
        self.master_seed = master_seed or self._generate_seed()
        self.module_seeds = {}
        self._generate_module_seeds()
    
    def _generate_module_seeds(self):
        """Generate deterministic seeds for each module"""
        rng = np.random.RandomState(self.master_seed)
        modules = [
            'numpy', 'scipy', 'pandas', 'sklearn',
            'test_recommender', 'power_analysis',
            'bootstrap', 'permutation'
        ]
        for module in modules:
            self.module_seeds[module] = rng.randint(0, 2**32 - 1)
    
    def set_all_seeds(self):
        """Set all random seeds"""
        np.random.seed(self.module_seeds['numpy'])
        import random
        random.seed(self.module_seeds['numpy'])
        # Set other seeds...
    
    @contextmanager
    def temporary_seed(self, seed: int):
        """Temporarily set seed for a block"""
        old_state = np.random.get_state()
        np.random.seed(seed)
        try:
            yield
        finally:
            np.random.set_state(old_state)
```

#### 5. Methods Text Generator
```python
class MethodsGenerator:
    """Generate publication-ready methods sections"""
    
    def generate_methods(self, bundle: ReproducibilityBundle) -> str:
        """
        Generate complete methods section including:
        - Data description
        - Statistical tests used
        - Assumption checks performed
        - Corrections applied
        - Software versions
        - Effect size calculations
        """
        
        sections = []
        
        # Data section
        sections.append(self._generate_data_section(bundle))
        
        # Statistical analysis section
        sections.append(self._generate_analysis_section(bundle))
        
        # Software section
        sections.append(self._generate_software_section(bundle))
        
        return "\n\n".join(sections)
    
    def _generate_data_section(self, bundle) -> str:
        """Generate data description"""
        return f"""
        Data Description
        ----------------
        The dataset contained {bundle.data_shapes['main']} observations
        across {bundle.data_shapes['variables']} variables. 
        Missing data ({bundle.missing_data['percentage']:.1f}%) was handled
        using {bundle.missing_data['method']}.
        """
    
    def _generate_analysis_section(self, bundle) -> str:
        """Generate statistical analysis description"""
        # Detail all tests performed, in order
        
    def _generate_software_section(self, bundle) -> str:
        """Generate software citation"""
        return f"""
        All analyses were performed using StickForStats v{bundle.version}
        (Bharti et al., 2025) with Python {bundle.environment.python_version}.
        Statistical computations used NumPy {bundle.dependencies['numpy']},
        SciPy {bundle.dependencies['scipy']}, and statsmodels 
        {bundle.dependencies.get('statsmodels', 'N/A')}.
        """
```

#### 6. Bundle Serialization
```python
class BundleSerializer:
    """Serialize/deserialize reproducibility bundles"""
    
    def save_bundle(self, bundle: ReproducibilityBundle, 
                   filepath: Path, format: str = 'json') -> None:
        """
        Save bundle to file
        Formats: json, hdf5, pickle, zarr
        """
        if format == 'json':
            self._save_json(bundle, filepath)
        elif format == 'hdf5':
            self._save_hdf5(bundle, filepath)
        # etc...
    
    def load_bundle(self, filepath: Path) -> ReproducibilityBundle:
        """Load bundle from file"""
        
    def _save_json(self, bundle, filepath):
        """JSON serialization with compression"""
        import json
        import gzip
        
        # Convert to JSON-serializable format
        bundle_dict = self._bundle_to_dict(bundle)
        
        # Compress and save
        with gzip.open(filepath, 'wt', encoding='utf-8') as f:
            json.dump(bundle_dict, f, indent=2, default=str)
    
    def validate_bundle(self, bundle: ReproducibilityBundle) -> bool:
        """Validate bundle integrity"""
        # Check all required fields
        # Verify data hashes
        # Check version compatibility
```

#### 7. Reproducibility Verification
```python
class ReproducibilityVerifier:
    """Verify that analyses are reproducible"""
    
    def verify_exact_reproducibility(self, 
                                    bundle: ReproducibilityBundle,
                                    data: Dict[str, pd.DataFrame]) -> VerificationResult:
        """
        Re-run entire analysis and verify identical results
        """
        # Set seeds
        seed_manager = SeedManager(bundle.master_seed)
        seed_manager.set_all_seeds()
        
        # Verify data matches
        for name, df in data.items():
            fingerprint = DataFingerprinter().fingerprint_dataframe(df)
            if fingerprint.hash != bundle.data_hashes[name]:
                return VerificationResult(
                    success=False,
                    reason=f"Data mismatch for {name}"
                )
        
        # Re-run pipeline
        results = self._rerun_pipeline(bundle, data)
        
        # Compare results
        differences = self._compare_results(bundle.all_results, results)
        
        return VerificationResult(
            success=len(differences) == 0,
            differences=differences
        )
```

## 📋 Implementation Checklist

### Phase 1: Core Infrastructure (Day 1 Morning)
- [ ] Create reproducibility package structure
- [ ] Implement DataFingerprinter class
- [ ] Create PipelineTracker with decorators
- [ ] Implement SeedManager with module seeds
- [ ] Set up basic Bundle class

### Phase 2: State Capture (Day 1 Afternoon)
- [ ] Integrate with test_recommender
- [ ] Integrate with hypothesis_registry
- [ ] Integrate with power_analysis
- [ ] Integrate with effect_sizes
- [ ] Capture environment info

### Phase 3: Methods Generation (Day 1 Evening)
- [ ] Create methods text templates
- [ ] Implement citation management
- [ ] Generate data descriptions
- [ ] Create analysis descriptions
- [ ] Format for different journals

### Phase 4: Serialization (Day 2 Morning)
- [ ] Implement JSON serialization
- [ ] Add HDF5 support for large data
- [ ] Create compression options
- [ ] Add encryption for sensitive data
- [ ] Implement bundle validation

### Phase 5: Verification (Day 2 Afternoon)
- [ ] Create verification framework
- [ ] Implement exact reproducibility checks
- [ ] Add approximate reproducibility (for floating point)
- [ ] Create difference reporting
- [ ] Add migration support for versions

### Phase 6: Integration & Testing (Day 2 Evening)
- [ ] Create comprehensive test suite
- [ ] Test cross-session reproducibility
- [ ] Verify with different random seeds
- [ ] Test bundle portability
- [ ] Validate methods text generation

## 🔬 Scientific Integrity Requirements

### Data Integrity:
1. **Immutable Hashes**: SHA-256 for data verification
2. **Bit-Exact Storage**: Preserve floating point precision
3. **Missing Data Tracking**: Record all imputation
4. **Transformation Log**: Every data change recorded

### Algorithm Integrity:
1. **Version Locking**: Exact package versions
2. **Seed Management**: Deterministic randomness
3. **Parameter Capture**: Every parameter recorded
4. **Decision Tracking**: All choices documented

### Result Integrity:
1. **Complete Results**: Store all outputs
2. **Intermediate States**: Checkpoint capability
3. **Error Handling**: Record all warnings/errors
4. **Validation Checks**: Built-in verification

## 🎨 Frontend Components Needed

### 1. ReproducibilityPanel.jsx
```jsx
- Bundle creation wizard
- Bundle validation status
- Share/export options
- Version comparison
```

### 2. MethodsTextGenerator.jsx
```jsx
- Editable methods text
- Citation management
- Format selection (APA, Nature, etc.)
- Copy to clipboard
```

### 3. BundleExplorer.jsx
```jsx
- Visual pipeline representation
- Decision point highlighting
- Parameter inspection
- Result browsing
```

## ✅ Success Criteria

1. **Exact Reproducibility**: Same data → Same results (bit-exact)
2. **Cross-Platform**: Works on Windows/Mac/Linux
3. **Version Stable**: Handle package updates gracefully
4. **Complete Coverage**: All modules integrated
5. **User Friendly**: One-click bundle creation
6. **Publication Ready**: Auto-generated methods accepted by journals
7. **Secure**: Optional encryption for sensitive data
8. **Performant**: <1s to create bundle for typical analysis

## 📚 Key References

1. Peng, R. D. (2011). Reproducible research in computational science. Science, 334(6060), 1226-1227.
2. Stodden, V., et al. (2016). Enhancing reproducibility for computational methods. Science, 354(6317), 1240-1241.
3. Wilson, G., et al. (2017). Good enough practices in scientific computing. PLOS Computational Biology, 13(6), e1005510.
4. Wilkinson, M. D., et al. (2016). The FAIR Guiding Principles for scientific data management. Scientific Data, 3, 160018.

## 🚀 This Completes Tier 0!

With T0.3 implemented, StickForStats will have:
1. ✅ Intelligent test recommendation (T0.1)
2. ✅ Multiple testing protection (T0.2)
3. ✅ Reproducible analyses (T0.3)
4. ✅ Power analysis (T0.4)
5. ✅ Effect sizes & robust methods (T0.5)

**Result**: A complete, publication-ready statistical platform that enforces best practices and ensures reproducible science.

---

*Sprint Start: 2025-01-10*  
*Target Completion: 2025-01-11*  
*Quality Standard: Scientific Publication Grade*