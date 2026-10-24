import React, { lazy, Suspense } from 'react';
import {
  Container,
  Typography,
  Paper,
  Button,
  Box,
  CircularProgress,
  Alert,
  AlertTitle
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

import EducationalBanner from '../components/education/EducationalBanner';

const PcaIntroduction = lazy(() => import('../components/pca/PcaIntroduction'));

// PCA Analysis cannot run an analysis in this release, so the page says so instead of failing.
// What it did (2026-10-24), signed in or not:
// - Upload: api/pcaApi.js sends no sign-in token, so the backend saw an anonymous visitor and
//   answered 500. DataUploader then said "Data uploaded successfully!" about a made-up project
//   ("Demo project created successfully (Offline Mode)!" for a demo project), and nothing went
//   further: this page passed onDatasetUpload, but the uploader calls onDataUploaded.
// - Run: with a token, run_pca still answered 500 for a project with two or more sample groups,
//   such as the demo project (pca_analysis/services/pca_service.py keys group distances by
//   tuples, which JSON cannot store).
// Until the flow is rebuilt the page shows the introduction, points to the learning hub, and
// sends nothing to the server. The old steps are still in components/pca/.
function PCAAnalysisPage() {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Paper elevation={0} sx={{ p: 3, bgcolor: 'transparent' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Principal Component Analysis (PCA)
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Analyze high-dimensional data and identify patterns with PCA
        </Typography>
      </Paper>

      <Alert severity="info" sx={{ mb: 4 }}>
        <AlertTitle>Running PCA on your own data isn&rsquo;t available yet</AlertTitle>
        Uploading a data set and running the analysis both have faults we haven&rsquo;t fixed
        yet, so this page doesn&rsquo;t offer them, and it doesn&rsquo;t upload anything. The
        introduction below explains PCA, and the PCA learning hub lets you explore it on example
        data.
        <Box sx={{ mt: 1.5 }}>
          <Button variant="outlined" component={RouterLink} to="/pca-learn">
            Open the PCA learning hub
          </Button>
        </Box>
      </Alert>

      <EducationalBanner module="pca" variant="default" dismissible={true} />

      <Paper elevation={2} sx={{ p: 3, mt: 2 }}>
        <Suspense
          fallback={
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          }
        >
          <PcaIntroduction />
        </Suspense>
      </Paper>
    </Container>
  );
}

export default PCAAnalysisPage;
