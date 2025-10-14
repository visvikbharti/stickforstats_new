/**
 * React Validation Components
 * UI components for real-time validation feedback
 *
 * @module ValidationComponents
 * @version 1.0.0
 * @author StickForStats Platform
 * @license MIT
 */

import React, { memo, useEffect, useState } from 'react';
import {
  TextField,
  FormControl,
  FormHelperText,
  InputAdornment,
  CircularProgress,
  Tooltip,
  Alert,
  AlertTitle,
  Chip,
  LinearProgress,
  Box,
  Typography,
  IconButton,
  Collapse,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Fade,
  Zoom
} from '@mui/material';
import {
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Info,
  Close,
  CheckCircleOutline,
  ErrorOutline,
  WarningAmber,
  Refresh,
  Shield,
  VerifiedUser,
  Security
} from '@mui/icons-material';
import { useValidation, useLiveValidation } from './useValidation';
import { ErrorCategory, NotificationLevel } from '../../utils/validation';

/**
 * Validation status indicator
 */
export const ValidationIndicator = memo(({ status, size = 'small', showLabel = false }) => {
  const getIcon = () => {
    switch (status) {
      case 'valid':
        return <CheckCircle color="success" fontSize={size} />;
      case 'invalid':
        return <ErrorIcon color="error" fontSize={size} />;
      case 'validating':
        return <CircularProgress size={size === 'small' ? 16 : 24} />;
      case 'warning':
        return <Warning color="warning" fontSize={size} />;
      default:
        return null;
    }
  };

  const getLabel = () => {
    switch (status) {
      case 'valid':
        return 'Valid';
      case 'invalid':
        return 'Invalid';
      case 'validating':
        return 'Validating...';
      case 'warning':
        return 'Warning';
      default:
        return '';
    }
  };

  return (
    <Box display="inline-flex" alignItems="center" gap={0.5}>
      <Zoom in={!!status}>
        <Box display="flex" alignItems="center">
          {getIcon()}
        </Box>
      </Zoom>
      {showLabel && status && (
        <Fade in={!!status}>
          <Typography variant="caption" color={`${status}.main`}>
            {getLabel()}
          </Typography>
        </Fade>
      )}
    </Box>
  );
});

ValidationIndicator.displayName = 'ValidationIndicator';

/**
 * Validated text field with real-time feedback
 */
export const ValidatedTextField = memo(({
  name,
  label,
  schema,
  value,
  onChange,
  onBlur,
  helperText,
  showValidationIcon = true,
  validationMode = 'onChange',
  ...textFieldProps
}) => {
  const { isValid, error, isValidating, status } = useLiveValidation(value, schema);

  const getEndAdornment = () => {
    if (!showValidationIcon || !value) return null;

    return (
      <InputAdornment position="end">
        <ValidationIndicator status={status} />
      </InputAdornment>
    );
  };

  return (
    <TextField
      name={name}
      label={label}
      value={value || ''}
      onChange={onChange}
      onBlur={onBlur}
      error={status === 'invalid'}
      helperText={error || helperText}
      InputProps={{
        endAdornment: getEndAdornment(),
        ...textFieldProps.InputProps
      }}
      {...textFieldProps}
    />
  );
});

ValidatedTextField.displayName = 'ValidatedTextField';

/**
 * Validation summary component
 */
export const ValidationSummary = memo(({ errors, touched, showOnlyTouched = true }) => {
  const errorList = Object.entries(errors)
    .filter(([field]) => !showOnlyTouched || touched[field])
    .map(([field, error]) => ({ field, error }));

  if (errorList.length === 0) return null;

  return (
    <Alert severity="error" sx={{ mb: 2 }}>
      <AlertTitle>Please correct the following errors:</AlertTitle>
      <List dense>
        {errorList.map(({ field, error }) => (
          <ListItem key={field}>
            <ListItemIcon sx={{ minWidth: 32 }}>
              <ErrorOutline color="error" fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={field.charAt(0).toUpperCase() + field.slice(1)}
              secondary={error}
            />
          </ListItem>
        ))}
      </List>
    </Alert>
  );
});

