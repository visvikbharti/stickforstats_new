import React, { useState, useEffect } from 'react';
import {
  Alert, AlertTitle, Box, Button, Collapse, Typography,
  List, ListItem, ListItemIcon, ListItemText, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  LinearProgress, IconButton, Tooltip, Paper, Grid
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as CheckIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Shield as ShieldIcon,
  ShowChart as ChartIcon,
  School as LearnIcon,
  SwapHoriz as AlternativeIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

// Golden Ratio for confidence calculations
const PHI = 1.618033988749;

const GuardianWarning = ({
  guardianReport,
  onProceed,
  onSelectAlternative,
  onViewEvidence,
  educationalMode = false
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [showEducation, setShowEducation] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState(null);

  if (!guardianReport) return null;

  const {
    test_type,
    violations = [],
    can_proceed,
    alternative_tests = [],
    confidence_score = 0,
    visual_evidence = {},
    guardian_status = {}
  } = guardianReport;

  // Determine severity level
  const getSeverityColor = () => {
    if (!can_proceed) return 'error';
    if (violations.some(v => v.severity === 'warning')) return 'warning';
    if (violations.length === 0) return 'success';
    return 'info';
  };

  const getSeverityIcon = () => {
    const severity = getSeverityColor();
    switch (severity) {
      case 'error': return <ErrorIcon />;
      case 'warning': return <WarningIcon />;
      case 'success': return <CheckIcon />;
      default: return <InfoIcon />;
    }
  };

  // Format confidence score with golden ratio reference
  const formatConfidence = (score) => {
    const percentage = (score * 100).toFixed(1);
    const phiRatio = (score / (1 / PHI)).toFixed(2);
    return { percentage, phiRatio };
  };

  const confidence = formatConfidence(confidence_score);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.5 }}
      >
        <Alert
          severity={getSeverityColor()}
          icon={<ShieldIcon />}
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              {violations.length > 0 && (
                <IconButton
                  size="small"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? <CollapseIcon /> : <ExpandIcon />}
                </IconButton>
              )}
            </Box>
          }
          sx={{
            mb: 2,
            border: '2px solid',
            borderColor: getSeverityColor() === 'error' ? '#FF5252' : '#FFD700',
            boxShadow: '0 4px 20px rgba(255, 215, 0, 0.2)'
          }}
        >
          <AlertTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getSeverityIcon()}
            <Typography variant="h6" component="span">
              Guardian Statistical Protection System
            </Typography>
          </AlertTitle>

          {/* Main Status Message */}
          <Typography variant="body1" sx={{ mt: 1, mb: 2 }}>
            {guardian_status.message || 'Assumption check complete'}
          </Typography>

          {/* Confidence Score Display */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2">
                Confidence Score:
              </Typography>
              <Box sx={{ flexGrow: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={confidence_score * 100}
                  sx={{
                    height: 10,
                    borderRadius: 5,
                    bgcolor: 'grey.300',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 5,
                      background: confidence_score > 0.618
                        ? 'linear-gradient(90deg, #4CAF50, #8BC34A)'
                        : confidence_score > 0.382
                        ? 'linear-gradient(90deg, #FFC107, #FFD700)'
                        : 'linear-gradient(90deg, #FF5252, #FF9800)'
                    }
                  }}
                />
              </Box>
              <Typography variant="body2" fontWeight="bold">
                {confidence.percentage}%
              </Typography>
              <Tooltip title={`φ-ratio: ${confidence.phiRatio}`}>
                <Chip
                  label="φ"
                  size="small"
                  sx={{ bgcolor: '#FFD700', color: '#000', fontWeight: 'bold' }}
                />
              </Tooltip>
            </Box>
          </Box>

          {/* Quick Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {can_proceed && (
              <Button
                size="small"
                variant="contained"
                color="primary"
                startIcon={<ChartIcon />}
                onClick={onProceed}
              >
                Proceed with Test
              </Button>
            )}

            {alternative_tests.length > 0 && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<AlternativeIcon />}
                onClick={() => setShowAlternatives(!showAlternatives)}
              >
                View Alternatives ({alternative_tests.length})
              </Button>
            )}

            {Object.keys(visual_evidence).length > 0 && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<ViewIcon />}
                onClick={onViewEvidence}
              >
                Visual Evidence
              </Button>
            )}

            {educationalMode && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<LearnIcon />}
                onClick={() => setShowEducation(!showEducation)}
              >
                Learn More
              </Button>
            )}
          </Box>

          {/* Expanded Violations Detail */}
          <Collapse in={expanded}>
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                Assumption Check Details:
              </Typography>
              <List dense>
                {violations.map((violation, index) => (
                  <ListItem
                    key={index}
                    onClick={() => setSelectedViolation(violation)}
                    sx={{
                      cursor: 'pointer',
                      borderRadius: 1,
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                  >
                    <ListItemIcon>
                      {violation.severity === 'critical' ? <ErrorIcon color="error" /> :
                       violation.severity === 'warning' ? <WarningIcon color="warning" /> :
                       <InfoIcon color="info" />}
                    </ListItemIcon>
                    <ListItemText
                      primary={violation.assumption}
                      secondary={
                        <Box>
                          <Typography variant="body2">{violation.message}</Typography>
                          {violation.p_value && (
                            <Typography variant="caption" color="text.secondary">
                              p-value: {violation.p_value.toFixed(4)} | Test: {violation.test_name}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    <Chip
                      label={violation.severity}
                      size="small"
                      color={
                        violation.severity === 'critical' ? 'error' :
                        violation.severity === 'warning' ? 'warning' : 'default'
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Collapse>

          {/* Alternative Tests Section */}
          <Collapse in={showAlternatives}>
            <Paper sx={{ mt: 2, p: 2, bgcolor: 'background.paper' }}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                Recommended Alternative Tests:
              </Typography>
              <Grid container spacing={1}>
                {alternative_tests.map((test, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      onClick={() => onSelectAlternative(test)}
                      sx={{
                        textTransform: 'none',
                        justifyContent: 'flex-start',
                        borderColor: '#FFD700',
                        '&:hover': {
                          bgcolor: 'rgba(255, 215, 0, 0.1)',
                          borderColor: '#FFD700'
                        }
                      }}
                    >
                      {test.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Button>
                  </Grid>
                ))}
              </Grid>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                These tests don't require the violated assumptions
              </Typography>
            </Paper>
          </Collapse>

          {/* Educational Content */}
          {educationalMode && (
            <Collapse in={showEducation}>
              <Paper sx={{ mt: 2, p: 2, bgcolor: '#FFF9E6' }}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, color: '#F57C00' }}>
                  📚 Why These Assumptions Matter:
                </Typography>
                {violations.map((violation, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Typography variant="body2" fontWeight="bold">
                      {violation.assumption}:
                    </Typography>
                    <Typography variant="body2" sx={{ ml: 2, mt: 0.5 }}>
                      {getEducationalContent(violation.assumption)}
                    </Typography>
                    <Typography variant="body2" sx={{ ml: 2, mt: 0.5, fontStyle: 'italic' }}>
                      💡 {violation.recommendation}
                    </Typography>
                  </Box>
                ))}
              </Paper>
            </Collapse>
          )}
        </Alert>

        {/* Violation Detail Dialog */}
        <Dialog
          open={Boolean(selectedViolation)}
          onClose={() => setSelectedViolation(null)}
          maxWidth="sm"
          fullWidth
        >
          {selectedViolation && (
            <>
              <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ShieldIcon sx={{ color: '#FFD700' }} />
                  {selectedViolation.assumption} Violation Details
                </Box>
              </DialogTitle>
              <DialogContent>
                <Alert severity={selectedViolation.severity === 'critical' ? 'error' : 'warning'} sx={{ mb: 2 }}>
                  {selectedViolation.message}
                </Alert>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  <strong>Test Used:</strong> {selectedViolation.test_name}
                </Typography>
                {selectedViolation.p_value && (
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    <strong>P-value:</strong> {selectedViolation.p_value}
                  </Typography>
                )}
                {selectedViolation.statistic && (
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    <strong>Test Statistic:</strong> {selectedViolation.statistic}
                  </Typography>
                )}
                <Typography variant="body2" sx={{ mb: 2 }}>
                  <strong>Recommendation:</strong> {selectedViolation.recommendation}
                </Typography>
                {selectedViolation.visual_evidence && (
                  <Button
                    variant="outlined"
                    startIcon={<ChartIcon />}
                    onClick={() => onViewEvidence(selectedViolation.visual_evidence)}
                  >
                    View Visual Evidence
                  </Button>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setSelectedViolation(null)}>Close</Button>
              </DialogActions>
            </>
          )}
        </Dialog>
      </motion.div>
    </AnimatePresence>
  );
};

// Helper function for educational content
const getEducationalContent = (assumption) => {
  const content = {
    'normality': 'Many parametric tests assume your data follows a normal (bell-shaped) distribution. Violations can lead to incorrect p-values and confidence intervals.',
    'variance_homogeneity': 'Equal variances across groups ensure fair comparison. Unequal variances can make one group appear more significant than it actually is.',
    'independence': 'Each observation should be independent. Violations (like repeated measures) can artificially reduce p-values.',
    'outliers': 'Extreme values can dramatically affect means and standard deviations, leading to false conclusions.',
    'sample_size': 'Small samples may not represent the population well and reduce the power to detect real effects.',
    'modality': 'Multiple peaks in your distribution suggest distinct subgroups that should be analyzed separately.'
  };
  return content[assumption] || 'This assumption helps ensure the validity of your statistical test.';
};

export default GuardianWarning;