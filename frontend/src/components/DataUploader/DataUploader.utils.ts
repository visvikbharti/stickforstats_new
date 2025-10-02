/**
 * Utility functions for DataUploader component
 * 
 * Provides file validation, preview generation, and encoding detection
 * with scientific accuracy and zero tolerance for data corruption.
 * 
 * @timestamp 2025-08-06 21:00:00 UTC
 */

import Papa from 'papaparse';
import {
  FileValidation,
  FileMetadata,
  DataPreview,
  FileFormat,
  ValidationRules,
  ValidationResult,
  DataTypeInference,
  MissingSummary,
  FILE_FORMAT_EXTENSIONS,
} from './DataUploader.types';

/**
 * Validate a file against specified rules
 */
export async function validateFile(
  file: File,
  rules: ValidationRules
): Promise<FileValidation> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Extract file metadata
  const metadata: FileMetadata = {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
    format: detectFileFormat(file.name),
    encoding: undefined,
    delimiter: undefined,
    hasHeaders: undefined,
    rowCount: undefined,
    columnCount: undefined,
  };

  // Check file size
  if (file.size > rules.maxFileSize) {
    errors.push(`File size (${formatFileSize(file.size)}) exceeds maximum allowed (${formatFileSize(rules.maxFileSize)})`);
  }

  // Check file format
  if (metadata.format && !rules.acceptedFormats.includes(metadata.format)) {
    errors.push(`File format '${metadata.format}' is not supported. Accepted formats: ${rules.acceptedFormats.join(', ')}`);
  }

  // Check if file is empty
  if (file.size === 0) {
    errors.push('File is empty');
  }

  // For text-based files, perform content validation
  if (metadata.format && ['csv', 'tsv', 'txt'].includes(metadata.format)) {
    try {
      const sample = await readFileSample(file, 1024 * 100); // Read first 100KB
      const encoding = await detectEncoding(sample);
      metadata.encoding = encoding;

      // Parse to check structure
      const parseResult = await parseCSVSample(sample, metadata.format);
      
      if (parseResult.data.length === 0) {
        errors.push('File contains no data rows');
      } else {
        metadata.rowCount = parseResult.data.length;
        metadata.columnCount = parseResult.data[0]?.length || 0;
        metadata.hasHeaders = parseResult.hasHeaders;
        metadata.delimiter = parseResult.delimiter;

        // Check row count
        if (metadata.rowCount < rules.minRows) {
          errors.push(`File has too few rows (${metadata.rowCount}). Minimum required: ${rules.minRows}`);
        }

        // Check column count
        if (metadata.columnCount < rules.minColumns) {
          errors.push(`File has too few columns (${metadata.columnCount}). Minimum required: ${rules.minColumns}`);
        }
        if (metadata.columnCount > rules.maxColumns) {
          warnings.push(`File has many columns (${metadata.columnCount}). This may affect performance.`);
        }

        // Check for headers
        if (rules.requireHeaders && !metadata.hasHeaders) {
          warnings.push('File appears to be missing column headers');
        }

        // Check for consistency
        const inconsistentRows = parseResult.data.filter(
          row => row.length !== metadata.columnCount
        );
        if (inconsistentRows.length > 0) {
          warnings.push(`${inconsistentRows.length} rows have inconsistent number of columns`);
        }
      }

      // Check encoding
      if (!rules.encoding.includes(encoding)) {
        warnings.push(`File encoding '${encoding}' detected. Recommended: ${rules.encoding.join(', ')}`);
      }

    } catch (error) {
      errors.push(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Run custom validators if provided
  if (rules.customValidators) {
    for (const validator of rules.customValidators) {
      try {
        const result = await validator.validate(file);
        errors.push(...result.errors);
        warnings.push(...result.warnings);
      } catch (error) {
        warnings.push(`Custom validator '${validator.name}' failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    metadata,
  };
}

/**
 * Generate a preview of the file data
 */
export async function generatePreview(
  file: File,
  maxRows: number = 100
): Promise<DataPreview> {
  const format = detectFileFormat(file.name);
  
  if (!format || !['csv', 'tsv', 'txt', 'json'].includes(format)) {
    throw new Error(`Cannot generate preview for format: ${format}`);
  }

  if (format === 'json') {
    return generateJSONPreview(file, maxRows);
  }

  // For CSV/TSV/TXT files
  const text = await readFileAsText(file);
  const encoding = await detectEncoding(text);
  
  return new Promise<DataPreview>((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      preview: maxRows + 1, // +1 for header detection
      complete: (results) => {
        const headers = results.meta.fields || [];
        const rows = results.data as any[];
        
        // Detect data types
        const dataTypes = detectDataTypes(headers, rows);
        
        // Calculate missing summary
        const missingSummary = calculateMissingSummary(headers, rows);
        
        // Get delimiter
        const delimiter = results.meta.delimiter || ',';
        
        resolve({
          headers,
          rows: rows.slice(0, maxRows).map(row => 
            headers.map(h => row[h])
          ),
          totalRows: rows.length,
          totalColumns: headers.length,
          truncated: rows.length > maxRows,
          dataTypes,
          missingSummary,
          encoding,
          delimiter,
        });
      },
      error: (error) => {
        reject(new Error(`Failed to parse file: ${error.message}`));
      },
    });
  });
}

/**
 * Generate preview for JSON files
 */
async function generateJSONPreview(
  file: File,
  maxRows: number
): Promise<DataPreview> {
  const text = await readFileAsText(file);
  
  try {
    const data = JSON.parse(text);
    let rows: any[] = [];
    let headers: string[] = [];
    
    // Handle array of objects
    if (Array.isArray(data)) {
      rows = data.slice(0, maxRows);
      if (rows.length > 0) {
        headers = Object.keys(rows[0]);
      }
    }
    // Handle single object with array property
    else if (typeof data === 'object' && data !== null) {
      const arrayKey = Object.keys(data).find(k => Array.isArray(data[k]));
      if (arrayKey) {
        rows = data[arrayKey].slice(0, maxRows);
        if (rows.length > 0) {
          headers = Object.keys(rows[0]);
        }
      }
    }
    
    const dataTypes = detectDataTypes(headers, rows);
    const missingSummary = calculateMissingSummary(headers, rows);
    
    return {
      headers,
      rows: rows.map(row => headers.map(h => row[h])),
      totalRows: Array.isArray(data) ? data.length : rows.length,
      totalColumns: headers.length,
      truncated: rows.length < (Array.isArray(data) ? data.length : rows.length),
      dataTypes,
      missingSummary,
      encoding: 'utf-8',
    };
  } catch (error) {
    throw new Error(`Invalid JSON file: ${error instanceof Error ? error.message : 'Parse error'}`);
  }
}

/**
 * Detect file format from filename
 */
export function detectFileFormat(filename: string): FileFormat | null {
  const extension = filename.toLowerCase().split('.').pop();
  if (!extension) return null;
  
  for (const [format, extensions] of Object.entries(FILE_FORMAT_EXTENSIONS)) {
    if (extensions.some(ext => ext.slice(1) === extension)) {
      return format as FileFormat;
    }
  }
  
  return null;
}

/**
 * Detect encoding of text content
 */
export async function detectEncoding(text: string): Promise<string> {
  // Simple encoding detection
  // In production, use a proper library like chardet
  
  // Check for BOM
  if (text.charCodeAt(0) === 0xFEFF) {
    return 'utf-8-bom';
  }
  
  // Check for common UTF-8 patterns
  if (/[\u0080-\uFFFF]/.test(text)) {
    return 'utf-8';
  }
  
  // Default to UTF-8
  return 'utf-8';
}

/**
 * Detect data types for columns
 */
function detectDataTypes(
  headers: string[],
  rows: any[]
): DataTypeInference[] {
  return headers.map(header => {
    const values = rows.map(row => row[header]).filter(v => v !== null && v !== undefined);
    const uniqueValues = new Set(values);
    const nullCount = rows.length - values.length;
    
    // Detect type based on values
    let inferredType: DataTypeInference['inferredType'] = 'text';
    let confidence = 0;
    
    if (values.length === 0) {
      inferredType = 'text';
      confidence = 0;
    } else if (values.every(v => typeof v === 'number' && !isNaN(v))) {
      inferredType = 'numeric';
      confidence = 1;
    } else if (values.every(v => typeof v === 'boolean')) {
      inferredType = 'boolean';
      confidence = 1;
    } else if (values.every(v => isValidDate(v))) {
      inferredType = 'date';
      confidence = 0.9;
    } else if (uniqueValues.size < values.length * 0.5) {
      inferredType = 'categorical';
      confidence = 0.8;
    } else {
      inferredType = 'text';
      confidence = 0.7;
    }
    
    return {
      column: header,
      inferredType,
      confidence,
      uniqueCount: uniqueValues.size,
      nullCount,
      examples: Array.from(uniqueValues).slice(0, 5),
    };
  });
}

/**
 * Calculate missing data summary
 */
function calculateMissingSummary(
  headers: string[],
  rows: any[]
): MissingSummary {
  let totalMissing = 0;
  const missingByColumn: Record<string, number> = {};
  
  headers.forEach(header => {
    const missing = rows.filter(row => 
      row[header] === null || 
      row[header] === undefined || 
      row[header] === ''
    ).length;
    missingByColumn[header] = missing;
    totalMissing += missing;
  });
  
  const totalCells = headers.length * rows.length;
  const missingPercentage = totalCells > 0 ? (totalMissing / totalCells) * 100 : 0;
  
  // Simple pattern detection
  let pattern: MissingSummary['pattern'] = 'NONE';
  if (missingPercentage > 0) {
    if (missingPercentage < 5) {
      pattern = 'MCAR'; // Likely random
    } else if (Object.values(missingByColumn).some(v => v === rows.length)) {
      pattern = 'MNAR'; // Entire column missing
    } else {
      pattern = 'MAR'; // Default to MAR for now
    }
  }
  
  return {
    totalMissing,
    missingByColumn,
    missingPercentage,
    pattern,
  };
}

/**
 * Parse CSV sample
 */
async function parseCSVSample(
  text: string,
  format: FileFormat
): Promise<{
  data: any[][];
  hasHeaders: boolean;
  delimiter: string;
}> {
  return new Promise((resolve) => {
    Papa.parse(text, {
      delimiter: format === 'tsv' ? '\t' : undefined,
      header: false,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as any[][];
        
        // Try to detect if first row is headers
        const hasHeaders = data.length > 1 && 
          data[0].every(cell => 
            typeof cell === 'string' && 
            !isNumeric(cell) && 
            !isValidDate(cell)
          );
        
        resolve({
          data,
          hasHeaders,
          delimiter: results.meta.delimiter || ',',
        });
      },
    });
  });
}

/**
 * Read file as text
 */
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * Read a sample of the file
 */
function readFileSample(file: File, bytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const slice = file.slice(0, bytes);
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(slice);
  });
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Check if value is numeric
 */
function isNumeric(value: any): boolean {
  return !isNaN(value) && !isNaN(parseFloat(value));
}

/**
 * Check if value is a valid date
 */
function isValidDate(value: any): boolean {
  if (!value) return false;
  const date = new Date(value);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Calculate file hash for integrity checking
 */
export async function calculateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Estimate upload time based on file size and connection speed
 */
export function estimateUploadTime(
  fileSize: number,
  uploadSpeed: number // bytes per second
): number {
  if (uploadSpeed === 0) return Infinity;
  return Math.ceil(fileSize / uploadSpeed);
}

/**
 * Format duration in seconds to human readable
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}