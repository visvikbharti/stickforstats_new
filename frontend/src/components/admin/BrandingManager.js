import React, { useState, useContext } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  TextField,
  Button,
  Card,
  CardContent,
  CardActions,
  Switch,
  FormControlLabel,
  Chip,
  ColorPicker,
  IconButton,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tab,
  Tabs
} from '@mui/material';
import {
  Palette as PaletteIcon,
  Image as ImageIcon,
  TextFields as TextFieldsIcon,
  Settings as SettingsIcon,
  Upload as UploadIcon,
  Preview as PreviewIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import BrandingContext from '../../context/BrandingContext';

const BrandingManager = () => {
  const { branding, updateBranding } = useContext(BrandingContext);
  const [activeTab, setActiveTab] = useState(0);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [localBranding, setLocalBranding] = useState(branding || {
    colors: {
      primary: '#1976d2',
      secondary: '#dc004e',
      success: '#2e7d32',
      warning: '#ed6c02',
      error: '#d32f2f',
      info: '#0288d1'
    },
    typography: {
      fontFamily: 'Roboto, Arial, sans-serif',
      headingFont: 'Roboto, Arial, sans-serif',
      fontSize: {
        small: 12,
        medium: 14,
        large: 16
      }
    },
    logos: {
      light: null,
      dark: null,
      favicon: null
    },
    companyInfo: {
      name: 'StickForStats',
      tagline: 'Statistical Analysis Made Simple',
      description: 'Comprehensive statistical analysis platform for researchers and data scientists'
    },
    features: {
      darkMode: true,
      animations: true,
      compactMode: false
    }
  });

  const handleColorChange = (colorKey, value) => {
    setLocalBranding({
      ...localBranding,
      colors: {
        ...localBranding.colors,
        [colorKey]: value
      }
    });
    setUnsavedChanges(true);
  };

  const handleTextChange = (section, field, value) => {
    setLocalBranding({
      ...localBranding,
      [section]: {
        ...localBranding[section],
        [field]: value
      }
    });
    setUnsavedChanges(true);
  };

  const handleFeatureToggle = (feature) => {
    setLocalBranding({
      ...localBranding,
      features: {
        ...localBranding.features,
        [feature]: !localBranding.features[feature]
      }
    });
    setUnsavedChanges(true);
  };

  const handleSave = () => {
    updateBranding(localBranding);
    setUnsavedChanges(false);
  };

  const handleReset = () => {
    setLocalBranding(branding);
    setUnsavedChanges(false);
  };

  const colorOptions = [
    { key: 'primary', label: 'Primary Color', description: 'Main brand color' },
    { key: 'secondary', label: 'Secondary Color', description: 'Accent color' },
    { key: 'success', label: 'Success Color', description: 'Success states' },
    { key: 'warning', label: 'Warning Color', description: 'Warning states' },
    { key: 'error', label: 'Error Color', description: 'Error states' },
    { key: 'info', label: 'Info Color', description: 'Information states' }
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={2} sx={{ p: 4, mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h3" component="h1" gutterBottom>
              Branding Manager
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Customize the look and feel of your StickForStats instance
            </Typography>
          </Box>
          <Box>
            {unsavedChanges && (
              <Chip 
                label="Unsaved Changes" 
                color="warning" 
                size="small" 
                sx={{ mr: 2 }}
              />
            )}
            <Button 
              variant="outlined" 
              startIcon={<PreviewIcon />}
              sx={{ mr: 1 }}
            >
              Preview
            </Button>
            <Button 
              variant="contained" 
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={!unsavedChanges}
            >
              Save Changes
            </Button>
          </Box>
        </Box>
      </Paper>

      <Paper elevation={1}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab icon={<PaletteIcon />} label="Colors" />
          <Tab icon={<TextFieldsIcon />} label="Typography" />
          <Tab icon={<ImageIcon />} label="Logos & Images" />
          <Tab icon={<SettingsIcon />} label="Features" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {activeTab === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Typography variant="h6" gutterBottom>
                  Color Palette
                </Typography>
                <Grid container spacing={2}>
                  {colorOptions.map((color) => (
                    <Grid item xs={12} sm={6} key={color.key}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle1" gutterBottom>
                            {color.label}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {color.description}
                          </Typography>
                          <Box display="flex" alignItems="center" gap={2} mt={2}>
                            <Box
                              sx={{
                                width: 60,
                                height: 60,
                                borderRadius: 1,
                                bgcolor: localBranding.colors[color.key],
                                border: '1px solid',
                                borderColor: 'divider'
                              }}
                            />
                            <TextField
                              size="small"
                              value={localBranding.colors[color.key]}
                              onChange={(e) => handleColorChange(color.key, e.target.value)}
                              sx={{ flex: 1 }}
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.100' }}>
                  <Typography variant="h6" gutterBottom>
                    Color Preview
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Button variant="contained" color="primary" fullWidth sx={{ mb: 1 }}>
                      Primary Button
                    </Button>
                    <Button variant="contained" color="secondary" fullWidth sx={{ mb: 1 }}>
                      Secondary Button
                    </Button>
                    <Alert severity="success" sx={{ mb: 1 }}>Success Message</Alert>
                    <Alert severity="warning" sx={{ mb: 1 }}>Warning Message</Alert>
                    <Alert severity="error" sx={{ mb: 1 }}>Error Message</Alert>
                    <Alert severity="info">Info Message</Alert>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          )}

          {activeTab === 1 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Font Settings
                </Typography>
                <TextField
                  fullWidth
                  label="Primary Font Family"
                  value={localBranding.typography.fontFamily}
                  onChange={(e) => handleTextChange('typography', 'fontFamily', e.target.value)}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="Heading Font Family"
                  value={localBranding.typography.headingFont}
                  onChange={(e) => handleTextChange('typography', 'headingFont', e.target.value)}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Typography Preview
                </Typography>
                <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.100' }}>
                  <Typography variant="h4" sx={{ fontFamily: localBranding.typography.headingFont }}>
                    Heading Example
                  </Typography>
                  <Typography variant="body1" sx={{ fontFamily: localBranding.typography.fontFamily }}>
                    Body text example using the selected font family.
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          )}

          {activeTab === 2 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Logo Management
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle1" gutterBottom>
                          Light Mode Logo
                        </Typography>
                        <Box
                          sx={{
                            height: 120,
                            bgcolor: 'grey.200',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 1,
                            mb: 2
                          }}
                        >
                          <ImageIcon sx={{ fontSize: 48, color: 'grey.500' }} />
                        </Box>
                        <Button
                          fullWidth
                          variant="outlined"
                          startIcon={<UploadIcon />}
                        >
                          Upload Logo
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle1" gutterBottom>
                          Dark Mode Logo
                        </Typography>
                        <Box
                          sx={{
                            height: 120,
                            bgcolor: 'grey.800',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 1,
                            mb: 2
                          }}
                        >
                          <ImageIcon sx={{ fontSize: 48, color: 'grey.600' }} />
                        </Box>
                        <Button
                          fullWidth
                          variant="outlined"
                          startIcon={<UploadIcon />}
                        >
                          Upload Logo
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle1" gutterBottom>
                          Favicon
                        </Typography>
                        <Box
                          sx={{
                            height: 120,
                            bgcolor: 'grey.200',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 1,
                            mb: 2
                          }}
                        >
                          <ImageIcon sx={{ fontSize: 32, color: 'grey.500' }} />
                        </Box>
                        <Button
                          fullWidth
                          variant="outlined"
                          startIcon={<UploadIcon />}
                        >
                          Upload Favicon
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Company Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Company Name"
                      value={localBranding.companyInfo.name}
                      onChange={(e) => handleTextChange('companyInfo', 'name', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Tagline"
                      value={localBranding.companyInfo.tagline}
                      onChange={(e) => handleTextChange('companyInfo', 'tagline', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Description"
                      value={localBranding.companyInfo.description}
                      onChange={(e) => handleTextChange('companyInfo', 'description', e.target.value)}
                    />
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          )}

          {activeTab === 3 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Feature Settings
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Dark Mode"
                      secondary="Allow users to switch between light and dark themes"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={localBranding.features.darkMode}
                        onChange={() => handleFeatureToggle('darkMode')}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Animations"
                      secondary="Enable smooth transitions and animations"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={localBranding.features.animations}
                        onChange={() => handleFeatureToggle('animations')}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Compact Mode"
                      secondary="Reduce spacing for more content density"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={localBranding.features.compactMode}
                        onChange={() => handleFeatureToggle('compactMode')}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </Grid>
            </Grid>
          )}
        </Box>
      </Paper>

      {unsavedChanges && (
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button variant="outlined" onClick={handleReset} startIcon={<RefreshIcon />}>
            Reset Changes
          </Button>
          <Button variant="contained" onClick={handleSave} startIcon={<SaveIcon />}>
            Save Changes
          </Button>
        </Box>
      )}
    </Container>
  );
};

export default BrandingManager;