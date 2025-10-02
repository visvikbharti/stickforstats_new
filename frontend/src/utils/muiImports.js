/**
 * muiImports.js
 * 
 * This module provides optimized imports from Material UI to enable better tree-shaking.
 * Instead of importing from the umbrella '@mui/material' package, use these more granular imports.
 */

import React from 'react';

// Core components
export { default as Box } from '@mui/material/Box';
export { default as Container } from '@mui/material/Container';
export { default as Grid } from '@mui/material/Grid';
export { default as Stack } from '@mui/material/Stack';
export { default as Paper } from '@mui/material/Paper';
export { default as Card } from '@mui/material/Card';
export { default as CardContent } from '@mui/material/CardContent';
export { default as CardActions } from '@mui/material/CardActions';
export { default as CardHeader } from '@mui/material/CardHeader';
export { default as CardMedia } from '@mui/material/CardMedia';
export { default as Divider } from '@mui/material/Divider';

// Typography
export { default as Typography } from '@mui/material/Typography';

// Inputs and Controls
export { default as Button } from '@mui/material/Button';
export { default as IconButton } from '@mui/material/IconButton';
export { default as TextField } from '@mui/material/TextField';
export { default as InputLabel } from '@mui/material/InputLabel';
export { default as InputAdornment } from '@mui/material/InputAdornment';
export { default as FormControl } from '@mui/material/FormControl';
export { default as FormGroup } from '@mui/material/FormGroup';
export { default as FormControlLabel } from '@mui/material/FormControlLabel';
export { default as FormHelperText } from '@mui/material/FormHelperText';
export { default as FormLabel } from '@mui/material/FormLabel';
export { default as Select } from '@mui/material/Select';
export { default as MenuItem } from '@mui/material/MenuItem';
export { default as Checkbox } from '@mui/material/Checkbox';
export { default as Radio } from '@mui/material/Radio';
export { default as RadioGroup } from '@mui/material/RadioGroup';
export { default as Switch } from '@mui/material/Switch';
export { default as Slider } from '@mui/material/Slider';
export { default as Autocomplete } from '@mui/material/Autocomplete';

// Feedback
export { default as CircularProgress } from '@mui/material/CircularProgress';
export { default as LinearProgress } from '@mui/material/LinearProgress';
export { default as Snackbar } from '@mui/material/Snackbar';
export { default as Alert } from '@mui/material/Alert';
export { default as Backdrop } from '@mui/material/Backdrop';
export { default as Dialog } from '@mui/material/Dialog';
export { default as DialogActions } from '@mui/material/DialogActions';
export { default as DialogContent } from '@mui/material/DialogContent';
export { default as DialogContentText } from '@mui/material/DialogContentText';
export { default as DialogTitle } from '@mui/material/DialogTitle';
export { default as Skeleton } from '@mui/material/Skeleton';

// Navigation
export { default as Tabs } from '@mui/material/Tabs';
export { default as Tab } from '@mui/material/Tab';
export { default as AppBar } from '@mui/material/AppBar';
export { default as Toolbar } from '@mui/material/Toolbar';
export { default as Drawer } from '@mui/material/Drawer';
export { default as List } from '@mui/material/List';
export { default as ListItem } from '@mui/material/ListItem';
export { default as ListItemButton } from '@mui/material/ListItemButton';
export { default as ListItemIcon } from '@mui/material/ListItemIcon';
export { default as ListItemText } from '@mui/material/ListItemText';
export { default as Menu } from '@mui/material/Menu';
export { default as Breadcrumbs } from '@mui/material/Breadcrumbs';
export { default as Stepper } from '@mui/material/Stepper';
export { default as Step } from '@mui/material/Step';
export { default as StepLabel } from '@mui/material/StepLabel';

