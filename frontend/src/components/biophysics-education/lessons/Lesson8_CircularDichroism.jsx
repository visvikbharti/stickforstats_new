/**
 * Lesson 8: Circular Dichroism Spectroscopy
 *
 * Comprehensive coverage of CD spectroscopy:
 * - Physical basis of circular dichroism
 * - Secondary structure analysis
 * - Characteristic CD spectra
 * - Data analysis and interpretation
 * - Applications in biophysics
 *
 * ~750 lines of educational content
 */

import React, { useState, useEffect, useRef } from 'react';
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
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import {
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  Waves as WavesIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';

const STEPS = [
  'What is Circular Dichroism?',
  'Physical Basis',
  'Secondary Structure Signatures',
  'Interpreting CD Spectra',
  'Applications in Biophysics'
];

// Standard CD spectra for secondary structures (simplified models)
const SECONDARY_STRUCTURES = {
  alphaHelix: {
    name: 'α-Helix',
    color: '#d32f2f',
    description: 'Right-handed helix stabilized by i → i+4 hydrogen bonds',
    features: ['Negative bands at 222 nm and 208 nm', 'Positive band at 193 nm', 'Ratio 222/208 ≈ 1'],
    // Simplified spectrum function (wavelength in nm)
    spectrum: (wl) => {
      if (wl < 190) return 50000 * Math.exp(-Math.pow((wl - 193) / 5, 2));
      if (wl < 200) return 50000 * Math.exp(-Math.pow((wl - 193) / 5, 2));
      if (wl < 215) return -35000 * Math.exp(-Math.pow((wl - 208) / 6, 2));
      return -35000 * Math.exp(-Math.pow((wl - 222) / 8, 2));
    }
  },
  betaSheet: {
    name: 'β-Sheet',
    color: '#1976d2',
    description: 'Extended strands connected by hydrogen bonds',
    features: ['Negative band at 218 nm', 'Positive band at 195-198 nm', 'Less intense than α-helix'],
    spectrum: (wl) => {
      if (wl < 200) return 20000 * Math.exp(-Math.pow((wl - 196) / 6, 2));
      return -15000 * Math.exp(-Math.pow((wl - 218) / 10, 2));
    }
  },
  randomCoil: {
    name: 'Random Coil',
    color: '#4caf50',
    description: 'Unstructured, disordered regions',
    features: ['Strong negative band near 198 nm', 'Weak positive band around 218 nm', 'Indicates unfolded protein'],
    spectrum: (wl) => {
      if (wl < 210) return -30000 * Math.exp(-Math.pow((wl - 198) / 6, 2));
      return 5000 * Math.exp(-Math.pow((wl - 218) / 15, 2));
    }
  },
  betaTurn: {
    name: 'β-Turn',
    color: '#ff9800',
    description: 'Tight turns connecting other structures',
    features: ['Variable spectrum', 'Negative band around 225 nm', 'Positive near 205 nm'],
    spectrum: (wl) => {
      if (wl < 215) return 15000 * Math.exp(-Math.pow((wl - 205) / 8, 2));
      return -10000 * Math.exp(-Math.pow((wl - 225) / 10, 2));
    }
  }
};

const Lesson8_CircularDichroism = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedStructures, setSelectedStructures] = useState(['alphaHelix']);
  const [mixtureParams, setMixtureParams] = useState({
    helix: 40,
    sheet: 20,
    coil: 40
  });
  const [showMixture, setShowMixture] = useState(false);

  const cdSpectrumCanvasRef = useRef(null);
  const polarizationCanvasRef = useRef(null);
  const denaturationCanvasRef = useRef(null);

  // Draw CD spectrum
  useEffect(() => {
    const canvas = cdSpectrumCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 60;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const minWL = 190;
    const maxWL = 260;
    const wlRange = maxWL - minWL;

    const maxCD = 60000;
    const minCD = -50000;
    const cdRange = maxCD - minCD;

    const wlToCanvas = wl => padding + ((wl - minWL) / wlRange) * (width - 2 * padding);
    const cdToCanvas = cd => height - padding - ((cd - minCD) / cdRange) * (height - 2 * padding);

    // Grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    for (let wl = 190; wl <= 260; wl += 10) {
      ctx.beginPath();
      ctx.moveTo(wlToCanvas(wl), padding);
      ctx.lineTo(wlToCanvas(wl), height - padding);
      ctx.stroke();
    }
    for (let cd = -40000; cd <= 60000; cd += 20000) {
      ctx.beginPath();
      ctx.moveTo(padding, cdToCanvas(cd));
      ctx.lineTo(width - padding, cdToCanvas(cd));
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

    // Zero line
    ctx.strokeStyle = '#999';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding, cdToCanvas(0));
    ctx.lineTo(width - padding, cdToCanvas(0));
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw selected spectra
    if (showMixture) {
      // Draw mixture spectrum
      ctx.strokeStyle = '#9c27b0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let wl = minWL; wl <= maxWL; wl += 0.5) {
        const helixContrib = SECONDARY_STRUCTURES.alphaHelix.spectrum(wl) * mixtureParams.helix / 100;
        const sheetContrib = SECONDARY_STRUCTURES.betaSheet.spectrum(wl) * mixtureParams.sheet / 100;
        const coilContrib = SECONDARY_STRUCTURES.randomCoil.spectrum(wl) * mixtureParams.coil / 100;
        const totalCD = helixContrib + sheetContrib + coilContrib;

        const x = wlToCanvas(wl);
        const y = cdToCanvas(totalCD);
        if (wl === minWL) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    } else {
      selectedStructures.forEach(structKey => {
        const struct = SECONDARY_STRUCTURES[structKey];
        ctx.strokeStyle = struct.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let wl = minWL; wl <= maxWL; wl += 0.5) {
          const cd = struct.spectrum(wl);
          const x = wlToCanvas(wl);
          const y = cdToCanvas(cd);
          if (wl === minWL) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });
    }

    // Labels
    ctx.fillStyle = '#333333';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Wavelength (nm)', width / 2, height - 10);

    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('[θ] (deg·cm²·dmol⁻¹)', 0, 0);
    ctx.restore();

    // X-axis labels
    ctx.font = '10px Arial';
    for (let wl = 200; wl <= 260; wl += 20) {
      ctx.fillText(wl.toString(), wlToCanvas(wl), height - padding + 15);
    }

    // Legend
    ctx.font = '11px Arial';
    ctx.textAlign = 'left';
    let legendY = padding + 20;

    if (showMixture) {
      ctx.fillStyle = '#9c27b0';
      ctx.fillRect(width - padding - 100, legendY, 15, 10);
      ctx.fillStyle = '#333';
      ctx.fillText('Mixture', width - padding - 80, legendY + 9);
    } else {
      selectedStructures.forEach(structKey => {
        const struct = SECONDARY_STRUCTURES[structKey];
        ctx.fillStyle = struct.color;
        ctx.fillRect(width - padding - 100, legendY, 15, 10);
        ctx.fillStyle = '#333';
        ctx.fillText(struct.name, width - padding - 80, legendY + 9);
        legendY += 18;
      });
    }

  }, [selectedStructures, showMixture, mixtureParams]);

  // Draw polarization animation
  useEffect(() => {
    const canvas = polarizationCanvasRef.current;
    if (!canvas || activeStep !== 1) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;

    let animationId;
    let phase = 0;

    const animate = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      phase += 0.05;

      // Draw left and right circularly polarized light
      const drawCircularPolarization = (startX, direction, color, label) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;

        // Draw helix
        ctx.beginPath();
        for (let x = 0; x < 200; x += 2) {
          const y = centerY + 30 * Math.sin(x * 0.05 * direction + phase);
          const z = 30 * Math.cos(x * 0.05 * direction + phase);
          const screenY = y + z * 0.3;

          if (x === 0) ctx.moveTo(startX + x, screenY);
          else ctx.lineTo(startX + x, screenY);
        }
        ctx.stroke();

        // Label
        ctx.fillStyle = color;
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, startX + 100, height - 20);
      };

      drawCircularPolarization(30, 1, '#d32f2f', 'Left-handed');
      drawCircularPolarization(280, -1, '#1976d2', 'Right-handed');

      // Draw chiral molecule
      ctx.fillStyle = '#4caf50';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Chiral Molecule', width / 2, 30);

      // Absorption difference indicator
      ctx.fillStyle = '#333';
      ctx.font = '11px Arial';
      ctx.fillText('ΔA = AL - AR', width / 2, height - 40);
      ctx.fillText('CD = differential absorption', width / 2, height - 25);

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [activeStep]);

  const handleNext = () => setActiveStep(prev => Math.min(prev + 1, STEPS.length - 1));
  const handleBack = () => setActiveStep(prev => Math.max(prev - 1, 0));

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              What is Circular Dichroism?
            </Typography>

            <Typography paragraph>
              <strong>Circular Dichroism (CD)</strong> spectroscopy measures the differential
              absorption of left-handed vs right-handed circularly polarized light by
              chiral (asymmetric) molecules.
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Why CD for Proteins?</strong> Amino acids (except glycine) are chiral.
                When organized into secondary structures (α-helices, β-sheets), they create
                characteristic CD signatures that reveal protein structure.
              </Typography>
            </Alert>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Far-UV CD (180-260 nm)
                    </Typography>
                    <Typography variant="body2">
                      • Probes peptide bond absorption<br/>
                      • Reveals secondary structure content<br/>
                      • α-helix, β-sheet, random coil analysis<br/>
                      • Most common application
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Near-UV CD (260-320 nm)
                    </Typography>
                    <Typography variant="body2">
                      • Probes aromatic side chains<br/>
                      • Trp, Tyr, Phe environments<br/>
                      • Reports on tertiary structure<br/>
                      • More sensitive to local environment
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Typography variant="subtitle1" gutterBottom>
              CD Signal Units
            </Typography>

            <Paper sx={{ p: 2, bgcolor: 'background.default', mb: 3 }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                <strong>Ellipticity [θ]:</strong> deg·cm²·dmol⁻¹ (per residue)<br/>
                <strong>Molar Circular Dichroism [Δε]:</strong> L·mol⁻¹·cm⁻¹<br/><br/>
                Conversion: [θ] = 3298 × Δε
              </Typography>
            </Paper>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              Physical Basis of Circular Dichroism
            </Typography>

            <Typography paragraph>
              CD arises because chiral molecules absorb left-handed and right-handed
              circularly polarized light differently.
            </Typography>

            <Paper sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), mb: 3 }}>
              <Typography variant="body1" sx={{ fontFamily: 'serif', textAlign: 'center' }}>
                CD = A<sub>L</sub> - A<sub>R</sub>
              </Typography>
              <Typography variant="body2" align="center" sx={{ mt: 1 }}>
                Where A<sub>L</sub> = absorbance of left-polarized light<br/>
                and A<sub>R</sub> = absorbance of right-polarized light
              </Typography>
            </Paper>

            <canvas ref={polarizationCanvasRef} width={500} height={200} style={{ border: '1px solid #ddd', display: 'block', margin: '0 auto 20px' }} />

            <Typography variant="subtitle1" gutterBottom>
              Key Concepts
            </Typography>

            <Table size="small" sx={{ mb: 3 }}>
              <TableBody>
                <TableRow>
                  <TableCell><strong>Circularly Polarized Light</strong></TableCell>
                  <TableCell>
                    Electric field vector rotates as the wave propagates.
                    Left and right refer to rotation direction.
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>Chirality</strong></TableCell>
                  <TableCell>
                    Molecules that are not superimposable on their mirror image.
                    Essential for CD activity.
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>Chromophore</strong></TableCell>
                  <TableCell>
                    The light-absorbing group. In proteins: peptide bond (far-UV),
                    aromatic residues (near-UV).
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>Cotton Effect</strong></TableCell>
                  <TableCell>
                    The characteristic shape of a CD band - can be positive or negative.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <Alert severity="success">
              <Typography variant="body2">
                <strong>Why CD Works for Structure:</strong> When peptide bonds are arranged
                in regular structures like α-helices, the chromophores interact with each
                other (exciton coupling), creating distinctive CD signatures.
              </Typography>
            </Alert>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              Secondary Structure Signatures
            </Typography>

            <Typography paragraph>
              Each type of secondary structure produces a characteristic CD spectrum in the
              far-UV region. These patterns are used to estimate protein structure content.
            </Typography>

            <Typography variant="subtitle1" gutterBottom>
              Select Structures to Display
            </Typography>

            <Box sx={{ mb: 2 }}>
              <ToggleButtonGroup
                value={selectedStructures}
                onChange={(e, newValues) => {
                  if (newValues.length > 0) {
                    setSelectedStructures(newValues);
                    setShowMixture(false);
                  }
                }}
                size="small"
              >
                {Object.entries(SECONDARY_STRUCTURES).map(([key, struct]) => (
                  <ToggleButton key={key} value={key} sx={{ color: struct.color }}>
                    {struct.name}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>

            <canvas ref={cdSpectrumCanvasRef} width={550} height={350} style={{ border: '1px solid #ddd', display: 'block', margin: '0 auto 20px' }} />

            <Grid container spacing={2}>
              {Object.entries(SECONDARY_STRUCTURES).map(([key, struct]) => (
                <Grid item xs={12} md={6} key={key}>
                  <Card sx={{ height: '100%', borderLeft: `4px solid ${struct.color}` }}>
                    <CardContent>
                      <Typography variant="subtitle2" sx={{ color: struct.color }} gutterBottom>
                        {struct.name}
                      </Typography>
                      <Typography variant="body2" paragraph>
                        {struct.description}
                      </Typography>
                      <Typography variant="body2">
                        <strong>CD Features:</strong>
                        <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                          {struct.features.map((f, i) => <li key={i}>{f}</li>)}
                        </ul>
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              Interpreting CD Spectra
            </Typography>

            <Typography paragraph>
              Real protein CD spectra are mixtures of contributions from different secondary
              structures. Deconvolution algorithms estimate the percentage of each structure.
            </Typography>

            <Typography variant="subtitle1" gutterBottom>
              Simulate a Mixed Spectrum
            </Typography>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={4}>
                <Typography variant="body2" sx={{ color: SECONDARY_STRUCTURES.alphaHelix.color }}>
                  α-Helix: {mixtureParams.helix}%
                </Typography>
                <Slider
                  value={mixtureParams.helix}
                  onChange={(e, v) => setMixtureParams(p => ({ ...p, helix: v }))}
                  min={0}
                  max={100}
                  sx={{ color: SECONDARY_STRUCTURES.alphaHelix.color }}
                />
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" sx={{ color: SECONDARY_STRUCTURES.betaSheet.color }}>
                  β-Sheet: {mixtureParams.sheet}%
                </Typography>
                <Slider
                  value={mixtureParams.sheet}
                  onChange={(e, v) => setMixtureParams(p => ({ ...p, sheet: v }))}
                  min={0}
                  max={100}
                  sx={{ color: SECONDARY_STRUCTURES.betaSheet.color }}
                />
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" sx={{ color: SECONDARY_STRUCTURES.randomCoil.color }}>
                  Random Coil: {mixtureParams.coil}%
                </Typography>
                <Slider
                  value={mixtureParams.coil}
                  onChange={(e, v) => setMixtureParams(p => ({ ...p, coil: v }))}
                  min={0}
                  max={100}
                  sx={{ color: SECONDARY_STRUCTURES.randomCoil.color }}
                />
              </Grid>
            </Grid>

            <Box sx={{ mb: 2 }}>
              <Button
                variant={showMixture ? 'contained' : 'outlined'}
                onClick={() => setShowMixture(!showMixture)}
                sx={{ bgcolor: showMixture ? '#9c27b0' : 'transparent' }}
              >
                {showMixture ? 'Showing Mixture' : 'Show Mixture Spectrum'}
              </Button>
            </Box>

            <canvas ref={cdSpectrumCanvasRef} width={550} height={350} style={{ border: '1px solid #ddd', display: 'block', margin: '0 auto 20px' }} />

            <Typography variant="subtitle1" gutterBottom>
              Deconvolution Methods
            </Typography>

            <Table size="small" sx={{ mb: 3 }}>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Method</strong></TableCell>
                  <TableCell><strong>Approach</strong></TableCell>
                  <TableCell><strong>Reference Set</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>SELCON3</TableCell>
                  <TableCell>Self-consistent selection</TableCell>
                  <TableCell>43 proteins</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>CDSSTR</TableCell>
                  <TableCell>Variable selection</TableCell>
                  <TableCell>43-71 proteins</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>CONTIN</TableCell>
                  <TableCell>Ridge regression</TableCell>
                  <TableCell>16-43 proteins</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>K2D3</TableCell>
                  <TableCell>Neural network</TableCell>
                  <TableCell>Online server</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <Alert severity="warning">
              <Typography variant="body2">
                <strong>Caution:</strong> CD gives average structure content, not specific
                locations. A protein with 40% helix could have one long helix or many short ones.
                Complement CD with other methods (NMR, X-ray, cryo-EM) for detailed structure.
              </Typography>
            </Alert>
          </Box>
        );

      case 4:
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              Applications in Biophysics
            </Typography>

            <Typography paragraph>
              CD spectroscopy is a versatile tool used throughout biophysics research:
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Protein Folding Studies
                    </Typography>
                    <Typography variant="body2">
                      • Monitor folding/unfolding in real-time<br/>
                      • Identify folding intermediates<br/>
                      • Study chaperone-assisted folding<br/>
                      • Characterize intrinsically disordered proteins
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Thermal Stability
                    </Typography>
                    <Typography variant="body2">
                      • Measure melting temperature (Tm)<br/>
                      • Compare protein variants<br/>
                      • Assess buffer/additive effects<br/>
                      • Quality control of biotherapeutics
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Ligand Binding
                    </Typography>
                    <Typography variant="body2">
                      • Conformational changes upon binding<br/>
                      • Screen for binding to IDPs<br/>
                      • Drug-induced structure changes<br/>
                      • Nucleic acid-protein interactions
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Quality Control
                    </Typography>
                    <Typography variant="body2">
                      • Verify correct folding of recombinant proteins<br/>
                      • Batch-to-batch consistency<br/>
                      • Aggregation detection<br/>
                      • Biopharmaceutical comparability
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Typography variant="subtitle1" gutterBottom>
              CD Thermal Denaturation
            </Typography>

            <Paper sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.12 : 0.08), mb: 3 }}>
              <Typography variant="body2">
                By monitoring CD signal (usually at 222 nm for α-helix) as a function of
                temperature, you can determine:
              </Typography>
              <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                <li><strong>Tm</strong> - Melting temperature (midpoint of unfolding)</li>
                <li><strong>ΔH</strong> - Enthalpy of unfolding (from van't Hoff analysis)</li>
                <li><strong>Reversibility</strong> - Whether protein refolds upon cooling</li>
                <li><strong>Cooperativity</strong> - From the steepness of the transition</li>
              </ul>
            </Paper>

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle1" gutterBottom>
              Practical Considerations
            </Typography>

            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell><strong>Sample Concentration</strong></TableCell>
                  <TableCell>0.1-1 mg/mL for far-UV, 0.5-2 mg/mL for near-UV</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>Path Length</strong></TableCell>
                  <TableCell>0.1-1 mm (far-UV), 10 mm (near-UV)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>Buffer</strong></TableCell>
                  <TableCell>Avoid chloride, use phosphate. Keep absorbance low.</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>Baseline</strong></TableCell>
                  <TableCell>Measure buffer blank, subtract from sample</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>Minimum Wavelength</strong></TableCell>
                  <TableCell>Limited by buffer/sample absorption (&lt;1 AU)</TableCell>
                </TableRow>
              </TableBody>
            </Table>
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
          <WavesIcon sx={{ fontSize: 40, color: '#9c27b0', mr: 2 }} />
          <Box>
            <Typography variant="h4">
              Lesson 8: Circular Dichroism Spectroscopy
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Secondary Structure Analysis by Differential Light Absorption
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip label="Advanced" color="secondary" size="small" />
          <Chip label="~25 minutes" variant="outlined" size="small" />
          <Chip label="Protein Structure" variant="outlined" size="small" />
          <Chip label="Spectroscopy" variant="outlined" size="small" />
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
            You now understand the principles of CD spectroscopy and how to interpret
            far-UV CD spectra for protein secondary structure analysis.
          </Typography>
          <Typography variant="subtitle2" gutterBottom>
            Key Takeaways:
          </Typography>
          <ul>
            <li>CD measures differential absorption of left vs right circularly polarized light</li>
            <li>α-helix: negative at 222 and 208 nm, positive at 193 nm</li>
            <li>β-sheet: negative at 218 nm, positive at 195 nm</li>
            <li>Random coil: strong negative at 198 nm</li>
            <li>Thermal CD melts reveal protein stability (Tm)</li>
          </ul>
          <Button variant="outlined" onClick={() => setActiveStep(0)} sx={{ mt: 2 }}>
            Review Lesson
          </Button>
        </Paper>
      )}
    </Box>
  );
};

export default Lesson8_CircularDichroism;
