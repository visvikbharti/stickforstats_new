/**
 * Lesson 4: Enzyme Inhibition
 *
 * Comprehensive coverage of reversible enzyme inhibition:
 * - Competitive inhibition
 * - Non-competitive inhibition
 * - Uncompetitive inhibition
 * - Mixed inhibition
 * - Ki determination
 * - Lineweaver-Burk pattern recognition
 *
 * ~900 lines of educational content
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { alpha } from '@mui/material/styles';
import {
  Box,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Slider,
  Grid,
  Card,
  CardContent,
  Alert,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField
} from '@mui/material';
import {
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  Block as BlockIcon,
  CheckCircle as CheckIcon,
  Compare as CompareIcon
} from '@mui/icons-material';

const STEPS = [
  'Introduction to Enzyme Inhibition',
  'Competitive Inhibition',
  'Non-Competitive Inhibition',
  'Uncompetitive Inhibition',
  'Mixed Inhibition',
  'Pattern Recognition & Ki',
  'Practice Problems'
];

const INHIBITION_TYPES = {
  competitive: {
    name: 'Competitive',
    color: '#d32f2f',
    description: 'Inhibitor binds to active site',
    vmaxEffect: 'Unchanged',
    kmEffect: 'Increased (apparent)',
    formula: 'Km,app = Km(1 + [I]/Ki)',
    lwbPattern: 'Lines intersect at Y-axis (same 1/Vmax)'
  },
  noncompetitive: {
    name: 'Non-Competitive',
    color: '#1976d2',
    description: 'Inhibitor binds away from active site',
    vmaxEffect: 'Decreased',
    kmEffect: 'Unchanged',
    formula: 'Vmax,app = Vmax/(1 + [I]/Ki)',
    lwbPattern: 'Lines intersect at X-axis (same -1/Km)'
  },
  uncompetitive: {
    name: 'Uncompetitive',
    color: '#388e3c',
    description: 'Inhibitor binds only to ES complex',
    vmaxEffect: 'Decreased',
    kmEffect: 'Decreased (apparent)',
    formula: 'Both Vmax and Km divided by (1 + [I]/Ki)',
    lwbPattern: 'Parallel lines'
  },
  mixed: {
    name: 'Mixed',
    color: '#7b1fa2',
    description: 'Inhibitor binds to E and ES with different affinities',
    vmaxEffect: 'Decreased',
    kmEffect: 'Can increase or decrease',
    formula: 'Two inhibition constants: Ki and Ki\'',
    lwbPattern: 'Lines intersect left of Y-axis'
  }
};

const Lesson4_EnzymeInhibition = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [params, setParams] = useState({
    Vmax: 100,
    Km: 20,
    inhibitorConc: 0,
    Ki: 10
  });
  const [inhibitionType, setInhibitionType] = useState('competitive');
  const [showAllTypes, setShowAllTypes] = useState(false);
  const [practiceAnswer, setPracticeAnswer] = useState('');
  const [practiceResult, setPracticeResult] = useState(null);

  const mmCanvasRef = useRef(null);
  const lwbCanvasRef = useRef(null);
  const schemeCanvasRef = useRef(null);

  // Calculate apparent parameters based on inhibition type
  const getApparentParams = useCallback((type, Vmax, Km, I, Ki) => {
    const alpha = 1 + I / Ki;
    switch (type) {
      case 'competitive':
        return { Vmax: Vmax, Km: Km * alpha };
      case 'noncompetitive':
        return { Vmax: Vmax / alpha, Km: Km };
      case 'uncompetitive':
        return { Vmax: Vmax / alpha, Km: Km / alpha };
      case 'mixed':
        // Mixed: different binding to E vs ES
        const alphaPrime = 1 + I / (Ki * 2); // Ki' = 2*Ki for demo
        return { Vmax: Vmax / alphaPrime, Km: Km * alpha / alphaPrime };
      default:
        return { Vmax, Km };
    }
  }, []);

  // Draw Michaelis-Menten curves with inhibition
  useEffect(() => {
    const canvas = mmCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 50;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const maxS = 200;
    const maxV = params.Vmax * 1.2;

    const xScale = (width - 2 * padding) / maxS;
    const yScale = (height - 2 * padding) / maxV;

    // Grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 5; i++) {
      const x = padding + (i / 5) * (width - 2 * padding);
      const y = padding + (i / 5) * (height - 2 * padding);
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Draw uninhibited curve
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let S = 0; S <= maxS; S += 1) {
      const v = (params.Vmax * S) / (params.Km + S);
      const x = padding + S * xScale;
      const y = height - padding - v * yScale;
      if (S === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw inhibited curves
    const typesToDraw = showAllTypes
      ? Object.keys(INHIBITION_TYPES)
      : [inhibitionType];

    typesToDraw.forEach(type => {
      if (params.inhibitorConc === 0 && !showAllTypes) return;

      const apparent = getApparentParams(type, params.Vmax, params.Km, params.inhibitorConc || 10, params.Ki);
      ctx.strokeStyle = INHIBITION_TYPES[type].color;
      ctx.lineWidth = 2;
      ctx.setLineDash(showAllTypes ? [5, 5] : []);
      ctx.beginPath();
      for (let S = 0; S <= maxS; S += 1) {
        const v = (apparent.Vmax * S) / (apparent.Km + S);
        const x = padding + S * xScale;
        const y = height - padding - v * yScale;
        if (S === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // Vmax line
    ctx.strokeStyle = '#ff9800';
    ctx.setLineDash([5, 5]);
    const vmaxY = height - padding - params.Vmax * yScale;
    ctx.beginPath();
    ctx.moveTo(padding, vmaxY);
    ctx.lineTo(width - padding, vmaxY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Labels
    ctx.fillStyle = '#333333';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('[S]', width / 2, height - 10);

    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('v', 0, 0);
    ctx.restore();

    // Legend
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    let legendY = padding + 20;
    ctx.fillStyle = '#333333';
    ctx.fillText('— No inhibitor', width - padding - 100, legendY);

    if (showAllTypes) {
      Object.entries(INHIBITION_TYPES).forEach(([type, info]) => {
        legendY += 18;
        ctx.fillStyle = info.color;
        ctx.fillText(`--- ${info.name}`, width - padding - 100, legendY);
      });
    } else if (params.inhibitorConc > 0) {
      legendY += 18;
      ctx.fillStyle = INHIBITION_TYPES[inhibitionType].color;
      ctx.fillText(`— + Inhibitor`, width - padding - 100, legendY);
    }

  }, [params, inhibitionType, showAllTypes, getApparentParams]);

  // Draw Lineweaver-Burk with inhibition
  useEffect(() => {
    const canvas = lwbCanvasRef.current;
    if (!canvas || activeStep < 1) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 60;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const substrates = [5, 10, 20, 50, 100, 200];

    // Calculate LWB data for uninhibited
    const uninhibited = substrates.map(S => ({
      x: 1 / S,
      y: 1 / ((params.Vmax * S) / (params.Km + S))
    }));

    // Calculate scales
    const maxX = Math.max(...uninhibited.map(d => d.x)) * 1.3;
    const minX = -0.15;
    const xRange = maxX - minX;

    let maxY = Math.max(...uninhibited.map(d => d.y));

    // Get inhibited data
    const apparent = getApparentParams(inhibitionType, params.Vmax, params.Km, params.inhibitorConc || 10, params.Ki);
    const inhibited = substrates.map(S => ({
      x: 1 / S,
      y: 1 / ((apparent.Vmax * S) / (apparent.Km + S))
    }));
    maxY = Math.max(maxY, ...inhibited.map(d => d.y)) * 1.2;
    const minY = -maxY * 0.1;
    const yRange = maxY - minY;

    const xToCanvas = x => padding + ((x - minX) / xRange) * (width - 2 * padding);
    const yToCanvas = y => height - padding - ((y - minY) / yRange) * (height - 2 * padding);

    // Grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 10; i++) {
      const x = padding + (i / 10) * (width - 2 * padding);
      const y = padding + (i / 10) * (height - 2 * padding);
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Axes at origin
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    const originX = xToCanvas(0);
    const originY = yToCanvas(0);
    ctx.beginPath();
    ctx.moveTo(padding, originY);
    ctx.lineTo(width - padding, originY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(originX, padding);
    ctx.lineTo(originX, height - padding);
    ctx.stroke();

    // Draw uninhibited line and points
    const drawLine = (data, color, dashed = false) => {
      // Linear regression
      const n = data.length;
      const sumX = data.reduce((s, d) => s + d.x, 0);
      const sumY = data.reduce((s, d) => s + d.y, 0);
      const sumXY = data.reduce((s, d) => s + d.x * d.y, 0);
      const sumXX = data.reduce((s, d) => s + d.x * d.x, 0);
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash(dashed ? [5, 5] : []);
      ctx.beginPath();
      const lineStartX = minX;
      const lineEndX = maxX * 0.9;
      ctx.moveTo(xToCanvas(lineStartX), yToCanvas(intercept + slope * lineStartX));
      ctx.lineTo(xToCanvas(lineEndX), yToCanvas(intercept + slope * lineEndX));
      ctx.stroke();
      ctx.setLineDash([]);

      // Points
      ctx.fillStyle = color;
      data.forEach(d => {
        ctx.beginPath();
        ctx.arc(xToCanvas(d.x), yToCanvas(d.y), 4, 0, Math.PI * 2);
        ctx.fill();
      });

      return { slope, intercept };
    };

    const uninhibitedFit = drawLine(uninhibited, '#333333');
    const inhibitedFit = params.inhibitorConc > 0 || showAllTypes
      ? drawLine(inhibited, INHIBITION_TYPES[inhibitionType].color, false)
      : null;

    // Mark intercepts
    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.arc(xToCanvas(0), yToCanvas(uninhibitedFit.intercept), 6, 0, Math.PI * 2);
    ctx.fill();

    const xInt = -uninhibitedFit.intercept / uninhibitedFit.slope;
    ctx.fillStyle = '#ff9800';
    ctx.beginPath();
    ctx.arc(xToCanvas(xInt), yToCanvas(0), 6, 0, Math.PI * 2);
    ctx.fill();

    // Labels
    ctx.fillStyle = '#333333';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('1/[S]', width / 2, height - 10);

    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('1/v', 0, 0);
    ctx.restore();

    // Annotations
    ctx.font = '11px Arial';
    ctx.fillStyle = '#4caf50';
    ctx.textAlign = 'left';
    ctx.fillText('1/Vmax', xToCanvas(0) + 5, yToCanvas(uninhibitedFit.intercept) - 8);

    ctx.fillStyle = '#ff9800';
    ctx.textAlign = 'center';
    ctx.fillText('-1/Km', xToCanvas(xInt), yToCanvas(0) + 15);

  }, [params, inhibitionType, showAllTypes, activeStep, getApparentParams]);

  // Draw reaction scheme
  useEffect(() => {
    const canvas = schemeCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const drawArrow = (x1, y1, x2, y2, color = '#333') => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Arrowhead
      const angle = Math.atan2(y2 - y1, x2 - x1);
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - 10 * Math.cos(angle - Math.PI / 6), y2 - 10 * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(x2 - 10 * Math.cos(angle + Math.PI / 6), y2 - 10 * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    };

    // Basic scheme positions
    const centerX = width / 2;
    const centerY = height / 2;

    // E + S
    ctx.fillStyle = '#1976d2';
    ctx.fillText('E + S', centerX - 120, centerY);

    // ES
    ctx.fillStyle = '#1976d2';
    ctx.fillText('ES', centerX, centerY);

    // E + P
    ctx.fillStyle = '#1976d2';
    ctx.fillText('E + P', centerX + 120, centerY);

    // Arrows for basic reaction
    drawArrow(centerX - 80, centerY, centerX - 30, centerY, '#1976d2');
    drawArrow(centerX + 30, centerY, centerX + 80, centerY, '#1976d2');

    // Inhibitor interactions based on type
    const I_color = INHIBITION_TYPES[inhibitionType].color;

    if (inhibitionType === 'competitive') {
      // EI complex (competes with S)
      ctx.fillStyle = I_color;
      ctx.fillText('EI', centerX - 120, centerY + 60);
      ctx.fillText('+ I', centerX - 120, centerY + 30);
      drawArrow(centerX - 120, centerY + 10, centerX - 120, centerY + 45, I_color);
    } else if (inhibitionType === 'noncompetitive') {
      // Both EI and ESI
      ctx.fillStyle = I_color;
      ctx.fillText('EI', centerX - 120, centerY + 60);
      ctx.fillText('+ I', centerX - 120, centerY + 30);
      drawArrow(centerX - 120, centerY + 10, centerX - 120, centerY + 45, I_color);

      ctx.fillText('ESI', centerX, centerY + 60);
      ctx.fillText('+ I', centerX, centerY + 30);
      drawArrow(centerX, centerY + 10, centerX, centerY + 45, I_color);
    } else if (inhibitionType === 'uncompetitive') {
      // Only ESI
      ctx.fillStyle = I_color;
      ctx.fillText('ESI', centerX, centerY + 60);
      ctx.fillText('+ I', centerX, centerY + 30);
      drawArrow(centerX, centerY + 10, centerX, centerY + 45, I_color);
    } else if (inhibitionType === 'mixed') {
      // EI and ESI with different Ki
      ctx.fillStyle = I_color;
      ctx.font = '14px Arial';
      ctx.fillText('EI (Ki)', centerX - 120, centerY + 60);
      ctx.fillText('+ I', centerX - 120, centerY + 30);
      drawArrow(centerX - 120, centerY + 10, centerX - 120, centerY + 45, I_color);

      ctx.fillText("ESI (Ki')", centerX, centerY + 60);
      ctx.fillText('+ I', centerX, centerY + 30);
      drawArrow(centerX, centerY + 10, centerX, centerY + 45, I_color);
    }

  }, [inhibitionType]);

  const handleNext = () => setActiveStep(prev => Math.min(prev + 1, STEPS.length - 1));
  const handleBack = () => setActiveStep(prev => Math.max(prev - 1, 0));

  const checkPracticeAnswer = (correct) => {
    if (practiceAnswer.toLowerCase() === correct.toLowerCase()) {
      setPracticeResult({ correct: true, message: 'Correct! Well done.' });
    } else {
      setPracticeResult({ correct: false, message: `Not quite. The answer is: ${correct}` });
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              What is Enzyme Inhibition?
            </Typography>

            <Typography paragraph>
              Enzyme inhibition is the decrease in enzyme activity caused by binding of a small
              molecule (inhibitor) to the enzyme. Understanding inhibition is crucial for:
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Drug Development
                    </Typography>
                    <Typography variant="body2">
                      Most drugs work by inhibiting specific enzymes. HIV protease inhibitors,
                      statins, and aspirin all target enzyme activity.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Metabolic Regulation
                    </Typography>
                    <Typography variant="body2">
                      Cells use natural inhibitors (feedback inhibition) to control metabolic
                      pathway flux and maintain homeostasis.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Toxicology
                    </Typography>
                    <Typography variant="body2">
                      Many toxins and poisons work as enzyme inhibitors. Understanding their
                      mechanism helps develop treatments.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Typography variant="subtitle1" gutterBottom>
              Types of Reversible Inhibition
            </Typography>

            <Table size="small" sx={{ mb: 3 }}>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Type</strong></TableCell>
                  <TableCell><strong>Where Inhibitor Binds</strong></TableCell>
                  <TableCell><strong>Effect on V<sub>max</sub></strong></TableCell>
                  <TableCell><strong>Effect on K<sub>m</sub></strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(INHIBITION_TYPES).map(([key, info]) => (
                  <TableRow key={key}>
                    <TableCell sx={{ color: info.color, fontWeight: 'bold' }}>{info.name}</TableCell>
                    <TableCell>{info.description}</TableCell>
                    <TableCell>{info.vmaxEffect}</TableCell>
                    <TableCell>{info.kmEffect}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Alert severity="info">
              <Typography variant="body2">
                <strong>Key Concept:</strong> The type of inhibition is determined by WHERE the
                inhibitor binds and WHETHER it affects substrate binding, catalysis, or both.
              </Typography>
            </Alert>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ color: '#d32f2f' }}>
              Competitive Inhibition
            </Typography>

            <Typography paragraph>
              In competitive inhibition, the inhibitor binds to the <strong>same site</strong> as
              the substrate (the active site). Substrate and inhibitor compete for binding.
            </Typography>

            <canvas ref={schemeCanvasRef} width={400} height={150} style={{ border: '1px solid #ddd', display: 'block', margin: '0 auto 20px' }} />

            <Paper sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), mb: 3 }}>
              <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                E + I ⇌ EI (dead-end complex, no product formed)<br/>
                E + S ⇌ ES → E + P (normal catalysis)<br/><br/>
                <strong>Key:</strong> High [S] can overcome competitive inhibition!
              </Typography>
            </Paper>

            <Typography variant="subtitle1" gutterBottom>
              Mathematical Effect
            </Typography>

            <Paper sx={{ p: 2, bgcolor: 'background.default', mb: 3 }}>
              <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                v = V<sub>max</sub>[S] / (K<sub>m</sub>(1 + [I]/K<sub>i</sub>) + [S])<br/><br/>
                Define α = 1 + [I]/K<sub>i</sub><br/><br/>
                <strong>Apparent K<sub>m</sub> = K<sub>m</sub> × α</strong> (increases)<br/>
                <strong>V<sub>max</sub> unchanged</strong> (at saturating [S])
              </Typography>
            </Paper>

            <Typography variant="subtitle1" gutterBottom>
              Interactive: Competitive Inhibition
            </Typography>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <Typography>Inhibitor [I]: {params.inhibitorConc}</Typography>
                <Slider
                  value={params.inhibitorConc}
                  onChange={(e, v) => setParams(p => ({ ...p, inhibitorConc: v }))}
                  min={0}
                  max={50}
                  valueLabelDisplay="auto"
                />
              </Grid>
              <Grid item xs={6}>
                <Typography>Ki: {params.Ki}</Typography>
                <Slider
                  value={params.Ki}
                  onChange={(e, v) => setParams(p => ({ ...p, Ki: v }))}
                  min={5}
                  max={50}
                  valueLabelDisplay="auto"
                />
              </Grid>
            </Grid>

            <canvas ref={mmCanvasRef} width={500} height={350} style={{ border: '1px solid #ddd' }} />

            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Lineweaver-Burk pattern:</strong> Lines intersect on the Y-axis
                (same 1/V<sub>max</sub>) but have different X-intercepts (-1/K<sub>m,app</sub>).
              </Typography>
            </Alert>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
              Non-Competitive Inhibition
            </Typography>

            <Typography paragraph>
              In non-competitive inhibition, the inhibitor binds to a site <strong>different
              from the active site</strong>. It can bind to either free enzyme (E) or the
              enzyme-substrate complex (ES) with <strong>equal affinity</strong>.
            </Typography>

            {(() => {
              // Temporarily set inhibition type for scheme
              const prevType = inhibitionType;
              return (
                <Box sx={{ textAlign: 'center', mb: 2 }}>
                  <canvas ref={schemeCanvasRef} width={400} height={150} style={{ border: '1px solid #ddd' }} />
                </Box>
              );
            })()}

            <Paper sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), mb: 3 }}>
              <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                E + I ⇌ EI (can still bind S, but inactive)<br/>
                ES + I ⇌ ESI (inactive complex)<br/>
                K<sub>i</sub> = K<sub>i</sub>' (equal binding to E and ES)
              </Typography>
            </Paper>

            <Typography variant="subtitle1" gutterBottom>
              Mathematical Effect
            </Typography>

            <Paper sx={{ p: 2, bgcolor: 'background.default', mb: 3 }}>
              <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                v = V<sub>max</sub>[S] / (K<sub>m</sub> + [S])(1 + [I]/K<sub>i</sub>)<br/><br/>
                Define α = 1 + [I]/K<sub>i</sub><br/><br/>
                <strong>Apparent V<sub>max</sub> = V<sub>max</sub> / α</strong> (decreases)<br/>
                <strong>K<sub>m</sub> unchanged</strong>
              </Typography>
            </Paper>

            <Box sx={{ mb: 2 }}>
              <Button
                variant={inhibitionType === 'noncompetitive' ? 'contained' : 'outlined'}
                onClick={() => setInhibitionType('noncompetitive')}
                sx={{ mr: 1 }}
              >
                Show Non-Competitive
              </Button>
            </Box>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <Typography>Inhibitor [I]: {params.inhibitorConc}</Typography>
                <Slider
                  value={params.inhibitorConc}
                  onChange={(e, v) => setParams(p => ({ ...p, inhibitorConc: v }))}
                  min={0}
                  max={50}
                />
              </Grid>
            </Grid>

            <canvas ref={mmCanvasRef} width={500} height={350} style={{ border: '1px solid #ddd' }} />

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Key insight:</strong> Even at saturating substrate, non-competitive
                inhibition cannot be overcome. The enzyme population is effectively reduced.
              </Typography>
            </Alert>

            <Alert severity="warning" sx={{ mt: 1 }}>
              <Typography variant="body2">
                <strong>Lineweaver-Burk pattern:</strong> Lines intersect on the X-axis
                (same -1/K<sub>m</sub>) but have different Y-intercepts (different 1/V<sub>max</sub>).
              </Typography>
            </Alert>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ color: '#388e3c' }}>
              Uncompetitive Inhibition
            </Typography>

            <Typography paragraph>
              In uncompetitive inhibition, the inhibitor binds <strong>only to the ES complex</strong>,
              not to the free enzyme. This is relatively rare but important in multi-substrate enzymes.
            </Typography>

            <Paper sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), mb: 3 }}>
              <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                E + S ⇌ ES (must form first)<br/>
                ES + I ⇌ ESI (then inhibitor binds)<br/><br/>
                <strong>Key:</strong> I cannot bind to free E!
              </Typography>
            </Paper>

            <Typography variant="subtitle1" gutterBottom>
              Mathematical Effect
            </Typography>

            <Paper sx={{ p: 2, bgcolor: 'background.default', mb: 3 }}>
              <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                v = V<sub>max</sub>[S] / (K<sub>m</sub> + [S](1 + [I]/K<sub>i</sub>))<br/><br/>
                Define α' = 1 + [I]/K<sub>i</sub><br/><br/>
                <strong>Apparent V<sub>max</sub> = V<sub>max</sub> / α'</strong> (decreases)<br/>
                <strong>Apparent K<sub>m</sub> = K<sub>m</sub> / α'</strong> (also decreases!)
              </Typography>
            </Paper>

            <Alert severity="success" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Unique feature:</strong> Both V<sub>max</sub> and K<sub>m</sub> decrease
                by the same factor. The ratio V<sub>max</sub>/K<sub>m</sub> (catalytic efficiency)
                is unchanged!
              </Typography>
            </Alert>

            <Box sx={{ mb: 2 }}>
              <Button
                variant={inhibitionType === 'uncompetitive' ? 'contained' : 'outlined'}
                onClick={() => setInhibitionType('uncompetitive')}
                color="success"
              >
                Show Uncompetitive
              </Button>
            </Box>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <Typography>Inhibitor [I]: {params.inhibitorConc}</Typography>
                <Slider
                  value={params.inhibitorConc}
                  onChange={(e, v) => setParams(p => ({ ...p, inhibitorConc: v }))}
                  min={0}
                  max={50}
                />
              </Grid>
            </Grid>

            <canvas ref={mmCanvasRef} width={500} height={350} style={{ border: '1px solid #ddd' }} />

            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Lineweaver-Burk pattern:</strong> Parallel lines! The slope
                (K<sub>m</sub>/V<sub>max</sub>) is unchanged, but both intercepts shift.
              </Typography>
            </Alert>
          </Box>
        );

      case 4:
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ color: '#7b1fa2' }}>
              Mixed Inhibition
            </Typography>

            <Typography paragraph>
              Mixed inhibition is the most general case: the inhibitor binds to both free
              enzyme (E) and enzyme-substrate complex (ES), but with <strong>different
              affinities</strong> (K<sub>i</sub> ≠ K<sub>i</sub>').
            </Typography>

            <Paper sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.secondary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), mb: 3 }}>
              <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                E + I ⇌ EI (with K<sub>i</sub>)<br/>
                ES + I ⇌ ESI (with K<sub>i</sub>')<br/><br/>
                If K<sub>i</sub> &lt; K<sub>i</sub>': prefers binding to E<br/>
                If K<sub>i</sub> &gt; K<sub>i</sub>': prefers binding to ES
              </Typography>
            </Paper>

            <Typography variant="subtitle1" gutterBottom>
              Mathematical Effect
            </Typography>

            <Paper sx={{ p: 2, bgcolor: 'background.default', mb: 3 }}>
              <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                v = V<sub>max</sub>[S] / (αK<sub>m</sub> + α'[S])<br/><br/>
                α = 1 + [I]/K<sub>i</sub><br/>
                α' = 1 + [I]/K<sub>i</sub>'<br/><br/>
                <strong>Apparent V<sub>max</sub> = V<sub>max</sub> / α'</strong><br/>
                <strong>Apparent K<sub>m</sub> = K<sub>m</sub> × α / α'</strong>
              </Typography>
            </Paper>

            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Special cases:</strong><br/>
                • If K<sub>i</sub>' → ∞: Competitive (no ESI formed)<br/>
                • If K<sub>i</sub> → ∞: Uncompetitive (no EI formed)<br/>
                • If K<sub>i</sub> = K<sub>i</sub>': Non-competitive
              </Typography>
            </Alert>

            <Box sx={{ mb: 2 }}>
              <Button
                variant={inhibitionType === 'mixed' ? 'contained' : 'outlined'}
                onClick={() => setInhibitionType('mixed')}
                sx={{ bgcolor: '#7b1fa2', '&:hover': { bgcolor: '#6a1b9a' } }}
              >
                Show Mixed
              </Button>
            </Box>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <Typography>Inhibitor [I]: {params.inhibitorConc}</Typography>
                <Slider
                  value={params.inhibitorConc}
                  onChange={(e, v) => setParams(p => ({ ...p, inhibitorConc: v }))}
                  min={0}
                  max={50}
                />
              </Grid>
            </Grid>

            <canvas ref={mmCanvasRef} width={500} height={350} style={{ border: '1px solid #ddd' }} />

            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Lineweaver-Burk pattern:</strong> Lines intersect to the left of the
                Y-axis (above or below X-axis depending on K<sub>i</sub>/K<sub>i</sub>' ratio).
              </Typography>
            </Alert>
          </Box>
        );

      case 5:
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              Pattern Recognition & Ki Determination
            </Typography>

            <Typography paragraph>
              Being able to identify inhibition type from Lineweaver-Burk plots is a crucial skill
              in enzyme kinetics. Here's how the patterns differ:
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Button
                variant={showAllTypes ? 'contained' : 'outlined'}
                onClick={() => setShowAllTypes(!showAllTypes)}
                startIcon={<CompareIcon />}
              >
                {showAllTypes ? 'Compare All Types' : 'Show Single Type'}
              </Button>

              {!showAllTypes && (
                <FormControl sx={{ ml: 2, minWidth: 150 }}>
                  <InputLabel>Inhibition Type</InputLabel>
                  <Select
                    value={inhibitionType}
                    onChange={(e) => setInhibitionType(e.target.value)}
                    size="small"
                    label="Inhibition Type"
                  >
                    {Object.entries(INHIBITION_TYPES).map(([key, info]) => (
                      <MenuItem key={key} value={key}>{info.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>

            <canvas ref={lwbCanvasRef} width={500} height={400} style={{ border: '1px solid #ddd', display: 'block', margin: '0 auto' }} />

            <Paper sx={{ p: 2, mt: 3, bgcolor: 'background.default' }}>
              <Typography variant="subtitle1" gutterBottom>
                Quick Reference: Lineweaver-Burk Patterns
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Inhibition Type</strong></TableCell>
                    <TableCell><strong>Lines Intersect At</strong></TableCell>
                    <TableCell><strong>How to Identify</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ color: '#d32f2f' }}>Competitive</TableCell>
                    <TableCell>Y-axis (same 1/V<sub>max</sub>)</TableCell>
                    <TableCell>Same Y-intercept, different slopes</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ color: '#1976d2' }}>Non-competitive</TableCell>
                    <TableCell>X-axis (same -1/K<sub>m</sub>)</TableCell>
                    <TableCell>Same X-intercept, different Y-intercepts</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ color: '#388e3c' }}>Uncompetitive</TableCell>
                    <TableCell>Never (parallel)</TableCell>
                    <TableCell>Parallel lines with same slope</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ color: '#7b1fa2' }}>Mixed</TableCell>
                    <TableCell>Left of Y-axis</TableCell>
                    <TableCell>Intersection point not on either axis</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Paper>

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle1" gutterBottom>
              Determining K<sub>i</sub>
            </Typography>

            <Typography paragraph>
              Once you know the inhibition type, K<sub>i</sub> can be determined from the
              apparent parameters:
            </Typography>

            <Paper sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                <strong>Competitive:</strong> K<sub>m,app</sub> = K<sub>m</sub>(1 + [I]/K<sub>i</sub>)<br/>
                → K<sub>i</sub> = [I] / (K<sub>m,app</sub>/K<sub>m</sub> - 1)<br/><br/>
                <strong>Non-competitive:</strong> V<sub>max,app</sub> = V<sub>max</sub>/(1 + [I]/K<sub>i</sub>)<br/>
                → K<sub>i</sub> = [I] / (V<sub>max</sub>/V<sub>max,app</sub> - 1)<br/><br/>
                <strong>Uncompetitive:</strong> Both V and K decrease by same factor<br/>
                → K<sub>i</sub> = [I] / (V<sub>max</sub>/V<sub>max,app</sub> - 1)
              </Typography>
            </Paper>
          </Box>
        );

      case 6:
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              Practice Problems
            </Typography>

            <Paper sx={{ p: 3, mb: 3, bgcolor: (theme) => alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
              <Typography variant="subtitle1" gutterBottom>
                Problem 1: Identify the Inhibition Type
              </Typography>
              <Typography paragraph>
                An enzyme has V<sub>max</sub> = 100 μmol/min and K<sub>m</sub> = 20 mM.
                In the presence of an inhibitor:
              </Typography>
              <ul>
                <li>Apparent V<sub>max</sub> = 100 μmol/min (unchanged)</li>
                <li>Apparent K<sub>m</sub> = 60 mM (increased)</li>
              </ul>
              <Typography>What type of inhibition is this?</Typography>

              <TextField
                size="small"
                placeholder="Your answer..."
                value={practiceAnswer}
                onChange={(e) => setPracticeAnswer(e.target.value)}
                sx={{ mt: 2, mr: 2 }}
              />
              <Button
                variant="contained"
                onClick={() => checkPracticeAnswer('competitive')}
              >
                Check
              </Button>

              {practiceResult && (
                <Alert severity={practiceResult.correct ? 'success' : 'error'} sx={{ mt: 2 }}>
                  {practiceResult.message}
                </Alert>
              )}
            </Paper>

            <Paper sx={{ p: 3, mb: 3, bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
              <Typography variant="subtitle1" gutterBottom>
                Problem 2: Calculate K<sub>i</sub>
              </Typography>
              <Typography paragraph>
                Given the data from Problem 1, with [I] = 10 μM, calculate K<sub>i</sub>.
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                K<sub>m,app</sub> = K<sub>m</sub>(1 + [I]/K<sub>i</sub>)<br/>
                60 = 20(1 + 10/K<sub>i</sub>)<br/>
                3 = 1 + 10/K<sub>i</sub><br/>
                2 = 10/K<sub>i</sub><br/>
                <strong>K<sub>i</sub> = 5 μM</strong>
              </Typography>
            </Paper>

            <Paper sx={{ p: 3, bgcolor: (theme) => alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
              <Typography variant="subtitle1" gutterBottom>
                Problem 3: Interpret This Result
              </Typography>
              <Typography paragraph>
                A drug candidate has K<sub>i</sub> = 5 nM against its target enzyme.
                Is this a potent inhibitor?
              </Typography>
              <Typography variant="body2">
                <strong>Answer:</strong> Yes! K<sub>i</sub> in the nanomolar range indicates
                very high affinity binding. For comparison:
              </Typography>
              <ul>
                <li>mM range: weak inhibitor</li>
                <li>μM range: moderate inhibitor</li>
                <li>nM range: potent inhibitor</li>
                <li>pM range: extremely potent</li>
              </ul>
            </Paper>

            <Alert severity="success" sx={{ mt: 3 }}>
              <Typography variant="body2">
                <strong>Clinical Example:</strong> Atorvastatin (Lipitor) inhibits HMG-CoA
                reductase with K<sub>i</sub> ~ 1 nM, making it one of the most potent statins.
              </Typography>
            </Alert>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <BlockIcon sx={{ fontSize: 40, color: '#d32f2f', mr: 2 }} />
          <Box>
            <Typography variant="h4">
              Lesson 4: Enzyme Inhibition
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Competitive, Non-Competitive, Uncompetitive, and Mixed Inhibition
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip label="Intermediate" color="primary" size="small" />
          <Chip label="~30 minutes" variant="outlined" size="small" />
          <Chip label="Drug Discovery" variant="outlined" size="small" />
          <Chip label="Ki Determination" variant="outlined" size="small" />
        </Box>
      </Paper>

      <Stepper activeStep={activeStep} orientation="vertical">
        {STEPS.map((label, index) => (
          <Step key={label}>
            <StepLabel
              sx={{ cursor: 'pointer' }}
              onClick={() => setActiveStep(index)}
            >
              {label}
            </StepLabel>
            <StepContent>
              <Box sx={{ mb: 2 }}>
                {renderStepContent(index)}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  disabled={index === 0}
                  onClick={handleBack}
                  startIcon={<PrevIcon />}
                >
                  Back
                </Button>
                <Button
                  variant="contained"
                  onClick={handleNext}
                  endIcon={index < STEPS.length - 1 ? <NextIcon /> : <CheckIcon />}
                >
                  {index === STEPS.length - 1 ? 'Complete Lesson' : 'Continue'}
                </Button>
              </Box>
            </StepContent>
          </Step>
        ))}
      </Stepper>

      {activeStep === STEPS.length && (
        <Paper sx={{ p: 3, mt: 3, bgcolor: (theme) => alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.12 : 0.08) }}>
          <Typography variant="h5" gutterBottom color="success.main">
            <CheckIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Lesson Complete!
          </Typography>
          <Typography paragraph>
            You've mastered the four types of reversible enzyme inhibition and learned
            how to identify them from kinetic data.
          </Typography>
          <Typography variant="subtitle2" gutterBottom>
            Key Takeaways:
          </Typography>
          <ul>
            <li>Competitive: same V<sub>max</sub>, increased K<sub>m</sub></li>
            <li>Non-competitive: decreased V<sub>max</sub>, same K<sub>m</sub></li>
            <li>Uncompetitive: both V<sub>max</sub> and K<sub>m</sub> decrease proportionally</li>
            <li>Mixed: both parameters change, but not proportionally</li>
            <li>Lineweaver-Burk patterns are diagnostic for inhibition type</li>
          </ul>
          <Button variant="outlined" onClick={() => setActiveStep(0)} sx={{ mt: 2 }}>
            Review Lesson
          </Button>
        </Paper>
      )}
    </Box>
  );
};

export default Lesson4_EnzymeInhibition;
