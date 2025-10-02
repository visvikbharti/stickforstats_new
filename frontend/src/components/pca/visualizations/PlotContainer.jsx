import React, { useCallback } from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import { saveSvgAsPng } from 'save-svg-as-png';

// Plot container with download buttons
const PlotContainer = ({ children, plotRef, filename }) => {
  // Function to handle download
  const handleDownload = useCallback(() => {
    if (!plotRef.current) return;
    
    const svgElement = plotRef.current.querySelector('svg');
    if (svgElement) {
      saveSvgAsPng(svgElement, `${filename}.png`, { scale: 2.0 });
    }
  }, [plotRef, filename]);

  return (
    <Box sx={{ 
      p: 1, 
      border: '1px solid divider',
      borderRadius: 1,
      position: 'relative'
    }}>
      <Box sx={{ 
        position: 'absolute', 
        top: 10, 
        right: 10, 
        zIndex: 2,
        display: 'flex',
        gap: 1
      }}>
        <Tooltip title="Download as PNG">
          <IconButton 
            onClick={handleDownload}
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.7)' }}
          >
            <DownloadIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="View fullscreen">
          <IconButton
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.7)' }}
          >
            <FullscreenIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      {children}
    </Box>
  );
};

export default React.memo(PlotContainer);