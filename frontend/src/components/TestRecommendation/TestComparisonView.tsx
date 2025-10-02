/**
 * TestComparisonView Component
 * 
 * Side-by-side comparison of statistical tests.
 * 
 * @timestamp 2025-08-06 22:28:00 UTC
 */

import React from 'react';
import {
  Box,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  Button,
} from '@mui/material';
import {
  CompareArrows as CompareIcon,
  CheckCircle as BetterIcon,
  Cancel as WorseIcon,
  Remove as SameIcon,
} from '@mui/icons-material';

import { TestComparisonViewProps, TestRecommendation } from './TestRecommendation.types';

const TestComparisonView: React.FC<TestComparisonViewProps> = ({
  tests,
  maxCompare = 2,
  onClose,
}) => {
  if (tests.length !== 2) {
    return (
      <Alert severity="error">
        Please select exactly 2 tests to compare.
      </Alert>
    );
  }

  const [test1, test2] = tests;

  // Comparison criteria
  const comparisons = [
    {
      aspect: 'Confidence Score',
      test1Value: `${(test1.confidenceScore * 100).toFixed(0)}%`,
      test2Value: `${(test2.confidenceScore * 100).toFixed(0)}%`,
      winner: test1.confidenceScore > test2.confidenceScore ? 1 : 
              test2.confidenceScore > test1.confidenceScore ? 2 : 0,
    },
    {
      aspect: 'Assumptions Met',
      test1Value: `${test1.assumptionsSummary.met}/${test1.assumptionsSummary.total}`,
      test2Value: `${test2.assumptionsSummary.met}/${test2.assumptionsSummary.total}`,
      winner: (test1.assumptionsSummary.met / test1.assumptionsSummary.total) > 
              (test2.assumptionsSummary.met / test2.assumptionsSummary.total) ? 1 : 
              (test2.assumptionsSummary.met / test2.assumptionsSummary.total) > 
              (test1.assumptionsSummary.met / test1.assumptionsSummary.total) ? 2 : 0,
    },
    {
      aspect: 'Complexity',
      test1Value: test1.complexity,
      test2Value: test2.complexity,
      winner: 0, // No clear winner for complexity
    },
    {
      aspect: 'Sample Size Required',
      test1Value: `${test1.sampleSize.minimum}`,
      test2Value: `${test2.sampleSize.minimum}`,
      winner: test1.sampleSize.minimum < test2.sampleSize.minimum ? 1 : 
              test2.sampleSize.minimum < test1.sampleSize.minimum ? 2 : 0,
    },
    {
      aspect: 'Parametric',
      test1Value: test1.parametric ? 'Yes' : 'No',
      test2Value: test2.parametric ? 'Yes' : 'No',
      winner: 0,
    },
    {
      aspect: 'Robust',
      test1Value: test1.robust ? 'Yes' : 'No',
      test2Value: test2.robust ? 'Yes' : 'No',
      winner: test1.robust && !test2.robust ? 1 : 
              test2.robust && !test1.robust ? 2 : 0,
    },
  ];

  // Calculate overall recommendation
  const test1Wins = comparisons.filter(c => c.winner === 1).length;
  const test2Wins = comparisons.filter(c => c.winner === 2).length;
  const overallWinner = test1Wins > test2Wins ? test1 : 
                        test2Wins > test1Wins ? test2 : null;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <CompareIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
        <Typography variant="h5" gutterBottom>
          Test Comparison
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Detailed comparison to help you choose the most appropriate test
        </Typography>
      </Box>

      {/* Test Names */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, bgcolor: test1Wins > test2Wins ? 'success.light' : 'background.paper' }}>
            <Typography variant="h6" gutterBottom>
              {test1.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {test1.fullName}
            </Typography>
            <Box sx={{ mt: 1 }}>
              <Chip label={test1.category} size="small" />
              <Chip label={test1.complexity} size="small" sx={{ ml: 1 }} />
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, bgcolor: test2Wins > test1Wins ? 'success.light' : 'background.paper' }}>
            <Typography variant="h6" gutterBottom>
              {test2.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {test2.fullName}
            </Typography>
            <Box sx={{ mt: 1 }}>
              <Chip label={test2.category} size="small" />
              <Chip label={test2.complexity} size="small" sx={{ ml: 1 }} />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Comparison Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Aspect</TableCell>
              <TableCell align="center">{test1.name}</TableCell>
              <TableCell align="center">{test2.name}</TableCell>
              <TableCell align="center">Better</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {comparisons.map((comparison, idx) => (
              <TableRow key={idx}>
                <TableCell component="th" scope="row">
                  {comparison.aspect}
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    {comparison.test1Value}
                    {comparison.winner === 1 && <BetterIcon color="success" fontSize="small" />}
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    {comparison.test2Value}
                    {comparison.winner === 2 && <BetterIcon color="success" fontSize="small" />}
                  </Box>
                </TableCell>
                <TableCell align="center">
                  {comparison.winner === 1 && (
                    <Chip label={test1.name} size="small" color="success" />
                  )}
                  {comparison.winner === 2 && (
                    <Chip label={test2.name} size="small" color="success" />
                  )}
                  {comparison.winner === 0 && (
                    <SameIcon color="action" />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Key Differences */}
      <Grid container spacing={2} sx={{ mt: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              {test1.name} Advantages
            </Typography>
            <Box sx={{ mt: 1 }}>
              {test1.advantages.slice(0, 3).map((adv, idx) => (
                <Typography key={idx} variant="body2" sx={{ mb: 0.5 }}>
                  • {adv}
                </Typography>
              ))}
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              {test2.name} Advantages
            </Typography>
            <Box sx={{ mt: 1 }}>
              {test2.advantages.slice(0, 3).map((adv, idx) => (
                <Typography key={idx} variant="body2" sx={{ mb: 0.5 }}>
                  • {adv}
                </Typography>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Recommendation */}
      {overallWinner && (
        <Alert severity="success" sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Recommendation: {overallWinner.name}
          </Typography>
          <Typography variant="body2">
            Based on the comparison, <strong>{overallWinner.name}</strong> appears to be more suitable for your data.
            It has better scores in {overallWinner === test1 ? test1Wins : test2Wins} out of {comparisons.length} criteria.
          </Typography>
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            Note: This is a general recommendation. Consider your specific research question and domain expertise when making the final decision.
          </Typography>
        </Alert>
      )}

      {!overallWinner && (
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            No Clear Winner
          </Typography>
          <Typography variant="body2">
            Both tests have similar suitability scores. Consider:
          </Typography>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2">
              • Your specific research question and hypotheses
            </Typography>
            <Typography variant="body2">
              • Domain conventions and prior literature
            </Typography>
            <Typography variant="body2">
              • The relative importance of violated assumptions
            </Typography>
            <Typography variant="body2">
              • Your comfort level with test interpretation
            </Typography>
          </Box>
        </Alert>
      )}

      {/* Actions */}
      {onClose && (
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={onClose} variant="contained">
            Close Comparison
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default TestComparisonView;