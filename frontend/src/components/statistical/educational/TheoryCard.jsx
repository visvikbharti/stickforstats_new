import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  Button,
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
  Alert,
  LinearProgress,
  Tooltip
} from '@mui/material';
import {
  School as SchoolIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckIcon,
  RadioButtonUnchecked as UncheckedIcon,
  MenuBook as BookIcon,
  Quiz as QuizIcon,
  VideoLibrary as VideoIcon,
  Code as CodeIcon,
  Lightbulb as LightbulbIcon,
  Psychology as PsychologyIcon
} from '@mui/icons-material';

const TheoryCard = ({
  title = 'Statistical Concept',
  concept = '',
  formula = null,
  assumptions = [],
  whenToUse = [],
  examples = [],
  prerequisites = [],
  difficulty = 'intermediate',
  estimatedTime = '10 min',
  progress = 0,
  onComplete = null,
  expandedByDefault = false,
  showQuiz = true,
  showResources = true
}) => {
  const [expanded, setExpanded] = useState(expandedByDefault);
  const [checkedItems, setCheckedItems] = useState([]);
  const [showFormula, setShowFormula] = useState(false);
  const [activeExample, setActiveExample] = useState(0);

  const handleToggleCheck = (item) => {
    setCheckedItems(prev =>
      prev.includes(item)
        ? prev.filter(i => i !== item)
        : [...prev, item]
    );
  };

  const getDifficultyColor = () => {
    switch (difficulty) {
      case 'beginner': return 'success';
      case 'intermediate': return 'warning';
      case 'advanced': return 'error';
      default: return 'default';
    }
  };

  const getDifficultyIcon = () => {
    switch (difficulty) {
      case 'beginner': return '🌱';
      case 'intermediate': return '🌿';
      case 'advanced': return '🌳';
      default: return '📚';
    }
  };

  const completionPercentage = prerequisites.length > 0
    ? (checkedItems.length / prerequisites.length) * 100
    : progress;

  return (
    <Card sx={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      position: 'relative',
      overflow: 'visible'
    }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SchoolIcon />
            <Typography variant="h6">
              {title}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label={difficulty}
              size="small"
              icon={<span>{getDifficultyIcon()}</span>}
              sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', color: 'white' }}
            />
            <Chip
              label={estimatedTime}
              size="small"
              sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', color: 'white' }}
            />
          </Box>
        </Box>

        <Typography variant="body2" paragraph sx={{ opacity: 0.95 }}>
          {concept}
        </Typography>

        {completionPercentage > 0 && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption">
                Progress
              </Typography>
              <Typography variant="caption">
                {Math.round(completionPercentage)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={completionPercentage}
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                '& .MuiLinearProgress-bar': {
                  bgcolor: 'white'
                }
              }}
            />
          </Box>
        )}

        <Collapse in={expanded}>
          <Box sx={{ mt: 3 }}>
            {formula && (
              <Box sx={{
                p: 2,
                bgcolor: 'rgba(0, 0, 0, 0.2)',
                borderRadius: 1,
                mb: 3
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CodeIcon fontSize="small" />
                    Mathematical Formula
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => setShowFormula(!showFormula)}
                    sx={{ color: 'white' }}
                  >
                    {showFormula ? 'Hide' : 'Show'}
                  </Button>
                </Box>
                <Collapse in={showFormula}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: '0.9rem',
                      whiteSpace: 'pre-wrap',
                      overflowX: 'auto'
                    }}
                  >
                    {formula}
                  </Typography>
                </Collapse>
              </Box>
            )}

            {prerequisites.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PsychologyIcon fontSize="small" />
                  Prerequisites
                </Typography>
                <List dense sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', borderRadius: 1 }}>
                  {prerequisites.map((prereq, index) => (
                    <ListItem
                      key={index}
                      button
                      onClick={() => handleToggleCheck(prereq)}
                      sx={{ py: 0.5 }}
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        {checkedItems.includes(prereq) ? (
                          <CheckIcon fontSize="small" sx={{ color: 'white' }} />
                        ) : (
                          <UncheckedIcon fontSize="small" sx={{ color: 'white' }} />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={prereq}
                        primaryTypographyProps={{
                          variant: 'body2',
                          sx: {
                            textDecoration: checkedItems.includes(prereq) ? 'line-through' : 'none',
                            opacity: checkedItems.includes(prereq) ? 0.7 : 1
                          }
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {assumptions.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LightbulbIcon fontSize="small" />
                  Key Assumptions
                </Typography>
                <List dense sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', borderRadius: 1 }}>
                  {assumptions.map((assumption, index) => (
                    <ListItem key={index} sx={{ py: 0.5 }}>
                      <ListItemText
                        primary={assumption}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {whenToUse.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  When to Use
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {whenToUse.map((use, index) => (
                    <Chip
                      key={index}
                      label={use}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(255, 255, 255, 0.2)',
                        color: 'white'
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {examples.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Examples
                </Typography>
                <Box sx={{
                  p: 2,
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: 1
                }}>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    {examples.map((_, index) => (
                      <Button
                        key={index}
                        size="small"
                        variant={activeExample === index ? 'contained' : 'outlined'}
                        onClick={() => setActiveExample(index)}
                        sx={{
                          color: activeExample === index ? 'primary.main' : 'white',
                          borderColor: 'white',
                          bgcolor: activeExample === index ? 'white' : 'transparent'
                        }}
                      >
                        Example {index + 1}
                      </Button>
                    ))}
                  </Box>
                  <Typography variant="body2">
                    {examples[activeExample]}
                  </Typography>
                </Box>
              </Box>
            )}

            {showResources && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Learning Resources
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Tooltip title="Video Tutorial">
                    <IconButton size="small" sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)' }}>
                      <VideoIcon fontSize="small" sx={{ color: 'white' }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Reading Material">
                    <IconButton size="small" sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)' }}>
                      <BookIcon fontSize="small" sx={{ color: 'white' }} />
                    </IconButton>
                  </Tooltip>
                  {showQuiz && (
                    <Tooltip title="Take Quiz">
                      <IconButton size="small" sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)' }}>
                        <QuizIcon fontSize="small" sx={{ color: 'white' }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Box>
            )}
          </Box>
        </Collapse>
      </CardContent>

      <CardActions sx={{ px: 2, pb: 2 }}>
        <Button
          onClick={() => setExpanded(!expanded)}
          endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          sx={{ color: 'white' }}
        >
          {expanded ? 'Show Less' : 'Learn More'}
        </Button>
        {onComplete && completionPercentage === 100 && (
          <Button
            variant="contained"
            onClick={onComplete}
            sx={{
              ml: 'auto',
              bgcolor: 'white',
              color: 'primary.main',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.9)'
              }
            }}
          >
            Mark Complete
          </Button>
        )}
      </CardActions>
    </Card>
  );
};

export default TheoryCard;