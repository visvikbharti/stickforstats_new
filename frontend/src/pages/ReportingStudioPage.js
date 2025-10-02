import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  Card,
  CardContent,
  CardActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Checkbox
} from '@mui/material';
import {
  Description as DescriptionIcon,
  PictureAsPdf as PdfIcon,
  Article as WordIcon,
  Code as HtmlIcon,
  Assessment as AssessmentIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Preview as PreviewIcon
} from '@mui/icons-material';

const ReportingStudioPage = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [reportConfig, setReportConfig] = useState({
    title: '',
    type: 'comprehensive',
    format: 'pdf',
    sections: [],
    template: 'academic'
  });
  const [selectedAnalyses, setSelectedAnalyses] = useState([]);

  const steps = ['Select Analyses', 'Configure Report', 'Customize Sections', 'Generate'];

  const reportTemplates = [
    {
      id: 'academic',
      name: 'Academic Paper',
      description: 'APA/MLA formatted research paper',
      sections: ['Abstract', 'Introduction', 'Methods', 'Results', 'Discussion', 'References']
    },
    {
      id: 'business',
      name: 'Business Report',
      description: 'Executive summary with key insights',
      sections: ['Executive Summary', 'Key Findings', 'Detailed Analysis', 'Recommendations']
    },
    {
      id: 'technical',
      name: 'Technical Report',
      description: 'Detailed technical documentation',
      sections: ['Summary', 'Methodology', 'Technical Details', 'Results', 'Appendices']
    },
    {
      id: 'presentation',
      name: 'Presentation',
      description: 'Slide-ready format with visuals',
      sections: ['Title Slide', 'Overview', 'Key Charts', 'Conclusions']
    }
  ];

  const availableAnalyses = [
    { id: 1, name: 'SQC Analysis - Process Control', date: '2025-06-20', type: 'SQC' },
    { id: 2, name: 'PCA Results - Gene Expression', date: '2025-06-19', type: 'PCA' },
    { id: 3, name: 'DOE - Factorial Design', date: '2025-06-18', type: 'DOE' },
    { id: 4, name: 'Confidence Intervals - Clinical Trial', date: '2025-06-17', type: 'CI' },
  ];

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleAnalysisToggle = (analysis) => {
    setSelectedAnalyses(prev => {
      const isSelected = prev.find(a => a.id === analysis.id);
      if (isSelected) {
        return prev.filter(a => a.id !== analysis.id);
      }
      return [...prev, analysis];
    });
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Select Analyses to Include
            </Typography>
            <List>
              {availableAnalyses.map((analysis) => (
                <ListItem key={analysis.id} button onClick={() => handleAnalysisToggle(analysis)}>
                  <ListItemIcon>
                    <Checkbox
                      edge="start"
                      checked={selectedAnalyses.some(a => a.id === analysis.id)}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={analysis.name}
                    secondary={`${analysis.type} • ${analysis.date}`}
                  />
                  <Chip label={analysis.type} size="small" />
                </ListItem>
              ))}
            </List>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Configure Report Settings
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Report Title"
                  value={reportConfig.title}
                  onChange={(e) => setReportConfig({ ...reportConfig, title: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Report Template</InputLabel>
                  <Select
                    value={reportConfig.template}
                    onChange={(e) => setReportConfig({ ...reportConfig, template: e.target.value })}
                  >
                    {reportTemplates.map((template) => (
                      <MenuItem key={template.id} value={template.id}>
                        {template.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Output Format</InputLabel>
                  <Select
                    value={reportConfig.format}
                    onChange={(e) => setReportConfig({ ...reportConfig, format: e.target.value })}
                  >
                    <MenuItem value="pdf">PDF</MenuItem>
                    <MenuItem value="docx">Word Document</MenuItem>
                    <MenuItem value="html">HTML</MenuItem>
                    <MenuItem value="latex">LaTeX</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Customize Report Sections
            </Typography>
            <List>
              {reportTemplates.find(t => t.id === reportConfig.template)?.sections.map((section, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <DescriptionIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={section}
                    secondary="Click to customize content"
                  />
                  <ListItemSecondaryAction>
                    <IconButton edge="end">
                      <EditIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
            <Button startIcon={<AddIcon />} sx={{ mt: 2 }}>
              Add Custom Section
            </Button>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Report Preview
            </Typography>
            <Paper elevation={1} sx={{ p: 3, bgcolor: 'grey.50' }}>
              <Typography variant="h5" gutterBottom>
                {reportConfig.title || 'Untitled Report'}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Template: {reportTemplates.find(t => t.id === reportConfig.template)?.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Format: {reportConfig.format.toUpperCase()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Includes {selectedAnalyses.length} analyses
              </Typography>
            </Paper>
          </Box>
        );

      default:
        return null;
    }
  };

  const getFormatIcon = (format) => {
    switch (format) {
      case 'pdf': return <PdfIcon />;
      case 'docx': return <WordIcon />;
      case 'html': return <HtmlIcon />;
      default: return <DescriptionIcon />;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={2} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Reporting Studio
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Create professional reports from your statistical analyses with customizable templates and formats.
        </Typography>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper elevation={1} sx={{ p: 3 }}>
            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            <Box sx={{ minHeight: 400 }}>
              {renderStepContent(activeStep)}
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
              <Button
                onClick={handleBack}
                disabled={activeStep === 0}
              >
                Back
              </Button>
              <Button
                variant="contained"
                onClick={activeStep === steps.length - 1 ? undefined : handleNext}
                startIcon={activeStep === steps.length - 1 ? getFormatIcon(reportConfig.format) : null}
              >
                {activeStep === steps.length - 1 ? 'Generate Report' : 'Next'}
              </Button>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent Reports
            </Typography>
            <List dense>
              <ListItem button>
                <ListItemIcon>
                  <PdfIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Q2 Analysis Report"
                  secondary="Generated 2 days ago"
                />
              </ListItem>
              <ListItem button>
                <ListItemIcon>
                  <WordIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Clinical Trial Results"
                  secondary="Generated 5 days ago"
                />
              </ListItem>
              <ListItem button>
                <ListItemIcon>
                  <HtmlIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Process Control Summary"
                  secondary="Generated 1 week ago"
                />
              </ListItem>
            </List>
          </Paper>

          <Paper elevation={1} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Button fullWidth variant="outlined" sx={{ mb: 1 }} startIcon={<PreviewIcon />}>
              Preview Templates
            </Button>
            <Button fullWidth variant="outlined" sx={{ mb: 1 }} startIcon={<AssessmentIcon />}>
              Report History
            </Button>
            <Button fullWidth variant="outlined" startIcon={<EditIcon />}>
              Custom Templates
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ReportingStudioPage;