ValidationSummary.displayName = 'ValidationSummary';

/**
 * Field validation status card
 */
export const FieldValidationCard = memo(({
  fieldName,
  value,
  schema,
  bounds,
  showDetails = true
}) => {
  const { isValid, error, isValidating } = useLiveValidation(value, schema);

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 1 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="subtitle2" color="text.secondary">
            {fieldName}
          </Typography>
          <Typography variant="body1">
            {value !== undefined && value !== null ? value : 'No value'}
          </Typography>
        </Box>
        <ValidationIndicator status={isValidating ? 'validating' : isValid ? 'valid' : 'invalid'} />
      </Box>

      {showDetails && bounds && (
        <Box mt={1} pt={1} borderTop={1} borderColor="divider">
          <Typography variant="caption" color="text.secondary">
            Valid range: {bounds.min} to {bounds.max}
            {bounds.excludeZero && ' (excluding 0)'}
          </Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 1 }} icon={<ErrorOutline />}>
          {error}
        </Alert>
      )}
    </Paper>
  );
});

FieldValidationCard.displayName = 'FieldValidationCard';

/**
 * Validation progress bar
 */
export const ValidationProgress = memo(({ validFields, totalFields, showPercentage = true }) => {
  const percentage = totalFields > 0 ? (validFields / totalFields) * 100 : 0;
  const color = percentage === 100 ? 'success' : percentage >= 50 ? 'warning' : 'error';

  return (
    <Box sx={{ width: '100%' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="body2" color="text.secondary">
          Validation Progress
        </Typography>
        {showPercentage && (
          <Typography variant="body2" color={`${color}.main`}>
            {validFields}/{totalFields} ({percentage.toFixed(0)}%)
          </Typography>
        )}
      </Box>
      <LinearProgress
        variant="determinate"
        value={percentage}
        color={color}
        sx={{ height: 8, borderRadius: 1 }}
      />
    </Box>
  );
});

ValidationProgress.displayName = 'ValidationProgress';

/**
 * Compliance indicator
 */
export const ComplianceIndicator = memo(({ compliant, standard = 'FDA 21 CFR Part 11' }) => {
  return (
    <Chip
      icon={compliant ? <VerifiedUser /> : <Security />}
      label={`${standard} ${compliant ? 'Compliant' : 'Pending'}`}
      color={compliant ? 'success' : 'default'}
      size="small"
      variant={compliant ? 'filled' : 'outlined'}
    />
  );
});

ComplianceIndicator.displayName = 'ComplianceIndicator';

/**
 * Error notification component
 */
export const ErrorNotification = memo(({ error, level = NotificationLevel.ERROR, onClose }) => {
  const [open, setOpen] = useState(true);

  const getSeverity = () => {
    switch (level) {
      case NotificationLevel.INFO:
        return 'info';
      case NotificationLevel.WARNING:
        return 'warning';
      case NotificationLevel.ERROR:
        return 'error';
      case NotificationLevel.CRITICAL:
        return 'error';
      default:
        return 'info';
    }
  };

  const getIcon = () => {
    switch (level) {
      case NotificationLevel.INFO:
        return <Info />;
      case NotificationLevel.WARNING:
        return <WarningAmber />;
      case NotificationLevel.ERROR:
        return <ErrorOutline />;
      case NotificationLevel.CRITICAL:
        return <ErrorIcon />;
      default:
        return <Info />;
    }
  };

  const handleClose = () => {
    setOpen(false);
    if (onClose) onClose();
  };

  useEffect(() => {
    if (level === NotificationLevel.INFO) {
      const timer = setTimeout(() => {
        handleClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [level]);

  return (
    <Collapse in={open}>
      <Alert
        severity={getSeverity()}
        icon={getIcon()}
        action={
          <IconButton
            aria-label="close"
            color="inherit"
            size="small"
            onClick={handleClose}
          >
            <Close fontSize="inherit" />
          </IconButton>
        }
        sx={{ mb: 2 }}
      >
        <AlertTitle>
          {level === NotificationLevel.CRITICAL ? 'Critical Error' :
           level === NotificationLevel.ERROR ? 'Error' :
           level === NotificationLevel.WARNING ? 'Warning' : 'Information'}
        </AlertTitle>
        {error?.message || error || 'An error occurred'}
      </Alert>
    </Collapse>
  );
});

ErrorNotification.displayName = 'ErrorNotification';

/**
 * Validation stats display
 */
export const ValidationStats = memo(({ stats }) => {
  const successRate = stats.totalValidations > 0
    ? ((stats.totalValidations - stats.failedValidations) / stats.totalValidations * 100).toFixed(1)
    : 0;

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        Validation Statistics
      </Typography>
      <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Total Validations
          </Typography>
          <Typography variant="h6">
            {stats.totalValidations}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Success Rate
          </Typography>
          <Typography variant="h6" color={successRate >= 90 ? 'success.main' : 'warning.main'}>
            {successRate}%
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Failed
          </Typography>
          <Typography variant="h6" color="error.main">
            {stats.failedValidations}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Last Validation
          </Typography>
          <Typography variant="body2">
            {stats.lastValidation
              ? new Date(stats.lastValidation).toLocaleTimeString()
              : 'Never'}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
});

ValidationStats.displayName = 'ValidationStats';

/**
 * Array validation display
 */
export const ArrayValidationDisplay = memo(({ data, validationResult, isValidating }) => {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="subtitle2">
          Array Data ({data.length} items)
        </Typography>
        <ValidationIndicator
          status={isValidating ? 'validating' : validationResult?.valid ? 'valid' : 'invalid'}
          showLabel
        />
      </Box>

      {validationResult?.stats && (
        <Box display="grid" gridTemplateColumns="repeat(4, 1fr)" gap={1} mb={1}>
          <Chip label={`Min: ${validationResult.stats.min.toFixed(2)}`} size="small" />
          <Chip label={`Max: ${validationResult.stats.max.toFixed(2)}`} size="small" />
          <Chip label={`Mean: ${validationResult.stats.mean.toFixed(2)}`} size="small" />
          <Chip label={`Count: ${validationResult.stats.length}`} size="small" />
        </Box>
      )}

      {validationResult?.error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {validationResult.error}
        </Alert>
      )}
    </Paper>
  );
});

ArrayValidationDisplay.displayName = 'ArrayValidationDisplay';

/**
 * Recovery status indicator
 */
export const RecoveryStatus = memo(({ recovering, recovered, strategy }) => {
  if (recovering) {
    return (
      <Alert severity="info" icon={<Refresh className="spinning" />}>
        Attempting recovery using {strategy} strategy...
      </Alert>
    );
  }

  if (recovered) {
    return (
      <Alert severity="success" icon={<CheckCircleOutline />}>
        Successfully recovered using {strategy} strategy
      </Alert>
    );
  }

  return null;
});

RecoveryStatus.displayName = 'RecoveryStatus';

/**
 * Validation boundary for error handling
 */
export class ValidationErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Validation error caught:', error, errorInfo);
    this.setState({ error, errorInfo });

    // Log to audit system if available
    if (window.auditLogger) {
      window.auditLogger.logError(error, {
        component: 'ValidationErrorBoundary',
        errorInfo
      });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Alert
          severity="error"
          action={
            <IconButton color="inherit" size="small" onClick={this.handleReset}>
              <Refresh />
            </IconButton>
          }
        >
          <AlertTitle>Validation Error</AlertTitle>
          {this.state.error?.message || 'An error occurred during validation'}
          <Box mt={1}>
            <Typography variant="caption" color="text.secondary">
              Click refresh to retry
            </Typography>
          </Box>
        </Alert>
      );
    }

    return this.props.children;
  }
}

/**
 * Export all components
 */
export default {
  ValidationIndicator,
  ValidatedTextField,
  ValidationSummary,
  FieldValidationCard,
  ValidationProgress,
  ComplianceIndicator,
  ErrorNotification,
  ValidationStats,
  ArrayValidationDisplay,
  RecoveryStatus,
  ValidationErrorBoundary
};