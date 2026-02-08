/**
 * Publication Export Utilities
 *
 * Extends existing ExportUtils with PDF, clipboard, and DPI-aware export.
 * Uses jsPDF and save-svg-as-png (both already in package.json).
 */

import { saveSvgAsPng } from 'save-svg-as-png';
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';

/**
 * Prepare SVG element for export by inlining styles
 */
const prepareSvg = (svgElement) => {
  const clone = svgElement.cloneNode(true);
  if (!clone.getAttribute('xmlns')) {
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }
  // Remove interactive-only elements
  const noExport = clone.querySelectorAll('[data-no-export="true"]');
  noExport.forEach(el => el.remove());

  // Inline computed font styles for text elements
  const texts = svgElement.querySelectorAll('text');
  const cloneTexts = clone.querySelectorAll('text');
  texts.forEach((original, i) => {
    if (cloneTexts[i]) {
      const computed = window.getComputedStyle(original);
      cloneTexts[i].style.fontFamily = computed.fontFamily;
      cloneTexts[i].style.fontSize = computed.fontSize;
      cloneTexts[i].style.fontWeight = computed.fontWeight;
      cloneTexts[i].style.fill = computed.fill;
    }
  });

  return clone;
};

/**
 * Convert SVG element to a data URL image
 */
const svgToImage = (svgElement, width, height) => {
  return new Promise((resolve, reject) => {
    const clone = prepareSvg(svgElement);
    const svgString = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
};

/**
 * Export SVG as a vector file
 */
export const exportSvg = (svgElement, filename = 'figure.svg') => {
  const clone = prepareSvg(svgElement);
  const svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    new XMLSerializer().serializeToString(clone);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  saveAs(blob, filename);
};

/**
 * Export as PNG at specified DPI
 */
export const exportPng = async (svgElement, options = {}) => {
  const { dpi = 300, filename = 'figure.png' } = options;
  const scale = dpi / 96; // SVG renders at 96 DPI
  try {
    await saveSvgAsPng(svgElement, filename, {
      scale,
      backgroundColor: '#ffffff',
      encoderOptions: 1,
    });
  } catch (err) {
    console.error('PNG export failed:', err);
    throw err;
  }
};

/**
 * Export as PDF with exact dimensions
 */
export const exportPdf = async (svgElement, options = {}) => {
  const {
    widthInches = 6.5,
    heightInches = 4.5,
    dpi = 300,
    filename = 'figure.pdf',
  } = options;

  const pixelWidth = widthInches * dpi;
  const pixelHeight = heightInches * dpi;

  try {
    const img = await svgToImage(svgElement, pixelWidth, pixelHeight);

    const canvas = document.createElement('canvas');
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pixelWidth, pixelHeight);
    ctx.drawImage(img, 0, 0, pixelWidth, pixelHeight);

    const imgData = canvas.toDataURL('image/png', 1.0);
    const orientation = widthInches > heightInches ? 'landscape' : 'portrait';
    const pdf = new jsPDF({
      orientation,
      unit: 'in',
      format: [widthInches, heightInches],
    });
    pdf.addImage(imgData, 'PNG', 0, 0, widthInches, heightInches);
    pdf.save(filename);
  } catch (err) {
    console.error('PDF export failed:', err);
    throw err;
  }
};

/**
 * Copy chart to clipboard as PNG
 */
export const copyToClipboard = async (svgElement, options = {}) => {
  const { dpi = 150 } = options;
  const scale = dpi / 96;

  try {
    const width = svgElement.width?.baseVal?.value || svgElement.clientWidth || 800;
    const height = svgElement.height?.baseVal?.value || svgElement.clientHeight || 600;

    const img = await svgToImage(svgElement, width * scale, height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob }),
    ]);
    return true;
  } catch (err) {
    console.error('Clipboard copy failed:', err);
    throw err;
  }
};

/**
 * Universal export dispatcher
 */
export const exportChart = async (svgElement, format, options = {}) => {
  switch (format) {
    case 'svg':
      return exportSvg(svgElement, options.filename);
    case 'png':
      return exportPng(svgElement, options);
    case 'pdf':
      return exportPdf(svgElement, options);
    case 'clipboard':
      return copyToClipboard(svgElement, options);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
};
