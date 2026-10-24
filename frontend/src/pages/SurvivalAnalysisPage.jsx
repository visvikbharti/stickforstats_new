import React, { lazy, Suspense } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  CircularProgress,
  Alert,
  AlertTitle
} from '@mui/material';

const SurvivalIntroduction = lazy(() => import('../components/survival/SurvivalIntroduction'));

// Survival Analysis cannot run an analysis in this release, so the page says so instead of
// faking success. What it did (2026-10-24), signed in or not:
// - Its upload step was PCA's uploader (components/pca/DataUploader.jsx), which asks for gene
//   expression data and posts it to the PCA project API. That API answers 401 (500 before the
//   PCA record routes needed sign-in), and the uploader then said "Data uploaded successfully!"
//   or "Demo project created successfully (Offline Mode)!" about a project that did not exist.
// - Nothing went further: this page passed onDatasetUpload, but the uploader calls
//   onDataUploaded, so the steps that call /api/v1/survival/ were never reached.
// Until the flow is rebuilt the page shows the introduction and sends nothing to the server.
// The old steps are still in components/survival/. (Its EducationalBanner showed PCA's lessons:
// the banner has no survival entry.)
function SurvivalAnalysisPage() {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Paper elevation={0} sx={{ p: 3, bgcolor: 'transparent' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Survival Analysis
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Analyze time-to-event data with Kaplan-Meier estimation and Cox regression
        </Typography>
      </Paper>

      <Alert severity="info" sx={{ mb: 4 }}>
        <AlertTitle>Running survival analysis on your own data isn&rsquo;t available yet</AlertTitle>
        Uploading a data set here has faults we haven&rsquo;t fixed yet, so this page
        doesn&rsquo;t offer the analysis, and it doesn&rsquo;t upload anything. The introduction
        below explains survival analysis.
      </Alert>

      <Paper elevation={2} sx={{ p: 3 }}>
        <Suspense
          fallback={
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          }
        >
          <SurvivalIntroduction />
        </Suspense>
      </Paper>
    </Container>
  );
}

export default SurvivalAnalysisPage;
