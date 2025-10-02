import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Box,
  Chip,
  InputAdornment
} from '@mui/material';
import {
  Search as SearchIcon,
  Functions as FunctionsIcon,
  Assessment as AssessmentIcon,
  Science as ScienceIcon,
  ShowChart as ShowChartIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import { useCommandPalette } from '../../context/CommandPaletteContext';
import { useNavigate } from 'react-router-dom';

const CommandPalette = () => {
  const navigate = useNavigate();
  const { isOpen, closeCommandPalette, commands } = useCommandPalette();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCommands, setFilteredCommands] = useState([]);

  const defaultCommands = [
    {
      id: 'sqc',
      title: 'Statistical Quality Control',
      description: 'Control charts, process capability, and more',
      icon: <AssessmentIcon />,
      action: () => navigate('/sqc-analysis'),
      category: 'Analysis'
    },
    {
      id: 'pca',
      title: 'Principal Component Analysis',
      description: 'Dimensionality reduction and visualization',
      icon: <ShowChartIcon />,
      action: () => navigate('/pca-analysis'),
      category: 'Analysis'
    },
    {
      id: 'doe',
      title: 'Design of Experiments',
      description: 'Factorial designs and response surface methodology',
      icon: <ScienceIcon />,
      action: () => navigate('/doe-analysis'),
      category: 'Analysis'
    },
    {
      id: 'confidence',
      title: 'Confidence Intervals',
      description: 'Calculate confidence intervals for various distributions',
      icon: <TimelineIcon />,
      action: () => navigate('/confidence-intervals'),
      category: 'Analysis'
    },
    {
      id: 'probability',
      title: 'Probability Distributions',
      description: 'Explore and analyze probability distributions',
      icon: <FunctionsIcon />,
      action: () => navigate('/probability-distributions'),
      category: 'Analysis'
    }
  ];

  useEffect(() => {
    const allCommands = [...defaultCommands, ...commands];
    
    if (searchQuery) {
      const filtered = allCommands.filter(cmd =>
        cmd.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cmd.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cmd.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCommands(filtered);
    } else {
      setFilteredCommands(allCommands);
    }
  }, [searchQuery, commands]);

  const handleCommandSelect = (command) => {
    if (command.action) {
      command.action();
    }
    closeCommandPalette();
    setSearchQuery('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      closeCommandPalette();
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={closeCommandPalette}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          position: 'absolute',
          top: '20%',
          transform: 'translateY(-20%)',
          borderRadius: 2
        }
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <TextField
          autoFocus
          fullWidth
          placeholder="Search commands..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            sx: { fontSize: '1.1rem', p: 2 }
          }}
          variant="standard"
        />
        
        <List sx={{ maxHeight: 400, overflow: 'auto' }}>
          {filteredCommands.length === 0 ? (
            <ListItem>
              <ListItemText
                primary="No commands found"
                secondary="Try a different search term"
              />
            </ListItem>
          ) : (
            filteredCommands.map((command) => (
              <ListItem
                key={command.id}
                button
                onClick={() => handleCommandSelect(command)}
                sx={{
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
              >
                <ListItemIcon>{command.icon}</ListItemIcon>
                <ListItemText
                  primary={command.title}
                  secondary={command.description}
                />
                {command.category && (
                  <Chip
                    label={command.category}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                )}
              </ListItem>
            ))
          )}
        </List>
        
        <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary">
            Press ESC to close
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default CommandPalette;