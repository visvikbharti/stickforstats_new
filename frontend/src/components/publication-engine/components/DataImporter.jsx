/**
 * DataImporter - CSV upload + column mapping for Publication Engine
 */

import React, { useCallback, useState } from 'react';
import {
  Box, Typography, Button, Paper, FormControl, InputLabel, Select, MenuItem,
  Alert, Chip, IconButton, useTheme
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  TableChart as TableIcon,
} from '@mui/icons-material';
import Papa from 'papaparse';
import { usePlotConfig } from '../context/PlotConfigContext';

const DataImporter = () => {
  const theme = useTheme();
  const { state, dispatch, setData, setDataMapping } = usePlotConfig();
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState(null);

  // Auto-set axis labels and title when columns change
  const handleMappingChange = useCallback((mapping) => {
    setDataMapping(mapping);
    // Auto-populate axis labels from column names
    if (mapping.x) {
      dispatch({ type: 'SET_X_AXIS', payload: { label: mapping.x } });
    }
    if (mapping.y) {
      dispatch({ type: 'SET_Y_AXIS', payload: { label: mapping.y } });
    }
    // Auto-generate title
    const xName = mapping.x || state.dataMapping.x;
    const yName = mapping.y || state.dataMapping.y;
    if (xName && yName) {
      dispatch({ type: 'SET_TITLE', payload: { text: `${yName} by ${xName}` } });
    }
  }, [setDataMapping, dispatch, state.dataMapping]);

  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    setError(null);
    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(`Parse error: ${results.errors[0].message}`);
          return;
        }
        if (!results.data || results.data.length === 0) {
          setError('No data found in file');
          return;
        }
        const columns = Object.keys(results.data[0]);
        setData(results.data, columns);
      },
      error: (err) => {
        setError(`Failed to read file: ${err.message}`);
      },
    });
  }, [setData]);

  const handleClear = useCallback(() => {
    setData(null, []);
    setDataMapping({ x: null, y: null, group: null, error: null, paired: null });
    setFileName(null);
    setError(null);
  }, [setData, setDataMapping]);

  const numericColumns = state.columns.filter(col => {
    if (!state.data || state.data.length === 0) return false;
    return typeof state.data[0][col] === 'number';
  });

  const categoricalColumns = state.columns.filter(col => {
    if (!state.data || state.data.length === 0) return false;
    return typeof state.data[0][col] !== 'number';
  });

  const isDarkMode = theme.palette.mode === 'dark';

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        bgcolor: isDarkMode ? 'background.paper' : '#f8f9fa',
        borderRadius: 2,
      }}
    >
      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
        Data
      </Typography>

      {!state.data ? (
        <Box>
          <Button
            component="label"
            variant="outlined"
            startIcon={<UploadIcon />}
            fullWidth
            sx={{ mb: 1 }}
          >
            Upload CSV
            <input
              type="file"
              accept=".csv,.tsv,.txt"
              hidden
              onChange={handleFileUpload}
            />
          </Button>
          {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
        </Box>
      ) : (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
            <TableIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
            <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }} noWrap>
              {fileName}
            </Typography>
            <Chip label={`${state.data.length} rows`} size="small" sx={{ mr: 0.5 }} />
            <IconButton size="small" onClick={handleClear}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Column Mapping */}
          <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
            <InputLabel>X Axis / Category</InputLabel>
            <Select
              value={state.dataMapping.x || ''}
              label="X Axis / Category"
              onChange={(e) => handleMappingChange({ x: e.target.value })}
            >
              {state.columns.map(col => (
                <MenuItem key={col} value={col}>{col}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
            <InputLabel>Y Axis / Value</InputLabel>
            <Select
              value={state.dataMapping.y || ''}
              label="Y Axis / Value"
              onChange={(e) => handleMappingChange({ y: e.target.value })}
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {numericColumns.map(col => (
                <MenuItem key={col} value={col}>{col}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
            <InputLabel>Group / Color</InputLabel>
            <Select
              value={state.dataMapping.group || ''}
              label="Group / Color"
              onChange={(e) => setDataMapping({ group: e.target.value || null })}
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {categoricalColumns.map(col => (
                <MenuItem key={col} value={col}>{col}</MenuItem>
              ))}
              {numericColumns.map(col => (
                <MenuItem key={col} value={col}>{col}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Error Column</InputLabel>
            <Select
              value={state.dataMapping.error || ''}
              label="Error Column"
              onChange={(e) => setDataMapping({ error: e.target.value || null })}
            >
              <MenuItem value=""><em>None (auto-compute)</em></MenuItem>
              {numericColumns.map(col => (
                <MenuItem key={col} value={col}>{col}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}
    </Paper>
  );
};

export default DataImporter;
