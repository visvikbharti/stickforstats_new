/**
 * TestRecommendation Component
 * 
 * Displays statistical test recommendations from the intelligent backend engine.
 * Maintains absolute scientific rigor in test selection and assumption checking.
 * 
 * @timestamp 2025-08-06 22:20:00 UTC
 * @scientific_rigor ABSOLUTE
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Alert,
  Tabs,
  Tab,
  Button,
  ButtonGroup,
  Chip,
  Badge,
  IconButton,
  Tooltip,
  Collapse,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
} from '@mui/material';
import {
  Science as ScienceIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CompareArrows as CompareIcon,
  Code as CodeIcon,
  School as SchoolIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  Download as DownloadIcon,
  PlayArrow as RunIcon,
  ViewModule as CardsIcon,
  ViewList as ListIcon,
  TableChart as TableIcon,
} from '@mui/icons-material';

import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { setSelectedTests, setTestResults } from '../../store/slices/analysisSlice';

import TestCard from './TestCard';
import AssumptionPanel from './AssumptionPanel';
import TestComparisonView from './TestComparisonView';
import FilterPanel from './FilterPanel';
import ImplementationViewer from './ImplementationViewer';

import {
  TestRecommendationProps,
  TestRecommendation,
  TestFilterOptions,
  TestSortOptions,
  TestRecommendationState,
} from './TestRecommendation.types';

const TestRecommendationComponent: React.FC<TestRecommendationProps> = ({
  recommendations,
  isLoading = false,
  error = null,
  showAssumptions = true,
  showImplementation = false,
  showAlternatives = true,
  showEducational = true,
  enableSelection = true,
  multiSelect = false,
  maxSelections = 3,
  onTestSelect,
  onTestCompare,
  enableFiltering = true,
  enableSorting = true,
  defaultFilters,
  defaultSort,
  viewMode: propViewMode = 'cards',
  compact = false,
  onRunTest,
  onExportRecommendations,
  onSaveSelection,
}) => {
  const dispatch = useDispatch();
  const { selectedTests } = useSelector((state: RootState) => state.analysis);

  // Component state
  const [state, setState] = useState<TestRecommendationState>({
    selectedTests: [],
    filters: defaultFilters || {},
    sort: defaultSort || { field: 'confidence', direction: 'desc' },
    viewMode: propViewMode,
    expandedCards: [],
    comparisonTests: [],
    showImplementation: showImplementation,
    showAssumptionDetails: false,
  });

  const [activeTab, setActiveTab] = useState(0);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [showComparisonDialog, setShowComparisonDialog] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'info',
  });

  // Filter and sort recommendations
  const processedRecommendations = useMemo(() => {
    let filtered = [...recommendations];

    // Apply filters
    if (state.filters.categories?.length) {
      filtered = filtered.filter(test => 
        state.filters.categories!.includes(test.category)
      );
    }

    if (state.filters.complexityLevels?.length) {
      filtered = filtered.filter(test => 
        state.filters.complexityLevels!.includes(test.complexity)
      );
    }

    if (state.filters.parametricOnly !== undefined) {
      filtered = filtered.filter(test => 
        test.parametric === state.filters.parametricOnly
      );
    }

    if (state.filters.minConfidence !== undefined) {
      filtered = filtered.filter(test => 
        test.confidenceScore >= state.filters.minConfidence!
      );
    }

    if (state.filters.assumptionsMet) {
      filtered = filtered.filter(test => 
        test.assumptionsSummary.violated === 0
      );
    }

    if (state.filters.searchQuery) {
      const query = state.filters.searchQuery.toLowerCase();
      filtered = filtered.filter(test => 
        test.name.toLowerCase().includes(query) ||
        test.fullName.toLowerCase().includes(query) ||
        test.description.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (state.sort.field) {
        case 'confidence':
          comparison = a.confidenceScore - b.confidenceScore;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'complexity':
          const complexityOrder = { 'basic': 0, 'intermediate': 1, 'advanced': 2, 'expert': 3 };
          comparison = complexityOrder[a.complexity] - complexityOrder[b.complexity];
          break;
        case 'assumptions':
          comparison = (a.assumptionsSummary.met / a.assumptionsSummary.total) - 
                      (b.assumptionsSummary.met / b.assumptionsSummary.total);
          break;
      }
      
      return state.sort.direction === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [recommendations, state.filters, state.sort]);

  // Group recommendations by category
  const groupedRecommendations = useMemo(() => {
    const groups: Record<string, TestRecommendation[]> = {};
    
    processedRecommendations.forEach(test => {
      if (!groups[test.category]) {
        groups[test.category] = [];
      }
      groups[test.category].push(test);
    });
    
    return groups;
  }, [processedRecommendations]);

  // Handle test selection
  const handleTestSelect = useCallback((test: TestRecommendation) => {
    if (!enableSelection) return;

    setState(prev => {
      let newSelected = [...prev.selectedTests];
      
      if (multiSelect) {
        const index = newSelected.indexOf(test.id);
        if (index > -1) {
          newSelected.splice(index, 1);
        } else if (newSelected.length < maxSelections) {
          newSelected.push(test.id);
        } else {
          setSnackbar({
            open: true,
            message: `Maximum ${maxSelections} tests can be selected`,
            severity: 'info',
          });
          return prev;
        }
      } else {
        newSelected = newSelected[0] === test.id ? [] : [test.id];
      }
      
      // Update Redux state
      dispatch(setSelectedTests(newSelected));
      
      // Call parent callback
      if (onTestSelect) {
        const selectedTestObjects = recommendations.filter(t => 
          newSelected.includes(t.id)
        );
        onTestSelect(selectedTestObjects);
      }
      
      return { ...prev, selectedTests: newSelected };
    });
  }, [enableSelection, multiSelect, maxSelections, recommendations, dispatch, onTestSelect]);

  // Handle test comparison
  const handleTestCompare = useCallback((testId: string) => {
    setState(prev => {
      const newComparison = [...prev.comparisonTests];
      const index = newComparison.indexOf(testId);
      
      if (index > -1) {
        newComparison.splice(index, 1);
      } else if (newComparison.length < 2) {
        newComparison.push(testId);
      } else {
        setSnackbar({
          open: true,
          message: 'You can compare up to 2 tests at a time',
          severity: 'info',
        });
        return prev;
      }
      
      if (newComparison.length === 2) {
        setShowComparisonDialog(true);
        if (onTestCompare) {
          onTestCompare(newComparison[0], newComparison[1]);
        }
      }
      
      return { ...prev, comparisonTests: newComparison };
    });
  }, [onTestCompare]);

  // Handle run test
  const handleRunTest = useCallback((testId: string) => {
    if (onRunTest) {
      onRunTest(testId);
      setSnackbar({
        open: true,
        message: 'Test execution started...',
        severity: 'info',
      });
    }
  }, [onRunTest]);

  // Handle export
  const handleExport = useCallback(() => {
    if (onExportRecommendations) {
      onExportRecommendations();
      setSnackbar({
        open: true,
        message: 'Recommendations exported successfully',
        severity: 'success',
      });
    }
  }, [onExportRecommendations]);

  // Handle save selection
  const handleSaveSelection = useCallback(() => {
    if (onSaveSelection && state.selectedTests.length > 0) {
      const selectedTestObjects = recommendations.filter(t => 
        state.selectedTests.includes(t.id)
      );
      onSaveSelection(selectedTestObjects);
      setSnackbar({
        open: true,
        message: 'Selection saved successfully',
        severity: 'success',
      });
    }
  }, [onSaveSelection, state.selectedTests, recommendations]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalTests = processedRecommendations.length;
    const highConfidence = processedRecommendations.filter(t => t.confidenceScore >= 0.8).length;
    const assumptionsMet = processedRecommendations.filter(t => t.assumptionsSummary.violated === 0).length;
    const parametric = processedRecommendations.filter(t => t.parametric).length;
    
    return {
      total: totalTests,
      highConfidence,
      assumptionsMet,
      parametric,
      nonParametric: totalTests - parametric,
    };
  }, [processedRecommendations]);

  // Loading state
  if (isLoading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Box sx={{ textAlign: 'center' }}>
          <LinearProgress sx={{ mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            Analyzing your data and generating test recommendations...
          </Typography>
          <Typography variant="caption" color="text.secondary">
            This may take a few moments for large datasets
          </Typography>
        </Box>
      </Paper>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        <Typography variant="subtitle2">Error Loading Recommendations</Typography>
        <Typography variant="body2">{error}</Typography>
      </Alert>
    );
  }

  // Empty state
  if (!recommendations || recommendations.length === 0) {
    return (
      <Alert severity="info">
        <Typography variant="subtitle2">No Test Recommendations Available</Typography>
        <Typography variant="body2">
          Please upload and profile your data first to receive test recommendations.
        </Typography>
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ScienceIcon color="primary" sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h5">
                Statistical Test Recommendations
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {stats.total} tests recommended based on your data profile
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {onExportRecommendations && (
              <Button
                startIcon={<DownloadIcon />}
                onClick={handleExport}
                variant="outlined"
                size="small"
              >
                Export
              </Button>
            )}
            {onSaveSelection && state.selectedTests.length > 0 && (
              <Button
                startIcon={<CheckCircleIcon />}
                onClick={handleSaveSelection}
                variant="contained"
                size="small"
              >
                Save Selection ({state.selectedTests.length})
              </Button>
            )}
          </Box>
        </Box>

        {/* Statistics */}
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {stats.highConfidence}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                High Confidence
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {stats.assumptionsMet}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                All Assumptions Met
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4">
                {stats.parametric}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Parametric Tests
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4">
                {stats.nonParametric}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Non-Parametric
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Controls */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          {/* View Mode */}
          <ButtonGroup size="small">
            <Button
              startIcon={<CardsIcon />}
              variant={state.viewMode === 'cards' ? 'contained' : 'outlined'}
              onClick={() => setState(prev => ({ ...prev, viewMode: 'cards' }))}
            >
              Cards
            </Button>
            <Button
              startIcon={<ListIcon />}
              variant={state.viewMode === 'list' ? 'contained' : 'outlined'}
              onClick={() => setState(prev => ({ ...prev, viewMode: 'list' }))}
            >
              List
            </Button>
            <Button
              startIcon={<TableIcon />}
              variant={state.viewMode === 'table' ? 'contained' : 'outlined'}
              onClick={() => setState(prev => ({ ...prev, viewMode: 'table' }))}
            >
              Table
            </Button>
            {state.comparisonTests.length === 2 && (
              <Button
                startIcon={<CompareIcon />}
                variant={state.viewMode === 'comparison' ? 'contained' : 'outlined'}
                onClick={() => setShowComparisonDialog(true)}
              >
                Compare
              </Button>
            )}
          </ButtonGroup>

          {/* Filters and Sort */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {enableFiltering && (
              <Button
                startIcon={<FilterIcon />}
                onClick={() => setShowFilterDialog(true)}
                size="small"
                variant="outlined"
              >
                Filter
                {Object.keys(state.filters).length > 0 && (
                  <Badge
                    badgeContent={Object.keys(state.filters).length}
                    color="primary"
                    sx={{ ml: 1 }}
                  />
                )}
              </Button>
            )}
            
            {enableSorting && (
              <Button
                startIcon={<SortIcon />}
                onClick={() => setState(prev => ({
                  ...prev,
                  sort: {
                    ...prev.sort,
                    direction: prev.sort.direction === 'asc' ? 'desc' : 'asc',
                  },
                }))}
                size="small"
                variant="outlined"
              >
                Sort: {state.sort.field} ({state.sort.direction})
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Main Content */}
      {state.viewMode === 'cards' && (
        <Grid container spacing={2}>
          {processedRecommendations.map(test => (
            <Grid item xs={12} md={6} lg={4} key={test.id}>
              <TestCard
                test={test}
                isSelected={state.selectedTests.includes(test.id)}
                onSelect={handleTestSelect}
                showDetails={!compact}
                compact={compact}
                onCompare={handleTestCompare}
                onRunTest={handleRunTest}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {state.viewMode === 'list' && (
        <Paper>
          {Object.entries(groupedRecommendations).map(([category, tests]) => (
            <Box key={category} sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ p: 2, bgcolor: 'action.hover' }}>
                {category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')}
              </Typography>
              {tests.map(test => (
                <TestCard
                  key={test.id}
                  test={test}
                  isSelected={state.selectedTests.includes(test.id)}
                  onSelect={handleTestSelect}
                  showDetails={false}
                  compact={true}
                  onCompare={handleTestCompare}
                  onRunTest={handleRunTest}
                />
              ))}
            </Box>
          ))}
        </Paper>
      )}

      {/* Filter Dialog */}
      <Dialog
        open={showFilterDialog}
        onClose={() => setShowFilterDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Filter Test Recommendations</DialogTitle>
        <DialogContent>
          <FilterPanel
            filters={state.filters}
            onFiltersChange={(filters) => setState(prev => ({ ...prev, filters }))}
            availableCategories={Array.from(new Set(recommendations.map(t => t.category)))}
            onReset={() => setState(prev => ({ ...prev, filters: {} }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowFilterDialog(false)}>Close</Button>
          <Button
            onClick={() => {
              setState(prev => ({ ...prev, filters: {} }));
              setShowFilterDialog(false);
            }}
            color="primary"
          >
            Clear All
          </Button>
        </DialogActions>
      </Dialog>

      {/* Comparison Dialog */}
      {showComparisonDialog && state.comparisonTests.length === 2 && (
        <Dialog
          open={showComparisonDialog}
          onClose={() => setShowComparisonDialog(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>Test Comparison</DialogTitle>
          <DialogContent>
            <TestComparisonView
              tests={recommendations.filter(t => state.comparisonTests.includes(t.id))}
              onClose={() => {
                setShowComparisonDialog(false);
                setState(prev => ({ ...prev, comparisonTests: [] }));
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        message={snackbar.message}
      />
    </Box>
  );
};

export default TestRecommendationComponent;