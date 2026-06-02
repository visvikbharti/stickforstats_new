import React from 'react';
import { Box, Typography, Button, Link } from '@mui/material';

const ISSUES_URL = 'https://github.com/visvikbharti/stickforstats_new/issues';

const PrivacyPolicyPage = () => (
  <Box sx={{ maxWidth: 800, mx: 'auto', p: 4, minHeight: '60vh' }}>
    <Typography variant="h4" gutterBottom>Privacy &amp; Data</Typography>
    <Typography variant="body2" color="text.secondary" paragraph>
      StickForStats is in closed beta. This notice describes what the platform stores and how to have your data removed.
    </Typography>

    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>What we store</Typography>
    <Typography variant="body1" paragraph>
      Data files and manuscripts you upload for analysis, the statistical results and analysis sessions they produce,
      and&mdash;if you create an account&mdash;your account details. Basic server logs (timestamps, request paths, errors)
      are kept to operate and secure the service.
    </Typography>

    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>How it is used</Typography>
    <Typography variant="body1" paragraph>
      Only to provide the analysis you request and to let you retrieve your results. We do not sell your data or use it
      for advertising, and product analytics are disabled in this beta.
    </Typography>

    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Retention &amp; deletion</Typography>
    <Typography variant="body1" paragraph>
      Your uploads and results are retained until you ask us to remove them. You can request deletion of your data at
      any time and we will erase or anonymise it. To make a request, open an issue at our{' '}
      <Link href={ISSUES_URL} target="_blank" rel="noopener noreferrer">issue tracker</Link>{' '}
      or use the contact link in the footer.
    </Typography>

    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Please note (beta)</Typography>
    <Typography variant="body1" paragraph>
      This is a beta released for evaluation. Please do not upload personally identifiable, clinical, or otherwise
      sensitive data that you are not authorised to share. Results may change as the software evolves&mdash;verify
      anything you intend to publish.
    </Typography>

    <Button variant="outlined" href="/" sx={{ mt: 2 }}>Return Home</Button>
  </Box>
);

export default PrivacyPolicyPage;
