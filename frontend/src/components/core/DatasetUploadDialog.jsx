import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Box, Typography, LinearProgress, Alert, AlertTitle,
  FormControlLabel, Checkbox, Grid
} from '@mui/material';
import { CloudUpload as UploadIcon } from '@mui/icons-material';
import { uploadDataset } from '../../api/datasetApi';

const DatasetUploadDialog = ({ open, onClose }) => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [validate, setValidate] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [validationResults, setValidationResults] = useState(null);
  
  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
      // Use filename as default dataset name (without extension)
      const baseName = selectedFile.name.split('.').slice(0, -1).join('.');
      setName(baseName || selectedFile.name);
    }
  };
  
  const handleDrop = (event) => {
    event.preventDefault();
    
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const droppedFile = event.dataTransfer.files[0];
      setFile(droppedFile);
      setFileName(droppedFile.name);
      // Use filename as default dataset name (without extension)
      const baseName = droppedFile.name.split('.').slice(0, -1).join('.');
      setName(baseName || droppedFile.name);
    }
  };
  
  const handleDragOver = (event) => {
    event.preventDefault();
  };
  
  const handleSubmit = async () => {
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }
    
    if (!name.trim()) {
      setError('Please provide a name for the dataset.');
      return;
    }
    
    setUploading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    
    if (description.trim()) {
      formData.append('description', description);
    }
    
    formData.append('validate', validate ? 'true' : 'false');
    
    try {
      const result = await uploadDataset(formData);
      
      // Check if validation was performed and results are available
      if (result.validation) {
        setValidationResults(result.validation);
        
        // If validation failed, show results but don't close dialog yet
        if (!result.validation.is_valid) {
          setUploading(false);
          return;
        }
      }
      
      // Success - close dialog
      onClose(true);
    } catch (err) {
      console.error('Error uploading dataset:', err);
      setError(err.response?.data?.error || 'Failed to upload dataset. Please try again.');
    } finally {
      setUploading(false);
    }
  };
  
  const handleDialogClose = () => {
    // Reset state
    setFile(null);
    setFileName('');
    setName('');
    setDescription('');
    setValidate(true);
    setError(null);
    setValidationResults(null);
    setUploading(false);
    
    onClose(false);
  };
  
  const isCSVOrExcel = file && (
    file.name.endsWith('.csv') || 
    file.name.endsWith('.xls') || 
    file.name.endsWith('.xlsx')
  );
  
  return (
    <Dialog open={open} onClose={handleDialogClose} fullWidth maxWidth="md">
      <DialogTitle>Upload Dataset</DialogTitle>
      <DialogContent>
        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {/* Validation Results */}
        {validationResults && !validationResults.is_valid && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <AlertTitle>Validation Issues</AlertTitle>
            <Typography variant="body2" gutterBottom>
              The dataset was uploaded but has some validation issues:
            </Typography>
            <ul style={{ margin: 0, paddingLeft: '1.5em' }}>
              {validationResults.validation_messages
                .filter(msg => msg.level === 'error' || msg.level === 'warning')
                .map((msg, idx) => (
                  <li key={idx}>
                    <Typography variant="body2">
                      {msg.message}
                    </Typography>
                  </li>
                ))
              }
            </ul>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2">
                You can still use this dataset, but some analyses may not work as expected.
              </Typography>
            </Box>
          </Alert>
        )}
        
        {!uploading ? (
          <>
            {/* File Upload Area */}
            <Box
              sx={{
                border: '2px dashed #ccc',
                borderRadius: 2,
                p: 3,
                mb: 3,
                textAlign: 'center',
                bgcolor: '#f8f9fa',
                cursor: 'pointer'
              }}
              onClick={() => document.getElementById('file-upload').click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <input
                type="file"
                id="file-upload"
                accept=".csv,.xls,.xlsx"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <UploadIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                Drag & Drop or Click to Upload
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Supported formats: CSV, Excel (.xls, .xlsx)
              </Typography>
              {fileName && (
                <Box
                  sx={{
                    mt: 2,
                    p: 1,
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                    display: 'inline-block'
                  }}
                >
                  <Typography variant="body2" color="primary">
                    {fileName}
                  </Typography>
                </Box>
              )}
              
              {file && !isCSVOrExcel && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  Unsupported file format. Please upload a CSV or Excel file.
                </Alert>
              )}
            </Box>
            
            {/* Form Fields */}
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Dataset Name"
                  variant="outlined"
                  fullWidth
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!file}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Description (Optional)"
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!file}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={validate}
                      onChange={(e) => setValidate(e.target.checked)}
                      disabled={!file}
                    />
                  }
                  label="Validate dataset after upload"
                />
              </Grid>
            </Grid>
          </>
        ) : (
          // Uploading Progress
          <Box sx={{ my: 3 }}>
            <Typography variant="body1" gutterBottom>
              Uploading and processing dataset...
            </Typography>
            <LinearProgress sx={{ mt: 1 }} />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDialogClose} disabled={uploading}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={!file || !isCSVOrExcel || !name.trim() || uploading}
          startIcon={<UploadIcon />}
        >
          Upload
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DatasetUploadDialog;