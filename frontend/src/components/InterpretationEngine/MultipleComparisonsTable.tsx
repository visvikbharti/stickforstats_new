/**
 * MultipleComparisonsTable Component
 * 
 * Displays multiple comparisons results in a table format.
 * 
 * @timestamp 2025-08-06 22:48:00 UTC
 */

import React from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Box,
} from '@mui/material';

import { MultipleComparisonsProps } from './InterpretationEngine.types';

const MultipleComparisonsTable: React.FC<MultipleComparisonsProps> = ({
  comparisons,
  showAdjusted = true,
  highlightSignificant = true,
  sortBy = 'pValue',
}) => {
  if (!comparisons) return null;

  const sortedComparisons = [...comparisons.comparisons].sort((a, b) => {
    switch (sortBy) {
      case 'pValue':
        return a.adjustedPValue - b.adjustedPValue;
      case 'meanDifference':
        return Math.abs(b.meanDifference) - Math.abs(a.meanDifference);
      case 'groups':
        return a.group1.localeCompare(b.group1);
      default:
        return 0;
    }
  });

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Multiple Comparisons ({comparisons.method})
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Adjusted alpha level: {comparisons.adjustedAlpha.toFixed(4)}
      </Typography>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Comparison</TableCell>
              <TableCell align="right">Mean Difference</TableCell>
              <TableCell align="right">SE</TableCell>
              <TableCell align="right">p-value</TableCell>
              {showAdjusted && (
                <TableCell align="right">Adjusted p</TableCell>
              )}
              <TableCell align="center">Significant</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedComparisons.map((comp, idx) => (
              <TableRow
                key={idx}
                sx={{
                  bgcolor: highlightSignificant && comp.significant ? 'action.hover' : 'inherit',
                }}
              >
                <TableCell>
                  {comp.group1} vs {comp.group2}
                </TableCell>
                <TableCell align="right">
                  {comp.meanDifference.toFixed(3)}
                </TableCell>
                <TableCell align="right">
                  {comp.standardError.toFixed(3)}
                </TableCell>
                <TableCell align="right">
                  {comp.pValue.toFixed(4)}
                </TableCell>
                {showAdjusted && (
                  <TableCell align="right">
                    {comp.adjustedPValue.toFixed(4)}
                  </TableCell>
                )}
                <TableCell align="center">
                  {comp.significant ? (
                    <Chip label="Yes" color="success" size="small" />
                  ) : (
                    <Chip label="No" variant="outlined" size="small" />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      <Box sx={{ mt: 2 }}>
        <Typography variant="caption" color="text.secondary">
          {comparisons.comparisons.filter(c => c.significant).length} of {comparisons.comparisons.length} comparisons 
          are statistically significant after {comparisons.method} correction.
        </Typography>
      </Box>
    </Paper>
  );
};

export default MultipleComparisonsTable;