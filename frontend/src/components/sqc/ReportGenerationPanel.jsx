import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Button, 
  TextField, 
  FormControlLabel, 
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Divider,
  Card,
  CardContent,
  CardMedia,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  useTheme
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { 
  Description as DescriptionIcon,
  PictureAsPdf as PdfIcon,
  Article as ArticleIcon,
  Preview as PreviewIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
  SaveAlt as SaveAltIcon,
  CheckCircle as CheckCircleIcon,
  OpenInNew as OpenInNewIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';

// Styled components
const ReportOptionCard = styled(Card)(({ theme, selected }) => ({
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  border: selected ? `2px solid ${theme.palette.primary.main}` : '1px solid transparent',
  backgroundColor: selected ? theme.palette.primary.lightest || theme.palette.action.selected : theme.palette.background.paper,
  position: 'relative',
  height: '100%',
  '&:hover': {
    transform: selected ? 'scale(1)' : 'translateY(-4px)',
    boxShadow: selected ? theme.shadows[4] : theme.shadows[8]
  }
}));

const CheckmarkIcon = styled(CheckCircleIcon)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(1),
  right: theme.spacing(1),
  color: theme.palette.primary.main,
  fontSize: '1.5rem'
}));

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.4 }
  }
};

// Report format options
const REPORT_FORMATS = [
  {
    id: 'pdf',
    name: 'PDF Report',
    icon: <PdfIcon sx={{ fontSize: 40 }} />,
    description: 'Standard PDF format with professional layout',
    preview: '/images/pdf-preview.png'
  },
  {
    id: 'docx',
    name: 'Word Document',
    icon: <ArticleIcon sx={{ fontSize: 40 }} />,
    description: 'Editable Word document for further customization',
    preview: '/images/docx-preview.png'
  },
  {
    id: 'html',
    name: 'HTML Report',
    icon: <DescriptionIcon sx={{ fontSize: 40 }} />,
    description: 'Interactive web format with live visualizations',
    preview: '/images/html-preview.png'
  }
];

/**
 * Report Generation Panel Component
 * 
 * Provides options for generating analysis reports
 * 
 * @param {Object} props Component props
 * @param {Function} props.onGenerateReport Callback when report is generated
 * @param {boolean} props.isGenerating Loading state for report generation
 */
