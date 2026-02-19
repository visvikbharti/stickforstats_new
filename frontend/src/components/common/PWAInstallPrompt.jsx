import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Snackbar, Button, IconButton, Typography, Box, useTheme } from '@mui/material';
import { GetApp as GetAppIcon, Close as CloseIcon } from '@mui/icons-material';

const DISMISS_KEY = 'pwa-install-dismissed';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const ENGAGEMENT_DELAY_MS = 30 * 1000; // 30 seconds

/**
 * PWA Install Prompt
 *
 * Shows a dismissible MUI snackbar encouraging users to install StickForStats
 * as a progressive web app. The prompt appears only after the user has been
 * on the page for at least 30 seconds and the browser fires the
 * `beforeinstallprompt` event. Dismissal is remembered in localStorage for
 * 7 days.
 */
const PWAInstallPrompt = () => {
  const theme = useTheme();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const engagementTimer = useRef(null);
  const readyToShow = useRef(false);

  // Check whether the user dismissed the prompt within the last 7 days
  const isDismissed = useCallback(() => {
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (!dismissed) return false;
      const ts = parseInt(dismissed, 10);
      if (isNaN(ts)) return false;
      return Date.now() - ts < DISMISS_DURATION_MS;
    } catch {
      return false;
    }
  }, []);

  // Listen for the browser's beforeinstallprompt event
  useEffect(() => {
    if (isDismissed()) return;

    const handler = (e) => {
      // Prevent the default mini-infobar on mobile
      e.preventDefault();
      setDeferredPrompt(e);

      // If the engagement timer already elapsed, show immediately
      if (readyToShow.current) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [isDismissed]);

  // Start the 30-second engagement timer
  useEffect(() => {
    if (isDismissed()) return;

    engagementTimer.current = setTimeout(() => {
      readyToShow.current = true;
      // If the deferred prompt was already captured, show the banner now
      setDeferredPrompt((prev) => {
        if (prev) setShowPrompt(true);
        return prev;
      });
    }, ENGAGEMENT_DELAY_MS);

    return () => {
      if (engagementTimer.current) {
        clearTimeout(engagementTimer.current);
      }
    };
  }, [isDismissed]);

  // Trigger the native install prompt
  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
        setDeferredPrompt(null);
      }
    } catch {
      // prompt() can only be called once; silently ignore errors
    }
  };

  // Dismiss and remember for 7 days
  const handleDismiss = () => {
    setShowPrompt(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // localStorage may be unavailable in some contexts
    }
  };

  return (
    <Snackbar
      open={showPrompt}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      onClose={handleDismiss}
      message={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <GetAppIcon sx={{ color: theme.palette.primary.light }} />
          <Typography variant="body2" component="span">
            Install StickForStats for quick access and offline use
          </Typography>
        </Box>
      }
      action={
        <>
          <Button
            color="primary"
            variant="contained"
            size="small"
            startIcon={<GetAppIcon />}
            onClick={handleInstall}
            sx={{ mr: 1 }}
          >
            Install
          </Button>
          <IconButton
            size="small"
            aria-label="dismiss install prompt"
            color="inherit"
            onClick={handleDismiss}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </>
      }
      sx={{
        '& .MuiSnackbarContent-root': {
          flexWrap: 'nowrap',
          backgroundColor: theme.palette.mode === 'dark'
            ? theme.palette.grey[800]
            : theme.palette.grey[900],
        },
      }}
    />
  );
};

export default PWAInstallPrompt;
