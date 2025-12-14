/**
 * AI Advisor Suggestions Component
 *
 * Provides contextual quick suggestions based on user's current activity.
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Paper,
} from '@mui/material';
import {
  Lightbulb as LightbulbIcon,
} from '@mui/icons-material';

/**
 * Context-aware suggestions based on current activity
 */
const CONTEXTUAL_SUGGESTIONS = {
  dataUpload: [
    'What tests can I run with this data?',
    'Does my data meet normality assumptions?',
    'What visualizations would be helpful?',
    'How should I handle missing values?',
  ],
  testSelection: [
    'What are the assumptions for this test?',
    'What effect size should I expect?',
    'How many participants do I need?',
    'Is there a non-parametric alternative?',
  ],
  results: [
    'How do I interpret this p-value?',
    'Is my effect size meaningful?',
    'How should I report these results?',
    'What are the limitations of this analysis?',
  ],
  assumptions: [
    'How do I fix this assumption violation?',
    'Should I transform my data?',
    'What robust alternatives exist?',
    'How serious is this violation?',
  ],
  error: [
    'Why did my analysis fail?',
    'What does this error mean?',
    'How can I fix this issue?',
    'What data format is expected?',
  ],
};

const AIAdvisorSuggestions = ({
  context = 'dataUpload',
  onSuggestionClick,
  customSuggestions = [],
}) => {
  const suggestions = customSuggestions.length > 0
    ? customSuggestions
    : CONTEXTUAL_SUGGESTIONS[context] || CONTEXTUAL_SUGGESTIONS.dataUpload;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        bgcolor: '#f8f9fa',
        borderRadius: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <LightbulbIcon sx={{ fontSize: 18, color: '#ff9800' }} />
        <Typography variant="subtitle2" color="text.secondary">
          Suggested Questions
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {suggestions.map((suggestion, index) => (
          <Chip
            key={index}
            label={suggestion}
            onClick={() => onSuggestionClick?.(suggestion)}
            sx={{
              bgcolor: 'white',
              border: '1px solid #e0e0e0',
              '&:hover': {
                bgcolor: '#e3f2fd',
                borderColor: '#2196f3',
              },
              transition: 'all 0.2s',
            }}
            size="small"
          />
        ))}
      </Box>
    </Paper>
  );
};

export default AIAdvisorSuggestions;
