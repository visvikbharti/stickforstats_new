#!/bin/bash

# Script to update simulation files to use client-side simulations instead of WebSocket

cd /Users/vishalbharti/StickForStats_v1.0_Production/frontend/src/components/confidence_intervals/simulations

# Update SampleSizeSimulation.jsx
echo "Updating SampleSizeSimulation.jsx..."
# Add import after the MathJax import
sed -i '' "/import { MathJaxContext, MathJax }/a\\
import { runSampleSizeSimulation } from '../../../utils/simulationUtils';
" SampleSizeSimulation.jsx

# Update BootstrapSimulation.jsx
echo "Updating BootstrapSimulation.jsx..."
# Add import after the MathJax import (or axios if MathJax doesn't exist)
if grep -q "MathJax" BootstrapSimulation.jsx; then
  sed -i '' "/import.*MathJax/a\\
import { runBootstrapSimulation } from '../../../utils/simulationUtils';
" BootstrapSimulation.jsx
else
  sed -i '' "/import.*recharts/a\\
import { runBootstrapSimulation } from '../../../utils/simulationUtils';
" BootstrapSimulation.jsx
fi

# For simulations that don't have their specific functions yet, let them use coverage simulation
echo "Updating TransformationSimulation.jsx..."
if grep -q "MathJax" TransformationSimulation.jsx; then
  sed -i '' "/import.*MathJax/a\\
import { runCoverageSimulation } from '../../../utils/simulationUtils';
" TransformationSimulation.jsx
else
  sed -i '' "/import.*recharts/a\\
import { runCoverageSimulation } from '../../../utils/simulationUtils';
" TransformationSimulation.jsx
fi

echo "Updating NonNormalitySimulation.jsx..."
if grep -q "MathJax" NonNormalitySimulation.jsx; then
  sed -i '' "/import.*MathJax/a\\
import { runCoverageSimulation } from '../../../utils/simulationUtils';
" NonNormalitySimulation.jsx
else
  sed -i '' "/import.*recharts/a\\
import { runCoverageSimulation } from '../../../utils/simulationUtils';
" NonNormalitySimulation.jsx
fi

echo "Simulation files updated with imports!"
