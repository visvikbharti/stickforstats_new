import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Card,
  CardContent,
  CardMedia,
  Divider,
  Switch,
  FormControlLabel,
  LinearProgress,
  useTheme,
  Tooltip,
  IconButton,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import OptimizedImage from '../common/OptimizedImage';
import useImageConverter from '../../hooks/useImageConverter';
import { imagePreloader, PRELOAD_PRIORITY } from '../../utils/imagePreloader';
import { 
  generateSrcset, 
  generateSizes, 
  generateMultiFormatSrcset,
  STANDARD_BREAKPOINTS 
} from '../../utils/responsiveImageUtils';

/**
 * Demonstration component showcasing image optimization techniques
 */
const ImageOptimizationDemo = () => {
  const theme = useTheme();
  const [useOptimized, setUseOptimized] = useState(true);
  const [showComparison, setShowComparison] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState(0);
  
  const { convertToWebP, isConverting, progress } = useImageConverter();
  
  // Sample image paths (in a real app, these would be your actual images)
  const imagePaths = {
    // Regular images
    normalDistribution: '/images/probability/normal-distribution.jpg',
    binomialDistribution: '/images/probability/binomial-distribution.jpg',
    poissonDistribution: '/images/probability/poisson-distribution.jpg',
    
    // WebP versions (would be generated during build in production)
    normalDistributionWebP: '/images/probability/normal-distribution.webp',
    binomialDistributionWebP: '/images/probability/binomial-distribution.webp',
    poissonDistributionWebP: '/images/probability/poisson-distribution.webp',
  };
  
  // In real usage, we'd preload critical images on component mount
  useEffect(() => {
    // Simulate preloading critical images for this component
    const demoPreload = async () => {
      setIsPreloading(true);
      
      try {
        await imagePreloader.add(
          [imagePaths.normalDistribution], 
          PRELOAD_PRIORITY.CRITICAL
        );
        setPreloadProgress(0.5);
        
        // Simulate preloading other images with lower priority
        setTimeout(() => {
          imagePreloader.add(
            [imagePaths.binomialDistribution, imagePaths.poissonDistribution],
            PRELOAD_PRIORITY.MEDIUM
          );
          setPreloadProgress(1);
          setIsPreloading(false);
        }, 1000);
      } catch (error) {
        console.error('Error preloading images:', error);
        setIsPreloading(false);
      }
    };
    
    demoPreload();
  }, []);

  // Handle toggling between optimized and unoptimized images
  const handleToggleOptimized = () => {
    setUseOptimized(!useOptimized);
  };
  
  // Simulated image comparison data (in a real app, these would be actual metrics)
  const comparisonData = [
    {
      name: 'Normal Distribution',
      original: { size: '145KB', format: 'JPG' },
      optimized: { size: '42KB', format: 'WebP', savings: '71%' }
    },
    {
      name: 'Binomial Distribution',
      original: { size: '98KB', format: 'PNG' },
      optimized: { size: '29KB', format: 'WebP', savings: '70%' }
    },
    {
      name: 'Poisson Distribution',
      original: { size: '112KB', format: 'JPG' },
      optimized: { size: '34KB', format: 'WebP', savings: '69%' }
    }
  ];
  
  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Image Optimization Demo
        </Typography>
        <Typography variant="body2" color="text.secondary">
          This demo showcases the image optimization techniques implemented for the
          Probability Distributions module, including WebP conversion, lazy loading,
          and responsive images.
        </Typography>
      </Box>
      
      {/* Preloading indicator */}
      {isPreloading && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" gutterBottom>
            Preloading critical images: {(preloadProgress * 100).toFixed(0)}%
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={preloadProgress * 100} 
            sx={{ height: 8, borderRadius: 1 }}
          />
        </Box>
      )}
      
      {/* Controls */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <FormControlLabel
          control={
            <Switch 
              checked={useOptimized} 
              onChange={handleToggleOptimized}
              color="primary"
            />
          }
          label="Use Optimized Images"
        />
        
        <Button 
          variant="outlined" 
          onClick={() => setShowComparison(!showComparison)}
        >
          {showComparison ? 'Hide' : 'Show'} Comparison
        </Button>
        
        <Tooltip title="The optimized images use WebP format when supported, with proper lazy loading and size optimization. Images smaller than 5KB are automatically inlined as base64 data.">
          <IconButton>
            <InfoIcon />
          </IconButton>
        </Tooltip>
      </Box>
      
      {/* Image comparison data */}
      {showComparison && (
        <Paper variant="outlined" sx={{ mb: 3, p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Image Size Comparison
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={3}>
              <Typography variant="subtitle2">Image</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="subtitle2">Original</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="subtitle2">Optimized</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="subtitle2">Savings</Typography>
            </Grid>
            
            <Grid item xs={12}>
              <Divider />
            </Grid>
            
            {comparisonData.map((item, index) => (
              <React.Fragment key={index}>
                <Grid item xs={3}>
                  <Typography variant="body2">{item.name}</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="body2">
                    {item.original.size} ({item.original.format})
                  </Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="body2">
                    {item.optimized.size} ({item.optimized.format})
                  </Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography 
                    variant="body2" 
                    sx={{ color: theme.palette.success.main }}
                  >
                    {item.optimized.savings}
                  </Typography>
                </Grid>
              </React.Fragment>
            ))}
          </Grid>
        </Paper>
      )}
      
      {/* Image gallery */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <Box sx={{ position: 'relative', pt: '56.25%' /* 16:9 aspect ratio */ }}>
              {useOptimized ? (
                <OptimizedImage
                  src={imagePaths.normalDistribution}
                  webpSrc={imagePaths.normalDistributionWebP}
                  alt="Normal Distribution"
                  width="100%"
                  height="100%"
                  sx={{ position: 'absolute', top: 0, left: 0 }}
                  srcset={`${imagePaths.normalDistribution.replace('.jpg', '-320w.jpg')} 320w, 
                          ${imagePaths.normalDistribution.replace('.jpg', '-640w.jpg')} 640w, 
                          ${imagePaths.normalDistribution.replace('.jpg', '-1024w.jpg')} 1024w`}
                  webpSrcset={`${imagePaths.normalDistributionWebP.replace('.webp', '-320w.webp')} 320w, 
                              ${imagePaths.normalDistributionWebP.replace('.webp', '-640w.webp')} 640w, 
                              ${imagePaths.normalDistributionWebP.replace('.webp', '-1024w.webp')} 1024w`}
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  lowQualityPlaceholder={true}
                  placeholderSrc={imagePaths.normalDistribution.replace('.jpg', '-placeholder.jpg')}
                />
              ) : (
                <CardMedia
                  component="img"
                  image={imagePaths.normalDistribution}
                  alt="Normal Distribution"
                  sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                />
              )}
            </Box>
            <CardContent>
              <Typography variant="subtitle1">
                Normal Distribution
              </Typography>
              <Typography variant="body2" color="text.secondary">
                The normal distribution is a continuous probability distribution where
                values cluster around a mean.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <Box sx={{ position: 'relative', pt: '56.25%' /* 16:9 aspect ratio */ }}>
              {useOptimized ? (
                <OptimizedImage
                  src={imagePaths.binomialDistribution}
                  webpSrc={imagePaths.binomialDistributionWebP}
                  alt="Binomial Distribution"
                  width="100%"
                  height="100%"
                  sx={{ position: 'absolute', top: 0, left: 0 }}
                  srcset={`${imagePaths.binomialDistribution.replace('.jpg', '-320w.jpg')} 320w, 
                          ${imagePaths.binomialDistribution.replace('.jpg', '-640w.jpg')} 640w, 
                          ${imagePaths.binomialDistribution.replace('.jpg', '-1024w.jpg')} 1024w`}
                  webpSrcset={`${imagePaths.binomialDistributionWebP.replace('.webp', '-320w.webp')} 320w, 
                              ${imagePaths.binomialDistributionWebP.replace('.webp', '-640w.webp')} 640w, 
                              ${imagePaths.binomialDistributionWebP.replace('.webp', '-1024w.webp')} 1024w`}
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  lowQualityPlaceholder={true}
                  placeholderSrc={imagePaths.binomialDistribution.replace('.jpg', '-placeholder.jpg')}
                />
              ) : (
                <CardMedia
                  component="img"
                  image={imagePaths.binomialDistribution}
                  alt="Binomial Distribution"
                  sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                />
              )}
            </Box>
            <CardContent>
              <Typography variant="subtitle1">
                Binomial Distribution
              </Typography>
              <Typography variant="body2" color="text.secondary">
                The binomial distribution models the number of successes in a fixed number
                of independent trials.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <Box sx={{ position: 'relative', pt: '56.25%' /* 16:9 aspect ratio */ }}>
              {useOptimized ? (
                <OptimizedImage
                  src={imagePaths.poissonDistribution}
                  webpSrc={imagePaths.poissonDistributionWebP}
                  alt="Poisson Distribution"
                  width="100%"
                  height="100%"
                  sx={{ position: 'absolute', top: 0, left: 0 }}
                  srcset={`${imagePaths.poissonDistribution.replace('.jpg', '-320w.jpg')} 320w, 
                          ${imagePaths.poissonDistribution.replace('.jpg', '-640w.jpg')} 640w, 
                          ${imagePaths.poissonDistribution.replace('.jpg', '-1024w.jpg')} 1024w`}
                  webpSrcset={`${imagePaths.poissonDistributionWebP.replace('.webp', '-320w.webp')} 320w, 
                              ${imagePaths.poissonDistributionWebP.replace('.webp', '-640w.webp')} 640w, 
                              ${imagePaths.poissonDistributionWebP.replace('.webp', '-1024w.webp')} 1024w`}
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  lowQualityPlaceholder={true}
                  placeholderSrc={imagePaths.poissonDistribution.replace('.jpg', '-placeholder.jpg')}
                  sources={[
                    {
                      media: '(max-width: 480px)',
                      srcSet: `${imagePaths.poissonDistribution.replace('.jpg', '-mobile.jpg')} 480w`,
                      type: 'image/jpeg'
                    },
                    {
                      media: '(max-width: 480px)',
                      srcSet: `${imagePaths.poissonDistributionWebP.replace('.webp', '-mobile.webp')} 480w`,
                      type: 'image/webp'
                    }
                  ]}
                />
              ) : (
                <CardMedia
                  component="img"
                  image={imagePaths.poissonDistribution}
                  alt="Poisson Distribution"
                  sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                />
              )}
            </Box>
            <CardContent>
              <Typography variant="subtitle1">
                Poisson Distribution
              </Typography>
              <Typography variant="body2" color="text.secondary">
                The Poisson distribution models the number of events occurring in a fixed
                interval of time or space.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* WebP conversion demo */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Client-side WebP Conversion Demo
        </Typography>
        <Typography variant="body2" paragraph>
          The useImageConverter hook provides client-side WebP conversion for user-uploaded images.
          This is useful for applications that allow user image uploads where you want to optimize
          before sending to the server.
        </Typography>
        
        {isConverting && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              Converting image: {(progress * 100).toFixed(0)}%
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={progress * 100} 
              sx={{ height: 8, borderRadius: 1 }}
            />
          </Box>
        )}
        
        <Button
          variant="contained"
          component="label"
          disabled={isConverting}
        >
          Select Image to Convert
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                try {
                  // This would actually convert the image in a real application
                  // Here we're just simulating the process
                  await convertToWebP(file, {
                    quality: 0.85,
                    maxWidth: 1200,
                    maxHeight: 800
                  });
                  
                  // In a real app, you'd do something with the converted image
                  // For demo purposes, we just show progress
                } catch (error) {
                  console.error('Error converting image:', error);
                }
              }
            }}
          />
        </Button>
      </Box>
      
      {/* Responsive Image Generation Demo */}
      <Paper sx={{ mt: 4, p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Responsive Image Generation
        </Typography>
        <Typography variant="body2" paragraph>
          The responsive image utilities help generate proper srcset and sizes attributes for optimal performance across devices.
          Here are examples of utility usage:
        </Typography>
        
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Generate srcset for Responsive Images
              </Typography>
              <Box component="pre" sx={{ 
                bgcolor: 'background.paper', 
                p: 2, 
                borderRadius: 1,
                overflow: 'auto',
                fontSize: '0.8rem',
                border: '1px solid',
                borderColor: 'divider'
              }}>
{`// Generate srcset attribute for multiple widths
const srcset = generateSrcset(
  '/images/probability',
  'normal-distribution',
  'jpg',
  [320, 640, 1024, 1920]
);

// Result:
// "/images/probability/normal-distribution-320w.jpg 320w, 
//  /images/probability/normal-distribution-640w.jpg 640w, 
//  /images/probability/normal-distribution-1024w.jpg 1024w, 
//  /images/probability/normal-distribution-1920w.jpg 1920w"`}
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Generate sizes attribute
              </Typography>
              <Box component="pre" sx={{ 
                bgcolor: 'background.paper', 
                p: 2, 
                borderRadius: 1,
                overflow: 'auto',
                fontSize: '0.8rem',
                border: '1px solid',
                borderColor: 'divider'
              }}>
{`// Generate sizes attribute for responsive layouts
const sizes = generateSizes({
  mobileSize: '100vw',
  tabletSize: '50vw',
  desktopSize: '33.3vw',
  wideDesktopSize: '25vw'
});

// Result:
// "(min-width: 1440px) 25vw, (min-width: 1024px) 33.3vw,
//  (min-width: 768px) 50vw, 100vw"`}
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Generate Multiple Format srcsets at Once
              </Typography>
              <Box component="pre" sx={{ 
                bgcolor: 'background.paper',
                p: 2, 
                borderRadius: 1,
                overflow: 'auto',
                fontSize: '0.75rem',
                border: '1px solid',
                borderColor: 'divider'
              }}>
{`// Generate srcsets for multiple formats
const formatSrcsets = generateMultiFormatSrcset({
  basePath: '/images/probability',
  fileName: 'normal-distribution',
  widths: [320, 640, 1024, 1920],
  formats: ['jpg', 'webp', 'avif']
});

// Result object contains srcset strings for each format:
// {
//   jpg: "/images/probability/normal-distribution-320w.jpg 320w, ...",
//   webp: "/images/probability/normal-distribution-320w.webp 320w, ...",
//   avif: "/images/probability/normal-distribution-320w.avif 320w, ..."
// }`}
              </Box>
            </Paper>
          </Grid>
        </Grid>
        
        <Typography variant="body2" sx={{ mb: 2 }}>
          These utilities make it easy to implement responsive images throughout the application.
          They work with the enhanced OptimizedImage component to provide optimal image experiences
          across all device sizes and formats.
        </Typography>
      </Paper>
      
      {/* Implementation notes */}
      <Paper sx={{ mt: 4, p: 2, bgcolor: 'background.paper' }}>
        <Typography variant="subtitle1" gutterBottom>
          Implementation Notes
        </Typography>
        <Typography variant="body2" paragraph>
          The image optimization strategy includes:
        </Typography>
        <Typography variant="body2" component="div">
          <ul>
            <li>WebP and AVIF conversion with fallback for older browsers</li>
            <li>Image size optimization via webpack loaders</li>
            <li>Lazy loading using IntersectionObserver</li>
            <li>Priority-based preloading for critical images</li>
            <li>Responsive images with srcset and sizes attributes</li>
            <li>Art direction with media queries for different device types</li>
            <li>Low-quality image placeholders for faster perceived loading</li>
            <li>Skeleton loading placeholders</li>
          </ul>
        </Typography>
        <Typography variant="body2">
          For more details, see the IMAGE_OPTIMIZATION.md documentation file.
        </Typography>
      </Paper>
    </Paper>
  );
};

export default ImageOptimizationDemo;