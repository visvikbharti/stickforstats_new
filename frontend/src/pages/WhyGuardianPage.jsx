import React from 'react';
import { Box, Container, Typography, Chip } from '@mui/material';
import { Security as SecurityIcon } from '@mui/icons-material';
import { GuardianCascadeSimulator } from '../components/statistical/educational';

/**
 * WhyGuardianPage
 * ===============
 * A dedicated, shareable home for the interactive Guardian cascade simulator
 * ("Why one t-test isn't enough"). The same component is also embedded in the
 * Hypothesis Testing module's "Why Guardian?" tab; this page gives it a clean
 * top-level URL (/why-guardian) that the top navigation links to and that can
 * be cited directly (e.g. for manuscript reviewers reproducing Figure 8).
 */
const WhyGuardianPage = () => (
  <Box sx={{ py: { xs: 2, sm: 4 } }}>
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, flexWrap: 'wrap' }}>
        <SecurityIcon color="primary" />
        <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>
          Why Guardian?
        </Typography>
        <Chip label="Live demo" size="small" color="primary" variant="outlined" />
      </Box>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: '80ch' }}>
        A live, interactive demonstration of why StickForStats checks assumptions before every test.
        It reproduces the manuscript&rsquo;s calibration benchmark (Figure&nbsp;8) right in your browser:
        the same simulated data is handed to a na&iuml;ve pooled t-test and to the Guardian cascade, and
        you watch the false-positive rate diverge as the experiments pile up. Expand
        &ldquo;How to read this simulator&rdquo; below if it&rsquo;s your first time.
      </Typography>
      <GuardianCascadeSimulator />
    </Container>
  </Box>
);

export default WhyGuardianPage;
