/**
 * Type definitions for DataUploader component
 * 
 * Maintains scientific accuracy and type safety for all data upload operations.
 * Zero tolerance for type ambiguity.
 */

import { DatasetProfile } from '../../types/api.types';

// ============================================================
// Component Props
// ============================================================

export interface DataUploaderProps {
  /**
   * Callback when upload completes successfully
   */
  onUploadComplete?: (profile: DatasetProfile) => void;
  
  /**
   * Callback when an error occurs
   */
  onError?: (error: DataUploaderError) => void;
  
  /**
   * Maximum file size in bytes (default: 500MB)
   */
  maxFileSize?: number;
  
  /**
   * Accepted file formats
   */
  acceptedFormats?: FileFormat[];
  
  /**
   * Show preview of uploaded data
   */
  showPreview?: boolean;
  
  /**
   * Number of preview rows to show
   */
  previewRows?: number;
  
  /**
   * Automatically start profiling after upload
   */
  autoProfile?: boolean;
  
  /**
   * Allow multiple file uploads
   */
  multiple?: boolean;
  
  /**
   * Show educational tooltips
   */
  showEducationalContent?: boolean;
  
  /**
   * Custom upload endpoint (for enterprise)
   */
  customEndpoint?: string;
}

// ============================================================
// File Types
// ============================================================

export type FileFormat = 'csv' | 'xlsx' | 'xls' | 'json' | 'parquet' | 'tsv' | 'txt';

export interface FileValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata: FileMetadata;
}

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  format: FileFormat | null;
  encoding?: string;
  delimiter?: string;
  hasHeaders?: boolean;
  rowCount?: number;
  columnCount?: number;
}

// ============================================================
// Upload State
// ============================================================

export interface UploadState {
  status: UploadStatus;
  progress: number;
  file: File | null;
  metadata: FileMetadata | null;
  preview: DataPreview | null;
  error: DataUploaderError | null;
  warnings: string[];
  startTime: number | null;
  endTime: number | null;
  bytesUploaded: number;
  totalBytes: number;
  uploadSpeed: number; // bytes per second
  estimatedTimeRemaining: number; // seconds
}

export type UploadStatus = 
  | 'idle'
  | 'validating'
  | 'reading'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'error'
  | 'cancelled';

// ============================================================
// Data Preview
// ============================================================

export interface DataPreview {
  headers: string[];
  rows: any[][];
  totalRows: number;
  totalColumns: number;
  truncated: boolean;
  dataTypes: DataTypeInference[];
  missingSummary: MissingSummary;
  encoding: string;
  delimiter?: string;
}

export interface DataTypeInference {
  column: string;
  inferredType: 'numeric' | 'categorical' | 'date' | 'boolean' | 'text' | 'mixed';
  confidence: number;
  uniqueCount: number;
  nullCount: number;
  examples: any[];
}

export interface MissingSummary {
  totalMissing: number;
  missingByColumn: Record<string, number>;
  missingPercentage: number;
  pattern: 'MCAR' | 'MAR' | 'MNAR' | 'NONE';
}

// ============================================================
// Error Handling
// ============================================================

export interface DataUploaderError {
  code: ErrorCode;
  message: string;
  details?: string;
  recoverable: boolean;
  userAction?: string;
  timestamp: string;
}

export type ErrorCode =
  | 'FILE_TOO_LARGE'
  | 'INVALID_FORMAT'
  | 'CORRUPT_FILE'
  | 'ENCODING_ERROR'
  | 'NETWORK_ERROR'
  | 'SERVER_ERROR'
  | 'VALIDATION_ERROR'
  | 'PERMISSION_DENIED'
  | 'QUOTA_EXCEEDED'
  | 'TIMEOUT'
  | 'UNKNOWN';

// ============================================================
// Validation Rules
// ============================================================

