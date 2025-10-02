import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  IconButton,
  Collapse,
  LinearProgress,
  Button,
  Chip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as UncheckedIcon,
} from '@mui/icons-material';

const OnboardingChecklist = () => {
  const [expanded, setExpanded] = useState(true);
  const [checkedItems, setCheckedItems] = useState(() => {
    const saved = localStorage.getItem('onboardingChecklist');
    return saved ? JSON.parse(saved) : {};
  });

  const checklistItems = [
    {
      id: 'upload-data',
      label: 'Upload your first dataset',
      description: 'Import CSV, Excel, or JSON files for analysis',
      category: 'Getting Started',
    },
    {
      id: 'run-analysis',
      label: 'Run your first analysis',
      description: 'Try confidence intervals or basic statistics',
      category: 'Getting Started',
    },
    {
      id: 'generate-report',
      label: 'Generate a report',
      description: 'Export your results as PDF or Excel',
      category: 'Getting Started',
    },
    {
      id: 'explore-modules',
      label: 'Explore statistical modules',
      description: 'Check out DOE, PCA, SQC, and more',
      category: 'Advanced Features',
    },
    {
      id: 'customize-settings',
      label: 'Customize your settings',
      description: 'Set preferences and configure defaults',
      category: 'Advanced Features',
    },
    {
      id: 'join-community',
      label: 'Join the community',
      description: 'Connect with other users and share insights',
      category: 'Community',
    },
  ];

  useEffect(() => {
    localStorage.setItem('onboardingChecklist', JSON.stringify(checkedItems));
  }, [checkedItems]);

  const handleToggle = (itemId) => {
    setCheckedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const completedCount = Object.values(checkedItems).filter(Boolean).length;
  const progress = (completedCount / checklistItems.length) * 100;

  const groupedItems = checklistItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  const allCompleted = completedCount === checklistItems.length;

  return (
    <Card
      sx={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        width: 350,
        maxHeight: expanded ? '70vh' : 'auto',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        zIndex: 1200,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6">Getting Started</Typography>
            {allCompleted && (
              <Chip 
                label="Completed!" 
                color="success" 
                size="small"
                icon={<CheckCircleIcon />}
              />
            )}
          </Box>
          <IconButton
            size="small"
            onClick={() => setExpanded(!expanded)}
            sx={{ ml: 'auto' }}
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
        
        {!expanded && (
          <Box sx={{ mt: 1 }}>
            <LinearProgress 
              variant="determinate" 
              value={progress} 
              sx={{ height: 6, borderRadius: 3 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              {completedCount} of {checklistItems.length} completed
            </Typography>
          </Box>
        )}
      </CardContent>

      <Collapse in={expanded}>
        <CardContent sx={{ pt: 0, maxHeight: '50vh', overflowY: 'auto' }}>
          <Box sx={{ mb: 2 }}>
            <LinearProgress 
              variant="determinate" 
              value={progress} 
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {completedCount} of {checklistItems.length} completed
            </Typography>
          </Box>

          {Object.entries(groupedItems).map(([category, items]) => (
            <Box key={category} sx={{ mb: 2 }}>
              <Typography 
                variant="subtitle2" 
                color="primary" 
                sx={{ mb: 1, fontWeight: 600 }}
              >
                {category}
              </Typography>
              <List dense disablePadding>
                {items.map((item) => (
                  <ListItem
                    key={item.id}
                    disableGutters
                    onClick={() => handleToggle(item.id)}
                    sx={{
                      cursor: 'pointer',
                      borderRadius: 1,
                      '&:hover': { bgcolor: 'action.hover' },
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Checkbox
                        edge="start"
                        checked={checkedItems[item.id] || false}
                        tabIndex={-1}
                        disableRipple
                        icon={<UncheckedIcon />}
                        checkedIcon={<CheckCircleIcon color="success" />}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography
                          variant="body2"
                          sx={{
                            textDecoration: checkedItems[item.id] ? 'line-through' : 'none',
                            color: checkedItems[item.id] ? 'text.secondary' : 'text.primary',
                          }}
                        >
                          {item.label}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {item.description}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          ))}

          {allCompleted && (
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="success.main" gutterBottom>
                🎉 Congratulations! You've completed all onboarding tasks!
              </Typography>
              <Button
                size="small"
                onClick={() => setCheckedItems({})}
                sx={{ mt: 1 }}
              >
                Reset Checklist
              </Button>
            </Box>
          )}
        </CardContent>
      </Collapse>
    </Card>
  );
};

export default OnboardingChecklist;