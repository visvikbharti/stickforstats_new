/**
 * Privacy Dashboard Page — GDPR Compliance
 * ==========================================
 * Provides users with full control over their personal data per GDPR:
 * - Consent management (Art. 7)
 * - Data export / DSAR (Art. 15 + Art. 20)
 * - Right to erasure (Art. 17)
 * - Data processing information (Art. 13/14)
 *
 * Created: February 2026
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  CircularProgress,
  Paper,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import SecurityIcon from '@mui/icons-material/Security';
import GavelIcon from '@mui/icons-material/Gavel';
import PrivacyTipIcon from '@mui/icons-material/PrivacyTip';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SaveIcon from '@mui/icons-material/Save';
import { apiClient } from '../services/api';

const PRIVACY_BASE = '/v1/privacy';

const PrivacyDashboardPage = () => {
  const theme = useTheme();

  // State
  const [consents, setConsents] = useState({});
  const [pendingChanges, setPendingChanges] = useState({});
  const [privacyInfo, setPrivacyInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [eraseDialogOpen, setEraseDialogOpen] = useState(false);
  const [eraseConfirmText, setEraseConfirmText] = useState('');
  const [erasing, setErasing] = useState(false);
  const [alert, setAlert] = useState(null);

  // Fetch consent status and privacy info on mount
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [consentRes, infoRes] = await Promise.all([
        apiClient.get(`${PRIVACY_BASE}/consent/`).catch(() => null),
        apiClient.get(`${PRIVACY_BASE}/info/`),
      ]);
      if (consentRes?.data?.consents) {
        setConsents(consentRes.data.consents);
      }
      if (infoRes?.data) {
        setPrivacyInfo(infoRes.data);
      }
    } catch (err) {
      setAlert({
        severity: 'error',
        message: 'Failed to load privacy information. Please try again later.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle consent toggle (stages change locally)
  const handleConsentToggle = (consentType) => {
    setPendingChanges((prev) => {
      const currentGranted = consents[consentType]?.granted || false;
      const pendingGranted = prev[consentType] !== undefined ? prev[consentType] : currentGranted;
      return { ...prev, [consentType]: !pendingGranted };
    });
  };

  // Get effective consent value (pending change or current)
  const getEffectiveConsent = (consentType) => {
    if (pendingChanges[consentType] !== undefined) {
      return pendingChanges[consentType];
    }
    return consents[consentType]?.granted || false;
  };

  // Save consent changes
  const handleSaveConsents = async () => {
    setSaving(true);
    setAlert(null);
    try {
      const updates = Object.entries(pendingChanges);
      for (const [consentType, granted] of updates) {
        await apiClient.post(`${PRIVACY_BASE}/consent/`, {
          consent_type: consentType,
          granted,
        });
      }
      setPendingChanges({});
      // Refresh data
      const consentRes = await apiClient.get(`${PRIVACY_BASE}/consent/`);
      if (consentRes?.data?.consents) {
        setConsents(consentRes.data.consents);
      }
      setAlert({
        severity: 'success',
        message: 'Your consent preferences have been saved successfully.',
      });
    } catch (err) {
      setAlert({
        severity: 'error',
        message: 'Failed to save consent preferences. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Export personal data
  const handleExportData = async () => {
    setExporting(true);
    setAlert(null);
    try {
      const response = await apiClient.get(`${PRIVACY_BASE}/export/`);
      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `stickforstats-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setAlert({
        severity: 'success',
        message: 'Your data export has been downloaded.',
      });
    } catch (err) {
      setAlert({
        severity: 'error',
        message: 'Failed to export data. Please ensure you are logged in.',
      });
    } finally {
      setExporting(false);
    }
  };

  // Request data erasure
  const handleEraseData = async () => {
    if (eraseConfirmText !== 'DELETE MY DATA') {
      return;
    }
    setErasing(true);
    setAlert(null);
    try {
      await apiClient.post(`${PRIVACY_BASE}/erase/`, { confirm: true });
      setEraseDialogOpen(false);
      setEraseConfirmText('');
      setAlert({
        severity: 'warning',
        message:
          'Your personal data has been erased. Your account has been deactivated. You will be logged out shortly.',
      });
      // Log user out after a delay
      setTimeout(() => {
        window.location.href = '/';
      }, 5000);
    } catch (err) {
      setAlert({
        severity: 'error',
        message: 'Failed to process erasure request. Please contact the DPO.',
      });
    } finally {
      setErasing(false);
    }
  };

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <CircularProgress size={48} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        maxWidth: 900,
        mx: 'auto',
        p: { xs: 2, md: 4 },
        minHeight: '60vh',
      }}
    >
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <PrivacyTipIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" component="h1" fontWeight={700}>
            Privacy Dashboard
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Manage your personal data and consent preferences in accordance with the General Data
          Protection Regulation (GDPR).
        </Typography>
      </Box>

      {/* Alert */}
      {alert && (
        <Alert severity={alert.severity} sx={{ mb: 3 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {/* Consent Management */}
      <Card sx={{ mb: 3 }} elevation={2}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <SecurityIcon color="primary" />
            <Typography variant="h6" fontWeight={600}>
              Consent Preferences
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Control which data processing activities you consent to. You can withdraw consent at any
            time (GDPR Art. 7).
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {Object.entries(consents).map(([key, consent]) => (
            <Box key={key} sx={{ mb: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={getEffectiveConsent(key)}
                    onChange={() => handleConsentToggle(key)}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1" fontWeight={500}>
                      {consent.label}
                    </Typography>
                    {consent.granted && consent.granted_at && (
                      <Typography variant="caption" color="text.secondary">
                        Granted on {new Date(consent.granted_at).toLocaleDateString()}
                        {consent.version ? ` (Policy v${consent.version})` : ''}
                      </Typography>
                    )}
                    {consent.revoked_at && !consent.granted && (
                      <Typography variant="caption" color="text.secondary">
                        Revoked on {new Date(consent.revoked_at).toLocaleDateString()}
                      </Typography>
                    )}
                  </Box>
                }
                sx={{ width: '100%', ml: 0 }}
              />
              {key !== Object.keys(consents).slice(-1)[0] && <Divider sx={{ my: 0.5 }} />}
            </Box>
          ))}

          {hasPendingChanges && (
            <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                onClick={handleSaveConsents}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </Button>
              <Button
                variant="text"
                onClick={() => setPendingChanges({})}
                disabled={saving}
              >
                Discard Changes
              </Button>
              <Chip
                label="Unsaved changes"
                color="warning"
                size="small"
                variant="outlined"
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Data Export */}
      <Card sx={{ mb: 3 }} elevation={2}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <DownloadIcon color="primary" />
            <Typography variant="h6" fontWeight={600}>
              Export Your Data
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Download a complete copy of all personal data we hold about you in machine-readable JSON
            format. This fulfills your right of access (Art. 15) and data portability (Art. 20).
          </Typography>
          <Button
            variant="outlined"
            startIcon={
              exporting ? <CircularProgress size={18} color="inherit" /> : <DownloadIcon />
            }
            onClick={handleExportData}
            disabled={exporting}
          >
            {exporting ? 'Preparing Export...' : 'Download My Data'}
          </Button>
        </CardContent>
      </Card>

      {/* Data Erasure */}
      <Card
        sx={{
          mb: 3,
          borderColor: 'error.main',
          borderWidth: 1,
          borderStyle: 'solid',
        }}
        elevation={2}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <DeleteForeverIcon color="error" />
            <Typography variant="h6" fontWeight={600} color="error.main">
              Delete Your Data
            </Typography>
          </Box>
          <Alert severity="warning" sx={{ mb: 2 }} icon={<WarningAmberIcon />}>
            This action is <strong>irreversible</strong>. All your personal data will be permanently
            deleted or anonymized. Your account will be deactivated.
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Exercise your right to erasure (Art. 17). Anonymized aggregate statistics may be
            retained per Art. 17(3)(d) for archiving purposes in the public interest.
          </Typography>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteForeverIcon />}
            onClick={() => setEraseDialogOpen(true)}
          >
            Request Data Erasure
          </Button>
        </CardContent>
      </Card>

      {/* Privacy Information */}
      {privacyInfo && (
        <Card sx={{ mb: 3 }} elevation={2}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <GavelIcon color="primary" />
              <Typography variant="h6" fontWeight={600}>
                Data Processing Information
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              How we process your data, our legal basis, and your rights under GDPR (Art. 13/14).
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
              Data Controller
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {privacyInfo.controller}
            </Typography>

            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
              Processing Purposes
            </Typography>
            <List dense disablePadding>
              {privacyInfo.purposes?.map((purpose, idx) => (
                <ListItem key={idx} sx={{ pl: 0, alignItems: 'flex-start' }}>
                  <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                    <InfoOutlinedIcon fontSize="small" color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary={purpose.purpose}
                    secondary={
                      <>
                        <strong>Legal basis:</strong> {purpose.legal_basis}
                        <br />
                        <strong>Data:</strong> {purpose.data_categories?.join(', ')}
                        <br />
                        <strong>Retention:</strong> {purpose.retention}
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
              Your Rights
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {privacyInfo.rights?.map((right, idx) => (
                <Chip
                  key={idx}
                  label={right}
                  icon={<CheckCircleIcon />}
                  variant="outlined"
                  size="small"
                  color="primary"
                />
              ))}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
              Contact
            </Typography>
            <Typography variant="body2">
              Data Protection Officer:{' '}
              <a href={`mailto:${privacyInfo.data_protection_officer}`}>
                {privacyInfo.data_protection_officer}
              </a>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {privacyInfo.supervisory_authority}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Erasure Confirmation Dialog */}
      <Dialog
        open={eraseDialogOpen}
        onClose={() => {
          setEraseDialogOpen(false);
          setEraseConfirmText('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: 'error.main', fontWeight: 700 }}>
          Confirm Data Erasure
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            This will permanently delete all your personal data including:
          </DialogContentText>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <DeleteForeverIcon color="error" fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Account information (email, name)" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <DeleteForeverIcon color="error" fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Consent records" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <DeleteForeverIcon color="error" fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Organization memberships" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <DeleteForeverIcon color="error" fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Usage records (anonymized, not deleted)" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <DeleteForeverIcon color="error" fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Audit entries (anonymized, not deleted)" />
            </ListItem>
          </List>
          <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
            This action cannot be undone. Your account will be permanently deactivated.
          </Alert>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Type <strong>DELETE MY DATA</strong> to confirm:
          </Typography>
          <Paper
            component="input"
            value={eraseConfirmText}
            onChange={(e) => setEraseConfirmText(e.target.value)}
            placeholder="DELETE MY DATA"
            sx={{
              width: '100%',
              p: 1.5,
              fontSize: '1rem',
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 1,
              fontFamily: 'monospace',
              bgcolor: 'background.paper',
              color: 'text.primary',
              outline: 'none',
              '&:focus': {
                borderColor: 'error.main',
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              setEraseDialogOpen(false);
              setEraseConfirmText('');
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={eraseConfirmText !== 'DELETE MY DATA' || erasing}
            startIcon={
              erasing ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <DeleteForeverIcon />
              )
            }
            onClick={handleEraseData}
          >
            {erasing ? 'Erasing...' : 'Permanently Delete All Data'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PrivacyDashboardPage;
