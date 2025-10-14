import React, { useState, useMemo } from 'react';
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
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MathJax } from 'better-react-mathjax';

// Import existing visualization
import InteractionPlot from '../../visualizations/InteractionPlot';

/**
 * Lesson 3: Interaction Effects Visualized
 *
 * Teaches what interactions are, how to detect them, and why they matter
 * Uses interactive visualizations to build intuition
 */

const Lesson03_Interactions = ({ onComplete }) => {
  const [interactionStrength, setInteractionStrength] = useState(0);
  const [factorAEffect, setFactorAEffect] = useState(5);
  const [factorBEffect, setFactorBEffect] = useState(3);

  // Sample data for the real DOE example
  const realExperimentData = [
    {
      id: 'temp_ph',
      factor1: 'Temperature (°C)',
      factor2: 'pH',
      points: [
        { x: '60°C', line1: 45, line2: 52 },
        { x: '80°C', line1: 58, line2: 78 }
      ],
      pValue: 0.012
    },
    {
      id: 'pressure_time',
      factor1: 'Pressure (bar)',
      factor2: 'Time',
      points: [
        { x: '2 bar', line1: 62, line2: 65 },
        { x: '4 bar', line1: 70, line2: 85 }
      ],
      pValue: 0.008
    }
  ];

  // Generate data for interaction plot
  const interactionData = useMemo(() => {
    const baseYield = 50;

    // When B is Low
    const yieldA_low_B_low = baseYield;
    const yieldA_high_B_low = baseYield + factorAEffect;

    // When B is High (interaction affects A's effect)
    const yieldA_low_B_high = baseYield + factorBEffect;
    const yieldA_high_B_high = baseYield + factorAEffect + factorBEffect + interactionStrength;

    return {
      bLow: [
        { factorA: 'Low', yield: yieldA_low_B_low },
        { factorA: 'High', yield: yieldA_high_B_low }
      ],
      bHigh: [
        { factorA: 'Low', yield: yieldA_low_B_high },
        { factorA: 'High', yield: yieldA_high_B_high }
      ]
    };
  }, [interactionStrength, factorAEffect, factorBEffect]);

  // Calculate whether lines are parallel
  const linesParallel = Math.abs(interactionStrength) < 0.5;

  return (
    <Box>
      {/* Introduction */}
      <Paper elevation={2} sx={{ p: 4, mb: 3, bgcolor: '#f8f9fa' }}>
        <Typography variant="h4" gutterBottom sx={{ color: '#1976d2', fontWeight: 600 }}>
          Interaction Effects Visualized
        </Typography>

        <Typography variant="h6" paragraph sx={{ mt: 2 }}>
          When 1 + 1 ≠ 2: Understanding Synergy and Antagonism
        </Typography>

        <Typography paragraph>
          An <strong>interaction</strong> occurs when the effect of one factor <em>depends on</em> the
          level of another factor. This is where factorial designs truly shine — interactions are
          invisible to OFAT experiments but critical for optimization.
        </Typography>

        <Alert severity="warning" icon={<TrendingUpIcon />}>
          <Typography variant="body2">
            <strong>Why Interactions Matter:</strong> In biological and chemical systems, factors
            rarely act independently. Temperature affects enzyme kinetics, which interacts with pH.
            Substrate concentration interacts with catalyst loading. Missing interactions = missing
            optimal conditions.
          </Typography>
        </Alert>
      </Paper>

      {/* What is an Interaction? */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: '#1976d2' }}>
          🔗 What is an Interaction?
        </Typography>

        <MathJax>
          <Typography paragraph>
            Mathematically, an interaction means the effect of Factor A is <strong>not constant</strong>
            across levels of Factor B.
          </Typography>

          <Box sx={{ p: 3, bgcolor: '#e3f2fd', borderRadius: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Main Effect (No Interaction)
            </Typography>

            <Typography paragraph>
              {"\\[ \\text{Effect of A} = \\text{constant, regardless of B} \\]"}
            </Typography>

            <Typography variant="body2">
              Example: Increasing temperature by 5°C always increases yield by 10 units, whether
              pH is 6 or 7.
            </Typography>
          </Box>

          <Box sx={{ p: 3, bgcolor: '#fff3e0', borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>
              Interaction (Factors Combine)
            </Typography>

            <Typography paragraph>
              {"\\[ \\text{Effect of A} = f(\\text{level of B}) \\]"}
            </Typography>

            <Typography variant="body2">
              Example: At pH 6, increasing temperature by 5°C increases yield by 5 units. But at
              pH 7, the same temperature increase yields +15 units. <strong>The factors synergize!</strong>
            </Typography>
          </Box>
        </MathJax>
      </Paper>

      {/* Interactive Visualization */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: '#1976d2' }}>
          🎮 Interactive: Build Your Own Interaction
        </Typography>

        <Typography paragraph>
          Adjust the sliders below to see how interactions affect the relationship between factors.
          Watch the interaction plot change!
        </Typography>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Typography gutterBottom>Main Effect of Factor A: {factorAEffect}</Typography>
            <Slider
              value={factorAEffect}
              onChange={(e, val) => setFactorAEffect(val)}
              min={0}
              max={15}
              step={0.5}
              valueLabelDisplay="auto"
            />
            <Typography variant="caption">
              Effect when going from A-low to A-high (at B-low)
            </Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography gutterBottom>Main Effect of Factor B: {factorBEffect}</Typography>
            <Slider
              value={factorBEffect}
              onChange={(e, val) => setFactorBEffect(val)}
              min={0}
              max={15}
              step={0.5}
              valueLabelDisplay="auto"
            />
            <Typography variant="caption">
              Effect when going from B-low to B-high (at A-low)
            </Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography gutterBottom>
              Interaction Strength: {interactionStrength}
            </Typography>
            <Slider
              value={interactionStrength}
              onChange={(e, val) => setInteractionStrength(val)}
              min={-10}
              max={10}
              step={0.5}
              valueLabelDisplay="auto"
              marks={[
                { value: -10, label: 'Antagonism' },
                { value: 0, label: 'None' },
                { value: 10, label: 'Synergy' }
              ]}
            />
            <Typography variant="caption">
              How much A and B combine (positive = synergy, negative = antagonism)
            </Typography>
          </Grid>
        </Grid>

        {/* Interaction Plot */}
        <Box sx={{ mb: 3 }}>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="factorA" type="category" allowDuplicatedCategory={false} />
              <YAxis label={{ value: 'Yield', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Line
                data={interactionData.bLow}
                type="monotone"
                dataKey="yield"
                stroke="#8884d8"
                strokeWidth={3}
                name="Factor B = Low"
              />
              <Line
                data={interactionData.bHigh}
                type="monotone"
                dataKey="yield"
                stroke="#82ca9d"
                strokeWidth={3}
                name="Factor B = High"
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>

        {linesParallel ? (
          <Alert severity="info">
            <Typography variant="body2">
              <strong>Parallel Lines = No Interaction:</strong> The effect of A is the same regardless
              of B's level. The two factors act independently.
            </Typography>
          </Alert>
        ) : (
          <Alert severity="success">
            <Typography variant="body2">
              <strong>Non-Parallel Lines = Interaction Present!</strong> The effect of A depends on B's
              level. {interactionStrength > 0 ? 'Positive (synergistic)' : 'Negative (antagonistic)'} interaction.
            </Typography>
          </Alert>
        )}
      </Paper>

      {/* Types of Interactions */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: '#1976d2' }}>
          📊 Types of Interactions
        </Typography>

        <Grid container spacing={2}>
          {/* No Interaction */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Chip label="Parallel Lines" color="default" size="small" sx={{ mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  No Interaction
                </Typography>
                <Typography variant="body2" paragraph>
                  Factors act independently. The effect of A is the same at all levels of B. Lines
                  are parallel on interaction plot.
                </Typography>
                <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                  Example: Increasing temperature always adds +10 yield, whether pH is 6 or 7.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Synergistic Interaction */}
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: '#e8f5e9' }}>
              <CardContent>
                <Chip label="Lines Diverge" color="success" size="small" sx={{ mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Synergistic Interaction (Positive)
                </Typography>
                <Typography variant="body2" paragraph>
                  Factors enhance each other. The combined effect is <em>greater</em> than the sum of
                  individual effects. Lines diverge.
                </Typography>
                <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                  Example: High temp + high pH gives +25 yield, but each alone gives only +8.
                  Together they're better!
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Antagonistic Interaction */}
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: '#ffebee' }}>
              <CardContent>
                <Chip label="Lines Converge" color="error" size="small" sx={{ mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Antagonistic Interaction (Negative)
                </Typography>
                <Typography variant="body2" paragraph>
                  Factors interfere with each other. The combined effect is <em>less</em> than the sum
                  of individual effects. Lines converge or cross.
                </Typography>
                <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                  Example: High temp gives +10, high pH gives +8, but together they give only +5.
                  They fight each other!
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Crossover Interaction */}
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: '#fff3e0' }}>
              <CardContent>
                <Chip label="Lines Cross" color="warning" size="small" sx={{ mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Crossover Interaction
                </Typography>
                <Typography variant="body2" paragraph>
                  The optimal level of A <em>changes</em> depending on B. At B-low, A-low is best.
                  At B-high, A-high is best. Lines cross.
                </Typography>
                <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                  Example: At low pH, low temp is best. At high pH, high temp is best. No universal
                  optimum!
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Real Example with Existing Visualization */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: '#1976d2' }}>
          🧪 Real DOE Example: Temperature × pH Interaction
        </Typography>

        <Typography paragraph sx={{ mb: 3 }}>
          Below is an interactive visualization showing a real factorial experiment. Notice how the
          response surface reveals interaction patterns.
        </Typography>

        <InteractionPlot data={realExperimentData} />
      </Paper>

      {/* Detecting Interactions */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ color: '#1976d2' }}>
          🔍 How to Detect Interactions in Your Data
        </Typography>

        <MathJax>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            1. Visual Method: Interaction Plot
          </Typography>

          <Typography paragraph>
            Plot response vs Factor A, with separate lines for each level of Factor B. If lines are
            <strong> not parallel</strong>, interaction exists.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            2. Mathematical Method: Calculate Interaction Effect
          </Typography>

          <Typography paragraph>
            For a 2² design:
          </Typography>

          <Typography align="center" paragraph sx={{ fontSize: '1.1rem' }}>
            {"\\[ \\text{AB Interaction} = \\frac{[(Y_{++} - Y_{+-}) - (Y_{-+} - Y_{--})]}{2} \\]"}
          </Typography>

          <Typography variant="body2">
            Where:
            <br />
            • Y₊₊ = Response at A-high, B-high
            <br />
            • Y₊₋ = Response at A-high, B-low
            <br />
            • Y₋₊ = Response at A-low, B-high
            <br />
            • Y₋₋ = Response at A-low, B-low
          </Typography>

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              If the interaction effect is large relative to the main effects (or statistical error),
              the interaction is <strong>significant</strong> and must be considered in optimization.
            </Typography>
          </Alert>
        </MathJax>
      </Paper>

      {/* Summary and Completion */}
      <Paper elevation={3} sx={{ p: 4, mt: 4, bgcolor: '#e8f5e9' }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#388e3c' }}>
          ✅ Key Takeaways
        </Typography>

        <Box sx={{ pl: 2 }}>
          <Typography paragraph>
            • <strong>Interaction = effect of A depends on B</strong> (and vice versa)
          </Typography>
          <Typography paragraph>
            • <strong>Visual test:</strong> Non-parallel lines on interaction plot = interaction present
          </Typography>
          <Typography paragraph>
            • <strong>Synergistic:</strong> Factors enhance each other (1+1 > 2)
          </Typography>
          <Typography paragraph>
            • <strong>Antagonistic:</strong> Factors interfere (1+1 &lt; 2)
          </Typography>
          <Typography paragraph>
            • <strong>OFAT experiments miss interactions</strong> — that's why factorial designs are essential!
          </Typography>
          <Typography paragraph>
            • <strong>Crossover interactions</strong> mean optimal A depends on level of B
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

export default Lesson03_Interactions;
