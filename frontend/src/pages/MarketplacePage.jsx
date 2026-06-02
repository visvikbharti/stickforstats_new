/**
 * Plugin Marketplace Page
 * =======================
 * Browse, install, and manage plugins for StickForStats.
 * Supports custom statistical tests, SQS rule packs, visualization
 * templates, data connectors, and report templates.
 *
 * Route: /marketplace
 * Created: February 2026
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Tabs,
  Tab,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Card,
  CardContent,
  CardActions,
  Avatar,
  Rating,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  CircularProgress,
  Alert,
  Skeleton,
  useTheme,
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  Verified as VerifiedIcon,
  Shield as ShieldIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  OpenInNew as OpenInNewIcon,
  Extension as ExtensionIcon,
  Science as ScienceIcon,
  Rule as RuleIcon,
  BarChart as BarChartIcon,
  Storage as StorageIcon,
  Description as DescriptionIcon,
  Sort as SortIcon,
  Check as CheckIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useDarkMode } from '../context/DarkModeContext';

const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:8000/api') + '/v1';

/** Map plugin type to icon */
const TYPE_ICONS = {
  statistical_test: <ScienceIcon />,
  sqs_rule_pack: <RuleIcon />,
  visualization: <BarChartIcon />,
  data_connector: <StorageIcon />,
  report_template: <DescriptionIcon />,
};

/** Map plugin type to human-readable label */
const TYPE_LABELS = {
  statistical_test: 'Statistical Test',
  sqs_rule_pack: 'SQS Rule Pack',
  visualization: 'Visualization',
  data_connector: 'Data Connector',
  report_template: 'Report Template',
};

/** Tab definitions */
const TABS = [
  { value: 'all', label: 'All Plugins' },
  { value: 'statistical_test', label: 'Tests' },
  { value: 'sqs_rule_pack', label: 'SQS Rules' },
  { value: 'visualization', label: 'Visualizations' },
  { value: 'data_connector', label: 'Connectors' },
  { value: 'report_template', label: 'Templates' },
  { value: 'installed', label: 'Installed' },
];

const SORT_OPTIONS = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'name', label: 'A-Z' },
];


function PluginCard({ plugin, onViewDetails, onInstall, onUninstall, installing }) {
  const theme = useTheme();
  const { darkMode } = useDarkMode();

  return (
    <Card
      elevation={darkMode ? 0 : 1}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.08)',
        borderRadius: 2,
        transition: 'box-shadow 0.2s',
        '&:hover': {
          boxShadow: theme.shadows[4],
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
          <Avatar
            src={plugin.icon_url || undefined}
            sx={{
              width: 48,
              height: 48,
              bgcolor: plugin.is_official
                ? theme.palette.primary.main
                : theme.palette.grey[darkMode ? 700 : 300],
            }}
          >
            {TYPE_ICONS[plugin.type] || <ExtensionIcon />}
          </Avatar>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography
                variant="subtitle1"
                fontWeight={600}
                noWrap
                sx={{ cursor: 'pointer' }}
                onClick={() => onViewDetails(plugin)}
              >
                {plugin.name}
              </Typography>
              {plugin.is_official && (
                <ShieldIcon sx={{ fontSize: 16, color: theme.palette.primary.main }} />
              )}
              {plugin.is_verified && (
                <VerifiedIcon sx={{ fontSize: 16, color: theme.palette.success.main }} />
              )}
            </Box>
            <Typography variant="caption" color="text.secondary">
              by {plugin.author_name}
            </Typography>
          </Box>
        </Box>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: 60,
          }}
        >
          {plugin.description}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
          <Chip
            icon={TYPE_ICONS[plugin.type] || <ExtensionIcon />}
            label={TYPE_LABELS[plugin.type] || plugin.type}
            size="small"
            variant="outlined"
          />
          <Chip
            label={`v${plugin.version}`}
            size="small"
            variant="outlined"
            sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Rating
              value={plugin.rating || 0}
              precision={0.1}
              readOnly
              size="small"
            />
            <Typography variant="caption" color="text.secondary">
              ({plugin.rating_count || 0})
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <DownloadIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              {(plugin.downloads || 0).toLocaleString()}
            </Typography>
          </Box>
        </Box>
      </CardContent>

      <CardActions sx={{ px: 2, pb: 2 }}>
        <Button
          size="small"
          variant="outlined"
          onClick={() => onViewDetails(plugin)}
        >
          Details
        </Button>
        {plugin.is_installed ? (
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => onUninstall(plugin)}
            disabled={installing === plugin.slug}
          >
            {installing === plugin.slug ? 'Removing...' : 'Uninstall'}
          </Button>
        ) : (
          <Button
            size="small"
            variant="contained"
            startIcon={installing === plugin.slug ? <CircularProgress size={16} /> : <AddIcon />}
            onClick={() => onInstall(plugin)}
            disabled={installing === plugin.slug}
          >
            {installing === plugin.slug ? 'Installing...' : 'Install'}
          </Button>
        )}
      </CardActions>
    </Card>
  );
}


