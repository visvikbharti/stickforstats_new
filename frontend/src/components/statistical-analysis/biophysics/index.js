/**
 * Biophysics Analysis Module - Module 10
 *
 * Exports all biophysics analysis components.
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

export { default as BiophysicsHub } from './BiophysicsHub';
export { default } from './BiophysicsHub';

// Sub-modules
export { default as MichaelisMentenAnalysis } from './enzyme-kinetics/MichaelisMentenAnalysis';
export { default as BindingAffinityAnalysis } from './binding-affinity/BindingAffinityAnalysis';
export { default as DoseResponseAnalysis } from './binding-affinity/DoseResponseAnalysis';
