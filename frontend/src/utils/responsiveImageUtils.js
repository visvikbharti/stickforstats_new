/**
 * Responsive Image Utilities
 * 
 * Utility functions for creating and managing responsive images
 * with srcset, sizes, and multiple formats.
 */

/**
 * Generate a srcset attribute value for responsive images
 * 
 * @param {string} basePath - Base path for the image
 * @param {string} fileName - File name without extension
 * @param {string} extension - File extension (jpg, png, webp, etc)
 * @param {number[]} widths - Array of widths to generate srcset for
 * @returns {string} Formatted srcset attribute value
 */
export const generateSrcset = (basePath, fileName, extension, widths) => {
  return widths
    .map(width => `${basePath}/${fileName}-${width}w.${extension} ${width}w`)
    .join(', ');
};

/**
 * Generate a sizes attribute based on common responsive breakpoints
 * 
 * @param {Object} options - Configuration options
 * @param {string} [options.mobileSize='100vw'] - Size for mobile devices
 * @param {string} [options.tabletSize='50vw'] - Size for tablet devices
 * @param {string} [options.desktopSize='33.3vw'] - Size for desktop devices
 * @param {string} [options.wideDesktopSize='25vw'] - Size for wide desktop displays
 * @param {number} [options.tabletBreakpoint=768] - Breakpoint for tablets in pixels
 * @param {number} [options.desktopBreakpoint=1024] - Breakpoint for desktops in pixels
 * @param {number} [options.wideDesktopBreakpoint=1440] - Breakpoint for wide desktops in pixels
 * @returns {string} Formatted sizes attribute value
 */
export const generateSizes = ({
  mobileSize = '100vw',
  tabletSize = '50vw',
  desktopSize = '33.3vw',
  wideDesktopSize = '25vw',
  tabletBreakpoint = 768,
  desktopBreakpoint = 1024,
  wideDesktopBreakpoint = 1440
} = {}) => {
  return `
    (min-width: ${wideDesktopBreakpoint}px) ${wideDesktopSize},
    (min-width: ${desktopBreakpoint}px) ${desktopSize},
    (min-width: ${tabletBreakpoint}px) ${tabletSize},
    ${mobileSize}
  `.trim().replace(/\n\s+/g, ', ');
};

/**
 * Generate srcset arrays for multiple image formats
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.basePath - Base path for the images
 * @param {string} options.fileName - File name without extension
 * @param {number[]} options.widths - Array of widths to generate srcset for
 * @param {string[]} [options.formats=['jpg', 'webp', 'avif']] - Array of formats to generate
 * @returns {Object} Object with srcset strings for each format
 */
export const generateMultiFormatSrcset = ({
  basePath,
  fileName,
  widths,
  formats = ['jpg', 'webp', 'avif']
}) => {
  const result = {};
  
  formats.forEach(format => {
    result[format] = generateSrcset(basePath, fileName, format, widths);
  });
  
  return result;
};

/**
 * Parse a srcset string to get original widths
 * 
 * @param {string} srcset - Srcset attribute string to parse
 * @returns {number[]} Array of widths
 */
export const getSrcsetWidths = (srcset) => {
  if (!srcset) return [];
  
  return srcset
    .split(',')
    .map(entry => {
      const match = entry.trim().match(/\s(\d+)w$/);
      return match ? parseInt(match[1], 10) : null;
    })
    .filter(width => width !== null);
};

/**
 * Create a low-quality image placeholder URL
 * 
 * @param {string} originalSrc - Original image source
 * @param {number} [quality=10] - Quality percentage (1-100)
 * @param {number} [width=100] - Width of the placeholder in pixels
 * @returns {string} Placeholder image URL
 */
export const createLQIP = (originalSrc, quality = 10, width = 100) => {
  // For actual implementation, you'd need a server endpoint that
  // can generate these on the fly or have them pre-generated
  // This is a placeholder implementation that assumes a certain URL structure
  
  // Check if the URL already has query parameters
  const hasQuery = originalSrc.includes('?');
  const separator = hasQuery ? '&' : '?';
  
  return `${originalSrc}${separator}w=${width}&q=${quality}&lqip=true`;
};

/**
 * Creates a data URI for a colored box placeholder
 * 
 * @param {string} [color='#f0f0f0'] - CSS color for the placeholder
 * @param {number} [width=100] - Width in pixels
 * @param {number} [height=100] - Height in pixels
 * @returns {string} Data URI for a colored box
 */
export const createColorPlaceholder = (color = '#f0f0f0', width = 100, height = 100) => {
  // Create an SVG placeholder with the specified color
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="${color}"/>
    </svg>
  `.trim();
  
  // Convert to base64
  const encoded = typeof window !== 'undefined' 
    ? btoa(svg) 
    : Buffer.from(svg).toString('base64');
  
  return `data:image/svg+xml;base64,${encoded}`;
};

/**
 * Standard image breakpoints for responsive images
 * 
 * These are common width breakpoints that work well
 * for most responsive designs. Adjust as needed for your project.
 */
export const STANDARD_BREAKPOINTS = [
  360,  // Small phones
  480,  // Large phones
  768,  // Tablets
  1024, // Small laptops
  1366, // Laptops
  1600, // Desktops
  1920, // Large screens
  2560  // 4K and beyond
];

/**
 * Calculate appropriate image widths based on container size and density
 * 
 * @param {number} containerWidth - Width of the container in pixels
 * @param {number} [maxWidth=2560] - Maximum width to generate
 * @param {number[]} [pixelDensities=[1, 2]] - Pixel densities to support
 * @returns {number[]} Array of image widths
 */
export const calculateImageWidths = (
  containerWidth,
  maxWidth = 2560,
  pixelDensities = [1, 2]
) => {
  // Generate widths for each pixel density
  const widths = pixelDensities.map(density => 
    Math.min(containerWidth * density, maxWidth)
  );
  
  // Return sorted unique widths
  return [...new Set(widths)].sort((a, b) => a - b);
};

/**
 * Extract extension from a file path
 * 
 * @param {string} path - File path
 * @returns {string} File extension
 */
export const getFileExtension = (path) => {
  return path.split('.').pop().toLowerCase();
};

/**
 * Convert a file path to use a different extension
 * 
 * @param {string} path - Original file path
 * @param {string} newExtension - New extension to use
 * @returns {string} Updated file path
 */
export const replaceFileExtension = (path, newExtension) => {
  const extensionPattern = /\.[^/.]+$/;
  return path.replace(extensionPattern, `.${newExtension}`);
};