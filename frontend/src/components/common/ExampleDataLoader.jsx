/**
 * Example Data Loader Component
 * ==============================
 * Reusable component for loading example datasets into calculators
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Typography,
  Chip,
  Alert,
  IconButton,
  Tooltip,
  Divider,
  Card,
  CardContent,
  Grid
} from '@mui/material';

import {
  Science as ScienceIcon,
  School as SchoolIcon,
  Business as BusinessIcon,
  LocalHospital as MedicalIcon,
  Agriculture as AgricultureIcon,
  Psychology as PsychologyIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  Category as CategoryIcon,
  DataUsage as DataIcon,
  Close as CloseIcon,
  Info as InfoIcon
} from '@mui/icons-material';

import { getAvailableDatasets, getExampleData } from '../../data/ExampleDatasets';

const ExampleDataLoader = ({
  testType,
  subType,
  onLoadData,
  buttonText = "Load Example Data",
  buttonVariant = "outlined",
  buttonSize = "medium",
  showIcon = true,
  disabled = false
}) => {
  const [open, setOpen] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [previewData, setPreviewData] = useState(null);

  const datasets = getAvailableDatasets(testType, subType);

  const handleOpen = () => {
    setOpen(true);
    setSelectedDataset(null);
    setPreviewData(null);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedDataset(null);
    setPreviewData(null);
  };

  const handleSelectDataset = (datasetKey) => {
    setSelectedDataset(datasetKey);
    const data = getExampleData(testType, subType, datasetKey);
    setPreviewData(data);
  };

  const handleLoadData = () => {
    if (previewData && onLoadData) {
      onLoadData(previewData);
      handleClose();
    }
  };

  const getIcon = (datasetKey) => {
    // Return appropriate icon based on dataset context
    if (datasetKey.includes('medical') || datasetKey.includes('drug') || datasetKey.includes('blood')) {
      return <MedicalIcon />;
    }
    if (datasetKey.includes('teaching') || datasetKey.includes('education') || datasetKey.includes('study')) {
      return <SchoolIcon />;
    }
    if (datasetKey.includes('business') || datasetKey.includes('sales') || datasetKey.includes('wage')) {
      return <BusinessIcon />;
    }
    if (datasetKey.includes('agriculture') || datasetKey.includes('fertilizer')) {
      return <AgricultureIcon />;
    }
    if (datasetKey.includes('psychology') || datasetKey.includes('cognitive')) {
      return <PsychologyIcon />;
    }
    return <ScienceIcon />;
  };

  const getContextColor = (context) => {
    if (context.includes('Medical') || context.includes('Clinical')) return 'error';
    if (context.includes('Education') || context.includes('Academic')) return 'info';
    if (context.includes('Business') || context.includes('Marketing')) return 'success';
    if (context.includes('Research')) return 'primary';
    return 'default';
  };

  return (
    <>
      <Button
        variant={buttonVariant}
        size={buttonSize}
        onClick={handleOpen}
        disabled={disabled || datasets.length === 0}
        startIcon={showIcon ? <DataIcon /> : null}
      >
        {buttonText}
      </Button>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">
              Select Example Dataset
            </Typography>
            <IconButton onClick={handleClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <Grid container spacing={2}>
            {/* Dataset List */}
            <Grid item xs={12} md={5}>
              <Typography variant="subtitle2" gutterBottom color="text.secondary">
                Available Datasets
              </Typography>
              <List sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
                {datasets.map((dataset) => (
                  <ListItemButton
                    key={dataset.key}
                    selected={selectedDataset === dataset.key}
                    onClick={() => handleSelectDataset(dataset.key)}
                    sx={{ borderRadius: 1, mb: 0.5 }}
                  >
                    <ListItemIcon>
                      {getIcon(dataset.key)}
                    </ListItemIcon>
                    <ListItemText
                      primary={dataset.name}
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {dataset.description?.substring(0, 50)}...
                        </Typography>
                      }
                    />
                  </ListItemButton>
                ))}
              </List>
            </Grid>

            {/* Dataset Preview */}
            <Grid item xs={12} md={7}>
              {previewData ? (
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {previewData.name}
                    </Typography>

                    <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        {previewData.description}
                      </Typography>
                    </Alert>

                    <Box sx={{ mb: 2 }}>
                      <Chip
                        label={previewData.context}
                        color={getContextColor(previewData.context)}
                        size="small"
                        sx={{ mr: 1 }}
                      />
                      <Chip
                        label={`n = ${previewData.data?.length ||
                          (previewData.groups ? previewData.groups[0].data.length :
                          (previewData.x ? previewData.x.length : 'varies'))}`}
                        variant="outlined"
                        size="small"
                      />
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* Data Preview */}
                    <Typography variant="subtitle2" gutterBottom>
                      Data Preview:
                    </Typography>

                    <Box
                      sx={{
                        bgcolor: 'grey.50',
                        p: 1.5,
                        borderRadius: 1,
                        maxHeight: 150,
                        overflow: 'auto',
                        fontFamily: 'monospace',
                        fontSize: '0.85rem'
                      }}
                    >
                      {previewData.dataString && (
                        <Box>
                          <strong>Data:</strong> {previewData.dataString.substring(0, 100)}...
                        </Box>
                      )}
                      {previewData.groups && previewData.groups.map((group, idx) => (
                        <Box key={idx} sx={{ mt: 1 }}>
                          <strong>{group.name}:</strong> {group.data.slice(0, 5).join(', ')}...
                        </Box>
                      ))}
                      {previewData.x && previewData.y && (
                        <>
                          <Box>
                            <strong>{previewData.xLabel || 'X'}:</strong> {previewData.x.slice(0, 5).join(', ')}...
                          </Box>
                          <Box sx={{ mt: 1 }}>
                            <strong>{previewData.yLabel || 'Y'}:</strong> {previewData.y.slice(0, 5).join(', ')}...
                          </Box>
                        </>
                      )}
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* Expected Outcome */}
                    <Alert severity="success" variant="outlined">
                      <Typography variant="subtitle2" gutterBottom>
                        Expected Analysis Outcome:
                      </Typography>
                      <Typography variant="body2">
                        {previewData.expectedOutcome}
                      </Typography>
                    </Alert>

                    {/* Additional metadata */}
                    {previewData.hypothesizedMean && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          Hypothesized Mean: {previewData.hypothesizedMean}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Box
                  sx={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'grey.50',
                    borderRadius: 1,
                    p: 3
                  }}
                >
                  <Typography variant="body2" color="text.secondary" align="center">
                    <AssessmentIcon sx={{ fontSize: 48, mb: 2, opacity: 0.3 }} />
                    <br />
                    Select a dataset from the list to preview
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="caption">
              <strong>Note:</strong> These datasets are designed for demonstration and educational purposes.
              They represent realistic scenarios commonly encountered in research and industry.
            </Typography>
          </Alert>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleLoadData}
            variant="contained"
            disabled={!selectedDataset}
            startIcon={<DataIcon />}
          >
            Load Selected Dataset
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ExampleDataLoader;