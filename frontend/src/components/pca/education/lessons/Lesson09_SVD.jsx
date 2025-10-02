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
  TableCell,
  TableHead
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { MathJax } from 'better-react-mathjax';

/**
 * Lesson 9: Relationship to SVD
 *
 * Explains the deep connection between PCA and Singular Value Decomposition
 * Topics covered:
 * - What is SVD
 * - How SVD gives us PCA
 * - Equivalence of eigendecomposition and SVD approaches
 * - When to use SVD vs eigendecomposition
 */

const Lesson09_SVD = ({ onComplete }) => {
  const theme = useTheme();

  // State
  const [activeStep, setActiveStep] = useState(0);

  // Example matrix for visualization
  const exampleMatrix = useMemo(() => {
    return [
      [2, 3],
      [1, 2],
      [0, 1],
      [1, 0]
    ];
  }, []);

  const handleNext = () => {
    setActiveStep(prev => Math.min(prev + 1, 4));
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
        {/* Step 1: What is SVD */}
        <Step>
          <StepLabel>
            <Typography variant="h6">What is SVD?</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography variant="h6" gutterBottom>
                Singular Value Decomposition (SVD)
              </Typography>

              <Paper sx={{ p: 3, bgcolor: '#e3f2fd', mb: 2 }}>
                <Typography paragraph>
                  SVD is a fundamental matrix factorization that works for <strong>any</strong> matrix
                  (not just square or symmetric).
                </Typography>

                <MathJax>
                  {"\\[ \\mathbf{X} = \\mathbf{U} \\mathbf{\\Sigma} \\mathbf{V}^T \\]"}
                </MathJax>

                <Typography paragraph sx={{ mt: 2 }}>
                  Where:
                </Typography>

                <ul>
                  <li>
                    <Typography>
                      <MathJax inline>{"\\(\\mathbf{X}\\)"}</MathJax>: n × d data matrix (n samples, d features)
                    </Typography>
                  </li>
                  <li>
                    <Typography>
                      <MathJax inline>{"\\(\\mathbf{U}\\)"}</MathJax>: n × n orthogonal matrix (left singular vectors)
                    </Typography>
                  </li>
                  <li>
                    <Typography>
                      <MathJax inline>{"\\(\\mathbf{\\Sigma}\\)"}</MathJax>: n × d diagonal matrix (singular values)
                    </Typography>
                  </li>
                  <li>
                    <Typography>
                      <MathJax inline>{"\\(\\mathbf{V}\\)"}</MathJax>: d × d orthogonal matrix (right singular vectors)
                    </Typography>
                  </li>
                </ul>
              </Paper>

              <Alert severity="info" sx={{ mb: 2 }}>
                <AlertTitle>Key Property</AlertTitle>
                <MathJax inline>{"\\(\\mathbf{U}\\)"}</MathJax> and <MathJax inline>{"\\(\\mathbf{V}\\)"}</MathJax> are
                orthogonal: <MathJax inline>{"\\(\\mathbf{U}^T \\mathbf{U} = \\mathbf{I}\\)"}</MathJax>,
                <MathJax inline>{"\\(\\mathbf{V}^T \\mathbf{V} = \\mathbf{I}\\)"}</MathJax>
              </Alert>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Geometric Interpretation
              </Typography>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" color="primary" gutterBottom>
                        <MathJax inline>{"\\(\\mathbf{V}^T\\)"}</MathJax>: Rotate
                      </Typography>
                      <Typography variant="body2">
                        Rotate to principal axes
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" color="primary" gutterBottom>
                        <MathJax inline>{"\\(\\mathbf{\\Sigma}\\)"}</MathJax>: Scale
                      </Typography>
                      <Typography variant="body2">
                        Stretch along each axis by singular values
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" color="primary" gutterBottom>
                        <MathJax inline>{"\\(\\mathbf{U}\\)"}</MathJax>: Rotate
                      </Typography>
                      <Typography variant="body2">
                        Rotate to output space
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Typography variant="h6" gutterBottom>
                The Singular Values
              </Typography>

              <Paper sx={{ p: 2, bgcolor: 'white', mb: 2 }}>
                <MathJax>
                  {"\\[ \\mathbf{\\Sigma} = \\begin{bmatrix} \\sigma_1 & 0 & 0 & \\cdots \\\\ 0 & \\sigma_2 & 0 & \\cdots \\\\ 0 & 0 & \\sigma_3 & \\cdots \\\\ \\vdots & \\vdots & \\vdots & \\ddots \\end{bmatrix} \\]"}
                </MathJax>

                <Typography paragraph sx={{ mt: 2 }}>
                  By convention: <MathJax inline>{"\\(\\sigma_1 \\geq \\sigma_2 \\geq \\sigma_3 \\geq \\cdots \\geq 0\\)"}</MathJax>
                </Typography>
              </Paper>

              <Button variant="contained" onClick={handleNext} sx={{ mt: 2 }}>
                Continue
              </Button>
            </Paper>
          </StepContent>
        </Step>

        {/* Step 2: SVD → PCA */}
        <Step>
          <StepLabel>
            <Typography variant="h6">How SVD Gives Us PCA</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography paragraph>
                Here's the beautiful connection: <strong>The right singular vectors of the centered
                data matrix are exactly the principal components!</strong>
              </Typography>

              <Paper sx={{ p: 3, bgcolor: '#fff3e0', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CompareArrowsIcon sx={{ fontSize: 40, color: theme.palette.primary.main, mr: 2 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    The Key Equivalence
                  </Typography>
                </Box>

                <Typography paragraph>
                  Given centered data matrix <MathJax inline>{"\\(\\mathbf{X}\\)"}</MathJax> (mean-subtracted),
                  perform SVD:
                </Typography>

                <MathJax>
                  {"\\[ \\mathbf{X} = \\mathbf{U} \\mathbf{\\Sigma} \\mathbf{V}^T \\]"}
                </MathJax>

                <Alert severity="success" sx={{ mt: 2, mb: 2 }}>
                  The columns of <MathJax inline>{"\\(\\mathbf{V}\\)"}</MathJax> are the principal components!
                </Alert>

                <Typography paragraph>
                  Moreover:
                </Typography>

                <ul>
                  <li>
                    <Typography>
                      Singular values <MathJax inline>{"\\(\\sigma_i\\)"}</MathJax> relate to eigenvalues:
                      <MathJax inline>{"\\(\\lambda_i = \\sigma_i^2 / n\\)"}</MathJax>
                    </Typography>
                  </li>
                  <li>
                    <Typography>
                      Projected data: <MathJax inline>{"\\(\\mathbf{Z} = \\mathbf{X} \\mathbf{V} = \\mathbf{U} \\mathbf{\\Sigma}\\)"}</MathJax>
                    </Typography>
                  </li>
                </ul>
              </Paper>

              <Typography variant="h6" gutterBottom>
                Why Does This Work?
              </Typography>

              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    📐 Mathematical Proof
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography paragraph>
                    Start with the covariance matrix:
                  </Typography>

                  <MathJax>
                    {"\\[ \\mathbf{C} = \\frac{1}{n} \\mathbf{X}^T \\mathbf{X} \\]"}
                  </MathJax>

                  <Typography paragraph sx={{ mt: 2 }}>
                    Substitute the SVD <MathJax inline>{"\\(\\mathbf{X} = \\mathbf{U} \\mathbf{\\Sigma} \\mathbf{V}^T\\)"}</MathJax>:
                  </Typography>

                  <MathJax>
                    {"\\[ \\mathbf{C} = \\frac{1}{n} (\\mathbf{U} \\mathbf{\\Sigma} \\mathbf{V}^T)^T (\\mathbf{U} \\mathbf{\\Sigma} \\mathbf{V}^T) \\]"}
                  </MathJax>

                  <Typography paragraph sx={{ mt: 2 }}>
                    Simplify using transpose properties:
                  </Typography>

                  <MathJax>
                    {"\\[ \\mathbf{C} = \\frac{1}{n} \\mathbf{V} \\mathbf{\\Sigma}^T \\mathbf{U}^T \\mathbf{U} \\mathbf{\\Sigma} \\mathbf{V}^T \\]"}
                  </MathJax>

                  <Typography paragraph sx={{ mt: 2 }}>
                    Since <MathJax inline>{"\\(\\mathbf{U}^T \\mathbf{U} = \\mathbf{I}\\)"}</MathJax>:
                  </Typography>

                  <MathJax>
                    {"\\[ \\mathbf{C} = \\frac{1}{n} \\mathbf{V} \\mathbf{\\Sigma}^T \\mathbf{\\Sigma} \\mathbf{V}^T \\]"}
                  </MathJax>

                  <Typography paragraph sx={{ mt: 2 }}>
                    Note that <MathJax inline>{"\\(\\mathbf{\\Sigma}^T \\mathbf{\\Sigma}\\)"}</MathJax> is diagonal with
                    entries <MathJax inline>{"\\(\\sigma_i^2\\)"}</MathJax>:
                  </Typography>

                  <MathJax>
                    {"\\[ \\mathbf{C} = \\mathbf{V} \\left( \\frac{1}{n} \\mathbf{\\Sigma}^T \\mathbf{\\Sigma} \\right) \\mathbf{V}^T \\]"}
                  </MathJax>

                  <Alert severity="success" sx={{ mt: 2 }}>
                    This is the eigendecomposition of <strong>C</strong>! The columns of <strong>V</strong> are
                    eigenvectors, and <MathJax inline>{"\\(\\lambda_i = \\sigma_i^2 / n\\)"}</MathJax>.
                  </Alert>
                </AccordionDetails>
              </Accordion>

              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button onClick={handleBack}>Back</Button>
                <Button variant="contained" onClick={handleNext}>Continue</Button>
              </Box>
            </Paper>
          </StepContent>
        </Step>

        {/* Step 3: Comparison Table */}
        <Step>
          <StepLabel>
            <Typography variant="h6">PCA via Eigendecomposition vs SVD</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography paragraph>
                There are two computational paths to PCA. Both give identical results!
              </Typography>

              <Paper sx={{ p: 0, overflow: 'hidden', mb: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#e3f2fd' }}>
                      <TableCell><strong>Aspect</strong></TableCell>
                      <TableCell><strong>Eigendecomposition Method</strong></TableCell>
                      <TableCell><strong>SVD Method</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell><strong>Step 1</strong></TableCell>
                      <TableCell>
                        Compute covariance matrix
                        <MathJax>{"\\(\\mathbf{C} = \\frac{1}{n} \\mathbf{X}^T \\mathbf{X}\\)"}</MathJax>
                      </TableCell>
                      <TableCell>
                        Directly decompose data matrix
                        <MathJax>{"\\(\\mathbf{X} = \\mathbf{U} \\mathbf{\\Sigma} \\mathbf{V}^T\\)"}</MathJax>
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell><strong>Step 2</strong></TableCell>
                      <TableCell>
                        Eigendecomposition:
                        <MathJax>{"\\(\\mathbf{C} = \\mathbf{V} \\mathbf{\\Lambda} \\mathbf{V}^T\\)"}</MathJax>
                      </TableCell>
                      <TableCell>
                        Extract right singular vectors <strong>V</strong>
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell><strong>PCs</strong></TableCell>
                      <TableCell>Columns of <strong>V</strong></TableCell>
                      <TableCell>Columns of <strong>V</strong></TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell><strong>Variance</strong></TableCell>
                      <TableCell>Eigenvalues <MathJax inline>{"\\(\\lambda_i\\)"}</MathJax></TableCell>
                      <TableCell><MathJax inline>{"\\(\\sigma_i^2 / n\\)"}</MathJax></TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell><strong>Complexity</strong></TableCell>
                      <TableCell>
                        <MathJax inline>{"\\(O(d^2 n + d^3)\\)"}</MathJax>
                      </TableCell>
                      <TableCell>
                        <MathJax inline>{"\\(O(nd \\min(n,d))\\)"}</MathJax>
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell><strong>When n {">"} d</strong></TableCell>
                      <TableCell>Better (smaller covariance matrix)</TableCell>
                      <TableCell>Slower</TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell><strong>When d {">"} n</strong></TableCell>
                      <TableCell>Slower (large covariance matrix)</TableCell>
                      <TableCell>Better (thin SVD)</TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell><strong>Numerical Stability</strong></TableCell>
                      <TableCell>Less stable (squaring errors)</TableCell>
                      <TableCell>More stable</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Paper>

              <Alert severity="info" sx={{ mb: 2 }}>
                <AlertTitle>Practical Advice</AlertTitle>
                In practice, use the <strong>SVD method</strong>. Modern libraries (numpy, scikit-learn)
                use SVD because it's more numerically stable and often faster, especially for tall matrices.
              </Alert>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Why is SVD More Stable?
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography paragraph>
                    Computing <MathJax inline>{"\\(\\mathbf{C} = \\mathbf{X}^T \\mathbf{X}\\)"}</MathJax> squares
                    the condition number of the matrix, amplifying numerical errors.
                  </Typography>

                  <Typography paragraph>
                    Example: If <strong>X</strong> has condition number 10³, then <strong>C</strong> has
                    condition number 10⁶, making eigenvalue computation less accurate.
                  </Typography>

                  <Typography paragraph>
                    SVD operates directly on <strong>X</strong> without this squaring step, maintaining
                    better numerical precision.
                  </Typography>
                </AccordionDetails>
              </Accordion>

              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button onClick={handleBack}>Back</Button>
                <Button variant="contained" onClick={handleNext}>Continue</Button>
              </Box>
            </Paper>
          </StepContent>
        </Step>

        {/* Step 4: Truncated SVD */}
        <Step>
          <StepLabel>
            <Typography variant="h6">Truncated SVD for Efficiency</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography variant="h6" gutterBottom>
                Computing Only k Components
              </Typography>

              <Typography paragraph>
                Often we only need the top k principal components (k {"<<"} d). We don't need the full SVD!
              </Typography>

              <Paper sx={{ p: 2, bgcolor: '#e8f5e9', mb: 2 }}>
                <Typography paragraph>
                  <strong>Truncated SVD</strong> (also called partial SVD) computes only the largest k singular
                  values and corresponding vectors:
                </Typography>

                <MathJax>
                  {"\\[ \\mathbf{X} \\approx \\mathbf{U}_k \\mathbf{\\Sigma}_k \\mathbf{V}_k^T \\]"}
                </MathJax>

                <Typography paragraph sx={{ mt: 2 }}>
                  Where:
                </Typography>

                <ul>
                  <li><Typography><MathJax inline>{"\\(\\mathbf{U}_k\\)"}</MathJax>: First k columns of U</Typography></li>
                  <li><Typography><MathJax inline>{"\\(\\mathbf{\\Sigma}_k\\)"}</MathJax>: k × k diagonal matrix with top k singular values</Typography></li>
                  <li><Typography><MathJax inline>{"\\(\\mathbf{V}_k\\)"}</MathJax>: First k columns of V (the PCs!)</Typography></li>
                </ul>
              </Paper>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ bgcolor: '#fff3e0' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Full SVD
                      </Typography>
                      <Typography variant="body2">
                        Complexity: <MathJax inline>{"\\(O(nd^2)\\)"}</MathJax>
                      </Typography>
                      <Typography variant="body2">
                        Memory: Store all n×n and d×d matrices
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Use when: Need all components
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card sx={{ bgcolor: '#e8f5e9' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Truncated SVD (k components)
                      </Typography>
                      <Typography variant="body2">
                        Complexity: <MathJax inline>{"\\(O(ndk)\\)"}</MathJax>
                      </Typography>
                      <Typography variant="body2">
                        Memory: Much less!
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Use when: k {"<<"} min(n,d) (almost always!)
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Alert severity="success" sx={{ mb: 2 }}>
                <AlertTitle>Huge Speedup!</AlertTitle>
                For a 10,000 × 1,000 dataset, getting top 10 components:
                <li>Full SVD: ~10 billion operations</li>
                <li>Truncated SVD: ~100 million operations (100× faster!)</li>
              </Alert>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Algorithms for Truncated SVD
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography paragraph>
                    Common algorithms:
                  </Typography>

                  <ul>
                    <li>
                      <Typography paragraph>
                        <strong>Randomized SVD</strong>: Uses random projections. Very fast for k {"<<"} d.
                        Default in scikit-learn when n and d are large.
                      </Typography>
                    </li>
                    <li>
                      <Typography paragraph>
                        <strong>Lanczos/Arnoldi</strong>: Iterative methods that converge to top eigenvectors.
                        Used in scipy.sparse.linalg.
                      </Typography>
                    </li>
                    <li>
                      <Typography paragraph>
                        <strong>Power Iteration</strong>: Simple but slower. Good for teaching!
                      </Typography>
                    </li>
                  </ul>
                </AccordionDetails>
              </Accordion>

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
                🎯 SVD Connection Complete!
              </Typography>

              <Typography paragraph>
                You now understand the deep mathematical connection between PCA and SVD, and when to use each approach.
              </Typography>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ bgcolor: '#e3f2fd' }}>
                    <CardContent>
                      <CheckCircleIcon sx={{ color: '#2196f3', fontSize: 40, mb: 1 }} />
                      <Typography variant="h6" gutterBottom>
                        Key Insights
                      </Typography>
                      <ul>
                        <li><Typography variant="body2">SVD is a more general factorization than eigendecomposition</Typography></li>
                        <li><Typography variant="body2">Right singular vectors of X = eigenvectors of X<sup>T</sup>X</Typography></li>
                        <li><Typography variant="body2">λ<sub>i</sub> = σ<sub>i</sub><sup>2</sup> / n</Typography></li>
                        <li><Typography variant="body2">SVD is more numerically stable</Typography></li>
                      </ul>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card sx={{ bgcolor: '#e8f5e9' }}>
                    <CardContent>
                      <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 40, mb: 1 }} />
                      <Typography variant="h6" gutterBottom>
                        Practical Takeaways
                      </Typography>
                      <ul>
                        <li><Typography variant="body2">Use SVD in practice (numpy, sklearn do this)</Typography></li>
                        <li><Typography variant="body2">Use truncated SVD for large datasets</Typography></li>
                        <li><Typography variant="body2">Randomized SVD for very large, sparse data</Typography></li>
                        <li><Typography variant="body2">Both methods give identical mathematical results</Typography></li>
                      </ul>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Paper sx={{ p: 3, bgcolor: '#fff3e0', mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  The Complete Picture
                </Typography>

                <Box sx={{ pl: 2 }}>
                  <Typography paragraph>
                    <strong>Method 1: Eigendecomposition</strong>
                  </Typography>
                  <MathJax>
                    {"\\[ \\mathbf{X}^T \\mathbf{X} = \\mathbf{V} \\mathbf{\\Lambda} \\mathbf{V}^T \\quad \\Rightarrow \\quad \\text{PCs are columns of } \\mathbf{V} \\]"}
                  </MathJax>

                  <Typography paragraph sx={{ mt: 3 }}>
                    <strong>Method 2: SVD</strong>
                  </Typography>
                  <MathJax>
                    {"\\[ \\mathbf{X} = \\mathbf{U} \\mathbf{\\Sigma} \\mathbf{V}^T \\quad \\Rightarrow \\quad \\text{PCs are columns of } \\mathbf{V} \\]"}
                  </MathJax>

                  <Alert severity="success" sx={{ mt: 2 }}>
                    Same <strong>V</strong>, same principal components, same results!
                  </Alert>
                </Box>
              </Paper>

              <Alert severity="info" sx={{ mb: 2 }}>
                <AlertTitle>Final Lesson!</AlertTitle>
                Continue to <strong>Lesson 10: Real-World Applications</strong> to see PCA in action
                across different domains and complete the PCA curriculum!
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

export default Lesson09_SVD;
