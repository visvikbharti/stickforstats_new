/**
 * PDF Parser Utility
 *
 * Extracts text content from PDF files using PDF.js library.
 * Handles multi-page documents and maintains paragraph structure.
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

import * as pdfjsLib from 'pdfjs-dist';

// Set worker source for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Extract text from a PDF file
 * @param {File} file - The PDF file to parse
 * @returns {Promise<Object>} - Extracted text and metadata
 */
export async function extractTextFromPDF(file) {
  try {
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    const numPages = pdf.numPages;
    const pages = [];
    let fullText = '';

    // Extract text from each page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Reconstruct text with proper spacing
      const pageText = reconstructPageText(textContent);

      pages.push({
        pageNumber: pageNum,
        text: pageText,
        charCount: pageText.length
      });

      fullText += pageText + '\n\n';
    }

    // Extract metadata
    const metadata = await pdf.getMetadata().catch(() => ({}));

    return {
      success: true,
      filename: file.name,
      fileSize: file.size,
      numPages,
      pages,
      fullText: fullText.trim(),
      metadata: {
        title: metadata?.info?.Title || extractTitleFromText(fullText),
        author: metadata?.info?.Author || 'Unknown',
        subject: metadata?.info?.Subject || '',
        keywords: metadata?.info?.Keywords || '',
        creator: metadata?.info?.Creator || '',
        creationDate: metadata?.info?.CreationDate || ''
      },
      statistics: {
        wordCount: countWords(fullText),
        charCount: fullText.length,
        paragraphCount: countParagraphs(fullText),
        sentenceCount: countSentences(fullText)
      }
    };
  } catch (error) {
    console.error('PDF parsing error:', error);
    return {
      success: false,
      error: error.message || 'Failed to parse PDF',
      filename: file.name
    };
  }
}

/**
 * Reconstruct page text with proper spacing and line breaks
 * @param {Object} textContent - PDF.js text content object
 * @returns {string} - Reconstructed text
 */
function reconstructPageText(textContent) {
  const items = textContent.items;
  if (!items || items.length === 0) return '';

  let text = '';
  let lastY = null;
  let lastX = null;

  for (const item of items) {
    const currentY = item.transform[5];
    const currentX = item.transform[4];

    if (lastY !== null) {
      // Check for line break (significant Y change)
      const yDiff = Math.abs(currentY - lastY);

      if (yDiff > 12) {
        // Paragraph break
        text += '\n\n';
      } else if (yDiff > 2) {
        // Line break
        text += '\n';
      } else if (lastX !== null && currentX - lastX > 20) {
        // Large horizontal gap - add space
        text += ' ';
      }
    }

    text += item.str;
    lastY = currentY;
    lastX = currentX + (item.width || 0);
  }

  return cleanText(text);
}

/**
 * Clean extracted text
 * @param {string} text - Raw extracted text
 * @returns {string} - Cleaned text
 */
function cleanText(text) {
  return text
    // Normalize whitespace
    .replace(/[ \t]+/g, ' ')
    // Remove multiple line breaks (more than 2)
    .replace(/\n{3,}/g, '\n\n')
    // Fix common ligatures
    .replace(/ﬁ/g, 'fi')
    .replace(/ﬂ/g, 'fl')
    .replace(/ﬀ/g, 'ff')
    .replace(/ﬃ/g, 'ffi')
    .replace(/ﬄ/g, 'ffl')
    // Remove null characters
    .replace(/\x00/g, '')
    // Trim each line
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .trim();
}

/**
 * Extract title from text (first significant line)
 * @param {string} text - Full text
 * @returns {string} - Extracted title
 */
function extractTitleFromText(text) {
  const lines = text.split('\n').filter(line => line.trim().length > 10);
  if (lines.length > 0) {
    // Return first substantial line, truncated to 200 chars
    return lines[0].substring(0, 200);
  }
  return 'Unknown Title';
}

/**
 * Count words in text
 * @param {string} text - Text to count
 * @returns {number} - Word count
 */
function countWords(text) {
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Count paragraphs in text
 * @param {string} text - Text to count
 * @returns {number} - Paragraph count
 */
function countParagraphs(text) {
  return text.split(/\n\n+/).filter(para => para.trim().length > 0).length;
}

/**
 * Count sentences in text
 * @param {string} text - Text to count
 * @returns {number} - Sentence count
 */
function countSentences(text) {
  // Match sentence-ending punctuation followed by space or end
  const sentences = text.match(/[^.!?]+[.!?]+/g);
  return sentences ? sentences.length : 0;
}

/**
 * Extract specific sections from paper text
 * @param {string} text - Full paper text
 * @returns {Object} - Extracted sections
 */
export function extractSections(text) {
  const sections = {
    abstract: '',
    introduction: '',
    methods: '',
    results: '',
    discussion: '',
    references: '',
    other: ''
  };

  // Common section headers (case-insensitive)
  const sectionPatterns = {
    abstract: /\b(abstract|summary)\b/i,
    introduction: /\b(introduction|background)\b/i,
    methods: /\b(method|materials?\s*(?:and|&)\s*methods?|methodology|procedures?|participants?|subjects?|design)\b/i,
    results: /\b(results?|findings?)\b/i,
    discussion: /\b(discussion|conclusions?|implications?)\b/i,
    references: /\b(references?|bibliography|literature\s*cited|works\s*cited)\b/i
  };

  // Split text into potential sections
  const lines = text.split('\n');
  let currentSection = 'other';
  let sectionText = '';

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Check if line is a section header
    let foundSection = false;
    for (const [section, pattern] of Object.entries(sectionPatterns)) {
      // Section headers are typically short (< 50 chars) and match pattern
      if (trimmedLine.length < 50 && pattern.test(trimmedLine)) {
        // Save previous section
        if (sectionText.trim()) {
          sections[currentSection] += sectionText;
        }
        currentSection = section;
        sectionText = '';
        foundSection = true;
        break;
      }
    }

    if (!foundSection) {
      sectionText += line + '\n';
    }
  }

  // Save last section
  if (sectionText.trim()) {
    sections[currentSection] += sectionText;
  }

  // Clean up each section
  for (const key of Object.keys(sections)) {
    sections[key] = sections[key].trim();
  }

  return sections;
}

/**
 * Check if file is a valid PDF
 * @param {File} file - File to check
 * @returns {boolean} - True if valid PDF
 */
export function isValidPDF(file) {
  // Check MIME type
  if (file.type === 'application/pdf') return true;

  // Check file extension
  if (file.name.toLowerCase().endsWith('.pdf')) return true;

  return false;
}

/**
 * Get file size in human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} - Human-readable size
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default {
  extractTextFromPDF,
  extractSections,
  isValidPDF,
  formatFileSize
};
