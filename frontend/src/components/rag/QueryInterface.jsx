import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Paper, 
  Typography, 
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
  Chip,
  List,
  ListItem,
  ListItemText,
  Collapse,
  Badge,
  Alert,
  Snackbar,
  FormControlLabel,
  Switch
} from '@mui/material';
import { 
  Send as SendIcon, 
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  SignalWifi4Bar as ConnectedIcon,
  SignalWifiOff as DisconnectedIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import useRAGWebSocket from '../../hooks/useRAGWebSocket';
import RAGWebSocketStatus from './RAGWebSocketStatus';
import { debounce } from 'lodash';

const QueryInterface = ({ moduleContext = null, initialConversationId = null }) => {
  const [query, setQuery] = useState('');
  const [expandedSources, setExpandedSources] = useState(false);
  const [sourcesData, setSourcesData] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize WebSocket connection with optional conversation ID
  const {
    isConnected,
    isConnecting,
    messages,
    error,
    conversationId,
    typingStatus,
    connect,
    disconnect,
    sendQuery,
    sendTypingStatus,
    sendFeedback
  } = useRAGWebSocket(initialConversationId);

  // Handle WebSocket errors
  useEffect(() => {
    if (error) {
      setErrorMessage(`Connection error: ${error}`);
      setSnackbarOpen(true);
    }
  }, [error]);

  // Scroll to bottom when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input field when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleQueryChange = (e) => {
    setQuery(e.target.value);
    // Send typing status
    sendTypingStatusDebounced(e.target.value.length > 0);
  };

  // Debounced function to avoid sending too many typing status updates
  const sendTypingStatusDebounced = useCallback(
    debounce((isTyping) => {
      sendTypingStatus(isTyping);
    }, 500),
    [sendTypingStatus]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!query.trim() || !isConnected) return;
    
    // Send query through WebSocket
    const context = moduleContext ? { module: moduleContext } : {};
    const success = sendQuery(query, context);
    
    if (success) {
      // Clear input
      setQuery('');
      // Stop typing indicator
      sendTypingStatus(false);
    } else {
      setErrorMessage('Failed to send message. Please try again.');
      setSnackbarOpen(true);
    }
  };

  const handleFeedback = (responseId, isPositive) => {
    sendFeedback(
      responseId,
      isPositive ? 5 : 1,
      isPositive ? 'Helpful response' : 'Not helpful'
    );
  };

  const handleNewConversation = () => {
    // Disconnect current WebSocket
    disconnect();
    
    // Reset states
    setQuery('');
    setExpandedSources(false);
    setSourcesData([]);
    
    // Connect to a new WebSocket without conversation ID
    connect();
  };

  const toggleSources = () => {
    setExpandedSources(!expandedSources);
  };

  // Extract sources from the latest assistant message
  useEffect(() => {
    const assistantMessages = messages.filter(msg => msg.type === 'assistant');
    if (assistantMessages.length > 0) {
      const latestMessage = assistantMessages[assistantMessages.length - 1];
      if (latestMessage.metadata?.sources) {
        setSourcesData(latestMessage.metadata.sources);
      }
    }
  }, [messages]);

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      maxHeight: '600px',
      borderRadius: 1,
      overflow: 'hidden',
      boxShadow: 3
    }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        p: 2, 
        bgcolor: 'primary.main', 
        color: 'white' 
      }}>
        <Typography variant="h6">
          {moduleContext 
            ? `${moduleContext} Assistant` 
            : 'StickForStats Assistant'}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {/* Connection status indicator */}
          <Tooltip title={isConnected ? "Connected" : isConnecting ? "Connecting..." : "Disconnected"}>
            <IconButton 
              data-testid="connection-status"
              data-connected={isConnected}
              color="inherit"
              size="small"
              onClick={isConnected ? disconnect : connect}
              sx={{ ml: 1 }}
            >
              {isConnected ? 
                <ConnectedIcon fontSize="small" /> : 
                <DisconnectedIcon fontSize="small" />
              }
            </IconButton>
          </Tooltip>
          
          {/* New conversation button */}
          <Tooltip title="New conversation">
            <IconButton 
              data-testid="new-conversation-button"
              color="inherit" 
              onClick={handleNewConversation}
              sx={{ ml: 1 }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          {/* Performance monitoring toggle */}
          <Tooltip title="Performance Monitoring">
            <IconButton
              color="inherit"
              size="small"
              onClick={() => setShowPerformanceMonitor(!showPerformanceMonitor)}
              sx={{ ml: 1 }}
            >
              <SpeedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {/* Performance monitoring */}
      {showPerformanceMonitor && (
        <Box sx={{ px: 2, py: 1, bgcolor: '#f9f9f9' }}>
          <RAGWebSocketStatus />
        </Box>
      )}
      
      {/* Conversation display */}
      <Box 
        data-testid="message-list"
        sx={{ 
          flexGrow: 1, 
          overflow: 'auto', 
          p: 2,
          bgcolor: '#f5f5f5'
        }}
      >
        {messages.length === 0 ? (
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '100%',
              flexDirection: 'column',
              gap: 2
            }}
          >
            <Typography color="text.secondary" align="center">
              Ask a question about statistical analysis
              {moduleContext && ` related to ${moduleContext}`}.
            </Typography>
            
            {!isConnected && !isConnecting && (
              <Button 
                variant="outlined" 
                color="primary" 
                size="small" 
                onClick={connect}
                startIcon={<ConnectedIcon />}
              >
                Connect
              </Button>
            )}
            
            {isConnecting && (
              <CircularProgress size={24} />
            )}
          </Box>
        ) : (
          messages.map((message, index) => (
            <Box 
              key={message.id || index} 
              data-testid={message.type === 'user' ? 'user-message' : 'assistant-message'}
              sx={{ 
                mb: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: message.type === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <Paper 
                elevation={1} 
                sx={{ 
                  p: 2, 
                  maxWidth: '80%',
                  bgcolor: message.type === 'user' ? 'primary.light' : 'white',
                  color: message.type === 'user' ? 'white' : 'text.primary',
                }}
              >
                {message.type === 'user' ? (
                  <Typography>{message.content}</Typography>
                ) : (
                  <>
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                    
                    {message.metadata?.sources && message.metadata.sources.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Chip 
                          data-testid="sources-chip"
                          size="small"
                          label={`${message.metadata.sources.length} sources`}
                          onClick={toggleSources}
                          icon={expandedSources ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          variant="outlined"
                          sx={{ mr: 1 }}
                        />
                        
                        {!message.feedbackGiven && (
                          <Box 
                            component="span" 
                            sx={{ 
                              display: 'inline-flex', 
                              alignItems: 'center',
                              ml: 1
                            }}
                          >
                            <Tooltip title="Helpful">
                              <IconButton 
                                data-testid="thumbs-up-button"
                                size="small" 
                                onClick={() => handleFeedback(message.id, true)}
                              >
                                <ThumbUpIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Not helpful">
                              <IconButton 
                                data-testid="thumbs-down-button"
                                size="small" 
                                onClick={() => handleFeedback(message.id, false)}
                              >
                                <ThumbDownIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        )}
                        
                        {message.feedbackGiven && (
                          <Chip 
                            data-testid="feedback-chip"
                            size="small"
                            label={message.feedbackGiven === 'positive' ? 'Helpful' : 'Not helpful'}
                            color={message.feedbackGiven === 'positive' ? 'success' : 'error'}
                            variant="outlined"
                          />
                        )}
                      </Box>
                    )}
                  </>
                )}
              </Paper>
              
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ 
                  mt: 0.5,
                  alignSelf: message.type === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                {new Date(message.created_at).toLocaleTimeString()}
              </Typography>
            </Box>
          ))
        )}
        
        {/* Display typing indicators for other users */}
        {Object.keys(typingStatus).length > 0 && (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'flex-start', 
            my: 1 
          }}>
            {Object.entries(typingStatus)
              .filter(([, status]) => status.isTyping)
              .map(([userId, status]) => (
                <Chip 
                  key={userId}
                  size="small"
                  label={`${status.username} is typing...`}
                  color="primary"
                  variant="outlined"
                  sx={{ mr: 1 }}
                />
              ))
            }
          </Box>
        )}
        
        {/* Display connecting indicator */}
        {isConnecting && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <CircularProgress size={24} />
            <Typography sx={{ ml: 1 }}>Connecting...</Typography>
          </Box>
        )}
        
        {/* Anchor for scrolling to bottom */}
        <div ref={messagesEndRef} />
      </Box>
      
      {/* Sources panel */}
      <Collapse in={expandedSources && sourcesData.length > 0}>
        <Box 
          data-testid="sources-panel"
          sx={{ 
            p: 2, 
            bgcolor: '#f0f0f0', 
            borderTop: '1px solid #ddd',
            maxHeight: '200px',
            overflow: 'auto'
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            Sources
          </Typography>
          <List dense>
            {sourcesData.map((source, index) => (
              <ListItem 
                key={index} 
                data-testid="source-item"
                sx={{ py: 0.5 }}
              >
                <ListItemText
                  primary={source.title}
                  secondary={source.chunk_text?.substring(0, 100) + '...' || 'No preview available'}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      </Collapse>
      
      {/* Input area */}
      <Box 
        component="form" 
        onSubmit={handleSubmit}
        sx={{ 
          p: 2, 
          bgcolor: 'background.paper',
          borderTop: '1px solid #e0e0e0',
          display: 'flex'
        }}
      >
        <TextField
          data-testid="query-input"
          fullWidth
          placeholder={
            isConnected 
              ? "Ask a question..." 
              : isConnecting 
                ? "Connecting..." 
                : "Connect to start chatting"
          }
          value={query}
          onChange={handleQueryChange}
          variant="outlined"
          size="small"
          disabled={!isConnected || isConnecting}
          autoComplete="off"
          inputRef={inputRef}
          sx={{ mr: 1 }}
        />
        <Button
          data-testid="send-button"
          variant="contained"
          color="primary"
          startIcon={<SendIcon />}
          type="submit"
          disabled={!isConnected || isConnecting || !query.trim()}
        >
          Send
        </Button>
      </Box>
      
      {/* Error snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          data-testid="error-message"
          onClose={() => setSnackbarOpen(false)} 
          severity="error" 
          sx={{ width: '100%' }}
        >
          {errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default QueryInterface;