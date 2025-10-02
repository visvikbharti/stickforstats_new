/**
 * DataUploader Component
 * 
 * Enterprise-grade file upload component with intelligent profiling integration.
 * Connects directly to our Django backend profiling engine.
 * 
 * @timestamp 2025-08-06 20:45:00 UTC
 * @scientific-rigor ABSOLUTE
 * @zero-compromises TRUE
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  LinearProgress,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  InsertDriveFile as FileIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Science as ScienceIcon,
  Analytics as AnalyticsIcon,
} from '@mui/icons-material';

// Redux imports
import { useAppDispatch, useAppSelector } from '../../store';
import {
  uploadDataset,
  setCurrentFile,
  clearError,
  selectCurrentDataset,
  selectUploadProgress,
  selectIsUploading,
  selectDatasetError,
} from '../../store/slices/datasetSlice';
import {
  setWorkflowStep,
  nextWorkflowStep,
} from '../../store/slices/analysisSlice';
import {
  addNotification,
  showSuccessNotification,
  showErrorNotification,
  selectShowEducationalContent,
} from '../../store/slices/uiSlice';

// Type imports
import {
  DataUploaderProps,
  FileValidation,
  FileMetadata,
  DataPreview,
  UploadState,
  UploadStatus,
  DataUploaderError,
  ErrorCode,
  DEFAULT_CONFIG,
  FILE_FORMAT_EXTENSIONS,
  MIME_TYPES,
  ERROR_MESSAGES,
} from './DataUploader.types';

// Utility imports
import { validateFile, generatePreview, detectEncoding } from './DataUploader.utils';

/**
 * DataUploader Component
 * 
 * Handles file upload with scientific accuracy and enterprise-grade reliability.
 */
