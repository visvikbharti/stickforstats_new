import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Breadcrumbs,
  Link,
  Alert
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Sort as SortIcon,
  Article as ArticleIcon,
  Functions as FunctionsIcon,
  Dataset as DatasetIcon,
  School as SchoolIcon,
  Code as CodeIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  NavigateNext as NavigateNextIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';

const SearchResultsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [sortBy, setSortBy] = useState('relevance');
  const [filterType, setFilterType] = useState('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    // Get search query from URL params
    const params = new URLSearchParams(location.search);
    const query = params.get('q') || '';
    setSearchQuery(query);
  }, [location]);

  const searchResults = [
    {
      id: 1,
      title: 'Introduction to Statistical Quality Control',
      type: 'tutorial',
      description: 'Learn the fundamentals of SQC including control charts, process capability, and sampling methods.',
      relevance: 0.95,
      path: '/learn/sqc-intro',
      tags: ['SQC', 'Tutorial', 'Beginner'],
      lastUpdated: '2 days ago'
    },
    {
      id: 2,
      title: 'Principal Component Analysis',
      type: 'analysis',
      description: 'Reduce dimensionality of your data while preserving variance using PCA.',
      relevance: 0.88,
      path: '/analysis/pca',
      tags: ['PCA', 'Dimensionality Reduction'],
      lastUpdated: '1 week ago'
    },
    {
      id: 3,
      title: 'Time Series Dataset - Stock Prices',
      type: 'dataset',
      description: 'Historical stock price data for time series analysis and forecasting exercises.',
      relevance: 0.82,
      path: '/datasets/stock-prices',
      tags: ['Dataset', 'Time Series', 'Finance'],
      lastUpdated: '3 days ago'
    },
    {
      id: 4,
      title: 'Confidence Interval Calculator',
      type: 'tool',
      description: 'Calculate confidence intervals for various statistical parameters with this interactive tool.',
      relevance: 0.79,
      path: '/tools/ci-calculator',
      tags: ['Tool', 'Confidence Intervals'],
      lastUpdated: '5 days ago'
    },
    {
      id: 5,
      title: 'DOE Analysis Template',
      type: 'template',
      description: 'Pre-configured template for Design of Experiments analysis including factorial and response surface designs.',
      relevance: 0.75,
      path: '/templates/doe-analysis',
      tags: ['DOE', 'Template', 'Analysis'],
      lastUpdated: '1 month ago'
    },
    {
      id: 6,
      title: 'Statistical Methods API Documentation',
      type: 'documentation',
      description: 'Complete API reference for integrating statistical methods into your applications.',
      relevance: 0.72,
      path: '/docs/api',
      tags: ['API', 'Documentation', 'Developer'],
      lastUpdated: '2 weeks ago'
    }
  ];

  const resultTypes = [
    { value: 'all', label: 'All Results', count: searchResults.length },
    { value: 'analysis', label: 'Analysis Tools', count: 2 },
    { value: 'tutorial', label: 'Tutorials', count: 1 },
    { value: 'dataset', label: 'Datasets', count: 1 },
    { value: 'template', label: 'Templates', count: 1 },
    { value: 'documentation', label: 'Documentation', count: 1 }
  ];

  const getTypeIcon = (type) => {
    switch (type) {
      case 'analysis':
      case 'tool':
        return <FunctionsIcon />;
      case 'tutorial':
        return <SchoolIcon />;
      case 'dataset':
        return <DatasetIcon />;
      case 'template':
        return <ArticleIcon />;
      case 'documentation':
        return <CodeIcon />;
      default:
        return <ArticleIcon />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'analysis':
      case 'tool':
        return 'primary';
      case 'tutorial':
        return 'secondary';
      case 'dataset':
        return 'success';
      case 'template':
        return 'warning';
      case 'documentation':
        return 'info';
      default:
        return 'default';
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  const filteredResults = searchResults.filter(result => 
    filterType === 'all' || result.type === filterType
  );

  const sortedResults = [...filteredResults].sort((a, b) => {
    switch (sortBy) {
      case 'relevance':
        return b.relevance - a.relevance;
      case 'recent':
        return new Date(b.lastUpdated) - new Date(a.lastUpdated);
      case 'title':
        return a.title.localeCompare(b.title);
      default:
        return 0;
    }
  });

  const resultsPerPage = 5;
  const totalPages = Math.ceil(sortedResults.length / resultsPerPage);
  const paginatedResults = sortedResults.slice(
    (page - 1) * resultsPerPage,
    page * resultsPerPage
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Search Header */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <form onSubmit={handleSearch}>
          <TextField
            fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search StickForStats..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton type="submit" edge="end">
                    <SearchIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            size="large"
          />
        </form>
      </Paper>

      {/* Breadcrumbs */}
      <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 2 }}>
        <Link color="inherit" href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
          Home
        </Link>
        <Typography color="text.primary">Search Results</Typography>
      </Breadcrumbs>

      {/* Results Summary */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          {sortedResults.length} results for "{searchQuery}"
        </Typography>
        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Sort by</InputLabel>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              label="Sort by"
            >
              <MenuItem value="relevance">Relevance</MenuItem>
              <MenuItem value="recent">Most Recent</MenuItem>
              <MenuItem value="title">Title A-Z</MenuItem>
            </Select>
          </FormControl>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, newMode) => newMode && setViewMode(newMode)}
            size="small"
          >
            <ToggleButton value="list">
              <ViewListIcon />
            </ToggleButton>
            <ToggleButton value="grid">
              <ViewModuleIcon />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Filters Sidebar */}
        <Grid item xs={12} md={3}>
          <Paper elevation={1} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Filter Results
            </Typography>
            <List>
              {resultTypes.map((type) => (
                <ListItem 
                  key={type.value}
                  button
                  selected={filterType === type.value}
                  onClick={() => setFilterType(type.value)}
                >
                  <ListItemText 
                    primary={type.label}
                    secondary={`${type.count} results`}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>

          {/* Trending Searches */}
          <Paper elevation={1} sx={{ p: 2, mt: 2 }}>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <TrendingUpIcon color="primary" />
              <Typography variant="h6">
                Trending Searches
              </Typography>
            </Box>
            <Box display="flex" flexDirection="column" gap={1}>
              <Chip label="Time Series Analysis" size="small" clickable />
              <Chip label="Machine Learning" size="small" clickable />
              <Chip label="Quality Control" size="small" clickable />
              <Chip label="Hypothesis Testing" size="small" clickable />
            </Box>
          </Paper>
        </Grid>

        {/* Search Results */}
        <Grid item xs={12} md={9}>
          {paginatedResults.length === 0 ? (
            <Alert severity="info">
              No results found for "{searchQuery}". Try different keywords or check the spelling.
            </Alert>
          ) : (
            <>
              {viewMode === 'list' ? (
                <List>
                  {paginatedResults.map((result, index) => (
                    <React.Fragment key={result.id}>
                      <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                        <ListItemIcon sx={{ mt: 2 }}>
                          {getTypeIcon(result.type)}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box>
                              <Link 
                                href={result.path}
                                onClick={(e) => { e.preventDefault(); navigate(result.path); }}
                                variant="h6"
                                color="primary"
                                underline="hover"
                              >
                                {result.title}
                              </Link>
                              <Box display="flex" gap={1} mt={0.5}>
                                <Chip 
                                  label={result.type} 
                                  size="small" 
                                  color={getTypeColor(result.type)}
                                />
                                {result.tags.map((tag, i) => (
                                  <Chip key={i} label={tag} size="small" variant="outlined" />
                                ))}
                              </Box>
                            </Box>
                          }
                          secondary={
                            <Box mt={1}>
                              <Typography variant="body2" color="text.secondary" paragraph>
                                {result.description}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Last updated {result.lastUpdated} • Relevance: {(result.relevance * 100).toFixed(0)}%
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < paginatedResults.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Grid container spacing={2}>
                  {paginatedResults.map((result) => (
                    <Grid item xs={12} sm={6} key={result.id}>
                      <Card sx={{ height: '100%' }}>
                        <CardContent>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            {getTypeIcon(result.type)}
                            <Typography variant="h6">
                              {result.title}
                            </Typography>
                          </Box>
                          <Box display="flex" gap={0.5} mb={2}>
                            <Chip 
                              label={result.type} 
                              size="small" 
                              color={getTypeColor(result.type)}
                            />
                            {result.tags.slice(0, 2).map((tag, i) => (
                              <Chip key={i} label={tag} size="small" variant="outlined" />
                            ))}
                          </Box>
                          <Typography variant="body2" color="text.secondary" paragraph>
                            {result.description}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {result.lastUpdated}
                          </Typography>
                        </CardContent>
                        <CardActions>
                          <Button 
                            size="small" 
                            onClick={() => navigate(result.path)}
                          >
                            View Details
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <Box display="flex" justifyContent="center" mt={4}>
                  <Pagination 
                    count={totalPages} 
                    page={page} 
                    onChange={(e, value) => setPage(value)}
                    color="primary"
                  />
                </Box>
              )}
            </>
          )}
        </Grid>
      </Grid>
    </Container>
  );
};

export default SearchResultsPage;