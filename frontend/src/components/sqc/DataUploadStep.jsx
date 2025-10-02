import React, { useState, useRef, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Grid, 
  Divider,
  CircularProgress,
  Card,
  CardContent,
  TextField,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Alert,
  Fade,
  useTheme
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { 
  UploadFile, 
  DataObject, 
  Upload, 
  CloudUpload, 
  Check, 
  BarChart, 
  DataUsage 
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// Styled components
const UploadArea = styled(Paper)(({ theme, isDragActive }) => ({
  padding: theme.spacing(3),
  border: `2px dashed ${isDragActive ? theme.palette.primary.main : theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: isDragActive ? theme.palette.action.hover : theme.palette.background.paper,
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  position: 'relative',
  overflow: 'hidden',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
    borderColor: theme.palette.primary.light
  },
  minHeight: 200,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center'
}));

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

const DataPreviewGrid = styled(Box)(({ theme }) => ({
  overflowX: 'auto',
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  '& table': {
    width: '100%',
    borderCollapse: 'collapse',
    '& th, & td': {
      padding: theme.spacing(1),
      textAlign: 'left',
      borderBottom: `1px solid ${theme.palette.divider}`,
      whiteSpace: 'nowrap',
      '&:first-of-type': {
        paddingLeft: theme.spacing(2)
      },
      '&:last-child': {
        paddingRight: theme.spacing(2)
      }
    },
    '& th': {
      backgroundColor: theme.palette.background.default,
      fontWeight: 600
    },
    '& tr:nth-of-type(even)': {
      backgroundColor: theme.palette.action.hover
    }
  }
}));

const ExampleCard = styled(Card)(({ theme }) => ({
  height: '100%',
  transition: 'transform 0.3s, box-shadow 0.3s',
  cursor: 'pointer',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8]
  }
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

// Sample datasets
const EXAMPLE_DATASETS = [
  {
    id: 'manufacturing_process',
    name: 'Manufacturing Process Data',
    description: 'Sample dataset with measurements from a manufacturing process, suitable for control charts.',
    columns: ['Batch', 'DateTime', 'Measurement1', 'Measurement2', 'Operator'],
    rows: 120
  },
  {
    id: 'quality_inspection',
    name: 'Quality Inspection Data',
    description: 'Sample dataset with quality inspection results, suitable for p and np charts.',
    columns: ['Date', 'Inspector', 'BatchSize', 'Defectives', 'ProductType'],
    rows: 75
  },
  {
    id: 'measurement_gauge',
    name: 'Measurement Gauge R&R',
    description: 'Sample dataset for gauge repeatability and reproducibility studies.',
    columns: ['Part', 'Operator', 'Measurement1', 'Measurement2', 'Measurement3'],
    rows: 50
  }
];

/**
 * Data Upload Step Component
 * 
 * Handles file upload, parsing, validation, and preview for SQC analysis
 * 
 * @param {Object} props Component props
 * @param {Function} props.onDatasetUpload Callback when dataset is ready
 * @param {boolean} props.isLoading Loading state
 */
const DataUploadStep = ({ onDatasetUpload, isLoading }) => {
  const theme = useTheme();
  const fileInputRef = useRef(null);
  
  // State
  const [isDragActive, setIsDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [datasetName, setDatasetName] = useState('');
  const [datasetDescription, setDatasetDescription] = useState('');
  const [fileType, setFileType] = useState('csv');
  const [hasHeader, setHasHeader] = useState(true);
  const [delimiter, setDelimiter] = useState(',');
  const [previewData, setPreviewData] = useState(null);
  const [validationResults, setValidationResults] = useState(null);
  const [processingFile, setProcessingFile] = useState(false);
  const [uploadStep, setUploadStep] = useState(0); // 0: upload, 1: preview, 2: validation
  
  // Handle drag events
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);
  
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);
  
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);
  
  // Handle file selection
  const handleFileChange = useCallback((e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      handleFileSelection(selectedFile);
    }
  }, []);
  
  // Handle file drop
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  }, []);
  
  // Process the selected file
  const handleFileSelection = useCallback((selectedFile) => {
    setFile(selectedFile);
    setDatasetName(selectedFile.name.split('.')[0]);
    setProcessingFile(true);
    
    // Determine file type
    const fileExtension = selectedFile.name.split('.').pop().toLowerCase();
    if (['csv', 'txt'].includes(fileExtension)) {
      setFileType('csv');
    } else if (['xlsx', 'xls'].includes(fileExtension)) {
      setFileType('excel');
    } else if (fileExtension === 'json') {
      setFileType('json');
    } else {
      // Unsupported file type
      setValidationResults({
        isValid: false,
        errors: [`Unsupported file type: .${fileExtension}. Please upload a CSV, Excel, or JSON file.`],
        warnings: []
      });
      setProcessingFile(false);
      return;
    }
    
    // Parse file content for preview
    const reader = new FileReader();
    reader.onload = (event) => {
      let data = null;
      
      try {
        if (fileType === 'csv') {
          // Parse CSV
          const results = Papa.parse(event.target.result, {
            header: hasHeader,
            skipEmptyLines: true,
            delimiter: delimiter
          });
          
          data = {
            headers: hasHeader ? results.meta.fields : results.data[0].map((_, i) => `Column ${i + 1}`),
            rows: hasHeader ? results.data : results.data.slice(1)
          };
        } else if (fileType === 'excel') {
          // Parse Excel
          const workbook = XLSX.read(event.target.result, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: hasHeader ? 1 : undefined });
          
          data = {
            headers: hasHeader 
              ? Object.keys(jsonData[0] || {}) 
              : Object.keys(jsonData[0] || {}).map((_, i) => `Column ${i + 1}`),
            rows: jsonData
          };
        } else if (fileType === 'json') {
          // Parse JSON
          const jsonData = JSON.parse(event.target.result);
          const isArray = Array.isArray(jsonData);
          
          if (isArray && jsonData.length > 0) {
            data = {
              headers: Object.keys(jsonData[0] || {}),
              rows: jsonData
            };
          } else {
            throw new Error('Invalid JSON format. Expecting an array of objects.');
          }
        }
        
        // Set preview data (first 5 rows)
        if (data) {
          setPreviewData({
            headers: data.headers,
            rows: data.rows.slice(0, 5)
          });
          
          setFileData(data);
          
          // Basic validation
          const validationResult = validateData(data);
          setValidationResults(validationResult);
          
          // Move to preview step
          setUploadStep(1);
        }
      } catch (error) {
        setValidationResults({
          isValid: false,
          errors: [`Error parsing file: ${error.message}`],
          warnings: []
        });
        
        console.error('Error parsing file:', error);
      }
      
      setProcessingFile(false);
    };
    
    reader.onerror = () => {
      setValidationResults({
        isValid: false,
        errors: ['Error reading file. Please try a different file.'],
        warnings: []
      });
      setProcessingFile(false);
    };
    
    if (fileType === 'excel') {
      reader.readAsBinaryString(selectedFile);
    } else {
      reader.readAsText(selectedFile);
    }
  }, [fileType, hasHeader, delimiter]);
  
  // Validate dataset for SQC analysis
  const validateData = (data) => {
    const errors = [];
    const warnings = [];
    
    // Check if data is empty
    if (!data.rows || data.rows.length === 0) {
      errors.push('Dataset is empty. Please upload a file with data.');
      return { isValid: false, errors, warnings };
    }
    
    // Check minimum rows
    if (data.rows.length < 10) {
      warnings.push('Dataset contains fewer than 10 rows. Some analyses may require more data for reliable results.');
    }
    
    // Check for numeric columns (needed for most SQC analyses)
    let hasNumericColumns = false;
    
    // Check a sample of the data to determine column types
    const sampleRows = data.rows.slice(0, Math.min(10, data.rows.length));
    const columnTypes = {};
    
    data.headers.forEach(header => {
      const columnValues = sampleRows.map(row => row[header]);
      const numericValues = columnValues.filter(val => !isNaN(parseFloat(val)) && isFinite(val));
      
      if (numericValues.length > 0) {
        hasNumericColumns = true;
        
        if (numericValues.length < columnValues.length) {
          warnings.push(`Column "${header}" contains some non-numeric values that might cause issues for numerical analyses.`);
        }
        
        columnTypes[header] = 'numeric';
      } else {
        columnTypes[header] = 'categorical';
      }
    });
    
    if (!hasNumericColumns) {
      errors.push('Dataset does not contain any numeric columns. SQC analysis requires numeric data.');
    }
    
    // Check for missing values
    let hasMissingValues = false;
    
    sampleRows.forEach((row, rowIndex) => {
      data.headers.forEach(header => {
        if (row[header] === null || row[header] === undefined || row[header] === '') {
          hasMissingValues = true;
        }
      });
    });
    
    if (hasMissingValues) {
      warnings.push('Dataset contains missing values. Some analyses may handle missing values, but it could affect results.');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      columnTypes
    };
  };
  
  // Handle upload button click
  const handleUploadClick = () => {
    fileInputRef.current.click();
  };
  
  // Handle dataset upload submission
  const handleSubmitDataset = () => {
    if (!file || !fileData || !validationResults.isValid) return;
    
    // Create dataset object
    const dataset = {
      file,
      name: datasetName,
      description: datasetDescription,
      fileType,
      hasHeader,
      delimiter,
      rows: fileData.rows.length,
      columns: fileData.headers.length,
      headers: fileData.headers,
      columnTypes: validationResults.columnTypes || {},
      previewData: {
        headers: fileData.headers,
        rows: fileData.rows.slice(0, 5)
      }
    };
    
    // Call the upload callback
    onDatasetUpload(dataset);
  };
  
  // Handle example dataset selection
  const handleExampleDataset = (datasetId) => {
    // In a real app, this would fetch the example dataset from the server
    // For now, we'll simulate the upload process
    setProcessingFile(true);
    
    // Simulate an asynchronous process
    setTimeout(() => {
      const selectedDataset = EXAMPLE_DATASETS.find(ds => ds.id === datasetId);
      
      if (selectedDataset) {
        // Create a simulated dataset
        const simulatedHeaders = selectedDataset.columns;
        const simulatedRows = Array.from({ length: 5 }).map((_, i) => {
          const row = {};
          simulatedHeaders.forEach(header => {
            if (header.includes('Measurement')) {
              row[header] = (Math.random() * 10 + 90).toFixed(2);
            } else if (header === 'Batch' || header === 'Part') {
              row[header] = `${String.fromCharCode(65 + i)}`;
            } else if (header === 'Operator') {
              row[header] = `Operator ${i + 1}`;
            } else if (header === 'DateTime' || header === 'Date') {
              const date = new Date();
              date.setDate(date.getDate() - i);
              row[header] = date.toISOString().split('T')[0];
            } else if (header === 'BatchSize') {
              row[header] = 50;
            } else if (header === 'Defectives') {
              row[header] = Math.floor(Math.random() * 5);
            } else if (header === 'ProductType') {
              row[header] = `Type ${['A', 'B', 'C'][i % 3]}`;
            } else if (header.includes('Inspector')) {
              row[header] = `Inspector ${i + 1}`;
            } else {
              row[header] = `Value ${i + 1}`;
            }
          });
          return row;
        });
        
        const simulatedFileData = {
          headers: simulatedHeaders,
          rows: simulatedRows
        };
        
        setFileData(simulatedFileData);
        setPreviewData(simulatedFileData);
        setDatasetName(selectedDataset.name);
        setDatasetDescription(selectedDataset.description);
        setFileType('example');
        setHasHeader(true);
        
        // Basic validation
        const validationResult = {
          isValid: true,
          errors: [],
          warnings: [],
          columnTypes: Object.fromEntries(
            simulatedHeaders.map(header => [
              header,
              header.includes('Measurement') || header.includes('BatchSize') || header.includes('Defectives')
                ? 'numeric'
                : 'categorical'
            ])
          )
        };
        
        setValidationResults(validationResult);
        setUploadStep(1);
      }
      
      setProcessingFile(false);
    }, 1000);
  };
  
  // Render
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Grid container spacing={3}>
        {uploadStep === 0 && (
          <>
            <Grid item xs={12}>
              <motion.div variants={itemVariants}>
                <Typography variant="h5" gutterBottom>
                  Upload Dataset
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  Upload a CSV, Excel, or JSON file containing your data for SQC analysis. 
                  The file should contain columns for measurements, sample groups, and other relevant information.
                </Typography>
              </motion.div>
            </Grid>
            
            <Grid item xs={12} md={7}>
              <motion.div variants={itemVariants}>
                <UploadArea
                  isDragActive={isDragActive}
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={handleUploadClick}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                    accept=".csv,.xlsx,.xls,.json,.txt"
                  />
                  
                  {processingFile ? (
                    <Box textAlign="center" p={3}>
                      <CircularProgress size={60} />
                      <Typography variant="h6" sx={{ mt: 2 }}>
                        Processing file...
                      </Typography>
                    </Box>
                  ) : (
                    <>
                      <CloudUpload sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                      <Typography variant="h6" gutterBottom>
                        Drag & Drop your data file here
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        or
                      </Typography>
                      <Button 
                        variant="contained" 
                        startIcon={<UploadFile />}
                        sx={{ mt: 1 }}
                      >
                        Browse Files
                      </Button>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
                        Supported formats: CSV, Excel, JSON
                      </Typography>
                    </>
                  )}
                </UploadArea>
              </motion.div>
            </Grid>
            
            <Grid item xs={12} md={5}>
              <motion.div variants={itemVariants}>
                <Typography variant="h6" gutterBottom>
                  Example Datasets
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Don't have your own data? Try one of our example datasets:
                </Typography>
                
                <Grid container spacing={2}>
                  {EXAMPLE_DATASETS.map((dataset) => (
                    <Grid item xs={12} key={dataset.id}>
                      <ExampleCard 
                        variant="outlined"
                        onClick={() => handleExampleDataset(dataset.id)}
                      >
                        <CardContent>
                          <Box display="flex" alignItems="flex-start">
                            <DataUsage sx={{ mr: 1, color: 'primary.main' }} />
                            <Box>
                              <Typography variant="subtitle1" component="div">
                                {dataset.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {dataset.description}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                {dataset.rows} rows • {dataset.columns.length} columns
                              </Typography>
                            </Box>
                          </Box>
                        </CardContent>
                      </ExampleCard>
                    </Grid>
                  ))}
                </Grid>
              </motion.div>
            </Grid>
          </>
        )}
        
        {uploadStep === 1 && previewData && (
          <>
            <Grid item xs={12}>
              <motion.div variants={itemVariants}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h5" gutterBottom>
                    Data Preview & Configuration
                  </Typography>
                  <Button 
                    variant="outlined" 
                    onClick={() => setUploadStep(0)}
                    startIcon={<UploadFile />}
                  >
                    Change File
                  </Button>
                </Box>
                <Typography variant="body1" color="text.secondary" paragraph>
                  Review your data and configure dataset settings before proceeding with the analysis.
                </Typography>
              </motion.div>
            </Grid>
            
            <Grid item xs={12} md={8}>
              <motion.div variants={itemVariants}>
                <Typography variant="h6" gutterBottom>
                  Data Preview
                </Typography>
                <DataPreviewGrid>
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        {previewData.headers.map((header, index) => (
                          <th key={index}>{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          <td>{rowIndex + 1}</td>
                          {previewData.headers.map((header, colIndex) => (
                            <td key={colIndex}>{row[header]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </DataPreviewGrid>
                
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Showing {previewData.rows.length} of {fileData.rows.length} rows
                </Typography>
              </motion.div>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <motion.div variants={itemVariants}>
                <Paper sx={{ p: 2, height: '100%' }}>
                  <Typography variant="h6" gutterBottom>
                    Dataset Configuration
                  </Typography>
                  
                  <TextField
                    label="Dataset Name"
                    value={datasetName}
                    onChange={(e) => setDatasetName(e.target.value)}
                    fullWidth
                    margin="normal"
                    required
                  />
                  
                  <TextField
                    label="Description"
                    value={datasetDescription}
                    onChange={(e) => setDatasetDescription(e.target.value)}
                    fullWidth
                    margin="normal"
                    multiline
                    rows={2}
                  />
                  
                  {fileType === 'csv' && (
                    <>
                      <TextField
                        select
                        label="Delimiter"
                        value={delimiter}
                        onChange={(e) => setDelimiter(e.target.value)}
                        fullWidth
                        margin="normal"
                      >
                        <MenuItem value=",">Comma (,)</MenuItem>
                        <MenuItem value=";">Semicolon (;)</MenuItem>
                        <MenuItem value="\t">Tab</MenuItem>
                        <MenuItem value="|">Pipe (|)</MenuItem>
                      </TextField>
                      
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={hasHeader}
                            onChange={(e) => setHasHeader(e.target.checked)}
                          />
                        }
                        label="First row contains headers"
                      />
                    </>
                  )}
                  
                  {/* Validation Results */}
                  {validationResults && (
                    <Box mt={2}>
                      {validationResults.isValid ? (
                        <Alert severity="success" icon={<Check />}>
                          Dataset is valid for SQC analysis
                        </Alert>
                      ) : (
                        <Alert severity="error">
                          Dataset validation failed
                        </Alert>
                      )}
                      
                      {validationResults.errors.length > 0 && (
                        <Box mt={1}>
                          {validationResults.errors.map((error, index) => (
                            <Alert severity="error" key={index} sx={{ mt: 1 }}>
                              {error}
                            </Alert>
                          ))}
                        </Box>
                      )}
                      
                      {validationResults.warnings.length > 0 && (
                        <Box mt={1}>
                          {validationResults.warnings.map((warning, index) => (
                            <Alert severity="warning" key={index} sx={{ mt: 1 }}>
                              {warning}
                            </Alert>
                          ))}
                        </Box>
                      )}
                    </Box>
                  )}
                  
                  <Box mt={3}>
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      disabled={!validationResults?.isValid || isLoading}
                      onClick={handleSubmitDataset}
                    >
                      {isLoading ? 'Uploading...' : 'Continue to Analysis'}
                    </Button>
                  </Box>
                </Paper>
              </motion.div>
            </Grid>
          </>
        )}
      </Grid>
    </motion.div>
  );
};

export default DataUploadStep;