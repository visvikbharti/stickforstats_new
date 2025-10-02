import React, { createContext, useState, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const SearchContext = createContext();

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};

export const SearchProvider = ({ children }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState(() => {
    const saved = localStorage.getItem('searchHistory');
    return saved ? JSON.parse(saved) : [];
  });

  const performSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setSearchQuery(query);

    try {
      // Simulate search - in production, this would call your API
      const results = [
        { id: 1, title: 'Statistical Quality Control', type: 'module', path: '/sqc-analysis' },
        { id: 2, title: 'Principal Component Analysis', type: 'module', path: '/pca-analysis' },
        { id: 3, title: 'Design of Experiments', type: 'module', path: '/doe-analysis' },
        { id: 4, title: 'Confidence Intervals', type: 'module', path: '/confidence-intervals' },
        { id: 5, title: 'Probability Distributions', type: 'module', path: '/probability-distributions' },
      ].filter(item => 
        item.title.toLowerCase().includes(query.toLowerCase())
      );

      setSearchResults(results);

      // Update search history
      const updatedHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 10);
      setSearchHistory(updatedHistory);
      localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchHistory]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    localStorage.removeItem('searchHistory');
  }, []);

  const navigateToResult = useCallback((result) => {
    navigate(result.path);
    clearSearch();
  }, [navigate, clearSearch]);

  const openSearch = useCallback(() => {
    setIsSearchOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
    clearSearch();
  }, [clearSearch]);

  const value = {
    searchQuery,
    searchResults,
    isSearching,
    isSearchOpen,
    searchHistory,
    performSearch,
    clearSearch,
    clearHistory,
    navigateToResult,
    openSearch,
    closeSearch
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
};

export default SearchContext;