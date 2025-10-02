/**
 * AssumptionPanel Component
 * 
 * Displays detailed assumption checking results with scientific accuracy.
 * 
 * @timestamp 2025-08-06 22:27:00 UTC
 */

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Button,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle as MetIcon,
  Warning as PartialIcon,
  Error as ViolatedIcon,
  Help as UnknownIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  Build as RemediateIcon,
} from '@mui/icons-material';

import { AssumptionPanelProps, TestAssumption } from './TestRecommendation.types';

const AssumptionPanel: React.FC<AssumptionPanelProps> = ({
  assumptions,
  summary,
  showDetails = true,
  onRemediate,
}) => {
  // Get icon for assumption status
  const getStatusIcon = (status: TestAssumption['status']) => {
    switch (status) {
      case 'met':
        return <MetIcon color="success" />;
      case 'partial':
        return <PartialIcon color="warning" />;
      case 'violated':
        return <ViolatedIcon color="error" />;
      case 'unknown':
        return <UnknownIcon color="action" />;
      default:
        return <InfoIcon />;
    }
  };

  // Get color for impact
  const getImpactColor = (impact: TestAssumption['impact']) => {
    switch (impact) {
      case 'critical':
        return 'error';
      case 'major':
        return 'warning';
      case 'minor':
        return 'info';
      default:
        return 'default';
    }
  };

  // Calculate overall health
  const overallHealth = (summary.met / summary.total) * 100;
  const healthColor = overallHealth >= 80 ? 'success' : overallHealth >= 60 ? 'warning' : 'error';

  // Group assumptions by status
  const groupedAssumptions = {
    met: assumptions.filter(a => a.status === 'met'),
    partial: assumptions.filter(a => a.status === 'partial'),
    violated: assumptions.filter(a => a.status === 'violated'),
    unknown: assumptions.filter(a => a.status === 'unknown'),
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Assumption Checking Results
      </Typography>

      {/* Overall Summary */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Overall Assumption Health
          </Typography>
          <Typography variant="body2" fontWeight="bold">
            {overallHealth.toFixed(0)}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={overallHealth}
          color={healthColor}
          sx={{ height: 10, borderRadius: 5, mb: 2 }}
        />
        
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {summary.met > 0 && (
            <Chip
              icon={<MetIcon />}
              label={`${summary.met} Met`}
              color="success"
              size="small"
            />
          )}
          {summary.partial > 0 && (
            <Chip
              icon={<PartialIcon />}
              label={`${summary.partial} Partial`}
              color="warning"
              size="small"
            />
          )}
          {summary.violated > 0 && (
            <Chip
              icon={<ViolatedIcon />}
              label={`${summary.violated} Violated`}
              color="error"
              size="small"
            />
          )}
        </Box>
      </Box>

      {/* Critical Violations Alert */}
      {groupedAssumptions.violated.some(a => a.impact === 'critical') && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Critical Assumption Violations Detected
          </Typography>
          <Typography variant="body2">
            One or more critical assumptions are violated. Results from this test may be unreliable.
            Consider alternative non-parametric tests or data transformations.
          </Typography>
        </Alert>
      )}

      {/* Detailed Assumptions */}
      {showDetails && (
        <Box>
          {/* Violated Assumptions First */}
          {groupedAssumptions.violated.length > 0 && (
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ViolatedIcon color="error" />
                  <Typography variant="subtitle2">
                    Violated Assumptions ({groupedAssumptions.violated.length})
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  {groupedAssumptions.violated.map((assumption, idx) => (
                    <ListItem key={idx} sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                        <ListItemIcon sx={{ minWidth: 'auto' }}>
                          {getStatusIcon(assumption.status)}
                        </ListItemIcon>
                        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                          {assumption.name}
                        </Typography>
                        <Chip
                          label={assumption.impact}
                          size="small"
                          color={getImpactColor(assumption.impact)}
                        />
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {assumption.description}
                      </Typography>
                      
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        <strong>Evidence:</strong> {assumption.evidence}
                      </Typography>
                      
                      {assumption.testStatistic !== undefined && (
                        <Typography variant="caption" color="text.secondary">
                          Test statistic: {assumption.testStatistic.toFixed(4)}
                          {assumption.pValue !== undefined && `, p-value: ${assumption.pValue.toFixed(4)}`}
                        </Typography>
                      )}
                      
                      {assumption.remediation && (
                        <Alert severity="info" sx={{ mt: 2, width: '100%' }}>
                          <Typography variant="caption">
                            <strong>Suggested Remediation:</strong> {assumption.remediation}
                          </Typography>
                          {onRemediate && (
                            <Button
                              size="small"
                              startIcon={<RemediateIcon />}
                              onClick={() => onRemediate(assumption)}
                              sx={{ mt: 1 }}
                            >
                              Apply Remediation
                            </Button>
                          )}
                        </Alert>
                      )}
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Partial Assumptions */}
          {groupedAssumptions.partial.length > 0 && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PartialIcon color="warning" />
                  <Typography variant="subtitle2">
                    Partially Met Assumptions ({groupedAssumptions.partial.length})
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  {groupedAssumptions.partial.map((assumption, idx) => (
                    <ListItem key={idx} sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                        <ListItemIcon sx={{ minWidth: 'auto' }}>
                          {getStatusIcon(assumption.status)}
                        </ListItemIcon>
                        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                          {assumption.name}
                        </Typography>
                        <Chip
                          label={assumption.impact}
                          size="small"
                          color={getImpactColor(assumption.impact)}
                        />
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {assumption.description}
                      </Typography>
                      
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        <strong>Evidence:</strong> {assumption.evidence}
                      </Typography>
                      
                      {assumption.remediation && (
                        <Typography variant="caption" color="warning.main" sx={{ mt: 1 }}>
                          <strong>Note:</strong> {assumption.remediation}
                        </Typography>
                      )}
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Met Assumptions */}
          {groupedAssumptions.met.length > 0 && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MetIcon color="success" />
                  <Typography variant="subtitle2">
                    Met Assumptions ({groupedAssumptions.met.length})
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <List dense>
                  {groupedAssumptions.met.map((assumption, idx) => (
                    <ListItem key={idx}>
                      <ListItemIcon>
                        {getStatusIcon(assumption.status)}
                      </ListItemIcon>
                      <ListItemText
                        primary={assumption.name}
                        secondary={assumption.evidence}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          )}
        </Box>
      )}

      {/* Summary Message */}
      <Box sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
        <Typography variant="body2">
          {summary.violated === 0 && summary.partial === 0 && (
            <>
              <strong>Excellent!</strong> All assumptions are met. This test is highly appropriate for your data.
            </>
          )}
          {summary.violated === 0 && summary.partial > 0 && (
            <>
              <strong>Good.</strong> Most assumptions are met with some minor concerns. Results should be interpreted with caution.
            </>
          )}
          {summary.violated > 0 && summary.violated <= summary.total / 3 && (
            <>
              <strong>Caution.</strong> Some assumptions are violated. Consider alternative tests or data transformations.
            </>
          )}
          {summary.violated > summary.total / 3 && (
            <>
              <strong>Warning.</strong> Multiple assumptions are violated. This test may not be appropriate for your data.
            </>
          )}
        </Typography>
      </Box>
    </Paper>
  );
};

export default AssumptionPanel;