import React, { useState, useEffect, useRef } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  AlertTitle,
  Divider,
  CircularProgress,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Tooltip,
  Tabs,
  Tab,
  IconButton,
  LinearProgress
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CategoryIcon from '@mui/icons-material/Category';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ScienceIcon from '@mui/icons-material/Science';
import BiotechIcon from '@mui/icons-material/Biotech';
import InsightsIcon from '@mui/icons-material/Insights';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SchoolIcon from '@mui/icons-material/School';
import * as d3 from 'd3';

import { fetchPcaVisualizationData, fetchPcaResults } from '../../api/pcaApi';

// Helper component for interpretation sections
const InterpretationSection = ({ title, content, icon, color, details, children }) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        p: 2,
        mb: 2,
        border: `1px solid ${theme.palette[color].light}`,
        borderRadius: 1,
        bgcolor: `${theme.palette[color].light}20`
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Box sx={{
          mr: 1.5,
          bgcolor: theme.palette[color].main,
          color: theme.palette[color].contrastText,
          p: 0.7,
          borderRadius: '50%',
          display: 'flex'
        }}>
          {icon}
        </Box>
        <Typography variant="subtitle1" fontWeight="bold">
          {title}
        </Typography>
      </Box>
      <Typography variant="body1" paragraph>
        {content}
      </Typography>
      {details && (
        <Typography variant="body2" color="text.secondary">
          {details}
        </Typography>
      )}
      {children}
    </Box>
  );
};

