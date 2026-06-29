/**
 * Manuscript Review Page — Journal Integration (Pillar 2)
 * =======================================================
 * The "/manuscript-review" route. Hosts the ManuscriptAnalyzer component
 * that provides automated manuscript statistical quality review.
 *
 * Created: February 2026
 */

import React from 'react';
import {
  Box,
  Container,
  Typography,
  Link,
  useTheme,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import {
  VerifiedUser as VerifiedUserIcon,
} from '@mui/icons-material';
import ManuscriptAnalyzer from '../components/manuscript/ManuscriptAnalyzer';

function ManuscriptReviewPage() {
  const theme = useTheme();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Hero Section */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
          <VerifiedUserIcon sx={{ fontSize: 36, color: theme.palette.primary.main }} />
          <Typography variant="h3" fontWeight={700}>
            Manuscript Review
          </Typography>
        </Box>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 650, mx: 'auto' }}>
          Upload your manuscript for automated statistical quality review.
          Validates reported statistics, checks consistency, and scores reporting quality.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          Have the raw data too?{' '}
          <Link component={RouterLink} to="/manuscript-verifier">
            Try the Manuscript Verifier
          </Link>{' '}
          to re-run the authors&apos; tests on it.
        </Typography>
      </Box>

      {/* Main Analyzer */}
      <ManuscriptAnalyzer />
    </Container>
  );
}

export default ManuscriptReviewPage;
