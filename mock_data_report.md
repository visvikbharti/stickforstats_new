# Mock Data Removal Report

## Summary
Total instances of Math.random() to remove:      208

## Files to Update

### High Priority (Core Modules)
- [ ] frontend/src/modules/TTestRealBackend.jsx
- [ ] frontend/src/modules/CorrelationRegressionModule_OLD.jsx
- [ ] frontend/src/modules/ANOVACompleteModule.jsx
- [ ] frontend/src/modules/ANOVARealBackend.jsx
- [ ] frontend/src/modules/CorrelationRegressionModule.jsx
- [ ] frontend/src/modules/HypothesisTestingModule.jsx
- [ ] frontend/src/modules/TTestCompleteModule.jsx
- [ ] frontend/src/modules/TTestProfessionalModule.jsx
- [ ] frontend/src/modules/HypothesisTestingModule_OLD.jsx

### Medium Priority (Components)
- [ ] frontend/src/components/pca/PcaIntroduction.jsx
- [ ] frontend/src/components/pca/DataUploader.jsx
- [ ] frontend/src/components/pca/PcaReportGenerator.jsx
- [ ] frontend/src/components/pca/PcaVisualization.optimized.jsx
- [ ] frontend/src/components/PowerAnalysis/EffectSizeEstimator.jsx
- [ ] frontend/src/components/PowerAnalysis/StudyDesignWizard.jsx
- [ ] frontend/src/components/PowerAnalysis/PowerCalculator.jsx
- [ ] frontend/src/components/PowerAnalysis/SensitivityAnalyzer.jsx
- [ ] frontend/src/components/PowerAnalysis/PowerAnalysisReport.jsx
- [ ] frontend/src/components/Reproducibility/PipelineRecorder.jsx
- [ ] frontend/src/components/Reproducibility/BundleComparison.jsx
- [ ] frontend/src/components/Reproducibility/SeedManager.jsx
- [ ] frontend/src/components/confidence_intervals/AdvancedConfidenceIntervals.jsx
- [ ] frontend/src/components/confidence_intervals/visualizations/CoverageAnimation.jsx
- [ ] frontend/src/components/TestRecommender/DataInputPanel.jsx
- [ ] frontend/src/components/TestRecommender/AssumptionChecksPanel.jsx
- [ ] frontend/src/components/EffectSizes/ConfidenceIntervalPlotter.jsx
- [ ] frontend/src/components/EffectSizes/RobustEstimators.jsx
- [ ] frontend/src/components/doe/Introduction.jsx
- [ ] frontend/src/components/statistical/educational/SimulationControl.jsx
- [ ] frontend/src/components/sqc/DataUploadStep.jsx
- [ ] frontend/src/components/probability_distributions/educational/DistributionAnimation.jsx
- [ ] frontend/src/components/probability_distributions/educational/CLTSimulator.jsx
- [ ] frontend/src/components/probability_distributions/simulations/ClinicalTrialD3.jsx
- [ ] frontend/src/components/probability_distributions/simulations/QualityControlD3.jsx
- [ ] frontend/src/components/probability_distributions/simulations/NetworkTrafficD3.jsx
- [ ] frontend/src/components/probability_distributions/simulations/EmailArrivalsD3.jsx
- [ ] frontend/src/components/probability_distributions/simulations/OptimizedExample.jsx
- [ ] frontend/src/components/probability_distributions/simulations/ManufacturingDefectsD3.jsx

## Replacement Strategy

1. **For Data Generation**: Replace with real API calls
2. **For Simulations**: Move to backend or use deterministic algorithms
3. **For Examples**: Use fixed, realistic datasets

## Code Patterns to Replace

```javascript
// OLD: Mock data generation
const data = Array.from({ length: 10 }, () => Math.random() * 100);

// NEW: Real API call
const response = await service.getData();
const data = response.data;
```

```javascript
// OLD: Simulation
const simulation = () => {
    return Math.random() > 0.5 ? 'success' : 'fail';
};

// NEW: Backend calculation
const result = await service.runSimulation({ params });
```
