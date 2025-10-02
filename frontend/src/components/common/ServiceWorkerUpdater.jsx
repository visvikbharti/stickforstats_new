import React, { useEffect, useState } from 'react';
import { Snackbar, Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import * as serviceWorkerRegistration from '../../serviceWorkerRegistration';

/**
 * Component that handles service worker updates and notifications
 * Shows update prompts and offline status information
 */
const ServiceWorkerUpdater = () => {
  const [showReload, setShowReload] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState(null);
  const [offlineMode, setOfflineMode] = useState(!navigator.onLine);
  const [showOfflineDialog, setShowOfflineDialog] = useState(false);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setOfflineMode(false);
    const handleOffline = () => {
      setOfflineMode(true);
      setShowOfflineDialog(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Register service worker with update handlers
  useEffect(() => {
    serviceWorkerRegistration.register({
      onUpdate: (registration) => {
        setShowReload(true);
        setWaitingWorker(registration.waiting);
      },
    });
  }, []);

  // Reload the page to use the new version of the app
  const reloadPage = () => {
    // Notify the service worker to skip waiting and activate the new version
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
    setShowReload(false);
    window.location.reload(true);
  };

  // Close the offline dialog
  const handleCloseOfflineDialog = () => {
    setShowOfflineDialog(false);
  };

  return (
    <>
      {/* Update notification */}
      <Snackbar
        open={showReload}
        message="New version available!"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        action={
          <Button 
            color="secondary" 
            size="small" 
            onClick={reloadPage}
          >
            Reload
          </Button>
        }
      />
      
      {/* Offline mode dialog */}
      <Dialog
        open={showOfflineDialog}
        onClose={handleCloseOfflineDialog}
        aria-labelledby="offline-dialog-title"
      >
        <DialogTitle id="offline-dialog-title">
          You're offline
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            You are currently in offline mode. Some features may be limited, but you can continue using the app with cached data.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseOfflineDialog} color="primary" autoFocus>
            Okay
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Offline status badge (optional) */}
      {offlineMode && (
        <div
          style={{
            position: 'fixed',
            bottom: 16,
            left: 16,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: 4,
            fontSize: 12,
            zIndex: 1000,
          }}
        >
          Offline Mode
        </div>
      )}
    </>
  );
};

export default ServiceWorkerUpdater;