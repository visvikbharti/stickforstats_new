import React, { useState } from 'react';
import { 
  Typography, 
  Button, 
  Box, 
  Paper, 
  Grid,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert
} from '@mui/material';
import { CloudUpload as UploadIcon } from '@mui/icons-material';

const dataTypes = [
  { value: 'csv', label: 'CSV File' },
  { value: 'excel', label: 'Excel File' },
  { value: 'json', label: 'JSON File' },
  { value: 'text', label: 'Text File' }
];

function DataUploadPage() {
  const [file, setFile] = useState(null);
  const [dataType, setDataType] = useState('csv');
  const [datasetName, setDatasetName] = useState('');
  const [description, setDescription] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
    setSuccess(false);
    setError('');
  };

  const handleDataTypeChange = (event) => {
    setDataType(event.target.value);
  };

  const handleNameChange = (event) => {
    setDatasetName(event.target.value);
  };

  const handleDescriptionChange = (event) => {
    setDescription(event.target.value);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    
    // Validation
    if (!file) {
      setError('Please select a file to upload');
      return;
    }
    
    if (!datasetName.trim()) {
      setError('Please enter a dataset name');
      return;
    }

    // In a real application, we would use FormData to upload the file
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', datasetName);
    formData.append('description', description);
    formData.append('file_type', dataType);

    // For this mock example, we'll just simulate a successful upload
    setTimeout(() => {
      console.log('Uploading file:', file.name);
      console.log('Dataset name:', datasetName);
      console.log('Description:', description);
      console.log('Data type:', dataType);
      
      setSuccess(true);
      setError('');
      // Reset form
      setFile(null);
      setDatasetName('');
      setDescription('');
      setDataType('csv');
      
      // Reset the file input
      document.getElementById('file-upload').value = '';
    }, 1000);
  };

  return (
    <div>
      <Typography variant="h5" gutterBottom>
        Data Upload
      </Typography>
      <Typography variant="body1" paragraph>
        Upload your dataset files for statistical analysis.
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          File uploaded successfully!
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.paper' }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box 
                sx={{ 
                  border: '2px dashed #ccc', 
                  borderRadius: 2, 
                  p: 3, 
                  textAlign: 'center' 
                }}
              >
                <input
                  type="file"
                  id="file-upload"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <label htmlFor="file-upload">
                  <Button 
                    variant="contained" 
                    component="span"
                    startIcon={<UploadIcon />}
                  >
                    Choose File
                  </Button>
                </label>
                <Typography variant="body2" sx={{ mt: 2 }}>
                  {file ? `Selected file: ${file.name}` : 'No file selected'}
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Dataset Name"
                value={datasetName}
                onChange={handleNameChange}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Data Type</InputLabel>
                <Select
                  value={dataType}
                  label="Data Type"
                  onChange={handleDataTypeChange}
                >
                  {dataTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={description}
                onChange={handleDescriptionChange}
              />
            </Grid>

            <Grid item xs={12}>
              <Button 
                type="submit" 
                variant="contained" 
                color="primary"
                disabled={!file}
              >
                Upload Dataset
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Supported Formats
        </Typography>
        <Typography variant="body2" component="ul">
          <li>CSV (Comma Separated Values)</li>
          <li>Excel (.xlsx, .xls)</li>
          <li>JSON (JavaScript Object Notation)</li>
          <li>Plain Text (with delimiters)</li>
        </Typography>
      </Box>
    </div>
  );
}

export default DataUploadPage;