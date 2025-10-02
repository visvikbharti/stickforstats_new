import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Grid,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Chip,
  Link,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SchoolIcon from '@mui/icons-material/School';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import CodeIcon from '@mui/icons-material/Code';
import axios from 'axios';

/**
 * References component for Confidence Intervals module
 * Provides bibliography, recommended readings, and resources for further learning
 */
const References = () => {
  const [references, setReferences] = useState([]);
  const [filteredReferences, setFilteredReferences] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch references from the backend
  useEffect(() => {
    const fetchReferences = async () => {
      try {
        const response = await axios.get('/api/v1/confidence-intervals/references/');
        setReferences(response.data);
        setFilteredReferences(response.data);
      } catch (error) {
        console.error('Error fetching references:', error);
        setError('Failed to load references. Please try again later.');
        // Set demo data as fallback
        const demoReferences = [
          {
            id: 'demo1',
            title: 'Introduction to Statistical Learning',
            authors: 'James, G., Witten, D., Hastie, T., & Tibshirani, R.',
            year: 2017,
            journal: 'Springer',
            url: '#',
            category: 'TEXTBOOK'
          },
          {
            id: 'demo2',
            title: 'Statistical Inference',
            authors: 'Casella, G., & Berger, R. L.',
            year: 2002,
            journal: 'Duxbury Press',
            url: '#',
            category: 'TEXTBOOK'
          }
        ];
        setReferences(demoReferences);
        setFilteredReferences(demoReferences);
      } finally {
        setLoading(false);
      }
    };
    
    fetchReferences();
  }, []);

  // Filter references based on search term and category
  useEffect(() => {
    if (references.length > 0) {
      let filtered = references;
      
      // Filter by search term
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(ref => 
          ref.title.toLowerCase().includes(term) || 
          ref.authors.toLowerCase().includes(term) || 
          ref.description.toLowerCase().includes(term) ||
          ref.keywords.some(keyword => keyword.toLowerCase().includes(term))
        );
      }
      
      // Filter by category
      if (selectedCategory !== 'all') {
        filtered = filtered.filter(ref => ref.category === selectedCategory);
      }
      
      setFilteredReferences(filtered);
    }
  }, [searchTerm, selectedCategory, references]);

  // Handle search input change
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  // Handle category filter change
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
  };

  // If backend references fail to load, use these default references
  const defaultReferences = [
    {
      id: 1,
      title: "Statistical Inference",
      authors: "Casella, G., & Berger, R. L.",
      year: 2002,
      publisher: "Duxbury",
      edition: "2nd Edition",
      description: "Comprehensive textbook covering fundamental concepts of statistical inference, including detailed coverage of confidence intervals.",
      url: "https://www.amazon.com/Statistical-Inference-George-Casella/dp/0534243126",
      category: "textbook",
      keywords: ["statistical inference", "mathematical statistics", "confidence intervals", "hypothesis testing"],
      recommended: true
    },
    {
      id: 2,
      title: "The Bootstrap and Edgeworth Expansion",
      authors: "Hall, P.",
      year: 1992,
      publisher: "Springer",
      description: "Definitive resource on bootstrap methods for confidence intervals, covering theory and applications.",
      url: "https://www.springer.com/gp/book/9780387945088",
      category: "textbook",
      keywords: ["bootstrap", "resampling", "asymptotic theory", "edgeworth expansion"],
      recommended: true
    },
    {
      id: 3,
      title: "All of Statistics: A Concise Course in Statistical Inference",
      authors: "Wasserman, L.",
      year: 2004,
      publisher: "Springer",
      description: "Accessible introduction to statistical inference with clear explanations of confidence intervals.",
      url: "https://www.springer.com/gp/book/9780387402727",
      category: "textbook",
      keywords: ["statistical inference", "mathematical statistics", "confidence intervals", "teaching"],
      recommended: true
    },
    {
      id: 4,
      title: "Better Confidence Intervals",
      authors: "Efron, B.",
      year: 1987,
      journal: "Journal of the American Statistical Association",
      volume: 82,
      issue: 397,
      pages: "171-185",
      description: "Classic paper introducing BCa (bias-corrected and accelerated) bootstrap confidence intervals.",
      url: "https://www.jstor.org/stable/2289144",
      category: "article",
      keywords: ["bootstrap", "BCa", "bias correction", "resampling"],
      recommended: true
    },
    {
      id: 5,
      title: "Confidence Intervals: From Tests of Statistical Significance to Confidence Intervals, Range Hypotheses and Substantial Effects",
      authors: "Smithson, M.",
      year: 2003,
      journal: "Educational and Psychological Measurement",
      volume: 63,
      issue: 4,
      pages: "537-554",
      description: "Accessible paper discussing the interpretation and reporting of confidence intervals in psychological research.",
      url: "https://doi.org/10.1177/0013164403256358",
      category: "article",
      keywords: ["interpretation", "reporting", "psychology", "education", "methodology"],
      recommended: false
    },
    {
      id: 6,
      title: "Confidence Intervals in R",
      authors: "R Documentation",
      year: 2021,
      description: "Comprehensive guide to computing confidence intervals in R using various packages and methods.",
      url: "https://cran.r-project.org/web/packages/Rmisc/vignettes/confidence-intervals.html",
      category: "online",
      keywords: ["R", "programming", "statistical computing", "implementation"],
      recommended: false
    },
    {
      id: 7,
      title: "Confidence Intervals with SciPy",
      authors: "SciPy Documentation",
      year: 2021,
      description: "Python implementation guides for confidence intervals using the SciPy library.",
      url: "https://docs.scipy.org/doc/scipy/reference/stats.html",
      category: "online",
      keywords: ["Python", "SciPy", "programming", "statistical computing", "implementation"],
      recommended: false
    },
    {
      id: 8,
      title: "Introduction to the Bootstrap",
      authors: "Efron, B., & Tibshirani, R. J.",
      year: 1993,
      publisher: "Chapman & Hall/CRC",
      description: "Foundational text on bootstrap methods, including detailed coverage of bootstrap confidence intervals.",
      url: "https://www.crcpress.com/Introduction-to-the-Bootstrap/Efron-Tibshirani/p/book/9780412042317",
      category: "textbook",
      keywords: ["bootstrap", "resampling", "nonparametric", "computational statistics"],
      recommended: true
    },
    {
      id: 9,
      title: "In Defense of P Values",
      authors: "Murtaugh, P. A.",
      year: 2014,
      journal: "Ecology",
      volume: 95,
      issue: 3,
      pages: "611-617",
      description: "Discusses the relationship between p-values, confidence intervals, and effect sizes in ecological research.",
      url: "https://doi.org/10.1890/13-0590.1",
      category: "article",
      keywords: ["p-values", "statistical significance", "effect size", "inference", "ecology"],
      recommended: false
    },
    {
      id: 10,
      title: "Moving beyond P values: Confidence intervals and effect sizes",
      authors: "Nakagawa, S., & Cuthill, I. C.",
      year: 2007,
      journal: "Biological Reviews",
      volume: 82,
      issue: 4,
      pages: "591-605",
      description: "Advocates for the use of confidence intervals and effect sizes instead of relying solely on p-values.",
      url: "https://doi.org/10.1111/j.1469-185X.2007.00027.x",
      category: "article",
      keywords: ["effect size", "biological statistics", "p-values", "interpretation", "meta-analysis"],
      recommended: true
    }
  ];

  // Render the component
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        References and Further Reading
      </Typography>
      
      <Typography paragraph>
        This section provides a comprehensive bibliography and recommended resources for further exploration 
        of confidence intervals, from foundational texts to current research articles and practical guides.
      </Typography>
      
      {/* Search and Filter */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              label="Search references"
              variant="outlined"
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip 
                label="All" 
                icon={<MenuBookIcon />} 
                onClick={() => handleCategoryChange('all')}
                color={selectedCategory === 'all' ? 'primary' : 'default'}
              />
              <Chip 
                label="Textbooks" 
                icon={<AutoStoriesIcon />} 
                onClick={() => handleCategoryChange('textbook')}
                color={selectedCategory === 'textbook' ? 'primary' : 'default'}
              />
              <Chip 
                label="Articles" 
                icon={<SchoolIcon />} 
                onClick={() => handleCategoryChange('article')}
                color={selectedCategory === 'article' ? 'primary' : 'default'}
              />
              <Chip 
                label="Online Resources" 
                icon={<CodeIcon />} 
                onClick={() => handleCategoryChange('online')}
                color={selectedCategory === 'online' ? 'primary' : 'default'}
              />
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* References List */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          {error} Displaying default references.
          <List>
            {defaultReferences.map((ref) => renderReferenceItem(ref))}
          </List>
        </Alert>
      ) : (
        <>
          <Typography variant="h6" gutterBottom>
            {filteredReferences.length} {filteredReferences.length === 1 ? 'Reference' : 'References'} {searchTerm && `matching "${searchTerm}"`}
          </Typography>
          
          {filteredReferences.length > 0 ? (
            <List>
              {filteredReferences.map((ref) => renderReferenceItem(ref))}
            </List>
          ) : (
            <Alert severity="info">
              No references found matching your search criteria. Try adjusting your search or filters.
            </Alert>
          )}
        </>
      )}
      
      {/* Essential References */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Essential References for Confidence Intervals
        </Typography>
        
        <Typography paragraph>
          The following references are particularly recommended for those wanting to deepen their understanding 
          of confidence intervals, from theoretical foundations to practical applications.
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom color="primary">
                  Theoretical Foundations
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="Casella, G., & Berger, R. L. (2002). Statistical Inference (2nd ed.). Duxbury."
                      secondary="Comprehensive coverage of statistical inference with rigorous mathematical treatment."
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Wasserman, L. (2004). All of Statistics: A Concise Course in Statistical Inference. Springer."
                      secondary="Modern, concise treatment accessible to those with mathematical background."
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Cox, D. R., & Hinkley, D. V. (1979). Theoretical Statistics. Chapman and Hall/CRC."
                      secondary="Classic text with elegant treatment of confidence intervals and their theoretical properties."
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom color="primary">
                  Bootstrap and Computational Methods
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="Efron, B., & Tibshirani, R. J. (1993). An Introduction to the Bootstrap. Chapman & Hall/CRC."
                      secondary="Definitive text on bootstrap methods for confidence intervals."
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Davison, A. C., & Hinkley, D. V. (1997). Bootstrap Methods and their Application. Cambridge University Press."
                      secondary="Comprehensive reference with practical implementations."
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Efron, B. (1987). Better Bootstrap Confidence Intervals. Journal of the American Statistical Association, 82(397), 171-185."
                      secondary="Introduces the BCa method, a major advancement in bootstrap confidence intervals."
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom color="primary">
                  Practical Applications and Reporting
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="Cumming, G. (2014). The New Statistics: Why and How. Psychological Science, 25(1), 7-29."
                      secondary="Explains how to use confidence intervals effectively in research and reporting."
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Nakagawa, S., & Cuthill, I. C. (2007). Effect size, confidence interval and statistical significance: a practical guide for biologists. Biological Reviews, 82(4), 591-605."
                      secondary="Practical guidance on using confidence intervals in biological research."
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Gardner, M. J., & Altman, D. G. (1986). Confidence intervals rather than P values: estimation rather than hypothesis testing. British Medical Journal, 292(6522), 746-750."
                      secondary="Influential paper advocating for confidence intervals in medical research."
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom color="primary">
                  Computational Resources
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="Canty, A., & Ripley, B. D. (2020). boot: Bootstrap R (S-Plus) Functions. R package version 1.3-27."
                      secondary="Standard R package for bootstrap confidence intervals."
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Seabold, S., & Perktold, J. (2010). statsmodels: Econometric and statistical modeling with python. Proceedings of the 9th Python in Science Conference."
                      secondary="Python library with comprehensive confidence interval methods."
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Carpenter, J., & Bithell, J. (2000). Bootstrap confidence intervals: when, which, what? A practical guide for medical statisticians. Statistics in Medicine, 19(9), 1141-1164."
                      secondary="Practical guide to choosing appropriate bootstrap confidence interval methods."
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Online Resources */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Online Resources and Learning Materials
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom color="primary">
                  Interactive Tutorials
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText 
                      primary="Seeing Theory: Confidence Intervals"
                      secondary="Visual and interactive introduction to confidence intervals"
                    />
                    <Button 
                      variant="outlined" 
                      href="https://seeing-theory.brown.edu/frequentist-inference/index.html" 
                      target="_blank" 
                      size="small"
                    >
                      Visit
                    </Button>
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="StatKey: Bootstrap Confidence Intervals"
                      secondary="Online tool for generating bootstrap confidence intervals from data"
                    />
                    <Button 
                      variant="outlined" 
                      href="http://www.lock5stat.com/StatKey/" 
                      target="_blank" 
                      size="small"
                    >
                      Visit
                    </Button>
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="R Graphics: Confidence Interval Gallery"
                      secondary="Gallery of R code examples for visualizing confidence intervals"
                    />
                    <Button 
                      variant="outlined" 
                      href="https://www.r-graph-gallery.com/tag/confidence-interval/" 
                      target="_blank" 
                      size="small"
                    >
                      Visit
                    </Button>
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom color="primary">
                  Video Courses and Lectures
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText 
                      primary="Khan Academy: Confidence Intervals"
                      secondary="Accessible introduction to confidence intervals with examples"
                    />
                    <Button 
                      variant="outlined" 
                      href="https://www.khanacademy.org/math/statistics-probability/confidence-intervals-one-sample" 
                      target="_blank" 
                      size="small"
                    >
                      Visit
                    </Button>
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="StatQuest: Confidence Intervals"
                      secondary="Clear visual explanations of confidence interval concepts"
                    />
                    <Button 
                      variant="outlined" 
                      href="https://www.youtube.com/watch?v=TqOeMYtOc1w" 
                      target="_blank" 
                      size="small"
                    >
                      Visit
                    </Button>
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="MIT OpenCourseWare: Statistical Inference"
                      secondary="University-level course materials on statistical inference including confidence intervals"
                    />
                    <Button 
                      variant="outlined" 
                      href="https://ocw.mit.edu/courses/mathematics/18-650-statistics-for-applications-fall-2016/lecture-videos/" 
                      target="_blank" 
                      size="small"
                    >
                      Visit
                    </Button>
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Citation Guidelines */}
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Citing Confidence Interval Resources
        </Typography>
        
        <Typography paragraph>
          When reporting confidence intervals in your own research, it's important to include appropriate citations for the methods used.
          Here are some guidelines for citing different types of confidence interval methods:
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Example Citation for Standard Methods
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                {`Confidence intervals were calculated using the t-distribution method 
(Casella & Berger, 2002) with α = 0.05.`}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Example Citation for Bootstrap Methods
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                {`Bootstrap confidence intervals were constructed using the bias-corrected
and accelerated (BCa) method (Efron, 1987) with 10,000 resamples.`}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Example Citation for Software Implementation
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                {`Statistical analyses were performed in R version 4.1.0 (R Core Team, 2021), 
with confidence intervals calculated using the boot package 
(Canty & Ripley, 2020).`}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Example Citation for Proportion Intervals
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                {`Confidence intervals for proportions were calculated using the 
Wilson score method (Wilson, 1927) as recommended by Agresti and 
Coull (1998) for small sample sizes.`}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

