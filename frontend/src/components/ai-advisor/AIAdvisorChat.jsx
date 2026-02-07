/**
 * AI Advisor Chat Interface
 *
 * The main chat interface for interacting with StickAI.
 * Features:
 * - Message bubbles with markdown support
 * - Code syntax highlighting
 * - Interactive test recommendations
 * - Typing indicators
 * - Message actions (copy, regenerate)
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Paper,
  Avatar,
  Chip,
  Button,
  Tooltip,
  Collapse,
  CircularProgress,
  Divider,
  Card,
  CardContent,
  CardActions,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Send as SendIcon,
  ContentCopy as CopyIcon,
  Psychology as AIIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
  Science as ScienceIcon,
  Code as CodeIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  PlayArrow as RunIcon,
  Description as MethodsIcon,
} from '@mui/icons-material';

/**
 * Individual message component
 */
const ChatMessage = ({
  message,
  isUser,
  isLoading,
  onCopy,
  onRegenerate,
  onTestRecommendation,
  onMethodsGenerate,
}) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const [copied, setCopied] = useState(false);
  const [expandedCode, setExpandedCode] = useState(false);

  // Handle copy to clipboard
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (onCopy) onCopy(message);
  }, [message, onCopy]);

  // Parse message for special content (code blocks, recommendations)
  const parseContent = (content) => {
    if (!content) return null;

    // Split by code blocks
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      // Code block
      if (part.startsWith('```')) {
        const match = part.match(/```(\w*)\n?([\s\S]*?)```/);
        const language = match?.[1] || 'text';
        const code = match?.[2] || part.slice(3, -3);

        return (
          <Box key={index} sx={{ my: 2 }}>
            <Paper
              sx={{
                bgcolor: '#1e1e1e',
                borderRadius: 1,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  px: 2,
                  py: 0.5,
                  bgcolor: isDarkMode ? theme.palette.grey[900] : '#2d2d2d',
                  borderBottom: `1px solid ${isDarkMode ? theme.palette.divider : '#404040'}`,
                }}
              >
                <Typography variant="caption" sx={{ color: theme.palette.grey[500] }}>
                  {language.toUpperCase()}
                </Typography>
                <Tooltip title="Copy code">
                  <IconButton
                    size="small"
                    onClick={() => navigator.clipboard.writeText(code)}
                    sx={{ color: theme.palette.grey[500] }}
                  >
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: 2,
                  overflow: 'auto',
                  maxHeight: expandedCode ? 'none' : 200,
                  fontFamily: 'Monaco, Consolas, monospace',
                  fontSize: '0.85rem',
                  lineHeight: 1.5,
                  color: '#d4d4d4',
                }}
              >
                <code>{code}</code>
              </Box>
              {code.split('\n').length > 10 && (
                <Button
                  size="small"
                  onClick={() => setExpandedCode(!expandedCode)}
                  sx={{ width: '100%', color: theme.palette.grey[500] }}
                >
                  {expandedCode ? <CollapseIcon /> : <ExpandIcon />}
                  {expandedCode ? 'Collapse' : 'Expand'}
                </Button>
              )}
            </Paper>
          </Box>
        );
      }

      // Regular text with basic markdown
      return (
        <Typography
          key={index}
          component="div"
          variant="body2"
          sx={{
            whiteSpace: 'pre-wrap',
            '& strong': { fontWeight: 600 },
            '& em': { fontStyle: 'italic' },
            '& code': {
              bgcolor: isUser ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)',
              px: 0.5,
              borderRadius: 0.5,
              fontFamily: 'Monaco, Consolas, monospace',
              fontSize: '0.9em',
            },
          }}
          dangerouslySetInnerHTML={{
            __html: part
              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              .replace(/\*(.*?)\*/g, '<em>$1</em>')
              .replace(/`([^`]+)`/g, '<code>$1</code>')
              .replace(/\n/g, '<br/>')
          }}
        />
      );
    });
  };

  // Check for test recommendations in message
  const testRecommendations = message.recommendations || [];

  // Loading state
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1.5,
          mb: 2,
          px: 2,
        }}
      >
        <Avatar
          sx={{
            width: 32,
            height: 32,
            bgcolor: theme.palette.primary.main,
          }}
        >
          <AIIcon sx={{ fontSize: 18 }} />
        </Avatar>
        <Paper
          sx={{
            p: 2,
            maxWidth: '85%',
            bgcolor: theme.palette.grey[isDarkMode ? 800 : 100],
            borderRadius: '4px 16px 16px 16px',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {[0, 1, 2].map((i) => (
                <Box
                  key={i}
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: theme.palette.grey[400],
                    animation: 'typing 1.4s infinite',
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))}
            </Box>
            <Typography variant="body2" color="text.secondary">
              StickAI is thinking...
            </Typography>
          </Box>
        </Paper>
        <style>
          {`
            @keyframes typing {
              0%, 100% { opacity: 0.3; transform: translateY(0); }
              50% { opacity: 1; transform: translateY(-4px); }
            }
          `}
        </style>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        gap: 1.5,
        mb: 2,
        px: 2,
      }}
    >
      {/* Avatar */}
      <Avatar
        sx={{
          width: 32,
          height: 32,
          bgcolor: isUser ? theme.palette.secondary.main : theme.palette.primary.main,
        }}
      >
        {isUser ? <PersonIcon sx={{ fontSize: 18 }} /> : <AIIcon sx={{ fontSize: 18 }} />}
      </Avatar>

      {/* Message content */}
      <Box sx={{ maxWidth: '85%' }}>
        <Paper
          sx={{
            p: 2,
            bgcolor: isUser ? theme.palette.secondary.main : theme.palette.grey[isDarkMode ? 800 : 100],
            color: isUser ? theme.palette.secondary.contrastText : theme.palette.text.primary,
            borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
          }}
        >
          {parseContent(message.content)}
        </Paper>

        {/* Test Recommendations */}
        {testRecommendations.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              Recommended Tests:
            </Typography>
            {testRecommendations.map((test, index) => (
              <Card
                key={index}
                variant="outlined"
                sx={{
                  mt: 1,
                  borderColor: theme.palette.primary.main,
                  borderLeft: `4px solid ${theme.palette.primary.main}`,
                }}
              >
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ScienceIcon sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
                    <Typography variant="subtitle2">{test.name}</Typography>
                    {test.confidence && (
                      <Chip
                        label={`${test.confidence}% match`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    )}
                  </Box>
                  {test.reason && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {test.reason}
                    </Typography>
                  )}
                </CardContent>
                <CardActions sx={{ pt: 0 }}>
                  <Button
                    size="small"
                    startIcon={<RunIcon />}
                    onClick={() => onTestRecommendation?.(test)}
                  >
                    Run This Test
                  </Button>
                </CardActions>
              </Card>
            ))}
          </Box>
        )}

        {/* Message Actions */}
        {!isUser && (
          <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
            <Tooltip title={copied ? 'Copied!' : 'Copy'}>
              <IconButton size="small" onClick={handleCopy}>
                {copied ? (
                  <CheckIcon sx={{ fontSize: 16, color: theme.palette.success.main }} />
                ) : (
                  <CopyIcon sx={{ fontSize: 16 }} />
                )}
              </IconButton>
            </Tooltip>
            <Tooltip title="Regenerate">
              <IconButton size="small" onClick={() => onRegenerate?.(message)}>
                <RefreshIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            {message.canGenerateMethods && (
              <Tooltip title="Generate Methods Section">
                <IconButton size="small" onClick={() => onMethodsGenerate?.(message)}>
                  <MethodsIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}

        {/* Timestamp */}
        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
          {message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : ''}
        </Typography>
      </Box>
    </Box>
  );
};

/**
 * Main Chat Interface Component
 */
const AIAdvisorChat = ({
  messages = [],
  isLoading = false,
  onSendMessage,
  onTestRecommendation,
  onMethodsGenerate,
}) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle send message
  const handleSend = useCallback(() => {
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  }, [input, isLoading, onSendMessage]);

  // Handle key press
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Messages Area */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          py: 2,
        }}
      >
        {messages.map((message, index) => (
          <ChatMessage
            key={message.id || index}
            message={message}
            isUser={message.role === 'user'}
            onTestRecommendation={onTestRecommendation}
            onMethodsGenerate={onMethodsGenerate}
          />
        ))}

        {isLoading && (
          <ChatMessage
            message={{ content: '' }}
            isUser={false}
            isLoading={true}
          />
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* Input Area */}
      <Box
        sx={{
          p: 2,
          bgcolor: theme.palette.grey[isDarkMode ? 800 : 100],
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            alignItems: 'flex-end',
          }}
        >
          <TextField
            ref={inputRef}
            fullWidth
            multiline
            maxRows={4}
            placeholder="Ask me anything about statistics..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: theme.palette.background.paper,
                borderRadius: 3,
                '& fieldset': {
                  borderColor: theme.palette.divider,
                },
                '&:hover fieldset': {
                  borderColor: theme.palette.primary.main,
                },
                '&.Mui-focused fieldset': {
                  borderColor: theme.palette.primary.main,
                },
              },
            }}
          />
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            sx={{
              bgcolor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              width: 48,
              height: 48,
              '&:hover': {
                bgcolor: theme.palette.primary.dark,
              },
              '&.Mui-disabled': {
                bgcolor: theme.palette.action.disabledBackground,
                color: theme.palette.action.disabled,
              },
            }}
          >
            {isLoading ? (
              <CircularProgress size={24} sx={{ color: 'white' }} />
            ) : (
              <SendIcon />
            )}
          </IconButton>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Press Enter to send, Shift+Enter for new line
        </Typography>
      </Box>
    </Box>
  );
};

export default AIAdvisorChat;
