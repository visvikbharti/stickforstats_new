import React from 'react';
import { Box, Typography, Link } from '@mui/material';

const ISSUES_URL = 'https://github.com/visvikbharti/stickforstats_new/issues';

// Persistent closed-beta notice shown on every page. Sets expectations (results may
// change) and points at the monitored feedback channel (GitHub issues) + privacy notice.
function BetaBanner() {
  return (
    <Box
      role="region"
      aria-label="Beta notice"
      sx={{
        width: '100%',
        bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#3a2f00' : '#fff8e1'),
        borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        color: 'text.primary',
        px: 2,
        py: 0.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        flexWrap: 'wrap',
      }}
    >
      <Typography variant="body2" component="span" sx={{ fontSize: '0.8125rem' }}>
        <strong>Beta</strong> &mdash; results may change; please verify before relying on them in published work.
      </Typography>
      <Link
        href={ISSUES_URL}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ fontSize: '0.8125rem', fontWeight: 600 }}
      >
        Report an issue &#8599;
      </Link>
      <Box component="span" sx={{ fontSize: '0.8125rem', opacity: 0.5 }}>&middot;</Box>
      <Link href="/privacy" sx={{ fontSize: '0.8125rem' }}>
        Privacy &amp; data
      </Link>
    </Box>
  );
}

export default BetaBanner;