// Helper function to render a reference item
const renderReferenceItem = (reference) => (
  <ListItem key={reference.id} alignItems="flex-start" divider>
    <ListItemText
      primary={
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1" component="span">
            {reference.title}
          </Typography>
          {reference.recommended && (
            <Chip 
              label="Recommended" 
              color="primary" 
              size="small" 
              sx={{ ml: 1 }}
            />
          )}
        </Box>
      }
      secondary={
        <>
          <Typography variant="body2" color="text.primary">
            {reference.authors} ({reference.year})
            {reference.journal && `. ${reference.journal}`}
            {reference.volume && `, ${reference.volume}`}
            {reference.issue && `(${reference.issue})`}
            {reference.pages && `, ${reference.pages}`}
            {reference.publisher && `. ${reference.publisher}`}
            {reference.edition && `, ${reference.edition}`}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            {reference.description}
          </Typography>
          <Box sx={{ mt: 1 }}>
            {reference.keywords?.map((keyword) => (
              <Chip
                key={keyword}
                label={keyword}
                size="small"
                variant="outlined"
                sx={{ mr: 0.5, mb: 0.5 }}
              />
            ))}
          </Box>
          {reference.url && (
            <Link href={reference.url} target="_blank" rel="noopener noreferrer">
              View Resource
            </Link>
          )}
        </>
      }
    />
  </ListItem>
);

export default References;