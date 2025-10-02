import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button,
  Grid,
  Divider,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  AlertTitle,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Card,
  CardMedia,
  CardContent,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  GetApp as DownloadIcon,
  Delete as DeleteIcon,
  Print as PrintIcon,
  Share as ShareIcon,
  ExpandMore as ExpandMoreIcon,
  Assessment as AssessmentIcon,
  TableChart as TableIcon,
  BarChart as ChartIcon,
  Article as ArticleIcon,
  Fullscreen as FullscreenIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useReportAPI } from '../../hooks/useReportAPI';

// Format mapping for report formats
const formatChips = {
  pdf: { label: 'PDF', color: 'error' },
  html: { label: 'HTML', color: 'primary' },
  docx: { label: 'DOCX', color: 'info' }
};

/**
 * Component for viewing report details
 */
const ReportViewer = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const { 
    currentReport, 
    loading, 
    error, 
    getReportDetails,
    downloadReport
  } = useReportAPI();
  
  // Local state
  const [tabValue, setTabValue] = useState(0);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [imageDialog, setImageDialog] = useState({
    open: false,
    url: '',
    title: ''
  });
  
  // Mock state for report contents (in a real app, this would come from the API)
  const [reportData, setReportData] = useState({
    analyses: [],
    tables: [],
    visualizations: []
  });
  
  // Load report details on mount
  useEffect(() => {
    const fetchReportDetails = async () => {
      try {
        await getReportDetails(reportId);
      } catch (err) {
        console.error('Error fetching report details:', err);
      }
    };
    
    fetchReportDetails();
    
    // Mock data for the report content
    setReportData({
      analyses: [
        {
          id: '1',
          title: 'Statistical Test Results - Dataset A',
          type: 'statistical_test',
          summary: 'Two-sample t-test comparing control vs. treatment groups',
          results: {
            p_value: 0.032,
            t_statistic: 2.87,
            degrees_of_freedom: 28,
            significant: true
          }
        },
        {
          id: '2',
          title: 'Descriptive Statistics Summary',
          type: 'descriptive_statistics',
          summary: 'Summary statistics for all variables in the dataset',
          results: {
            variables: [
              { name: 'Variable A', mean: 15.7, median: 15.1, std: 3.2 },
              { name: 'Variable B', mean: 42.3, median: 40.5, std: 8.5 },
              { name: 'Variable C', mean: 7.8, median: 7.0, std: 1.9 }
            ]
          }
        }
      ],
      tables: [
        {
          id: 't1',
          title: 'T-Test Results Table',
          columns: ['Group', 'Mean', 'Std Dev', 'Sample Size'],
          data: [
            ['Control', 23.4, 3.7, 15],
            ['Treatment', 27.8, 4.2, 15]
          ]
        },
        {
          id: 't2',
          title: 'Correlation Matrix',
          columns: ['Variable', 'Var A', 'Var B', 'Var C'],
          data: [
            ['Var A', 1.0, 0.72, 0.35],
            ['Var B', 0.72, 1.0, 0.51],
            ['Var C', 0.35, 0.51, 1.0]
          ]
        }
      ],
      visualizations: [
        {
          id: 'v1',
          title: 'Distribution Comparison',
          type: 'histogram',
          imgSrc: 'https://via.placeholder.com/800x400?text=Distribution+Histogram'
        },
        {
          id: 'v2',
          title: 'Box Plot Comparison',
          type: 'boxplot',
          imgSrc: 'https://via.placeholder.com/800x400?text=Box+Plot+Visualization'
        },
        {
          id: 'v3',
          title: 'Regression Plot',
          type: 'scatter',
          imgSrc: 'https://via.placeholder.com/800x400?text=Regression+Plot'
        }
      ]
    });
  }, [getReportDetails, reportId]);
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Handle image dialog
  const handleOpenImageDialog = (imgSrc, title) => {
    setImageDialog({
      open: true,
      url: imgSrc,
      title
    });
  };
  
  const handleCloseImageDialog = () => {
    setImageDialog({
      ...imageDialog,
      open: false
    });
  };
  
  // Handle download
  const handleDownload = async () => {
    try {
      await downloadReport(reportId);
    } catch (err) {
      console.error('Error downloading report:', err);
    }
  };
  
  // Handle delete
  const handleDeleteClick = () => {
    setConfirmDeleteOpen(true);
  };
  
  const handleConfirmDelete = async () => {
    // In a real implementation, you would call the delete API
    setConfirmDeleteOpen(false);
    navigate('/reports');
  };
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  if (loading && !currentReport) {
    return (
      <Box sx={{ py: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ py: 3 }}>
        <Alert severity="error">
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      </Box>
    );
  }
  
  if (!currentReport) {
    return (
      <Box sx={{ py: 3 }}>
        <Alert severity="warning">
          <AlertTitle>Report Not Found</AlertTitle>
          The requested report could not be found. It may have been deleted.
        </Alert>
        <Button 
          variant="contained" 
          onClick={() => navigate('/reports')} 
          sx={{ mt: 2 }}
        >
          Back to Reports
        </Button>
      </Box>
    );
  }
  
  return (
    <Box sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Button 
            variant="outlined" 
            size="small"
            onClick={() => navigate('/reports')}
            sx={{ mb: 1 }}
          >
            Back to Reports
          </Button>
          
          <Typography variant="h4" component="h1">
            {currentReport.title}
          </Typography>
          
          {currentReport.description && (
            <Typography variant="body1" color="textSecondary" sx={{ mt: 1 }}>
              {currentReport.description}
            </Typography>
          )}
        </Box>
        
        <Box>
          <Tooltip title="Download Report">
            <IconButton onClick={handleDownload} color="primary">
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Print Report">
            <IconButton onClick={() => window.print()}>
              <PrintIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Share Report">
            <IconButton>
              <ShareIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Delete Report">
            <IconButton onClick={handleDeleteClick} color="error">
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Format
            </Typography>
            <Chip 
              label={formatChips[currentReport.format]?.label || currentReport.format.toUpperCase()} 
              color={formatChips[currentReport.format]?.color || 'default'}
              size="small"
            />
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Created
            </Typography>
            <Typography variant="body2">
              {formatDate(currentReport.created_at)}
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              File Size
            </Typography>
            <Typography variant="body2">
              {currentReport.file_size ? `${(currentReport.file_size / 1024).toFixed(2)} KB` : 'N/A'}
            </Typography>
          </Grid>
          
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Report Contents
            </Typography>
            
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs 
                value={tabValue} 
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
              >
                <Tab 
                  icon={<AssessmentIcon />} 
                  iconPosition="start" 
                  label="Analyses"
                  id="tab-0"
                />
                <Tab 
                  icon={<ChartIcon />} 
                  iconPosition="start" 
                  label="Visualizations"
                  id="tab-1"
                />
                <Tab 
                  icon={<TableIcon />} 
                  iconPosition="start" 
                  label="Data Tables"
                  id="tab-2"
                />
                <Tab 
                  icon={<ArticleIcon />} 
                  iconPosition="start" 
                  label="Full Report"
                  id="tab-3"
                />
              </Tabs>
            </Box>
            
            <Box role="tabpanel" hidden={tabValue !== 0} id="tabpanel-0" sx={{ py: 2 }}>
              {reportData.analyses.map((analysis) => (
                <Accordion key={analysis.id} defaultExpanded={true}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle1">{analysis.title}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" paragraph>
                      {analysis.summary}
                    </Typography>
                    
                    {analysis.type === 'statistical_test' && (
                      <Box>
                        <Typography variant="subtitle2">Results:</Typography>
                        <List dense>
                          <ListItem>
                            <ListItemText 
                              primary="p-value" 
                              secondary={analysis.results.p_value}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText 
                              primary="t-statistic" 
                              secondary={analysis.results.t_statistic}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText 
                              primary="Degrees of Freedom" 
                              secondary={analysis.results.degrees_of_freedom}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText 
                              primary="Significant" 
                              secondary={analysis.results.significant ? 'Yes' : 'No'}
                            />
                          </ListItem>
                        </List>
                      </Box>
                    )}
                    
                    {analysis.type === 'descriptive_statistics' && (
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Variable</TableCell>
                              <TableCell align="right">Mean</TableCell>
                              <TableCell align="right">Median</TableCell>
                              <TableCell align="right">Std. Dev</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {analysis.results.variables.map((variable) => (
                              <TableRow key={variable.name}>
                                <TableCell component="th" scope="row">
                                  {variable.name}
                                </TableCell>
                                <TableCell align="right">{variable.mean}</TableCell>
                                <TableCell align="right">{variable.median}</TableCell>
                                <TableCell align="right">{variable.std}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
            
            <Box role="tabpanel" hidden={tabValue !== 1} id="tabpanel-1" sx={{ py: 2 }}>
              <Grid container spacing={3}>
                {reportData.visualizations.map((viz) => (
                  <Grid item xs={12} md={6} key={viz.id}>
                    <Card variant="outlined">
                      <CardMedia
                        component="img"
                        image={viz.imgSrc}
                        alt={viz.title}
                        sx={{ cursor: 'pointer' }}
                        onClick={() => handleOpenImageDialog(viz.imgSrc, viz.title)}
                      />
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="subtitle1">
                            {viz.title}
                          </Typography>
                          <Tooltip title="View Full Size">
                            <IconButton 
                              size="small"
                              onClick={() => handleOpenImageDialog(viz.imgSrc, viz.title)}
                            >
                              <FullscreenIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                        <Typography variant="body2" color="textSecondary">
                          Type: {viz.type.charAt(0).toUpperCase() + viz.type.slice(1)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
            
            <Box role="tabpanel" hidden={tabValue !== 2} id="tabpanel-2" sx={{ py: 2 }}>
              {reportData.tables.map((table) => (
                <Box key={table.id} sx={{ mb: 4 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    {table.title}
                  </Typography>
                  
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          {table.columns.map((column, index) => (
                            <TableCell key={index}>{column}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {table.data.map((row, rowIndex) => (
                          <TableRow key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                              <TableCell key={cellIndex}>
                                {cell}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              ))}
            </Box>
            
            <Box role="tabpanel" hidden={tabValue !== 3} id="tabpanel-3" sx={{ py: 2 }}>
              <Alert severity="info" sx={{ mb: 3 }}>
                <AlertTitle>Full Report Download</AlertTitle>
                The full report is available in {currentReport.format.toUpperCase()} format. 
                Click the download button to access the complete report with all analyses, 
                visualizations, and data tables.
              </Alert>
              
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownload}
                >
                  Download Full Report
                </Button>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Image Dialog */}
      <Dialog
        open={imageDialog.open}
        onClose={handleCloseImageDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>{imageDialog.title}</DialogTitle>
        <DialogContent>
          <img 
            src={imageDialog.url} 
            alt={imageDialog.title} 
            style={{ width: '100%', height: 'auto' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseImageDialog}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete report "{currentReport.title}"? 
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            color="error" 
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReportViewer;