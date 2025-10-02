import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  Card,
  CardContent,
  CardActions,
  CardMedia,
  Button,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Rating,
  Avatar,
  IconButton,
  Badge,
  Tabs,
  Tab
} from '@mui/material';
import {
  Search as SearchIcon,
  ShoppingCart as ShoppingCartIcon,
  FilterList as FilterListIcon,
  Download as DownloadIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  Extension as ExtensionIcon,
  Code as CodeIcon,
  School as SchoolIcon,
  AutoGraph as AutoGraphIcon,
  Verified as VerifiedIcon
} from '@mui/icons-material';

const MarketplacePage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  const [activeTab, setActiveTab] = useState(0);

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'templates', label: 'Analysis Templates' },
    { value: 'datasets', label: 'Datasets' },
    { value: 'models', label: 'Pre-trained Models' },
    { value: 'scripts', label: 'Custom Scripts' },
    { value: 'tutorials', label: 'Tutorials' }
  ];

  const marketplaceItems = [
    {
      id: 1,
      title: 'Advanced Time Series Analysis Template',
      author: 'Dr. Sarah Johnson',
      category: 'templates',
      price: 'Free',
      rating: 4.8,
      downloads: 1245,
      description: 'Comprehensive template for ARIMA, seasonal decomposition, and forecasting',
      tags: ['Time Series', 'ARIMA', 'Forecasting'],
      verified: true,
      featured: true
    },
    {
      id: 2,
      title: 'Clinical Trial Dataset - Cardiovascular Study',
      author: 'MedData Research',
      category: 'datasets',
      price: '$49',
      rating: 4.6,
      downloads: 823,
      description: 'Anonymized clinical trial data with 10,000+ patient records',
      tags: ['Healthcare', 'Clinical', 'Cardiovascular'],
      verified: true,
      featured: false
    },
    {
      id: 3,
      title: 'Quality Control ML Model',
      author: 'Industrial AI Lab',
      category: 'models',
      price: '$99',
      rating: 4.9,
      downloads: 567,
      description: 'Pre-trained model for manufacturing defect detection',
      tags: ['Manufacturing', 'Quality Control', 'ML'],
      verified: true,
      featured: true
    },
    {
      id: 4,
      title: 'Bayesian Statistics Tutorial Series',
      author: 'Prof. Michael Chen',
      category: 'tutorials',
      price: '$29',
      rating: 5.0,
      downloads: 2341,
      description: 'Complete video series on Bayesian inference and MCMC',
      tags: ['Education', 'Bayesian', 'Video'],
      verified: false,
      featured: false
    },
    {
      id: 5,
      title: 'Custom PCA Visualization Script',
      author: 'DataViz Pro',
      category: 'scripts',
      price: 'Free',
      rating: 4.4,
      downloads: 1567,
      description: '3D interactive PCA plots with custom styling',
      tags: ['PCA', 'Visualization', 'Python'],
      verified: true,
      featured: false
    },
    {
      id: 6,
      title: 'Financial Risk Analysis Package',
      author: 'QuantFinance Solutions',
      category: 'templates',
      price: '$149',
      rating: 4.7,
      downloads: 432,
      description: 'Complete toolkit for portfolio risk assessment and VaR calculations',
      tags: ['Finance', 'Risk', 'Portfolio'],
      verified: true,
      featured: true
    }
  ];

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'templates': return <ExtensionIcon />;
      case 'datasets': return <AutoGraphIcon />;
      case 'models': return <TrendingUpIcon />;
      case 'scripts': return <CodeIcon />;
      case 'tutorials': return <SchoolIcon />;
      default: return <ExtensionIcon />;
    }
  };

  const filteredItems = marketplaceItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = category === 'all' || item.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={2} sx={{ p: 4, mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h3" component="h1" gutterBottom>
              Marketplace
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Discover and share statistical analysis templates, datasets, models, and educational content.
            </Typography>
          </Box>
          <IconButton color="primary" size="large">
            <Badge badgeContent={2} color="secondary">
              <ShoppingCartIcon />
            </Badge>
          </IconButton>
        </Box>
      </Paper>

      {/* Search and Filters */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              placeholder="Search marketplace..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                label="Category"
              >
                {categories.map((cat) => (
                  <MenuItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                label="Sort By"
              >
                <MenuItem value="popular">Most Popular</MenuItem>
                <MenuItem value="recent">Recently Added</MenuItem>
                <MenuItem value="rating">Highest Rated</MenuItem>
                <MenuItem value="price-low">Price: Low to High</MenuItem>
                <MenuItem value="price-high">Price: High to Low</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={1}>
            <Button 
              fullWidth 
              variant="outlined" 
              startIcon={<FilterListIcon />}
              sx={{ height: '100%' }}
            >
              Filter
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Featured Items */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Featured Items
        </Typography>
        <Grid container spacing={2}>
          {marketplaceItems.filter(item => item.featured).map((item) => (
            <Grid item xs={12} md={4} key={item.id}>
              <Card variant="outlined" sx={{ position: 'relative' }}>
                <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
                  <Chip label="Featured" color="primary" size="small" />
                </Box>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    {getCategoryIcon(item.category)}
                    <Typography variant="h6" sx={{ ml: 1, flex: 1 }}>
                      {item.title}
                    </Typography>
                    {item.verified && <VerifiedIcon color="primary" />}
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {item.description}
                  </Typography>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Rating value={item.rating} precision={0.1} size="small" readOnly />
                    <Typography variant="h6" color="primary">
                      {item.price}
                    </Typography>
                  </Box>
                </CardContent>
                <CardActions>
                  <Button size="small" startIcon={<DownloadIcon />}>
                    Get Now
                  </Button>
                  <Button size="small">Learn More</Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* All Items */}
      <Typography variant="h6" gutterBottom>
        All Items ({filteredItems.length})
      </Typography>
      <Grid container spacing={3}>
        {filteredItems.map((item) => (
          <Grid item xs={12} md={6} lg={4} key={item.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box display="flex" alignItems="start" mb={2}>
                  <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                    {getCategoryIcon(item.category)}
                  </Avatar>
                  <Box flex={1}>
                    <Box display="flex" alignItems="center">
                      <Typography variant="h6" gutterBottom>
                        {item.title}
                      </Typography>
                      {item.verified && (
                        <VerifiedIcon color="primary" sx={{ ml: 1, fontSize: 20 }} />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      by {item.author}
                    </Typography>
                  </Box>
                </Box>
                
                <Typography variant="body2" paragraph>
                  {item.description}
                </Typography>
                
                <Box display="flex" flexWrap="wrap" gap={0.5} mb={2}>
                  {item.tags.map((tag, index) => (
                    <Chip key={index} label={tag} size="small" variant="outlined" />
                  ))}
                </Box>
                
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box display="flex" alignItems="center" gap={2}>
                    <Box display="flex" alignItems="center">
                      <Rating value={item.rating} precision={0.1} size="small" readOnly />
                      <Typography variant="body2" sx={{ ml: 0.5 }}>
                        ({item.rating})
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {item.downloads} downloads
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
              
              <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                <Typography variant="h6" color="primary">
                  {item.price}
                </Typography>
                <Box>
                  <Button size="small">Details</Button>
                  <Button size="small" variant="contained" startIcon={<DownloadIcon />}>
                    Get
                  </Button>
                </Box>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <Paper elevation={1} sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            No items found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your search or filters
          </Typography>
        </Paper>
      )}
    </Container>
  );
};

export default MarketplacePage;