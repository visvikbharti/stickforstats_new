/**
 * Lesson 1: Introduction to Enzyme Kinetics
 *
 * Comprehensive introduction to enzyme catalysis covering:
 * - What are enzymes and how they work
 * - Reaction rates and rate constants
 * - Substrate-enzyme interactions
 * - The steady-state assumption
 * - Real-world applications
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { alpha } from '@mui/material/styles';
import {
  Box,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Card,
  CardContent,
  Grid,
  Slider,
  Alert,
  AlertTitle,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip
} from '@mui/material';

// Icons
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScienceIcon from '@mui/icons-material/Science';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import InfoIcon from '@mui/icons-material/Info';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

// ============================================================================
// CONSTANTS
// ============================================================================

const STEPS = [
  { label: 'What Are Enzymes?', description: 'The biological catalysts' },
  { label: 'Reaction Rates', description: 'Measuring enzyme activity' },
  { label: 'Enzyme-Substrate Complex', description: 'The ES intermediate' },
  { label: 'Steady-State Kinetics', description: 'The fundamental assumption' },
  { label: 'Key Takeaways', description: 'Summary and practice' }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const Lesson1_EnzymeKineticsIntro = ({ onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [simulationParams, setSimulationParams] = useState({
    substrate: 50,
    enzyme: 10,
    kcat: 100
  });
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  const handleNext = () => {
    setActiveStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  // Interactive simulation
  useEffect(() => {
    if (!canvasRef.current || activeStep !== 2) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    let particles = [];
    let enzyme = { x: width / 2, y: height / 2, bound: false, substrate: null };

    // Create substrate particles
    const createParticles = () => {
      particles = [];
      for (let i = 0; i < simulationParams.substrate / 5; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          bound: false,
          isProduct: false
        });
      }
    };

    createParticles();

    const animate = () => {
      ctx.fillStyle = '#fafafa';
      ctx.fillRect(0, 0, width, height);

      // Draw enzyme
      ctx.fillStyle = enzyme.bound ? '#4CAF50' : '#2196F3';
      ctx.beginPath();
      ctx.arc(enzyme.x, enzyme.y, 25, 0, Math.PI * 2);
      ctx.fill();

      // Draw enzyme label
      ctx.fillStyle = 'white';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('E', enzyme.x, enzyme.y + 4);

      // Update and draw particles
      particles.forEach((p, i) => {
        if (!p.bound) {
          p.x += p.vx;
          p.y += p.vy;

          // Bounce off walls
          if (p.x < 10 || p.x > width - 10) p.vx *= -1;
          if (p.y < 10 || p.y > height - 10) p.vy *= -1;

          // Check collision with enzyme
          const dx = p.x - enzyme.x;
          const dy = p.y - enzyme.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 35 && !enzyme.bound && !p.isProduct) {
            enzyme.bound = true;
            enzyme.substrate = i;
            p.bound = true;
            p.x = enzyme.x;
            p.y = enzyme.y;

            // Release after a delay (simulating catalysis)
            setTimeout(() => {
              enzyme.bound = false;
              p.bound = false;
              p.isProduct = true;
              p.vx = (Math.random() - 0.5) * 4;
              p.vy = (Math.random() - 0.5) * 4;
            }, 500);
          }
        }

        // Draw particle
        ctx.fillStyle = p.isProduct ? '#FF9800' : '#E91E63';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.isProduct ? 8 : 10, 0, Math.PI * 2);
        ctx.fill();

        // Label
        ctx.fillStyle = 'white';
        ctx.font = '8px Arial';
        ctx.fillText(p.isProduct ? 'P' : 'S', p.x, p.y + 3);
      });

      // Legend
      ctx.fillStyle = '#333';
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('S = Substrate', 10, height - 40);
      ctx.fillText('P = Product', 10, height - 25);
      ctx.fillText('E = Enzyme', 10, height - 10);

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [activeStep, simulationParams]);

  // Render step content
  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
              What Are Enzymes?
            </Typography>

            <Typography paragraph>
              Enzymes are <strong>biological catalysts</strong>—molecules (usually proteins) that dramatically
              accelerate chemical reactions without being consumed in the process. They are essential for
              virtually all biochemical processes in living organisms.
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
              <AlertTitle>Key Insight</AlertTitle>
              Enzymes can increase reaction rates by factors of 10<sup>6</sup> to 10<sup>17</sup>,
              making reactions that would take years occur in milliseconds.
            </Alert>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      <ScienceIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Properties of Enzymes
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon>
                        <ListItemText primary="Highly specific for their substrates" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon>
                        <ListItemText primary="Work under mild conditions (physiological pH, temperature)" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon>
                        <ListItemText primary="Can be regulated (activated or inhibited)" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon>
                        <ListItemText primary="Not consumed during the reaction" />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      <LightbulbIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Why Study Enzyme Kinetics?
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText
                          primary="Drug Discovery"
                          secondary="Most drugs work by inhibiting specific enzymes"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Disease Diagnosis"
                          secondary="Enzyme levels in blood indicate health conditions"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Biotechnology"
                          secondary="Industrial processes use enzymes for production"
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Paper sx={{ p: 2, mt: 3, bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
              <Typography variant="subtitle2" gutterBottom>
                The Enzyme-Substrate Reaction:
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '1.1rem',
                  textAlign: 'center',
                  p: 2,
                  bgcolor: 'background.paper',
                  borderRadius: 1
                }}
              >
                E + S ⇌ ES → E + P
              </Typography>
              <Typography variant="caption" display="block" sx={{ mt: 1, textAlign: 'center' }}>
                Where E = Enzyme, S = Substrate, ES = Enzyme-Substrate complex, P = Product
              </Typography>
            </Paper>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
              Reaction Rates
            </Typography>

            <Typography paragraph>
              The <strong>reaction rate</strong> (velocity, v) tells us how fast substrate is converted
              to product. In enzyme kinetics, we typically measure the <strong>initial velocity</strong> (v₀)
              to avoid complications from product inhibition and substrate depletion.
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      Rate Definition
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: '1.1rem',
                        bgcolor: 'background.default',
                        p: 2,
                        borderRadius: 1,
                        textAlign: 'center'
                      }}
                    >
                      v = d[P]/dt = -d[S]/dt
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 2 }}>
                      The rate equals the change in product concentration over time,
                      which equals the negative change in substrate concentration.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      Why Initial Velocity?
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText
                          primary="[S] ≈ [S]₀ (substrate not depleted)"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="[P] ≈ 0 (no product inhibition)"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Reverse reaction negligible"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Steady-state achieved"
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Alert severity="warning" sx={{ mt: 3 }}>
              <AlertTitle>Important</AlertTitle>
              Always measure initial rates! As substrate depletes or product accumulates,
              the kinetics become more complex and the simple Michaelis-Menten model may not apply.
            </Alert>

            <Paper sx={{ p: 3, mt: 3, bgcolor: (theme) => alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
              <Typography variant="h6" gutterBottom>
                Rate Constants
              </Typography>
              <Typography paragraph>
                For the simple enzyme reaction E + S ⇌ ES → E + P:
              </Typography>
              <Box sx={{ fontFamily: 'monospace', bgcolor: 'background.paper', p: 2, borderRadius: 1 }}>
                <Typography>• k₁ = rate constant for E + S → ES (association)</Typography>
                <Typography>• k₋₁ = rate constant for ES → E + S (dissociation)</Typography>
                <Typography>• k₂ (or kcat) = rate constant for ES → E + P (catalysis)</Typography>
              </Box>
            </Paper>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
              The Enzyme-Substrate Complex
            </Typography>

            <Typography paragraph>
              The formation of the <strong>enzyme-substrate (ES) complex</strong> is central to enzyme
              catalysis. This transient intermediate allows the enzyme to position the substrate correctly
              and lower the activation energy of the reaction.
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={7}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Interactive Simulation: Enzyme-Substrate Binding
                  </Typography>
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={300}
                    style={{ border: '1px solid #e0e0e0', borderRadius: 4, width: '100%', height: 'auto' }}
                  />
                  <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                    Watch as substrate (S) molecules collide with the enzyme (E), form an ES complex
                    (enzyme turns green), and are converted to product (P).
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} md={5}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      Key Concepts
                    </Typography>

                    <Typography variant="subtitle2" sx={{ mt: 2 }}>
                      Lock and Key Model
                    </Typography>
                    <Typography variant="body2" paragraph>
                      Proposed by Emil Fischer (1894): The substrate fits into the enzyme's
                      active site like a key in a lock.
                    </Typography>

                    <Typography variant="subtitle2">
                      Induced Fit Model
                    </Typography>
                    <Typography variant="body2" paragraph>
                      Proposed by Koshland (1958): The enzyme changes shape upon substrate
                      binding to achieve optimal fit.
                    </Typography>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="subtitle2">
                      Active Site Features:
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText primary="• Binding pocket for substrate" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="• Catalytic residues" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="• Transition state stabilization" />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Alert severity="info" sx={{ mt: 3 }}>
              <AlertTitle>The ES Complex Is Key</AlertTitle>
              The existence of the ES complex explains:
              <List dense>
                <ListItem>• Enzyme saturation at high [S]</ListItem>
                <ListItem>• Why initial velocity approaches a maximum (Vmax)</ListItem>
                <ListItem>• How competitive inhibitors work</ListItem>
              </List>
            </Alert>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
              The Steady-State Assumption
            </Typography>

            <Typography paragraph>
              The <strong>steady-state assumption</strong> is the foundation of Michaelis-Menten kinetics.
              It states that after an initial transient phase, the concentration of the ES complex
              remains essentially constant—it is formed as fast as it breaks down.
            </Typography>

            <Paper sx={{ p: 3, mb: 3, bgcolor: (theme) => alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
              <Typography variant="h6" gutterBottom color="success.dark">
                Mathematical Statement
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '1.2rem',
                  textAlign: 'center',
                  p: 2,
                  bgcolor: 'background.paper',
                  borderRadius: 1
                }}
              >
                d[ES]/dt = 0 &nbsp; (at steady state)
              </Typography>
              <Typography variant="body2" sx={{ mt: 2 }}>
                This means: Rate of ES formation = Rate of ES breakdown
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'monospace',
                  textAlign: 'center',
                  mt: 2,
                  p: 1,
                  bgcolor: 'background.paper',
                  borderRadius: 1
                }}
              >
                k₁[E][S] = k₋₁[ES] + k₂[ES]
              </Typography>
            </Paper>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      When Is It Valid?
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon>
                        <ListItemText primary="[S] >> [E] (excess substrate)" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon>
                        <ListItemText primary="After initial transient (usually < 1 second)" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon>
                        <ListItemText primary="Before significant substrate depletion" />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      The Michaelis Constant
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: '1.1rem',
                        textAlign: 'center',
                        p: 2,
                        bgcolor: 'background.default',
                        borderRadius: 1
                      }}
                    >
                      Km = (k₋₁ + k₂) / k₁
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 2 }}>
                      Km has units of concentration and represents the substrate concentration
                      at which v = Vmax/2.
                    </Typography>
                    <Alert severity="info" sx={{ mt: 2 }}>
                      Lower Km = Higher affinity
                    </Alert>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Alert severity="warning" sx={{ mt: 3 }}>
              <AlertTitle>Historical Note</AlertTitle>
              Michaelis and Menten (1913) originally assumed <strong>rapid equilibrium</strong>
              (k₋₁ >> k₂), not steady state. Briggs and Haldane (1925) generalized this to the
              steady-state assumption, which is more broadly applicable.
            </Alert>
          </Box>
        );

      case 4:
        return (
          <Box>
            <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
              Key Takeaways
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Paper sx={{ p: 3, bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
                  <Typography variant="h6" gutterBottom>
                    Summary of Lesson 1
                  </Typography>

                  <List>
                    <ListItem>
                      <ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon>
                      <ListItemText
                        primary="Enzymes are biological catalysts"
                        secondary="They accelerate reactions without being consumed, with high specificity"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon>
                      <ListItemText
                        primary="The ES complex is central to catalysis"
                        secondary="Substrates bind to the active site, forming a transient intermediate"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon>
                      <ListItemText
                        primary="Initial velocity (v₀) is the key measurement"
                        secondary="Measured before substrate depletion or product accumulation"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon>
                      <ListItemText
                        primary="Steady-state assumption: d[ES]/dt = 0"
                        secondary="ES concentration remains constant during the measurement period"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon>
                      <ListItemText
                        primary="Km = (k₋₁ + k₂) / k₁"
                        secondary="The Michaelis constant indicates substrate affinity"
                      />
                    </ListItem>
                  </List>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Alert severity="success" icon={<LightbulbIcon />}>
                  <AlertTitle>Ready for the Next Lesson?</AlertTitle>
                  In Lesson 2, we'll derive the complete Michaelis-Menten equation step by step
                  and explore its biological significance.
                </Alert>
              </Grid>

              <Grid item xs={12}>
                <Button
                  variant="contained"
                  size="large"
                  color="success"
                  onClick={onComplete}
                  fullWidth
                  startIcon={<CheckCircleIcon />}
                >
                  Complete Lesson 1
                </Button>
              </Grid>
            </Grid>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      {/* Progress Stepper */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {STEPS.map((step, index) => (
            <Step key={step.label}>
              <StepLabel>
                <Typography variant="caption">{step.label}</Typography>
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Lesson Content */}
      <Paper sx={{ p: 4 }}>
        {renderStepContent()}

        {/* Navigation */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            onClick={handleBack}
            disabled={activeStep === 0}
            startIcon={<NavigateBeforeIcon />}
          >
            Previous
          </Button>

          <Chip
            label={`Step ${activeStep + 1} of ${STEPS.length}`}
            color="primary"
            variant="outlined"
          />

          {activeStep < STEPS.length - 1 && (
            <Button
              onClick={handleNext}
              variant="contained"
              endIcon={<NavigateNextIcon />}
            >
              Next
            </Button>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default Lesson1_EnzymeKineticsIntro;
