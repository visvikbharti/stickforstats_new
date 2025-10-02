import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Box, 
  Paper, 
  Tabs, 
  Tab, 
  Grid, 
  Card, 
  CardContent, 
  CardMedia, 
  CardActionArea, 
  Divider, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  Surface,
  Contour
} from 'recharts';
import { MathJax, MathJaxContext } from 'better-react-mathjax';

// MathJax configuration for mathematical notation
const mathJaxConfig = {
  loader: { load: ["[tex]/html"] },
  tex: {
    packages: { "[+]": ["html"] },
    inlineMath: [["$", "$"]],
    displayMath: [["$$", "$$"]]
  }
};

/**
 * DesignTypes - Component for DOE design types
 * 
 * This component presents the different types of experimental designs used in DOE
 * with visualizations, explanations, and examples from biotechnology.
 */
function DesignTypes({ content }) {
  const [tabIndex, setTabIndex] = useState(0);
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [visualizationData, setVisualizationData] = useState(null);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabIndex(newValue);
    setSelectedDesign(null); // Reset selected design when changing tabs
  };

  // Handle design selection
  const handleDesignSelect = (designType) => {
    setSelectedDesign(designType);
    // Generate visualization data based on selected design
    setVisualizationData(generateVisualizationData(designType));
  };

  // Generate visualization data for different design types
  const generateVisualizationData = (designType) => {
    switch (designType) {
      case 'factorial':
        return generateFactorialData();
      case 'fractional':
        return generateFractionalData();
      case 'plackett-burman':
        return generatePlackettBurmanData();
      case 'central-composite':
        return generateCentralCompositeData();
      case 'box-behnken':
        return generateBoxBehnkenData();
      case 'definitive-screening':
        return generateDefinitiveScreeningData();
      case 'd-optimal':
        return generateDOptimalData();
      case 'mixture':
        return generateMixtureData();
      case 'latin-square':
        return generateLatinSquareData();
      case 'split-plot':
        return generateSplitPlotData();
      default:
        return null;
    }
  };

  // Data generation functions for each design type
  const generateFactorialData = () => {
    // 2^2 factorial design visualization
    const designMatrix = [
      { factor1: -1, factor2: -1, response: 30 },
      { factor1: 1, factor2: -1, response: 45 },
      { factor1: -1, factor2: 1, response: 50 },
      { factor1: 1, factor2: 1, response: 85 }
    ];
    
    // Response surface data
    const gridSize = 10;
    const surfaceData = [];
    
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const x = -1 + (2 * i / (gridSize - 1));
        const y = -1 + (2 * j / (gridSize - 1));
        
        // Simple response surface model: y = 52.5 + 12.5*x1 + 15*x2 + 5*x1*x2
        const z = 52.5 + 12.5 * x + 15 * y + 5 * x * y;
        
        surfaceData.push({ x, y, z });
      }
    }
    
    // Explanation and examples
    const explanation = `
      A full factorial design evaluates all possible combinations of factor levels. With k factors each at 2 levels,
      this requires 2^k experimental runs. This design allows estimation of all main effects and interactions.
      
      In this example, we have a 2^2 factorial design with factors at (-1,1) levels:
      - Factor 1 (x₁): Temperature (low, high)
      - Factor 2 (x₂): pH (low, high)
      
      The resulting model is: y = 52.5 + 12.5x₁ + 15x₂ + 5x₁x₂
      
      Note the interaction term (x₁x₂), which indicates that the effect of temperature depends on pH level and vice versa.
    `;
    
    const biotechExample = `
      In a bioprocess optimization study, a 2^3 factorial design was used to optimize recombinant protein expression in E. coli:
      
      Factors:
      - Temperature (30°C vs. 37°C)
      - IPTG concentration (0.1mM vs. 1mM)
      - Media composition (standard vs. enriched)
      
      The design revealed significant interaction between temperature and IPTG concentration,
      showing that optimal induction concentration depended on the growth temperature.
    `;
    
    return {
      designMatrix,
      surfaceData,
      explanation,
      biotechExample,
      key: 'factorial'
    };
  };
  
  const generateFractionalData = () => {
    // 2^3-1 fractional factorial design
    const designMatrix = [
      { factor1: -1, factor2: -1, factor3: -1, response: 30 },
      { factor1: 1, factor2: -1, factor3: 1, response: 65 },
      { factor1: -1, factor2: 1, factor3: 1, response: 60 },
      { factor1: 1, factor2: 1, factor3: -1, response: 45 }
    ];
    
    // Aliasing structure visual representation
    const aliasing = [
      { effect: 'A', aliasedWith: 'BC' },
      { effect: 'B', aliasedWith: 'AC' },
      { effect: 'C', aliasedWith: 'AB' }
    ];
    
    const explanation = `
      Fractional factorial designs use a subset of runs from a full factorial design. A 2^(k-p) design uses
      2^k factorial design with only 2^(k-p) runs, where p is the number of independent generators.
      
      This example shows a 2^(3-1) design with defining relation I = ABC (Resolution III),
      which means each main effect is confounded with a two-factor interaction:
      - A is confounded with BC
      - B is confounded with AC
      - C is confounded with AB
      
      These designs are useful for screening many factors when resources are limited and higher-order
      interactions are assumed negligible.
    `;
    
    const biotechExample = `
      In a CHO cell culture media optimization study, researchers investigated 7 media components using
      a 2^(7-4) fractional factorial design (Resolution III) with 8 runs:
      
      Factors:
      - Glucose concentration
      - Glutamine concentration
      - Serum percentage
      - Growth factor concentration
      - Amino acid mixture
      - Vitamin concentration
      - Trace elements concentration
      
      This screening design identified glucose, glutamine, and growth factors as the critical factors,
      which were then optimized in a subsequent full factorial experiment.
    `;
    
    return {
      designMatrix,
      aliasing,
      explanation,
      biotechExample,
      key: 'fractional'
    };
  };
  
  const generatePlackettBurmanData = () => {
    // Plackett-Burman design for 7 factors in 8 runs
    const designMatrix = [
      { run: 1, factors: [1, 1, 1, -1, 1, -1, -1], response: 52 },
      { run: 2, factors: [1, -1, 1, 1, -1, 1, -1], response: 45 },
      { run: 3, factors: [1, 1, -1, 1, 1, -1, 1], response: 65 },
      { run: 4, factors: [1, -1, 1, -1, -1, -1, 1], response: 40 },
      { run: 5, factors: [-1, 1, -1, 1, -1, -1, -1], response: 35 },
      { run: 6, factors: [-1, -1, 1, -1, 1, -1, 1], response: 48 },
      { run: 7, factors: [-1, 1, -1, -1, -1, 1, 1], response: 52 },
      { run: 8, factors: [-1, -1, -1, -1, -1, -1, -1], response: 30 }
    ];
    
    // Effect estimates
    const effects = [
      { factor: 'Factor 1', effect: 12.5 },
      { factor: 'Factor 2', effect: 8.0 },
      { factor: 'Factor 3', effect: 10.5 },
      { factor: 'Factor 4', effect: 4.2 },
      { factor: 'Factor 5', effect: 7.8 },
      { factor: 'Factor 6', effect: -2.1 },
      { factor: 'Factor 7', effect: 9.6 }
    ];
    
    const explanation = `
      Plackett-Burman designs are highly fractionated factorial designs used for screening many factors
      with few runs. They are Resolution III designs where main effects are confounded with two-factor
      interactions.
      
      Plackett-Burman designs exist for run numbers that are multiples of 4 (8, 12, 16, 20, etc.).
      They're especially efficient for initial screening of many factors (up to N-1 factors in N runs).
      
      This example shows a Plackett-Burman design for screening 7 factors in only 8 runs,
      allowing identification of the most significant main effects.
    `;
    
    const biotechExample = `
      In a monoclonal antibody purification process development, a Plackett-Burman design
      was used to screen 11 chromatography parameters in 12 runs:
      
      Factors included:
      - Buffer pH
      - Buffer molarity
      - Flow rate
      - Load density
      - Wash volume
      - Elution gradient slope
      - Column temperature
      - Sample concentration
      - Additive concentration
      - Contact time
      - Sample preparation method
      
      The design efficiently identified that buffer pH, load density, and elution gradient 
      had the greatest impact on antibody purity and yield.
    `;
    
    return {
      designMatrix,
      effects,
      explanation,
      biotechExample,
      key: 'plackett-burman'
    };
  };
  
  const generateCentralCompositeData = () => {
    // CCD design points for 2 factors
    const designMatrix = [
      // Factorial portion
      { x: -1, y: -1, type: 'factorial', response: 30 },
      { x: 1, y: -1, type: 'factorial', response: 45 },
      { x: -1, y: 1, type: 'factorial', response: 50 },
      { x: 1, y: 1, type: 'factorial', response: 65 },
      // Star points
      { x: -1.414, y: 0, type: 'star', response: 42 },
      { x: 1.414, y: 0, type: 'star', response: 52 },
      { x: 0, y: -1.414, type: 'star', response: 38 },
      { x: 0, y: 1.414, type: 'star', response: 56 },
      // Center point
      { x: 0, y: 0, type: 'center', response: 75 }
    ];
    
    // Response surface data for visualization
    const gridSize = 20;
    const surfaceData = [];
    
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const x = -1.5 + (3 * i / (gridSize - 1));
        const y = -1.5 + (3 * j / (gridSize - 1));
        
        // Quadratic response surface
        const z = 75 - 10 * (x*x) - 8 * (y*y) + 5 * x + 9 * y + 3 * x * y;
        
        surfaceData.push({ x, y, z });
      }
    }
    
    const explanation = `
      Central Composite Designs (CCD) extend factorial designs to enable estimation of quadratic effects
      and to model curved response surfaces. A CCD consists of:
      
      1. A factorial design (2^k runs)
      2. Star points (2k runs) at distance α from center
      3. Center points (n_c runs, typically 3-5)
      
      This allows fitting a second-order model:
      y = β₀ + Σβᵢxᵢ + Σβᵢᵢxᵢxᵢ + ΣΣβᵢⱼxᵢxⱼ
      
      CCDs are the most commonly used response surface designs in biotechnology, enabling optimization
      by finding maxima, minima, or saddle points in the response surface.
    `;
    
    const biotechExample = `
      In a bioreactor optimization study for therapeutic protein production, a central composite design
      was used to optimize three critical process parameters:
      
      Factors:
      - Dissolved oxygen (20-60%)
      - pH (6.8-7.4)
      - Temperature (32-38°C)
      
      The design included 8 factorial runs, 6 star points (α=1.68), and 6 center points.
      
      Analysis revealed a quadratic effect of temperature with optimal production at 35.2°C,
      and significant interaction between dissolved oxygen and pH. The optimized conditions
      increased protein yield by 42% compared to baseline.
    `;
    
    return {
      designMatrix,
      surfaceData,
      explanation,
      biotechExample,
      key: 'central-composite'
    };
  };
  
  const generateBoxBehnkenData = () => {
    // Box-Behnken design for 3 factors
    const designMatrix = [
      // Factor combinations (edges of cube)
      { x: -1, y: -1, z: 0, response: 35 },
      { x: 1, y: -1, z: 0, response: 42 },
      { x: -1, y: 1, z: 0, response: 40 },
      { x: 1, y: 1, z: 0, response: 52 },
      
      { x: -1, y: 0, z: -1, response: 30 },
      { x: 1, y: 0, z: -1, response: 45 },
      { x: -1, y: 0, z: 1, response: 48 },
      { x: 1, y: 0, z: 1, response: 65 },
      
      { x: 0, y: -1, z: -1, response: 38 },
      { x: 0, y: 1, z: -1, response: 44 },
      { x: 0, y: -1, z: 1, response: 53 },
      { x: 0, y: 1, z: 1, response: 70 },
      
      // Center points
      { x: 0, y: 0, z: 0, response: 59 },
      { x: 0, y: 0, z: 0, response: 57 },
      { x: 0, y: 0, z: 0, response: 61 }
    ];
    
    // Visual demonstration points
    const visualPoints = [];
    
    // Edge points of cube for visualization
    for (let i = -1; i <= 1; i += 2) {
      for (let j = -1; j <= 1; j += 2) {
        for (let k = -1; k <= 1; k += 2) {
          visualPoints.push({ x: i, y: j, z: k, type: 'corner' });
        }
      }
    }
    
    // Add design points
    designMatrix.forEach(point => {
      visualPoints.push({
        x: point.x,
        y: point.y,
        z: point.z,
        type: point.x === 0 && point.y === 0 && point.z === 0 ? 'center' : 'design'
      });
    });
    
    const explanation = `
      Box-Behnken designs are response surface designs that don't contain factorial or fractional
      factorial designs. They are formed by combining 2-level factorial designs with incomplete block designs.
      
      Key properties:
      
      1. All design points are on a sphere with radius √2
      2. Requires 3 levels for each factor
      3. Contains no points at the vertices of the cube (unlike CCD)
      4. Rotatable designs
      5. Typically requires fewer runs than CCDs for 3-5 factors
      
      Box-Behnken designs allow estimation of all quadratic effects and two-factor interactions,
      making them suitable for response surface optimization where corner conditions are either
      impossible or should be avoided.
    `;
    
    const biotechExample = `
      In an enzymatic hydrolysis optimization for a biofuel production process, researchers used
      a Box-Behnken design to optimize three critical parameters:
      
      Factors:
      - Enzyme loading (10-30 FPU/g)
      - Substrate concentration (5-15%)
      - Reaction time (24-72 hours)
      
      The design required only 15 runs (12 design points + 3 center points) compared to
      20 runs that would be needed for a rotatable CCD.
      
      The analysis revealed that reaction time had both linear and quadratic effects, while
      enzyme loading had strong interaction with substrate concentration. Optimal conditions
      were determined to be 24 FPU/g enzyme, 8% substrate, and 60 hours reaction time.
    `;
    
    return {
      designMatrix,
      visualPoints,
      explanation,
      biotechExample,
      key: 'box-behnken'
    };
  };
  
  const generateDefinitiveScreeningData = () => {
    // Definitive Screening Design for 5 factors
    const designMatrix = [
      { run: 1, factors: [0, -1, 1, -1, 1], response: 45 },
      { run: 2, factors: [0, 1, -1, 1, -1], response: 39 },
      { run: 3, factors: [1, 0, -1, -1, 1], response: 52 },
      { run: 4, factors: [-1, 0, 1, 1, -1], response: 38 },
      { run: 5, factors: [1, 1, 0, -1, -1], response: 48 },
      { run: 6, factors: [-1, -1, 0, 1, 1], response: 42 },
      { run: 7, factors: [1, -1, -1, 0, -1], response: 40 },
      { run: 8, factors: [-1, 1, 1, 0, 1], response: 55 },
      { run: 9, factors: [1, 1, 1, 1, 0], response: 65 },
      { run: 10, factors: [-1, -1, -1, -1, 0], response: 30 },
      { run: 11, factors: [0, 0, 0, 0, 0], response: 47 }
    ];
    
    const explanation = `
      Definitive Screening Designs (DSDs) were introduced by Jones and Nachtsheim in 2011 as an
      efficient design for screening and optimization in a single experiment.
      
      Key properties:
      
      1. For m factors, requires only 2m+1 runs (or 2m+3 with center point replication)
      2. Main effects are orthogonal to two-factor interactions
      3. Two-factor interactions are not completely confounded with each other
      4. Can estimate quadratic effects for all factors
      5. Each run has at most one factor at its zero level
      
      DSDs are more efficient than traditional screening designs while providing
      more information about the response surface. They are particularly valuable when
      experimental runs are expensive or time-consuming.
    `;
    
    const biotechExample = `
      In a viral vector production process development, a definitive screening design was used
      to simultaneously screen and optimize 6 critical process parameters:
      
      Factors:
      - Cell density at transfection
      - Transfection reagent concentration
      - DNA:reagent ratio
      - Harvest time
      - Temperature shift
      - Medium osmolality
      
      The design required only 13 experimental runs plus 3 center points.
      
      Analysis revealed quadratic effects for cell density and harvest time, and significant
      interaction between transfection reagent concentration and DNA:reagent ratio.
      
      The DSD efficiently identified optimal conditions that increased viral titer by 3.5-fold,
      without needing a separate optimization experiment after the initial screening.
    `;
    
    return {
      designMatrix,
      explanation,
      biotechExample,
      key: 'definitive-screening'
    };
  };
  
  const generateDOptimalData = () => {
    // Example D-optimal design for a constrained experimental space
    const designMatrix = [
      { x: 0.2, y: 0.1, constraint: 'within', response: 42 },
      { x: 0.8, y: 0.1, constraint: 'within', response: 56 },
      { x: 0.2, y: 0.7, constraint: 'within', response: 61 },
      { x: 0.5, y: 0.4, constraint: 'within', response: 75 },
      { x: 0.5, y: 0.1, constraint: 'within', response: 59 },
      { x: 0.2, y: 0.4, constraint: 'within', response: 63 },
      { x: 0.5, y: 0.7, constraint: 'within', response: 82 },
      { x: 0.8, y: 0.4, constraint: 'within', response: 70 },
      { x: 0.8, y: 0.7, constraint: 'within', response: 77 }
    ];
    
    // Constrained experimental space visualization
    const constraintBoundary = [
      { x: 0.0, y: 0.0 },
      { x: 1.0, y: 0.0 },
      { x: 1.0, y: 0.8 },
      { x: 0.0, y: 0.8 },
      { x: 0.0, y: 0.0 }
    ];
    
    // Points outside feasible region
    const excludedPoints = [
      { x: 0.3, y: 0.9, constraint: 'outside' },
      { x: 0.7, y: 0.9, constraint: 'outside' }
    ];
    
    const explanation = `
      D-optimal designs are computer-generated designs that maximize the determinant of the information
      matrix (X'X), which minimizes the generalized variance of the parameter estimates.
      
      Key advantages:
      
      1. Can handle irregular experimental regions or constraints
      2. Flexible with any number of runs (not restricted to powers of 2)
      3. Can accommodate both continuous and categorical factors
      4. Allows custom model specification
      5. Efficient for odd numbers of factors or special model requirements
      
      D-optimal designs are particularly valuable in bioprocessing where certain factor combinations
      may be infeasible or when augmenting existing designs with new runs.
    `;
    
    const biotechExample = `
      In a lipid nanoparticle formulation study for mRNA delivery, researchers faced multiple constraints:
      
      - Lipid ratios had to sum to a constant
      - Certain lipid combinations were incompatible
      - Particle size had to remain below 200 nm
      
      A D-optimal design with 15 runs was created to explore the constrained experimental space,
      with factors including:
      
      - Ionizable lipid percentage
      - Cholesterol content
      - Helper lipid ratio
      - PEG-lipid concentration
      - Buffer pH
      
      The design efficiently mapped the feasible region and identified optimal formulation conditions
      that maximized transfection efficiency while maintaining particle stability and size requirements.
    `;
    
    return {
      designMatrix,
      constraintBoundary,
      excludedPoints,
      explanation,
      biotechExample,
      key: 'd-optimal'
    };
  };
  
  const generateMixtureData = () => {
    // Simplex lattice design points
    const designMatrix = [
      { x1: 1.0, x2: 0.0, x3: 0.0, response: 45 },
      { x1: 0.0, x2: 1.0, x3: 0.0, response: 60 },
      { x1: 0.0, x2: 0.0, x3: 1.0, response: 30 },
      { x1: 0.5, x2: 0.5, x3: 0.0, response: 75 },
      { x1: 0.5, x2: 0.0, x3: 0.5, response: 55 },
      { x1: 0.0, x2: 0.5, x3: 0.5, response: 65 },
      { x1: 0.33, x2: 0.33, x3: 0.33, response: 82 }
    ];
    
    // Ternary contour data for visualization
    const contourData = [];
    const gridSize = 10;
    
    for (let i = 0; i <= gridSize; i++) {
      for (let j = 0; j <= gridSize - i; j++) {
        const x1 = i / gridSize;
        const x2 = j / gridSize;
        const x3 = 1 - x1 - x2;
        
        if (x3 >= 0) {
          // Example mixture model
          const response = 45*x1 + 60*x2 + 30*x3 + 120*x1*x2 + 70*x1*x3 + 80*x2*x3;
          contourData.push({ x1, x2, x3, response });
        }
      }
    }
    
    const explanation = `
      Mixture designs are specialized designs where the factors are components of a mixture and
      their sum equals a constant (typically 1 or 100%). The standard factorial designs are not
      appropriate because the factors are not independent.
      
      Common mixture designs include:
      
      1. Simplex Lattice: Equally spaced points on simplex, good for fitting canonical mixture models
      2. Simplex Centroid: Includes all vertices, edge centers, face centers, and overall centroid
      3. Extreme Vertices: Used when there are constraints on component proportions
      
      Mixture designs use the Scheffé canonical polynomials for modeling, which differ from standard
      factorial models by not including an intercept term:
      
      Linear: y = ∑βᵢxᵢ
      Quadratic: y = ∑βᵢxᵢ + ∑∑βᵢⱼxᵢxⱼ
    `;
    
    const biotechExample = `
      In a cell culture media optimization study, researchers used a mixture design to optimize
      the amino acid composition for CHO cell growth and protein production:
      
      Components (constrained to sum to 100%):
      - Essential amino acids mixture
      - Non-essential amino acids mixture
      - Vitamins mixture
      - Lipids and fatty acids
      - Carbohydrates
      
      The design included vertices, edge points, and interior points with additional constraints
      that essential amino acids must be at least 20% of the mixture.
      
      Analysis revealed significant synergistic interaction between essential amino acids and
      lipids, leading to a novel media formulation that increased cell density by 40% and
      protein productivity by 25%.
    `;
    
    return {
      designMatrix,
      contourData,
      explanation,
      biotechExample,
      key: 'mixture'
    };
  };
  
  const generateLatinSquareData = () => {
    // 4×4 Latin Square design
    const latinSquare = [
      ['A', 'B', 'C', 'D'],
      ['B', 'C', 'D', 'A'],
      ['C', 'D', 'A', 'B'],
      ['D', 'A', 'B', 'C']
    ];
    
    // Response data
    const responseData = [
      { row: 1, col: 1, treatment: 'A', response: 45 },
      { row: 1, col: 2, treatment: 'B', response: 52 },
      { row: 1, col: 3, treatment: 'C', response: 48 },
      { row: 1, col: 4, treatment: 'D', response: 39 },
      { row: 2, col: 1, treatment: 'B', response: 55 },
      { row: 2, col: 2, treatment: 'C', response: 50 },
      { row: 2, col: 3, treatment: 'D', response: 42 },
      { row: 2, col: 4, treatment: 'A', response: 47 },
      { row: 3, col: 1, treatment: 'C', response: 49 },
      { row: 3, col: 2, treatment: 'D', response: 41 },
      { row: 3, col: 3, treatment: 'A', response: 46 },
      { row: 3, col: 4, treatment: 'B', response: 54 },
      { row: 4, col: 1, treatment: 'D', response: 40 },
      { row: 4, col: 2, treatment: 'A', response: 44 },
      { row: 4, col: 3, treatment: 'B', response: 53 },
      { row: 4, col: 4, treatment: 'C', response: 51 }
    ];
    
    const explanation = `
      Latin Square designs are used to control two sources of nuisance variation (blocking factors)
      while studying the effect of a treatment. In a Latin Square:
      
      1. Each treatment appears exactly once in each row
      2. Each treatment appears exactly once in each column
      
      The design is called a "Latin Square" because traditionally Latin letters are used to represent treatments.
      
      Latin Square designs are particularly useful when:
      - Two blocking factors need to be controlled
      - The blocking factors are crossed (all combinations occur)
      - Resources limit the ability to use a complete factorial design
      
      The model for a Latin Square design is:
      
      yᵢⱼₖ = μ + ρᵢ + γⱼ + τₖ + εᵢⱼₖ
      
      Where ρᵢ is the row effect, γⱼ is the column effect, and τₖ is the treatment effect.
    `;
    
    const biotechExample = `
      In a plant-based vaccine production study, researchers used a Latin Square design
      to evaluate four different promoter constructs (A, B, C, D) while controlling for:
      
      - Row blocking factor: Growth chamber position (4 shelves with light/temperature gradient)
      - Column blocking factor: Plant age at infiltration (4 different age groups)
      
      The Latin Square design efficiently controlled both nuisance variables with only 16 experimental units,
      allowing clear identification of the most effective promoter (B) for protein expression,
      which increased target antigen yield by 62% relative to the standard promoter.
    `;
    
    return {
      latinSquare,
      responseData,
      explanation,
      biotechExample,
      key: 'latin-square'
    };
  };
  
  const generateSplitPlotData = () => {
    // Split-plot design structure
    const designData = {
      wholePlots: [
        {
          wp_factor: 'Temperature Low',
          subplots: [
            { sp_factor1: 'pH Low', sp_factor2: 'Stirring Low', response: 30 },
            { sp_factor1: 'pH Low', sp_factor2: 'Stirring High', response: 42 },
            { sp_factor1: 'pH High', sp_factor2: 'Stirring Low', response: 45 },
            { sp_factor1: 'pH High', sp_factor2: 'Stirring High', response: 55 }
          ]
        },
        {
          wp_factor: 'Temperature High',
          subplots: [
            { sp_factor1: 'pH Low', sp_factor2: 'Stirring Low', response: 35 },
            { sp_factor1: 'pH Low', sp_factor2: 'Stirring High', response: 50 },
            { sp_factor1: 'pH High', sp_factor2: 'Stirring Low', response: 48 },
            { sp_factor1: 'pH High', sp_factor2: 'Stirring High', response: 65 }
          ]
        }
      ]
    };
    
    const explanation = `
      Split-plot designs are used when some factors are harder to change than others. In a split-plot design:
      
      1. Whole-plot factors: Hard-to-change factors assigned to whole plots
      2. Subplot factors: Easy-to-change factors assigned to subplots within whole plots
      
      This creates a hierarchical structure with two error terms:
      
      1. Whole-plot error: Used for testing whole-plot factor effects
      2. Subplot error: Used for testing subplot factor effects and interactions
      
      Split-plot designs are common in bioprocessing where factors like temperature or equipment
      setup are difficult to change between runs, while factors like pH or reagent concentrations
      can be easily changed.
    `;
    
    const biotechExample = `
      In a bioreactor scale-up study, researchers used a split-plot design to investigate process parameters:
      
      Whole-plot factors (hard to change):
      - Bioreactor size (2L vs. 10L vs. 50L)
      - Impeller design (Rushton vs. Marine)
      
      Subplot factors (easy to change):
      - Dissolved oxygen control setpoint
      - Agitation rate
      - Nutrient feed strategy
      
      The split-plot structure reflected operational constraints, as changing bioreactors or impellers
      required significant setup time, while other parameters could be easily adjusted between runs.
      
      Analysis correctly accounted for the split-plot error structure, enabling proper significance testing
      of scale-dependent effects and identification of robust operating conditions across scales.
    `;
    
    return {
      designData,
      explanation,
      biotechExample,
      key: 'split-plot'
    };
  };

  // Handle image error
  const handleImageError = (e) => {
    e.target.src = '/static/images/placeholder.png';
  };

  // Available design types
  const designTypes = [
    {
      id: 'factorial',
      name: 'Full Factorial Designs',
      description: 'Evaluate all combinations of factor levels to estimate all main effects and interactions',
      imageUrl: '/static/images/doe/factorial_design.png'
    },
    {
      id: 'fractional',
      name: 'Fractional Factorial Designs',
      description: 'Use a fraction of the full factorial runs with controlled aliasing pattern',
      imageUrl: '/static/images/doe/fractional_factorial.png'
    },
    {
      id: 'plackett-burman',
      name: 'Plackett-Burman Designs',
      description: 'Highly fractionated designs for screening many factors with few runs',
      imageUrl: '/static/images/doe/plackett_burman.png'
    },
    {
      id: 'central-composite',
      name: 'Central Composite Designs',
      description: 'Response surface designs with factorial, star, and center points',
      imageUrl: '/static/images/doe/central_composite.png'
    },
    {
      id: 'box-behnken',
      name: 'Box-Behnken Designs',
      description: 'Response surface designs with points on edges of hypercube (no vertices)',
      imageUrl: '/static/images/doe/box_behnken.png'
    },
    {
      id: 'definitive-screening',
      name: 'Definitive Screening Designs',
      description: 'Efficient designs for simultaneous screening and optimization',
      imageUrl: '/static/images/doe/definitive_screening.png'
    },
    {
      id: 'd-optimal',
      name: 'D-Optimal Designs',
      description: 'Computer-generated designs optimized for precision in constrained experimental regions',
      imageUrl: '/static/images/doe/d_optimal.png'
    },
    {
      id: 'mixture',
      name: 'Mixture Designs',
      description: 'Special designs for component proportions that must sum to a constant',
      imageUrl: '/static/images/doe/mixture_design.png'
    },
    {
      id: 'latin-square',
      name: 'Latin Square Designs',
      description: 'Control two sources of nuisance variation while studying treatments',
      imageUrl: '/static/images/doe/latin_square.png'
    },
    {
      id: 'split-plot',
      name: 'Split-Plot Designs',
      description: 'Hierarchical designs for when some factors are harder to change than others',
      imageUrl: '/static/images/doe/split_plot.png'
    }
  ];

  // Render design visualization based on design type and data
  const renderDesignVisualization = () => {
    if (!visualizationData) return null;
    
    switch (visualizationData.key) {
      case 'factorial':
        return (
          <Box>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Design Matrix</Typography>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <thead>
                      <tr>
                        <th>Run</th>
                        <th>Factor 1</th>
                        <th>Factor 2</th>
                        <th>Response</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visualizationData.designMatrix.map((point, index) => (
                        <tr key={index}>
                          <td>{index + 1}</td>
                          <td>{point.factor1 === -1 ? 'Low' : 'High'}</td>
                          <td>{point.factor2 === -1 ? 'Low' : 'High'}</td>
                          <td>{point.response}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </TableContainer>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Response Surface</Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart
                      margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                    >
                      <CartesianGrid />
                      <XAxis 
                        type="number" 
                        dataKey="x" 
                        name="Factor 1" 
                        domain={[-1.2, 1.2]}
                        label={{ value: 'Factor 1', position: 'insideBottom', offset: -5 }}
                      />
                      <YAxis 
                        type="number" 
                        dataKey="y" 
                        name="Factor 2" 
                        domain={[-1.2, 1.2]}
                        label={{ value: 'Factor 2', angle: -90, position: 'insideLeft' }}
                      />
                      <ZAxis 
                        type="number" 
                        dataKey="z" 
                        range={[50, 400]} 
                        name="Response" 
                      />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        formatter={(value, name) => [value.toFixed(2), name]}
                      />
                      <Scatter 
                        name="Design Points" 
                        data={visualizationData.designMatrix.map(point => ({ 
                          x: point.factor1, 
                          y: point.factor2, 
                          z: point.response 
                        }))} 
                        fill="#8884d8"
                        shape="square"
                      />
                      <Scatter 
                        name="Surface" 
                        data={visualizationData.surfaceData} 
                        fill="#82ca9d"
                        opacity={0.3}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </Box>
              </Grid>
            </Grid>
          </Box>
        );
        
      case 'fractional':
        return (
          <Box>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Design Matrix (2³⁻¹)</Typography>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <thead>
                      <tr>
                        <th>Run</th>
                        <th>Factor 1</th>
                        <th>Factor 2</th>
                        <th>Factor 3</th>
                        <th>Response</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visualizationData.designMatrix.map((point, index) => (
                        <tr key={index}>
                          <td>{index + 1}</td>
                          <td>{point.factor1 === -1 ? 'Low' : 'High'}</td>
                          <td>{point.factor2 === -1 ? 'Low' : 'High'}</td>
                          <td>{point.factor3 === -1 ? 'Low' : 'High'}</td>
                          <td>{point.response}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </TableContainer>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Aliasing Structure</Typography>
                <List>
                  {visualizationData.aliasing.map((item, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <ArrowRightIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary={`${item.effect} is confounded with ${item.aliasedWith}`}
                      />
                    </ListItem>
                  ))}
                </List>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                  Defining Relation: I = ABC (Resolution III)
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    This means that in a 2³⁻¹ design, you can estimate all main effects,
                    but they are confounded with two-factor interactions. For example, the
                    estimated effect of A also includes the effect of BC.
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        );
        
      case 'central-composite':
        return (
          <Box>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Central Composite Design Points</Typography>
                <Box sx={{ height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart
                      margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                    >
                      <CartesianGrid />
                      <XAxis 
                        type="number" 
                        dataKey="x" 
                        name="Factor 1" 
                        domain={[-1.6, 1.6]}
                        label={{ value: 'Factor 1', position: 'insideBottom', offset: -5 }}
                      />
                      <YAxis 
                        type="number" 
                        dataKey="y" 
                        name="Factor 2" 
                        domain={[-1.6, 1.6]}
                        label={{ value: 'Factor 2', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        formatter={(value, name) => [value.toFixed(2), name]}
                      />
                      <Legend />
                      <Scatter 
                        name="Factorial Points" 
                        data={visualizationData.designMatrix.filter(p => p.type === 'factorial')} 
                        fill="#8884d8"
                        shape="square"
                      />
                      <Scatter 
                        name="Star Points" 
                        data={visualizationData.designMatrix.filter(p => p.type === 'star')} 
                        fill="#ff7300"
                        shape="triangle"
                      />
                      <Scatter 
                        name="Center Point" 
                        data={visualizationData.designMatrix.filter(p => p.type === 'center')} 
                        fill="#82ca9d"
                        shape="circle"
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>CCD Structure</Typography>
                <List>
                  <ListItem>
                    <ListItemIcon><ArrowRightIcon /></ListItemIcon>
                    <ListItemText primary="Factorial points: 2ᵏ runs (corners of hypercube)" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><ArrowRightIcon /></ListItemIcon>
                    <ListItemText primary="Star points: 2k runs (axial points at ±α)" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><ArrowRightIcon /></ListItemIcon>
                    <ListItemText primary="Center points: nc runs (usually 3-6 replicates)" />
                  </ListItem>
                </List>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>
                  Choice of α determines design properties:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary="α = 1: Face-centered design (easier to run)" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary={`α = √k: Rotatable design (equal prediction variance)`} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="α = k^(1/4): Orthogonal design" />
                  </ListItem>
                </List>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>
                  CCD enables fitting second-order model:
                </Typography>
                <Box sx={{ my: 2, display: 'flex', justifyContent: 'center' }}>
                  <MathJaxContext config={mathJaxConfig}>
                    <MathJax>{"$$y = \\beta_0 + \\sum_{i=1}^{k}\\beta_i x_i + \\sum_{i=1}^{k}\\beta_{ii}x_i^2 + \\sum_{i<j}^{k}\\beta_{ij}x_i x_j + \\varepsilon$$"}</MathJax>
                  </MathJaxContext>
                </Box>
              </Grid>
            </Grid>
          </Box>
        );
        
      // Other cases for other design types would be implemented here
        
      default:
        return (
          <Box sx={{ p: 2 }}>
            <Typography>
              Select a design type to view its visualization and properties.
            </Typography>
          </Box>
        );
    }
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Design Types in DOE
      </Typography>
      
      <Typography paragraph>
        This section presents different experimental designs used in biotechnology applications,
        their properties, and appropriate use cases.
      </Typography>
      
      <Paper sx={{ mb: 4 }}>
        <Tabs 
          value={tabIndex} 
          onChange={handleTabChange} 
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Design Selection Guide" />
          <Tab label="Screening Designs" />
          <Tab label="Response Surface Designs" />
          <Tab label="Specialized Designs" />
        </Tabs>
        
        {/* Tab 1: Design Selection Guide */}
        {tabIndex === 0 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Design Selection Guide
            </Typography>
            
            <Typography paragraph>
              Selecting the appropriate experimental design is crucial for efficiently extracting
              maximum information from your biotechnology experiments. This guide will help you
              choose the right design based on your research objectives and constraints.
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Step 1: Define Your Objective</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List>
                    <ListItem>
                      <ListItemIcon><ArrowRightIcon /></ListItemIcon>
                      <ListItemText 
                        primary="Screening/Characterization" 
                        secondary="Identify significant factors among many possibilities" 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><ArrowRightIcon /></ListItemIcon>
                      <ListItemText 
                        primary="Optimization" 
                        secondary="Find factor settings that maximize/minimize responses" 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><ArrowRightIcon /></ListItemIcon>
                      <ListItemText 
                        primary="Robustness Testing" 
                        secondary="Evaluate sensitivity to factor variations" 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><ArrowRightIcon /></ListItemIcon>
                      <ListItemText 
                        primary="Mechanistic Understanding" 
                        secondary="Build detailed models to understand underlying mechanisms" 
                      />
                    </ListItem>
                  </List>
                </AccordionDetails>
              </Accordion>
              
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Step 2: Assess Experimental Constraints</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List>
                    <ListItem>
                      <ListItemIcon><ArrowRightIcon /></ListItemIcon>
                      <ListItemText 
                        primary="Number of runs available" 
                        secondary="Budget, time, material constraints" 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><ArrowRightIcon /></ListItemIcon>
                      <ListItemText 
                        primary="Factor characteristics" 
                        secondary="Continuous vs. categorical, control precision, range" 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><ArrowRightIcon /></ListItemIcon>
                      <ListItemText 
                        primary="Hard-to-change factors" 
                        secondary="Factors that are difficult or time-consuming to adjust" 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><ArrowRightIcon /></ListItemIcon>
                      <ListItemText 
                        primary="Experimental region" 
                        secondary="Constraints, irregular regions, mixture constraints" 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><ArrowRightIcon /></ListItemIcon>
                      <ListItemText 
                        primary="Expected response behavior" 
                        secondary="Linear, interactions, curvature, discontinuities" 
                      />
                    </ListItem>
                  </List>
                </AccordionDetails>
              </Accordion>
              
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Step 3: Select Design Category</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>Screening Designs:</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={4}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6">Fractional Factorial</Typography>
                            <Typography variant="body2">
                              Best for: 4-8 factors, can estimate main effects and some interactions
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6">Plackett-Burman</Typography>
                            <Typography variant="body2">
                              Best for: Many factors (8+), main effects only, few runs
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6">Definitive Screening</Typography>
                            <Typography variant="body2">
                              Best for: 6-12 factors, screening and potential optimization
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>Response Surface Designs:</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={4}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6">Central Composite</Typography>
                            <Typography variant="body2">
                              Best for: 2-5 factors, comprehensive optimization with curvature
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6">Box-Behnken</Typography>
                            <Typography variant="body2">
                              Best for: 3-5 factors, when corner points are not feasible
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6">Full Factorial</Typography>
                            <Typography variant="body2">
                              Best for: 2-3 factors, complete characterization with center points
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>Specialized Designs:</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={4}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6">Mixture Designs</Typography>
                            <Typography variant="body2">
                              Best for: Components that sum to constant (formulations, media)
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6">Split-Plot</Typography>
                            <Typography variant="body2">
                              Best for: Hard-to-change factors combined with easy-to-change factors
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6">D-Optimal</Typography>
                            <Typography variant="body2">
                              Best for: Constrained regions, custom models, flexible run size
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </Box>
                </AccordionDetails>
              </Accordion>
              
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Step 4: Design Augmentation and Sequential Experimentation</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography paragraph>
                    Consider sequential experimentation strategies to maximize information while minimizing resource use:
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon><ArrowRightIcon /></ListItemIcon>
                      <ListItemText 
                        primary="Screening → Optimization Path" 
                        secondary="Start with screening design, then add runs to enable optimization (e.g., fractional factorial → central composite)" 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><ArrowRightIcon /></ListItemIcon>
                      <ListItemText 
                        primary="Response Surface Augmentation" 
                        secondary="Add axial points to factorial design to create central composite design" 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><ArrowRightIcon /></ListItemIcon>
                      <ListItemText 
                        primary="Center Point Augmentation" 
                        secondary="Add center points to check for curvature in factorial designs" 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><ArrowRightIcon /></ListItemIcon>
                      <ListItemText 
                        primary="Fold-Over Designs" 
                        secondary="Add mirror-image runs to resolve confounding in fractional factorials" 
                      />
                    </ListItem>
                  </List>
                </AccordionDetails>
              </Accordion>
            </Box>
            
            <Typography variant="h6" gutterBottom>
              Decision Flowchart for Design Selection
            </Typography>
            
            <Box 
              component="img" 
              src="/assets/images/doe/design_selection_flowchart.png"
              alt="Design Selection Flowchart"
              sx={{ width: '100%', maxWidth: 800, height: 'auto', mx: 'auto', display: 'block', my: 3 }}
            />
            
            <Typography variant="subtitle1" gutterBottom>
              Recommended Next Steps:
            </Typography>
            
            <Typography paragraph>
              Explore the specific design types in the other tabs to understand their properties,
              advantages, limitations, and biotechnology applications. Each design is explained with
              visualizations and real-world examples from biopharmaceutical and bioprocessing applications.
            </Typography>
            
            <Grid container spacing={2} justifyContent="center">
              <Grid item>
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={(e) => handleTabChange(e, 1)}
                >
                  Explore Screening Designs
                </Button>
              </Grid>
              <Grid item>
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={(e) => handleTabChange(e, 2)}
                >
                  Explore Response Surface Designs
                </Button>
              </Grid>
              <Grid item>
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={(e) => handleTabChange(e, 3)}
                >
                  Explore Specialized Designs
                </Button>
              </Grid>
            </Grid>
          </Box>
        )}
        
        {/* Tab 2: Screening Designs */}
        {tabIndex === 1 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Screening Designs
            </Typography>
            
            <Typography paragraph>
              Screening designs are used early in process development to identify significant factors
              among many possibilities, using relatively few experimental runs.
            </Typography>
            
            {/* Design cards for selection */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              {designTypes.filter(d => ['factorial', 'fractional', 'plackett-burman', 'definitive-screening'].includes(d.id)).map((design) => (
                <Grid item xs={12} sm={6} md={3} key={design.id}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer',
                      transform: selectedDesign === design.id ? 'scale(1.03)' : 'scale(1)',
                      transition: 'transform 0.3s',
                      border: selectedDesign === design.id ? '2px solid #3f51b5' : 'none'
                    }}
                    onClick={() => handleDesignSelect(design.id)}
                  >
                    <CardActionArea>
                      <CardMedia
                        component="img"
                        height="140"
                        image={design.imageUrl || '/static/images/placeholder.png'}
                        alt={design.name}
                        onError={handleImageError}
                      />
                      <CardContent>
                        <Typography variant="h6" component="div">
                          {design.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {design.description}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
            
            {/* Design visualization and explanation */}
            {selectedDesign && visualizationData && (
              <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h5" gutterBottom>
                  {designTypes.find(d => d.id === selectedDesign)?.name}
                </Typography>
                
                {renderDesignVisualization()}
                
                <Divider sx={{ my: 3 }} />
                
                <Typography variant="h6" gutterBottom>Explanation</Typography>
                <Typography paragraph sx={{ whiteSpace: 'pre-line' }}>
                  {visualizationData.explanation}
                </Typography>
                
                <Typography variant="h6" gutterBottom>Biotechnology Application Example</Typography>
                <Typography paragraph sx={{ whiteSpace: 'pre-line' }}>
                  {visualizationData.biotechExample}
                </Typography>
              </Paper>
            )}
          </Box>
        )}
        
        {/* Tab 3: Response Surface Designs */}
        {tabIndex === 2 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Response Surface Designs
            </Typography>
            
            <Typography paragraph>
              Response surface designs enable modeling of curved responses and optimization of complex processes,
              identifying optimal factor settings to maximize or minimize key responses.
            </Typography>
            
            {/* Design cards for selection */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              {designTypes.filter(d => ['factorial', 'central-composite', 'box-behnken', 'd-optimal'].includes(d.id)).map((design) => (
                <Grid item xs={12} sm={6} md={3} key={design.id}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer',
                      transform: selectedDesign === design.id ? 'scale(1.03)' : 'scale(1)',
                      transition: 'transform 0.3s',
                      border: selectedDesign === design.id ? '2px solid #3f51b5' : 'none'
                    }}
                    onClick={() => handleDesignSelect(design.id)}
                  >
                    <CardActionArea>
                      <CardMedia
                        component="img"
                        height="140"
                        image={design.imageUrl || '/static/images/placeholder.png'}
                        alt={design.name}
                        onError={handleImageError}
                      />
                      <CardContent>
                        <Typography variant="h6" component="div">
                          {design.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {design.description}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
            
            {/* Design visualization and explanation */}
            {selectedDesign && visualizationData && (
              <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h5" gutterBottom>
                  {designTypes.find(d => d.id === selectedDesign)?.name}
                </Typography>
                
                {renderDesignVisualization()}
                
                <Divider sx={{ my: 3 }} />
                
                <Typography variant="h6" gutterBottom>Explanation</Typography>
                <Typography paragraph sx={{ whiteSpace: 'pre-line' }}>
                  {visualizationData.explanation}
                </Typography>
                
                <Typography variant="h6" gutterBottom>Biotechnology Application Example</Typography>
                <Typography paragraph sx={{ whiteSpace: 'pre-line' }}>
                  {visualizationData.biotechExample}
                </Typography>
              </Paper>
            )}
          </Box>
        )}
        
        {/* Tab 4: Specialized Designs */}
        {tabIndex === 3 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Specialized Designs
            </Typography>
            
            <Typography paragraph>
              Specialized designs address specific experimental constraints and objectives common in
              biotechnology applications, such as mixture formulations and hard-to-change factors.
            </Typography>
            
            {/* Design cards for selection */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              {designTypes.filter(d => ['mixture', 'latin-square', 'split-plot', 'd-optimal'].includes(d.id)).map((design) => (
                <Grid item xs={12} sm={6} md={3} key={design.id}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer',
                      transform: selectedDesign === design.id ? 'scale(1.03)' : 'scale(1)',
                      transition: 'transform 0.3s',
                      border: selectedDesign === design.id ? '2px solid #3f51b5' : 'none'
                    }}
                    onClick={() => handleDesignSelect(design.id)}
                  >
                    <CardActionArea>
                      <CardMedia
                        component="img"
                        height="140"
                        image={design.imageUrl || '/static/images/placeholder.png'}
                        alt={design.name}
                        onError={handleImageError}
                      />
                      <CardContent>
                        <Typography variant="h6" component="div">
                          {design.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {design.description}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
            
            {/* Design visualization and explanation */}
            {selectedDesign && visualizationData && (
              <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h5" gutterBottom>
                  {designTypes.find(d => d.id === selectedDesign)?.name}
                </Typography>
                
                {renderDesignVisualization()}
                
                <Divider sx={{ my: 3 }} />
                
                <Typography variant="h6" gutterBottom>Explanation</Typography>
                <Typography paragraph sx={{ whiteSpace: 'pre-line' }}>
                  {visualizationData.explanation}
                </Typography>
                
                <Typography variant="h6" gutterBottom>Biotechnology Application Example</Typography>
                <Typography paragraph sx={{ whiteSpace: 'pre-line' }}>
                  {visualizationData.biotechExample}
                </Typography>
              </Paper>
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
}

export default DesignTypes;