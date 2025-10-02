import React, { useState } from 'react';
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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tabs,
  Tab
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FaceIcon from '@mui/icons-material/Face';
import BiotechIcon from '@mui/icons-material/Biotech';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import ImageIcon from '@mui/icons-material/Image';
import DataUsageIcon from '@mui/icons-material/DataUsage';
import EmojiObjectsIcon from '@mui/icons-material/EmojiObjects';
import CheckIcon from '@mui/icons-material/Check';
import { MathJax } from 'better-react-mathjax';

/**
 * Lesson 10: Real-World Applications
 *
 * Showcases PCA applications across multiple domains
 * Domains covered:
 * - Computer Vision (Eigenfaces)
 * - Bioinformatics (Gene Expression)
 * - Finance (Portfolio Analysis)
 * - Image Compression
 * - Recommender Systems
 * - Data Visualization
 */

const Lesson10_Applications = ({ onComplete }) => {
  const theme = useTheme();

  // State
  const [activeStep, setActiveStep] = useState(0);
  const [selectedDomain, setSelectedDomain] = useState(0);

  const domains = [
    {
      name: 'Computer Vision',
      icon: <FaceIcon />,
      color: '#2196f3',
      application: 'Eigenfaces',
      description: 'Face recognition using PCA',
      problemSize: '10,000 images × 100,000 pixels → 50-150 eigenfaces',
      why: 'Face images lie on a low-dimensional manifold despite high pixel count',
      keyInsight: 'First ~50 PCs capture 90%+ of facial variation',
      realWorld: 'Used in security systems, photo tagging, biometrics'
    },
    {
      name: 'Bioinformatics',
      icon: <BiotechIcon />,
      color: '#4caf50',
      application: 'Gene Expression Analysis',
      description: 'Analyzing microarray/RNA-seq data',
      problemSize: '20,000 genes × 100 samples → 2-10 PCs',
      why: 'Genes work in coordinated pathways, creating low-dimensional structure',
      keyInsight: 'First few PCs often correspond to biological processes',
      realWorld: 'Cancer classification, drug discovery, evolutionary biology'
    },
    {
      name: 'Finance',
      icon: <ShowChartIcon />,
      color: '#ff9800',
      application: 'Portfolio Risk Analysis',
      description: 'Understanding correlated stock movements',
      problemSize: '500 stocks × 1000 days → 3-5 factors',
      why: 'Stocks move together based on market sectors and economic factors',
      keyInsight: 'First PC often represents "market factor", PC2-3 capture sector effects',
      realWorld: 'Risk management, index funds, algorithmic trading'
    },
    {
      name: 'Image Processing',
      icon: <ImageIcon />,
      color: '#9c27b0',
      application: 'Image Compression',
      description: 'Lossy compression via dimensionality reduction',
      problemSize: '1000×1000 image → keep top 100 PCs',
      why: 'Natural images have redundancy and smooth regions',
      keyInsight: 'Can achieve 10:1 compression with minimal visual quality loss',
      realWorld: 'JPEG-like compression, medical imaging, satellite imagery'
    },
    {
      name: 'Recommender Systems',
      icon: <DataUsageIcon />,
      color: '#f44336',
      application: 'Latent Factor Models',
      description: 'Finding hidden user/item preferences',
      problemSize: '1M users × 10k items → 20-50 latent factors',
      why: 'User preferences driven by small number of underlying tastes',
      keyInsight: 'PCA on user-item matrix reveals genre/category structure',
      realWorld: 'Netflix, Amazon, Spotify recommendations'
    }
  ];

  const handleNext = () => {
    setActiveStep(prev => Math.min(prev + 1, 3));
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
        {/* Step 1: Overview */}
        <Step>
          <StepLabel>
            <Typography variant="h6">PCA Across Domains</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography paragraph>
                PCA is one of the most widely-used techniques in data science. It appears in virtually
                every field that works with high-dimensional data.
              </Typography>

              <Alert severity="info" sx={{ mb: 3 }}>
                <AlertTitle>Common Pattern</AlertTitle>
                Despite coming from different domains, PCA applications share a theme:
                <strong> high-dimensional data with low-dimensional structure</strong>.
              </Alert>

              <Grid container spacing={2}>
                {domains.map((domain, idx) => (
                  <Grid item xs={12} md={6} key={idx}>
                    <Card
                      sx={{
                        height: '100%',
                        borderLeft: `4px solid ${domain.color}`,
                        transition: 'transform 0.2s',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: 4
                        }
                      }}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Box sx={{ color: domain.color, mr: 1 }}>
                            {domain.icon}
                          </Box>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {domain.name}
                          </Typography>
                        </Box>

                        <Typography variant="subtitle2" color="primary" gutterBottom>
                          {domain.application}
                        </Typography>

                        <Typography variant="body2" color="text.secondary" paragraph>
                          {domain.description}
                        </Typography>

                        <Chip
                          label={domain.problemSize}
                          size="small"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              <Button variant="contained" onClick={handleNext} sx={{ mt: 3 }}>
                Explore Applications
              </Button>
            </Paper>
          </StepContent>
        </Step>

        {/* Step 2: Detailed Applications */}
        <Step>
          <StepLabel>
            <Typography variant="h6">Application Deep Dives</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Tabs
                value={selectedDomain}
                onChange={(e, val) => setSelectedDomain(val)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ mb: 3 }}
              >
                {domains.map((domain, idx) => (
                  <Tab
                    key={idx}
                    icon={domain.icon}
                    label={domain.name}
                    iconPosition="start"
                  />
                ))}
              </Tabs>

              {/* Domain content */}
              <Paper sx={{ p: 3, bgcolor: 'white', borderTop: `4px solid ${domains[selectedDomain].color}` }}>
                <Typography variant="h5" gutterBottom sx={{ color: domains[selectedDomain].color }}>
                  {domains[selectedDomain].application}
                </Typography>

                <Typography paragraph>
                  {domains[selectedDomain].description}
                </Typography>

                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={12} md={6}>
                    <Card sx={{ bgcolor: '#f5f5f5', height: '100%' }}>
                      <CardContent>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
                          Problem Scale
                        </Typography>
                        <Typography variant="body2">
                          {domains[selectedDomain].problemSize}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Card sx={{ bgcolor: '#e3f2fd', height: '100%' }}>
                      <CardContent>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
                          Why PCA Works
                        </Typography>
                        <Typography variant="body2">
                          {domains[selectedDomain].why}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                <Alert severity="success" sx={{ mb: 2 }}>
                  <AlertTitle>Key Insight</AlertTitle>
                  {domains[selectedDomain].keyInsight}
                </Alert>

                {/* Domain-specific details */}
                {selectedDomain === 0 && (
                  <Accordion defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        Eigenfaces: How It Works
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List>
                        <ListItem>
                          <ListItemIcon><CheckIcon /></ListItemIcon>
                          <ListItemText
                            primary="1. Collect Training Set"
                            secondary="Gather 1000s of face images, normalize to same size (e.g., 100×100 pixels)"
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><CheckIcon /></ListItemIcon>
                          <ListItemText
                            primary="2. Vectorize Images"
                            secondary="Each 100×100 image becomes a 10,000-dimensional vector"
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><CheckIcon /></ListItemIcon>
                          <ListItemText
                            primary="3. Compute PCA"
                            secondary="Find principal components (eigenfaces) of the image matrix"
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><CheckIcon /></ListItemIcon>
                          <ListItemText
                            primary="4. Project New Faces"
                            secondary="Represent any face as weighted sum of ~50-150 eigenfaces"
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><CheckIcon /></ListItemIcon>
                          <ListItemText
                            primary="5. Compare in Low-D Space"
                            secondary="Face recognition becomes comparing 50-D vectors instead of 10,000-D"
                          />
                        </ListItem>
                      </List>

                      <Typography paragraph sx={{ mt: 2 }}>
                        <strong>Historical Note:</strong> Eigenfaces (Turk & Pentland, 1991) was revolutionary,
                        enabling real-time face recognition on 1990s hardware.
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                )}

                {selectedDomain === 1 && (
                  <Accordion defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        Gene Expression Analysis Details
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography paragraph>
                        In genomics, we often have a matrix where:
                      </Typography>

                      <ul>
                        <li><Typography>Rows = genes (20,000+)</Typography></li>
                        <li><Typography>Columns = samples (patients, conditions, timepoints)</Typography></li>
                        <li><Typography>Values = expression level of each gene</Typography></li>
                      </ul>

                      <Typography paragraph sx={{ mt: 2 }}>
                        <strong>What PCA reveals:</strong>
                      </Typography>

                      <List dense>
                        <ListItem>
                          <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                          <ListItemText
                            primary="PC1: Often separates cancer vs normal"
                            secondary="Captures the largest source of variation"
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                          <ListItemText
                            primary="PC2-3: Cancer subtypes"
                            secondary="Different molecular pathways"
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                          <ListItemText
                            primary="PC4+: Technical variation"
                            secondary="Batch effects, sample quality"
                          />
                        </ListItem>
                      </List>

                      <Alert severity="info" sx={{ mt: 2 }}>
                        PCA plots are the <strong>first thing</strong> researchers do when analyzing gene
                        expression data. It reveals data quality issues and biological signal.
                      </Alert>
                    </AccordionDetails>
                  </Accordion>
                )}

                {selectedDomain === 2 && (
                  <Accordion defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        Finance: Factor Models
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography paragraph>
                        In quantitative finance, PCA is used to decompose stock returns into common factors:
                      </Typography>

                      <MathJax>
                        {"\\[ R_i(t) = \\sum_{j=1}^k \\beta_{ij} F_j(t) + \\epsilon_i(t) \\]"}
                      </MathJax>

                      <Typography paragraph sx={{ mt: 2 }}>
                        Where:
                      </Typography>

                      <ul>
                        <li><Typography><MathJax inline>{"\\(R_i(t)\\)"}</MathJax>: Return of stock i at time t</Typography></li>
                        <li><Typography><MathJax inline>{"\\(F_j(t)\\)"}</MathJax>: j-th principal component (factor)</Typography></li>
                        <li><Typography><MathJax inline>{"\\(\\beta_{ij}\\)"}</MathJax>: Loading of stock i on factor j</Typography></li>
                        <li><Typography><MathJax inline>{"\\(\\epsilon_i(t)\\)"}</MathJax>: Idiosyncratic (stock-specific) risk</Typography></li>
                      </ul>

                      <Typography paragraph sx={{ mt: 2 }}>
                        <strong>Interpretation:</strong>
                      </Typography>

                      <List dense>
                        <ListItem>
                          <ListItemText
                            primary="PC1: Market Factor (~40% variance)"
                            secondary="When market goes up, all stocks tend to rise"
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="PC2: Value vs Growth (~15% variance)"
                            secondary="Tech stocks vs traditional companies"
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="PC3: Size Factor (~10% variance)"
                            secondary="Large cap vs small cap"
                          />
                        </ListItem>
                      </List>

                      <Alert severity="warning" sx={{ mt: 2 }}>
                        <strong>Portfolio Risk:</strong> Diversification is only effective against idiosyncratic
                        risk (ε). You can't diversify away systematic risk captured by the first few PCs!
                      </Alert>
                    </AccordionDetails>
                  </Accordion>
                )}

                {selectedDomain === 3 && (
                  <Accordion defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        Image Compression Example
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography paragraph>
                        PCA can compress images by keeping only top principal components:
                      </Typography>

                      <Paper sx={{ p: 2, bgcolor: '#f5f5f5', mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Compression Process:
                        </Typography>

                        <List dense>
                          <ListItem>
                            <ListItemIcon><Typography>1.</Typography></ListItemIcon>
                            <ListItemText primary="Break image into 8×8 blocks (64 pixels each)" />
                          </ListItem>
                          <ListItem>
                            <ListItemIcon><Typography>2.</Typography></ListItemIcon>
                            <ListItemText primary="Treat each block as a 64-dimensional vector" />
                          </ListItem>
                          <ListItem>
                            <ListItemIcon><Typography>3.</Typography></ListItemIcon>
                            <ListItemText primary="Compute PCA basis from training images" />
                          </ListItem>
                          <ListItem>
                            <ListItemIcon><Typography>4.</Typography></ListItemIcon>
                            <ListItemText primary="Project each block onto top k PCs (e.g., k=10)" />
                          </ListItem>
                          <ListItem>
                            <ListItemIcon><Typography>5.</Typography></ListItemIcon>
                            <ListItemText primary="Store only k coefficients instead of 64 pixels" />
                          </ListItem>
                        </List>
                      </Paper>

                      <Typography paragraph>
                        <strong>Compression Ratio:</strong>
                      </Typography>

                      <ul>
                        <li><Typography>Original: 64 values per block</Typography></li>
                        <li><Typography>Compressed: 10 values per block</Typography></li>
                        <li><Typography>Ratio: <strong>6.4:1 compression</strong></Typography></li>
                      </ul>

                      <Alert severity="info" sx={{ mt: 2 }}>
                        This is similar to how JPEG works, though JPEG uses Discrete Cosine Transform (DCT)
                        instead of PCA. DCT is faster and doesn't require training data.
                      </Alert>
                    </AccordionDetails>
                  </Accordion>
                )}

                {selectedDomain === 4 && (
                  <Accordion defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        Recommender Systems: Latent Factors
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography paragraph>
                        Consider a user-item matrix:
                      </Typography>

                      <ul>
                        <li><Typography>Rows: Users (millions)</Typography></li>
                        <li><Typography>Columns: Items (movies, products, songs)</Typography></li>
                        <li><Typography>Values: Ratings (1-5 stars) - mostly empty!</Typography></li>
                      </ul>

                      <Typography paragraph sx={{ mt: 2 }}>
                        <strong>PCA/SVD discovers latent factors:</strong>
                      </Typography>

                      <Paper sx={{ p: 2, bgcolor: '#e3f2fd', mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Movie Example:
                        </Typography>

                        <List dense>
                          <ListItem>
                            <ListItemText
                              primary="Factor 1: Action vs Drama"
                              secondary="High: explosions & car chases; Low: dialogue-heavy dramas"
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText
                              primary="Factor 2: Mainstream vs Indie"
                              secondary="High: blockbusters; Low: art house films"
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText
                              primary="Factor 3: Old vs New"
                              secondary="High: recent releases; Low: classics"
                            />
                          </ListItem>
                        </List>
                      </Paper>

                      <Typography paragraph>
                        <strong>Recommendation:</strong> If user and item have similar factor profiles,
                        recommend the item!
                      </Typography>

                      <MathJax>
                        {"\\[ \\text{predicted\\_rating}(u, i) \\approx \\sum_{k=1}^K \\text{user}_u[k] \\times \\text{item}_i[k] \\]"}
                      </MathJax>

                      <Alert severity="success" sx={{ mt: 2 }}>
                        <strong>Netflix Prize:</strong> SVD-based methods were crucial in the $1M Netflix
                        Prize competition. Modern recommenders use more advanced techniques, but PCA/SVD
                        remains a strong baseline.
                      </Alert>
                    </AccordionDetails>
                  </Accordion>
                )}

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
                  Real-World Impact
                </Typography>

                <Typography variant="body2" paragraph>
                  {domains[selectedDomain].realWorld}
                </Typography>
              </Paper>

              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button onClick={handleBack}>Back</Button>
                <Button variant="contained" onClick={handleNext}>Continue</Button>
              </Box>
            </Paper>
          </StepContent>
        </Step>

        {/* Step 3: Best Practices */}
        <Step>
          <StepLabel>
            <Typography variant="h6">Best Practices & Pitfalls</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography variant="h6" gutterBottom>
                When to Use PCA (and When Not To)
              </Typography>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ bgcolor: '#e8f5e9', height: '100%' }}>
                    <CardContent>
                      <Typography variant="h6" color="success.main" gutterBottom>
                        ✅ Good Use Cases
                      </Typography>

                      <List dense>
                        <ListItem>
                          <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                          <ListItemText
                            primary="Visualization (2D/3D)"
                            secondary="Explore high-D data visually"
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                          <ListItemText
                            primary="Noise Reduction"
                            secondary="Remove low-variance components"
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                          <ListItemText
                            primary="Speed Up Algorithms"
                            secondary="Reduce dimensions before clustering/classification"
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                          <ListItemText
                            primary="Multicollinearity"
                            secondary="Replace correlated features with PCs"
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                          <ListItemText
                            primary="Compression"
                            secondary="Store/transmit data more efficiently"
                          />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card sx={{ bgcolor: '#ffebee', height: '100%' }}>
                    <CardContent>
                      <Typography variant="h6" color="error.main" gutterBottom>
                        ❌ Poor Use Cases
                      </Typography>

                      <List dense>
                        <ListItem>
                          <ListItemText
                            primary="Categorical Data"
                            secondary="PCA assumes continuous variables; use MCA instead"
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Interpretability Required"
                            secondary="PCs are linear combinations, hard to interpret"
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Nonlinear Relationships"
                            secondary="Consider Kernel PCA, t-SNE, or UMAP"
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Different Scales Not Addressed"
                            secondary="Must standardize first if features have different units"
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Sparse Data"
                            secondary="PCA creates dense representations; lose sparsity"
                          />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Typography variant="h6" gutterBottom>
                Common Pitfalls
              </Typography>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    ⚠️ Pitfall 1: Forgetting to Scale
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography paragraph>
                    <strong>Problem:</strong> Variables with larger variances dominate the principal components,
                    even if they're not more important.
                  </Typography>

                  <Typography paragraph>
                    <strong>Example:</strong> Income in dollars (variance ~ 10<sup>9</sup>) vs age in years
                    (variance ~ 100). PCA will focus almost entirely on income!
                  </Typography>

                  <Alert severity="warning">
                    <strong>Solution:</strong> Standardize variables to mean=0, std=1 before PCA
                    (use correlation matrix instead of covariance matrix)
                  </Alert>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    ⚠️ Pitfall 2: Using PCA for Feature Selection
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography paragraph>
                    <strong>Misconception:</strong> "PCA selects the most important features"
                  </Typography>

                  <Typography paragraph>
                    <strong>Reality:</strong> PCA creates <em>new</em> features (linear combinations).
                    It doesn't select which <em>original</em> features are important.
                  </Typography>

                  <Alert severity="info">
                    <strong>For Feature Selection:</strong> Use methods like LASSO, Random Forest importance,
                    or correlation analysis instead
                  </Alert>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    ⚠️ Pitfall 3: Ignoring Outliers
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography paragraph>
                    <strong>Problem:</strong> PCA is very sensitive to outliers because it maximizes variance.
                  </Typography>

                  <Typography paragraph>
                    <strong>Impact:</strong> A few outliers can completely change the principal components!
                  </Typography>

                  <Alert severity="warning">
                    <strong>Solutions:</strong>
                    <li>Remove outliers before PCA</li>
                    <li>Use robust PCA variants</li>
                    <li>Winsorize extreme values</li>
                  </Alert>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    ⚠️ Pitfall 4: Over-Interpreting PCs
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography paragraph>
                    <strong>Temptation:</strong> Trying to give meaningful names to principal components
                    (e.g., "PC1 = socioeconomic status")
                  </Typography>

                  <Typography paragraph>
                    <strong>Caution:</strong> PCs are mathematical constructs that maximize variance.
                    They may not have clean interpretations!
                  </Typography>

                  <Alert severity="info">
                    Sometimes PCs do align with interpretable concepts (especially in well-structured domains),
                    but this should be validated, not assumed
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

        {/* Step 4: Summary & Completion */}
        <Step>
          <StepLabel>
            <Typography variant="h6">Congratulations!</Typography>
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: theme.palette.success.main }}>
                🎓 PCA Mastery Achieved!
              </Typography>

              <Typography paragraph sx={{ fontSize: '1.1rem' }}>
                You've completed the comprehensive PCA curriculum. You now have both the theoretical
                foundation and practical knowledge to apply PCA effectively.
              </Typography>

              <Paper sx={{ p: 3, bgcolor: '#e8f5e9', mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EmojiObjectsIcon color="success" />
                  What You've Learned
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
                      Foundations (Lessons 1-5)
                    </Typography>
                    <ul>
                      <li><Typography variant="body2">Variance intuition</Typography></li>
                      <li><Typography variant="body2">Finding best directions</Typography></li>
                      <li><Typography variant="body2">Covariance matrices</Typography></li>
                      <li><Typography variant="body2">Eigenvectors & eigenvalues</Typography></li>
                      <li><Typography variant="body2">Eigendecomposition process</Typography></li>
                    </ul>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
                      Advanced Topics (Lessons 6-10)
                    </Typography>
                    <ul>
                      <li><Typography variant="body2">Projection & reconstruction</Typography></li>
                      <li><Typography variant="body2">Variance maximization proof</Typography></li>
                      <li><Typography variant="body2">Kernel PCA for nonlinear data</Typography></li>
                      <li><Typography variant="body2">Relationship to SVD</Typography></li>
                      <li><Typography variant="body2">Real-world applications</Typography></li>
                    </ul>
                  </Grid>
                </Grid>
              </Paper>

              <Typography variant="h6" gutterBottom>
                Next Steps
              </Typography>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" color="primary" gutterBottom>
                        Practice
                      </Typography>
                      <Typography variant="body2">
                        Apply PCA to your own datasets using the PCA Analysis tool
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" color="primary" gutterBottom>
                        Explore Related Topics
                      </Typography>
                      <Typography variant="body2">
                        Study t-SNE, UMAP, ICA, Factor Analysis, Autoencoders
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" color="primary" gutterBottom>
                        Build Projects
                      </Typography>
                      <Typography variant="body2">
                        Implement eigenfaces, compress images, or analyze gene expression data
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Alert severity="success" sx={{ mb: 2 }}>
                <AlertTitle>You're Ready!</AlertTitle>
                You now have the knowledge to use PCA confidently in research, industry, or personal projects.
                Remember: understanding <em>when</em> to use PCA is just as important as knowing <em>how</em>!
              </Alert>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button onClick={handleBack}>Back</Button>
                <Button
                  variant="contained"
                  color="success"
                  size="large"
                  startIcon={<CheckCircleIcon />}
                  onClick={handleComplete}
                  sx={{ fontSize: '1.1rem', py: 1.5, px: 4 }}
                >
                  Complete PCA Curriculum
                </Button>
              </Box>
            </Paper>
          </StepContent>
        </Step>
      </Stepper>
    </Box>
  );
};

export default Lesson10_Applications;
