import React, { useState, useRef, useEffect } from 'react';
import {
  Paper,
  InputBase,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Popper,
  ClickAwayListener
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  History as HistoryIcon,
  Article as ArticleIcon,
  Functions as FunctionsIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import { useSearch } from '../../context/SearchContext';
import { useNavigate } from 'react-router-dom';

const GlobalSearch = () => {
  const anchorRef = useRef(null);
  const navigate = useNavigate();
  const {
    searchQuery,
    searchResults,
    isSearching,
    isSearchOpen,
    searchHistory,
    performSearch,
    clearSearch,
    navigateToResult,
    openSearch,
    closeSearch
  } = useSearch();

  const [localQuery, setLocalQuery] = useState('');

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (localQuery.trim()) {
        performSearch(localQuery);
        openSearch();
      } else {
        closeSearch();
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [localQuery, performSearch]);

  const handleClear = () => {
    setLocalQuery('');
    clearSearch();
    closeSearch();
  };

  const handleResultClick = (result) => {
    navigateToResult(result);
    setLocalQuery('');
    closeSearch();
  };

  const handleHistoryClick = (query) => {
    setLocalQuery(query);
    performSearch(query);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'module':
        return <FunctionsIcon />;
      case 'analysis':
        return <AssessmentIcon />;
      case 'documentation':
        return <ArticleIcon />;
      default:
        return <ArticleIcon />;
    }
  };

  return (
    <>
      <Paper
        ref={anchorRef}
        component="form"
        sx={{
          p: '2px 4px',
          display: 'flex',
          alignItems: 'center',
          width: 400,
          maxWidth: '100%'
        }}
        elevation={1}
        onSubmit={(e) => e.preventDefault()}
      >
        <IconButton sx={{ p: '10px' }} aria-label="search">
          <SearchIcon />
        </IconButton>
        <InputBase
          sx={{ ml: 1, flex: 1 }}
          placeholder="Search modules, analyses, documentation..."
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          onFocus={() => {
            if (localQuery || searchHistory.length > 0) {
              openSearch();
            }
          }}
        />
        {localQuery && (
          <IconButton
            type="button"
            sx={{ p: '10px' }}
            aria-label="clear"
            onClick={handleClear}
          >
            <ClearIcon />
          </IconButton>
        )}
      </Paper>

      <Popper
        open={isSearchOpen}
        anchorEl={anchorRef.current}
        placement="bottom-start"
        style={{ zIndex: 1300 }}
      >
        <ClickAwayListener onClickAway={() => closeSearch()}>
          <Paper
            sx={{
              width: anchorRef.current?.offsetWidth || 400,
              mt: 1,
              maxHeight: 400,
              overflow: 'auto'
            }}
            elevation={3}
          >
            {isSearching ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <>
                {searchResults.length > 0 && (
                  <>
                    <Typography variant="subtitle2" sx={{ px: 2, pt: 2, pb: 1 }}>
                      Search Results
                    </Typography>
                    <List dense>
                      {searchResults.map((result) => (
                        <ListItem
                          key={result.id}
                          button
                          onClick={() => handleResultClick(result)}
                        >
                          <ListItemIcon>{getIcon(result.type)}</ListItemIcon>
                          <ListItemText
                            primary={result.title}
                            secondary={result.description}
                          />
                          <Chip
                            label={result.type}
                            size="small"
                            variant="outlined"
                          />
                        </ListItem>
                      ))}
                    </List>
                  </>
                )}

                {!localQuery && searchHistory.length > 0 && (
                  <>
                    <Typography variant="subtitle2" sx={{ px: 2, pt: 2, pb: 1 }}>
                      Recent Searches
                    </Typography>
                    <List dense>
                      {searchHistory.map((query, index) => (
                        <ListItem
                          key={index}
                          button
                          onClick={() => handleHistoryClick(query)}
                        >
                          <ListItemIcon>
                            <HistoryIcon />
                          </ListItemIcon>
                          <ListItemText primary={query} />
                        </ListItem>
                      ))}
                    </List>
                  </>
                )}

                {localQuery && searchResults.length === 0 && !isSearching && (
                  <Box p={3} textAlign="center">
                    <Typography variant="body2" color="text.secondary">
                      No results found for "{localQuery}"
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </Paper>
        </ClickAwayListener>
      </Popper>
    </>
  );
};

export default GlobalSearch;