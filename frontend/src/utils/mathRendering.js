/**
 * mathRendering.js
 * 
 * This module provides optimized math formula rendering utilities.
 * It standardizes on KaTeX for formula rendering, which is more lightweight
 * than MathJax while still providing good formula rendering capabilities.
 */

import React, { lazy, Suspense } from 'react';
import CircularProgress from '@mui/material/CircularProgress';

// Import only core KaTeX styles
import 'katex/dist/katex.min.css';

// Basic imports for immediate use
import { InlineMath, BlockMath } from 'react-katex';

// Lazy loaded components for more complex math rendering
const LazyMathJaxProvider = lazy(() => 
  import('better-react-mathjax').then(module => ({ 
    default: module.MathJaxContext 
  }))
);

const LazyMathJax = lazy(() => 
  import('better-react-mathjax').then(module => ({ 
    default: module.MathJax 
  }))
);

// Default configuration for MathJax (when needed for complex formulas)
const defaultMathJaxConfig = {
  tex: {
    inlineMath: [['$', '$'], ['\\(', '\\)']],
    displayMath: [['$$', '$$'], ['\\[', '\\]']],
    processEscapes: true,
    processEnvironments: true
  },
  options: {
    skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
    ignoreHtmlClass: 'tex2jax_ignore',
    processHtmlClass: 'tex2jax_process'
  },
  startup: {
    typeset: false
  }
};

// Simplified inline math component (prefer this for basic formulas - uses KaTeX)
export const InlineMathFormula = ({ formula }) => {
  try {
    // Use the InlineMath component from react-katex
    return <InlineMath math={formula} />;
  } catch (error) {
    console.error('Error rendering inline math formula:', error);
    return <code>{formula}</code>;
  }
};

// Re-export for use in other components
export { InlineMath, BlockMath };

// Simplified block math component (prefer this for basic formulas - uses KaTeX)
export const BlockMathFormula = ({ formula }) => {
  try {
    // Use the BlockMath component from react-katex
    return <BlockMath math={formula} />;
  } catch (error) {
    console.error('Error rendering block math formula:', error);
    return <pre><code>{formula}</code></pre>;
  }
};

// Advanced math provider for complex formulas (loads MathJax on demand)
export const AdvancedMathProvider = ({ children, config = defaultMathJaxConfig }) => {
  return (
    <Suspense fallback={<div>Loading math renderer...</div>}>
      <LazyMathJaxProvider config={config}>
        {children}
      </LazyMathJaxProvider>
    </Suspense>
  );
};

// Advanced math component for complex formulas (loads MathJax on demand)
export const AdvancedMathFormula = ({ formula, isBlock = false }) => {
  return (
    <Suspense fallback={<CircularProgress size={20} />}>
      <LazyMathJax 
        inline={!isBlock} 
        dynamic={true}
      >
        {isBlock ? `$$${formula}$$` : `$${formula}$`}
      </LazyMathJax>
    </Suspense>
  );
};

// Utility to help determine which formula renderer to use
export const shouldUseAdvancedRenderer = (formula) => {
  // Determine if the formula is complex enough to warrant MathJax
  // These are signs that KaTeX might struggle with the formula
  const complexPatterns = [
    '\\begin{aligned}',
    '\\begin{array}',
    '\\begin{cases}',
    '\\begin{bmatrix}',
    '\\begin{pmatrix}',
    '\\begin{vmatrix}',
    '\\begin{Bmatrix}',
    '\\begin{smallmatrix}',
    '\\tag',
    '\\iiiint',
    '\\iiint',
    '\\binom',
    '\\operatorname',
    '\\cfrac',
    '\\hdashline',
    '\\iff',
    '\\iiiint'
  ];
  
  return complexPatterns.some(pattern => formula.includes(pattern));
};

// Helper component that automatically selects the right renderer
export const SmartMathFormula = ({ formula, isBlock = false }) => {
  const useAdvanced = shouldUseAdvancedRenderer(formula);
  
  if (useAdvanced) {
    return (
      <AdvancedMathProvider>
        <AdvancedMathFormula formula={formula} isBlock={isBlock} />
      </AdvancedMathProvider>
    );
  }
  
  return isBlock 
    ? <BlockMathFormula formula={formula} /> 
    : <InlineMathFormula formula={formula} />;
};