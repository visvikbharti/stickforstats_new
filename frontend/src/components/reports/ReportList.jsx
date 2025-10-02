import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  Tooltip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  InputAdornment,
  Stack
} from '@mui/material';
import {
  Add as AddIcon,
  GetApp as DownloadIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useReportAPI } from '../../hooks/useReportAPI';

// Format mapping for report formats
const formatChips = {
  pdf: { label: 'PDF', color: 'error' },
  html: { label: 'HTML', color: 'primary' },
  docx: { label: 'DOCX', color: 'info' }
};

/**
 * Component for listing and managing reports
 */
const ReportList = () => {
  const navigate = useNavigate();
  const { 
    reports, 
    loading, 
    error, 
    getReports,
    downloadReport
  } = useReportAPI();
  
  // Local state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);
  
  // Load reports on component mount
  useEffect(() => {
    const fetchReports = async () => {
      try {
        await getReports();
      } catch (err) {
        console.error('Error fetching reports:', err);
      }
    };
    
    fetchReports();
  }, [getReports]);
  
  // Ensure reports is always an array before filtering
  const safeReports = Array.isArray(reports) ? reports : 
                      (reports && reports.results && Array.isArray(reports.results)) ? reports.results :
                      [];
  
  // Filter reports based on search term and format
  const filteredReports = safeReports.filter(report => {
    // Ensure report is a valid object
    if (!report || typeof report !== 'object') return false;
    
    const matchesSearch = !searchTerm || 
      (report.title && report.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (report.description && report.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFormat = !selectedFormat || report.format === selectedFormat;
    
    return matchesSearch && matchesFormat;
  });
  
  // Handle pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Handle search and filter
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };
  
  const handleClearSearch = () => {
    setSearchTerm('');
  };
  
  const handleFormatFilter = (format) => {
    setSelectedFormat(format === selectedFormat ? '' : format);
    setPage(0);
  };
  
  // Handle report actions
  const handleCreateReport = () => {
    navigate('/reports/new');
  };
  
  const handleViewReport = (reportId) => {
    navigate(`/reports/${reportId}`);
  };
  
  const handleDownloadReport = async (reportId) => {
    try {
      await downloadReport(reportId);
    } catch (err) {
      console.error('Error downloading report:', err);
    }
  };
  
  const handleDeleteClick = (report) => {
    setReportToDelete(report);
    setConfirmDeleteOpen(true);
  };
  
  const handleConfirmDelete = async () => {
    // In a real implementation, you would call the delete API
    // For now, we'll just close the dialog
    setConfirmDeleteOpen(false);
    setReportToDelete(null);
    
    // Refresh the list
    getReports();
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  return (
    <Box sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Reports
        </Typography>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreateReport}
        >
          Create Report
        </Button>
      </Box>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search reports..."
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={handleSearchChange}
            sx={{ flexGrow: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: searchTerm ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={handleClearSearch}>
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              ) : null
            }}
          />
          
          <Stack direction="row" spacing={1}>
            <Typography variant="body2" sx={{ alignSelf: 'center' }}>
              Filter by:
            </Typography>
            
            {Object.entries(formatChips).map(([format, { label, color }]) => (
              <Chip
                key={format}
                label={label}
                color={selectedFormat === format ? color : 'default'}
                onClick={() => handleFormatFilter(format)}
                variant={selectedFormat === format ? 'filled' : 'outlined'}
                size="small"
              />
            ))}
          </Stack>
        </Box>
      </Paper>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Error loading reports: {error}
        </Alert>
      )}
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Format</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Analyses</TableCell>
              <TableCell>Size</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                  <CircularProgress size={24} sx={{ mr: 1 }} />
                  Loading reports...
                </TableCell>
              </TableRow>
            ) : filteredReports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                  {searchTerm || selectedFormat ? 
                    'No reports match your search criteria' : 
                    'No reports have been generated yet'
                  }
                </TableCell>
              </TableRow>
            ) : (
              filteredReports
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((report) => (
                  <TableRow key={report.id} hover>
                    <TableCell 
                      sx={{ cursor: 'pointer' }} 
                      onClick={() => handleViewReport(report.id)}
                    >
                      <Typography variant="body1" fontWeight="medium">
                        {report.title}
                      </Typography>
                      {report.description && (
                        <Typography variant="body2" color="textSecondary" noWrap>
                          {report.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={formatChips[report.format]?.label || report.format.toUpperCase()} 
                        color={formatChips[report.format]?.color || 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{formatDate(report.created_at)}</TableCell>
                    <TableCell>{report.analysis_count || 0}</TableCell>
                    <TableCell>{report.file_size ? `${(report.file_size / 1024).toFixed(2)} KB` : 'N/A'}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="View">
                        <IconButton 
                          size="small"
                          onClick={() => handleViewReport(report.id)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Download">
                        <IconButton 
                          size="small"
                          onClick={() => handleDownloadReport(report.id)}
                        >
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Delete">
                        <IconButton 
                          size="small"
                          color="error"
                          onClick={() => handleDeleteClick(report)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredReports.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete report "{reportToDelete?.title}"? 
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            color="error" 
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReportList;