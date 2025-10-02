import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Box, 
  Paper, 
  Tabs, 
  Tab, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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
  HeatMapChart
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
 * Fundamentals - Component for DOE fundamental concepts
 * 
 * This component covers the core principles and mathematical foundations of
 * Design of Experiments (DOE) with interactive examples and visualizations.
 */
function Fundamentals({ content }) {
  const [tabIndex, setTabIndex] = useState(0);
  const [numFactors, setNumFactors] = useState(3);
  const [designType, setDesignType] = useState('full');
  const [resolution, setResolution] = useState(4);
  const [factorNames, setFactorNames] = useState(['Temperature', 'pH', 'Stirring']);
  const [designMatrix, setDesignMatrix] = useState([]);
  const [designProperties, setDesignProperties] = useState(null);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabIndex(newValue);
  };

  // Handle design type change
  const handleDesignTypeChange = (event) => {
    setDesignType(event.target.value);
  };

  // Handle resolution change
  const handleResolutionChange = (event) => {
    setResolution(event.target.value);
  };

  // Handle number of factors change
  const handleNumFactorsChange = (event, newValue) => {
    setNumFactors(newValue);
    
    // Update factor names array
    const defaultFactors = ['Temperature', 'pH', 'Stirring', 'Nutrient', 'Oxygen', 'Inducer'];
    const newFactorNames = [];
    
    for (let i = 0; i < newValue; i++) {
      if (i < factorNames.length) {
        newFactorNames.push(factorNames[i]);
      } else if (i < defaultFactors.length) {
        newFactorNames.push(defaultFactors[i]);
      } else {
        newFactorNames.push(`Factor ${i+1}`);
      }
    }
    
    setFactorNames(newFactorNames);
  };

  // Generate factorial design matrix
  useEffect(() => {
    // Generate design matrix based on factors and design type
    const matrix = generateFactorialDesign(factorNames, designType, resolution);
    setDesignMatrix(matrix);
    
    // Calculate design properties
    const properties = calculateDesignProperties(matrix);
    setDesignProperties(properties);
  }, [factorNames, designType, resolution, numFactors]);

  // Function to generate factorial design matrix
  const generateFactorialDesign = (factors, designType, resolution) => {
    const numFactors = factors.length;
    let runs = 0;
    let design = [];
    
    if (designType === 'full') {
      // Full factorial design
      runs = 2 ** numFactors;
      
      // Generate runs
      for (let i = 0; i < runs; i++) {
        const run = { stdOrder: i + 1 };
        
        // Set factor levels based on binary representation of run number
        for (let j = 0; j < numFactors; j++) {
          const level = (i & (1 << (numFactors - j - 1))) ? 1 : -1;
          run[factors[j]] = level;
        }
        
        // Add interactions for 2-factor interactions
        if (numFactors > 1) {
          for (let j = 0; j < numFactors - 1; j++) {
            for (let k = j + 1; k < numFactors; k++) {
              const interactionName = `${factors[j]}×${factors[k]}`;
              run[interactionName] = run[factors[j]] * run[factors[k]];
            }
          }
        }
        
        // Add 3-factor interactions (for demonstration)
        if (numFactors > 2) {
          for (let j = 0; j < numFactors - 2; j++) {
            for (let k = j + 1; k < numFactors - 1; k++) {
              for (let l = k + 1; l < numFactors; l++) {
                if (j < 3 && k < 3 && l < 3) { // Limit to keep manageable
                  const interactionName = `${factors[j]}×${factors[k]}×${factors[l]}`;
                  run[interactionName] = run[factors[j]] * run[factors[k]] * run[factors[l]];
                }
              }
            }
          }
        }
        
        design.push(run);
      }
    } else if (designType === 'fractional') {
      // Fractional factorial design
      // Implement based on resolution
      const baseFactors = getBaseFactors(numFactors, resolution);
      runs = 2 ** baseFactors;
      
      // Generate base design
      for (let i = 0; i < runs; i++) {
        const run = { stdOrder: i + 1 };
        
        // Set base factor levels
        for (let j = 0; j < baseFactors; j++) {
          const level = (i & (1 << (baseFactors - j - 1))) ? 1 : -1;
          run[factors[j]] = level;
        }
        
        // Generate additional factors based on resolution
        for (let j = baseFactors; j < numFactors; j++) {
          if (resolution === 3) {
            // Resolution III: confound with 2-factor interaction
            run[factors[j]] = run[factors[0]] * run[factors[1 % baseFactors]];
          } else if (resolution === 4) {
            // Resolution IV: confound with 3-factor interaction
            run[factors[j]] = run[factors[0]] * run[factors[1 % baseFactors]] * run[factors[2 % baseFactors]];
          } else if (resolution === 5) {
            // Resolution V: confound with 4-factor interaction
            run[factors[j]] = run[factors[0]] * run[factors[1 % baseFactors]] * 
                              run[factors[2 % baseFactors]] * run[factors[3 % baseFactors]];
          }
        }
        
        // Add interactions for visualization
        // 2-factor interactions
        if (numFactors > 1) {
          for (let j = 0; j < numFactors - 1; j++) {
            for (let k = j + 1; k < numFactors; k++) {
              const interactionName = `${factors[j]}×${factors[k]}`;
              run[interactionName] = run[factors[j]] * run[factors[k]];
            }
          }
        }
        
        // 3-factor interactions (limited)
        if (numFactors > 2) {
          for (let j = 0; j < Math.min(numFactors - 2, 2); j++) {
            for (let k = j + 1; k < Math.min(numFactors - 1, 3); k++) {
              for (let l = k + 1; l < Math.min(numFactors, 4); l++) {
                const interactionName = `${factors[j]}×${factors[k]}×${factors[l]}`;
                run[interactionName] = run[factors[j]] * run[factors[k]] * run[factors[l]];
              }
            }
          }
        }
        
        design.push(run);
      }
    }
    
    return design;
  };

  // Helper function to determine base factors based on resolution
  const getBaseFactors = (numFactors, resolution) => {
    let p;
    
    if (resolution === 3) {
      p = numFactors - Math.ceil(Math.log2(numFactors + 1));
    } else if (resolution === 4) {
      p = numFactors - Math.ceil(Math.log2(2 * numFactors + 1));
    } else { // resolution === 5
      p = numFactors - Math.ceil(Math.log2(numFactors ** 2));
    }
    
    p = Math.max(0, Math.min(p, numFactors - 1));
    return numFactors - p;
  };

  // Function to calculate design properties
  const calculateDesignProperties = (designMatrix) => {
    if (!designMatrix || designMatrix.length === 0) return null;
    
    // Get all columns except stdOrder
    const columns = Object.keys(designMatrix[0]).filter(key => key !== 'stdOrder');
    
    // Factor columns (no interactions)
    const factorColumns = columns.filter(col => !col.includes('×'));
    
    // Create design matrix array for calculations
    const X = [];
    for (let row of designMatrix) {
      const xRow = [];
      for (let col of columns) {
        xRow.push(row[col]);
      }
      X.push(xRow);
    }
    
    // Convert to numeric matrix
    const numericX = X.map(row => row.map(val => +val));
    
    // Calculate XᵀX
    const XtX = calculateXtX(numericX);
    
    // Check orthogonality
    const isOrthogonal = checkOrthogonality(XtX, designMatrix.length);
    
    // Calculate correlation matrix
    const corrMatrix = calculateCorrelationMatrix(numericX);
    
    // Calculate D-efficiency (simplified)
    const dEfficiency = calculateDEfficiency(XtX, designMatrix.length, columns.length);
    
    // Determine aliasing (simplified)
    const aliasing = calculateAliasing(corrMatrix, columns);
    
    return {
      runs: designMatrix.length,
      factors: factorColumns.length,
      terms: columns.length,
      orthogonal: isOrthogonal,
      dEfficiency: dEfficiency,
      corrMatrix: corrMatrix,
      corrMatrixLabels: columns,
      aliasing: aliasing
    };
  };

  // Helper matrix calculation functions
  const calculateXtX = (X) => {
    const numCols = X[0].length;
    const XtX = Array(numCols).fill().map(() => Array(numCols).fill(0));
    
    for (let i = 0; i < numCols; i++) {
      for (let j = 0; j < numCols; j++) {
        for (let k = 0; k < X.length; k++) {
          XtX[i][j] += X[k][i] * X[k][j];
        }
      }
    }
    
    return XtX;
  };
  
  const checkOrthogonality = (XtX, n) => {
    const numCols = XtX.length;
    const diagValue = n;
    
    for (let i = 0; i < numCols; i++) {
      for (let j = 0; j < numCols; j++) {
        if (i === j) {
          if (Math.abs(XtX[i][j] - diagValue) > 0.0001) return false;
        } else {
          if (Math.abs(XtX[i][j]) > 0.0001) return false;
        }
      }
    }
    
    return true;
  };
  
  const calculateCorrelationMatrix = (X) => {
    const numCols = X[0].length;
    const n = X.length;
    
    // Calculate column means
    const means = Array(numCols).fill(0);
    for (let j = 0; j < numCols; j++) {
      for (let i = 0; i < n; i++) {
        means[j] += X[i][j];
      }
      means[j] /= n;
    }
    
    // Calculate column standard deviations
    const stds = Array(numCols).fill(0);
    for (let j = 0; j < numCols; j++) {
      for (let i = 0; i < n; i++) {
        stds[j] += (X[i][j] - means[j]) ** 2;
      }
      stds[j] = Math.sqrt(stds[j] / n);
    }
    
    // Calculate correlation matrix
    const corrMatrix = Array(numCols).fill().map(() => Array(numCols).fill(0));
    for (let i = 0; i < numCols; i++) {
      for (let j = 0; j < numCols; j++) {
        if (i === j) {
          corrMatrix[i][j] = 1;
        } else {
          let sum = 0;
          for (let k = 0; k < n; k++) {
            sum += (X[k][i] - means[i]) * (X[k][j] - means[j]);
          }
          corrMatrix[i][j] = sum / (n * stds[i] * stds[j]);
          
          // Handle numerical precision issues
          if (Math.abs(corrMatrix[i][j]) < 0.0001) corrMatrix[i][j] = 0;
          if (Math.abs(corrMatrix[i][j] - 1) < 0.0001) corrMatrix[i][j] = 1;
          if (Math.abs(corrMatrix[i][j] + 1) < 0.0001) corrMatrix[i][j] = -1;
        }
      }
    }
    
    return corrMatrix;
  };
  
  const calculateDEfficiency = (XtX, n, p) => {
    // Simplified D-efficiency calculation
    // In practice, would use determinant and proper calculation
    if (checkOrthogonality(XtX, n)) {
      return 100; // Orthogonal design is 100% D-efficient
    } else {
      // Simplified estimate based on off-diagonal elements
      let sumOffDiag = 0;
      let count = 0;
      for (let i = 0; i < XtX.length; i++) {
        for (let j = 0; j < XtX.length; j++) {
          if (i !== j) {
            sumOffDiag += Math.abs(XtX[i][j]) / XtX[i][i];
            count++;
          }
        }
      }
      const avgRelativeOffDiag = count > 0 ? sumOffDiag / count : 0;
      return Math.max(0, 100 * (1 - avgRelativeOffDiag));
    }
  };
  
  const calculateAliasing = (corrMatrix, columns) => {
    const aliasing = {};
    const threshold = 0.5; // Correlation threshold for aliasing
    
    for (let i = 0; i < columns.length; i++) {
      const aliases = [];
      for (let j = 0; j < columns.length; j++) {
        if (i !== j && Math.abs(corrMatrix[i][j]) > threshold) {
          aliases.push({
            term: columns[j],
            correlation: corrMatrix[i][j]
          });
        }
      }
      
      if (aliases.length > 0) {
        aliasing[columns[i]] = aliases;
      }
    }
    
    return aliasing;
  };

  // Generate data for main effect visualization
  const generateMainEffectData = () => {
    const data = {
      lowLevel: [
        { x: -1, y: 30 },
        { x: 1, y: 30 }
      ],
      highLevel: [
        { x: -1, y: 50 },
        { x: 1, y: 50 }
      ]
    };
    
    return data;
  };

  // Generate data for interaction effect visualization
  const generateInteractionEffectData = () => {
    const data = {
      lowLevel: [
        { x: -1, y: 30 },
        { x: 1, y: 60 }
      ],
      highLevel: [
        { x: -1, y: 50 },
        { x: 1, y: 40 }
      ]
    };
    
    return data;
  };

  // Generate resolution comparison data
  const resolutionComparisonData = [
    {
      resolution: "III",
      mainEffects: "Clear of other main effects",
      interactions: "Confounded with main effects",
      runs: "8",
      use: "Initial screening"
    },
    {
      resolution: "IV",
      mainEffects: "Clear of main effects and 2FI",
      interactions: "Confounded with other 2FI",
      runs: "16",
      use: "Characterization"
    },
    {
      resolution: "V",
      mainEffects: "Clear of main effects and 2FI",
      interactions: "Clear of main effects and other 2FI",
      runs: "16",
      use: "Detailed characterization"
    },
    {
      resolution: "Full Factorial",
      mainEffects: "All effects clear",
      interactions: "All effects clear",
      runs: "32",
      use: "Complete analysis"
    }
  ];

  // Format correlation matrix data for heatmap
  const formatCorrelationData = (corrMatrix, labels) => {
    if (!corrMatrix || !labels) return [];
    
    const data = [];
    for (let i = 0; i < corrMatrix.length; i++) {
      for (let j = 0; j < corrMatrix[i].length; j++) {
        data.push({
          x: labels[j],
          y: labels[i],
          value: corrMatrix[i][j]
        });
      }
    }
    
    return data;
  };

  const mainEffectData = generateMainEffectData();
  const interactionEffectData = generateInteractionEffectData();

  return (
    <MathJaxContext config={mathJaxConfig}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Fundamental DOE Concepts
        </Typography>
        
        <Typography paragraph>
          This section introduces the core principles and mathematical foundations of Design of Experiments (DOE).
          Understanding these fundamentals is essential for effective experimental design in biotechnology applications.
        </Typography>
        
        <Paper sx={{ mb: 4 }}>
          <Tabs 
            value={tabIndex} 
            onChange={handleTabChange} 
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Core DOE Principles" />
            <Tab label="Factorial Design Fundamentals" />
            <Tab label="Interactive Design Matrix" />
            <Tab label="Mathematical Framework" />
          </Tabs>
          
          {/* Tab 1: Core DOE Principles */}
          {tabIndex === 0 && (
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Core DOE Principles
              </Typography>
              
              <Typography paragraph>
                The fundamental principles that make Design of Experiments a powerful methodology:
              </Typography>
              
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Randomization</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography paragraph>
                    <strong>Concept Anchor:</strong> Randomization is the cornerstone of experimental validity, distributing unknown sources of variation randomly across experimental conditions.
                  </Typography>
                  <Typography paragraph>
                    <strong>Practical Lens:</strong> In biotechnology, randomization helps mitigate the impact of uncontrolled variables such as microheterogeneity in cell populations, subtle equipment variations, and reagent lot differences. For example, in cell culture experiments, randomizing the plate position or incubator shelf location prevents systematic errors from temperature gradients or gas exchange differences.
                  </Typography>
                  <Typography paragraph>
                    <strong>Mathematical Foundation:</strong>
                  </Typography>
                  <Typography paragraph>
                    Randomization transforms systematic errors into random errors that can be quantified as part of experimental error (ε):
                  </Typography>
                  <Box sx={{ my: 2, display: 'flex', justifyContent: 'center' }}>
                    <MathJax>{"$$y_{ij} = \\mu + \\tau_i + \\varepsilon_{ij}$$"}</MathJax>
                  </Box>
                  <Typography paragraph>
                    Where:
                  </Typography>
                  <Box sx={{ pl: 2 }}>
                    <Typography paragraph>
                      • <MathJax inline>{"y_{ij}"}</MathJax> is the observed response for the <MathJax inline>{"i"}</MathJax>th treatment at the <MathJax inline>{"j"}</MathJax>th replicate
                    </Typography>
                    <Typography paragraph>
                      • <MathJax inline>{"\\mu"}</MathJax> is the overall mean
                    </Typography>
                    <Typography paragraph>
                      • <MathJax inline>{"\\tau_i"}</MathJax> is the effect of the <MathJax inline>{"i"}</MathJax>th treatment
                    </Typography>
                    <Typography paragraph>
                      • <MathJax inline>{"\\varepsilon_{ij}"}</MathJax> is the random error term, assumed to be independently and identically distributed
                    </Typography>
                  </Box>
                </AccordionDetails>
              </Accordion>
              
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Replication</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography paragraph>
                    <strong>Concept Anchor:</strong> Replication involves repeating experimental runs under identical conditions to quantify experimental variability and increase precision in effect estimates.
                  </Typography>
                  <Typography paragraph>
                    <strong>Practical Lens:</strong> Biological systems exhibit inherent variability, making replication crucial. In protein expression systems, multiple replicate fermentations provide reliable estimates of process variability and distinguishes real effects from noise. For example, triplicate runs of a CHO cell culture allow estimation of production variability for calculation of confidence intervals around titer measurements.
                  </Typography>
                  <Typography paragraph>
                    <strong>Mathematical Foundation:</strong>
                  </Typography>
                  <Typography paragraph>
                    Replication reduces the standard error of the mean by a factor of <MathJax inline>{"\\sqrt{n}"}</MathJax>:
                  </Typography>
                  <Box sx={{ my: 2, display: 'flex', justifyContent: 'center' }}>
                    <MathJax>{"$$SE(\\bar{y}) = \\frac{\\sigma}{\\sqrt{n}}$$"}</MathJax>
                  </Box>
                  <Typography paragraph>
                    Where:
                  </Typography>
                  <Box sx={{ pl: 2 }}>
                    <Typography paragraph>
                      • <MathJax inline>{"SE(\\bar{y})"}</MathJax> is the standard error of the mean
                    </Typography>
                    <Typography paragraph>
                      • <MathJax inline>{"\\sigma"}</MathJax> is the standard deviation
                    </Typography>
                    <Typography paragraph>
                      • <MathJax inline>{"n"}</MathJax> is the number of replicates
                    </Typography>
                  </Box>
                  <Typography paragraph>
                    This translates directly to the precision of effect estimates in DOE models:
                  </Typography>
                  <Box sx={{ my: 2, display: 'flex', justifyContent: 'center' }}>
                    <MathJax>{"$$SE(\\hat{\\beta}) = \\frac{\\sigma}{\\sqrt{N}}$$"}</MathJax>
                  </Box>
                  <Typography paragraph>
                    Where:
                  </Typography>
                  <Box sx={{ pl: 2 }}>
                    <Typography paragraph>
                      • <MathJax inline>{"SE(\\hat{\\beta})"}</MathJax> is the standard error of the estimated effect
                    </Typography>
                    <Typography paragraph>
                      • <MathJax inline>{"\\sigma"}</MathJax> is the standard deviation
                    </Typography>
                    <Typography paragraph>
                      • <MathJax inline>{"N"}</MathJax> is the total number of runs in the experiment
                    </Typography>
                  </Box>
                </AccordionDetails>
              </Accordion>
              
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Blocking</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography paragraph>
                    <strong>Concept Anchor:</strong> Blocking isolates known sources of variability that are not of primary interest, enhancing precision and eliminating confounding from nuisance factors.
                  </Typography>
                  <Typography paragraph>
                    <strong>Practical Lens:</strong> In biotechnology, blocking addresses variations like equipment differences, reagent lots, or operator changes. For example, when testing a purification process, different protein batches (blocks) might be used to evaluate chromatography conditions, preventing batch-to-batch variation from obscuring the effects of interest.
                  </Typography>
                  <Typography paragraph>
                    <strong>Mathematical Foundation:</strong>
                  </Typography>
                  <Typography paragraph>
                    The blocked design model extends the basic model to include block effects:
                  </Typography>
                  <Box sx={{ my: 2, display: 'flex', justifyContent: 'center' }}>
                    <MathJax>{"$$y_{ijk} = \\mu + \\tau_i + \\beta_j + \\varepsilon_{ijk}$$"}</MathJax>
                  </Box>
                  <Typography paragraph>
                    Where:
                  </Typography>
                  <Box sx={{ pl: 2 }}>
                    <Typography paragraph>
                      • <MathJax inline>{"y_{ijk}"}</MathJax> is the observed response for the <MathJax inline>{"i"}</MathJax>th treatment in the <MathJax inline>{"j"}</MathJax>th block at the <MathJax inline>{"k"}</MathJax>th replicate
                    </Typography>
                    <Typography paragraph>
                      • <MathJax inline>{"\\mu"}</MathJax> is the overall mean
                    </Typography>
                    <Typography paragraph>
                      • <MathJax inline>{"\\tau_i"}</MathJax> is the effect of the <MathJax inline>{"i"}</MathJax>th treatment
                    </Typography>
                    <Typography paragraph>
                      • <MathJax inline>{"\\beta_j"}</MathJax> is the effect of the <MathJax inline>{"j"}</MathJax>th block
                    </Typography>
                    <Typography paragraph>
                      • <MathJax inline>{"\\varepsilon_{ijk}"}</MathJax> is the random error term
                    </Typography>
                  </Box>
                  <Typography paragraph>
                    In the ANOVA table, blocking reduces error variance by partitioning the sum of squares:
                  </Typography>
                  <Box sx={{ my: 2, display: 'flex', justifyContent: 'center' }}>
                    <MathJax>{"$$SS_{Total} = SS_{Treatment} + SS_{Block} + SS_{Error}$$"}</MathJax>
                  </Box>
                </AccordionDetails>
              </Accordion>
              
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Orthogonality</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography paragraph>
                    <strong>Concept Anchor:</strong> Orthogonality ensures that effect estimates are uncorrelated, maximizing the precision and allowing independent interpretation of factor effects.
                  </Typography>
                  <Typography paragraph>
                    <strong>Practical Lens:</strong> In bioprocess development, orthogonal designs allow independent assessment of critical parameters like pH, temperature, and nutrient concentrations without confounding. This enables clear attribution of effects when optimizing, for example, monoclonal antibody production in bioreactors.
                  </Typography>
                  <Typography paragraph>
                    <strong>Mathematical Foundation:</strong>
                  </Typography>
                  <Typography paragraph>
                    For a design matrix <MathJax inline>{"X"}</MathJax>, orthogonality means:
                  </Typography>
                  <Box sx={{ my: 2, display: 'flex', justifyContent: 'center' }}>
                    <MathJax>{"$$X^TX = nI$$"}</MathJax>
                  </Box>
                  <Typography paragraph>
                    Where:
                  </Typography>
                  <Box sx={{ pl: 2 }}>
                    <Typography paragraph>
                      • <MathJax inline>{"X"}</MathJax> is the design matrix in coded units
                    </Typography>
                    <Typography paragraph>
                      • <MathJax inline>{"I"}</MathJax> is the identity matrix
                    </Typography>
                    <Typography paragraph>
                      • <MathJax inline>{"n"}</MathJax> is the number of runs
                    </Typography>
                  </Box>
                  <Typography paragraph>
                    This property ensures that parameter estimates are uncorrelated:
                  </Typography>
                  <Box sx={{ my: 2, display: 'flex', justifyContent: 'center' }}>
                    <MathJax>{"$$Cov(\\hat{\\beta}_i, \\hat{\\beta}_j) = 0 \\quad \\text{for} \\quad i \\neq j$$"}</MathJax>
                  </Box>
                  <Typography paragraph>
                    The variance inflation factor (VIF) quantifies deviations from orthogonality:
                  </Typography>
                  <Box sx={{ my: 2, display: 'flex', justifyContent: 'center' }}>
                    <MathJax>{"$$VIF_j = \\frac{1}{1-R_j^2}$$"}</MathJax>
                  </Box>
                  <Typography paragraph>
                    Where <MathJax inline>{"R_j^2"}</MathJax> is the coefficient of determination when the <MathJax inline>{"j"}</MathJax>th factor is regressed on all other factors.
                  </Typography>
                </AccordionDetails>
              </Accordion>
            </Box>
          )}
          
          {/* Tab 2: Factorial Design Fundamentals */}
          {tabIndex === 1 && (
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Factorial Design Fundamentals
              </Typography>
              
              <Typography paragraph>
                The key concepts and mathematical foundations of factorial experimental designs:
              </Typography>
              
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Main Effects</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography paragraph>
                    <strong>Concept Anchor:</strong> A main effect quantifies the average change in response when a factor changes from its low to high level, averaged across all conditions of other factors.
                  </Typography>
                  <Typography paragraph>
                    <strong>Practical Lens:</strong> In biotech applications, main effects identify critical process parameters (CPPs) that significantly impact critical quality attributes (CQAs). For example, the main effect of temperature on enzyme activity in a biocatalytic process informs process control strategies and design spaces for regulatory filings.
                  </Typography>
                  <Typography paragraph>
                    <strong>Mathematical Foundation:</strong>
                  </Typography>
                  <Typography paragraph>
                    For a two-level design, the main effect of factor A is calculated as:
                  </Typography>
                  <Box sx={{ my: 2, display: 'flex', justifyContent: 'center' }}>
                    <MathJax>{"$$E_A = \\frac{\\sum y_{A+} - \\sum y_{A-}}{n/2}$$"}</MathJax>
                  </Box>
                  <Typography paragraph>
                    Where:
                  </Typography>
                  <Box sx={{ pl: 2 }}>
                    <Typography paragraph>
                      • <MathJax inline>{"\\sum y_{A+}"}</MathJax> is the sum of responses when factor A is at high level
                    </Typography>
                    <Typography paragraph>
                      • <MathJax inline>{"\\sum y_{A-}"}</MathJax> is the sum of responses when factor A is at low level
                    </Typography>
                    <Typography paragraph>
                      • <MathJax inline>{"n"}</MathJax> is the total number of runs
                    </Typography>
                  </Box>
                  
                  {/* Visual example of main effect */}
                  <Typography variant="subtitle1" sx={{ mt: 2 }}>Visual Example of Main Effect</Typography>
                  <Box sx={{ height: 300, mb: 2 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="x" 
                          type="number"
                          domain={[-1.2, 1.2]}
                          ticks={[-1, 1]}
                          tickFormatter={(value) => value === -1 ? "Low (-1)" : "High (+1)"}
                          label={{ value: 'Factor Level', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis 
                          label={{ value: 'Response', angle: -90, position: 'insideLeft' }}
                          domain={[0, 60]}
                        />
                        <Tooltip formatter={(value) => value.toFixed(2)} />
                        <Legend />
                        <Line 
                          name="Low Level" 
                          data={mainEffectData.lowLevel} 
                          type="monotone" 
                          dataKey="y" 
                          stroke="#8884d8" 
                          dot={{ stroke: '#8884d8', strokeWidth: 1, r: 5 }}
                        />
                        <Line 
                          name="High Level" 
                          data={mainEffectData.highLevel} 
                          type="monotone" 
                          dataKey="y" 
                          stroke="#ff7300" 
                          dot={{ stroke: '#ff7300', strokeWidth: 1, r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                  <Typography paragraph>
                    In this example, the main effect is +20 units (the difference between the high level response of 50 and low level response of 30).
                  </Typography>
                </AccordionDetails>
              </Accordion>
              
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Interaction Effects</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography paragraph>
                    <strong>Concept Anchor:</strong> An interaction effect occurs when the impact of one factor on the response depends on the level of another factor, revealing complex system behaviors beyond additive effects.
                  </Typography>
                  <Typography paragraph>
                    <strong>Practical Lens:</strong> Biological systems are rife with interactions. In cell culture media optimization, glucose and glutamine concentrations often interact strongly as primary carbon and nitrogen sources, requiring simultaneous optimization rather than independent adjustment.
                  </Typography>
                  <Typography paragraph>
                    <strong>Mathematical Foundation:</strong>
                  </Typography>
                  <Typography paragraph>
                    The two-factor interaction effect for factors A and B is calculated as:
                  </Typography>
                  <Box sx={{ my: 2, display: 'flex', justifyContent: 'center' }}>
                    <MathJax>{"$$E_{AB} = \\frac{\\sum y_{A+B+} + \\sum y_{A-B-} - \\sum y_{A+B-} - \\sum y_{A-B+}}{n/2}$$"}</MathJax>
                  </Box>
                  <Typography paragraph>
                    Where:
                  </Typography>
                  <Box sx={{ pl: 2 }}>
                    <Typography paragraph>
                      • <MathJax inline>{"\\sum y_{A+B+}"}</MathJax> is the sum of responses when both factors are at high levels
                    </Typography>
                    <Typography paragraph>
                      • <MathJax inline>{"\\sum y_{A-B-}"}</MathJax> is the sum of responses when both factors are at low levels
                    </Typography>
                    <Typography paragraph>
                      • <MathJax inline>{"\\sum y_{A+B-}"}</MathJax> is the sum of responses when A is high and B is low
                    </Typography>
                    <Typography paragraph>
                      • <MathJax inline>{"\\sum y_{A-B+}"}</MathJax> is the sum of responses when A is low and B is high
                    </Typography>
                  </Box>
                  
                  {/* Visual example of interaction effect */}
                  <Typography variant="subtitle1" sx={{ mt: 2 }}>Visual Example of Interaction Effect</Typography>
                  <Box sx={{ height: 300, mb: 2 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="x" 
                          type="number"
                          domain={[-1.2, 1.2]}
                          ticks={[-1, 1]}
                          tickFormatter={(value) => value === -1 ? "A at Low (-1)" : "A at High (+1)"}
                          label={{ value: 'Factor A Level', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis 
                          label={{ value: 'Response', angle: -90, position: 'insideLeft' }}
                          domain={[0, 70]}
                        />
                        <Tooltip formatter={(value) => value.toFixed(2)} />
                        <Legend />
                        <Line 
                          name="B at Low Level" 
                          data={interactionEffectData.lowLevel} 
                          type="monotone" 
                          dataKey="y" 
                          stroke="#8884d8" 
                          dot={{ stroke: '#8884d8', strokeWidth: 1, r: 5 }}
                        />
                        <Line 
                          name="B at High Level" 
                          data={interactionEffectData.highLevel} 
                          type="monotone" 
                          dataKey="y" 
                          stroke="#ff7300" 
                          dot={{ stroke: '#ff7300', strokeWidth: 1, r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                  <Typography paragraph>
                    This plot illustrates an interaction between factors A and B. The effect of factor A on the response depends on the level of factor B. When B is at its low level, increasing A leads to a higher response. When B is at its high level, increasing A leads to a lower response.
                  </Typography>
                </AccordionDetails>
              </Accordion>
              
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Confounding</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography paragraph>
                    <strong>Concept Anchor:</strong> Confounding occurs when effect estimates are mixed (aliased), making it impossible to distinguish between certain effects with the given design.
                  </Typography>
                  <Typography paragraph>
                    <strong>Practical Lens:</strong> In biotechnology, confounding must be carefully managed. When designing experiments for bioproduct stability, temperature and light exposure effects might be confounded in an incomplete design, leading to misinterpretation of degradation mechanisms.
                  </Typography>
                  <Typography paragraph>
                    <strong>Mathematical Foundation:</strong>
                  </Typography>
                  <Typography paragraph>
                    In a fractional factorial design, the aliasing pattern is determined by the defining relation. For example, in a 2^(k-p) design, the confounding pattern is given by the generalized interaction:
                  </Typography>
                  <Box sx={{ my: 2, display: 'flex', justifyContent: 'center' }}>
                    <MathJax>{"$$I = ABC...K$$"}</MathJax>
                  </Box>
                  <Typography paragraph>
                    Where I represents the identity column, and the factors on the right define the aliasing structure. The complete aliasing pattern can be derived through modular arithmetic:
                  </Typography>
                  <Box sx={{ my: 2, display: 'flex', justifyContent: 'center' }}>
                    <MathJax>{"$$E_{estimated} = E_{true} + E_{aliased}$$"}</MathJax>
                  </Box>
                  <Typography paragraph>
                    Effect aliasing can be expressed using the alias matrix:
                  </Typography>
                  <Box sx={{ my: 2, display: 'flex', justifyContent: 'center' }}>
                    <MathJax>{"$$A = (X^TX)^{-1}X^T$$"}</MathJax>
                  </Box>
                  <Typography paragraph>
                    Where <MathJax inline>{"X"}</MathJax> is the design matrix.
                  </Typography>
                </AccordionDetails>
              </Accordion>
              
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Resolution</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography paragraph>
                    <strong>Concept Anchor:</strong> Resolution describes a design's ability to distinguish between different types of effects, with higher resolution indicating less severe confounding patterns.
                  </Typography>
                  <Typography paragraph>
                    <strong>Practical Lens:</strong> In bioanalytical method development, resolution selection balances experimental resources against information needs. A Resolution V design might be selected for developing a critical HPLC assay for drug impurities, ensuring main effects and two-factor interactions are unconfounded.
                  </Typography>
                  <Typography paragraph>
                    <strong>Mathematical Foundation:</strong>
                  </Typography>
                  <Typography paragraph>
                    Resolution is denoted by Roman numerals and defined by the minimum word length in the defining relation:
                  </Typography>
                  <Box sx={{ pl: 2 }}>
                    <Typography paragraph>
                      • Resolution III: Main effects are not confounded with other main effects but may be confounded with two-factor interactions
                    </Typography>
                    <Typography paragraph>
                      • Resolution IV: Main effects are not confounded with main effects or two-factor interactions, but two-factor interactions may be confounded with each other
                    </Typography>
                    <Typography paragraph>
                      • Resolution V: Main effects and two-factor interactions are not confounded with each other
                    </Typography>
                  </Box>
                  <Typography paragraph>
                    For a 2^(k-p) design with defining relation I = ABC...K, the resolution R is:
                  </Typography>
                  <Box sx={{ my: 2, display: 'flex', justifyContent: 'center' }}>
                    <MathJax>{"$$R = \\min(w_1, w_2, ..., w_m)$$"}</MathJax>
                  </Box>
                  <Typography paragraph>
                    Where <MathJax inline>{"w_i"}</MathJax> is the word length (number of letters) in each term of the defining relation.
                  </Typography>
                  
                  {/* Comparison table for resolution */}
                  <Typography variant="subtitle1" sx={{ mt: 2 }}>Comparison of Different Resolution Designs</Typography>
                  <TableContainer component={Paper} sx={{ mt: 2 }}>
                    <Table sx={{ minWidth: 650 }} aria-label="resolution comparison table">
                      <TableHead>
                        <TableRow>
                          <TableCell>Resolution</TableCell>
                          <TableCell>Main Effects</TableCell>
                          <TableCell>Two-Factor Interactions</TableCell>
                          <TableCell>Runs (for 5 factors)</TableCell>
                          <TableCell>Typical Use Case</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {resolutionComparisonData.map((row, index) => (
                          <TableRow key={index}>
                            <TableCell>{row.resolution}</TableCell>
                            <TableCell>{row.mainEffects}</TableCell>
                            <TableCell>{row.interactions}</TableCell>
                            <TableCell>{row.runs}</TableCell>
                            <TableCell>{row.use}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            </Box>
          )}
          
          {/* Tab 3: Interactive Design Matrix */}
          {tabIndex === 2 && (
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Interactive Design Matrix Visualization
              </Typography>
              
              <Typography paragraph>
                This tool helps you visualize and understand factorial design matrices and their properties.
                Explore how different design choices affect the information content and efficiency of your experiments.
              </Typography>
              
              <Grid container spacing={3} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <Paper elevation={2} sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>Design Configuration</Typography>
                    
                    <Typography gutterBottom>Number of Factors</Typography>
                    <Slider
                      value={numFactors}
                      onChange={handleNumFactorsChange}
                      min={2}
                      max={6}
                      step={1}
                      marks={[
                        { value: 2, label: '2' },
                        { value: 4, label: '4' },
                        { value: 6, label: '6' }
                      ]}
                    />
                    
                    <FormControl fullWidth sx={{ mt: 2 }}>
                      <InputLabel>Design Type</InputLabel>
                      <Select
                        value={designType}
                        onChange={handleDesignTypeChange}
                        label="Design Type"
                      >
                        <MenuItem value="full">Full Factorial</MenuItem>
                        <MenuItem value="fractional">Fractional Factorial</MenuItem>
                      </Select>
                    </FormControl>
                    
                    {designType === 'fractional' && (
                      <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>Resolution</InputLabel>
                        <Select
                          value={resolution}
                          onChange={handleResolutionChange}
                          label="Resolution"
                        >
                          <MenuItem value={3}>Resolution III</MenuItem>
                          <MenuItem value={4}>Resolution IV</MenuItem>
                          <MenuItem value={5}>Resolution V</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                    
                    <Typography variant="h6" sx={{ mt: 3 }}>Factor Names</Typography>
                    <Grid container spacing={2}>
                      {factorNames.map((name, index) => (
                        <Grid item xs={6} key={index}>
                          <FormControl fullWidth>
                            <InputLabel>{`Factor ${index + 1}`}</InputLabel>
                            <Select
                              value={name}
                              onChange={(e) => {
                                const newNames = [...factorNames];
                                newNames[index] = e.target.value;
                                setFactorNames(newNames);
                              }}
                              label={`Factor ${index + 1}`}
                            >
                              <MenuItem value="Temperature">Temperature</MenuItem>
                              <MenuItem value="pH">pH</MenuItem>
                              <MenuItem value="Stirring">Stirring</MenuItem>
                              <MenuItem value="Nutrient">Nutrient</MenuItem>
                              <MenuItem value="Oxygen">Oxygen</MenuItem>
                              <MenuItem value="Inducer">Inducer</MenuItem>
                              <MenuItem value={`Factor ${index + 1}`}>{`Factor ${index + 1}`}</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                      ))}
                    </Grid>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Paper elevation={2} sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>Design Properties</Typography>
                    
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid item xs={4}>
                        <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'background.default' }}>
                          <Typography variant="subtitle1">Number of Runs</Typography>
                          <Typography variant="h5">{designProperties?.runs || 0}</Typography>
                        </Box>
                      </Grid>
                      
                      <Grid item xs={4}>
                        <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'background.default' }}>
                          <Typography variant="subtitle1">Orthogonal</Typography>
                          <Typography variant="h5">{designProperties?.orthogonal ? 'Yes' : 'No'}</Typography>
                        </Box>
                      </Grid>
                      
                      <Grid item xs={4}>
                        <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'background.default' }}>
                          <Typography variant="subtitle1">D-Efficiency</Typography>
                          <Typography variant="h5">
                            {designProperties?.dEfficiency ? `${designProperties.dEfficiency.toFixed(1)}%` : '-'}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                    
                    {/* Aliasing structure if present */}
                    {designProperties?.aliasing && Object.keys(designProperties.aliasing).length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle1">Aliasing Structure:</Typography>
                        {Object.entries(designProperties.aliasing).map(([term, aliases]) => (
                          <Typography variant="body2" key={term}>
                            • <strong>{term}</strong> is aliased with: {aliases.map(a => 
                              `${a.term} (r=${a.correlation.toFixed(2)})`).join(', ')}
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </Paper>
                </Grid>
              </Grid>
              
              {/* Design Matrix */}
              <Paper elevation={3} sx={{ p: 2, mt: 3 }}>
                <Typography variant="h6" gutterBottom>Design Matrix (Coded Units)</Typography>
                
                <TableContainer sx={{ maxHeight: 400 }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Run</TableCell>
                        {factorNames.map((name, index) => (
                          <TableCell key={`factor-${index}`}>{name}</TableCell>
                        ))}
                        {/* Show interaction columns */}
                        {designMatrix.length > 0 && 
                          Object.keys(designMatrix[0])
                            .filter(col => col.includes('×') && !col.includes('×', col.indexOf('×') + 1)) // Only show 2FI
                            .map((col, index) => (
                              <TableCell key={`interaction-${index}`}>{col}</TableCell>
                            ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {designMatrix.map((row, rowIndex) => (
                        <TableRow key={`row-${rowIndex}`}>
                          <TableCell>{row.stdOrder}</TableCell>
                          {factorNames.map((name, colIndex) => (
                            <TableCell key={`cell-${rowIndex}-${colIndex}`}>
                              {row[name] === 1 ? 'High' : 'Low'}
                            </TableCell>
                          ))}
                          {/* Show interaction values */}
                          {Object.keys(row)
                            .filter(col => col.includes('×') && !col.includes('×', col.indexOf('×') + 1)) // Only show 2FI
                            .map((col, colIndex) => (
                              <TableCell key={`interaction-${rowIndex}-${colIndex}`}>
                                {row[col] === 1 ? 'High' : 'Low'}
                              </TableCell>
                            ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
              
              {/* Correlation Matrix Visualization */}
              {designProperties?.corrMatrix && (
                <Paper elevation={3} sx={{ p: 2, mt: 3 }}>
                  <Typography variant="h6" gutterBottom>Correlation Matrix</Typography>
                  <Typography paragraph>
                    This heatmap shows the correlation between factors and interaction terms. 
                    In an orthogonal design, all off-diagonal elements are zero (no correlation).
                  </Typography>
                  
                  <Box sx={{ height: 400 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart
                        margin={{ top: 20, right: 60, bottom: 60, left: 60 }}
                      >
                        <CartesianGrid />
                        <XAxis 
                          type="category" 
                          dataKey="x" 
                          name="Factor" 
                          angle={-45}
                          textAnchor="end"
                          interval={0}
                        />
                        <YAxis 
                          type="category" 
                          dataKey="y" 
                          name="Factor" 
                          width={60}
                        />
                        <Tooltip 
                          formatter={(value) => [value.toFixed(2), 'Correlation']}
                          cursor={{ strokeDasharray: '3 3' }}
                        />
                        <Scatter
                          name="Correlation"
                          data={formatCorrelationData(designProperties.corrMatrix, designProperties.corrMatrixLabels)}
                          fill="#8884d8"
                          shape="square"
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>
              )}
              
              <Accordion sx={{ mt: 3 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Design Matrix Interpretation</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="h6" gutterBottom>Understanding the Design Matrix</Typography>
                  
                  <Typography paragraph>
                    The design matrix represents your experimental plan with each row being an experimental run and each column a factor or interaction term.
                  </Typography>
                  
                  <Typography variant="subtitle1" gutterBottom>Key Properties:</Typography>
                  
                  <Box sx={{ pl: 2 }}>
                    <Typography paragraph>
                      <strong>1. Orthogonality:</strong> In an orthogonal design, all factors and interactions are uncorrelated, making effect estimates independent. This maximizes statistical efficiency.
                    </Typography>
                    
                    <Typography paragraph>
                      <strong>2. D-Efficiency:</strong> Measures the quality of the design relative to an ideal orthogonal design (100% = perfect).
                    </Typography>
                    
                    <Typography paragraph>
                      <strong>3. Aliasing/Confounding:</strong> When effects are mixed together and cannot be estimated separately. In fractional designs, aliasing is inevitable but can be managed.
                    </Typography>
                    
                    <Typography paragraph>
                      <strong>4. Resolution:</strong> Indicates what types of effects are confounded:
                    </Typography>
                    
                    <Box sx={{ pl: 3 }}>
                      <Typography paragraph>
                        • Resolution III: Main effects can be confounded with 2-factor interactions
                      </Typography>
                      <Typography paragraph>
                        • Resolution IV: Main effects are clear but 2-factor interactions may be confounded with each other
                      </Typography>
                      <Typography paragraph>
                        • Resolution V: Both main effects and 2-factor interactions are clear
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Typography variant="h6" gutterBottom>Biotechnology Application</Typography>
                  
                  <Typography paragraph>
                    In bioprocess development, orthogonal designs help isolate the effects of critical parameters like temperature, pH, and nutrient concentration. Higher resolution designs are important when interactions are expected, as is common in biological systems where, for example, temperature and pH often interact to affect enzyme activity or cell growth.
                  </Typography>
                </AccordionDetails>
              </Accordion>
            </Box>
          )}
          
          {/* Tab 4: Mathematical Framework */}
          {tabIndex === 3 && (
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Mathematical Framework of DOE
              </Typography>
              
              <Typography paragraph>
                The statistical and mathematical foundations that support Design of Experiments:
              </Typography>
              
              <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Analysis of Variance (ANOVA) Model
                </Typography>
                
                <Typography paragraph>
                  The ANOVA model is fundamental to DOE analysis, partitioning observed variation into components attributed to different sources:
                </Typography>
                
                <Box sx={{ my: 2, display: 'flex', justifyContent: 'center' }}>
                  <MathJax>{"$$SS_{Total} = SS_{Factors} + SS_{Error}$$"}</MathJax>
                </Box>
                
                <Typography paragraph>
                  For a model with multiple factors:
                </Typography>
                
                <Box sx={{ my: 2, display: 'flex', justifyContent: 'center' }}>
                  <MathJax>{"$$SS_{Factors} = SS_A + SS_B + SS_{AB} + ...$$"}</MathJax>
                </Box>
                
                <Typography paragraph>
                  The significance of effects is tested using F-tests:
                </Typography>
                
                <Box sx={{ my: 2, display: 'flex', justifyContent: 'center' }}>
                  <MathJax>{"$$F_A = \\frac{MS_A}{MS_{Error}} = \\frac{SS_A/df_A}{SS_{Error}/df_{Error}}$$"}</MathJax>
                </Box>
                
                <Typography paragraph>
                  Where <MathJax inline>{"MS"}</MathJax> represents Mean Squares, and <MathJax inline>{"df"}</MathJax> represents degrees of freedom.
                </Typography>
              </Paper>
              
              <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Regression Model Formulation
                </Typography>
                
                <Typography paragraph>
                  DOE can also be expressed as a regression problem:
                </Typography>
                
                <Box sx={{ my: 2, display: 'flex', justifyContent: 'center' }}>
                  <MathJax>{"$$y = X\\beta + \\varepsilon$$"}</MathJax>
                </Box>
                
                <Typography paragraph>
                  Where:
                </Typography>
                
                <Box sx={{ pl: 2 }}>
                  <Typography paragraph>
                    • <MathJax inline>{"y"}</MathJax> is the vector of responses
                  </Typography>
                  <Typography paragraph>
                    • <MathJax inline>{"X"}</MathJax> is the design matrix
                  </Typography>
                  <Typography paragraph>
                    • <MathJax inline>{"\\beta"}</MathJax> is the vector of coefficients
                  </Typography>
                  <Typography paragraph>
                    • <MathJax inline>{"\\varepsilon"}</MathJax> is the error vector
                  </Typography>
                </Box>
                
                <Typography paragraph>
                  The least squares estimator for the coefficients is:
                </Typography>
                
                <Box sx={{ my: 2, display: 'flex', justifyContent: 'center' }}>
                  <MathJax>{"$$\\hat{\\beta} = (X^TX)^{-1}X^Ty$$"}</MathJax>
                </Box>
                
                <Typography paragraph>
                  For orthogonal designs, this simplifies to:
                </Typography>
                
                <Box sx={{ my: 2, display: 'flex', justifyContent: 'center' }}>
                  <MathJax>{"$$\\hat{\\beta}_j = \\frac{X_j^Ty}{X_j^TX_j}$$"}</MathJax>
                </Box>
              </Paper>
              
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Response Surface Methodology</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography paragraph>
                    Response Surface Methodology (RSM) extends factorial designs to model curvature:
                  </Typography>
                  
                  <Box sx={{ my: 2, display: 'flex', justifyContent: 'center' }}>
                    <MathJax>{"$$y = \\beta_0 + \\sum_{i=1}^{k}\\beta_i x_i + \\sum_{i<j}^{k}\\beta_{ij}x_i x_j + \\sum_{i=1}^{k}\\beta_{ii}x_i^2 + \\varepsilon$$"}</MathJax>
                  </Box>
                  
                  <Typography paragraph>
                    The stationary point of the surface is found by solving:
                  </Typography>
                  
                  <Box sx={{ my: 2, display: 'flex', justifyContent: 'center' }}>
                    <MathJax>{"$$\\frac{\\partial \\hat{y}}{\\partial x_i} = 0 \\quad \\text{for all} \\quad i = 1, 2, ..., k$$"}</MathJax>
                  </Box>
                  
                  <Typography paragraph>
                    The nature of the stationary point (maximum, minimum, or saddle point) is determined by the eigenvalues of the matrix of second-order coefficients.
                  </Typography>
                </AccordionDetails>
              </Accordion>
              
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Mixture Design Mathematics</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography paragraph>
                    Mixture designs deal with components that sum to a constant (typically 1 or 100%):
                  </Typography>
                  
                  <Box sx={{ my: 2, display: 'flex', justifyContent: 'center' }}>
                    <MathJax>{"$$\\sum_{i=1}^{q} x_i = 1 \\quad \\text{and} \\quad x_i \\geq 0 \\quad \\forall i$$"}</MathJax>
                  </Box>
                  
                  <Typography paragraph>
                    The Scheffé canonical polynomial for mixture models:
                  </Typography>
                  
                  <Box sx={{ my: 2, display: 'flex', justifyContent: 'center' }}>
                    <MathJax>{"$$y = \\sum_{i=1}^{q}\\beta_i x_i + \\sum_{i<j}^{q}\\beta_{ij}x_i x_j + \\sum_{i<j<k}^{q}\\beta_{ijk}x_i x_j x_k + ... + \\varepsilon$$"}</MathJax>
                  </Box>
                  
                  <Typography paragraph>
                    This model is different from standard factorial models as it does not include an intercept term, and the interpretation of linear terms differs.
                  </Typography>
                </AccordionDetails>
              </Accordion>
            </Box>
          )}
        </Paper>
      </Box>
    </MathJaxContext>
  );
}

export default Fundamentals;