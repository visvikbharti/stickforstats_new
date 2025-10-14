/**
 * Audit Log Viewer Component
 * Displays and filters audit logs with search and export capabilities
 *
 * @module AuditLogViewer
 * @version 1.0.0
 * @author StickForStats Platform
 * @license MIT
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  IconButton,
  Chip,
  Typography,
  Button,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  InputAdornment,
  Collapse,
  Alert,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  Search,
  FilterList,
  Download,
  Refresh,
  ExpandMore,
  ExpandLess,
  Info,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Security,
  ContentCopy,
  Visibility
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';

/**
 * Main audit log viewer component
 */
const AuditLogViewer = ({ logs = [], onRefresh, loading = false }) => {
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Export menu
  const [exportAnchor, setExportAnchor] = useState(null);

  /**
   * Get icon for log level
   */
  const getLevelIcon = (level) => {
    switch (level) {
      case 'info':
        return <Info color="info" fontSize="small" />;
      case 'success':
        return <CheckCircle color="success" fontSize="small" />;
      case 'warning':
        return <Warning color="warning" fontSize="small" />;
      case 'error':
        return <ErrorIcon color="error" fontSize="small" />;
      case 'security':
        return <Security color="primary" fontSize="small" />;
      default:
        return <Info fontSize="small" />;
    }
  };

  /**
   * Get color for log level
   */
  const getLevelColor = (level) => {
    switch (level) {
      case 'info':
        return 'info';
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      case 'security':
        return 'primary';
      default:
        return 'default';
    }
  };

  /**
   * Filter logs based on criteria
   */
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesQuery =
          log.action?.toLowerCase().includes(query) ||
          log.userId?.toLowerCase().includes(query) ||
          log.details?.toString().toLowerCase().includes(query) ||
          log.module?.toLowerCase().includes(query);

        if (!matchesQuery) return false;
      }

      // Level filter
      if (levelFilter !== 'all' && log.level !== levelFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && log.category !== categoryFilter) {
        return false;
      }

      // Date filter
      if (dateFilter !== 'all') {
        const logDate = new Date(log.timestamp);
        const now = new Date();

        switch (dateFilter) {
          case 'today':
            if (logDate.toDateString() !== now.toDateString()) return false;
            break;
          case 'week':
            const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
            if (logDate < weekAgo) return false;
            break;
          case 'month':
            const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
            if (logDate < monthAgo) return false;
            break;
        }
      }

      return true;
    });
  }, [logs, searchQuery, levelFilter, categoryFilter, dateFilter]);

  /**
   * Handle row expansion
   */
  const handleRowExpand = (logId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedRows(newExpanded);
  };

  /**
   * Export logs
   */
  const handleExport = (format) => {
    const dataToExport = filteredLogs;

    switch (format) {
      case 'json':
        const jsonBlob = new Blob([JSON.stringify(dataToExport, null, 2)], {
          type: 'application/json'
        });
        downloadFile(jsonBlob, `audit-logs-${Date.now()}.json`);
        break;

      case 'csv':
        const csvContent = convertToCSV(dataToExport);
        const csvBlob = new Blob([csvContent], { type: 'text/csv' });
        downloadFile(csvBlob, `audit-logs-${Date.now()}.csv`);
        break;

      case 'txt':
        const textContent = dataToExport
          .map(log => `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.action} - ${JSON.stringify(log.details)}`)
          .join('\n');
        const textBlob = new Blob([textContent], { type: 'text/plain' });
        downloadFile(textBlob, `audit-logs-${Date.now()}.txt`);
        break;
    }

    setExportAnchor(null);
  };

  /**
   * Convert logs to CSV format
   */
  const convertToCSV = (data) => {
    const headers = ['Timestamp', 'Level', 'Action', 'User', 'Module', 'Category', 'Result', 'Details'];
    const rows = data.map(log => [
      log.timestamp,
      log.level,
      log.action,
      log.userId || '',
      log.module || '',
      log.category || '',
      log.result || '',
      JSON.stringify(log.details || {})
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
  };

  /**
   * Download file helper
   */
  const downloadFile = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Copy log details to clipboard
   */
  const copyToClipboard = (log) => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
  };

  /**
   * Get unique categories from logs
   */
  const categories = useMemo(() => {
    const cats = new Set(logs.map(log => log.category).filter(Boolean));
    return Array.from(cats);
  }, [logs]);

  return (
    <Paper sx={{ width: '100%', p: 2 }}>
      {/* Header and Controls */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Audit Trail ({filteredLogs.length} entries)
        </Typography>

        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={onRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={(e) => setExportAnchor(e.currentTarget)}
          >
            Export
          </Button>
          <Menu
            anchorEl={exportAnchor}
            open={Boolean(exportAnchor)}
            onClose={() => setExportAnchor(null)}
          >
            <MenuItem onClick={() => handleExport('json')}>Export as JSON</MenuItem>
            <MenuItem onClick={() => handleExport('csv')}>Export as CSV</MenuItem>
            <MenuItem onClick={() => handleExport('txt')}>Export as Text</MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Filters */}
      <Box display="flex" gap={2} mb={2}>
        <TextField
          placeholder="Search logs..."
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ flex: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            )
          }}
        />

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Level</InputLabel>
          <Select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            label="Level"
          >
            <MenuItem value="all">All Levels</MenuItem>
            <MenuItem value="info">Info</MenuItem>
            <MenuItem value="success">Success</MenuItem>
            <MenuItem value="warning">Warning</MenuItem>
            <MenuItem value="error">Error</MenuItem>
            <MenuItem value="security">Security</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Category</InputLabel>
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            label="Category"
          >
            <MenuItem value="all">All Categories</MenuItem>
            {categories.map(cat => (
              <MenuItem key={cat} value={cat}>{cat}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Date</InputLabel>
          <Select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            label="Date"
          >
            <MenuItem value="all">All Time</MenuItem>
            <MenuItem value="today">Today</MenuItem>
            <MenuItem value="week">Last 7 Days</MenuItem>
            <MenuItem value="month">Last 30 Days</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Loading indicator */}
      {loading && <LinearProgress sx={{ mb: 1 }} />}

      {/* Logs Table */}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width={50}></TableCell>
              <TableCell>Timestamp</TableCell>
              <TableCell>Level</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Module</TableCell>
              <TableCell>Result</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredLogs
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((log) => (
                <React.Fragment key={log.id}>
                  <TableRow hover>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleRowExpand(log.id)}
                      >
                        {expandedRows.has(log.id) ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {format(new Date(log.timestamp), 'PPpp')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getLevelIcon(log.level)}
                        label={log.level}
                        size="small"
                        color={getLevelColor(log.level)}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {log.action}
                      </Typography>
                    </TableCell>
                    <TableCell>{log.userId || '-'}</TableCell>
                    <TableCell>{log.module || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={log.result || 'N/A'}
                        size="small"
                        color={log.result === 'success' ? 'success' : log.result === 'failed' ? 'error' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Copy to clipboard">
                        <IconButton size="small" onClick={() => copyToClipboard(log)}>
                          <ContentCopy fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>

                  {/* Expanded Row Details */}
                  <TableRow>
                    <TableCell colSpan={8} sx={{ py: 0 }}>
                      <Collapse in={expandedRows.has(log.id)} timeout="auto" unmountOnExit>
                        <Box sx={{ py: 2, px: 4 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Details
                          </Typography>
                          <Paper
                            variant="outlined"
                            sx={{
                              p: 2,
                              backgroundColor: 'grey.50',
                              fontFamily: 'monospace',
                              fontSize: '0.875rem'
                            }}
                          >
                            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                              {JSON.stringify(log.details || {}, null, 2)}
                            </pre>
                          </Paper>

                          {log.signature && (
                            <Box mt={2}>
                              <Typography variant="subtitle2" gutterBottom>
                                Integrity Signature
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
                              >
                                {log.signature}
                              </Typography>
                            </Box>
                          )}

                          {log.previousEntryId && (
                            <Box mt={1}>
                              <Typography variant="caption" color="textSecondary">
                                Previous Entry: {log.previousEntryId}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}

            {filteredLogs.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="textSecondary">
                    No audit logs found matching the current filters
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100]}
        component="div"
        count={filteredLogs.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(event, newPage) => setPage(newPage)}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10));
          setPage(0);
        }}
      />

      {/* Compliance Notice */}
      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="caption">
          This audit trail is maintained in compliance with FDA 21 CFR Part 11 requirements.
          All entries are digitally signed and tamper-evident with blockchain-style linking.
          Logs are retained for a minimum of 7 years as per regulatory requirements.
        </Typography>
      </Alert>
    </Paper>
  );
};

export default AuditLogViewer;