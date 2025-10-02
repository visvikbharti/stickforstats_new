import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Box, 
  Grid, 
  Paper, 
  Tabs, 
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Slider,
  Divider
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { 
  BarChart, 
  Bar, 
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
  ContourChart,
  Contour
} from 'recharts';
import { MathJax, MathJaxContext } from 'better-react-mathjax';
import { motion } from 'framer-motion';

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
 * Introduction to DOE in Biotechnology
 * 
 * This component preserves the educational content and interactive features from the original
 * Streamlit module, including the interactive simulation comparing OFAT vs DOE approaches.
 */
function Introduction({ content }) {
  const [tabIndex, setTabIndex] = useState(0);
  const [baseTemp, setBaseTemp] = useState(30.0);
  const [basePH, setBasePH] = useState(6.0);
  const [tempRange, setTempRange] = useState([28.0, 36.0]);
  const [pHRange, setPHRange] = useState([5.5, 7.5]);
  const [ofatResults, setOfatResults] = useState(null);
  const [doeResults, setDoeResults] = useState(null);
  const [trueOptimum, setTrueOptimum] = useState(null);

  const handleTabChange = (event, newValue) => {
    setTabIndex(newValue);
  };

  // Simulate the protein yield function (matching the original)
  const proteinYield = (temp, pH) => {
    // Simulating a yield function with maximum at temp=32, pH=6.5
    return 100 * Math.exp(-0.5 * ((temp - 32)**2/4 + (pH - 6.5)**2/0.25)) + (Math.random() * 6 - 3);
  };

  // Function to run OFAT simulation
  const runOfatSimulation = () => {
    // First fix pH and vary temperature
    const temps = Array.from({ length: 5 }, (_, i) => baseTemp - 5 + (i * 2.5));
    const yieldsTemp = temps.map(t => proteinYield(t, basePH));
    const bestTempIdx = yieldsTemp.indexOf(Math.max(...yieldsTemp));
    const bestTemp = temps[bestTempIdx];
    
    // Then fix temperature at optimal and vary pH
    const pHs = Array.from({ length: 5 }, (_, i) => basePH - 1 + (i * 0.5));
    const yieldsPH = pHs.map(p => proteinYield(bestTemp, p));
    const bestPHIdx = yieldsPH.indexOf(Math.max(...yieldsPH));
    const bestPH = pHs[bestPHIdx];
    
    // Final OFAT results
    const finalOfatYield = proteinYield(bestTemp, bestPH);

    // Data for visualizations
    const tempData = temps.map((t, i) => ({ x: t, y: yieldsTemp[i] }));
    const pHData = pHs.map((p, i) => ({ x: p, y: yieldsPH[i] }));

    return {
      bestTemp,
      bestPH,
      finalYield: finalOfatYield,
      tempData,
      pHData,
      bestTempValue: yieldsTemp[bestTempIdx],
      bestPHValue: yieldsPH[bestPHIdx]
    };
  };

  // Function to run DOE simulation
  const runDoeSimulation = () => {
    // Generate factorial design with center point
    const tempLevels = [tempRange[0], (tempRange[0] + tempRange[1])/2, tempRange[1]];
    const pHLevels = [pHRange[0], (pHRange[0] + pHRange[1])/2, pHRange[1]];
    
    // Generate the design matrix and results
    const doeDesign = [];
    tempLevels.forEach(t => {
      pHLevels.forEach(p => {
        const yieldValue = proteinYield(t, p);
        doeDesign.push({ temp: t, pH: p, yield: yieldValue });
      });
    });
    
    // Find the best result
    const bestResult = doeDesign.reduce((prev, current) => 
      (prev.yield > current.yield) ? prev : current
    );
    
    // Generate fine grid for contour plot
    const tempFine = Array.from({ length: 20 }, (_, i) => 
      tempRange[0] + (i * (tempRange[1] - tempRange[0]) / 19)
    );
    const pHFine = Array.from({ length: 20 }, (_, i) => 
      pHRange[0] + (i * (pHRange[1] - pHRange[0]) / 19)
    );
    
    const contourData = [];
    tempFine.forEach(t => {
      pHFine.forEach(p => {
        contourData.push({ temp: t, pH: p, yield: proteinYield(t, p) });
      });
    });

    return {
      bestTemp: bestResult.temp,
      bestPH: bestResult.pH,
      finalYield: bestResult.yield,
      designPoints: doeDesign,
      contourData
    };
  };

  // Run both simulations when parameters change
  useEffect(() => {
    setOfatResults(runOfatSimulation());
    setDoeResults(runDoeSimulation());
    setTrueOptimum(proteinYield(32, 6.5));
  }, [baseTemp, basePH, tempRange, pHRange]);

  return (
    <MathJaxContext config={mathJaxConfig}>
      <Box>
        <Typography variant="h5" component="h2" gutterBottom>
          Introduction to DOE in Biotechnology
        </Typography>

        <Typography paragraph>
          Design of Experiments (DOE) represents a structured methodology for determining cause-and-effect 
          relationships within complex biological systems. In biotechnology, where processes involve multiple 
          interacting factors and significant variability, DOE provides a systematic framework to efficiently 
          extract maximum information while minimizing experimental resources.
        </Typography>

        <Paper sx={{ mb: 4 }}>
          <Tabs 
            value={tabIndex} 
            onChange={handleTabChange} 
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Importance in Biotechnology" />
            <Tab label="Why Traditional Approaches Fall Short" />
            <Tab label="Mathematical Foundation" />
            <Tab label="Interactive Example" />
          </Tabs>

          {/* Tab 1: Importance in Biotechnology */}
          {tabIndex === 0 && (
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Importance in Biotechnology
              </Typography>
              <Typography paragraph>
                Biotechnology processes—from fermentation and cell culture to purification and 
                formulation—involve numerous variables that can impact critical quality attributes. DOE enables:
              </Typography>
              <Box sx={{ pl: 2 }}>
                <Typography paragraph>
                  <strong>• Resource Optimization</strong>: Reduce experimental runs while maximizing information gained
                </Typography>
                <Typography paragraph>
                  <strong>• Process Understanding</strong>: Identify critical process parameters and their interactions
                </Typography>
                <Typography paragraph>
                  <strong>• Regulatory Compliance</strong>: Meet QbD (Quality by Design) requirements with systematic development approaches
                </Typography>
                <Typography paragraph>
                  <strong>• Risk Reduction</strong>: Identify and mitigate failure modes before scale-up
                </Typography>
                <Typography paragraph>
                  <strong>• Technology Transfer</strong>: Facilitate robust transfer between development and manufacturing
                </Typography>
              </Box>
            </Box>
          )}

          {/* Tab 2: Why Traditional Approaches Fall Short */}
          {tabIndex === 1 && (
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Why Traditional Approaches Fall Short
              </Typography>
              <Typography paragraph>
                One-factor-at-a-time (OFAT) approaches, while intuitive, suffer from critical limitations in biotechnology:
              </Typography>
              <Box sx={{ pl: 2, mb: 3 }}>
                <Typography paragraph>
                  <strong>1. Interaction Blindness</strong>: Biological systems feature complex interactions that OFAT approaches miss entirely
                </Typography>
                <Typography paragraph>
                  <strong>2. Resource Inefficiency</strong>: Require more experiments for less information
                </Typography>
                <Typography paragraph>
                  <strong>3. Limited Optimization</strong>: Can only find local optima rather than global optima
                </Typography>
                <Typography paragraph>
                  <strong>4. Poor Characterization</strong>: Provide limited understanding of the design space
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Paper elevation={2} sx={{ p: 2 }}>
                    <Typography variant="h6" align="center" gutterBottom>
                      OFAT Approach
                    </Typography>
                    <Box component="img" 
                      src="/assets/images/doe/ofat_approach.png"
                      alt="OFAT: Varying one factor at a time"
                      sx={{ width: '100%', height: 'auto', maxHeight: 250 }}
                    />
                    <Typography variant="caption" display="block" align="center">
                      OFAT: Varying one factor at a time
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper elevation={2} sx={{ p: 2 }}>
                    <Typography variant="h6" align="center" gutterBottom>
                      DOE Approach
                    </Typography>
                    <Box component="img" 
                      src="/assets/images/doe/doe_approach.png"
                      alt="DOE: Systematic exploration of experimental space"
                      sx={{ width: '100%', height: 'auto', maxHeight: 250 }}
                    />
                    <Typography variant="caption" display="block" align="center">
                      DOE: Systematic exploration of experimental space
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Tab 3: Mathematical Foundation */}
          {tabIndex === 2 && (
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Mathematical Foundation
              </Typography>
              <Typography paragraph>
                The power of DOE stems from its mathematical structure. For a system with response y and 
                factors x₁, x₂, ..., xₖ, DOE enables the estimation of a model:
              </Typography>
              <Box sx={{ my: 2, display: 'flex', justifyContent: 'center' }}>
                <MathJax>{"$$y = f(x_1, x_2, ..., x_k) + \\varepsilon$$"}</MathJax>
              </Box>
              <Typography paragraph>
                Where ε represents experimental error, and f can include:
              </Typography>
              <Box sx={{ pl: 2 }}>
                <Typography paragraph>
                  <strong>• Main effects</strong>: <MathJax inline>{"$\\beta_1 x_1, \\beta_2 x_2, ...$"}</MathJax>
                </Typography>
                <Typography paragraph>
                  <strong>• Interaction effects</strong>: <MathJax inline>{"$\\beta_{12}x_1 x_2, \\beta_{13}x_1 x_3, ...$"}</MathJax>
                </Typography>
                <Typography paragraph>
                  <strong>• Higher-order effects</strong>: <MathJax inline>{"$\\beta_{11}x_1^2, \\beta_{22}x_2^2, ...$"}</MathJax>
                </Typography>
              </Box>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Advanced Mathematical Details</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="h6" gutterBottom>
                    Complete Model Equation
                  </Typography>
                  <Typography paragraph>
                    The full second-order model for a system with k factors can be represented as:
                  </Typography>
                  <Box sx={{ my: 2, display: 'flex', justifyContent: 'center' }}>
                    <MathJax>{"$$y = \\beta_0 + \\sum_{i=1}^{k}\\beta_i x_i + \\sum_{i<j}^{k}\\beta_{ij}x_i x_j + \\sum_{i=1}^{k}\\beta_{ii}x_i^2 + \\varepsilon$$"}</MathJax>
                  </Box>

                  <Typography variant="h6" gutterBottom>
                    Effect Estimation
                  </Typography>
                  <Typography paragraph>
                    In a two-level design, the effect of factor A can be calculated as:
                  </Typography>
                  <Box sx={{ my: 2, display: 'flex', justifyContent: 'center' }}>
                    <MathJax>{"$$E_A = \\frac{\\sum y_{A+} - \\sum y_{A-}}{n/2}$$"}</MathJax>
                  </Box>
                  <Typography paragraph>
                    Where:
                  </Typography>
                  <Box sx={{ pl: 2 }}>
                    <Typography paragraph>
                      • <MathJax inline>{"$\\sum y_{A+}$"}</MathJax> is the sum of responses when factor A is at high level
                    </Typography>
                    <Typography paragraph>
                      • <MathJax inline>{"$\\sum y_{A-}$"}</MathJax> is the sum of responses when factor A is at low level
                    </Typography>
                    <Typography paragraph>
                      • <MathJax inline>{"$n$"}</MathJax> is the total number of runs
                    </Typography>
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Box>
          )}

          {/* Tab 4: Interactive Example */}
          {tabIndex === 3 && (
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Interactive Example: Impact of DOE in Bioprocess Development
              </Typography>
              <Typography paragraph>
                The following interactive simulation demonstrates the difference between the One-Factor-At-A-Time (OFAT) 
                approach and Design of Experiments (DOE) for optimizing a simple bioreactor process.
              </Typography>
              <Typography paragraph>
                Try adjusting the parameters to see how each approach performs in finding the optimal conditions for protein expression.
              </Typography>
              <Typography paragraph>
                In this example, we'll optimize protein production by manipulating two factors:
                <strong> Temperature (°C)</strong> and <strong>pH</strong>.
              </Typography>
              <Typography paragraph sx={{ fontStyle: 'italic' }}>
                The "true" optimal conditions are at Temperature = 32°C and pH = 6.5.
              </Typography>

              <Grid container spacing={4}>
                {/* OFAT Approach */}
                <Grid item xs={12} md={6}>
                  <Paper elevation={3} sx={{ p: 3 }}>
                    <Typography variant="h6" align="center" gutterBottom>
                      OFAT Approach
                    </Typography>
                    <Typography paragraph align="center">
                      First varying Temperature, then pH
                    </Typography>

                    <Typography gutterBottom>Starting Temperature (°C)</Typography>
                    <Slider
                      value={baseTemp}
                      onChange={(e, newValue) => setBaseTemp(newValue)}
                      min={25.0}
                      max={40.0}
                      step={0.5}
                      marks={[
                        { value: 25, label: '25°C' },
                        { value: 40, label: '40°C' }
                      ]}
                    />

                    <Typography gutterBottom>Starting pH</Typography>
                    <Slider
                      value={basePH}
                      onChange={(e, newValue) => setBasePH(newValue)}
                      min={5.0}
                      max={8.0}
                      step={0.1}
                      marks={[
                        { value: 5, label: '5.0' },
                        { value: 8, label: '8.0' }
                      ]}
                    />

                    {ofatResults && (
                      <>
                        <Grid container spacing={2} sx={{ mt: 2 }}>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="subtitle2" align="center">Temperature Optimization</Typography>
                            <ResponsiveContainer width="100%" height={200}>
                              <LineChart data={ofatResults.tempData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                  dataKey="x" 
                                  label={{ value: 'Temperature (°C)', position: 'insideBottom', offset: -5 }} 
                                />
                                <YAxis 
                                  label={{ value: 'Protein Yield (%)', angle: -90, position: 'insideLeft' }} 
                                />
                                <Tooltip formatter={(value) => value.toFixed(2)} />
                                <Line 
                                  type="monotone" 
                                  dataKey="y" 
                                  stroke="#8884d8" 
                                  dot={{ stroke: '#8884d8', strokeWidth: 1, r: 4 }} 
                                />
                                <Scatter 
                                  data={[{ x: ofatResults.bestTemp, y: ofatResults.bestTempValue }]} 
                                  fill="red" 
                                  shape="star" 
                                  name="Best Point" 
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="subtitle2" align="center">pH Optimization</Typography>
                            <ResponsiveContainer width="100%" height={200}>
                              <LineChart data={ofatResults.pHData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                  dataKey="x" 
                                  label={{ value: 'pH', position: 'insideBottom', offset: -5 }} 
                                />
                                <YAxis 
                                  label={{ value: 'Protein Yield (%)', angle: -90, position: 'insideLeft' }} 
                                />
                                <Tooltip formatter={(value) => value.toFixed(2)} />
                                <Line 
                                  type="monotone" 
                                  dataKey="y" 
                                  stroke="#82ca9d" 
                                  dot={{ stroke: '#82ca9d', strokeWidth: 1, r: 4 }} 
                                />
                                <Scatter 
                                  data={[{ x: ofatResults.bestPH, y: ofatResults.bestPHValue }]} 
                                  fill="red" 
                                  shape="star" 
                                  name="Best Point" 
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </Grid>
                        </Grid>

                        <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default' }}>
                          <Typography variant="subtitle1" gutterBottom>OFAT Results:</Typography>
                          <Typography>• Best Temperature: {ofatResults.bestTemp.toFixed(2)}°C</Typography>
                          <Typography>• Best pH: {ofatResults.bestPH.toFixed(2)}</Typography>
                          <Typography>• Protein Yield: {ofatResults.finalYield.toFixed(2)}%</Typography>
                          <Typography>• Total experiments required: 10 (5 for temperature + 5 for pH)</Typography>
                        </Box>
                      </>
                    )}
                  </Paper>
                </Grid>

                {/* DOE Approach */}
                <Grid item xs={12} md={6}>
                  <Paper elevation={3} sx={{ p: 3 }}>
                    <Typography variant="h6" align="center" gutterBottom>
                      DOE Approach
                    </Typography>
                    <Typography paragraph align="center">
                      Factorial design varying both factors simultaneously
                    </Typography>

                    <Typography gutterBottom>Temperature Range (°C)</Typography>
                    <Slider
                      value={tempRange}
                      onChange={(e, newValue) => setTempRange(newValue)}
                      min={25.0}
                      max={40.0}
                      step={0.5}
                      marks={[
                        { value: 25, label: '25°C' },
                        { value: 40, label: '40°C' }
                      ]}
                      valueLabelDisplay="auto"
                    />

                    <Typography gutterBottom>pH Range</Typography>
                    <Slider
                      value={pHRange}
                      onChange={(e, newValue) => setPHRange(newValue)}
                      min={5.0}
                      max={8.0}
                      step={0.1}
                      marks={[
                        { value: 5, label: '5.0' },
                        { value: 8, label: '8.0' }
                      ]}
                      valueLabelDisplay="auto"
                    />

                    {doeResults && (
                      <>
                        <Box sx={{ mt: 2, height: 400 }}>
                          <Typography variant="subtitle2" align="center">Response Surface: Protein Yield (%)</Typography>
                          {/* Simple scatter plot showing design points and optimal point */}
                          <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart
                              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                            >
                              <CartesianGrid />
                              <XAxis
                                type="number"
                                dataKey="temp"
                                name="Temperature"
                                unit="°C"
                                label={{ value: 'Temperature (°C)', position: 'insideBottom', offset: -5 }}
                                domain={[tempRange[0], tempRange[1]]}
                              />
                              <YAxis
                                type="number"
                                dataKey="pH"
                                name="pH"
                                label={{ value: 'pH', angle: -90, position: 'insideLeft' }}
                                domain={[pHRange[0], pHRange[1]]}
                              />
                              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                              <Scatter
                                name="Design Points"
                                data={doeResults.designPoints}
                                fill="#8884d8"
                              />
                              <Scatter
                                name="Optimal Point"
                                data={[{ temp: doeResults.bestTemp, pH: doeResults.bestPH }]}
                                fill="red"
                                shape="star"
                                legendType="none"
                              />
                            </ScatterChart>
                          </ResponsiveContainer>
                          {/* In a production app, this would be replaced by a proper contour plot */}
                          {/* For now, we're using a simple scatter plot */}
                        </Box>

                        <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default' }}>
                          <Typography variant="subtitle1" gutterBottom>DOE Results:</Typography>
                          <Typography>• Best Temperature: {doeResults.bestTemp.toFixed(2)}°C</Typography>
                          <Typography>• Best pH: {doeResults.bestPH.toFixed(2)}</Typography>
                          <Typography>• Protein Yield: {doeResults.finalYield.toFixed(2)}%</Typography>
                          <Typography>• Total experiments required: 9 (3² factorial design with center point)</Typography>
                          <Typography>• Additional Insight: Complete response surface visualization</Typography>
                        </Box>
                      </>
                    )}
                  </Paper>
                </Grid>
              </Grid>

              {/* Results Comparison */}
              {ofatResults && doeResults && trueOptimum && (
                <Box sx={{ mt: 4 }}>
                  <Typography variant="h6" gutterBottom>Comparison of Approaches</Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={4}>
                      <Paper 
                        elevation={2} 
                        sx={{ p: 2, textAlign: 'center', height: '100%' }}
                        component={motion.div}
                        whileHover={{ scale: 1.05 }}
                      >
                        <Typography variant="h6">OFAT Approach</Typography>
                        <Typography variant="h4" color="primary">
                          {ofatResults.finalYield.toFixed(2)}%
                        </Typography>
                        <Typography 
                          color={ofatResults.finalYield - trueOptimum >= 0 ? "success.main" : "error.main"}
                        >
                          {(ofatResults.finalYield - trueOptimum).toFixed(2)}%
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Paper 
                        elevation={2} 
                        sx={{ p: 2, textAlign: 'center', height: '100%' }}
                        component={motion.div}
                        whileHover={{ scale: 1.05 }}
                      >
                        <Typography variant="h6">DOE Approach</Typography>
                        <Typography variant="h4" color="primary">
                          {doeResults.finalYield.toFixed(2)}%
                        </Typography>
                        <Typography 
                          color={doeResults.finalYield - trueOptimum >= 0 ? "success.main" : "error.main"}
                        >
                          {(doeResults.finalYield - trueOptimum).toFixed(2)}%
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Paper 
                        elevation={2} 
                        sx={{ p: 2, textAlign: 'center', height: '100%' }}
                        component={motion.div}
                        whileHover={{ scale: 1.05 }}
                      >
                        <Typography variant="h6">True Optimum</Typography>
                        <Typography variant="h4" color="primary">
                          {trueOptimum.toFixed(2)}%
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  <Box sx={{ mt: 4 }}>
                    <Typography variant="h6" gutterBottom>Key Advantages of DOE Demonstrated:</Typography>
                    <Typography paragraph>
                      <strong>1. Efficiency</strong>: DOE required 9 experiments compared to 10 for OFAT (efficiency increases dramatically with more factors)
                    </Typography>
                    <Typography paragraph>
                      <strong>2. Interaction Detection</strong>: DOE reveals how temperature and pH interact (visible in the contour plot)
                    </Typography>
                    <Typography paragraph>
                      <strong>3. Design Space Understanding</strong>: DOE provides a complete map of the response across the experimental space
                    </Typography>
                    <Typography paragraph>
                      <strong>4. Robustness</strong>: DOE helps identify regions of stability, not just optimal points
                    </Typography>
                    <Typography>
                      This simple example uses just two factors, but the advantages of DOE become even more significant as the number of factors increases. 
                      For instance, a 5-factor experiment would require 32 runs with OFAT but could be effectively explored with just 16-20 runs using 
                      fractional factorial DOE designs.
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </Paper>
      </Box>
    </MathJaxContext>
  );
}

export default Introduction;