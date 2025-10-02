import React, { useState } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  FormControl, 
  FormControlLabel, 
  Checkbox, 
  CircularProgress,
  Typography,
  Box,
  Alert
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';

import { createDistribution } from '../../api/probabilityDistributionsApi';

const SaveDistributionDialog = ({ 
  open, 
  onClose, 
  projectId, 
  distributionType, 
  parameters 
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [includeVisualizations, setIncludeVisualizations] = useState(true);
  const [saveParametersOnly, setSaveParametersOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  
  // Reset form on dialog open/close
  React.useEffect(() => {
    if (open) {
      // Generate a default name based on distribution type
      setName(`${distributionType.charAt(0).toUpperCase() + distributionType.slice(1).toLowerCase()} Distribution`);
      setDescription('');
      setIncludeVisualizations(true);
      setSaveParametersOnly(false);
      setError(null);
    }
  }, [open, distributionType]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Please provide a name for the distribution');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Create the distribution data object
      const distributionData = {
        project: projectId,
        distribution_type: distributionType,
        parameters,
        name,
        description,
        include_visualizations: includeVisualizations,
        save_parameters_only: saveParametersOnly
      };
      
      // Save the distribution
      const result = await createDistribution(distributionData);
      
      enqueueSnackbar('Distribution saved successfully', { variant: 'success' });
      
      // Close dialog and navigate to the saved distribution
      onClose();
      navigate(`/probability-distributions/${projectId}/${result.id}`);
    } catch (err) {
      console.error('Error saving distribution:', err);
      setError(err.response?.data?.detail || 'Failed to save distribution. Please try again.');
      enqueueSnackbar('Error saving distribution', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Save Distribution</DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Distribution Information
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Save your current distribution settings for future reference or sharing.
            </Typography>
          </Box>
          
          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
            margin="normal"
            variant="outlined"
            disabled={loading}
            helperText="Give your distribution a descriptive name"
          />
          
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={3}
            margin="normal"
            variant="outlined"
            disabled={loading}
            helperText="Optional: Add details about this distribution and its purpose"
          />
          
          <Box sx={{ mt: 2 }}>
            <FormControl component="fieldset">
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={includeVisualizations} 
                    onChange={(e) => setIncludeVisualizations(e.target.checked)}
                    disabled={loading}
                  />
                }
                label="Include current visualizations"
              />
              
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={saveParametersOnly} 
                    onChange={(e) => setSaveParametersOnly(e.target.checked)}
                    disabled={loading}
                  />
                }
                label="Save parameters only (no calculations)"
              />
            </FormControl>
          </Box>
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              The distribution will be saved to your current project.
            </Typography>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button 
            onClick={onClose} 
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary"
            disabled={loading}
            startIcon={loading && <CircularProgress size={20} />}
          >
            {loading ? 'Saving...' : 'Save Distribution'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default SaveDistributionDialog;