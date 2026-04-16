/**
 * Accessible live region for announcing dynamic content changes.
 * Screen readers will announce changes to this region.
 *
 * Usage:
 *   const { announce } = useLiveRegion();
 *   announce('Analysis complete. 3 results found.');
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Box } from '@mui/material';

const LiveRegionContext = createContext(null);

/**
 * Hook to announce messages to screen readers via the live region.
 * @returns {{ announce: (text: string) => void }}
 */
const useLiveRegion = () => {
  const context = useContext(LiveRegionContext);
  if (!context) {
    // Return a no-op if used outside of LiveRegionProvider (graceful degradation)
    return { announce: () => {} };
  }
  return context;
};

/**
 * Provider that wraps the app and renders a visually-hidden live region.
 * Wrap at the top level (e.g., inside Providers.jsx).
 */
const LiveRegionProvider = ({ children }) => {
  const [message, setMessage] = useState('');

  const announce = useCallback((text) => {
    // Clear first to ensure re-announcement of the same message
    setMessage('');
    requestAnimationFrame(() => {
      setMessage(text);
    });
  }, []);

  return (
    <LiveRegionContext.Provider value={{ announce }}>
      {children}
      <Box
        aria-live="polite"
        aria-atomic="true"
        role="status"
        sx={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {message}
      </Box>
    </LiveRegionContext.Provider>
  );
};

export { LiveRegionProvider, useLiveRegion, LiveRegionContext };
export default LiveRegionProvider;
