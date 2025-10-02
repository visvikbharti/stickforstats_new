import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Chip,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  Button,
  Alert
} from '@mui/material';
import {
  Search as SearchIcon,
  Keyboard as KeyboardIcon,
  Speed as SpeedIcon,
  Navigation as NavigationIcon,
  Edit as EditIcon,
  Assessment as AssessmentIcon,
  SaveAlt as SaveAltIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

const KeyboardShortcutsPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [customizingShortcut, setCustomizingShortcut] = useState(null);

  const shortcutCategories = [
    {
      name: 'Global',
      icon: <KeyboardIcon />,
      shortcuts: [
        { keys: ['Ctrl/Cmd', 'K'], action: 'Open command palette', id: 'cmd-palette' },
        { keys: ['Ctrl/Cmd', '/'], action: 'Toggle help menu', id: 'help-menu' },
        { keys: ['Ctrl/Cmd', 'S'], action: 'Save current work', id: 'save' },
        { keys: ['Ctrl/Cmd', 'Z'], action: 'Undo last action', id: 'undo' },
        { keys: ['Ctrl/Cmd', 'Y'], action: 'Redo last action', id: 'redo' },
        { keys: ['Esc'], action: 'Close modal/dialog', id: 'close-modal' }
      ]
    },
    {
      name: 'Navigation',
      icon: <NavigationIcon />,
      shortcuts: [
        { keys: ['Alt', '1'], action: 'Go to Dashboard', id: 'nav-dashboard' },
        { keys: ['Alt', '2'], action: 'Go to Analysis', id: 'nav-analysis' },
        { keys: ['Alt', '3'], action: 'Go to Visualization', id: 'nav-viz' },
        { keys: ['Alt', '4'], action: 'Go to Reports', id: 'nav-reports' },
        { keys: ['Ctrl/Cmd', '←'], action: 'Navigate back', id: 'nav-back' },
        { keys: ['Ctrl/Cmd', '→'], action: 'Navigate forward', id: 'nav-forward' }
      ]
    },
    {
      name: 'Data & Analysis',
      icon: <AssessmentIcon />,
      shortcuts: [
        { keys: ['Ctrl/Cmd', 'U'], action: 'Upload data', id: 'upload' },
        { keys: ['Ctrl/Cmd', 'R'], action: 'Run analysis', id: 'run-analysis' },
        { keys: ['Ctrl/Cmd', 'E'], action: 'Export results', id: 'export' },
        { keys: ['Ctrl/Cmd', 'P'], action: 'Print preview', id: 'print' },
        { keys: ['F5'], action: 'Refresh data', id: 'refresh' },
        { keys: ['Ctrl/Cmd', 'Shift', 'C'], action: 'Clear cache', id: 'clear-cache' }
      ]
    },
    {
      name: 'Editor',
      icon: <EditIcon />,
      shortcuts: [
        { keys: ['Ctrl/Cmd', 'B'], action: 'Bold text', id: 'bold' },
        { keys: ['Ctrl/Cmd', 'I'], action: 'Italic text', id: 'italic' },
        { keys: ['Ctrl/Cmd', 'F'], action: 'Find in page', id: 'find' },
        { keys: ['Ctrl/Cmd', 'H'], action: 'Find and replace', id: 'replace' },
        { keys: ['Tab'], action: 'Indent selection', id: 'indent' },
        { keys: ['Shift', 'Tab'], action: 'Outdent selection', id: 'outdent' }
      ]
    }
  ];

  const platformShortcuts = {
    windows: {
      modifier: 'Ctrl',
      special: {
        'copy': 'Ctrl+C',
        'paste': 'Ctrl+V',
        'cut': 'Ctrl+X'
      }
    },
    mac: {
      modifier: 'Cmd',
      special: {
        'copy': 'Cmd+C',
        'paste': 'Cmd+V',
        'cut': 'Cmd+X'
      }
    },
    linux: {
      modifier: 'Ctrl',
      special: {
        'copy': 'Ctrl+C',
        'paste': 'Ctrl+V',
        'cut': 'Ctrl+X'
      }
    }
  };

  const getFilteredShortcuts = () => {
    if (!searchTerm) return shortcutCategories;
    
    return shortcutCategories.map(category => ({
      ...category,
      shortcuts: category.shortcuts.filter(shortcut => 
        shortcut.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shortcut.keys.some(key => key.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    })).filter(category => category.shortcuts.length > 0);
  };

  const formatKeys = (keys) => {
    return keys.map((key, index) => (
      <React.Fragment key={index}>
        <Chip 
          label={key} 
          size="small" 
          sx={{ 
            fontFamily: 'monospace',
            fontWeight: 'bold',
            mr: 0.5
          }}
        />
        {index < keys.length - 1 && <Typography component="span" sx={{ mx: 0.5 }}>+</Typography>}
      </React.Fragment>
    ));
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={2} sx={{ p: 4, mb: 4 }}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <KeyboardIcon fontSize="large" color="primary" />
          <Box>
            <Typography variant="h3" component="h1">
              Keyboard Shortcuts
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Master StickForStats with these time-saving keyboard shortcuts
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Quick Tips */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <SpeedIcon color="primary" />
                <Typography variant="h6">Quick Tip</Typography>
              </Box>
              <Typography variant="body2">
                Press <Chip label="Ctrl/Cmd + K" size="small" sx={{ fontFamily: 'monospace' }} /> to open 
                the command palette from anywhere in the app.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <NavigationIcon color="primary" />
                <Typography variant="h6">Navigation</Typography>
              </Box>
              <Typography variant="body2">
                Use <Chip label="Alt + [1-4]" size="small" sx={{ fontFamily: 'monospace' }} /> to quickly 
                jump between main sections.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <SettingsIcon color="primary" />
                <Typography variant="h6">Customization</Typography>
              </Box>
              <Typography variant="body2">
                Click on any shortcut to customize it. Your preferences are saved automatically.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search Bar */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search shortcuts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* Shortcuts Tables */}
      <Paper elevation={1}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          {shortcutCategories.map((category, index) => (
            <Tab 
              key={index} 
              label={category.name} 
              icon={category.icon}
              iconPosition="start"
            />
          ))}
        </Tabs>
        
        <Box sx={{ p: 3 }}>
          {searchTerm ? (
            // Search Results
            getFilteredShortcuts().map((category, categoryIndex) => (
              <Box key={categoryIndex} sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  {category.name}
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Shortcut</TableCell>
                        <TableCell>Action</TableCell>
                        <TableCell align="right">Customize</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {category.shortcuts.map((shortcut) => (
                        <TableRow key={shortcut.id}>
                          <TableCell>
                            <Box display="flex" alignItems="center">
                              {formatKeys(shortcut.keys)}
                            </Box>
                          </TableCell>
                          <TableCell>{shortcut.action}</TableCell>
                          <TableCell align="right">
                            <Button 
                              size="small" 
                              onClick={() => setCustomizingShortcut(shortcut.id)}
                            >
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ))
          ) : (
            // Category View
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Shortcut</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell align="right">Customize</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {shortcutCategories[activeTab].shortcuts.map((shortcut) => (
                    <TableRow key={shortcut.id}>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          {formatKeys(shortcut.keys)}
                        </Box>
                      </TableCell>
                      <TableCell>{shortcut.action}</TableCell>
                      <TableCell align="right">
                        <Button 
                          size="small" 
                          onClick={() => setCustomizingShortcut(shortcut.id)}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Paper>

      {/* Platform-specific info */}
      <Paper elevation={1} sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Platform-Specific Shortcuts
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" gutterBottom>
              Windows/Linux
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Use <Chip label="Ctrl" size="small" /> as the primary modifier key
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" gutterBottom>
              macOS
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Use <Chip label="Cmd (⌘)" size="small" /> as the primary modifier key
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" gutterBottom>
              All Platforms
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Function keys (F1-F12) work the same across all platforms
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Footer Actions */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Button variant="outlined" startIcon={<SaveAltIcon />}>
          Export Shortcuts
        </Button>
        <Button variant="outlined">
          Reset to Defaults
        </Button>
      </Box>

      {customizingShortcut && (
        <Alert severity="info" sx={{ mt: 2 }} onClose={() => setCustomizingShortcut(null)}>
          Press new key combination for this shortcut...
        </Alert>
      )}
    </Container>
  );
};

export default KeyboardShortcutsPage;