const DataUploader: React.FC<DataUploaderProps> = ({
  onUploadComplete,
  onError,
  maxFileSize = DEFAULT_CONFIG.maxFileSize,
  acceptedFormats = DEFAULT_CONFIG.acceptedFormats,
  showPreview = true,
  previewRows = DEFAULT_CONFIG.previewRows,
  autoProfile = true,
  multiple = false,
  showEducationalContent: propShowEducational,
  customEndpoint,
}) => {
  // Redux state
  const dispatch = useAppDispatch();
  const currentDataset = useAppSelector(selectCurrentDataset);
  const uploadProgress = useAppSelector(selectUploadProgress);
  const isUploading = useAppSelector(selectIsUploading);
  const uploadError = useAppSelector(selectDatasetError);
  const globalShowEducational = useAppSelector(selectShowEducationalContent);
  
  // Determine if we should show educational content
  const showEducational = propShowEducational ?? globalShowEducational;

  // Component state
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
    file: null,
    metadata: null,
    preview: null,
    error: null,
    warnings: [],
    startTime: null,
    endTime: null,
    bytesUploaded: 0,
    totalBytes: 0,
    uploadSpeed: 0,
    estimatedTimeRemaining: 0,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [showPreviewPanel, setShowPreviewPanel] = useState(false);
  const [showValidationDetails, setShowValidationDetails] = useState(false);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const uploadStartTime = useRef<number | null>(null);

  /**
   * Handle file selection from input
   */
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0]; // Handle single file for now
    await processFile(file);
  }, []);

  /**
   * Process selected file
   */
  const processFile = async (file: File) => {
    // Clear previous errors
    dispatch(clearError());
    
    // Update state to validating
    setUploadState(prev => ({
      ...prev,
      status: 'validating',
      file,
      error: null,
      warnings: [],
    }));

    try {
      // Validate file
      const validation = await validateFile(file, {
        maxFileSize,
        acceptedFormats,
        minRows: 2,
        maxRows: 1000000,
        minColumns: 1,
        maxColumns: 10000,
        requireHeaders: true,
        allowEmpty: false,
        encoding: ['utf-8', 'latin-1'],
      });

      if (!validation.isValid) {
        throw new Error(validation.errors.join('; '));
      }

      // Generate preview if requested
      let preview: DataPreview | null = null;
      if (showPreview) {
        setUploadState(prev => ({ ...prev, status: 'reading' }));
        preview = await generatePreview(file, previewRows);
        setShowPreviewPanel(true);
      }

      // Update state with validation results
      setUploadState(prev => ({
        ...prev,
        status: 'idle',
        metadata: validation.metadata,
        preview,
        warnings: validation.warnings,
      }));

      // Store file in Redux
      dispatch(setCurrentFile(file));

      // Auto-upload if configured
      if (autoProfile) {
        await handleUpload(file);
      }

    } catch (error) {
      const errorObj: DataUploaderError = {
        code: 'VALIDATION_ERROR',
        message: error instanceof Error ? error.message : 'File validation failed',
        recoverable: true,
        userAction: 'Please check your file and try again',
        timestamp: new Date().toISOString(),
      };

      setUploadState(prev => ({
        ...prev,
        status: 'error',
        error: errorObj,
      }));

      if (onError) {
        onError(errorObj);
      }

      dispatch(showErrorNotification('File Validation Failed', errorObj.message));
    }
  };

  /**
   * Handle file upload to backend
   */
  const handleUpload = async (file?: File) => {
    const fileToUpload = file || uploadState.file;
    if (!fileToUpload) {
      dispatch(showErrorNotification('No File Selected', 'Please select a file to upload'));
      return;
    }

    // Record start time
    uploadStartTime.current = Date.now();
    
    setUploadState(prev => ({
      ...prev,
      status: 'uploading',
      startTime: Date.now(),
      progress: 0,
    }));

    try {
      // Dispatch upload action
      const result = await (dispatch as any)(uploadDataset({
        file: fileToUpload,
        name: fileToUpload.name,
        targetVariable: undefined, // Can be set later
      })).unwrap();

      // Update state on success
      setUploadState(prev => ({
        ...prev,
        status: 'completed',
        progress: 100,
        endTime: Date.now(),
      }));

      // Show success notification
      dispatch(showSuccessNotification(
        'Upload Complete',
        `File processed in ${result.processing_time_ms}ms`
      ));

      // Move to next workflow step
      dispatch(nextWorkflowStep());

      // Call callback if provided
      if (onUploadComplete && result.profile) {
        onUploadComplete(result.profile);
      }

    } catch (error) {
      const errorObj: DataUploaderError = {
        code: 'SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Upload failed',
        recoverable: true,
        userAction: 'Please try again or contact support if the problem persists',
        timestamp: new Date().toISOString(),
      };

      setUploadState(prev => ({
        ...prev,
        status: 'error',
        error: errorObj,
        endTime: Date.now(),
      }));

      if (onError) {
        onError(errorObj);
      }
    }
  };

  /**
   * Handle drag and drop events
   */
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  /**
   * Clear current file
   */
  const handleClear = () => {
    setUploadState({
      status: 'idle',
      progress: 0,
      file: null,
      metadata: null,
      preview: null,
      error: null,
      warnings: [],
      startTime: null,
      endTime: null,
      bytesUploaded: 0,
      totalBytes: 0,
      uploadSpeed: 0,
      estimatedTimeRemaining: 0,
    });
    setShowPreviewPanel(false);
    dispatch(setCurrentFile(null));
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Format file size for display
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  /**
   * Get status icon
   */
  const getStatusIcon = () => {
    switch (uploadState.status) {
      case 'completed':
        return <CheckCircleIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'validating':
      case 'reading':
      case 'uploading':
      case 'processing':
        return <ScienceIcon color="primary" />;
      default:
        return <CloudUploadIcon color="action" />;
    }
  };

  /**
   * Get status color
   */
  const getStatusColor = (): 'success' | 'error' | 'warning' | 'info' | 'default' => {
    switch (uploadState.status) {
      case 'completed':
        return 'success';
      case 'error':
        return 'error';
      case 'validating':
      case 'reading':
      case 'uploading':
      case 'processing':
        return 'info';
      default:
        return 'default';
    }
  };

  // Update progress from Redux
  useEffect(() => {
    if (isUploading) {
      setUploadState(prev => ({
        ...prev,
        progress: uploadProgress,
      }));
    }
  }, [uploadProgress, isUploading]);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Upload Dataset for Analysis
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Upload your data file for intelligent profiling and statistical analysis.
          Supported formats: {acceptedFormats.join(', ').toUpperCase()}
        </Typography>
      </Box>

      {/* Educational Content */}
      {showEducational && uploadState.status === 'idle' && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            <strong>Data Upload Guidelines:</strong>
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon><CheckCircleIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="First row should contain column headers" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircleIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="Use consistent data types in each column" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircleIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="Maximum file size: 500MB" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircleIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="UTF-8 encoding recommended" />
            </ListItem>
          </List>
        </Alert>
      )}

      {/* Error Display */}
      {uploadState.error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={() => setUploadState(prev => ({ ...prev, error: null }))}
            >
              <DeleteIcon fontSize="inherit" />
            </IconButton>
          }
        >
          <Typography variant="subtitle2" gutterBottom>
            {uploadState.error.message}
          </Typography>
          {uploadState.error.userAction && (
            <Typography variant="body2">
              {uploadState.error.userAction}
            </Typography>
          )}
        </Alert>
      )}

      {/* Warnings Display */}
      {uploadState.warnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Warnings:
          </Typography>
          <List dense>
            {uploadState.warnings.map((warning, index) => (
              <ListItem key={index}>
                <ListItemIcon><WarningIcon fontSize="small" /></ListItemIcon>
                <ListItemText primary={warning} />
              </ListItem>
            ))}
          </List>
        </Alert>
      )}

      {/* Main Upload Area */}
      <Card elevation={2}>
        <CardContent>
          {/* Drop Zone */}
          <Box
            ref={dropZoneRef}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            sx={{
              border: isDragging ? '2px solid' : '2px dashed',
              borderColor: isDragging ? 'primary.main' : 'divider',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              bgcolor: isDragging ? 'action.hover' : 'background.default',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              position: 'relative',
              minHeight: 200,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={() => !isUploading && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedFormats.map(f => FILE_FORMAT_EXTENSIONS[f].join(',')).join(',')}
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              disabled={isUploading}
            />

            {uploadState.file ? (
              // File Selected Display
              <Box>
                <FileIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  {uploadState.file.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {formatFileSize(uploadState.file.size)}
                </Typography>
                
                {/* Status Chip */}
                <Chip
                  icon={getStatusIcon()}
                  label={uploadState.status.charAt(0).toUpperCase() + uploadState.status.slice(1)}
                  color={getStatusColor()}
                  sx={{ mt: 2 }}
                />

                {/* Action Buttons */}
                <Box sx={{ mt: 3 }}>
                  {uploadState.status === 'idle' && (
                    <>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<CloudUploadIcon />}
                        onClick={() => handleUpload()}
                        sx={{ mr: 2 }}
                      >
                        Upload & Profile
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={handleClear}
                      >
                        Clear
                      </Button>
                    </>
                  )}
                </Box>
              </Box>
            ) : (
              // Empty Drop Zone
              <Box>
                <CloudUploadIcon sx={{ fontSize: 64, color: 'action.disabled', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Drag and drop your file here
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  or
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<CloudUploadIcon />}
                  disabled={isUploading}
                >
                  Browse Files
                </Button>
                <Typography variant="caption" display="block" sx={{ mt: 2 }}>
                  Maximum file size: {formatFileSize(maxFileSize)}
                </Typography>
              </Box>
            )}

            {/* Progress Bar */}
            {(isUploading || uploadState.status === 'uploading') && (
              <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={uploadState.progress}
                  sx={{ height: 6, borderRadius: '0 0 8px 8px' }}
                />
                <Typography 
                  variant="caption" 
                  sx={{ 
                    position: 'absolute', 
                    bottom: 10, 
                    right: 10,
                    bgcolor: 'background.paper',
                    px: 1,
                    borderRadius: 1,
                  }}
                >
                  {uploadState.progress}%
                </Typography>
              </Box>
            )}
          </Box>

          {/* File Preview */}
          {uploadState.preview && showPreview && (
            <Box sx={{ mt: 3 }}>
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  mb: 1,
                }}
              >
                <Typography variant="subtitle2">
                  Data Preview (First {previewRows} rows)
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => setShowPreviewPanel(!showPreviewPanel)}
                >
                  {showPreviewPanel ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>
              
              <Collapse in={showPreviewPanel}>
                <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        {uploadState.preview.headers.map((header, index) => (
                          <TableCell key={index}>
                            <Typography variant="caption" fontWeight="bold">
                              {header}
                            </Typography>
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {uploadState.preview.rows.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <TableCell key={cellIndex}>
                              <Typography variant="caption">
                                {cell === null || cell === undefined ? 
                                  <em style={{ color: 'text.secondary' }}>null</em> : 
                                  String(cell)
                                }
                              </Typography>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                {/* Preview Statistics */}
                <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">
                        Total Rows
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {uploadState.preview.totalRows.toLocaleString()}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">
                        Total Columns
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {uploadState.preview.totalColumns}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">
                        Missing Values
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {uploadState.preview.missingSummary.missingPercentage.toFixed(1)}%
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">
                        Encoding
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {uploadState.preview.encoding}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Collapse>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Success Result Display */}
      {currentDataset && uploadState.status === 'completed' && (
        <Card elevation={2} sx={{ mt: 3, bgcolor: 'success.light' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CheckCircleIcon color="success" sx={{ mr: 1 }} />
              <Typography variant="h6">
                Dataset Successfully Profiled
              </Typography>
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  Dataset Name
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {currentDataset.name}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  Quality Score
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {(currentDataset.overall_quality.score * 100).toFixed(1)}%
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  Variables
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {currentDataset.variables.length}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  Observations
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {currentDataset.shape.rows.toLocaleString()}
                </Typography>
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AnalyticsIcon />}
                onClick={() => dispatch(nextWorkflowStep())}
              >
                View Profile Results
              </Button>
              <Button
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                onClick={handleClear}
              >
                Upload Another File
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default DataUploader;