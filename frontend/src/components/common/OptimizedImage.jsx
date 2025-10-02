import React, { useState, useEffect } from 'react';
import { Box, Skeleton } from '@mui/material';
import PropTypes from 'prop-types';

/**
 * OptimizedImage component with lazy loading, WebP support, and responsive images
 * 
 * Features:
 * - Lazy loading with IntersectionObserver
 * - WebP and AVIF format with fallback
 * - Responsive image sizing with srcset and sizes
 * - Art direction with different image ratios for different viewports
 * - Blurred placeholder while loading
 * - Skeleton loading state
 * 
 * @param {Object} props Component props
 * @param {string} props.src Image source URL (default fallback)
 * @param {string} [props.webpSrc] WebP version of the image (optional)
 * @param {string} [props.avifSrc] AVIF version of the image (optional)
 * @param {string} props.alt Alt text for the image
 * @param {number|string} [props.width] Image width
 * @param {number|string} [props.height] Image height
 * @param {string} [props.objectFit='cover'] CSS object-fit property
 * @param {string} [props.borderRadius] Border radius value
 * @param {string} [props.className] Additional CSS class
 * @param {Object} [props.sx] MUI sx props
 * @param {string} [props.srcset] Standard srcset attribute for the img element
 * @param {string} [props.webpSrcset] WebP srcset attribute for source element
 * @param {string} [props.avifSrcset] AVIF srcset attribute for source element
 * @param {string} [props.sizes] Sizes attribute for responsive images
 * @param {Object[]} [props.sources] Array of source objects for art direction
 * @param {boolean} [props.lowQualityPlaceholder=false] Show a low quality placeholder while loading
 * @param {string} [props.placeholderSrc] Source for the low quality placeholder image
 * @param {function} [props.onLoad] Callback when the image is loaded
 */
const OptimizedImage = ({
  src,
  webpSrc,
  avifSrc,
  alt,
  width,
  height,
  objectFit = 'cover',
  borderRadius,
  className,
  sx,
  srcset,
  webpSrcset,
  avifSrcset,
  sizes,
  sources = [],
  lowQualityPlaceholder = false,
  placeholderSrc,
  onLoad,
  ...props
}) => {
  const [loaded, setLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [imgRef, setImgRef] = useState(null);
  const [placeholderLoaded, setPlaceholderLoaded] = useState(false);

  // Reset loaded state when src changes
  useEffect(() => {
    if (src) {
      setLoaded(false);
    }
  }, [src]);

  // Set up intersection observer for lazy loading
  useEffect(() => {
    if (!imgRef) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, {
      rootMargin: '200px', // Load image when it's 200px from viewport
      threshold: 0.01,
    });

    observer.observe(imgRef);

    return () => {
      if (imgRef) {
        observer.disconnect();
      }
    };
  }, [imgRef]);

  // Handle image load event
  const handleImageLoad = () => {
    setLoaded(true);
    if (onLoad) {
      onLoad();
    }
  };

  // Handle placeholder image load
  const handlePlaceholderLoad = () => {
    setPlaceholderLoaded(true);
  };

  // Generate image markup based on format support and responsive options
  const renderImage = () => {
    // If no special formats or responsive options, render simple img
    if (!webpSrc && !avifSrc && !srcset && !webpSrcset && !avifSrcset && sources.length === 0) {
      return (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          width={width}
          height={height}
          style={{
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.5s ease-in-out',
            objectFit: objectFit,
            width: '100%',
            height: '100%',
          }}
          onLoad={handleImageLoad}
          {...props}
        />
      );
    }

    // Render picture element with sources for format and responsive support
    return (
      <picture>
        {/* AVIF format sources */}
        {avifSrc && !avifSrcset && (
          <source type="image/avif" srcSet={avifSrc} />
        )}
        {avifSrcset && (
          <source type="image/avif" srcSet={avifSrcset} sizes={sizes} />
        )}

        {/* WebP format sources */}
        {webpSrc && !webpSrcset && (
          <source type="image/webp" srcSet={webpSrc} />
        )}
        {webpSrcset && (
          <source type="image/webp" srcSet={webpSrcset} sizes={sizes} />
        )}

        {/* Art direction sources */}
        {sources.map((source, index) => (
          <source
            key={index}
            media={source.media}
            srcSet={source.srcSet}
            type={source.type || 'image/jpeg'}
            sizes={source.sizes || sizes}
          />
        ))}

        {/* Default image with srcset if provided */}
        <img
          src={src}
          srcSet={srcset}
          sizes={sizes}
          alt={alt}
          loading="lazy"
          width={width}
          height={height}
          style={{
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.5s ease-in-out',
            objectFit: objectFit,
            width: '100%',
            height: '100%',
          }}
          onLoad={handleImageLoad}
          {...props}
        />
      </picture>
    );
  };

  return (
    <Box
      ref={setImgRef}
      position="relative"
      width={width}
      height={height}
      borderRadius={borderRadius}
      overflow="hidden"
      sx={{
        display: 'inline-block',
        ...sx,
      }}
      className={className}
    >
      {/* Loading skeleton */}
      {!loaded && !placeholderLoaded && (
        <Skeleton
          variant="rectangular"
          width="100%"
          height="100%"
          animation="wave"
        />
      )}

      {/* Low quality placeholder */}
      {!loaded && lowQualityPlaceholder && placeholderSrc && (
        <img
          src={placeholderSrc}
          alt={alt}
          width={width}
          height={height}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            opacity: placeholderLoaded ? 0.5 : 0,
            transition: 'opacity 0.3s ease-in-out',
            filter: 'blur(10px)',
            transform: 'scale(1.05)',
            objectFit: objectFit,
            width: '100%',
            height: '100%',
          }}
          onLoad={handlePlaceholderLoad}
        />
      )}

      {/* Main image element - only render when in viewport */}
      {isVisible && renderImage()}
    </Box>
  );
};

OptimizedImage.propTypes = {
  src: PropTypes.string.isRequired,
  webpSrc: PropTypes.string,
  avifSrc: PropTypes.string,
  alt: PropTypes.string.isRequired,
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  objectFit: PropTypes.string,
  borderRadius: PropTypes.string,
  className: PropTypes.string,
  sx: PropTypes.object,
  srcset: PropTypes.string,
  webpSrcset: PropTypes.string,
  avifSrcset: PropTypes.string,
  sizes: PropTypes.string,
  sources: PropTypes.arrayOf(
    PropTypes.shape({
      media: PropTypes.string,
      srcSet: PropTypes.string,
      type: PropTypes.string,
      sizes: PropTypes.string,
    })
  ),
  lowQualityPlaceholder: PropTypes.bool,
  placeholderSrc: PropTypes.string,
  onLoad: PropTypes.func,
};

export default OptimizedImage;