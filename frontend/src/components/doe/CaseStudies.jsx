import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Grid,
  Chip,
  Button,
  Skeleton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Science as ScienceIcon,
  Business as BusinessIcon,
  School as SchoolIcon,
  LocalHospital as HealthIcon,
  Factory as ManufacturingIcon,
  Agriculture as AgricultureIcon,
  Close as CloseIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
} from '@mui/icons-material';
import contentService from '../../services/contentService';

const industryIcons = {
  research: <ScienceIcon />,
  business: <BusinessIcon />,
  education: <SchoolIcon />,
  healthcare: <HealthIcon />,
  manufacturing: <ManufacturingIcon />,
  agriculture: <AgricultureIcon />,
};

const CaseStudies = () => {
  const [caseStudies, setCaseStudies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStudy, setSelectedStudy] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Fetch case studies
  useEffect(() => {
    fetchCaseStudies();
  }, []);

  const fetchCaseStudies = async () => {
    try {
      setLoading(true);
      const data = await contentService.getCaseStudies({ type: 'doe' });
      setCaseStudies(data);
    } catch (err) {
      console.error('Error fetching case studies:', err);
      setError('Failed to load case studies');
      // Fallback to mock data
      setCaseStudies(getMockCaseStudies());
    } finally {
      setLoading(false);
    }
  };

  const getMockCaseStudies = () => [
    {
      id: 1,
      title: 'Optimizing Chemical Reaction Yield',
      description: 'Using DOE to maximize product yield in pharmaceutical manufacturing',
      industry: 'manufacturing',
      tags: ['Factorial Design', '2^k Design', 'Response Surface'],
      metrics: {
        improvement: '35%',
        timeReduction: '50%',
        costSaving: '$2.5M',
      },
      image: '/images/case-study-1.jpg',
      downloadUrl: '/downloads/case-study-1.pdf',
    },
    {
      id: 2,
      title: 'Agricultural Yield Optimization',
      description: 'Factorial design for optimizing fertilizer combinations',
      industry: 'agriculture',
      tags: ['Factorial Design', 'Blocking', 'ANOVA'],
      metrics: {
        improvement: '28%',
        timeReduction: '30%',
        costSaving: '$500K',
      },
      image: '/images/case-study-2.jpg',
      downloadUrl: '/downloads/case-study-2.pdf',
    },
    {
      id: 3,
      title: 'Clinical Trial Design',
      description: 'Efficient drug dosage optimization using response surface methodology',
      industry: 'healthcare',
      tags: ['RSM', 'Central Composite', 'Sequential Design'],
      metrics: {
        improvement: '40%',
        timeReduction: '60%',
        costSaving: '$5M',
      },
      image: '/images/case-study-3.jpg',
      downloadUrl: '/downloads/case-study-3.pdf',
    },
    {
      id: 4,
      title: 'Educational Assessment Design',
      description: 'Optimizing test parameters for maximum student performance',
      industry: 'education',
      tags: ['Fractional Factorial', 'Screening Design', 'Optimization'],
      metrics: {
        improvement: '22%',
        timeReduction: '25%',
        costSaving: '$100K',
      },
      image: '/images/case-study-4.jpg',
      downloadUrl: '/downloads/case-study-4.pdf',
    },
  ];

  const filteredStudies = activeTab === 'all' 
    ? caseStudies 
    : caseStudies.filter(study => study.industry === activeTab);

  const handleViewDetails = (study) => {
    setSelectedStudy(study);
    setDetailsOpen(true);
  };

  const handleDownload = (study) => {
    // Track download
    contentService.trackView('case-study', study.id);
    // In real app, this would download the PDF
    window.open(study.downloadUrl, '_blank');
  };

  const handleShare = (study) => {
    if (navigator.share) {
      navigator.share({
        title: study.title,
        text: study.description,
        url: window.location.href,
      });
    }
  };

  if (loading) {
    return (
      <Box>
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((n) => (
            <Grid item xs={12} md={6} key={n}>
              <Card>
                <Skeleton variant="rectangular" height={200} />
                <CardContent>
                  <Skeleton variant="text" />
                  <Skeleton variant="text" width="60%" />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        DOE Case Studies
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Learn from real-world applications of Design of Experiments
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Tabs
        value={activeTab}
        onChange={(e, v) => setActiveTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3 }}
      >
        <Tab label="All Industries" value="all" />
        <Tab label="Manufacturing" value="manufacturing" icon={<ManufacturingIcon />} />
        <Tab label="Healthcare" value="healthcare" icon={<HealthIcon />} />
        <Tab label="Agriculture" value="agriculture" icon={<AgricultureIcon />} />
        <Tab label="Education" value="education" icon={<SchoolIcon />} />
      </Tabs>

      <Grid container spacing={3}>
        {filteredStudies.map((study) => (
          <Grid item xs={12} md={6} key={study.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {study.image && (
                <CardMedia
                  component="img"
                  height="200"
                  image={study.image}
                  alt={study.title}
                  sx={{ objectFit: 'cover' }}
                />
              )}
              <CardContent sx={{ flexGrow: 1 }}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  {industryIcons[study.industry]}
                  <Typography variant="h6">
                    {study.title}
                  </Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  {study.description}
                </Typography>

                <Box display="flex" gap={0.5} flexWrap="wrap" mb={2}>
                  {study.tags.map((tag) => (
                    <Chip key={tag} label={tag} size="small" />
                  ))}
                </Box>

                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={4}>
                    <Typography variant="h6" color="primary">
                      {study.metrics.improvement}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Improvement
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="h6" color="primary">
                      {study.metrics.timeReduction}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Time Saved
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="h6" color="primary">
                      {study.metrics.costSaving}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Cost Saving
                    </Typography>
                  </Grid>
                </Grid>

                <Box display="flex" gap={1}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleViewDetails(study)}
                  >
                    View Details
                  </Button>
                  <IconButton
                    size="small"
                    onClick={() => handleDownload(study)}
                  >
                    <DownloadIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleShare(study)}
                  >
                    <ShareIcon />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedStudy && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Typography variant="h6">{selectedStudy.title}</Typography>
                <IconButton onClick={() => setDetailsOpen(false)}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Typography paragraph>
                {selectedStudy.description}
              </Typography>
              <Typography variant="h6" gutterBottom>
                Key Results
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="primary">
                        {selectedStudy.metrics.improvement}
                      </Typography>
                      <Typography variant="body2">
                        Performance Improvement
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="primary">
                        {selectedStudy.metrics.timeReduction}
                      </Typography>
                      <Typography variant="body2">
                        Time Reduction
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="primary">
                        {selectedStudy.metrics.costSaving}
                      </Typography>
                      <Typography variant="body2">
                        Cost Savings
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => handleDownload(selectedStudy)}>
                Download Full Case Study
              </Button>
              <Button variant="contained" onClick={() => setDetailsOpen(false)}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default CaseStudies;