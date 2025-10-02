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
  Chip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableRow,
  TableCell
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FunctionsIcon from '@mui/icons-material/Functions';
import { MathJax } from 'better-react-mathjax';

/**
 * Lesson 7: The Variance Maximization Proof
 *
 * Provides rigorous mathematical proof that PCA finds the optimal low-rank approximation
 * Topics covered:
 * - Optimization problem formulation
 * - Lagrange multipliers method
 * - Step-by-step derivation
 * - Why eigenvalues = variance along PCs
 */

const Lesson07_Proof = ({ onComplete }) => {
  const theme = useTheme();

  // State
  const [activeStep, setActiveStep] = useState(0);

  const handleNext = () => {
    setActiveStep(prev => Math.min(prev + 1, 5));
  };

  const handleBack = () => {
    setActiveStep(prev => Math.max(prev - 1, 0));
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <Box>
      <Stepper activeStep={activeStep} orientation="vertical">
        {/* Step 1: Problem Setup */}
        <Step>
          <StepLabel>
            <Typography variant="h6">The Optimization Problem</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography variant="h6" gutterBottom>
                What Are We Trying to Prove?
              </Typography>

              <Alert severity="info" sx={{ mb: 2 }}>
                <AlertTitle>Main Theorem</AlertTitle>
                The direction <MathJax inline>{"\\(\\mathbf{v}\\)"}</MathJax> that maximizes the variance
                of the projected data is the eigenvector corresponding to the largest eigenvalue of the
                covariance matrix.
              </Alert>

              <Typography paragraph>
                Let's formalize this problem mathematically.
              </Typography>

              <Paper sx={{ p: 2, bgcolor: 'white', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
                  Given:
                </Typography>

                <ul>
                  <li>
                    <Typography>
                      Data points: <MathJax inline>{"\\(\\mathbf{x}_1, \\mathbf{x}_2, \\ldots, \\mathbf{x}_n \\in \\mathbb{R}^d\\)"}</MathJax>
                    </Typography>
                  </li>
                  <li>
                    <Typography>
                      Assume centered: <MathJax inline>{"\\(\\sum_i \\mathbf{x}_i = \\mathbf{0}\\)"}</MathJax>
                    </Typography>
                  </li>
                  <li>
                    <Typography>
                      Covariance matrix: <MathJax inline>{"\\(\\mathbf{C} = \\frac{1}{n} \\sum_{i=1}^n \\mathbf{x}_i \\mathbf{x}_i^T\\)"}</MathJax>
                    </Typography>
                  </li>
                </ul>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
                  Find:
                </Typography>

                <Typography paragraph>
                  A unit vector <MathJax inline>{"\\(\\mathbf{v}\\)"}</MathJax> that maximizes the variance
                  of the projected data <MathJax inline>{"\\(\\mathbf{v}^T \\mathbf{x}_i\\)"}</MathJax>.
                </Typography>
              </Paper>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Variance Along Direction v
              </Typography>

              <Paper sx={{ p: 2, bgcolor: '#e3f2fd', mb: 2 }}>
                <Typography paragraph>
                  The variance of the data when projected onto direction <MathJax inline>{"\\(\\mathbf{v}\\)"}</MathJax> is:
                </Typography>

                <MathJax>
                  {"\\[ \\text{Var}(\\mathbf{v}) = \\frac{1}{n} \\sum_{i=1}^n (\\mathbf{v}^T \\mathbf{x}_i)^2 \\]"}
                </MathJax>

                <Typography paragraph sx={{ mt: 2 }}>
                  We can rewrite this using the covariance matrix:
                </Typography>

                <MathJax>
                  {"\\[ \\text{Var}(\\mathbf{v}) = \\mathbf{v}^T \\left( \\frac{1}{n} \\sum_{i=1}^n \\mathbf{x}_i \\mathbf{x}_i^T \\right) \\mathbf{v} = \\mathbf{v}^T \\mathbf{C} \\mathbf{v} \\]"}
                </MathJax>
              </Paper>

              <Alert severity="warning">
                <AlertTitle>The Constraint</AlertTitle>
                We require <MathJax inline>{"\\(\\|\\mathbf{v}\\| = 1\\)"}</MathJax> (unit length) to make the problem
                well-defined. Without this constraint, we could make variance arbitrarily large by scaling v.
              </Alert>

              <Paper sx={{ p: 2, bgcolor: '#fff3e0', mt: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
                  Optimization Problem:
                </Typography>

                <MathJax>
                  {"\\[ \\max_{\\mathbf{v}} \\quad \\mathbf{v}^T \\mathbf{C} \\mathbf{v} \\]"}
                </MathJax>

                <Typography align="center" sx={{ mt: 1 }}>
                  subject to:
                </Typography>

                <MathJax>
                  {"\\[ \\mathbf{v}^T \\mathbf{v} = 1 \\]"}
                </MathJax>
              </Paper>

              <Button variant="contained" onClick={handleNext} sx={{ mt: 2 }}>
                Continue to Proof
              </Button>
            </Paper>
          </StepContent>
        </Step>

        {/* Step 2: Lagrange Multipliers */}
        <Step>
          <StepLabel>
            <Typography variant="h6">Lagrange Multipliers Method</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography paragraph>
                To solve this <strong>constrained optimization problem</strong>, we use the method of
                <strong> Lagrange multipliers</strong>.
              </Typography>

              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    📖 Quick Review: Lagrange Multipliers
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography paragraph>
                    For a constrained optimization problem:
                  </Typography>

                  <MathJax>
                    {"\\[ \\max f(\\mathbf{x}) \\quad \\text{subject to} \\quad g(\\mathbf{x}) = 0 \\]"}
                  </MathJax>

                  <Typography paragraph sx={{ mt: 2 }}>
                    We form the <strong>Lagrangian</strong>:
                  </Typography>

                  <MathJax>
                    {"\\[ \\mathcal{L}(\\mathbf{x}, \\lambda) = f(\\mathbf{x}) - \\lambda g(\\mathbf{x}) \\]"}
                  </MathJax>

                  <Typography paragraph sx={{ mt: 2 }}>
                    And solve:
                  </Typography>

                  <MathJax>
                    {"\\[ \\nabla_{\\mathbf{x}} \\mathcal{L} = \\mathbf{0}, \\quad g(\\mathbf{x}) = 0 \\]"}
                  </MathJax>
                </AccordionDetails>
              </Accordion>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Applying to PCA
              </Typography>

              <Paper sx={{ p: 2, bgcolor: 'white', mb: 2 }}>
                <Typography paragraph>
                  Our objective: <MathJax inline>{"\\(f(\\mathbf{v}) = \\mathbf{v}^T \\mathbf{C} \\mathbf{v}\\)"}</MathJax>
                </Typography>

                <Typography paragraph>
                  Our constraint: <MathJax inline>{"\\(g(\\mathbf{v}) = \\mathbf{v}^T \\mathbf{v} - 1 = 0\\)"}</MathJax>
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Typography paragraph>
                  Form the Lagrangian:
                </Typography>

                <MathJax>
                  {"\\[ \\mathcal{L}(\\mathbf{v}, \\lambda) = \\mathbf{v}^T \\mathbf{C} \\mathbf{v} - \\lambda (\\mathbf{v}^T \\mathbf{v} - 1) \\]"}
                </MathJax>
              </Paper>

              <Alert severity="info">
                The Lagrange multiplier <MathJax inline>{"\\(\\lambda\\)"}</MathJax> enforces the constraint.
                At the optimal solution, it will equal the maximum variance!
              </Alert>

              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button onClick={handleBack}>Back</Button>
                <Button variant="contained" onClick={handleNext}>Continue</Button>
              </Box>
            </Paper>
          </StepContent>
        </Step>

        {/* Step 3: Taking the Derivative */}
        <Step>
          <StepLabel>
            <Typography variant="h6">Taking the Gradient</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography variant="h6" gutterBottom>
                Step 1: Compute ∇<sub>v</sub> ℒ
              </Typography>

              <Paper sx={{ p: 2, bgcolor: 'white', mb: 2 }}>
                <Typography paragraph>
                  We need to find where the gradient equals zero:
                </Typography>

                <MathJax>
                  {"\\[ \\frac{\\partial \\mathcal{L}}{\\partial \\mathbf{v}} = \\frac{\\partial}{\\partial \\mathbf{v}} \\left[ \\mathbf{v}^T \\mathbf{C} \\mathbf{v} - \\lambda (\\mathbf{v}^T \\mathbf{v} - 1) \\right] = \\mathbf{0} \\]"}
                </MathJax>
              </Paper>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    📐 Matrix Calculus Rules
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell>
                          <MathJax>{"\\(\\frac{\\partial}{\\partial \\mathbf{x}} (\\mathbf{x}^T \\mathbf{A} \\mathbf{x})\\)"}</MathJax>
                        </TableCell>
                        <TableCell>=</TableCell>
                        <TableCell>
                          <MathJax>{"\\(2 \\mathbf{A} \\mathbf{x}\\)"}</MathJax>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">(if A symmetric)</Typography>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <MathJax>{"\\(\\frac{\\partial}{\\partial \\mathbf{x}} (\\mathbf{x}^T \\mathbf{x})\\)"}</MathJax>
                        </TableCell>
                        <TableCell>=</TableCell>
                        <TableCell>
                          <MathJax>{"\\(2 \\mathbf{x}\\)"}</MathJax>
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>

                  <Alert severity="info" sx={{ mt: 2 }}>
                    The covariance matrix <strong>C</strong> is symmetric, so we can use the first rule.
                  </Alert>
                </AccordionDetails>
              </Accordion>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Applying the Rules
              </Typography>

              <Paper sx={{ p: 2, bgcolor: '#e3f2fd', mb: 2 }}>
                <Typography paragraph>
                  Term 1: <MathJax inline>{"\\(\\frac{\\partial}{\\partial \\mathbf{v}} (\\mathbf{v}^T \\mathbf{C} \\mathbf{v}) = 2 \\mathbf{C} \\mathbf{v}\\)"}</MathJax>
                </Typography>

                <Typography paragraph>
                  Term 2: <MathJax inline>{"\\(\\frac{\\partial}{\\partial \\mathbf{v}} (\\lambda \\mathbf{v}^T \\mathbf{v}) = 2 \\lambda \\mathbf{v}\\)"}</MathJax>
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Typography paragraph>
                  Therefore:
                </Typography>

                <MathJax>
                  {"\\[ \\frac{\\partial \\mathcal{L}}{\\partial \\mathbf{v}} = 2 \\mathbf{C} \\mathbf{v} - 2 \\lambda \\mathbf{v} = \\mathbf{0} \\]"}
                </MathJax>

                <Typography paragraph sx={{ mt: 2 }}>
                  Divide by 2:
                </Typography>

                <MathJax>
                  {"\\[ \\mathbf{C} \\mathbf{v} - \\lambda \\mathbf{v} = \\mathbf{0} \\]"}
                </MathJax>
              </Paper>

              <Alert severity="success" sx={{ mt: 2 }}>
                <AlertTitle>🎯 We've arrived at:</AlertTitle>
                <MathJax>
                  {"\\[ \\mathbf{C} \\mathbf{v} = \\lambda \\mathbf{v} \\]"}
                </MathJax>
                <Typography sx={{ mt: 1 }}>
                  This is the <strong>eigenvalue equation</strong>!
                </Typography>
              </Alert>

              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button onClick={handleBack}>Back</Button>
                <Button variant="contained" onClick={handleNext}>Continue</Button>
              </Box>
            </Paper>
          </StepContent>
        </Step>

        {/* Step 4: The Eigenvalue Equation */}
        <Step>
          <StepLabel>
            <Typography variant="h6">The Eigenvalue Equation</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography variant="h6" gutterBottom>
                What Does This Mean?
              </Typography>

              <Paper sx={{ p: 3, bgcolor: '#fff3e0', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <FunctionsIcon sx={{ fontSize: 40, color: theme.palette.primary.main, mr: 2 }} />
                  <MathJax style={{ fontSize: '1.5rem' }}>
                    {"\\[ \\mathbf{C} \\mathbf{v} = \\lambda \\mathbf{v} \\]"}
                  </MathJax>
                </Box>

                <Typography paragraph>
                  This tells us that <MathJax inline>{"\\(\\mathbf{v}\\)"}</MathJax> must be an
                  <strong> eigenvector</strong> of the covariance matrix <strong>C</strong>,
                  with corresponding eigenvalue <MathJax inline>{"\\(\\lambda\\)"}</MathJax>.
                </Typography>
              </Paper>

              <Typography variant="h6" gutterBottom>
                Which Eigenvector Maximizes Variance?
              </Typography>

              <Paper sx={{ p: 2, bgcolor: 'white', mb: 2 }}>
                <Typography paragraph>
                  Let's compute the variance when <MathJax inline>{"\\(\\mathbf{v}\\)"}</MathJax> is an eigenvector:
                </Typography>

                <MathJax>
                  {"\\[ \\text{Var}(\\mathbf{v}) = \\mathbf{v}^T \\mathbf{C} \\mathbf{v} \\]"}
                </MathJax>

                <Typography paragraph sx={{ mt: 2 }}>
                  Substitute <MathJax inline>{"\\(\\mathbf{C} \\mathbf{v} = \\lambda \\mathbf{v}\\)"}</MathJax>:
                </Typography>

                <MathJax>
                  {"\\[ \\text{Var}(\\mathbf{v}) = \\mathbf{v}^T (\\lambda \\mathbf{v}) = \\lambda (\\mathbf{v}^T \\mathbf{v}) = \\lambda \\cdot 1 = \\lambda \\]"}
                </MathJax>
              </Paper>

              <Alert severity="success" sx={{ mb: 2 }}>
                <AlertTitle>Key Insight #1</AlertTitle>
                The variance along an eigenvector <strong>equals its eigenvalue</strong>!
              </Alert>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ bgcolor: '#e8f5e9' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Largest Eigenvalue λ₁
                      </Typography>
                      <Typography variant="body2">
                        → Eigenvector v₁ = First Principal Component
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        → Direction of <strong>maximum</strong> variance
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card sx={{ bgcolor: '#e3f2fd' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Second Largest λ₂
                      </Typography>
                      <Typography variant="body2">
                        → Eigenvector v₂ = Second Principal Component
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        → Direction of second most variance
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Alert severity="info" sx={{ mt: 2 }}>
                <AlertTitle>Key Insight #2</AlertTitle>
                To maximize variance, choose the eigenvector corresponding to the <strong>largest eigenvalue</strong>.
                For k components, choose the top k eigenvectors.
              </Alert>

              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button onClick={handleBack}>Back</Button>
                <Button variant="contained" onClick={handleNext}>Continue</Button>
              </Box>
            </Paper>
          </StepContent>
        </Step>

        {/* Step 5: Why Eigenvectors are Orthogonal */}
        <Step>
          <StepLabel>
            <Typography variant="h6">Orthogonality of Principal Components</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography paragraph>
                A beautiful property: the principal components (eigenvectors of <strong>C</strong>) are
                <strong> mutually orthogonal</strong>.
              </Typography>

              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    📐 Proof of Orthogonality
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography paragraph>
                    Let <MathJax inline>{"\\(\\mathbf{v}_i\\)"}</MathJax> and <MathJax inline>{"\\(\\mathbf{v}_j\\)"}</MathJax> be
                    eigenvectors with distinct eigenvalues <MathJax inline>{"\\(\\lambda_i \\neq \\lambda_j\\)"}</MathJax>.
                  </Typography>

                  <Paper sx={{ p: 2, bgcolor: 'white', mb: 2 }}>
                    <Typography paragraph>
                      Start with:
                    </Typography>
                    <MathJax>
                      {"\\[ \\mathbf{C} \\mathbf{v}_i = \\lambda_i \\mathbf{v}_i \\]"}
                    </MathJax>

                    <Typography paragraph sx={{ mt: 2 }}>
                      Multiply both sides by <MathJax inline>{"\\(\\mathbf{v}_j^T\\)"}</MathJax>:
                    </Typography>
                    <MathJax>
                      {"\\[ \\mathbf{v}_j^T \\mathbf{C} \\mathbf{v}_i = \\lambda_i \\mathbf{v}_j^T \\mathbf{v}_i \\]"}
                    </MathJax>

                    <Typography paragraph sx={{ mt: 2 }}>
                      Since <strong>C</strong> is symmetric (<MathJax inline>{"\\(\\mathbf{C}^T = \\mathbf{C}\\)"}</MathJax>):
                    </Typography>
                    <MathJax>
                      {"\\[ \\mathbf{v}_j^T \\mathbf{C} \\mathbf{v}_i = (\\mathbf{C} \\mathbf{v}_j)^T \\mathbf{v}_i = (\\lambda_j \\mathbf{v}_j)^T \\mathbf{v}_i = \\lambda_j \\mathbf{v}_j^T \\mathbf{v}_i \\]"}
                    </MathJax>

                    <Typography paragraph sx={{ mt: 2 }}>
                      Therefore:
                    </Typography>
                    <MathJax>
                      {"\\[ \\lambda_i \\mathbf{v}_j^T \\mathbf{v}_i = \\lambda_j \\mathbf{v}_j^T \\mathbf{v}_i \\]"}
                    </MathJax>

                    <Typography paragraph sx={{ mt: 2 }}>
                      Rearrange:
                    </Typography>
                    <MathJax>
                      {"\\[ (\\lambda_i - \\lambda_j) \\mathbf{v}_j^T \\mathbf{v}_i = 0 \\]"}
                    </MathJax>

                    <Typography paragraph sx={{ mt: 2 }}>
                      Since <MathJax inline>{"\\(\\lambda_i \\neq \\lambda_j\\)"}</MathJax>, we must have:
                    </Typography>
                    <MathJax>
                      {"\\[ \\mathbf{v}_j^T \\mathbf{v}_i = 0 \\]"}
                    </MathJax>
                  </Paper>

                  <Alert severity="success">
                    The eigenvectors are <strong>orthogonal</strong>!
                  </Alert>
                </AccordionDetails>
              </Accordion>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Why Does This Matter?
              </Typography>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 32, mb: 1 }} />
                      <Typography variant="h6" gutterBottom>
                        Independence
                      </Typography>
                      <Typography variant="body2">
                        Principal components capture <strong>independent</strong> sources of variation in the data
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 32, mb: 1 }} />
                      <Typography variant="h6" gutterBottom>
                        No Redundancy
                      </Typography>
                      <Typography variant="body2">
                        Each PC captures variance that the others don't
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 32, mb: 1 }} />
                      <Typography variant="h6" gutterBottom>
                        Simplified Geometry
                      </Typography>
                      <Typography variant="body2">
                        Orthogonal basis makes projection and reconstruction trivial
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button onClick={handleBack}>Back</Button>
                <Button variant="contained" onClick={handleNext}>Continue</Button>
              </Box>
            </Paper>
          </StepContent>
        </Step>

        {/* Step 6: Summary */}
        <Step>
          <StepLabel>
            <Typography variant="h6">Summary & Completion</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                🎓 Mathematical Foundation Complete!
              </Typography>

              <Typography paragraph>
                You now understand the rigorous mathematical proof that PCA finds the optimal directions.
              </Typography>

              <Paper sx={{ p: 3, bgcolor: '#e3f2fd', mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  The Complete Proof Chain
                </Typography>

                <Box sx={{ pl: 2 }}>
                  <Typography paragraph>
                    <strong>1.</strong> Formulate as constrained optimization:
                  </Typography>
                  <MathJax>
                    {"\\[ \\max_{\\mathbf{v}} \\mathbf{v}^T \\mathbf{C} \\mathbf{v} \\quad \\text{subject to} \\quad \\mathbf{v}^T \\mathbf{v} = 1 \\]"}
                  </MathJax>

                  <Typography paragraph sx={{ mt: 2 }}>
                    <strong>2.</strong> Use Lagrange multipliers:
                  </Typography>
                  <MathJax>
                    {"\\[ \\mathcal{L}(\\mathbf{v}, \\lambda) = \\mathbf{v}^T \\mathbf{C} \\mathbf{v} - \\lambda (\\mathbf{v}^T \\mathbf{v} - 1) \\]"}
                  </MathJax>

                  <Typography paragraph sx={{ mt: 2 }}>
                    <strong>3.</strong> Take gradient and set to zero:
                  </Typography>
                  <MathJax>
                    {"\\[ \\nabla_{\\mathbf{v}} \\mathcal{L} = 2 \\mathbf{C} \\mathbf{v} - 2 \\lambda \\mathbf{v} = \\mathbf{0} \\]"}
                  </MathJax>

                  <Typography paragraph sx={{ mt: 2 }}>
                    <strong>4.</strong> Arrive at eigenvalue equation:
                  </Typography>
                  <MathJax>
                    {"\\[ \\mathbf{C} \\mathbf{v} = \\lambda \\mathbf{v} \\]"}
                  </MathJax>

                  <Typography paragraph sx={{ mt: 2 }}>
                    <strong>5.</strong> Show variance equals eigenvalue:
                  </Typography>
                  <MathJax>
                    {"\\[ \\text{Var}(\\mathbf{v}) = \\mathbf{v}^T \\mathbf{C} \\mathbf{v} = \\lambda \\]"}
                  </MathJax>

                  <Typography paragraph sx={{ mt: 2 }}>
                    <strong>6.</strong> Conclude: largest eigenvalue → maximum variance
                  </Typography>
                </Box>
              </Paper>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ bgcolor: '#e8f5e9' }}>
                    <CardContent>
                      <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 40, mb: 1 }} />
                      <Typography variant="h6" gutterBottom>
                        Key Takeaways
                      </Typography>
                      <ul>
                        <li><Typography variant="body2">PCA is the solution to a precise optimization problem</Typography></li>
                        <li><Typography variant="body2">Eigenvalues = variance captured</Typography></li>
                        <li><Typography variant="body2">Eigenvectors = principal components (orthogonal)</Typography></li>
                        <li><Typography variant="body2">Largest eigenvalue = maximum variance direction</Typography></li>
                      </ul>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card sx={{ bgcolor: '#fff3e0' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary">
                        Why This Matters
                      </Typography>
                      <Typography variant="body2" paragraph>
                        This proof shows PCA isn't just a heuristic—it's the <strong>provably optimal</strong> linear
                        method for:
                      </Typography>
                      <ul>
                        <li><Typography variant="body2">Maximizing variance</Typography></li>
                        <li><Typography variant="body2">Minimizing reconstruction error</Typography></li>
                        <li><Typography variant="body2">Finding uncorrelated components</Typography></li>
                      </ul>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Alert severity="info" sx={{ mb: 2 }}>
                <AlertTitle>Next Lesson</AlertTitle>
                Continue to <strong>Lesson 8: The Kernel Trick Preview</strong> to see how PCA extends
                to nonlinear data through Kernel PCA.
              </Alert>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button onClick={handleBack}>Back</Button>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircleIcon />}
                  onClick={handleComplete}
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

export default Lesson07_Proof;
