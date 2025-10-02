import React, { useState, useEffect } from 'react';
import { 
  Box, Card, CardContent, Grid, Typography, Button, TextField, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination,
  Paper, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  CircularProgress, Alert, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import { 
  Add as AddIcon, 
  Search as SearchIcon, 
  Delete as DeleteIcon, 
  RemoveRedEye as ViewIcon,
  BarChart as AnalyzeIcon,
  FilterList as FilterIcon,
  CloudUpload as UploadIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

import DatasetUploadDialog from './DatasetUploadDialog';
import { fetchDatasets, deleteDataset } from '../../api/datasetApi';

const DatasetBrowser = () => {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [datasetToDelete, setDatasetToDelete] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('');
  const [sortOption, setSortOption] = useState('-created_at');
  
  const navigate = useNavigate();
  
  // Fetch datasets on component mount and when filters change
  useEffect(() => {
    const loadDatasets = async () => {
      setLoading(true);
      try {
        const response = await fetchDatasets({
          page: page + 1, // API uses 1-based pagination
          limit: rowsPerPage,
          search: searchQuery,
          file_type: fileTypeFilter,
          sort: sortOption
        });
        
        setDatasets(response.results);
        setTotalCount(response.count);
        setError(null);
      } catch (err) {
        setError('Failed to load datasets. Please try again later.');
        console.error('Error fetching datasets:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadDatasets();
  }, [page, rowsPerPage, searchQuery, fileTypeFilter, sortOption]);
  
  // Handle page change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Open upload dialog
  const handleOpenUploadDialog = () => {
    setOpenUploadDialog(true);
  };
  
  // Close upload dialog
  const handleCloseUploadDialog = (uploaded = false) => {
    setOpenUploadDialog(false);
    if (uploaded) {
      // Refresh dataset list if upload was successful
      setPage(0);
      // The useEffect will trigger a reload
    }
  };
  
  // Handle dataset deletion
  const handleDeleteClick = (dataset) => {
    setDatasetToDelete(dataset);
    setOpenDeleteDialog(true);
  };
  
  const handleConfirmDelete = async () => {
    if (!datasetToDelete) return;
    
    try {
      await deleteDataset(datasetToDelete.id);
      // Update local state
      setDatasets(datasets.filter(d => d.id !== datasetToDelete.id));
      setTotalCount(totalCount - 1);
    } catch (err) {
      setError('Failed to delete dataset. Please try again later.');
      console.error('Error deleting dataset:', err);
    } finally {
      setOpenDeleteDialog(false);
      setDatasetToDelete(null);
    }
  };
  
  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    // Reset to first page when searching
    setPage(0);
    // The useEffect will trigger with the new searchQuery
  };
  
  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="h1">
          Datasets
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<UploadIcon />}
          onClick={handleOpenUploadDialog}
        >
          Upload Dataset
        </Button>
      </Box>
      
      {/* Search and filter bar */}
      <Paper 
        component="form" 
        onSubmit={handleSearch}
        sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}
      >
        <TextField 
          label="Search datasets"
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ flexGrow: 1, minWidth: '200px' }}
          InputProps={{
            startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
          }}
        />
        
        <FormControl variant="outlined" size="small" sx={{ minWidth: '150px' }}>
          <InputLabel id="file-type-label">File Type</InputLabel>
          <Select
            labelId="file-type-label"
            value={fileTypeFilter}
            onChange={(e) => {
              setFileTypeFilter(e.target.value);
              setPage(0);
            }}
            label="File Type"
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="csv">CSV</MenuItem>
            <MenuItem value="excel">Excel</MenuItem>
          </Select>
        </FormControl>
        
        <FormControl variant="outlined" size="small" sx={{ minWidth: '150px' }}>
          <InputLabel id="sort-label">Sort By</InputLabel>
          <Select
            labelId="sort-label"
            value={sortOption}
            onChange={(e) => {
              setSortOption(e.target.value);
              setPage(0);
            }}
            label="Sort By"
          >
            <MenuItem value="-created_at">Newest First</MenuItem>
            <MenuItem value="created_at">Oldest First</MenuItem>
            <MenuItem value="name">Name (A-Z)</MenuItem>
            <MenuItem value="-name">Name (Z-A)</MenuItem>
            <MenuItem value="-rows">Rows (High to Low)</MenuItem>
            <MenuItem value="rows">Rows (Low to High)</MenuItem>
          </Select>
        </FormControl>
        
        <Button 
          type="submit" 
          variant="contained" 
          color="primary"
          startIcon={<SearchIcon />}
        >
          Search
        </Button>
      </Paper>
      
      {/* Error alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Dataset table */}
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="datasets table">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>File Type</TableCell>
              <TableCell align="right">Rows</TableCell>
              <TableCell align="right">Columns</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : datasets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      No datasets found
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Upload a dataset to get started with your analysis
                    </Typography>
                    <Button 
                      variant="contained" 
                      startIcon={<UploadIcon />}
                      onClick={handleOpenUploadDialog}
                    >
                      Upload Dataset
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              datasets.map((dataset) => (
                <TableRow
                  key={dataset.id}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell component="th" scope="row">
                    <Box>
                      <Typography variant="body1">{dataset.name}</Typography>
                      {dataset.description && (
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{ 
                            maxWidth: '300px', 
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {dataset.description}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={dataset.file_type.toUpperCase()} 
                      color={dataset.file_type === 'csv' ? 'primary' : 'secondary'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">{dataset.rows.toLocaleString()}</TableCell>
                  <TableCell align="right">{dataset.columns}</TableCell>
                  <TableCell>
                    {dataset.created_at ? format(new Date(dataset.created_at), 'MMM d, yyyy') : ''}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton 
                      aria-label="view" 
                      onClick={() => navigate(`/datasets/${dataset.id}`)}
                      color="primary"
                      size="small"
                    >
                      <ViewIcon />
                    </IconButton>
                    <IconButton 
                      aria-label="analyze" 
                      onClick={() => navigate(`/analyses/create?dataset=${dataset.id}`)}
                      color="secondary"
                      size="small"
                    >
                      <AnalyzeIcon />
                    </IconButton>
                    <IconButton 
                      aria-label="delete" 
                      onClick={() => handleDeleteClick(dataset)}
                      color="error"
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
        {/* Pagination */}
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
      
      {/* Dataset Upload Dialog */}
      <DatasetUploadDialog
        open={openUploadDialog}
        onClose={handleCloseUploadDialog}
      />
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{datasetToDelete?.name}</strong>?
            This action cannot be undone and will also delete any analyses associated with this dataset.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DatasetBrowser;