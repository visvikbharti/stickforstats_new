import { useState, useCallback } from 'react';

/**
 * Hook for converting images to WebP format on the client side
 * 
 * @returns {Object} Functions and state for image conversion
 */
const useImageConverter = () => {
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);

  /**
   * Convert an image to WebP format
   * 
   * @param {string|File} source - The image source (URL or File object)
   * @param {Object} options - Conversion options
   * @param {number} [options.quality=0.8] - Quality of the WebP image (0-1)
   * @param {number} [options.maxWidth] - Maximum width of the output image
   * @param {number} [options.maxHeight] - Maximum height of the output image
   * @returns {Promise<string>} A promise that resolves to a data URL of the WebP image
   */
  const convertToWebP = useCallback(async (source, options = {}) => {
    try {
      setIsConverting(true);
      setProgress(0);

      const {
        quality = 0.8,
        maxWidth,
        maxHeight,
      } = options;

      // Create a blob URL if source is a File
      const url = source instanceof File
        ? URL.createObjectURL(source)
        : source;

      // Load the image
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          setProgress(0.3);
          resolve(img);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = url;
      });

      // Calculate dimensions
      let width = image.naturalWidth;
      let height = image.naturalHeight;

      if (maxWidth && width > maxWidth) {
        const ratio = maxWidth / width;
        width = maxWidth;
        height = height * ratio;
      }

      if (maxHeight && height > maxHeight) {
        const ratio = maxHeight / height;
        height = maxHeight;
        width = width * ratio;
      }

      setProgress(0.5);

      // Create a canvas and draw the image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, width, height);

      setProgress(0.7);

      // Convert to WebP
      const webpDataUrl = canvas.toDataURL('image/webp', quality);

      setProgress(1);
      setIsConverting(false);

      // Cleanup if blob URL was created
      if (source instanceof File) {
        URL.revokeObjectURL(url);
      }

      return webpDataUrl;
    } catch (error) {
      setIsConverting(false);
      console.error('Error converting image to WebP:', error);
      throw error;
    }
  }, []);

  /**
   * Generate srcset attribute for responsive images
   * 
   * @param {string} basePath - Base path of the image
   * @param {string} filename - Filename without extension
   * @param {string} ext - File extension
   * @param {number[]} widths - Array of widths for srcset
   * @returns {string} Formatted srcset attribute
   */
  const generateSrcSet = useCallback((basePath, filename, ext, widths) => {
    return widths
      .map(width => `${basePath}/${filename}-${width}w.${ext} ${width}w`)
      .join(', ');
  }, []);

  return {
    convertToWebP,
    generateSrcSet,
    isConverting,
    progress,
  };
};

export default useImageConverter;