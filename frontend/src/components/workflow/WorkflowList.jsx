import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  TextField, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  Grid,
  Tooltip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  FileCopy as CloneIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  GetApp as ExportIcon,
  MoreVert as MoreVertIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useWorkflowAPI } from '../../hooks/useWorkflowAPI';

// Status chip colors
const statusColors = {
  draft: 'default',
  active: 'primary',
  in_progress: 'secondary',
  completed: 'success',
  failed: 'error',
  cancelled: 'warning'
};

const WorkflowList = () => {
  const navigate = useNavigate();
  const { 
    workflows, 
    loading, 
    error, 
    fetchWorkflows, 
    deleteWorkflow,
    executeWorkflow,
    cancelExecution,
    cloneWorkflow,
    exportWorkflow
  } = useWorkflowAPI();
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter state
  const [statusFilter, setStatusFilter] = useState('');
  
  // Sort state
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortDirection, setSortDirection] = useState('desc');
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState(null);
  
  // Menu state
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(null);
  
  // Filter menu state
  const [filterMenuAnchorEl, setFilterMenuAnchorEl] = useState(null);
  
  // Load workflows on mount
  useEffect(() => {
    const loadWorkflows = async () => {
      try {
        await fetchWorkflows({
          sort_by: sortBy,
          sort_direction: sortDirection,
          status: statusFilter || undefined
        });
      } catch (err) {
        console.error('Error loading workflows:', err);
      }
    };
    
    loadWorkflows();
  }, [fetchWorkflows, sortBy, sortDirection, statusFilter]);
  
  // Filtered and sorted workflows
  const filteredWorkflows = useMemo(() => {
    return workflows.filter(workflow => 
      workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workflow.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [workflows, searchTerm]);
  
  // Pagination handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Search handler
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };
  
  // Sort handler
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };
  
  // Menu handlers
  const handleMenuOpen = (event, workflowId) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedWorkflowId(workflowId);
  };
  
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedWorkflowId(null);
  };
  
  // Filter menu handlers
  const handleFilterMenuOpen = (event) => {
    setFilterMenuAnchorEl(event.currentTarget);
  };
  
  const handleFilterMenuClose = () => {
    setFilterMenuAnchorEl(null);
  };
  
  const handleFilterChange = (status) => {
    setStatusFilter(status);
    handleFilterMenuClose();
    setPage(0);
  };
  
  // Action handlers
  const handleCreateWorkflow = () => {
    navigate('/workflows/new');
  };
  
  const handleViewWorkflow = (workflowId) => {
    navigate(`/workflows/${workflowId}`);
    handleMenuClose();
  };
  
  const handleEditWorkflow = (workflowId) => {
    navigate(`/workflows/${workflowId}/edit`);
    handleMenuClose();
  };
  
  const handleExecuteWorkflow = async (workflowId) => {
    try {
      await executeWorkflow(workflowId);
      // Refresh workflows list
      fetchWorkflows();
    } catch (err) {
      console.error('Error executing workflow:', err);
    }
    handleMenuClose();
  };
  
  const handleCancelExecution = async (workflowId) => {
    try {
      await cancelExecution(workflowId);
      // Refresh workflows list
      fetchWorkflows();
    } catch (err) {
      console.error('Error cancelling workflow execution:', err);
    }
    handleMenuClose();
  };
  
  const handleCloneWorkflow = async (workflowId) => {
    try {
      const clonedWorkflow = await cloneWorkflow(workflowId);
      // Refresh workflows list
      await fetchWorkflows();
      
      // Navigate to the cloned workflow
      navigate(`/workflows/${clonedWorkflow.id}`);
    } catch (err) {
      console.error('Error cloning workflow:', err);
    }
    handleMenuClose();
  };
  
  const handleExportWorkflow = async (workflowId) => {
    try {
      await exportWorkflow(workflowId);
    } catch (err) {
      console.error('Error exporting workflow:', err);
    }
    handleMenuClose();
  };
  
  const handleDeleteClick = (workflow) => {
    setWorkflowToDelete(workflow);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };
  
  const handleDeleteConfirm = async () => {
    if (!workflowToDelete) return;
    
    try {
      await deleteWorkflow(workflowToDelete.id);
      setDeleteDialogOpen(false);
      setWorkflowToDelete(null);
      
      // Refresh workflows list
      fetchWorkflows();
    } catch (err) {
      console.error('Error deleting workflow:', err);
    }
  };
  
  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setWorkflowToDelete(null);
  };
  
  // Calculate the date from ISO string
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  return (
    <Box sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Workflows
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreateWorkflow}
        >
          Create Workflow
        </Button>
      </Box>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={8}>
            <TextField
              fullWidth
              variant="outlined"
              label="Search workflows"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search by name or description"
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={handleFilterMenuOpen}
              size="medium"
            >
              {statusFilter ? `Filter: ${statusFilter}` : 'Filter'}
            </Button>
            
            <Menu
              anchorEl={filterMenuAnchorEl}
              open={Boolean(filterMenuAnchorEl)}
              onClose={handleFilterMenuClose}
            >
              <MenuItem onClick={() => handleFilterChange('')}>
                All statuses
              </MenuItem>
              <MenuItem onClick={() => handleFilterChange('draft')}>
                Draft
              </MenuItem>
              <MenuItem onClick={() => handleFilterChange('active')}>
                Active
              </MenuItem>
              <MenuItem onClick={() => handleFilterChange('in_progress')}>
                In Progress
              </MenuItem>
              <MenuItem onClick={() => handleFilterChange('completed')}>
                Completed
              </MenuItem>
              <MenuItem onClick={() => handleFilterChange('failed')}>
                Failed
              </MenuItem>
              <MenuItem onClick={() => handleFilterChange('cancelled')}>
                Cancelled
              </MenuItem>
            </Menu>
          </Grid>
        </Grid>
      </Paper>
      
      {error && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'error.light' }}>
          <Typography color="error">Error loading workflows: {error}</Typography>
        </Paper>
      )}
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell 
                onClick={() => handleSort('name')}
                sx={{ cursor: 'pointer', fontWeight: 'bold' }}
              >
                Name
                {sortBy === 'name' && (
                  <span>{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                )}
              </TableCell>
              <TableCell>Description</TableCell>
              <TableCell
                onClick={() => handleSort('status')}
                sx={{ cursor: 'pointer', fontWeight: 'bold' }}
              >
                Status
                {sortBy === 'status' && (
                  <span>{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                )}
              </TableCell>
              <TableCell
                onClick={() => handleSort('updated_at')}
                sx={{ cursor: 'pointer', fontWeight: 'bold' }}
              >
                Last Updated
                {sortBy === 'updated_at' && (
                  <span>{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                )}
              </TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography>Loading workflows...</Typography>
                </TableCell>
              </TableRow>
            ) : filteredWorkflows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography>
                    {searchTerm || statusFilter ? 'No matching workflows found' : 'No workflows yet'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredWorkflows
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((workflow) => (
                  <TableRow key={workflow.id} hover>
                    <TableCell 
                      onClick={() => handleViewWorkflow(workflow.id)}
                      sx={{ cursor: 'pointer' }}
                    >
                      {workflow.name}
                    </TableCell>
                    <TableCell>{workflow.description || 'No description'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={workflow.status.charAt(0).toUpperCase() + workflow.status.slice(1)}
                        color={statusColors[workflow.status] || 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{formatDate(workflow.updated_at)}</TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        {['draft', 'active'].includes(workflow.status) && (
                          <Tooltip title="Run">
                            <IconButton
                              size="small"
                              onClick={() => handleExecuteWorkflow(workflow.id)}
                            >
                              <PlayIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        
                        {workflow.status === 'in_progress' && (
                          <Tooltip title="Cancel">
                            <IconButton
                              size="small"
                              onClick={() => handleCancelExecution(workflow.id)}
                            >
                              <StopIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleEditWorkflow(workflow.id)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, workflow.id)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredWorkflows.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
      
      {/* Menu for additional actions */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleViewWorkflow(selectedWorkflowId)}>
          View details
        </MenuItem>
        <MenuItem onClick={() => handleCloneWorkflow(selectedWorkflowId)}>
          <CloneIcon fontSize="small" sx={{ mr: 1 }} />
          Clone
        </MenuItem>
        <MenuItem onClick={() => handleExportWorkflow(selectedWorkflowId)}>
          <ExportIcon fontSize="small" sx={{ mr: 1 }} />
          Export
        </MenuItem>
        <MenuItem 
          onClick={() => {
            const workflow = workflows.find(w => w.id === selectedWorkflowId);
            handleDeleteClick(workflow);
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
      
      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete workflow "{workflowToDelete?.name}"? 
            This action cannot be undone and all associated steps and data will be lost.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
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

export default WorkflowList;