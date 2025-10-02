import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { api } from '../../services/api';

const SourcesExplorer = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [filterType, setFilterType] = useState('');
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: '',
    content: '',
    document_type: '',
    module: '',
    topic: '',
    metadata: {}
  });
  const [moduleOptions, setModuleOptions] = useState([]);
  const [documentTypeOptions, setDocumentTypeOptions] = useState([
    'instruction', 'explanation', 'example', 'reference', 'guideline'
  ]);

  useEffect(() => {
    fetchDocuments();
    fetchModuleOptions();
  }, [page, rowsPerPage, filterModule, filterType, fetchDocuments]);

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let url = `/rag_system/api/documents/?limit=${rowsPerPage}&offset=${page * rowsPerPage}`;
      
      if (filterModule) {
        url += `&module=${filterModule}`;
      }
      
      if (filterType) {
        url += `&document_type=${filterType}`;
      }
      
      const response = await api.get(url);
      setDocuments(response.data.results || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const fetchModuleOptions = async () => {
    try {
      const response = await api.get('/core/api/modules/');
      setModuleOptions(response.data.map(module => module.name));
    } catch (err) {
      console.error('Error fetching module options:', err);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleFilterModuleChange = (event) => {
    setFilterModule(event.target.value);
    setPage(0);
  };

  const handleFilterTypeChange = (event) => {
    setFilterType(event.target.value);
    setPage(0);
  };

  const handleViewDocument = (document) => {
    setSelectedDocument(document);
    setOpenViewDialog(true);
  };

  const handleEditDocument = (document) => {
    setSelectedDocument(document);
    setEditFormData({
      title: document.title,
      content: document.content,
      document_type: document.document_type,
      module: document.module,
      topic: document.topic,
      metadata: document.metadata
    });
    setOpenEditDialog(true);
  };

  const handleDeleteDocument = (document) => {
    setSelectedDocument(document);
    setOpenDeleteDialog(true);
  };

  const handleAddNewDocument = () => {
    setSelectedDocument(null);
    setEditFormData({
      title: '',
      content: '',
      document_type: '',
      module: '',
      topic: '',
      metadata: {}
    });
    setOpenEditDialog(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveDocument = async () => {
    setDialogLoading(true);
    
    try {
      if (selectedDocument) {
        // Update existing document
        await api.put(`/rag_system/api/documents/${selectedDocument.id}/`, editFormData);
      } else {
        // Create new document
        await api.post('/rag_system/api/documents/', editFormData);
      }
      
      // Refresh documents list
      fetchDocuments();
      setOpenEditDialog(false);
    } catch (err) {
      console.error('Error saving document:', err);
      setError('Failed to save document');
    } finally {
      setDialogLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    setDialogLoading(true);
    
    try {
      await api.delete(`/rag_system/api/documents/${selectedDocument.id}/`);
      
      // Refresh documents list
      fetchDocuments();
      setOpenDeleteDialog(false);
    } catch (err) {
      console.error('Error deleting document:', err);
      setError('Failed to delete document');
    } finally {
      setDialogLoading(false);
    }
  };

  // Filter documents by search term
  const filteredDocuments = documents.filter(document => 
    document.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    document.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Knowledge Base Sources
      </Typography>
      
      {/* Filters and search */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <TextField
          size="small"
          label="Search"
          variant="outlined"
          value={searchTerm}
          onChange={handleSearchChange}
          sx={{ flexGrow: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        
        <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Module</InputLabel>
          <Select
            value={filterModule}
            onChange={handleFilterModuleChange}
            label="Module"
          >
            <MenuItem value="">
              <em>All</em>
            </MenuItem>
            {moduleOptions.map(module => (
              <MenuItem key={module} value={module}>
                {module}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Document Type</InputLabel>
          <Select
            value={filterType}
            onChange={handleFilterTypeChange}
            label="Document Type"
          >
            <MenuItem value="">
              <em>All</em>
            </MenuItem>
            {documentTypeOptions.map(type => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddNewDocument}
        >
          Add New
        </Button>
      </Box>
      
      {/* Documents table */}
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} size="small">
          <TableHead>
            <TableRow>
              <TableCell><strong>Title</strong></TableCell>
              <TableCell><strong>Type</strong></TableCell>
              <TableCell><strong>Module</strong></TableCell>
              <TableCell><strong>Topic</strong></TableCell>
              <TableCell><strong>Created</strong></TableCell>
              <TableCell align="right"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ color: 'error.main' }}>
                  {error}
                </TableCell>
              </TableRow>
            ) : filteredDocuments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No documents found
                </TableCell>
              </TableRow>
            ) : (
              filteredDocuments.map((document) => (
                <TableRow key={document.id}>
                  <TableCell>{document.title}</TableCell>
                  <TableCell>
                    <Chip 
                      label={document.document_type} 
                      size="small" 
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{document.module}</TableCell>
                  <TableCell>{document.topic}</TableCell>
                  <TableCell>
                    {new Date(document.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton 
                      size="small" 
                      onClick={() => handleViewDocument(document)}
                      aria-label="view"
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={() => handleEditDocument(document)}
                      aria-label="edit"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={() => handleDeleteDocument(document)}
                      aria-label="delete"
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={documents.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
      
      {/* View Document Dialog */}
      <Dialog 
        open={openViewDialog} 
        onClose={() => setOpenViewDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedDocument?.title}
          <Chip 
            label={selectedDocument?.document_type} 
            size="small" 
            sx={{ ml: 1 }}
            variant="outlined"
          />
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle2">
            Module: {selectedDocument?.module} | 
            Topic: {selectedDocument?.topic} | 
            Created: {selectedDocument?.created_at && new Date(selectedDocument.created_at).toLocaleDateString()}
          </Typography>
          <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
              {selectedDocument?.content}
            </pre>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewDialog(false)}>Close</Button>
          <Button 
            onClick={() => {
              setOpenViewDialog(false);
              handleEditDocument(selectedDocument);
            }}
            color="primary"
          >
            Edit
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Edit Document Dialog */}
      <Dialog 
        open={openEditDialog} 
        onClose={() => setOpenEditDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedDocument ? 'Edit Document' : 'Add New Document'}
        </DialogTitle>
        <DialogContent dividers>
          <Box component="form" sx={{ '& .MuiTextField-root': { mb: 2 } }}>
            <TextField
              fullWidth
              label="Title"
              name="title"
              value={editFormData.title}
              onChange={handleInputChange}
              variant="outlined"
            />
            
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Document Type</InputLabel>
                <Select
                  name="document_type"
                  value={editFormData.document_type}
                  onChange={handleInputChange}
                  label="Document Type"
                >
                  <MenuItem value="">
                    <em>Select a type</em>
                  </MenuItem>
                  {documentTypeOptions.map(type => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth variant="outlined">
                <InputLabel>Module</InputLabel>
                <Select
                  name="module"
                  value={editFormData.module}
                  onChange={handleInputChange}
                  label="Module"
                >
                  <MenuItem value="">
                    <em>Select a module</em>
                  </MenuItem>
                  {moduleOptions.map(module => (
                    <MenuItem key={module} value={module}>
                      {module}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <TextField
                fullWidth
                label="Topic"
                name="topic"
                value={editFormData.topic}
                onChange={handleInputChange}
                variant="outlined"
              />
            </Box>
            
            <TextField
              fullWidth
              label="Content"
              name="content"
              value={editFormData.content}
              onChange={handleInputChange}
              variant="outlined"
              multiline
              rows={10}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setOpenEditDialog(false)}
            disabled={dialogLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveDocument}
            color="primary"
            variant="contained"
            disabled={dialogLoading}
            startIcon={dialogLoading ? <CircularProgress size={24} /> : null}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={openDeleteDialog} 
        onClose={() => setOpenDeleteDialog(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the document <strong>"{selectedDocument?.title}"</strong>?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setOpenDeleteDialog(false)}
            disabled={dialogLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={dialogLoading}
            startIcon={dialogLoading ? <CircularProgress size={24} /> : null}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SourcesExplorer;