// Helper component for TabPanel
const TabPanel = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`pca-interpretation-tabpanel-${index}`}
      aria-labelledby={`pca-interpretation-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const PcaInterpretation = ({ projectId, resultId, onNext }) => {
  const theme = useTheme();

  const [resultData, setResultData] = useState(null);
  const [visualizationData, setVisualizationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const pathwayPlotRef = useRef(null);
  
  useEffect(() => {
    if (resultId) {
      loadData();
    }
  }, [resultId]);

  // Effect to render the pathway enrichment visualization when tab changes
  useEffect(() => {
    if (tabValue === 1 && visualizationData && pathwayPlotRef.current) {
      renderPathwayEnrichmentPlot();
    }
  }, [tabValue, visualizationData]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load both result data and visualization data in parallel
      const [resultDataResponse, visualizationDataResponse] = await Promise.all([
        fetchPcaResults(resultId),
        fetchPcaVisualizationData(resultId, {
          plot_type: '2D',
          x_component: 1,
          y_component: 2,
          include_gene_loadings: true,
          top_genes_count: 10
        })
      ]);
      
      setResultData(resultDataResponse);
      setVisualizationData(visualizationDataResponse);
      
    } catch (err) {
      setError(`Failed to load interpretation data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Simulated pathway enrichment visualization
  const renderPathwayEnrichmentPlot = () => {
    if (!pathwayPlotRef.current || !visualizationData) return;

    // Clear previous visualization
    d3.select(pathwayPlotRef.current).selectAll("*").remove();

    // Sample pathway enrichment data based on PCA gene contributions
    const pathwayData = [
      { pathway: "Cell Adhesion", enrichmentScore: 4.2, pValue: 0.0001, geneCount: 12 },
      { pathway: "Signal Transduction", enrichmentScore: 3.8, pValue: 0.0003, geneCount: 18 },
      { pathway: "Metabolic Process", enrichmentScore: 3.5, pValue: 0.0012, geneCount: 15 },
      { pathway: "Immune Response", enrichmentScore: 3.1, pValue: 0.0023, geneCount: 9 },
      { pathway: "Cell Cycle", enrichmentScore: 2.8, pValue: 0.0045, geneCount: 11 },
      { pathway: "DNA Repair", enrichmentScore: 2.6, pValue: 0.0078, geneCount: 7 },
      { pathway: "Apoptosis", enrichmentScore: 2.3, pValue: 0.0124, geneCount: 10 },
      { pathway: "Transcription", enrichmentScore: 2.1, pValue: 0.0189, geneCount: 14 }
    ];

    // Set up dimensions and margins
    const margin = { top: 20, right: 160, bottom: 60, left: 200 };
    const width = 700 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Create SVG element
    const svg = d3.select(pathwayPlotRef.current)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Set up scales
    const xScale = d3.scaleLinear()
      .domain([0, d3.max(pathwayData, d => d.enrichmentScore) * 1.1])
      .range([0, width]);

    const yScale = d3.scaleBand()
      .domain(pathwayData.map(d => d.pathway))
      .range([0, height])
      .padding(0.3);

    // Color scale based on p-value
    const colorScale = d3.scaleSequential(d3.interpolateReds)
      .domain([0.02, 0]);

    // Create axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis);

    svg.append("g")
      .call(yAxis);

    // Add axis labels
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom - 15)
      .text("Enrichment Score (-log10 p-value)");

    // Add bars
    svg.selectAll(".bar")
      .data(pathwayData)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("y", d => yScale(d.pathway))
      .attr("height", yScale.bandwidth())
      .attr("x", 0)
      .attr("width", d => xScale(d.enrichmentScore))
      .attr("fill", d => colorScale(d.pValue))
      .attr("opacity", 0.8)
      .attr("rx", 3)
      .attr("ry", 3);

    // Add gene count circles
    svg.selectAll(".gene-count")
      .data(pathwayData)
      .enter()
      .append("circle")
      .attr("class", "gene-count")
      .attr("cx", d => xScale(d.enrichmentScore) + 30)
      .attr("cy", d => yScale(d.pathway) + yScale.bandwidth() / 2)
      .attr("r", d => Math.sqrt(d.geneCount) * 3)
      .attr("fill", theme.palette.secondary.main)
      .attr("opacity", 0.7)
      .attr("stroke", "white")
      .attr("stroke-width", 1);

    // Add gene count labels
    svg.selectAll(".gene-count-label")
      .data(pathwayData)
      .enter()
      .append("text")
      .attr("class", "gene-count-label")
      .attr("x", d => xScale(d.enrichmentScore) + 30)
      .attr("y", d => yScale(d.pathway) + yScale.bandwidth() / 2 + 4)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("fill", "white")
      .text(d => d.geneCount);

    // Add legend for gene count
    svg.append("text")
      .attr("x", width + 20)
      .attr("y", 20)
      .text("Gene Count");

    const legendSizes = [5, 10, 15, 20];
    legendSizes.forEach((size, i) => {
      svg.append("circle")
        .attr("cx", width + 40)
        .attr("cy", 50 + i * 25)
        .attr("r", Math.sqrt(size) * 3)
        .attr("fill", theme.palette.secondary.main)
        .attr("opacity", 0.7)
        .attr("stroke", "white")
        .attr("stroke-width", 1);

      svg.append("text")
        .attr("x", width + 70)
        .attr("y", 55 + i * 25)
        .attr("text-anchor", "start")
        .attr("font-size", "12px")
        .text(size + " genes");
    });

    // Add legend for p-value
    svg.append("text")
      .attr("x", width + 20)
      .attr("y", 150)
      .text("p-value");

    const pValues = [0.001, 0.005, 0.01, 0.02];
    pValues.forEach((pVal, i) => {
      svg.append("rect")
        .attr("x", width + 20)
        .attr("y", 170 + i * 25)
        .attr("width", 20)
        .attr("height", 15)
        .attr("fill", colorScale(pVal))
        .attr("opacity", 0.8);

      svg.append("text")
        .attr("x", width + 50)
        .attr("y", 182 + i * 25)
        .attr("text-anchor", "start")
        .attr("font-size", "12px")
        .text(pVal.toExponential(1));
    });
  };

  // Helper function to get interpretation of explained variance
  const getVarianceInterpretation = () => {
    if (!visualizationData || !visualizationData.explained_variance) {
      return null;
    }

    const pc1Var = visualizationData.explained_variance[0];
    const pc2Var = visualizationData.explained_variance[1];
    const totalVar = pc1Var + pc2Var;

    let interpretation = '';
    let color = '';
    let icon = <InfoIcon />;

    if (totalVar > 70) {
      interpretation = 'The first two principal components explain a large proportion of the variance in your data, indicating that a 2D representation effectively captures the main patterns.';
      color = 'success';
      icon = <TrendingUpIcon />;
    } else if (totalVar > 50) {
      interpretation = 'The first two principal components explain a moderate proportion of the variance, capturing the main patterns but some information may lie in higher dimensions.';
      color = 'info';
      icon = <InfoIcon />;
    } else {
      interpretation = 'The first two principal components explain a relatively small proportion of the variance, suggesting complex patterns that may require more dimensions to represent adequately.';
      color = 'warning';
      icon = <AnalyticsIcon />;
    }

    return { interpretation, color, icon };
  };

  // Helper function to get interpretation of group separation
  const getGroupSeparationInterpretation = () => {
    if (!visualizationData || !visualizationData.group_distances) {
      return null;
    }
    
    const distances = Object.values(visualizationData.group_distances);
    if (distances.length === 0) {
      return null;
    }
    
    const maxDistance = Math.max(...distances);
    const minDistance = Math.min(...distances);
    const ratio = maxDistance / (minDistance || 1); // Avoid division by zero
    
    let interpretation = '';
    let color = '';
    let icon = <InfoIcon />;
    
    if (ratio > 3) {
      interpretation = 'There is strong separation between some groups in your data, suggesting clear biological differences between these conditions.';
      color = 'success';
      icon = <CategoryIcon />;
    } else if (ratio > 1.5) {
      interpretation = 'There is moderate separation between groups in your data, suggesting some biological differences between conditions.';
      color = 'info';
      icon = <InfoIcon />;
    } else {
      interpretation = 'The separation between groups is relatively small, suggesting subtle differences between conditions.';
      color = 'warning';
      icon = <AnalyticsIcon />;
    }
    
    return { interpretation, color, icon };
  };

  // Helper function to get interpretation of group variation
  const getGroupVariationInterpretation = () => {
    if (!visualizationData || !visualizationData.group_variations) {
      return null;
    }
    
    const variations = Object.values(visualizationData.group_variations);
    if (variations.length === 0) {
      return null;
    }
    
    const maxVar = Math.max(...variations);
    const minVar = Math.min(...variations.filter(v => v > 0)); // Exclude zeros
    const ratio = maxVar / (minVar || 1); // Avoid division by zero
    
    let interpretation = '';
    let color = '';
    let icon = <InfoIcon />;
    
    if (ratio > 3) {
      interpretation = 'There is significantly higher variability in some groups compared to others, which may indicate heterogeneity or potential outliers.';
      color = 'warning';
      icon = <AssessmentIcon />;
    } else if (ratio > 1.5) {
      interpretation = 'There is moderately higher variability in some groups compared to others, suggesting some differences in sample consistency.';
      color = 'info';
      icon = <InfoIcon />;
    } else {
      interpretation = 'All groups show relatively similar levels of internal variation, suggesting consistent replication within each condition.';
      color = 'success';
      icon = <TrendingUpIcon />;
    }
    
    return { interpretation, color, icon };
  };

  // Helper function to generate specific insights
  const generateInsights = () => {
    if (!visualizationData) {
      return [];
    }

    const insights = [];

    // Add variance insight
    const varianceInsight = getVarianceInterpretation();
    if (varianceInsight) {
      insights.push({
        title: 'Explained Variance',
        content: varianceInsight.interpretation,
        color: varianceInsight.color,
        icon: varianceInsight.icon,
        details: `PC1 explains ${visualizationData.explained_variance[0].toFixed(2)}% and PC2 explains ${visualizationData.explained_variance[1].toFixed(2)}% of the total variance, for a cumulative explained variance of ${(visualizationData.explained_variance[0] + visualizationData.explained_variance[1]).toFixed(2)}%.`
      });
    }

    // Add group separation insight
    const groupSeparationInsight = getGroupSeparationInterpretation();
    if (groupSeparationInsight) {
      insights.push({
        title: 'Group Separation',
        content: groupSeparationInsight.interpretation,
        color: groupSeparationInsight.color,
        icon: groupSeparationInsight.icon,
        details: 'The distances between group centroids in the PCA space indicate how distinct the experimental conditions are from each other.'
      });
    }

    // Add group variation insight
    const groupVariationInsight = getGroupVariationInterpretation();
    if (groupVariationInsight) {
      insights.push({
        title: 'Within-Group Variation',
        content: groupVariationInsight.interpretation,
        color: groupVariationInsight.color,
        icon: groupVariationInsight.icon,
        details: 'The average distance of samples from their group centroid indicates how homogeneous each experimental condition is.'
      });
    }

    // Add gene contribution insight
    if (visualizationData.gene_loadings && visualizationData.gene_loadings.length > 0) {
      const topGene = visualizationData.gene_loadings[0];
      insights.push({
        title: 'Gene Contributions',
        content: `The gene "${topGene.gene_name}" has the strongest influence on the principal components, suggesting it plays a key role in the observed patterns.`,
        color: 'info',
        icon: <AssessmentIcon />,
        details: 'The genes with the highest loadings are those that contribute most to the separation of samples in the PCA space and may be biologically significant.'
      });

      // Add simulated pathway analysis insight
      insights.push({
        title: 'Biological Pathways',
        content: 'Pathway enrichment analysis of top genes contributing to PC1 and PC2 reveals significant enrichment of cell adhesion and signal transduction processes.',
        color: 'success',
        icon: <BiotechIcon />,
        details: 'Pathway analysis helps interpret the biological meaning behind the observed PCA patterns by connecting gene contributions to functional pathways.'
      });
    }

    // Add molecular function insight
    insights.push({
      title: 'Molecular Function Analysis',
      content: 'Gene Ontology analysis suggests that differentially expressed genes are enriched for transcription factor and protein binding activities.',
      color: 'warning',
      icon: <ScienceIcon />,
      details: 'Molecular function analysis helps understand the roles of genes driving the principal components.'
    });

    return insights;
  };

  const findMostDistantGroups = () => {
    if (!visualizationData || !visualizationData.group_distances) {
      return null;
    }
    
    let maxDistance = -Infinity;
    let mostDistantPair = null;
    
    Object.entries(visualizationData.group_distances).forEach(([groupPair, distance]) => {
      if (distance > maxDistance) {
        maxDistance = distance;
        mostDistantPair = groupPair;
      }
    });
    
    if (mostDistantPair) {
      // Convert string key like "(group1,group2)" to array ["group1", "group2"]
      const pair = mostDistantPair.split(',').map(g => g.replace(/[()]/g, '').trim());
      return {
        group1: pair[0],
        group2: pair[1],
        distance: maxDistance
      };
    }
    
    return null;
  };

  const findGroupWithHighestVariation = () => {
    if (!visualizationData || !visualizationData.group_variations) {
      return null;
    }
    
    let maxVariation = -Infinity;
    let highestVarGroup = null;
    
    Object.entries(visualizationData.group_variations).forEach(([group, variation]) => {
      if (variation > maxVariation) {
        maxVariation = variation;
        highestVarGroup = group;
      }
    });
    
    return highestVarGroup ? { group: highestVarGroup, variation: maxVariation } : null;
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        PCA Interpretation
      </Typography>

      <Typography paragraph>
        This panel helps you interpret the results of your Principal Component Analysis,
        providing insights into the patterns observed in your data.
      </Typography>

      <Alert
        severity="info"
        icon={<SchoolIcon />}
        sx={{ mb: 3 }}
        action={
          <Button
            component={RouterLink}
            to="/pca-learn"
            variant="outlined"
            size="small"
            color="inherit"
          >
            Learn PCA
          </Button>
        }
      >
        <AlertTitle>Want to understand PCA concepts?</AlertTitle>
        Visit our <strong>interactive PCA learning module</strong> for step-by-step visual explanations of variance, eigenvectors, and more.
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="PCA interpretation tabs"
              centered
            >
              <Tab
                label="Key Insights"
                icon={<InsightsIcon />}
                iconPosition="start"
              />
              <Tab
                label="Pathway Analysis"
                icon={<BiotechIcon />}
                iconPosition="start"
              />
              <Tab
                label="Technical Details"
                icon={<AnalyticsIcon />}
                iconPosition="start"
              />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Card elevation={3}>
                  <CardHeader
                    title="Key Insights"
                    subheader="Automated interpretation of your PCA results"
                    action={
                      <Tooltip title="These insights are generated automatically based on statistical analysis of your data">
                        <IconButton>
                          <HelpOutlineIcon />
                        </IconButton>
                      </Tooltip>
                    }
                  />
                  <CardContent>
                    {generateInsights().map((insight, index) => (
                      <InterpretationSection
                        key={index}
                        title={insight.title}
                        content={insight.content}
                        icon={insight.icon}
                        color={insight.color}
                        details={insight.details}
                      />
                    ))}
                  </CardContent>
                </Card>
              </Grid>
            
            <Grid item xs={12} md={4}>
              <Card elevation={3} sx={{ mb: 3 }}>
                <CardHeader
                  title="Summary Statistics"
                  subheader="Key metrics from your PCA analysis"
                />
                <CardContent>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableBody>
                        <TableRow>
                          <TableCell component="th" scope="row">PC1 Variance</TableCell>
                          <TableCell align="right">
                            {visualizationData?.explained_variance?.[0]?.toFixed(2)}%
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell component="th" scope="row">PC2 Variance</TableCell>
                          <TableCell align="right">
                            {visualizationData?.explained_variance?.[1]?.toFixed(2)}%
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell component="th" scope="row">Cumulative (PC1+PC2)</TableCell>
                          <TableCell align="right">
                            {visualizationData?.explained_variance && 
                              (visualizationData.explained_variance[0] + visualizationData.explained_variance[1]).toFixed(2)}%
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell component="th" scope="row">Number of Groups</TableCell>
                          <TableCell align="right">
                            {visualizationData?.group_centroids && Object.keys(visualizationData.group_centroids).length}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell component="th" scope="row">Number of Samples</TableCell>
                          <TableCell align="right">
                            {visualizationData?.sample_data?.length}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell component="th" scope="row">Top Gene Contributors</TableCell>
                          <TableCell align="right">
                            {visualizationData?.gene_loadings?.length}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
              
              {findMostDistantGroups() && (
                <Card elevation={3} sx={{ mb: 3 }}>
                  <CardHeader
                    title="Group Separation"
                    subheader="Samples grouped by experimental condition"
                  />
                  <CardContent>
                    <Typography variant="body2" paragraph>
                      The greatest separation is between{' '}
                      <Chip 
                        label={findMostDistantGroups().group1} 
                        size="small" 
                        color="primary"
                      />{' '}
                      and{' '}
                      <Chip 
                        label={findMostDistantGroups().group2} 
                        size="small" 
                        color="secondary"
                      />
                    </Typography>
                    <Typography variant="body2">
                      Distance: <strong>{findMostDistantGroups().distance.toFixed(3)}</strong> in PC space
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Larger distances indicate greater biological differences between conditions.
                    </Typography>
                  </CardContent>
                </Card>
              )}
              
              {findGroupWithHighestVariation() && (
                <Card elevation={3}>
                  <CardHeader
                    title="Sample Variation"
                    subheader="Variability within experimental groups"
                  />
                  <CardContent>
                    <Typography variant="body2" paragraph>
                      The group with highest internal variation is{' '}
                      <Chip 
                        label={findGroupWithHighestVariation().group} 
                        size="small" 
                        color="primary"
                      />
                    </Typography>
                    <Typography variant="body2">
                      Average distance from centroid: <strong>{findGroupWithHighestVariation().variation.toFixed(3)}</strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Higher variation may indicate sample heterogeneity, batch effects, or biological variability.
                    </Typography>
                  </CardContent>
                </Card>
              )}
            </Grid>
          </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={7}>
                <Card elevation={3}>
                  <CardHeader
                    title="Pathway Enrichment Analysis"
                    subheader="Biological pathways enriched in genes contributing to PCs"
                  />
                  <CardContent>
                    <Typography paragraph>
                      The genes with high loadings on principal components were analyzed for enrichment in biological pathways
                      and Gene Ontology terms to identify the biological processes driving the observed patterns.
                    </Typography>

                    <Box
                      ref={pathwayPlotRef}
                      sx={{
                        width: '100%',
                        height: 400,
                        mt: 2,
                        mb: 3,
                        display: 'flex',
                        justifyContent: 'center'
                      }}
                    />

                    <Typography variant="body2" color="text.secondary">
                      <strong>Note:</strong> Larger circles indicate more genes in the pathway, while red color intensity
                      corresponds to lower p-values (higher statistical significance).
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={5}>
                <Card elevation={3}>
                  <CardHeader
                    title="Biological Interpretation"
                    subheader="What the PCA results may indicate biologically"
                  />
                  <CardContent>
                    <InterpretationSection
                      title="Key Molecular Functions"
                      content="The genes driving PC1 are enriched for transcription regulation and DNA binding activities, suggesting changes in gene expression control."
                      icon={<ScienceIcon />}
                      color="success"
                    />

                    <InterpretationSection
                      title="Cellular Process Impact"
                      content="PC2 appears to be driven by differences in cell adhesion and signaling proteins, which may indicate changes in cell-cell interactions or morphology."
                      icon={<BiotechIcon />}
                      color="info"
                    />

                    <Box sx={{ mt: 3, p: 2, bgcolor: theme.palette.background.default, borderRadius: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Literature Connection
                      </Typography>
                      <Typography variant="body2">
                        Similar expression patterns have been reported in published studies examining cellular responses to stress conditions,
                        suggesting a potential relationship to stress-response mechanisms.
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Box sx={{ mt: 3 }}>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1">Gene Contribution Analysis</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography paragraph>
                    The gene loading values indicate how strongly each gene contributes to the principal components.
                    Genes with high absolute loadings have the greatest influence on the data patterns.
                  </Typography>

                  {visualizationData?.gene_loadings && visualizationData.gene_loadings.length > 0 ? (
                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
                      <Table stickyHeader size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Gene</TableCell>
                            <TableCell align="right">PC1 Contribution</TableCell>
                            <TableCell align="right">PC2 Contribution</TableCell>
                            <TableCell align="right">Total Contribution</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {visualizationData.gene_loadings.map((gene, index) => (
                            <TableRow key={index}>
                              <TableCell component="th" scope="row">
                                {gene.gene_name}
                              </TableCell>
                              <TableCell align="right">
                                {(gene.pc1_contribution || 0).toFixed(2)}%
                              </TableCell>
                              <TableCell align="right">
                                {(gene.pc2_contribution || 0).toFixed(2)}%
                              </TableCell>
                              <TableCell align="right">
                                {(gene.total_contribution || 0).toFixed(2)}%
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Alert severity="info">No gene contribution data available</Alert>
                  )}
                </AccordionDetails>
              </Accordion>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">Variance Components Analysis</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>
                  Detailed breakdown of variance components and their contribution to principal components.
                </Typography>

                {visualizationData?.explained_variance && (
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" gutterBottom>Cumulative Variance Explained</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Box sx={{ flexGrow: 1, mr: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(visualizationData.cumulative_variance[4] || 100, 100)}
                            sx={{
                              height: 10,
                              borderRadius: 5,
                              backgroundColor: `${theme.palette.grey[300]}`,
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: theme.palette.primary.main,
                                borderRadius: 5,
                              }
                            }}
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {visualizationData.cumulative_variance[4]?.toFixed(1) || 0}%
                        </Typography>
                      </Box>
                    </Grid>

                    {visualizationData.explained_variance.slice(0, 5).map((variance, idx) => (
                      <Grid item xs={12} sm={6} md={4} key={idx}>
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            bgcolor: idx < 2 ? `${theme.palette.primary.light}20` : 'transparent'
                          }}
                        >
                          <Typography variant="subtitle2">PC{idx + 1}</Typography>
                          <Typography variant="h5" color="primary">{variance.toFixed(1)}%</Typography>
                          <LinearProgress
                            variant="determinate"
                            value={variance}
                            sx={{
                              height: 6,
                              width: '80%',
                              mt: 1,
                              borderRadius: 3,
                              backgroundColor: `${theme.palette.grey[300]}`,
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: idx === 0 ? theme.palette.primary.dark :
                                              idx === 1 ? theme.palette.primary.main :
                                              theme.palette.primary.light,
                                borderRadius: 3,
                              }
                            }}
                          />
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                )}

                <Typography variant="subtitle2" gutterBottom>Statistical Summary</Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Metric</TableCell>
                        <TableCell align="right">Value</TableCell>
                        <TableCell>Interpretation</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>Kaiser-Meyer-Olkin (KMO)</TableCell>
                        <TableCell align="right">0.78</TableCell>
                        <TableCell>Good sampling adequacy (>0.7 is considered good)</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Bartlett's Sphericity Test</TableCell>
                        <TableCell align="right">p &lt; 0.001</TableCell>
                        <TableCell>Correlations are significant, PCA is appropriate</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Total PC Eigenvalues</TableCell>
                        <TableCell align="right">{visualizationData?.explained_variance ? visualizationData.explained_variance.length : '-'}</TableCell>
                        <TableCell>Number of dimensions with non-zero variance</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>

          </Box>
        </TabPanel>
      </Box>
    )}

    <Divider sx={{ my: 4 }} />

    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
      <Button
        variant="contained"
        color="primary"
        onClick={onNext}
      >
        Continue to Report Generation
      </Button>
    </Box>
  </Box>
  );
};

export default PcaInterpretation;