import React, { useState } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Paper,
  Grid,
  Alert
} from '@mui/material';

function FactorConfiguration({ dataset, adequacyResults, configuration, onChange, onRunAnalysis, isRunning }) {
  const [localConfig, setLocalConfig] = useState(configuration);

  const handleChange = (field, value) => {
    const newConfig = { ...localConfig, [field]: value };
    setLocalConfig(newConfig);
    onChange(newConfig);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Configure Factor Analysis
      </Typography>

      <Typography variant="body2" color="text.secondary" paragraph>
        Select extraction method, rotation, and number of factors.
      </Typography>

      <Grid container spacing={3}>
        {/* Number of Factors */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Number of Factors (leave empty for auto)"
            type="number"
            value={localConfig.nFactors || ''}
            onChange={(e) => handleChange('nFactors', e.target.value ? parseInt(e.target.value) : null)}
            helperText="Auto-determined using parallel analysis if not specified"
            inputProps={{ min: 1, max: dataset?.columns?.length || 10 }}
          />
        </Grid>

        {/* Extraction Method */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Extraction Method</InputLabel>
            <Select
              value={localConfig.method}
              onChange={(e) => handleChange('method', e.target.value)}
              label="Extraction Method"
            >
              <MenuItem value="minres">Minimum Residual (minres)</MenuItem>
              <MenuItem value="ml">Maximum Likelihood (ml)</MenuItem>
              <MenuItem value="principal">Principal Factor</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* Rotation Method */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Rotation Method</InputLabel>
            <Select
              value={localConfig.rotation}
              onChange={(e) => handleChange('rotation', e.target.value)}
              label="Rotation Method"
            >
              <MenuItem value="varimax">Varimax (Orthogonal)</MenuItem>
              <MenuItem value="promax">Promax (Oblique)</MenuItem>
              <MenuItem value="oblimin">Oblimin (Oblique)</MenuItem>
              <MenuItem value="quartimax">Quartimax (Orthogonal)</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {adequacyResults?.adequacy_status === 'poor' && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          Warning: Your data adequacy tests suggest factor analysis may not be appropriate.
          Results should be interpreted with caution.
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <Button
          variant="contained"
          size="large"
          onClick={onRunAnalysis}
          disabled={isRunning}
        >
          {isRunning ? 'Running Analysis...' : 'Run Factor Analysis'}
        </Button>
      </Box>
    </Box>
  );
}

export default FactorConfiguration;
