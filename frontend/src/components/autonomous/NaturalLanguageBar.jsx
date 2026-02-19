/**
 * NaturalLanguageBar - Natural Language Query Interface
 * =====================================================
 * Search-bar style component for the Autonomous Intelligence Layer.
 * Users type research questions in plain English and receive statistical
 * analysis results through the autonomous pipeline.
 *
 * Features:
 * - Autocomplete with data-profile-derived suggestions
 * - Real-time intent detection (Comparison, Relationship, Prediction, Association)
 * - Example query helpers
 * - Query history persisted in localStorage
 * - Output mode selector (Simple / Researcher / APA)
 * - Loading progress indicator
 *
 * Created: February 2026
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  Autocomplete,
  TextField,
  IconButton,
  InputAdornment,
  Chip,
  Typography,
  LinearProgress,
  ToggleButtonGroup,
  ToggleButton,
  Menu,
  MenuItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Send as SendIcon,
  History as HistoryIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { queryAnalysis } from '../../services/AutonomousService';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HISTORY_KEY = 'sfs_query_history';
const MAX_HISTORY = 10;

const EXAMPLE_QUERIES = [
  'Is there a difference between groups?',
  'What predicts the outcome?',
  'Are these variables related?',
  'How strong is the association between X and Y?',
];

const INTENT_RULES = [
  { keywords: ['compare', 'difference'], label: 'Comparison', color: 'primary' },
  { keywords: ['correlat', 'relationship'], label: 'Relationship', color: 'secondary' },
  { keywords: ['predict'], label: 'Prediction', color: 'success' },
  { keywords: ['associat'], label: 'Association', color: 'info' },
];

const MODE_MAP = {
  simple: 'plain_english',
  researcher: 'researcher',
  apa: 'apa_format',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Detect the user's analysis intent from the query text. */
const detectIntent = (text) => {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const rule of INTENT_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule;
    }
  }
  return null;
};

/** Read query history from localStorage. */
const loadHistory = () => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Corrupted — reset silently
  }
  return [];
};

