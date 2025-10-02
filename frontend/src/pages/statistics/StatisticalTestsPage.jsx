import React, { useState } from 'react';
import { 
  Typography, 
  Box, 
  Paper, 
  Grid,
  FormControl,
  InputLabel,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { EnterpriseTextField, EnterpriseSelect } from '../../components/common/EnterpriseFormFields';

// Mock data
const mockDatasets = [
  { id: 1, name: 'Sample Dataset 1', type: 'csv', rows: 120, columns: 8 },
  { id: 2, name: 'Gene Expression Data', type: 'excel', rows: 320, columns: 12 },
  { id: 3, name: 'Quality Control Metrics', type: 'csv', rows: 84, columns: 6 },
  { id: 4, name: 'Manufacturing Process', type: 'json', rows: 210, columns: 15 }
];

const availableTests = [
  { id: 'ttest', name: 'T-Test', description: 'Compare means of two groups', parametric: true },
  { id: 'anova', name: 'ANOVA', description: 'Compare means of multiple groups', parametric: true },
  { id: 'chi2', name: 'Chi-Square Test', description: 'Test independence of categorical variables', parametric: false },
  { id: 'correlation', name: 'Correlation Test', description: 'Measure relationship between variables', parametric: true },
  { id: 'regression', name: 'Linear Regression', description: 'Model relationship between variables', parametric: true },
  { id: 'mann_whitney', name: 'Mann-Whitney U Test', description: 'Non-parametric alternative to t-test', parametric: false }
];

function StatisticalTestsPage() {
  const [selectedDataset, setSelectedDataset] = useState('');
  const [selectedTest, setSelectedTest] = useState('');
  const [confidenceLevel, setConfidenceLevel] = useState(95);
  const [resultShown, setResultShown] = useState(false);

  const handleDatasetChange = (event) => {
    setSelectedDataset(event.target.value);
    setResultShown(false);
  };

  const handleTestChange = (event) => {
    setSelectedTest(event.target.value);
    setResultShown(false);
  };

  const handleConfidenceLevelChange = (event) => {
    setConfidenceLevel(event.target.value);
  };

  const handleRunTest = () => {
    setResultShown(true);
  };

  const TestParameters = () => {
    if (!selectedTest) return null;

    switch (selectedTest) {
      case 'ttest':
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="subtitle2">T-Test Parameters</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <EnterpriseTextField
                label="Variable"
                placeholder="Select variable to test"
                helperText="Variable to test"
                clearable
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <EnterpriseTextField
                label="Group Variable"
                placeholder="Select grouping variable"
                helperText="Variable defining groups"
                clearable
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <EnterpriseSelect
                label="Test Type"
                value="two-sided"
                onChange={() => {}}
                options={[
                  { value: 'two-sided', label: 'Two-sided' },
                  { value: 'greater', label: 'Greater than' },
                  { value: 'less', label: 'Less than' }
                ]}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <EnterpriseSelect
                label="Equal Variances"
                value={true}
                onChange={() => {}}
                options={[
                  { value: true, label: 'Assume equal' },
                  { value: false, label: 'Do not assume equal' }
                ]}
              />
            </Grid>
          </Grid>
        );
      case 'anova':
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="subtitle2">ANOVA Parameters</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <EnterpriseTextField
                label="Response Variable"
                placeholder="Select response variable"
                helperText="Variable to analyze"
                clearable
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <EnterpriseTextField
                label="Factor Variable"
                placeholder="Select factor variable"
                helperText="Grouping variable"
                clearable
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <EnterpriseSelect
                label="ANOVA Type"
                value="one-way"
                onChange={() => {}}
                options={[
                  { value: 'one-way', label: 'One-way ANOVA' },
                  { value: 'two-way', label: 'Two-way ANOVA' },
                  { value: 'repeated', label: 'Repeated Measures' }
                ]}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <EnterpriseSelect
                label="Post-hoc Test"
                value="tukey"
                onChange={() => {}}
                options={[
                  { value: 'tukey', label: 'Tukey HSD' },
                  { value: 'bonferroni', label: 'Bonferroni' },
                  { value: 'scheffe', label: 'Scheffé' }
                ]}
              />
            </Grid>
          </Grid>
        );
      case 'chi2':
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="subtitle2">Chi-Square Test Parameters</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <EnterpriseTextField
                label="Variable 1"
                placeholder="Select first categorical variable"
                helperText="First categorical variable"
                clearable
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <EnterpriseTextField
                label="Variable 2"
                placeholder="Select second categorical variable"
                helperText="Second categorical variable"
                clearable
              />
            </Grid>
            <Grid item xs={12}>
              <EnterpriseSelect
                label="Correction Method"
                value="none"
                onChange={() => {}}
                options={[
                  { value: 'none', label: 'None' },
                  { value: 'yates', label: "Yates' Correction" },
                  { value: 'williams', label: "Williams' Correction" }
                ]}
              />
            </Grid>
          </Grid>
        );
      default:
        return (
          <Typography variant="body2" color="text.secondary">
            Please select a test to see available parameters
          </Typography>
        );
    }
  };

  const MockResults = () => {
    if (!resultShown || !selectedTest || !selectedDataset) return null;

    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Statistical Test Results
        </Typography>
        
        <TableContainer>
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell><strong>Test Performed</strong></TableCell>
                <TableCell>{availableTests.find(t => t.id === selectedTest)?.name}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell><strong>Dataset</strong></TableCell>
                <TableCell>{mockDatasets.find(d => d.id === selectedDataset)?.name}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell><strong>Test Statistic</strong></TableCell>
                <TableCell>2.345</TableCell>
              </TableRow>
              <TableRow>
                <TableCell><strong>p-value</strong></TableCell>
                <TableCell>0.042</TableCell>
              </TableRow>
              <TableRow>
                <TableCell><strong>Degrees of Freedom</strong></TableCell>
                <TableCell>118</TableCell>
              </TableRow>
              <TableRow>
                <TableCell><strong>Confidence Level</strong></TableCell>
                <TableCell>{confidenceLevel}%</TableCell>
              </TableRow>
              <TableRow>
                <TableCell><strong>Conclusion</strong></TableCell>
                <TableCell>
                  <Alert severity="success" sx={{ mt: 1 }}>
                    Reject null hypothesis at {confidenceLevel}% confidence level
                  </Alert>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    );
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Statistical Tests
      </Typography>
      
      <Grid container spacing={3}>
        {/* Test Selection Panel */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Test Configuration
            </Typography>
            
            <EnterpriseSelect
              label="Select Dataset"
              value={selectedDataset}
              onChange={handleDatasetChange}
              options={mockDatasets.map(d => ({
                value: d.id,
                label: `${d.name} (${d.rows} rows, ${d.columns} cols)`
              }))}
              placeholder="Choose a dataset"
              helperText="Select the dataset to analyze"
              fullWidth
              sx={{ mb: 3 }}
            />
            
            <EnterpriseSelect
              label="Select Test"
              value={selectedTest}
              onChange={handleTestChange}
              options={availableTests.map(t => ({
                value: t.id,
                label: t.name,
                description: t.description
              }))}
              placeholder="Choose a statistical test"
              helperText="Select the test to perform"
              fullWidth
              sx={{ mb: 3 }}
            />
            
            <EnterpriseTextField
              label="Confidence Level (%)"
              type="number"
              value={confidenceLevel}
              onChange={handleConfidenceLevelChange}
              placeholder="95"
              helperText="Set confidence level (1-99)"
              inputProps={{ min: 1, max: 99 }}
              fullWidth
              sx={{ mb: 3 }}
            />
            
            <Button
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              onClick={handleRunTest}
              disabled={!selectedDataset || !selectedTest}
            >
              Run Statistical Test
            </Button>
          </Paper>
        </Grid>
        
        {/* Parameters Panel */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Test Parameters
            </Typography>
            <TestParameters />
          </Paper>
          
          {/* Results Panel */}
          <MockResults />
        </Grid>
      </Grid>
      
      {/* Test Information */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Available Statistical Tests
        </Typography>
        {availableTests.map(test => (
          <Accordion key={test.id}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>
                {test.name} {test.parametric ? '(Parametric)' : '(Non-parametric)'}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary">
                {test.description}
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </Box>
  );
}

export default StatisticalTestsPage;