import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  Divider,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  Grid,
  TextField,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Avatar,
  Chip,
  Stack,
  Tab,
  Tabs,
  FormHelperText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import TableChartIcon from '@mui/icons-material/TableChart';
import InfoIcon from '@mui/icons-material/Info';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DownloadIcon from '@mui/icons-material/Download';
import PreviewIcon from '@mui/icons-material/Preview';
import InsightsIcon from '@mui/icons-material/Insights';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import EditNoteIcon from '@mui/icons-material/EditNote';
import BiotechIcon from '@mui/icons-material/Biotech';
import FileOpenIcon from '@mui/icons-material/FileOpen';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';
import PhotoIcon from '@mui/icons-material/Photo';
import ArticleIcon from '@mui/icons-material/Article';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
import * as d3 from 'd3';

import { fetchPcaVisualizationData, fetchPcaResults, fetchPcaProject } from '../../api/pcaApi';

const PcaReportGenerator = ({ projectId, resultId }) => {
  const theme = useTheme();
  const previewRef = useRef(null);
  
  // State for report data
  const [project, setProject] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [visualizationData, setVisualizationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // State for report options
  const [reportTitle, setReportTitle] = useState('PCA Analysis Report');
  const [includeProjectInfo, setIncludeProjectInfo] = useState(true);
  const [includePcaPlot, setIncludePcaPlot] = useState(true);
  const [includeLoadingPlot, setIncludeLoadingPlot] = useState(true);
  const [includeScreePlot, setIncludeScreePlot] = useState(true);
  const [includeVarianceTable, setIncludeVarianceTable] = useState(true);
  const [includeGeneContributions, setIncludeGeneContributions] = useState(true);
  const [includeGroupStats, setIncludeGroupStats] = useState(true);
  const [includeInterpretation, setIncludeInterpretation] = useState(true);
  const [reportAuthor, setReportAuthor] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  
  // State for preview dialog
  const [previewOpen, setPreviewOpen] = useState(false);
  const [generatingPreview, setGeneratingPreview] = useState(false);

  useEffect(() => {
    if (projectId && resultId) {
      loadData();
    }
  }, [projectId, resultId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load project, result data, and visualization data in parallel
      const [projectData, resultDataResponse, visualizationDataResponse] = await Promise.all([
        fetchPcaProject(projectId),
        fetchPcaResults(resultId),
        fetchPcaVisualizationData(resultId, {
          plot_type: '2D',
          x_component: 1,
          y_component: 2,
          include_gene_loadings: true,
          top_genes_count: 10
        })
      ]);
      
      setProject(projectData);
      setResultData(resultDataResponse);
      setVisualizationData(visualizationDataResponse);
      
      // Set default report title and description
      setReportTitle(`PCA Analysis Report: ${projectData.name}`);
      setReportDescription(`PCA analysis of gene expression data for project ${projectData.name}`);
      
    } catch (err) {
      setError(`Failed to load report data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    try {
      setLoading(true);
      
      // Create a new PDF document
      const doc = new jsPDF();
      
      // Set font
      doc.setFont('helvetica');
      
      // Add title
      doc.setFontSize(20);
      doc.text(reportTitle, 105, 20, { align: 'center' });
      
      // Add date
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 30, { align: 'center' });
      
      if (reportAuthor) {
        doc.text(`Author: ${reportAuthor}`, 105, 35, { align: 'center' });
      }
      
      // Add project info if selected
      let yPos = 45;
      
      if (includeProjectInfo && project) {
        doc.setFontSize(14);
        doc.text('Project Information', 14, yPos);
        yPos += 10;
        
        doc.setFontSize(10);
        doc.text(`Project Name: ${project.name}`, 14, yPos);
        yPos += 5;
        
        if (project.description) {
          const splitDescription = doc.splitTextToSize(`Description: ${project.description}`, 180);
          doc.text(splitDescription, 14, yPos);
          yPos += splitDescription.length * 5;
        }
        
        doc.text(`Samples: ${project.sample_count || 0}`, 14, yPos);
        yPos += 5;
        doc.text(`Groups: ${project.group_count || 0}`, 14, yPos);
        yPos += 5;
        doc.text(`Genes: ${project.gene_count || 0}`, 14, yPos);
        yPos += 5;
        doc.text(`Scaling Method: ${
          project.scaling_method === 'STANDARD' 
            ? 'Standard (Z-score)' 
            : project.scaling_method === 'MINMAX' 
              ? 'Min-Max (0-1)' 
              : 'None'
        }`, 14, yPos);
        yPos += 10;
      }
      
      // Add report description if provided
      if (reportDescription) {
        doc.setFontSize(12);
        const splitDescription = doc.splitTextToSize(reportDescription, 180);
        doc.text(splitDescription, 14, yPos);
        yPos += splitDescription.length * 5 + 5;
      }
      
      // Add PCA plot if selected
      if (includePcaPlot && document.getElementById('pca-plot-canvas')) {
        yPos = addPlotToPdf(doc, 'pca-plot-canvas', 'PCA Plot', yPos);
      }
      
      // Add loading plot if selected
      if (includeLoadingPlot && document.getElementById('loading-plot-canvas')) {
        yPos = addPlotToPdf(doc, 'loading-plot-canvas', 'Gene Loading Plot', yPos);
      }
      
      // Add scree plot if selected
      if (includeScreePlot && document.getElementById('scree-plot-canvas')) {
        yPos = addPlotToPdf(doc, 'scree-plot-canvas', 'Scree Plot', yPos);
      }
      
      // Add variance table if selected
      if (includeVarianceTable && visualizationData?.explained_variance) {
        // Check if we need a new page
        if (yPos > 240) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.text('Explained Variance', 14, yPos);
        yPos += 10;
        
        const tableData = [];
        const cumulative = visualizationData.cumulative_variance || [];
        
        visualizationData.explained_variance.forEach((variance, index) => {
          tableData.push([
            `PC${index + 1}`, 
            `${variance.toFixed(2)}%`, 
            `${(cumulative[index] || 0).toFixed(2)}%`
          ]);
        });
        
        doc.autoTable({
          head: [['Component', 'Explained Variance', 'Cumulative Variance']],
          body: tableData,
          startY: yPos,
          margin: { top: 10 },
          styles: { fontSize: 10 },
          headStyles: { fillColor: [66, 135, 245] }
        });
        
        yPos = doc.lastAutoTable.finalY + 10;
      }
      
      // Add gene contributions if selected
      if (includeGeneContributions && visualizationData?.gene_loadings) {
        // Check if we need a new page
        if (yPos > 240) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.text('Top Gene Contributions', 14, yPos);
        yPos += 10;
        
        const tableData = visualizationData.gene_loadings.map(gene => [
          gene.gene_name,
          (gene.pc1_contribution || 0).toFixed(2) + '%',
          (gene.pc2_contribution || 0).toFixed(2) + '%',
          (gene.total_contribution || 0).toFixed(2) + '%'
        ]);
        
        doc.autoTable({
          head: [['Gene', 'PC1 Contribution', 'PC2 Contribution', 'Total Contribution']],
          body: tableData,
          startY: yPos,
          margin: { top: 10 },
          styles: { fontSize: 10 },
          headStyles: { fillColor: [66, 135, 245] }
        });
        
        yPos = doc.lastAutoTable.finalY + 10;
      }
      
      // Add group statistics if selected
      if (includeGroupStats && visualizationData?.group_centroids) {
        // Check if we need a new page
        if (yPos > 200) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.text('Group Statistics', 14, yPos);
        yPos += 10;
        
        // Group centroids
        doc.setFontSize(12);
        doc.text('Group Centroids', 14, yPos);
        yPos += 8;
        
        const centroidData = Object.entries(visualizationData.group_centroids).map(([group, centroid]) => [
          group,
          centroid.PC1.toFixed(3),
          centroid.PC2.toFixed(3)
        ]);
        
        doc.autoTable({
          head: [['Group', 'PC1', 'PC2']],
          body: centroidData,
          startY: yPos,
          margin: { top: 10 },
          styles: { fontSize: 10 },
          headStyles: { fillColor: [66, 135, 245] }
        });
        
        yPos = doc.lastAutoTable.finalY + 10;
        
        // Group distances
        if (visualizationData.group_distances && Object.keys(visualizationData.group_distances).length > 0) {
          doc.setFontSize(12);
          doc.text('Group Distances', 14, yPos);
          yPos += 8;
          
          const distanceData = Object.entries(visualizationData.group_distances).map(([groupPair, distance]) => {
            const groups = groupPair.split(',').map(g => g.replace(/[()]/g, '').trim());
            return [groups[0], groups[1], distance.toFixed(3)];
          });
          
          doc.autoTable({
            head: [['Group 1', 'Group 2', 'Distance']],
            body: distanceData,
            startY: yPos,
            margin: { top: 10 },
            styles: { fontSize: 10 },
            headStyles: { fillColor: [66, 135, 245] }
          });
          
          yPos = doc.lastAutoTable.finalY + 10;
        }
      }
      
      // Add interpretation if selected
      if (includeInterpretation && visualizationData) {
        // Check if we need a new page
        if (yPos > 220) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.text('Interpretation', 14, yPos);
        yPos += 10;
        
        doc.setFontSize(12);
        doc.text('Explained Variance', 14, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        const pc1Var = visualizationData.explained_variance[0];
        const pc2Var = visualizationData.explained_variance[1];
        const totalVar = pc1Var + pc2Var;
        
        let varianceText = '';
        if (totalVar > 70) {
          varianceText = `PC1 and PC2 explain ${totalVar.toFixed(2)}% of the total variance, which is excellent. This indicates that the 2D representation captures most of the important patterns in your data.`;
        } else if (totalVar > 50) {
          varianceText = `PC1 and PC2 explain ${totalVar.toFixed(2)}% of the total variance, which is good. This 2D representation captures a substantial portion of the important patterns.`;
        } else {
          varianceText = `PC1 and PC2 explain only ${totalVar.toFixed(2)}% of the total variance. This suggests that higher dimensions might be important for your data, and you may want to consider examining PC3 and beyond.`;
        }
        
        const varianceLines = doc.splitTextToSize(varianceText, 180);
        doc.text(varianceLines, 14, yPos);
        yPos += varianceLines.length * 5 + 5;
        
        // Group separation interpretation if available
        if (visualizationData.group_distances && Object.keys(visualizationData.group_distances).length > 0) {
          doc.setFontSize(12);
          doc.text('Group Separation', 14, yPos);
          yPos += 8;
          
          doc.setFontSize(10);
          
          const distances = Object.values(visualizationData.group_distances);
          const maxDistance = Math.max(...distances);
          const minDistance = Math.min(...distances);
          const ratio = maxDistance / (minDistance || 1);
          
          let separationText = '';
          if (ratio > 3) {
            separationText = 'There is a strong separation between some groups in your data, suggesting clear biological differences between these conditions.';
          } else if (ratio > 1.5) {
            separationText = 'There is a moderate separation between groups in your data, suggesting some biological differences between conditions.';
          } else {
            separationText = 'The separation between groups is relatively small, suggesting subtle differences between conditions.';
          }
          
          const separationLines = doc.splitTextToSize(separationText, 180);
          doc.text(separationLines, 14, yPos);
          yPos += separationLines.length * 5 + 5;
        }
        
        // Gene contribution interpretation if available
        if (visualizationData.gene_loadings && visualizationData.gene_loadings.length > 0) {
          doc.setFontSize(12);
          doc.text('Gene Contributions', 14, yPos);
          yPos += 8;
          
          doc.setFontSize(10);
          
          const topGene = visualizationData.gene_loadings[0];
          const geneText = `The gene "${topGene.gene_name}" has the strongest influence on the principal components, suggesting it plays a key role in the observed patterns.`;
          
          const geneLines = doc.splitTextToSize(geneText, 180);
          doc.text(geneLines, 14, yPos);
          yPos += geneLines.length * 5 + 5;
        }
      }
      
      // Save the PDF
      doc.save(`${reportTitle.replace(/\s+/g, '_')}.pdf`);
      
    } catch (err) {
      setError(`Failed to generate PDF: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const addPlotToPdf = async (doc, elementId, title, yPos) => {
    // Check if we need a new page
    if (yPos > 140) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.text(title, 14, yPos);
    yPos += 10;
    
    const canvas = document.getElementById(elementId);
    if (canvas) {
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 180;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      doc.addImage(imgData, 'PNG', 15, yPos, imgWidth, imgHeight);
      yPos += imgHeight + 10;
    }
    
    return yPos;
  };

  const handleOpenPreview = async () => {
    setPreviewOpen(true);
    setGeneratingPreview(true);

    try {
      // Render the plots for preview
      setTimeout(() => {
        if (document.getElementById('pca-plot-preview')) {
          renderPreviewScatterplot(document.getElementById('pca-plot-preview'));
        }
        setGeneratingPreview(false);
      }, 500);
    } catch (err) {
      setError(`Failed to generate preview: ${err.message}`);
      setGeneratingPreview(false);
    }
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
  };

  const renderPlotsForPreview = () => {
    // This function would render the plots in the preview dialog
    // In a real implementation, this would use d3.js, Chart.js, or another library
    // to render the plots based on the visualizationData
    // For this example, we'll just add placeholders
  };

  // PreviewDialog Component with tabs
  const PreviewDialog = () => {
    const [tabValue, setTabValue] = useState(0);
    const scatterplotRef = useRef(null);
    const loadingPlotRef = useRef(null);
    const screePlotRef = useRef(null);

    useEffect(() => {
      if (tabValue === 0 && scatterplotRef.current) {
        renderPreviewScatterplot(scatterplotRef.current);
      }
    }, [tabValue]);

    const handleTabChange = (event, newValue) => {
      setTabValue(newValue);
    };

    if (generatingPreview) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    return (
      <Box>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab icon={<AnalyticsIcon />} label="PCA Plot" />
            <Tab icon={<AssessmentIcon />} label="Loading Plot" />
            <Tab icon={<InsightsIcon />} label="Scree Plot" />
            <Tab icon={<FormatListBulletedIcon />} label="Data Tables" />
            <Tab icon={<ArticleIcon />} label="Full Report" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ height: 400, border: '1px solid #ddd', borderRadius: 1, mb: 2 }} ref={scatterplotRef} />
          <Typography variant="caption" color="text.secondary">
            PCA scatter plot showing the first two principal components. Points are colored by sample group.
          </Typography>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ height: 400, border: '1px solid #ddd', borderRadius: 1, bgcolor: '#f5f5f5', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Typography color="text.secondary">Loading Plot Preview</Typography>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box sx={{ height: 400, border: '1px solid #ddd', borderRadius: 1, bgcolor: '#f5f5f5', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Typography color="text.secondary">Scree Plot Preview</Typography>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>Sample Information</Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Sample ID</TableCell>
                  <TableCell>Group</TableCell>
                  <TableCell>PC1</TableCell>
                  <TableCell>PC2</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell>Sample_{idx+1}</TableCell>
                    <TableCell>{idx < 3 ? 'Control' : 'Treatment'}</TableCell>
                    <TableCell>{(Math.random() * 2 - 1).toFixed(3)}</TableCell>
                    <TableCell>{(Math.random() * 2 - 1).toFixed(3)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="h6" gutterBottom>Gene Contributions</Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Gene</TableCell>
                  <TableCell>PC1 Contribution</TableCell>
                  <TableCell>PC2 Contribution</TableCell>
                  <TableCell>Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell>Gene_{idx+1}</TableCell>
                    <TableCell>{(Math.random() * 5 + 1).toFixed(2)}%</TableCell>
                    <TableCell>{(Math.random() * 3 + 1).toFixed(2)}%</TableCell>
                    <TableCell>{(Math.random() * 8 + 2).toFixed(2)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          <Box ref={previewRef} sx={{ p: 3, bgcolor: 'white' }}>
            <Typography variant="h4" align="center" gutterBottom>
              {reportTitle}
            </Typography>

            <Typography variant="body2" align="center" color="text.secondary" gutterBottom>
              Generated on: {new Date().toLocaleDateString()}
              {reportAuthor && ` • Author: ${reportAuthor}`}
            </Typography>

            <Divider sx={{ my: 2 }} />

            {includeProjectInfo && project && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h5" gutterBottom>
                  Project Information
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Project Name:</strong> {project.name}
                </Typography>
                {project.description && (
                  <Typography variant="body1" gutterBottom>
                    <strong>Description:</strong> {project.description}
                  </Typography>
                )}
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography variant="body1">
                      <strong>Samples:</strong> {project.sample_count || 0}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body1">
                      <strong>Groups:</strong> {project.group_count || 0}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body1">
                      <strong>Genes:</strong> {project.gene_count || 0}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}

            {reportDescription && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="body1">
                  {reportDescription}
                </Typography>
              </Box>
            )}

            {includePcaPlot && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h5" gutterBottom>
                  PCA Plot
                </Typography>
                <Box
                  id="pca-plot-canvas"
                  sx={{
                    width: '100%',
                    height: 400,
                    bgcolor: '#f5f5f5',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    border: '1px solid #ddd'
                  }}
                >
                  <div id="pca-plot-preview" style={{ width: '100%', height: '100%' }}></div>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Figure 1: PCA scatter plot showing the first two principal components. Points are colored by sample group.
                </Typography>
              </Box>
            )}

            {/* Additional report sections would appear here */}
          </Box>
        </TabPanel>
      </Box>
    );
  };

  // Custom Tab Panel component for Preview dialog
  const TabPanel = (props) => {
    const { children, value, index, ...other } = props;

    return (
      <div
        role="tabpanel"
        hidden={value !== index}
        id={`report-tabpanel-${index}`}
        aria-labelledby={`report-tab-${index}`}
        {...other}
      >
        {value === index && (
          <Box sx={{ pt: 2 }}>
            {children}
          </Box>
        )}
      </div>
    );
  };

  // Sample Scatterplot for preview
  const renderPreviewScatterplot = (container) => {
    if (!container) return;

    // Clear container
    d3.select(container).selectAll("*").remove();

    // Set up dimensions
    const width = 600;
    const height = 400;
    const margin = { top: 40, right: 120, bottom: 60, left: 80 };

    // Create SVG
    const svg = d3.select(container)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Set up scales
    const xScale = d3.scaleLinear()
      .domain([-3, 3])
      .range([0, width - margin.left - margin.right]);

    const yScale = d3.scaleLinear()
      .domain([-2, 2])
      .range([height - margin.top - margin.bottom, 0]);

    // Add axes
    svg.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
      .call(d3.axisBottom(xScale));

    svg.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(yScale));

    // Add axis labels
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("x", (width - margin.left - margin.right) / 2)
      .attr("y", height - margin.top - margin.bottom + 40)
      .text("PC1 (35.2%)");

    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("x", -(height - margin.top - margin.bottom) / 2)
      .attr("y", -60)
      .text("PC2 (22.7%)");

    // Add title
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("x", (width - margin.left - margin.right) / 2)
      .attr("y", -20)
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .text("PCA Scatter Plot");

    // Create sample data
    const groupData = [
      { name: "Control", color: "#1f77b4", points: [] },
      { name: "Treatment", color: "#ff7f0e", points: [] }
    ];

    // Generate random points for each group
    groupData[0].points = Array.from({ length: 10 }, () => ({
      x: -2 + Math.random(),
      y: -1 + Math.random() * 2
    }));

    groupData[1].points = Array.from({ length: 10 }, () => ({
      x: 1 + Math.random(),
      y: -0.5 + Math.random() * 2
    }));

    // Plot points for each group
    groupData.forEach(group => {
      // Plot points
      svg.selectAll(`.point-${group.name}`)
        .data(group.points)
        .enter()
        .append("circle")
        .attr("class", `point-${group.name}`)
        .attr("cx", d => xScale(d.x))
        .attr("cy", d => yScale(d.y))
        .attr("r", 5)
        .attr("fill", group.color)
        .attr("stroke", "white")
        .attr("stroke-width", 1)
        .attr("opacity", 0.8);
    });

    // Add legend
    const legend = svg.append("g")
      .attr("transform", `translate(${width - margin.left - margin.right + 20}, 0)`);

    groupData.forEach((group, i) => {
      const lg = legend.append("g")
        .attr("transform", `translate(0, ${i * 25})`);

      lg.append("circle")
        .attr("r", 5)
        .attr("fill", group.color);

      lg.append("text")
        .attr("x", 15)
        .attr("y", 5)
        .style("font-size", "12px")
        .text(group.name);
    });
  };

  const exportCSV = (dataType = 'variance') => {
    try {
      if (!visualizationData) return;

      let csvContent = "data:text/csv;charset=utf-8,";
      let filename = "";

      if (dataType === 'variance') {
        // Export variance data
        csvContent += "Component,Explained Variance (%),Cumulative Variance (%)\n";

        visualizationData.explained_variance.forEach((variance, index) => {
          csvContent += `PC${index + 1},${variance.toFixed(2)},${visualizationData.cumulative_variance[index].toFixed(2)}\n`;
        });

        filename = "pca_variance.csv";
      }
      else if (dataType === 'loadings') {
        // Export gene loadings
        csvContent += "Gene,PC1 Loading,PC2 Loading,PC1 Contribution (%),PC2 Contribution (%),Total Contribution (%)\n";

        visualizationData.gene_loadings.forEach(gene => {
          csvContent += `${gene.gene_name},${gene.pc1_loading.toFixed(4)},${gene.pc2_loading.toFixed(4)},`;
          csvContent += `${gene.pc1_contribution.toFixed(2)},${gene.pc2_contribution.toFixed(2)},${gene.total_contribution.toFixed(2)}\n`;
        });

        filename = "pca_gene_loadings.csv";
      }
      else if (dataType === 'scores') {
        // Export sample scores
        csvContent += "Sample ID,Group,PC1,PC2";
        if (visualizationData.sample_data[0].pc3 !== undefined) {
          csvContent += ",PC3";
        }
        csvContent += "\n";

        visualizationData.sample_data.forEach(sample => {
          csvContent += `${sample.sample_id},${sample.group},${sample.pc1.toFixed(4)},${sample.pc2.toFixed(4)}`;
          if (sample.pc3 !== undefined) {
            csvContent += `,${sample.pc3.toFixed(4)}`;
          }
          csvContent += "\n";
        });

        filename = "pca_sample_scores.csv";
      }

      // Create download link
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", filename);
      document.body.appendChild(link);

      // Trigger download
      link.click();

      // Clean up
      document.body.removeChild(link);

      setSuccess(`Exported ${filename} successfully`);

    } catch (err) {
      setError(`Failed to export CSV: ${err.message}`);
    }
  };

  // Function to export all data as a zip file
  const exportAllData = () => {
    try {
      // In a full implementation, this would use JSZip to create a zip file
      // containing all CSV files and images
      alert('This would export all data as a zip file containing CSVs and images.');
    } catch (err) {
      setError(`Failed to export all data: ${err.message}`);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Generate PCA Report
      </Typography>
      
      <Typography paragraph>
        Generate a comprehensive report of your PCA analysis results. 
        Customize the content and export in various formats.
      </Typography>
      
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
        <Grid container spacing={3}>
          <Grid item xs={12} md={5}>
            <Card elevation={3}>
              <CardHeader
                title="Report Options"
                subheader="Customize the content of your report"
              />
              <CardContent>
                <TextField
                  label="Report Title"
                  fullWidth
                  margin="normal"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                />
                
                <TextField
                  label="Author (optional)"
                  fullWidth
                  margin="normal"
                  value={reportAuthor}
                  onChange={(e) => setReportAuthor(e.target.value)}
                />
                
                <TextField
                  label="Description (optional)"
                  fullWidth
                  margin="normal"
                  multiline
                  rows={3}
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                />
                
                <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
                  Include in Report:
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', ml: 1 }}>
                  <FormControlLabel
                    control={
                      <Checkbox 
                        checked={includeProjectInfo} 
                        onChange={(e) => setIncludeProjectInfo(e.target.checked)}
                      />
                    }
                    label="Project Information"
                  />
                  
                  <FormControlLabel
                    control={
                      <Checkbox 
                        checked={includePcaPlot} 
                        onChange={(e) => setIncludePcaPlot(e.target.checked)}
                      />
                    }
                    label="PCA Plot"
                  />
                  
                  <FormControlLabel
                    control={
                      <Checkbox 
                        checked={includeLoadingPlot} 
                        onChange={(e) => setIncludeLoadingPlot(e.target.checked)}
                      />
                    }
                    label="Gene Loading Plot"
                  />
                  
                  <FormControlLabel
                    control={
                      <Checkbox 
                        checked={includeScreePlot} 
                        onChange={(e) => setIncludeScreePlot(e.target.checked)}
                      />
                    }
                    label="Scree Plot"
                  />
                  
                  <FormControlLabel
                    control={
                      <Checkbox 
                        checked={includeVarianceTable} 
                        onChange={(e) => setIncludeVarianceTable(e.target.checked)}
                      />
                    }
                    label="Variance Table"
                  />
                  
                  <FormControlLabel
                    control={
                      <Checkbox 
                        checked={includeGeneContributions} 
                        onChange={(e) => setIncludeGeneContributions(e.target.checked)}
                      />
                    }
                    label="Gene Contributions"
                  />
                  
                  <FormControlLabel
                    control={
                      <Checkbox 
                        checked={includeGroupStats} 
                        onChange={(e) => setIncludeGroupStats(e.target.checked)}
                      />
                    }
                    label="Group Statistics"
                  />
                  
                  <FormControlLabel
                    control={
                      <Checkbox 
                        checked={includeInterpretation} 
                        onChange={(e) => setIncludeInterpretation(e.target.checked)}
                      />
                    }
                    label="Interpretation"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={7}>
            <Card elevation={3}>
              <CardHeader
                title="Export Options"
                subheader="Generate reports in different formats"
              />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Paper 
                      elevation={0} 
                      variant="outlined" 
                      sx={{ 
                        p: 2, 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center',
                        height: '100%'
                      }}
                    >
                      <PictureAsPdfIcon 
                        sx={{ 
                          fontSize: 60, 
                          color: theme.palette.primary.main,
                          mb: 2
                        }} 
                      />
                      <Typography variant="h6" gutterBottom>
                        PDF Report
                      </Typography>
                      <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2 }}>
                        Comprehensive PDF document with all selected information and visualizations.
                      </Typography>
                      <Box sx={{ mt: 'auto', display: 'flex', gap: 1 }}>
                        <Button
                          variant="outlined"
                          startIcon={<PreviewIcon />}
                          onClick={handleOpenPreview}
                        >
                          Preview
                        </Button>
                        <Button
                          variant="contained"
                          startIcon={<DownloadIcon />}
                          onClick={generatePDF}
                          disabled={loading}
                        >
                          Generate
                        </Button>
                      </Box>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Paper
                      elevation={0}
                      variant="outlined"
                      sx={{
                        p: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        height: '100%'
                      }}
                    >
                      <InsertDriveFileIcon
                        sx={{
                          fontSize: 60,
                          color: theme.palette.primary.main,
                          mb: 2
                        }}
                      />
                      <Typography variant="h6" gutterBottom>
                        Data Export
                      </Typography>
                      <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2 }}>
                        Export data in various formats for further analysis in other software.
                      </Typography>
                      <Box sx={{ mt: 'auto', display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }}>
                        <FormControl fullWidth size="small">
                          <InputLabel id="export-format-label">Choose Data Type</InputLabel>
                          <Select
                            labelId="export-format-label"
                            label="Choose Data Type"
                            value="variance"
                            disabled={!visualizationData}
                          >
                            <MenuItem value="variance">Explained Variance</MenuItem>
                            <MenuItem value="loadings">Gene Loadings</MenuItem>
                            <MenuItem value="scores">Sample Scores</MenuItem>
                            <MenuItem value="all">All Data (ZIP)</MenuItem>
                          </Select>
                        </FormControl>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1, width: '100%' }}>
                          <Button
                            variant="outlined"
                            startIcon={<FileDownloadIcon />}
                            onClick={() => exportCSV('variance')}
                            disabled={!visualizationData}
                            size="small"
                            fullWidth
                          >
                            Variance
                          </Button>
                          <Button
                            variant="outlined"
                            startIcon={<FileDownloadIcon />}
                            onClick={() => exportCSV('loadings')}
                            disabled={!visualizationData}
                            size="small"
                            fullWidth
                          >
                            Genes
                          </Button>
                          <Button
                            variant="outlined"
                            startIcon={<FileDownloadIcon />}
                            onClick={() => exportCSV('scores')}
                            disabled={!visualizationData}
                            size="small"
                            fullWidth
                          >
                            Samples
                          </Button>
                        </Box>
                        <Button
                          variant="contained"
                          startIcon={<DownloadIcon />}
                          onClick={exportAllData}
                          disabled={!visualizationData}
                          sx={{ mt: 1 }}
                        >
                          Export All (ZIP)
                        </Button>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>
                
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Export Visualizations
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Download high-resolution images of specific visualizations in various formats.
                  </Typography>

                  <Grid container spacing={2}>
                    {[
                      { title: "PCA Plot", description: "2D or 3D scatter plot of samples", icon: <AnalyticsIcon />, color: theme.palette.primary.main },
                      { title: "Gene Loading Plot", description: "Visualization of gene contributions", icon: <AssessmentIcon />, color: theme.palette.secondary.main },
                      { title: "Scree Plot", description: "Variance explained by components", icon: <InsightsIcon />, color: theme.palette.success.main }
                    ].map((plot, index) => (
                      <Grid item xs={12} md={4} key={index}>
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 2,
                            display: 'flex',
                            flexDirection: 'column',
                            height: '100%',
                            borderColor: 'transparent',
                            borderTop: `2px solid ${plot.color}`
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Avatar
                              sx={{
                                width: 40,
                                height: 40,
                                bgcolor: `${plot.color}20`,
                                color: plot.color,
                                mr: 1
                              }}
                            >
                              {plot.icon}
                            </Avatar>
                            <Typography variant="subtitle1">{plot.title}</Typography>
                          </Box>

                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1 }}>
                            {plot.description}
                          </Typography>

                          <Stack direction="row" spacing={1}>
                            <Chip
                              icon={<PhotoIcon />}
                              label="PNG"
                              variant="outlined"
                              onClick={() => alert(`Export ${plot.title} as PNG`)}
                              disabled={!visualizationData}
                              size="small"
                            />
                            <Chip
                              icon={<FileDownloadIcon />}
                              label="SVG"
                              variant="outlined"
                              onClick={() => alert(`Export ${plot.title} as SVG`)}
                              disabled={!visualizationData}
                              size="small"
                            />
                            <Chip
                              icon={<SettingsIcon />}
                              label="Options"
                              variant="outlined"
                              onClick={() => alert(`Configure ${plot.title} export options`)}
                              disabled={!visualizationData}
                              size="small"
                            />
                          </Stack>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
      
      {/* Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={handleClosePreview}
        maxWidth="lg"
        fullWidth
        sx={{ '& .MuiDialog-paper': { height: '90vh' } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Report Preview</Typography>
          <IconButton
            aria-label="close"
            onClick={handleClosePreview}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <PreviewDialog />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleClosePreview}
            color="inherit"
          >
            Close
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileOpenIcon />}
            onClick={() => window.open('#', '_blank')}
          >
            Open in Browser
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={generatePDF}
          >
            Download PDF
          </Button>
        </DialogActions>
      </Dialog>
      
      <Divider sx={{ my: 4 }} />
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          color="primary"
          onClick={generatePDF}
          disabled={loading}
        >
          Generate Report
        </Button>
      </Box>
    </Box>
  );
};

export default PcaReportGenerator;