/** Persist query history to localStorage, capped at MAX_HISTORY entries. */
const saveHistory = (history) => {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch {
    // Storage full or unavailable — ignore
  }
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const NaturalLanguageBar = ({
  dataFile,
  dataSource,
  suggestions = [],
  onResult,
  onError,
  disabled = false,
}) => {
  // ---- State ----
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('simple');
  const [history, setHistory] = useState(loadHistory);
  const [historyAnchor, setHistoryAnchor] = useState(null);

  const inputRef = useRef(null);

  // Derived
  const intent = detectIntent(query);
  const effectiveDataSource = dataFile || dataSource;

  // Keep history state in sync with localStorage on mount
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  // ---- Handlers ----

  const handleSubmit = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed || !effectiveDataSource || loading) return;

    // Update history — deduplicate, prepend, cap
    setHistory((prev) => {
      const next = [trimmed, ...prev.filter((q) => q !== trimmed)].slice(0, MAX_HISTORY);
      saveHistory(next);
      return next;
    });

    setLoading(true);
    try {
      const result = await queryAnalysis(
        trimmed,
        effectiveDataSource,
        MODE_MAP[mode],
        0.05
      );
      if (onResult) onResult(result);
    } catch (err) {
      if (onError) {
        onError(err?.response?.data || err.message || 'Query failed');
      }
    } finally {
      setLoading(false);
    }
  }, [query, effectiveDataSource, loading, mode, onResult, onError]);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleExampleClick = useCallback((example) => {
    setQuery(example);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleModeChange = useCallback((_event, newMode) => {
    if (newMode !== null) {
      setMode(newMode);
    }
  }, []);

  const handleHistoryOpen = useCallback((event) => {
    setHistoryAnchor(event.currentTarget);
  }, []);

  const handleHistoryClose = useCallback(() => {
    setHistoryAnchor(null);
  }, []);

  const handleHistorySelect = useCallback((item) => {
    setQuery(item);
    setHistoryAnchor(null);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleHistoryClear = useCallback(() => {
    setHistory([]);
    saveHistory([]);
    setHistoryAnchor(null);
  }, []);

  const handleAutocompleteChange = useCallback((_event, newValue) => {
    if (typeof newValue === 'string') {
      setQuery(newValue);
    }
  }, []);

  const handleInputChange = useCallback((_event, newInputValue) => {
    setQuery(newInputValue);
  }, []);

  // ---- Render ----

  return (
    <Box sx={{ width: '100%' }}>
      {/* Main input row */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <Autocomplete
          freeSolo
          fullWidth
          options={suggestions}
          value={query}
          onChange={handleAutocompleteChange}
          inputValue={query}
          onInputChange={handleInputChange}
          disabled={disabled || loading}
          disableClearable
          renderInput={(params) => (
            <TextField
              {...params}
              inputRef={inputRef}
              variant="outlined"
              placeholder="Ask a question about your data..."
              onKeyDown={handleKeyDown}
              disabled={disabled || loading}
              InputProps={{
                ...params.InputProps,
                sx: {
                  fontSize: '1.15rem',
                  py: 0.5,
                },
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color={disabled ? 'disabled' : 'action'} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {/* Intent badge */}
                      {intent && (
                        <Chip
                          label={intent.label}
                          color={intent.color}
                          size="small"
                          variant="outlined"
                          sx={{ mr: 0.5 }}
                        />
                      )}
                      {/* Send button */}
                      <Tooltip title="Submit query">
                        <span>
                          <IconButton
                            onClick={handleSubmit}
                            disabled={disabled || loading || !query.trim()}
                            color="primary"
                            edge="end"
                            aria-label="submit query"
                          >
                            <SendIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </InputAdornment>
                ),
              }}
            />
          )}
        />

        {/* History button */}
        <Tooltip title="Query history">
          <span>
            <IconButton
              onClick={handleHistoryOpen}
              disabled={disabled || history.length === 0}
              aria-label="query history"
              sx={{ mt: 0.75 }}
            >
              <HistoryIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* Loading indicator */}
      {loading && (
        <LinearProgress
          sx={{ mt: 0.5, borderRadius: 1 }}
        />
      )}

      {/* Mode selector */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          mt: 1.5,
          gap: 1,
        }}
      >
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={handleModeChange}
          size="small"
          aria-label="output mode"
        >
          <ToggleButton value="simple" aria-label="simple mode">
            Simple
          </ToggleButton>
          <ToggleButton value="researcher" aria-label="researcher mode">
            Researcher
          </ToggleButton>
          <ToggleButton value="apa" aria-label="APA mode">
            APA
          </ToggleButton>
        </ToggleButtonGroup>

        {/* Example queries */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 0.5,
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mr: 0.5 }}
          >
            Try:
          </Typography>
          {EXAMPLE_QUERIES.map((example) => (
            <Typography
              key={example}
              variant="caption"
              component="span"
              onClick={() => handleExampleClick(example)}
              sx={{
                color: disabled ? 'text.disabled' : 'primary.main',
                cursor: disabled ? 'default' : 'pointer',
                textDecoration: 'underline',
                '&:hover': disabled
                  ? {}
                  : { color: 'primary.dark' },
                whiteSpace: 'nowrap',
              }}
            >
              {example}
            </Typography>
          ))}
        </Box>
      </Box>

      {/* History dropdown menu */}
      <Menu
        anchorEl={historyAnchor}
        open={Boolean(historyAnchor)}
        onClose={handleHistoryClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: { maxWidth: 420, maxHeight: 360 },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Recent queries
          </Typography>
        </Box>
        <Divider />
        {history.map((item, index) => (
          <MenuItem
            key={`${item}-${index}`}
            onClick={() => handleHistorySelect(item)}
            sx={{ whiteSpace: 'normal', maxWidth: 400 }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              <HistoryIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={item}
              primaryTypographyProps={{
                variant: 'body2',
                noWrap: false,
              }}
            />
          </MenuItem>
        ))}
        {history.length > 0 && (
          <>
            <Divider />
            <MenuItem onClick={handleHistoryClear}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <DeleteIcon fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText
                primary="Clear history"
                primaryTypographyProps={{
                  variant: 'body2',
                  color: 'error',
                }}
              />
            </MenuItem>
          </>
        )}
      </Menu>
    </Box>
  );
};

export default NaturalLanguageBar;
