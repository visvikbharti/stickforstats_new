import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Card, 
  CardContent, 
  Tabs, 
  Tab, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import OptimizedImage from '../common/OptimizedImage';

/**
 * AdvancedImageFormatDemo component
 * 
 * A demonstration of next-gen image formats (WebP and AVIF) with fallbacks
 * for older browsers. This component showcases the image optimization features
 * and provides comparisons between formats.
 */
const AdvancedImageFormatDemo = () => {
  const [tab, setTab] = useState(0);
  const [supportsWebP, setSupportsWebP] = useState(null);
  const [supportsAVIF, setSupportsAVIF] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check browser support for image formats
  React.useEffect(() => {
    // Check WebP support
    const webpImage = new Image();
    webpImage.onload = () => setSupportsWebP(true);
    webpImage.onerror = () => setSupportsWebP(false);
    webpImage.src = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';

    // Check AVIF support
    const avifImage = new Image();
    avifImage.onload = () => setSupportsAVIF(true);
    avifImage.onerror = () => setSupportsAVIF(false);
    avifImage.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK';
  }, []);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTab(newValue);
  };

  // Example image data with different formats
  const imageSets = [
    {
      id: 'normal_distribution',
      title: 'Normal Distribution',
      description: 'Visualization of a normal (Gaussian) distribution curve.',
      jpgSrc: '/images/probability_distributions/normal_distribution.jpg',
      webpSrc: '/images/probability_distributions/normal_distribution.webp',
      avifSrc: '/images/probability_distributions/normal_distribution.avif',
      placeholderSrc: '/images/probability_distributions/normal_distribution-placeholder.jpg',
      responsiveJpgSrcset: '/images/probability_distributions/normal_distribution-320w.jpg 320w, /images/probability_distributions/normal_distribution-640w.jpg 640w, /images/probability_distributions/normal_distribution-1024w.jpg 1024w',
      responsiveWebpSrcset: '/images/probability_distributions/normal_distribution-320w.webp 320w, /images/probability_distributions/normal_distribution-640w.webp 640w, /images/probability_distributions/normal_distribution-1024w.webp 1024w',
      responsiveAvifSrcset: '/images/probability_distributions/normal_distribution-320w.avif 320w, /images/probability_distributions/normal_distribution-640w.avif 640w, /images/probability_distributions/normal_distribution-1024w.avif 1024w',
      sizes: '(max-width: 600px) 90vw, (max-width: 960px) 50vw, 640px',
      originalSize: '328KB',
      webpSize: '173KB (53% smaller)',
      avifSize: '112KB (66% smaller)',
    },
    {
      id: 'poisson_distribution',
      title: 'Poisson Distribution',
      description: 'Visualization of a Poisson distribution for modeling discrete events.',
      jpgSrc: '/images/probability_distributions/poisson_distribution.jpg',
      webpSrc: '/images/probability_distributions/poisson_distribution.webp',
      avifSrc: '/images/probability_distributions/poisson_distribution.avif',
      placeholderSrc: '/images/probability_distributions/poisson_distribution-placeholder.jpg',
      responsiveJpgSrcset: '/images/probability_distributions/poisson_distribution-320w.jpg 320w, /images/probability_distributions/poisson_distribution-640w.jpg 640w, /images/probability_distributions/poisson_distribution-1024w.jpg 1024w',
      responsiveWebpSrcset: '/images/probability_distributions/poisson_distribution-320w.webp 320w, /images/probability_distributions/poisson_distribution-640w.webp 640w, /images/probability_distributions/poisson_distribution-1024w.webp 1024w',
      responsiveAvifSrcset: '/images/probability_distributions/poisson_distribution-320w.avif 320w, /images/probability_distributions/poisson_distribution-640w.avif 640w, /images/probability_distributions/poisson_distribution-1024w.avif 1024w',
      sizes: '(max-width: 600px) 90vw, (max-width: 960px) 50vw, 640px',
      originalSize: '276KB',
      webpSize: '138KB (50% smaller)',
      avifSize: '92KB (67% smaller)',
    }
  ];

  // Current selected image set based on tab
  const currentImageSet = imageSets[tab];

  return (
    <Box sx={{ my: 4 }}>
      <Typography variant="h5" gutterBottom>
        Next-Gen Image Format Comparison
      </Typography>
      
      <Typography variant="body1" paragraph>
        This demo showcases the benefits of using modern image formats (WebP and AVIF) 
        for statistical visualizations. These formats significantly reduce file size 
        while maintaining visual quality, leading to faster page loads and better user experience.
      </Typography>
      
      <Paper sx={{ mt: 3, p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="body1" sx={{ mr: 2 }}>
            Your browser supports:
          </Typography>
          
          {supportsWebP === null || supportsAVIF === null ? (
            <CircularProgress size={20} />
          ) : (
            <Box>
              <Chip 
                label="WebP" 
                color={supportsWebP ? "success" : "error"} 
                variant="outlined" 
                size="small" 
                sx={{ mr: 1 }}
              />
              <Chip 
                label="AVIF" 
                color={supportsAVIF ? "success" : "error"} 
                variant="outlined" 
                size="small" 
              />
            </Box>
          )}
        </Box>
        
        {!supportsWebP && supportsWebP !== null && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Your browser doesn't support WebP. You'll see JPG images instead.
          </Alert>
        )}
        
        {!supportsAVIF && supportsAVIF !== null && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Your browser doesn't support AVIF. You'll see WebP or JPG images instead.
          </Alert>
        )}
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tab} onChange={handleTabChange} aria-label="image format examples">
            {imageSets.map((set) => (
              <Tab key={set.id} label={set.title} />
            ))}
          </Tabs>
        </Box>
        
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            {currentImageSet.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {currentImageSet.description}
          </Typography>
          
          <Card elevation={3} sx={{ mb: 4 }}>
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <OptimizedImage
                src={currentImageSet.jpgSrc}
                webpSrc={currentImageSet.webpSrc}
                avifSrc={currentImageSet.avifSrc}
                alt={currentImageSet.title}
                width="100%"
                height="auto"
                srcset={currentImageSet.responsiveJpgSrcset}
                webpSrcset={currentImageSet.responsiveWebpSrcset}
                avifSrcset={currentImageSet.responsiveAvifSrcset}
                sizes={currentImageSet.sizes}
                lowQualityPlaceholder={true}
                placeholderSrc={currentImageSet.placeholderSrc}
                onLoad={() => setIsLoading(false)}
                sx={{ maxWidth: '640px', margin: '0 auto' }}
              />
              
              {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                  <CircularProgress size={30} />
                </Box>
              )}
            </Box>
            
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                The image above is automatically served in the optimal format for your browser.
                It's using the <code>{supportsAVIF ? 'AVIF' : supportsWebP ? 'WebP' : 'JPG'}</code> format.
              </Typography>
            </CardContent>
          </Card>
          
          <Typography variant="h6" gutterBottom>
            Format Comparison
          </Typography>
          
          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Format</TableCell>
                  <TableCell>File Size</TableCell>
                  <TableCell>Savings</TableCell>
                  <TableCell>Browser Support</TableCell>
                  <TableCell>Fallback</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>JPEG</TableCell>
                  <TableCell>{currentImageSet.originalSize}</TableCell>
                  <TableCell>Baseline</TableCell>
                  <TableCell>All browsers</TableCell>
                  <TableCell>N/A</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>WebP</TableCell>
                  <TableCell>{currentImageSet.webpSize}</TableCell>
                  <TableCell>~50%</TableCell>
                  <TableCell>93% of browsers</TableCell>
                  <TableCell>JPG</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>AVIF</TableCell>
                  <TableCell>{currentImageSet.avifSize}</TableCell>
                  <TableCell>~65%</TableCell>
                  <TableCell>72% of browsers</TableCell>
                  <TableCell>WebP, then JPG</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          
          <Typography variant="subtitle2" gutterBottom>
            Implementation Benefits:
          </Typography>
          
          <ul>
            <li>
              <Typography variant="body2">
                <strong>Faster page loads</strong> - Reduced file sizes mean quicker downloads, especially on mobile networks
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>Lower bandwidth usage</strong> - Less data transfer for the same visual quality
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>Better Core Web Vitals scores</strong> - Improved LCP (Largest Contentful Paint) metrics
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>Support for all browsers</strong> - Automatic fallback to supported formats
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>Responsive images</strong> - Different image sizes for different viewports
              </Typography>
            </li>
          </ul>
        </Box>
      </Paper>
    </Box>
  );
};

export default AdvancedImageFormatDemo;