function PluginDetailDialog({ plugin, open, onClose, onInstall, onUninstall, installing }) {
  const theme = useTheme();
  const { darkMode } = useDarkMode();
  const [reviewTab, setReviewTab] = useState(0);

  if (!plugin) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          bgcolor: darkMode ? 'grey.900' : 'background.paper',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, pb: 1 }}>
        <Avatar
          src={plugin.icon_url || undefined}
          sx={{
            width: 56,
            height: 56,
            bgcolor: plugin.is_official
              ? theme.palette.primary.main
              : theme.palette.grey[darkMode ? 700 : 300],
          }}
        >
          {TYPE_ICONS[plugin.type] || <ExtensionIcon />}
        </Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="h5" fontWeight={700}>
              {plugin.name}
            </Typography>
            {plugin.is_official && (
              <Chip icon={<ShieldIcon />} label="Official" size="small" color="primary" />
            )}
            {plugin.is_verified && (
              <Chip icon={<VerifiedIcon />} label="Verified" size="small" color="success" />
            )}
          </Box>
          <Typography variant="body2" color="text.secondary">
            by {plugin.author_name} &middot; v{plugin.version}
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ ml: 'auto' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent>
        <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Rating value={plugin.rating || 0} precision={0.1} readOnly size="small" />
            <Typography variant="body2" color="text.secondary">
              {plugin.rating || 0} ({plugin.rating_count || 0} reviews)
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <DownloadIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {(plugin.downloads || 0).toLocaleString()} downloads
            </Typography>
          </Box>
          <Chip
            icon={TYPE_ICONS[plugin.type] || <ExtensionIcon />}
            label={TYPE_LABELS[plugin.type] || plugin.type}
            size="small"
            variant="outlined"
          />
        </Box>

        <Typography variant="h6" gutterBottom fontWeight={600}>
          Description
        </Typography>
        <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-line' }}>
          {plugin.description}
        </Typography>

        {(plugin.homepage_url || plugin.repository_url) && (
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            {plugin.homepage_url && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<OpenInNewIcon />}
                href={plugin.homepage_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Homepage
              </Button>
            )}
            {plugin.repository_url && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<OpenInNewIcon />}
                href={plugin.repository_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Repository
              </Button>
            )}
          </Box>
        )}

        {plugin.dependencies && plugin.dependencies.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              Dependencies
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {plugin.dependencies.map((dep, i) => (
                <Chip key={i} label={dep} size="small" variant="outlined" />
              ))}
            </Box>
          </Box>
        )}

        {plugin.reviews && plugin.reviews.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              Reviews ({plugin.reviews.length})
            </Typography>
            {plugin.reviews.map((review, i) => (
              <Paper
                key={i}
                variant="outlined"
                sx={{ p: 2, mb: 1.5, borderRadius: 1.5 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Rating value={review.rating} readOnly size="small" />
                  <Typography variant="subtitle2" fontWeight={600}>
                    {review.title}
                  </Typography>
                </Box>
                {review.body && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    {review.body}
                  </Typography>
                )}
                <Typography variant="caption" color="text.disabled">
                  by {review.user} &middot; {new Date(review.created_at).toLocaleDateString()}
                </Typography>
              </Paper>
            ))}
          </Box>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
        {plugin.is_installed ? (
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => onUninstall(plugin)}
            disabled={installing === plugin.slug}
          >
            {installing === plugin.slug ? 'Removing...' : 'Uninstall'}
          </Button>
        ) : (
          <Button
            variant="contained"
            startIcon={installing === plugin.slug ? <CircularProgress size={16} /> : <AddIcon />}
            onClick={() => onInstall(plugin)}
            disabled={installing === plugin.slug}
          >
            {installing === plugin.slug ? 'Installing...' : 'Install Plugin'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}


export default function MarketplacePage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { darkMode } = useDarkMode();

  // State
  const [plugins, setPlugins] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('popular');
  const [selectedPlugin, setSelectedPlugin] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [installing, setInstalling] = useState(null);

  // Fetch plugins from backend
  const fetchPlugins = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (activeTab !== 'all' && activeTab !== 'installed') {
        params.set('type', activeTab);
      }
      if (search.trim()) {
        params.set('search', search.trim());
      }
      params.set('sort', sort);

      const url = activeTab === 'installed'
        ? `${API_BASE}/marketplace/installed/`
        : `${API_BASE}/marketplace/plugins/?${params.toString()}`;

      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setPlugins(data.plugins || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch marketplace plugins:', err);
      setError('Failed to load plugins. The marketplace API may be unavailable.');
      // Provide demo data for preview
      setPlugins(getDemoPlugins(activeTab));
      setTotal(getDemoPlugins(activeTab).length);
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, sort]);

  useEffect(() => {
    fetchPlugins();
  }, [fetchPlugins]);

  // View plugin details
  const handleViewDetails = useCallback(async (plugin) => {
    setSelectedPlugin(plugin);
    setDetailOpen(true);

    // Fetch full details
    try {
      const response = await fetch(`${API_BASE}/marketplace/plugins/${plugin.slug}/`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedPlugin(data);
      }
    } catch (err) {
      // Use card-level data as fallback
      console.error('Failed to fetch plugin details:', err);
    }
  }, []);

  // Install plugin
  const handleInstall = useCallback(async (plugin) => {
    setInstalling(plugin.slug);
    try {
      const response = await fetch(`${API_BASE}/marketplace/plugins/${plugin.slug}/install/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (response.ok || response.status === 201) {
        // Update local state
        setPlugins((prev) =>
          prev.map((p) =>
            p.slug === plugin.slug ? { ...p, is_installed: true, downloads: (p.downloads || 0) + 1 } : p
          )
        );
        if (selectedPlugin && selectedPlugin.slug === plugin.slug) {
          setSelectedPlugin((prev) => ({ ...prev, is_installed: true }));
        }
      }
    } catch (err) {
      console.error('Failed to install plugin:', err);
      // Demo mode: toggle locally
      setPlugins((prev) =>
        prev.map((p) =>
          p.slug === plugin.slug ? { ...p, is_installed: true, downloads: (p.downloads || 0) + 1 } : p
        )
      );
      if (selectedPlugin && selectedPlugin.slug === plugin.slug) {
        setSelectedPlugin((prev) => ({ ...prev, is_installed: true }));
      }
    } finally {
      setInstalling(null);
    }
  }, [selectedPlugin]);

  // Uninstall plugin
  const handleUninstall = useCallback(async (plugin) => {
    setInstalling(plugin.slug);
    try {
      await fetch(`${API_BASE}/marketplace/plugins/${plugin.slug}/install/`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      setPlugins((prev) =>
        prev.map((p) =>
          p.slug === plugin.slug ? { ...p, is_installed: false } : p
        )
      );
      if (selectedPlugin && selectedPlugin.slug === plugin.slug) {
        setSelectedPlugin((prev) => ({ ...prev, is_installed: false }));
      }
    } catch (err) {
      console.error('Failed to uninstall plugin:', err);
      // Demo mode: toggle locally
      setPlugins((prev) =>
        prev.map((p) =>
          p.slug === plugin.slug ? { ...p, is_installed: false } : p
        )
      );
      if (selectedPlugin && selectedPlugin.slug === plugin.slug) {
        setSelectedPlugin((prev) => ({ ...prev, is_installed: false }));
      }
    } finally {
      setInstalling(null);
    }
  }, [selectedPlugin]);

  // Close detail dialog
  const handleCloseDetail = useCallback(() => {
    setDetailOpen(false);
    setTimeout(() => setSelectedPlugin(null), 200);
  }, []);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: darkMode ? 'grey.950' : 'grey.50',
        pt: 4,
        pb: 6,
      }}
    >
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <ExtensionIcon sx={{ fontSize: 32, color: theme.palette.primary.main }} />
            <Typography variant="h4" fontWeight={700}>
              Plugin Marketplace
            </Typography>
          </Box>
          <Typography variant="body1" color="text.secondary">
            Extend StickForStats with custom statistical tests, SQS rule packs, visualizations, and more.
          </Typography>
        </Box>

        {/* Search and Sort Bar */}
        <Paper
          elevation={darkMode ? 0 : 1}
          sx={{
            p: 2,
            mb: 3,
            display: 'flex',
            gap: 2,
            alignItems: 'center',
            flexWrap: 'wrap',
            border: darkMode ? '1px solid rgba(255,255,255,0.12)' : 'none',
            borderRadius: 2,
          }}
        >
          <TextField
            placeholder="Search plugins..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{ flexGrow: 1, minWidth: 200 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="sort-label">Sort by</InputLabel>
            <Select
              labelId="sort-label"
              value={sort}
              label="Sort by"
              onChange={(e) => setSort(e.target.value)}
              startAdornment={<SortIcon sx={{ mr: 0.5, fontSize: 18, color: 'action.active' }} />}
            >
              {SORT_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>

        {/* Tabs */}
        <Paper
          elevation={darkMode ? 0 : 1}
          sx={{
            mb: 3,
            border: darkMode ? '1px solid rgba(255,255,255,0.12)' : 'none',
            borderRadius: 2,
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 500,
                minHeight: 48,
              },
            }}
          >
            {TABS.map((tab) => (
              <Tab
                key={tab.value}
                value={tab.value}
                label={tab.label}
                icon={
                  tab.value === 'all' ? <ExtensionIcon /> :
                  tab.value === 'installed' ? <CheckIcon /> :
                  TYPE_ICONS[tab.value] || undefined
                }
                iconPosition="start"
              />
            ))}
          </Tabs>
        </Paper>

        {/* Error alert */}
        {error && (
          <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
            {error} Showing demo plugins for preview.
          </Alert>
        )}

        {/* Results count */}
        {!loading && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {total} plugin{total !== 1 ? 's' : ''} found
          </Typography>
        )}

        {/* Plugin Grid */}
        {loading ? (
          <Grid container spacing={3}>
            {[...Array(6)].map((_, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Card sx={{ height: 280, borderRadius: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                      <Skeleton variant="circular" width={48} height={48} />
                      <Box sx={{ flexGrow: 1 }}>
                        <Skeleton width="60%" height={24} />
                        <Skeleton width="40%" height={16} />
                      </Box>
                    </Box>
                    <Skeleton width="100%" height={16} />
                    <Skeleton width="90%" height={16} />
                    <Skeleton width="70%" height={16} />
                    <Box sx={{ mt: 2 }}>
                      <Skeleton width="40%" height={24} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : plugins.length === 0 ? (
          <Paper
            sx={{
              p: 6,
              textAlign: 'center',
              borderRadius: 2,
              border: darkMode ? '1px solid rgba(255,255,255,0.12)' : 'none',
            }}
          >
            <ExtensionIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No plugins found
            </Typography>
            <Typography variant="body2" color="text.disabled">
              {activeTab === 'installed'
                ? 'No plugins installed yet. Browse the marketplace to get started.'
                : 'Try adjusting your search or filter criteria.'}
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {plugins.map((plugin) => (
              <Grid item xs={12} sm={6} md={4} key={plugin.id || plugin.slug}>
                <PluginCard
                  plugin={plugin}
                  onViewDetails={handleViewDetails}
                  onInstall={handleInstall}
                  onUninstall={handleUninstall}
                  installing={installing}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Container>

      {/* Detail Dialog */}
      <PluginDetailDialog
        plugin={selectedPlugin}
        open={detailOpen}
        onClose={handleCloseDetail}
        onInstall={handleInstall}
        onUninstall={handleUninstall}
        installing={installing}
      />
    </Box>
  );
}


/**
 * Provide demo plugins when the API is unavailable (development/preview).
 */
function getDemoPlugins(tab) {
  const allDemos = [
    {
      id: 'demo-1',
      slug: 'bayesian-t-test',
      name: 'Bayesian T-Test',
      type: 'statistical_test',
      description: 'Perform Bayesian independent and paired-samples t-tests with Bayes Factor computation, credible intervals, and posterior distributions. Supports informed priors based on published effect sizes.',
      version: '2.1.0',
      author_name: 'StickForStats Team',
      icon_url: '',
      is_official: true,
      is_verified: true,
      downloads: 12450,
      rating: 4.8,
      rating_count: 234,
      is_installed: false,
    },
    {
      id: 'demo-2',
      slug: 'apa-compliance-pack',
      name: 'APA 7th Edition Compliance',
      type: 'sqs_rule_pack',
      description: 'Complete SQS rule pack for APA 7th Edition compliance. Validates effect size reporting, confidence intervals, sample size justification, and statistical notation conventions.',
      version: '1.4.2',
      author_name: 'StickForStats Team',
      icon_url: '',
      is_official: true,
      is_verified: true,
      downloads: 8930,
      rating: 4.6,
      rating_count: 187,
      is_installed: false,
    },
    {
      id: 'demo-3',
      slug: 'forest-plot-pro',
      name: 'Forest Plot Pro',
      type: 'visualization',
      description: 'Publication-quality forest plots for meta-analyses with customizable aesthetics, subgroup annotations, prediction intervals, and direct PDF/SVG export.',
      version: '3.0.1',
      author_name: 'DataViz Lab',
      icon_url: '',
      is_official: false,
      is_verified: true,
      downloads: 6720,
      rating: 4.5,
      rating_count: 142,
      is_installed: false,
    },
    {
      id: 'demo-4',
      slug: 'redcap-connector',
      name: 'REDCap Data Connector',
      type: 'data_connector',
      description: 'Seamless import from REDCap electronic data capture systems. Supports project-level API tokens, longitudinal events, and repeating instruments with automatic type detection.',
      version: '1.2.0',
      author_name: 'ClinicalStats Inc.',
      icon_url: '',
      is_official: false,
      is_verified: true,
      downloads: 4280,
      rating: 4.3,
      rating_count: 89,
      is_installed: false,
    },
    {
      id: 'demo-5',
      slug: 'jss-report-template',
      name: 'JSS Manuscript Template',
      type: 'report_template',
      description: 'Generate analysis reports formatted for Journal of Statistical Software submissions. Includes LaTeX output, reproducible code blocks, and automatic figure numbering.',
      version: '1.1.0',
      author_name: 'StickForStats Team',
      icon_url: '',
      is_official: true,
      is_verified: true,
      downloads: 3560,
      rating: 4.7,
      rating_count: 76,
      is_installed: false,
    },
    {
      id: 'demo-6',
      slug: 'robust-statistics',
      name: 'Robust Statistics Suite',
      type: 'statistical_test',
      description: 'Robust alternatives to classical tests: trimmed means, Winsorized statistics, M-estimators, and bootstrap-based confidence intervals for non-normal data.',
      version: '1.3.0',
      author_name: 'RobustStats Group',
      icon_url: '',
      is_official: false,
      is_verified: true,
      downloads: 5140,
      rating: 4.4,
      rating_count: 108,
      is_installed: true,
    },
    {
      id: 'demo-7',
      slug: 'consort-sqs',
      name: 'CONSORT Compliance Rules',
      type: 'sqs_rule_pack',
      description: 'SQS rule pack for CONSORT 2010 statement compliance. Checks for proper randomization reporting, ITT analysis description, and flow diagram requirements.',
      version: '2.0.0',
      author_name: 'ClinicalStats Inc.',
      icon_url: '',
      is_official: false,
      is_verified: true,
      downloads: 2890,
      rating: 4.2,
      rating_count: 63,
      is_installed: false,
    },
    {
      id: 'demo-8',
      slug: 'raincloud-plots',
      name: 'Raincloud Plots',
      type: 'visualization',
      description: 'Generate beautiful raincloud plots combining boxplots, violin plots, and individual data points. Full dark mode support, group comparisons, and significance brackets.',
      version: '1.0.3',
      author_name: 'DataViz Lab',
      icon_url: '',
      is_official: false,
      is_verified: false,
      downloads: 1970,
      rating: 4.1,
      rating_count: 41,
      is_installed: false,
    },
    {
      id: 'demo-9',
      slug: 'spss-import',
      name: 'SPSS Data Import',
      type: 'data_connector',
      description: 'Import .sav and .por files from IBM SPSS Statistics with full variable label and value label preservation. Supports SPSS date formats and multiple-response sets.',
      version: '2.2.1',
      author_name: 'StickForStats Team',
      icon_url: '',
      is_official: true,
      is_verified: true,
      downloads: 7810,
      rating: 4.6,
      rating_count: 156,
      is_installed: true,
    },
  ];

  if (tab === 'all' || tab === undefined) return allDemos;
  if (tab === 'installed') return allDemos.filter((p) => p.is_installed);
  return allDemos.filter((p) => p.type === tab);
}
