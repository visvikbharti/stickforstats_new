/**
 * Manuscript Verifier Page — Journal Integration (Pillar 2)
 * =========================================================
 * The "/manuscript-verifier" route. Hosts the BundleVerifier component: an editor
 * uploads a whole submission (manuscript + supplements + raw data + figure images)
 * and the platform re-runs the authors' statistical tests on their own data,
 * surfacing per-claim verdicts and citation-content conflicts.
 *
 * Distinct from "/manuscript-review" (ManuscriptAnalyzer), which is the
 * single-file, internal-consistency (statcheck-style) review.
 *
 * Created: 2026-06-29
 */

import React from 'react';
import { Box, Container, Typography, useTheme } from '@mui/material';
import { FactCheck as FactCheckIcon } from '@mui/icons-material';
import BundleVerifier from '../components/manuscript/BundleVerifier';

function ManuscriptVerifierPage() {
  const theme = useTheme();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
          <FactCheckIcon sx={{ fontSize: 36, color: theme.palette.primary.main }} />
          <Typography variant="h3" fontWeight={700}>
            Manuscript Verifier
          </Typography>
        </Box>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 720, mx: 'auto' }}>
          Upload a whole submission — manuscript, supplements, raw-data tables, and figure images.
          The platform re-runs the authors&apos; reported statistics on their own data, resolves
          cross-references, and flags where a cited data file does not reproduce the claimed result.
        </Typography>
      </Box>

      <BundleVerifier />
    </Container>
  );
}

export default ManuscriptVerifierPage;