export interface ValidationRules {
  maxFileSize: number;
  acceptedFormats: FileFormat[];
  minRows: number;
  maxRows: number;
  minColumns: number;
  maxColumns: number;
  requireHeaders: boolean;
  allowEmpty: boolean;
  encoding: string[];
  customValidators?: CustomValidator[];
}

export interface CustomValidator {
  name: string;
  validate: (file: File, preview?: DataPreview) => Promise<ValidationResult>;
}

export interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================
// Progress Tracking
// ============================================================

export interface UploadProgress {
  phase: 'validation' | 'reading' | 'uploading' | 'processing';
  percent: number;
  bytesProcessed: number;
  totalBytes: number;
  message: string;
  estimatedTimeRemaining?: number;
}

// ============================================================
// Chunked Upload
// ============================================================

export interface ChunkMetadata {
  chunkIndex: number;
  totalChunks: number;
  chunkSize: number;
  offset: number;
  checksum: string;
}

export interface ChunkedUploadState {
  uploadId: string;
  chunks: ChunkMetadata[];
  completedChunks: number[];
  failedChunks: number[];
  retryCount: Record<number, number>;
  maxRetries: number;
}

// ============================================================
// UI State
// ============================================================

export interface DataUploaderUIState {
  isDragging: boolean;
  isValidatingFile: boolean;
  showPreview: boolean;
  showAdvancedOptions: boolean;
  selectedEncoding: string;
  selectedDelimiter: string;
  hasHeaders: boolean;
  skipRows: number;
  sampleSize: number;
}

// ============================================================
// Configuration
// ============================================================

export interface DataUploaderConfig {
  maxFileSize: number; // bytes
  chunkSize: number; // bytes for chunked upload
  acceptedFormats: FileFormat[];
  previewRows: number;
  timeout: number; // milliseconds
  retryAttempts: number;
  retryDelay: number; // milliseconds
  enableChunkedUpload: boolean;
  enableCompression: boolean;
  validateOnClient: boolean;
  autoDetectEncoding: boolean;
  autoDetectDelimiter: boolean;
}

// ============================================================
// Constants
// ============================================================

export const DEFAULT_CONFIG: DataUploaderConfig = {
  maxFileSize: 500 * 1024 * 1024, // 500MB
  chunkSize: 5 * 1024 * 1024, // 5MB chunks
  acceptedFormats: ['csv', 'xlsx', 'xls', 'json', 'tsv'],
  previewRows: 100,
  timeout: 300000, // 5 minutes
  retryAttempts: 3,
  retryDelay: 1000,
  enableChunkedUpload: true,
  enableCompression: false,
  validateOnClient: true,
  autoDetectEncoding: true,
  autoDetectDelimiter: true,
};

export const FILE_FORMAT_EXTENSIONS: Record<FileFormat, string[]> = {
  csv: ['.csv'],
  xlsx: ['.xlsx'],
  xls: ['.xls'],
  json: ['.json'],
  parquet: ['.parquet'],
  tsv: ['.tsv', '.tab'],
  txt: ['.txt'],
};

export const MIME_TYPES: Record<FileFormat, string[]> = {
  csv: ['text/csv', 'application/csv'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  xls: ['application/vnd.ms-excel'],
  json: ['application/json'],
  parquet: ['application/octet-stream'],
  tsv: ['text/tab-separated-values'],
  txt: ['text/plain'],
};

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  FILE_TOO_LARGE: 'File size exceeds the maximum allowed limit',
  INVALID_FORMAT: 'File format is not supported',
  CORRUPT_FILE: 'File appears to be corrupted or unreadable',
  ENCODING_ERROR: 'Unable to detect file encoding',
  NETWORK_ERROR: 'Network connection error',
  SERVER_ERROR: 'Server processing error',
  VALIDATION_ERROR: 'File validation failed',
  PERMISSION_DENIED: 'You do not have permission to upload files',
  QUOTA_EXCEEDED: 'Storage quota exceeded',
  TIMEOUT: 'Upload timeout - file may be too large',
  UNKNOWN: 'An unknown error occurred',
};