const ReportGenerationPanel = ({ onGenerateReport, isGenerating }) => {
  const theme = useTheme();
  
  // State
  const [reportTitle, setReportTitle] = useState('SQC Analysis Report');
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [includeInterpretation, setIncludeInterpretation] = useState(true);
  const [includeVisualization, setIncludeVisualization] = useState(true);
  const [includeRawData, setIncludeRawData] = useState(false);
  const [includeRecommendations, setIncludeRecommendations] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  
  // Report sections (dynamic settings)
  const [reportSections, setReportSections] = useState([
    { id: 'summary', name: 'Executive Summary', enabled: true },
    { id: 'methods', name: 'Methods & Procedures', enabled: true },
    { id: 'results', name: 'Results & Analysis', enabled: true },
    { id: 'visualizations', name: 'Visualizations & Charts', enabled: true },
    { id: 'interpretation', name: 'Statistical Interpretation', enabled: true },
    { id: 'recommendations', name: 'Recommendations', enabled: true },
    { id: 'appendix', name: 'Appendix: Raw Data', enabled: false }
  ]);
  
  // Toggle report section
  const toggleSection = (sectionId) => {
    setReportSections(sections =>
      sections.map(section =>
        section.id === sectionId
          ? { ...section, enabled: !section.enabled }
          : section
      )
    );
  };
  
  // Handle preview click
  const handlePreviewClick = () => {
    setPreviewOpen(true);
  };
  
  // Handle preview close
  const handleClosePreview = () => {
    setPreviewOpen(false);
  };
  
  // Handle report generation
  const handleGenerateReport = () => {
    // Create report configuration
    const reportConfig = {
      title: reportTitle,
      format: selectedFormat,
      includeInterpretation,
      includeVisualization,
      includeRawData,
      includeRecommendations,
      sections: reportSections.filter(section => section.enabled).map(section => section.id)
    };
    
    // Call the generation callback
    onGenerateReport(reportConfig);
  };
  
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Box>
        <Box display="flex" alignItems="center" mb={2}>
          <SaveAltIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">
            Generate Report
          </Typography>
        </Box>
        
        <Grid container spacing={3}>
          {/* Title and basic settings */}
          <Grid item xs={12}>
            <motion.div variants={itemVariants}>
              <Paper sx={{ p: 2, backgroundColor: theme.palette.background.default }} elevation={0}>
                <TextField
                  label="Report Title"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  fullWidth
                  margin="normal"
                  variant="outlined"
                />
              </Paper>
            </motion.div>
          </Grid>
          
          {/* Report format selection */}
          <Grid item xs={12}>
            <motion.div variants={itemVariants}>
              <Typography variant="subtitle1" gutterBottom>
                Select Report Format
              </Typography>
              
              <Grid container spacing={2}>
                {REPORT_FORMATS.map((format) => (
                  <Grid item xs={12} sm={4} key={format.id}>
                    <ReportOptionCard
                      selected={selectedFormat === format.id}
                      onClick={() => setSelectedFormat(format.id)}
                    >
                      <CardContent>
                        <Box display="flex" flexDirection="column" alignItems="center" mb={1}>
                          {format.icon}
                          <Typography variant="h6" component="div" align="center" sx={{ mt: 1 }}>
                            {format.name}
                          </Typography>
                        </Box>
                        
                        <Typography variant="body2" color="text.secondary" align="center">
                          {format.description}
                        </Typography>
                        
                        {selectedFormat === format.id && (
                          <CheckmarkIcon />
                        )}
                      </CardContent>
                    </ReportOptionCard>
                  </Grid>
                ))}
              </Grid>
            </motion.div>
          </Grid>
          
          {/* Report content options */}
          <Grid item xs={12} md={6}>
            <motion.div variants={itemVariants}>
              <Typography variant="subtitle1" gutterBottom>
                Report Sections
              </Typography>
              
              <Paper sx={{ p: 2, backgroundColor: theme.palette.background.default }} elevation={0}>
                <List>
                  {reportSections.map((section) => (
                    <ListItem key={section.id} disablePadding>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={section.enabled}
                            onChange={() => toggleSection(section.id)}
                          />
                        }
                        label={section.name}
                        sx={{ width: '100%', py: 0.5 }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </motion.div>
          </Grid>
          
          {/* Additional options */}
          <Grid item xs={12} md={6}>
            <motion.div variants={itemVariants}>
              <Typography variant="subtitle1" gutterBottom>
                Report Options
              </Typography>
              
              <Paper sx={{ p: 2, backgroundColor: theme.palette.background.default }} elevation={0}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Detail Level</InputLabel>
                  <Select
                    value="standard"
                    label="Detail Level"
                  >
                    <MenuItem value="summary">Summary (Brief overview)</MenuItem>
                    <MenuItem value="standard">Standard (Recommended)</MenuItem>
                    <MenuItem value="detailed">Detailed (Technical)</MenuItem>
                  </Select>
                </FormControl>
                
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={includeRawData}
                      onChange={(e) => setIncludeRawData(e.target.checked)}
                    />
                  }
                  label="Include raw data tables"
                  sx={{ display: 'block', mt: 2 }}
                />
              </Paper>
            </motion.div>
          </Grid>
          
          {/* Submit button */}
          <Grid item xs={12}>
            <motion.div variants={itemVariants}>
              <Box display="flex" justifyContent="space-between" mt={2}>
                <Button
                  variant="outlined"
                  onClick={handlePreviewClick}
                  startIcon={<PreviewIcon />}
                  disabled={isGenerating}
                >
                  Preview Report
                </Button>
                
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleGenerateReport}
                  disabled={isGenerating}
                  startIcon={isGenerating ? <CircularProgress size={20} /> : <DownloadIcon />}
                >
                  {isGenerating ? 'Generating...' : 'Generate Report'}
                </Button>
              </Box>
            </motion.div>
          </Grid>
        </Grid>
        
        {/* Preview Dialog */}
        <Dialog
          open={previewOpen}
          onClose={handleClosePreview}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Report Preview
            <IconButton
              aria-label="close"
              onClick={handleClosePreview}
              sx={{
                position: 'absolute',
                right: 8,
                top: 8
              }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Box>
              <Typography variant="h5" gutterBottom align="center">
                {reportTitle}
              </Typography>
              
              <Box sx={{ height: 500, bgcolor: 'background.default', p: 2, borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 8 }}>
                  Preview not available. The final report will include all selected sections and options.
                </Typography>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClosePreview}>
              Close
            </Button>
            <Button
              onClick={handleGenerateReport}
              variant="contained"
              disabled={isGenerating}
              startIcon={isGenerating ? <CircularProgress size={20} /> : <DownloadIcon />}
            >
              {isGenerating ? 'Generating...' : 'Generate Report'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </motion.div>
  );
};

export default ReportGenerationPanel;