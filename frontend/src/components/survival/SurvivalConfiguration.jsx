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
  Chip,
  Alert
} from '@mui/material';

function SurvivalConfiguration({ dataset, configuration, onChange, onRunAnalysis, isRunning }) {
  const [localConfig, setLocalConfig] = useState(configuration);

  const handleChange = (field, value) => {
    const newConfig = { ...localConfig, [field]: value };
    setLocalConfig(newConfig);
    onChange(newConfig);
  };

  const isValid = () => {
    return localConfig.durationCol && localConfig.eventCol;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Configure Survival Analysis
      </Typography>

      <Typography variant="body2" color="text.secondary" paragraph>
        Select your analysis type and configure the required parameters.
      </Typography>

      <Grid container spacing={3}>
        {/* Analysis Type */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Analysis Type</InputLabel>
            <Select
              value={localConfig.analysisType}
              onChange={(e) => handleChange('analysisType', e.target.value)}
              label="Analysis Type"
            >
              <MenuItem value="kaplan-meier">Kaplan-Meier Estimation</MenuItem>
              <MenuItem value="cox-regression">Cox Proportional Hazards</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* Confidence Level */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Confidence Level"
            type="number"
            value={localConfig.confidenceLevel}
            onChange={(e) => handleChange('confidenceLevel', parseFloat(e.target.value))}
            inputProps={{ min: 0.5, max: 0.99, step: 0.01 }}
          />
        </Grid>

        {/* Duration Column */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth required>
            <InputLabel>Duration Column</InputLabel>
            <Select
              value={localConfig.durationCol}
              onChange={(e) => handleChange('durationCol', e.target.value)}
              label="Duration Column"
            >
              {dataset?.columns?.map((col) => (
                <MenuItem key={col} value={col}>
                  {col}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Event Column */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth required>
            <InputLabel>Event Column</InputLabel>
            <Select
              value={localConfig.eventCol}
              onChange={(e) => handleChange('eventCol', e.target.value)}
              label="Event Column"
            >
              {dataset?.columns?.map((col) => (
                <MenuItem key={col} value={col}>
                  {col}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Group Column (Kaplan-Meier only) */}
        {localConfig.analysisType === 'kaplan-meier' && (
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Group Column (Optional)</InputLabel>
              <Select
                value={localConfig.groupCol}
                onChange={(e) => handleChange('groupCol', e.target.value)}
                label="Group Column (Optional)"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {dataset?.columns?.map((col) => (
                  <MenuItem key={col} value={col}>
                    {col}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        )}
      </Grid>

      {!isValid() && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          Please select both Duration and Event columns to proceed.
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <Button
          variant="contained"
          size="large"
          onClick={onRunAnalysis}
          disabled={!isValid() || isRunning}
        >
          {isRunning ? 'Running Analysis...' : 'Run Survival Analysis'}
        </Button>
      </Box>
    </Box>
  );
}

export default SurvivalConfiguration;
