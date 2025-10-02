/**
 * FilterPanel Component
 * 
 * Advanced filtering options for test recommendations.
 * 
 * @timestamp 2025-08-06 22:29:00 UTC
 */

import React from 'react';
import {
  Box,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  Slider,
  TextField,
  Button,
  Chip,
  Typography,
  Divider,
} from '@mui/material';
import {
  Clear as ClearIcon,
} from '@mui/icons-material';

import { FilterPanelProps, TestCategory, ComplexityLevel } from './TestRecommendation.types';

const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFiltersChange,
  availableCategories,
  onReset,
}) => {
  // Handle category change
  const handleCategoryChange = (category: TestCategory) => {
    const currentCategories = filters.categories || [];
    const index = currentCategories.indexOf(category);
    
    let newCategories: TestCategory[];
    if (index > -1) {
      newCategories = currentCategories.filter(c => c !== category);
    } else {
      newCategories = [...currentCategories, category];
    }
    
    onFiltersChange({
      ...filters,
      categories: newCategories.length > 0 ? newCategories : undefined,
    });
  };

  // Handle complexity change
  const handleComplexityChange = (complexity: ComplexityLevel) => {
    const currentLevels = filters.complexityLevels || [];
    const index = currentLevels.indexOf(complexity);
    
    let newLevels: ComplexityLevel[];
    if (index > -1) {
      newLevels = currentLevels.filter(l => l !== complexity);
    } else {
      newLevels = [...currentLevels, complexity];
    }
    
    onFiltersChange({
      ...filters,
      complexityLevels: newLevels.length > 0 ? newLevels : undefined,
    });
  };

  // Handle confidence threshold change
  const handleConfidenceChange = (event: Event, value: number | number[]) => {
    onFiltersChange({
      ...filters,
      minConfidence: value as number > 0 ? value as number : undefined,
    });
  };

  // Handle parametric filter
  const handleParametricChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    onFiltersChange({
      ...filters,
      parametricOnly: value === 'all' ? undefined : value === 'parametric',
    });
  };

  // Handle assumptions met filter
  const handleAssumptionsMetChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({
      ...filters,
      assumptionsMet: event.target.checked,
    });
  };

  // Handle search query
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({
      ...filters,
      searchQuery: event.target.value || undefined,
    });
  };

  // Count active filters
  const activeFilterCount = Object.keys(filters).filter(key => 
    filters[key as keyof typeof filters] !== undefined
  ).length;

  // Category display names
  const categoryDisplayNames: Record<TestCategory, string> = {
    comparison: 'Comparison Tests',
    correlation: 'Correlation Analysis',
    regression: 'Regression Analysis',
    anova: 'ANOVA',
    nonparametric: 'Non-Parametric',
    time_series: 'Time Series',
    survival: 'Survival Analysis',
    multivariate: 'Multivariate',
  };

  return (
    <Box>
      {/* Search */}
      <TextField
        fullWidth
        label="Search tests"
        placeholder="Enter test name or description"
        value={filters.searchQuery || ''}
        onChange={handleSearchChange}
        sx={{ mb: 3 }}
      />

      {/* Test Categories */}
      <FormControl component="fieldset" sx={{ mb: 3, width: '100%' }}>
        <FormLabel component="legend">Test Categories</FormLabel>
        <FormGroup>
          {availableCategories.map(category => (
            <FormControlLabel
              key={category}
              control={
                <Checkbox
                  checked={filters.categories?.includes(category) || false}
                  onChange={() => handleCategoryChange(category)}
                />
              }
              label={categoryDisplayNames[category] || category}
            />
          ))}
        </FormGroup>
      </FormControl>

      <Divider sx={{ my: 2 }} />

      {/* Complexity Levels */}
      <FormControl component="fieldset" sx={{ mb: 3, width: '100%' }}>
        <FormLabel component="legend">Complexity Level</FormLabel>
        <FormGroup row>
          {(['basic', 'intermediate', 'advanced', 'expert'] as ComplexityLevel[]).map(level => (
            <FormControlLabel
              key={level}
              control={
                <Checkbox
                  checked={filters.complexityLevels?.includes(level) || false}
                  onChange={() => handleComplexityChange(level)}
                />
              }
              label={
                <Chip
                  label={level.charAt(0).toUpperCase() + level.slice(1)}
                  size="small"
                  variant={filters.complexityLevels?.includes(level) ? 'filled' : 'outlined'}
                />
              }
            />
          ))}
        </FormGroup>
      </FormControl>

      <Divider sx={{ my: 2 }} />

      {/* Parametric Filter */}
      <FormControl component="fieldset" sx={{ mb: 3 }}>
        <FormLabel component="legend">Test Type</FormLabel>
        <RadioGroup
          value={
            filters.parametricOnly === undefined ? 'all' : 
            filters.parametricOnly ? 'parametric' : 'nonparametric'
          }
          onChange={handleParametricChange}
        >
          <FormControlLabel value="all" control={<Radio />} label="All Tests" />
          <FormControlLabel value="parametric" control={<Radio />} label="Parametric Only" />
          <FormControlLabel value="nonparametric" control={<Radio />} label="Non-Parametric Only" />
        </RadioGroup>
      </FormControl>

      <Divider sx={{ my: 2 }} />

      {/* Confidence Threshold */}
      <FormControl sx={{ mb: 3, width: '100%' }}>
        <FormLabel>Minimum Confidence Score</FormLabel>
        <Box sx={{ px: 1, mt: 2 }}>
          <Slider
            value={filters.minConfidence || 0}
            onChange={handleConfidenceChange}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `${(value * 100).toFixed(0)}%`}
            step={0.1}
            marks={[
              { value: 0, label: '0%' },
              { value: 0.5, label: '50%' },
              { value: 0.8, label: '80%' },
              { value: 1, label: '100%' },
            ]}
            min={0}
            max={1}
          />
        </Box>
      </FormControl>

      <Divider sx={{ my: 2 }} />

      {/* Assumptions Filter */}
      <FormControlLabel
        control={
          <Checkbox
            checked={filters.assumptionsMet || false}
            onChange={handleAssumptionsMetChange}
          />
        }
        label="Show only tests with all assumptions met"
        sx={{ mb: 2 }}
      />

      {/* Active Filters Summary */}
      {activeFilterCount > 0 && (
        <Box sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="body2" gutterBottom>
            <strong>{activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active</strong>
          </Typography>
          
          {filters.categories && (
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary">Categories: </Typography>
              {filters.categories.map(cat => (
                <Chip
                  key={cat}
                  label={cat.replace('_', ' ')}
                  size="small"
                  sx={{ mr: 0.5 }}
                />
              ))}
            </Box>
          )}
          
          {filters.complexityLevels && (
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary">Complexity: </Typography>
              {filters.complexityLevels.map(level => (
                <Chip
                  key={level}
                  label={level}
                  size="small"
                  sx={{ mr: 0.5 }}
                />
              ))}
            </Box>
          )}
          
          {filters.minConfidence && (
            <Typography variant="caption" display="block">
              Min confidence: {(filters.minConfidence * 100).toFixed(0)}%
            </Typography>
          )}
          
          {filters.parametricOnly !== undefined && (
            <Typography variant="caption" display="block">
              Type: {filters.parametricOnly ? 'Parametric only' : 'Non-parametric only'}
            </Typography>
          )}
          
          {filters.assumptionsMet && (
            <Typography variant="caption" display="block">
              All assumptions must be met
            </Typography>
          )}
          
          {filters.searchQuery && (
            <Typography variant="caption" display="block">
              Search: "{filters.searchQuery}"
            </Typography>
          )}
        </Box>
      )}

      {/* Reset Button */}
      {onReset && activeFilterCount > 0 && (
        <Button
          fullWidth
          startIcon={<ClearIcon />}
          onClick={onReset}
          variant="outlined"
          sx={{ mt: 2 }}
        >
          Clear All Filters
        </Button>
      )}
    </Box>
  );
};

export default FilterPanel;