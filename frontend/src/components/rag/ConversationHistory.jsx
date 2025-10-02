import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  TextField,
  InputAdornment,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Chip
} from '@mui/material';
import {
  Search as SearchIcon,
  Delete as DeleteIcon,
  ArrowForward as ArrowForwardIcon,
  Visibility as VisibilityIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { api } from '../../services/api';

const ConversationHistory = ({ moduleContext = null }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [viewConversation, setViewConversation] = useState(null);
  const [conversationMessages, setConversationMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchConversations();
  }, [moduleContext, fetchConversations]);

  const fetchConversations = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let url = '/rag_system/api/conversations/';
      
      // Add module filter if provided
      if (moduleContext) {
        url += `?context__module=${moduleContext}`;
      }
      
      const response = await api.get(url);
      setConversations(response.data);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError('Failed to load conversation history');
    } finally {
      setLoading(false);
    }
  };

  const fetchConversationMessages = async (conversationId) => {
    setLoadingMessages(true);
    
    try {
      const response = await api.get(`/rag_system/api/conversations/${conversationId}/messages/`);
      setConversationMessages(response.data);
    } catch (err) {
      console.error('Error fetching conversation messages:', err);
      setConversationMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleDeleteConversation = (conversation) => {
    setSelectedConversation(conversation);
    setOpenDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await api.delete(`/rag_system/api/conversations/${selectedConversation.id}/`);
      
      // Refresh conversations list
      fetchConversations();
      setOpenDeleteDialog(false);
      
      // If viewing the deleted conversation, close the view
      if (viewConversation && viewConversation.id === selectedConversation.id) {
        setViewConversation(null);
      }
    } catch (err) {
      console.error('Error deleting conversation:', err);
      setError('Failed to delete conversation');
    }
  };

  const handleViewConversation = async (conversation) => {
    setViewConversation(conversation);
    await fetchConversationMessages(conversation.id);
  };

  const handleContinueConversation = (conversation) => {
    // Navigate to the query interface with this conversation
    navigate('/rag?conversation_id=' + conversation.id);
  };

  // Filter conversations by search term
  const filteredConversations = conversations.filter(conversation => 
    conversation.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Format timestamp
  const formatTime = (timestamp) => {
    try {
      return format(new Date(timestamp), 'MMM d, yyyy h:mm a');
    } catch (e) {
      return timestamp;
    }
  };

  return (
    <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h5" gutterBottom>
        Conversation History
      </Typography>
      
      {/* Search bar */}
      <TextField
        fullWidth
        size="small"
        placeholder="Search conversations..."
        value={searchTerm}
        onChange={handleSearchChange}
        variant="outlined"
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />
      
      {/* Conversation list and details */}
      <Box sx={{ 
        display: 'flex', 
        flexGrow: 1,
        gap: 2,
        overflow: 'hidden'
      }}>
        {/* Conversations list */}
        <Paper 
          sx={{ 
            width: '40%', 
            maxHeight: '100%',
            overflow: 'auto',
            borderRadius: 1
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : error ? (
            <Box sx={{ p: 2, color: 'error.main' }}>
              {error}
            </Box>
          ) : filteredConversations.length === 0 ? (
            <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
              No conversations found
            </Box>
          ) : (
            <List disablePadding>
              {filteredConversations.map((conversation, index) => (
                <React.Fragment key={conversation.id}>
                  {index > 0 && <Divider />}
                  <ListItem 
                    button 
                    onClick={() => handleViewConversation(conversation)}
                    selected={viewConversation && viewConversation.id === conversation.id}
                  >
                    <ListItemText
                      primary={conversation.title || 'Untitled Conversation'}
                      secondary={formatTime(conversation.created_at)}
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="Continue this conversation">
                        <IconButton 
                          edge="end" 
                          aria-label="continue"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleContinueConversation(conversation);
                          }}
                        >
                          <ArrowForwardIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton 
                          edge="end" 
                          aria-label="delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteConversation(conversation);
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          )}
        </Paper>
        
        {/* Conversation details */}
        <Paper 
          sx={{ 
            width: '60%', 
            maxHeight: '100%',
            overflow: 'auto',
            p: 2,
            borderRadius: 1,
            bgcolor: viewConversation ? 'white' : '#f5f5f5'
          }}
        >
          {viewConversation ? (
            <>
              <Box sx={{ 
                mb: 2, 
                pb: 1, 
                borderBottom: '1px solid #e0e0e0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <Typography variant="h6">
                    {viewConversation.title || 'Untitled Conversation'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Created: {formatTime(viewConversation.created_at)}
                  </Typography>
                </div>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ArrowForwardIcon />}
                  onClick={() => handleContinueConversation(viewConversation)}
                >
                  Continue
                </Button>
              </Box>
              
              {/* Conversation messages */}
              {loadingMessages ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : conversationMessages.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                  No messages in this conversation
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {conversationMessages.map((message, index) => (
                    <Box key={message.id} sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: message.message_type === 'user' ? 'flex-end' : 'flex-start',
                    }}>
                      <Paper 
                        elevation={1} 
                        sx={{ 
                          p: 2, 
                          maxWidth: '80%',
                          bgcolor: message.message_type === 'user' ? 'primary.light' : 'white',
                          color: message.message_type === 'user' ? 'white' : 'text.primary',
                          border: '1px solid #e0e0e0'
                        }}
                      >
                        <Typography variant="body2">
                          {message.content}
                        </Typography>
                      </Paper>
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        sx={{ 
                          mt: 0.5,
                          alignSelf: message.message_type === 'user' ? 'flex-end' : 'flex-start'
                        }}
                      >
                        {formatTime(message.created_at)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </>
          ) : (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'center', 
              alignItems: 'center',
              height: '100%'
            }}>
              <VisibilityIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                Select a conversation to view its details
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>
      
      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={openDeleteDialog} 
        onClose={() => setOpenDeleteDialog(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the conversation 
            <strong>"{selectedConversation?.title || 'Untitled Conversation'}"</strong>?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>
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

export default ConversationHistory;