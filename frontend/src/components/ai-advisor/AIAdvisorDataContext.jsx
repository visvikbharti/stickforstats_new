/**
 * AI Advisor Data Context Panel
 *
 * Shows the current data context being used by the AI advisor.
 * Displays:
 * - Dataset summary
 * - Variable types
 * - Basic statistics
 * - Guardian assumption results
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Collapse,
  Alert,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  DataObject as DataIcon,
  Functions as FunctionsIcon,
  Category as CategoryIcon,
} from '@mui/icons-material';

/**
 * Get icon for variable type
 */
const getVariableTypeIcon = (type) => {
  switch (type?.toLowerCase()) {
    case 'numeric':
    case 'continuous':
    case 'integer':
      return <FunctionsIcon sx={{ fontSize: 16 }} />;
    case 'categorical':
    case 'nominal':
    case 'factor':
      return <CategoryIcon sx={{ fontSize: 16 }} />;
    default:
      return <DataIcon sx={{ fontSize: 16 }} />;
  }
};

/**
 * Get color for assumption status
 */
const getAssumptionColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'met':
    case 'pass':
    case 'ok':
      return 'success';
    case 'warning':
    case 'marginal':
      return 'warning';
    case 'violated':
    case 'fail':
      return 'error';
    default:
      return 'default';
  }
};

/**
 * Get icon for assumption status
 */
const getAssumptionIcon = (status) => {
  switch (status?.toLowerCase()) {
    case 'met':
    case 'pass':
    case 'ok':
      return <CheckIcon sx={{ fontSize: 16, color: '#4caf50' }} />;
    case 'warning':
    case 'marginal':
      return <WarningIcon sx={{ fontSize: 16, color: '#ff9800' }} />;
    case 'violated':
    case 'fail':
      return <ErrorIcon sx={{ fontSize: 16, color: '#f44336' }} />;
    default:
      return null;
  }
};

const AIAdvisorDataContext = ({
  dataContext,
  onClose,
}) => {
  if (!dataContext) {
    return (
      <Box sx={{ p: 2, bgcolor: '#fff3e0' }}>
        <Alert severity="info" sx={{ mb: 0 }}>
          No data loaded. Upload a dataset to get personalized recommendations.
        </Alert>
      </Box>
    );
  }

  const {
    datasetName,
    rows,
    columns,
    variables = [],
    assumptions = [],
    summary = {},
  } = dataContext;

  return (
    <Box sx={{ bgcolor: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1,
          bgcolor: '#e3f2fd',
        }}
      >
        <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DataIcon sx={{ fontSize: 18 }} />
          Data Context
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      <Box sx={{ p: 2 }}>
        {/* Dataset Info */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight={600}>
            {datasetName || 'Unnamed Dataset'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {rows?.toLocaleString() || 0} rows
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {columns || variables.length} columns
            </Typography>
          </Box>
        </Box>

        {/* Variables */}
        {variables.length > 0 && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Variables:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
              {variables.slice(0, 8).map((variable, index) => (
                <Chip
                  key={index}
                  icon={getVariableTypeIcon(variable.type)}
                  label={variable.name}
                  size="small"
                  sx={{
                    bgcolor: 'white',
                    fontSize: '0.7rem',
                  }}
                />
              ))}
              {variables.length > 8 && (
                <Chip
                  label={`+${variables.length - 8} more`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
              )}
            </Box>
          </>
        )}

        {/* Assumption Checks */}
        {assumptions.length > 0 && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Guardian Checks:
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {assumptions.map((assumption, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 0.5,
                    bgcolor: 'white',
                    borderRadius: 1,
                    fontSize: '0.75rem',
                  }}
                >
                  {getAssumptionIcon(assumption.status)}
                  <Typography variant="caption" sx={{ flex: 1 }}>
                    {assumption.name}
                  </Typography>
                  <Chip
                    label={assumption.status}
                    size="small"
                    color={getAssumptionColor(assumption.status)}
                    sx={{ fontSize: '0.65rem', height: 20 }}
                  />
                </Box>
              ))}
            </Box>
          </>
        )}

        {/* Quick Summary */}
        {summary && Object.keys(summary).length > 0 && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Quick Summary:
            </Typography>
            <Box sx={{ bgcolor: 'white', p: 1, borderRadius: 1 }}>
              <Typography variant="caption" component="pre" sx={{ margin: 0, fontSize: '0.7rem' }}>
                {JSON.stringify(summary, null, 2).slice(0, 200)}
                {JSON.stringify(summary).length > 200 ? '...' : ''}
              </Typography>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};

export default AIAdvisorDataContext;
