import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Card,
  CardContent,
  Alert,
  AlertTitle,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Table,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  Chip
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { MathJax } from 'better-react-mathjax';

/**
 * Lesson 5: Blocking & Randomization
 *
 * Core experimental design principles for controlling variability
 * Covers complete randomization, blocking, and randomized block designs
 */

const Lesson05_Blocking = ({ onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);

  const handleNext = () => setActiveStep(prev => Math.min(prev + 1, 4));
  const handleBack = () => setActiveStep(prev => Math.max(prev - 1, 0));

  // Example data showing benefit of blocking
  const experimentData = useMemo(() => {
    // Completely Randomized Design (CRD)
    const crd = {
      treatment1: [85, 90, 75, 80], // high variability
      treatment2: [95, 88, 78, 92],
      mse: 82.5 // Mean Square Error
    };

    // Randomized Block Design (RBD) - same data, blocked
    const rbd = {
      blocks: [
        { name: 'Block 1 (Good)', t1: 85, t2: 95 },
        { name: 'Block 2 (Good)', t1: 90, t2: 88 },
        { name: 'Block 3 (Poor)', t1: 75, t2: 78 },
        { name: 'Block 4 (Poor)', t1: 80, t2: 92 }
      ],
      mse: 12.5 // Much lower MSE after removing block effects
    };

    return { crd, rbd };
  }, []);

  return (
    <Box>
      <Stepper activeStep={activeStep} orientation="vertical">
        {/* Step 1: Why Randomization? */}
        <Step>
          <StepLabel>
            <Typography variant="h6">The Power of Randomization</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography variant="h6" gutterBottom>
                Randomization: The Foundation of Valid Experiments
              </Typography>

              <Alert severity="info" sx={{ mb: 2 }}>
                <AlertTitle>Fisher's Insight (1920s)</AlertTitle>
                Randomization is the <strong>only</strong> way to ensure unbiased estimates and
                valid statistical tests without making strong assumptions.
              </Alert>

              <Typography paragraph>
                <strong>Randomization</strong> means assigning treatments to experimental units (or vice versa)
                using a random mechanism like coin flips or random number tables.
              </Typography>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ bgcolor: '#e8f5e9' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        ✓ What Randomization Achieves
                      </Typography>
                      <ul>
                        <li><Typography variant="body2">Eliminates selection bias</Typography></li>
                        <li><Typography variant="body2">Balances unknown confounders on average</Typography></li>
                        <li><Typography variant="body2">Validates probability calculations (p-values, CIs)</Typography></li>
                        <li><Typography variant="body2">Allows causal inference</Typography></li>
                      </ul>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card sx={{ bgcolor: '#ffebee' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        ✗ Without Randomization
                      </Typography>
                      <ul>
                        <li><Typography variant="body2">Systematic bias possible</Typography></li>
                        <li><Typography variant="body2">Confounding variables may distort results</Typography></li>
                        <li><Typography variant="body2">Can't distinguish treatment effect from selection</Typography></li>
                        <li><Typography variant="body2">Observational study, not true experiment</Typography></li>
                      </ul>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Paper sx={{ p: 2, bgcolor: '#e3f2fd', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
                  Example: Testing a New Fertilizer
                </Typography>

                <Typography paragraph>
                  <strong>❌ Non-Random Assignment:</strong> Farmer applies new fertilizer to his best fields,
                  old fertilizer to poor fields. New fertilizer appears better, but is it the fertilizer or the soil?
                </Typography>

                <Typography paragraph>
                  <strong>✓ Random Assignment:</strong> Randomly assign fields to fertilizers. Now any difference
                  is due to the fertilizer (plus random noise), not pre-existing soil quality.
                </Typography>
              </Paper>

              <Alert severity="warning">
                <AlertTitle>Common Mistake</AlertTitle>
                "Haphazard" ≠ Random. Don't just pick whatever's convenient. Use a formal randomization procedure!
              </Alert>

              <Button variant="contained" onClick={handleNext} sx={{ mt: 2 }}>
                Learn About Blocking
              </Button>
            </Paper>
          </StepContent>
        </Step>

        {/* Step 2: The Blocking Principle */}
        <Step>
          <StepLabel>
            <Typography variant="h6">The Blocking Principle</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography variant="h6" gutterBottom>
                "Block What You Can, Randomize What You Cannot"
              </Typography>

              <Typography paragraph>
                <strong>Blocking</strong> is grouping experimental units into homogeneous groups (blocks),
                then randomizing treatments <em>within</em> each block.
              </Typography>

              <Paper sx={{ p: 3, bgcolor: '#fff3e0', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
                  Why Block?
                </Typography>

                <Typography paragraph>
                  Experimental units are rarely identical. They vary in:
                </Typography>

                <ul>
                  <li><Typography>Material properties (batch-to-batch variation)</Typography></li>
                  <li><Typography>Time (day-to-day conditions)</Typography></li>
                  <li><Typography>Space (location effects)</Typography></li>
                  <li><Typography>Operators (person-to-person differences)</Typography></li>
                </ul>

                <Alert severity="success" sx={{ mt: 2 }}>
                  By grouping similar units into blocks and comparing treatments <strong>within</strong> blocks,
                  we remove the block-to-block variation from our error term, increasing precision!
                </Alert>
              </Paper>

              <Typography variant="h6" gutterBottom>
                How Blocking Works
              </Typography>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Chip label="Step 1" color="primary" size="small" sx={{ mb: 1 }} />
                      <Typography variant="h6" gutterBottom>
                        Identify Blocks
                      </Typography>
                      <Typography variant="body2">
                        Group units that are similar in some nuisance factor
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        Example: Each day is a block
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Chip label="Step 2" color="primary" size="small" sx={{ mb: 1 }} />
                      <Typography variant="h6" gutterBottom>
                        Randomize Within
                      </Typography>
                      <Typography variant="body2">
                        Randomly assign treatments to units within each block
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        Example: Random order each day
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Chip label="Step 3" color="primary" size="small" sx={{ mb: 1 }} />
                      <Typography variant="h6" gutterBottom>
                        Analyze
                      </Typography>
                      <Typography variant="body2">
                        Remove block effects from error in ANOVA
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        Example: Two-way ANOVA
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Paper sx={{ p: 2, bgcolor: 'white', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
                  Example: Agricultural Field Trial
                </Typography>

                <Typography paragraph>
                  Testing 4 fertilizers on a field with a fertility gradient (north side is better soil).
                </Typography>

                <Typography paragraph>
                  <strong>Without Blocking (CRD):</strong> Randomly assign fertilizers to all 16 plots.
                  Soil variability inflates error, making it harder to detect fertilizer differences.
                </Typography>

                <Typography paragraph>
                  <strong>With Blocking (RBD):</strong> Divide field into 4 strips (blocks) running north-south.
                  Within each strip, randomly assign the 4 fertilizers. Now we compare fertilizers on
                  similar soil, removing fertility gradient from error.
                </Typography>
              </Paper>

              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button onClick={handleBack}>Back</Button>
                <Button variant="contained" onClick={handleNext}>See the Impact</Button>
              </Box>
            </Paper>
          </StepContent>
        </Step>

        {/* Step 3: Blocking Reduces Error */}
        <Step>
          <StepLabel>
            <Typography variant="h6">How Blocking Reduces Error</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography paragraph>
                Here's the same data analyzed two ways: as a Completely Randomized Design (CRD)
                and as a Randomized Block Design (RBD).
              </Typography>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, bgcolor: 'white' }}>
                    <Typography variant="h6" gutterBottom>
                      Completely Randomized Design
                    </Typography>

                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Treatment 1</strong></TableCell>
                          <TableCell><strong>Treatment 2</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell>85, 90, 75, 80</TableCell>
                          <TableCell>95, 88, 78, 92</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={2}>
                            <Typography variant="caption">
                              <strong>MSE (Error):</strong> {experimentData.crd.mse.toFixed(1)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>

                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      High variability within treatments makes it hard to see differences
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, bgcolor: '#e8f5e9' }}>
                    <Typography variant="h6" gutterBottom>
                      Randomized Block Design
                    </Typography>

                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Block</strong></TableCell>
                          <TableCell><strong>T1</strong></TableCell>
                          <TableCell><strong>T2</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {experimentData.rbd.blocks.map((block, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{block.name}</TableCell>
                            <TableCell>{block.t1}</TableCell>
                            <TableCell>{block.t2}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell colSpan={3}>
                            <Typography variant="caption">
                              <strong>MSE (Error):</strong> {experimentData.rbd.mse.toFixed(1)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>

                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      Block effects removed → much lower error!
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              <Alert severity="success" sx={{ mb: 2 }}>
                <AlertTitle>The Power of Blocking</AlertTitle>
                By accounting for blocks, MSE dropped from {experimentData.crd.mse} to {experimentData.rbd.mse}
                —a <strong>{((1 - experimentData.rbd.mse/experimentData.crd.mse) * 100).toFixed(0)}% reduction</strong>!
                This makes it much easier to detect treatment differences.
              </Alert>

              <Paper sx={{ p: 2, bgcolor: '#e3f2fd' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
                  Statistical Model
                </Typography>

                <Typography paragraph>
                  <strong>Randomized Block Design ANOVA:</strong>
                </Typography>

                <MathJax>
                  {"\\[ y_{ij} = \\mu + \\tau_i + \\beta_j + \\epsilon_{ij} \\]"}
                </MathJax>

                <Typography paragraph sx={{ mt: 1 }}>
                  Where:
                </Typography>

                <ul>
                  <li><Typography variant="body2">μ = overall mean</Typography></li>
                  <li><Typography variant="body2">τᵢ = effect of treatment i</Typography></li>
                  <li><Typography variant="body2">βⱼ = effect of block j (nuisance, removed from error)</Typography></li>
                  <li><Typography variant="body2">εᵢⱼ = random error (much smaller than CRD!)</Typography></li>
                </ul>
              </Paper>

              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button onClick={handleBack}>Back</Button>
                <Button variant="contained" onClick={handleNext}>Continue</Button>
              </Box>
            </Paper>
          </StepContent>
        </Step>

        {/* Step 4: Blocking Strategies */}
        <Step>
          <StepLabel>
            <Typography variant="h6">Blocking Strategies</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography variant="h6" gutterBottom>
                Common Blocking Factors
              </Typography>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" color="primary" gutterBottom>
                        Time-Based Blocks
                      </Typography>
                      <ul>
                        <li><Typography variant="body2"><strong>Day:</strong> Environmental conditions vary day-to-day</Typography></li>
                        <li><Typography variant="body2"><strong>Shift:</strong> Different operators/equipment state</Typography></li>
                        <li><Typography variant="body2"><strong>Season:</strong> Long-term trends</Typography></li>
                      </ul>
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        Run all treatments each day/shift
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" color="primary" gutterBottom>
                        Space-Based Blocks
                      </Typography>
                      <ul>
                        <li><Typography variant="body2"><strong>Location:</strong> Position in field, oven, etc.</Typography></li>
                        <li><Typography variant="body2"><strong>Machine:</strong> Equipment-to-equipment variation</Typography></li>
                        <li><Typography variant="body2"><strong>Lab:</strong> Multi-site studies</Typography></li>
                      </ul>
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        Test all treatments in each location
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" color="primary" gutterBottom>
                        Material-Based Blocks
                      </Typography>
                      <ul>
                        <li><Typography variant="body2"><strong>Batch:</strong> Raw material lots</Typography></li>
                        <li><Typography variant="body2"><strong>Subject:</strong> Repeated measures (each person is a block)</Typography></li>
                        <li><Typography variant="body2"><strong>Litter:</strong> Animals from same mother</Typography></li>
                      </ul>
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        Apply all treatments to each block
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" color="primary" gutterBottom>
                        Participant Characteristics
                      </Typography>
                      <ul>
                        <li><Typography variant="body2"><strong>Age group:</strong> Children, adults, elderly</Typography></li>
                        <li><Typography variant="body2"><strong>Severity:</strong> Mild, moderate, severe disease</Typography></li>
                        <li><Typography variant="body2"><strong>Gender:</strong> Male, female blocks</Typography></li>
                      </ul>
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        Balance treatments within demographic groups
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Typography variant="h6" gutterBottom>
                Design Principles
              </Typography>

              <Paper sx={{ p: 2, bgcolor: 'white', mb: 2 }}>
                <ul>
                  <li>
                    <Typography paragraph>
                      <strong>Block on known nuisance factors</strong> that affect response but aren't of interest
                    </Typography>
                  </li>
                  <li>
                    <Typography paragraph>
                      <strong>Blocks should be homogeneous</strong> within, heterogeneous between
                    </Typography>
                  </li>
                  <li>
                    <Typography paragraph>
                      <strong>Randomize treatments within blocks</strong> to avoid confounding
                    </Typography>
                  </li>
                  <li>
                    <Typography paragraph>
                      <strong>Include all treatments in each block</strong> when possible (complete blocks)
                    </Typography>
                  </li>
                  <li>
                    <Typography>
                      <strong>Use incomplete blocks</strong> if complete blocks aren't feasible (e.g., Latin squares)
                    </Typography>
                  </li>
                </ul>
              </Paper>

              <Alert severity="warning">
                <AlertTitle>When NOT to Block</AlertTitle>
                Don't create too many small blocks ({"<"} 5 units per block). The degrees of freedom lost
                to estimating block effects may not be worth the precision gain. Rule of thumb: each block
                should have at least as many units as treatments.
              </Alert>

              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button onClick={handleBack}>Back</Button>
                <Button variant="contained" onClick={handleNext}>Continue</Button>
              </Box>
            </Paper>
          </StepContent>
        </Step>

        {/* Step 5: Summary */}
        <Step>
          <StepLabel>
            <Typography variant="h6">Summary & Completion</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                🎯 Blocking & Randomization Mastered!
              </Typography>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 40, mb: 1 }} />
                      <Typography variant="h6" gutterBottom>
                        Key Principles
                      </Typography>
                      <ul>
                        <li><Typography variant="body2">Randomization eliminates bias</Typography></li>
                        <li><Typography variant="body2">Blocking reduces error variance</Typography></li>
                        <li><Typography variant="body2">Together: unbiased + precise estimates</Typography></li>
                        <li><Typography variant="body2">Block what you can, randomize what you cannot</Typography></li>
                      </ul>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card sx={{ bgcolor: '#e3f2fd' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary">
                        Design Checklist
                      </Typography>
                      <ul>
                        <li><Typography variant="body2">✓ Identify nuisance factors</Typography></li>
                        <li><Typography variant="body2">✓ Group units into blocks</Typography></li>
                        <li><Typography variant="body2">✓ Randomize within blocks</Typography></li>
                        <li><Typography variant="body2">✓ Analyze with block effects</Typography></li>
                        <li><Typography variant="body2">✓ Report increased precision</Typography></li>
                      </ul>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Alert severity="success" sx={{ mb: 2 }}>
                <AlertTitle>The Fisher Legacy</AlertTitle>
                Randomization + Blocking + Factorial Design = The revolutionary trio of modern experimental
                design, all developed by R.A. Fisher in the 1920s-1930s. These principles remain fundamental today!
              </Alert>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button onClick={handleBack}>Back</Button>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircleIcon />}
                  onClick={onComplete}
                >
                  Complete Lesson
                </Button>
              </Box>
            </Paper>
          </StepContent>
        </Step>
      </Stepper>
    </Box>
  );
};

export default Lesson05_Blocking;