// Data Display
export { default as Avatar } from '@mui/material/Avatar';
export { default as Badge } from '@mui/material/Badge';
export { default as Chip } from '@mui/material/Chip';
export { default as Table } from '@mui/material/Table';
export { default as TableBody } from '@mui/material/TableBody';
export { default as TableCell } from '@mui/material/TableCell';
export { default as TableContainer } from '@mui/material/TableContainer';
export { default as TableHead } from '@mui/material/TableHead';
export { default as TableRow } from '@mui/material/TableRow';
export { default as TablePagination } from '@mui/material/TablePagination';
export { default as Tooltip } from '@mui/material/Tooltip';

// Layout
export { default as Accordion } from '@mui/material/Accordion';
export { default as AccordionSummary } from '@mui/material/AccordionSummary';
export { default as AccordionDetails } from '@mui/material/AccordionDetails';
export { default as Modal } from '@mui/material/Modal';
export { default as Popover } from '@mui/material/Popover';

// Styles
export { styled } from '@mui/material/styles';
export { alpha } from '@mui/material/styles';
export { useTheme } from '@mui/material/styles';
export { ThemeProvider } from '@mui/material/styles';
export { createTheme } from '@mui/material/styles';

// Most commonly used icons - import more specific ones directly in components
export { default as InfoIcon } from '@mui/icons-material/Info';
export { default as AddIcon } from '@mui/icons-material/Add';
export { default as EditIcon } from '@mui/icons-material/Edit';
export { default as DeleteIcon } from '@mui/icons-material/Delete';
export { default as SaveIcon } from '@mui/icons-material/Save';
export { default as CloseIcon } from '@mui/icons-material/Close';
export { default as MenuIcon } from '@mui/icons-material/Menu';
export { default as SearchIcon } from '@mui/icons-material/Search';
export { default as MoreVertIcon } from '@mui/icons-material/MoreVert';
export { default as ArrowBackIcon } from '@mui/icons-material/ArrowBack';
export { default as ArrowForwardIcon } from '@mui/icons-material/ArrowForward';
export { default as ExpandMoreIcon } from '@mui/icons-material/ExpandMore';
export { default as DownloadIcon } from '@mui/icons-material/Download';
export { default as UploadIcon } from '@mui/icons-material/Upload';
export { default as VisibilityIcon } from '@mui/icons-material/Visibility';
export { default as VisibilityOffIcon } from '@mui/icons-material/VisibilityOff';
export { default as ErrorIcon } from '@mui/icons-material/Error';
export { default as CheckCircleIcon } from '@mui/icons-material/CheckCircle';
export { default as WarningIcon } from '@mui/icons-material/Warning';
export { default as HelpIcon } from '@mui/icons-material/Help';
export { default as RefreshIcon } from '@mui/icons-material/Refresh';
export { default as RestartAltIcon } from '@mui/icons-material/RestartAlt';
export { default as SettingsIcon } from '@mui/icons-material/Settings';
export { default as DarkModeIcon } from '@mui/icons-material/DarkMode';
export { default as LightModeIcon } from '@mui/icons-material/LightMode';

// Lazy-loadable complex components
export const LazyComponents = {
  // Lazy load SpeedDial - less commonly used
  SpeedDial: React.lazy(() => import('@mui/material/SpeedDial')),
  SpeedDialAction: React.lazy(() => import('@mui/material/SpeedDialAction')),
  SpeedDialIcon: React.lazy(() => import('@mui/material/SpeedDialIcon')),
  
  // Lazy load complex data components
  DataGrid: React.lazy(() => import('@mui/x-data-grid').then(module => ({ default: module.DataGrid }))),
  
  // Lazy load date/time components
  DatePicker: React.lazy(() => import('@mui/x-date-pickers/DatePicker')),
  TimePicker: React.lazy(() => import('@mui/x-date-pickers/TimePicker')),
  DateTimePicker: React.lazy(() => import('@mui/x-date-pickers/DateTimePicker')),
  LocalizationProvider: React.lazy(() => import('@mui/x-date-pickers/LocalizationProvider')),
};