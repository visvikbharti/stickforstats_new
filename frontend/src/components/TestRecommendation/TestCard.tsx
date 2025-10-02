/**
 * TestCard Component
 * 
 * Individual test recommendation card with scientific details.
 * 
 * @timestamp 2025-08-06 22:25:00 UTC
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Typography,
  Box,
  Chip,
  IconButton,
  Button,
  Collapse,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  PlayArrow as RunIcon,
  CompareArrows as CompareIcon,
  Code as CodeIcon,
  School as LearnIcon,
  CheckBox as SelectIcon,
  CheckBoxOutlineBlank as UnselectIcon,
  TrendingUp as PowerIcon,
  Groups as SampleSizeIcon,
} from '@mui/icons-material';

import { TestCardProps } from './TestRecommendation.types';

const TestCard: React.FC<TestCardProps> = ({
  test,
  isSelected = false,
  onSelect,
  showDetails = true,
  compact = false,
  onCompare,
  onRunTest,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showImplementation, setShowImplementation] = useState(false);

  // Get confidence color
  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'success';
    if (score >= 0.6) return 'warning';
    return 'error';
  };

  // Get assumption status color
  const getAssumptionStatusColor = () => {
    const { met, violated, partial } = test.assumptionsSummary;
    if (violated > 0) return 'error';
    if (partial > 0) return 'warning';
    return 'success';
  };

  // Get complexity chip color
  const getComplexityColor = () => {
    switch (test.complexity) {
      case 'basic': return 'success';
      case 'intermediate': return 'info';
      case 'advanced': return 'warning';
      case 'expert': return 'error';
      default: return 'default';
    }
  };

  // Handle selection
  const handleSelect = () => {
    if (onSelect) {
      onSelect(test);
    }
  };

  if (compact) {
    return (
      <Card
        sx={{
          mb: 1,
          borderLeft: isSelected ? '4px solid' : 'none',
          borderLeftColor: 'primary.main',
          bgcolor: isSelected ? 'action.hover' : 'background.paper',
        }}
      >
        <CardContent sx={{ py: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
              {onSelect && (
                <IconButton size="small" onClick={handleSelect}>
                  {isSelected ? <SelectIcon color="primary" /> : <UnselectIcon />}
                </IconButton>
              )}
              
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle2">
                  {test.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {test.category.replace('_', ' ')}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Chip
                  label={`${(test.confidenceScore * 100).toFixed(0)}%`}
                  size="small"
                  color={getConfidenceColor(test.confidenceScore)}
                />
                
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {test.assumptionsSummary.violated === 0 ? (
                    <CheckIcon color="success" fontSize="small" />
                  ) : test.assumptionsSummary.violated > 0 ? (
                    <ErrorIcon color="error" fontSize="small" />
                  ) : (
                    <WarningIcon color="warning" fontSize="small" />
                  )}
                  <Typography variant="caption" sx={{ ml: 0.5 }}>
                    {test.assumptionsSummary.met}/{test.assumptionsSummary.total}
                  </Typography>
                </Box>
                
                {onRunTest && (
                  <IconButton size="small" onClick={() => onRunTest(test.id)}>
                    <RunIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        height: expanded ? 'auto' : '100%',
        borderTop: isSelected ? '3px solid' : 'none',
        borderTopColor: 'primary.main',
        transition: 'all 0.3s',
        '&:hover': {
          boxShadow: 3,
        },
      }}
    >
      <CardHeader
        title={
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">{test.name}</Typography>
            {onSelect && (
              <IconButton size="small" onClick={handleSelect}>
                {isSelected ? <SelectIcon color="primary" /> : <UnselectIcon />}
              </IconButton>
            )}
          </Box>
        }
        subheader={
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {test.fullName}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
              <Chip
                label={test.category.replace('_', ' ')}
                size="small"
                variant="outlined"
              />
              <Chip
                label={test.complexity}
                size="small"
                color={getComplexityColor()}
              />
              {test.parametric && (
                <Chip
                  label="Parametric"
                  size="small"
                  variant="outlined"
                  color="primary"
                />
              )}
              {test.robust && (
                <Chip
                  label="Robust"
                  size="small"
                  variant="outlined"
                  color="success"
                />
              )}
            </Box>
          </Box>
        }
      />
      
      <CardContent>
        {/* Confidence Score */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Confidence Score
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {(test.confidenceScore * 100).toFixed(0)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={test.confidenceScore * 100}
            color={getConfidenceColor(test.confidenceScore)}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        {/* Assumptions Summary */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Assumptions
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {test.assumptionsSummary.met > 0 && (
              <Chip
                icon={<CheckIcon />}
                label={`${test.assumptionsSummary.met} met`}
                size="small"
                color="success"
                variant="outlined"
              />
            )}
            {test.assumptionsSummary.partial > 0 && (
              <Chip
                icon={<WarningIcon />}
                label={`${test.assumptionsSummary.partial} partial`}
                size="small"
                color="warning"
                variant="outlined"
              />
            )}
            {test.assumptionsSummary.violated > 0 && (
              <Chip
                icon={<ErrorIcon />}
                label={`${test.assumptionsSummary.violated} violated`}
                size="small"
                color="error"
                variant="outlined"
              />
            )}
          </Box>
        </Box>

        {/* Description */}
        <Typography variant="body2" paragraph>
          {test.description}
        </Typography>

        {/* Sample Size */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <SampleSizeIcon fontSize="small" color="action" />
            <Typography variant="caption" color="text.secondary">
              N = {test.sampleSize.current}
            </Typography>
          </Box>
          {test.sampleSize.current < test.sampleSize.minimum && (
            <Chip
              label="Low sample size"
              size="small"
              color="warning"
              variant="outlined"
            />
          )}
          {test.sampleSize.powerAnalysis && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <PowerIcon fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                Power = {(test.sampleSize.powerAnalysis.power * 100).toFixed(0)}%
              </Typography>
            </Box>
          )}
        </Box>

        {/* Expand/Collapse Details */}
        {showDetails && (
          <Box>
            <Button
              onClick={() => setExpanded(!expanded)}
              endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              size="small"
              fullWidth
              sx={{ justifyContent: 'space-between' }}
            >
              {expanded ? 'Hide' : 'Show'} Details
            </Button>
            
            <Collapse in={expanded} timeout="auto" unmountOnExit>
              <Box sx={{ mt: 2 }}>
                <Divider sx={{ mb: 2 }} />
                
                {/* Rationale */}
                <Typography variant="subtitle2" gutterBottom>
                  Why this test?
                </Typography>
                <List dense>
                  {test.rationale.map((reason, idx) => (
                    <ListItem key={idx} sx={{ pl: 0 }}>
                      <ListItemIcon sx={{ minWidth: 24 }}>
                        <CheckIcon fontSize="small" color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={reason}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>

                {/* Advantages */}
                {test.advantages.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Advantages
                    </Typography>
                    <List dense>
                      {test.advantages.map((advantage, idx) => (
                        <ListItem key={idx} sx={{ pl: 0 }}>
                          <ListItemText
                            primary={`• ${advantage}`}
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                {/* Limitations */}
                {test.limitations.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Limitations
                    </Typography>
                    <List dense>
                      {test.limitations.map((limitation, idx) => (
                        <ListItem key={idx} sx={{ pl: 0 }}>
                          <ListItemText
                            primary={`• ${limitation}`}
                            primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                {/* Alternative Tests */}
                {test.alternatives.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Alternative Tests
                    </Typography>
                    {test.alternatives.map((alt, idx) => (
                      <Box key={idx} sx={{ mb: 1 }}>
                        <Typography variant="body2">
                          <strong>{alt.testName}</strong>: {alt.reason}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}

                {/* Effect Size */}
                {test.effectSize && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Effect Size ({test.effectSize.measure})
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Small: {test.effectSize.expectedSmall.toFixed(2)}, 
                      Medium: {test.effectSize.expectedMedium.toFixed(2)}, 
                      Large: {test.effectSize.expectedLarge.toFixed(2)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {test.effectSize.interpretation}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Collapse>
          </Box>
        )}
      </CardContent>

      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        {onCompare && (
          <Button
            size="small"
            startIcon={<CompareIcon />}
            onClick={() => onCompare(test.id)}
          >
            Compare
          </Button>
        )}
        
        {test.implementation && (
          <Button
            size="small"
            startIcon={<CodeIcon />}
            onClick={() => setShowImplementation(!showImplementation)}
          >
            Code
          </Button>
        )}
        
        {test.interpretation && (
          <Tooltip title={test.interpretation}>
            <IconButton size="small">
              <LearnIcon />
            </IconButton>
          </Tooltip>
        )}
        
        {onRunTest && (
          <Button
            size="small"
            startIcon={<RunIcon />}
            onClick={() => onRunTest(test.id)}
            variant="contained"
            color="primary"
          >
            Run Test
          </Button>
        )}
      </CardActions>
    </Card>
  );
};

export default TestCard;