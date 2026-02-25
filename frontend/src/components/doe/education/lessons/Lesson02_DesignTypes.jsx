import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';
import { MathJax } from 'better-react-mathjax';

/**
 * Lesson 2: Design Types & Applications
 *
 * Explores full factorial, fractional factorial, and screening designs
 * Shows when to use each type and the trade-offs involved
 */

const Lesson02_DesignTypes = ({ onComplete }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const [selectedDesign, setSelectedDesign] = useState('full');

  // Example: 2^3 design
  const fullFactorial3 = [
    { A: -1, B: -1, C: -1 },
    { A: +1, B: -1, C: -1 },
    { A: -1, B: +1, C: -1 },
    { A: +1, B: +1, C: -1 },
    { A: -1, B: -1, C: +1 },
    { A: +1, B: -1, C: +1 },
    { A: -1, B: +1, C: +1 },
    { A: +1, B: +1, C: +1 }
  ];

  // 2^(3-1) fractional factorial (Resolution III)
  const fractionalFactorial = [
    { A: -1, B: -1, C: +1 },  // C = AB
    { A: +1, B: -1, C: -1 },
    { A: -1, B: +1, C: -1 },
    { A: +1, B: +1, C: +1 }
  ];

  // Plackett-Burman for 7 factors in 8 runs
  const plackettBurman = [
    { Run: 1, Factors: [+1, +1, +1, -1, +1, -1, -1] },
    { Run: 2, Factors: [-1, +1, +1, +1, -1, +1, -1] },
    { Run: 3, Factors: [-1, -1, +1, +1, +1, -1, +1] },
    { Run: 4, Factors: [+1, -1, -1, +1, +1, +1, -1] },
    { Run: 5, Factors: [-1, +1, -1, -1, +1, +1, +1] },
    { Run: 6, Factors: [+1, -1, +1, -1, -1, +1, +1] },
    { Run: 7, Factors: [+1, +1, -1, +1, -1, -1, +1] },
    { Run: 8, Factors: [-1, -1, -1, -1, -1, -1, -1] }
  ];

  return (
    <Box>
      {/* Introduction */}
      <Paper elevation={2} sx={{ p: 4, mb: 3, bgcolor: theme.palette.grey[isDarkMode ? 900 : 50] }}>
        <Typography variant="h4" gutterBottom sx={{ color: theme.palette.primary.main, fontWeight: 600 }}>
          Design Types & Applications
        </Typography>

        <Typography variant="h6" paragraph sx={{ mt: 2 }}>
          Choosing the Right Experimental Design
        </Typography>

        <Typography paragraph>
          You've learned why factorial designs are powerful. But what if you have 6 factors to study?
          A full 2⁶ = 64-run experiment might be too expensive. Enter <strong>fractional factorial
          designs</strong> and <strong>screening designs</strong> — strategic ways to get the most
          information from fewer experiments.
        </Typography>
      </Paper>

      {/* Design Type Overview */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: theme.palette.primary.main }}>
          🎯 The DOE Design Spectrum
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Card
              sx={{
                height: '100%',
                border: selectedDesign === 'full' ? `2px solid ${theme.palette.primary.main}` : 'none',
                cursor: 'pointer'
              }}
              onClick={() => setSelectedDesign('full')}
            >
              <CardContent>
                <Chip label="Full Information" color="primary" size="small" sx={{ mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Full Factorial
                </Typography>
                <Typography variant="body2" paragraph>
                  Test all combinations. Get all main effects, all interactions. Most experiments.
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Use when: ≤5 factors, interactions critical, resources available
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card
              sx={{
                height: '100%',
                border: selectedDesign === 'fractional' ? `2px solid ${theme.palette.primary.main}` : 'none',
                cursor: 'pointer'
              }}
              onClick={() => setSelectedDesign('fractional')}
            >
              <CardContent>
                <Chip label="Efficient" color="warning" size="small" sx={{ mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Fractional Factorial
                </Typography>
                <Typography variant="body2" paragraph>
                  Test a strategic subset. Get main effects + some interactions. Half (or fewer) experiments.
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Use when: 5-8 factors, main effects prioritized, budget limited
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card
              sx={{
                height: '100%',
                border: selectedDesign === 'screening' ? `2px solid ${theme.palette.primary.main}` : 'none',
                cursor: 'pointer'
              }}
              onClick={() => setSelectedDesign('screening')}
            >
              <CardContent>
                <Chip label="Exploration" color="success" size="small" sx={{ mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Screening Design
                </Typography>
                <Typography variant="body2" paragraph>
                  Identify vital few factors from many. Main effects only. Minimal experiments.
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Use when: Many factors (8-20+), identify important ones, early stage
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Full Factorial Design */}
      {selectedDesign === 'full' && (
        <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
          <Typography variant="h5" gutterBottom sx={{ color: theme.palette.primary.main }}>
            📊 Full Factorial Design
          </Typography>

          <MathJax>
            <Typography paragraph>
              A <strong>full factorial design</strong> tests every possible combination of factor levels.
              For k factors at 2 levels each, you need {"\\(2^k\\)"} runs.
            </Typography>

            <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>What You Get:</strong> Complete information about all main effects and all
                interactions (2-way, 3-way, etc.). This is the "gold standard" for understanding
                complex systems.
              </Typography>
            </Alert>

            <Typography variant="h6" gutterBottom>
              Example: 2³ Full Factorial (3 factors, 8 runs)
            </Typography>

            <TableContainer component={Paper} sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Run</strong></TableCell>
                    <TableCell align="center"><strong>Factor A</strong></TableCell>
                    <TableCell align="center"><strong>Factor B</strong></TableCell>
                    <TableCell align="center"><strong>Factor C</strong></TableCell>
                    <TableCell><strong>Interpretation</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fullFactorial3.map((run, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell align="center">{run.A > 0 ? '+' : '−'}</TableCell>
                      <TableCell align="center">{run.B > 0 ? '+' : '−'}</TableCell>
                      <TableCell align="center">{run.C > 0 ? '+' : '−'}</TableCell>
                      <TableCell>
                        {run.A < 0 && run.B < 0 && run.C < 0 && 'All low'}
                        {run.A > 0 && run.B > 0 && run.C > 0 && 'All high'}
                        {!(run.A < 0 && run.B < 0 && run.C < 0) && !(run.A > 0 && run.B > 0 && run.C > 0) && 'Mixed'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.light, 0.2), borderRadius: 1 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                Effects You Can Estimate:
              </Typography>
              <Typography variant="body2">
                • 3 main effects: A, B, C
                <br />
                • 3 two-way interactions: AB, AC, BC
                <br />
                • 1 three-way interaction: ABC
                <br />
                • <strong>Total: 7 effects from 8 runs</strong>
              </Typography>
            </Box>

            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>The Cost of Completeness:</strong> As k increases, {"\\(2^k\\)"} grows
                exponentially. 2⁵ = 32 runs is manageable. 2⁸ = 256 runs? Probably not feasible.
              </Typography>
            </Alert>
          </MathJax>
        </Paper>
      )}

      {/* Fractional Factorial Design */}
      {selectedDesign === 'fractional' && (
        <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
          <Typography variant="h5" gutterBottom sx={{ color: theme.palette.primary.main }}>
            ⚡ Fractional Factorial Design
          </Typography>

          <MathJax>
            <Typography paragraph>
              A <strong>fractional factorial</strong> runs only a carefully chosen <em>fraction</em> of
              the full design. Common fractions: 1/2, 1/4, 1/8. You sacrifice some interaction
              information to reduce experiment count.
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Example: 2³⁻¹ Fractional Factorial (3 factors, 4 runs)
            </Typography>

            <Typography paragraph>
              This is a <strong>half-fraction</strong> of the full 2³ design. We use a <em>generator</em>
              like C = AB, which means we only run combinations where C equals the product of A and B.
            </Typography>

            <TableContainer component={Paper} sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Run</strong></TableCell>
                    <TableCell align="center"><strong>Factor A</strong></TableCell>
                    <TableCell align="center"><strong>Factor B</strong></TableCell>
                    <TableCell align="center"><strong>Factor C (= AB)</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fractionalFactorial.map((run, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell align="center">{run.A > 0 ? '+' : '−'}</TableCell>
                      <TableCell align="center">{run.B > 0 ? '+' : '−'}</TableCell>
                      <TableCell align="center">{run.C > 0 ? '+' : '−'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>The Trade-off: Confounding (Aliasing)</strong>
                <br />
                Because C = AB, we can't distinguish between the effect of C and the AB interaction.
                They are <em>confounded</em>. You get {"\\(\\hat{C} + \\widehat{AB}\\)"} — the sum of both effects.
              </Typography>
            </Alert>

            <Box sx={{ p: 2, bgcolor: alpha(theme.palette.warning.light, 0.2), borderRadius: 1, mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                Resolution Concept
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>Resolution III:</strong> Main effects confounded with 2-way interactions
                <br />
                <strong>Resolution IV:</strong> Main effects clear; 2-way interactions confounded with each other
                <br />
                <strong>Resolution V:</strong> Main effects and 2-way interactions clear; 2-way confounded with 3-way
              </Typography>
              <Typography variant="body2">
                <em>Higher resolution = more information, but more runs needed.</em>
              </Typography>
            </Box>

            <Typography variant="h6" gutterBottom>
              When to Use Fractional Factorials
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card sx={{ bgcolor: alpha(theme.palette.success.light, 0.2) }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: theme.palette.success.dark }}>
                      ✓ Good Situations
                    </Typography>
                    <Typography variant="body2">
                      • 5-8 factors to study
                      <br />
                      • Main effects likely larger than interactions
                      <br />
                      • Budget/time constraints
                      <br />
                      • Follow-up experiments planned if needed
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card sx={{ bgcolor: alpha(theme.palette.error.light, 0.2) }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: theme.palette.error.dark }}>
                      ✗ Bad Situations
                    </Typography>
                    <Typography variant="body2">
                      • Interactions expected to be large
                      <br />
                      • Need to identify all interaction effects
                      <br />
                      • Only one shot at the experiment
                      <br />
                      • Resolution too low to separate key effects
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </MathJax>
        </Paper>
      )}

      {/* Screening Designs */}
      {selectedDesign === 'screening' && (
        <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
          <Typography variant="h5" gutterBottom sx={{ color: theme.palette.primary.main }}>
            🔍 Screening Designs (Plackett-Burman)
          </Typography>

          <MathJax>
            <Typography paragraph>
              When you have <strong>many factors</strong> (10, 15, even 20+) and want to quickly
              identify which few are actually important, use a <strong>screening design</strong>.
              The most common: <strong>Plackett-Burman</strong>.
            </Typography>

            <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Plackett-Burman Philosophy:</strong> Test k factors in just k+1 runs
                (or next multiple of 4). Estimate main effects only. Assume interactions negligible.
                Perfect for initial exploration.
              </Typography>
            </Alert>

            <Typography variant="h6" gutterBottom>
              Example: 7 Factors in 8 Runs
            </Typography>

            <Typography paragraph>
              Traditionally, a full 2⁷ = 128 runs. Plackett-Burman: just 8 runs!
            </Typography>

            <TableContainer component={Paper} sx={{ mb: 3, maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Run</strong></TableCell>
                    {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(f => (
                      <TableCell key={f} align="center"><strong>{f}</strong></TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {plackettBurman.map((run, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{run.Run}</TableCell>
                      {run.Factors.map((val, i) => (
                        <TableCell key={i} align="center">
                          {val > 0 ? '+' : '−'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ p: 2, bgcolor: alpha(theme.palette.success.light, 0.2), borderRadius: 1, mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                What You Get:
              </Typography>
              <Typography variant="body2">
                • Estimates of all 7 main effects
                <br />
                • <strong>NO information about interactions</strong>
                <br />
                • Main effects confounded with complex interactions (assumes they're small)
                <br />
                • Identifies which factors matter most for follow-up study
              </Typography>
            </Box>

            <Typography variant="h6" gutterBottom>
              The Screening → Optimization Workflow
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Card sx={{ bgcolor: alpha(theme.palette.primary.light, 0.2) }}>
                  <CardContent>
                    <Chip label="Stage 1" color="primary" size="small" sx={{ mb: 1 }} />
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      Screening
                    </Typography>
                    <Typography variant="body2">
                      Plackett-Burman with 10-20 factors. Identify vital few (typically 3-5).
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card sx={{ bgcolor: alpha(theme.palette.warning.light, 0.2) }}>
                  <CardContent>
                    <Chip label="Stage 2" color="warning" size="small" sx={{ mb: 1 }} />
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      Characterization
                    </Typography>
                    <Typography variant="body2">
                      Full or fractional factorial on the vital few. Study main effects + interactions.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card sx={{ bgcolor: alpha(theme.palette.success.light, 0.2) }}>
                  <CardContent>
                    <Chip label="Stage 3" color="success" size="small" sx={{ mb: 1 }} />
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      Optimization
                    </Typography>
                    <Typography variant="body2">
                      Response surface methods (Lesson 5) to find optimal settings.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </MathJax>
        </Paper>
      )}

      {/* Decision Guide */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: theme.palette.primary.main }}>
          🎓 Design Selection Guide
        </Typography>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Situation</strong></TableCell>
                <TableCell><strong>Recommended Design</strong></TableCell>
                <TableCell><strong>Runs Needed</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>2-4 factors, interactions critical</TableCell>
                <TableCell>Full Factorial</TableCell>
                <TableCell>4-16 runs</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>5-7 factors, some interactions expected</TableCell>
                <TableCell>Fractional Factorial (Resolution V)</TableCell>
                <TableCell>16-32 runs</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>5-8 factors, main effects focus</TableCell>
                <TableCell>Fractional Factorial (Resolution IV)</TableCell>
                <TableCell>8-16 runs</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>8-15 factors, identify vital few</TableCell>
                <TableCell>Plackett-Burman</TableCell>
                <TableCell>12-16 runs</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>15-30 factors, initial screening</TableCell>
                <TableCell>Plackett-Burman (larger)</TableCell>
                <TableCell>20-32 runs</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Summary and Completion */}
      <Paper elevation={3} sx={{ p: 4, mt: 4, bgcolor: alpha(theme.palette.success.light, 0.2) }}>
        <Typography variant="h6" gutterBottom sx={{ color: theme.palette.success.dark }}>
          ✅ Key Takeaways
        </Typography>

        <Box sx={{ pl: 2 }}>
          <Typography paragraph>
            • <strong>Full factorial:</strong> Complete information, all effects + interactions, 2^k runs
          </Typography>
          <Typography paragraph>
            • <strong>Fractional factorial:</strong> Strategic subset, main effects + some interactions, fewer runs
          </Typography>
          <Typography paragraph>
            • <strong>Resolution matters:</strong> Higher resolution = clearer separation of effects
          </Typography>
          <Typography paragraph>
            • <strong>Screening designs:</strong> Many factors → identify vital few, main effects only
          </Typography>
          <Typography paragraph>
            • <strong>Sequential approach:</strong> Screen → Characterize → Optimize
          </Typography>
        </Box>

        {onComplete && (
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button
              variant="contained"
              color="success"
              size="large"
              onClick={onComplete}
              startIcon={<CheckCircleIcon />}
            >
              Mark Lesson Complete
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default Lesson02_DesignTypes;
