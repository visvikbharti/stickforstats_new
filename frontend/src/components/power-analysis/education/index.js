/**
 * Power Analysis Education Module - Index
 *
 * Central export file for all Power Analysis educational components.
 * Includes 11 lessons covering the full spectrum of power analysis:
 * - Fundamentals (Lessons 1-3)
 * - Core concepts (Lessons 4-8)
 * - Advanced topics (Lessons 9-11)
 */

// Main Hub
export { default as PowerAnalysisEducationHub } from './PowerAnalysisEducationHub';

// Lessons
export { default as Lesson01_FundamentalProblem } from './lessons/Lesson01_FundamentalProblem';
export { default as Lesson02_HypothesisTesting } from './lessons/Lesson02_HypothesisTesting';
export { default as Lesson03_StatisticalPower } from './lessons/Lesson03_StatisticalPower';
export { default as Lesson04_FourPillars } from './lessons/Lesson04_FourPillars';
export { default as Lesson05_EffectSize } from './lessons/Lesson05_EffectSize';
export { default as Lesson06_Mathematics } from './lessons/Lesson06_Mathematics';
export { default as Lesson07_DifferentDesigns } from './lessons/Lesson07_DifferentDesigns';
export { default as Lesson08_Assumptions } from './lessons/Lesson08_Assumptions';
export { default as Lesson09_APrioriVsPostHoc } from './lessons/Lesson09_APrioriVsPostHoc';
export { default as Lesson10_RealWorld } from './lessons/Lesson10_RealWorld';
export { default as Lesson11_BayesianPower } from './lessons/Lesson11_BayesianPower';

// Simulations (6 implemented)
export { default as TypeITypeIIAnimation } from './simulations/TypeITypeIIAnimation';
export { default as PowerCurveSimulation } from './simulations/PowerCurveSimulation';
export { default as EffectSizeExplorer } from './simulations/EffectSizeExplorer';
export { default as SamplingDistributionDemo } from './simulations/SamplingDistributionDemo';
export { default as NonParametricPowerDemo } from './simulations/NonParametricPowerDemo';
export { default as BayesFactorSimulation } from './simulations/BayesFactorSimulation';
// Note: SampleSizeCalculatorDemo skipped - functionality covered by PowerCurveSimulation

// Visualizations (4 implemented)
export { default as DecisionMatrixVisualization } from './visualizations/DecisionMatrixVisualization';
export { default as NonCentralDistribution } from './visualizations/NonCentralDistribution';
export { default as PowerHeatmap } from './visualizations/PowerHeatmap';
export { default as PriorPosteriorPlot } from './visualizations/PriorPosteriorPlot';

// Utilities
export * from './utils';
