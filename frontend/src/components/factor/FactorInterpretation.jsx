import React from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';

function FactorInterpretation({ results, configuration, dataset, onContinue }) {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Interpretation Guide
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Factor Loadings Interpretation
        </Typography>
        <Typography variant="body2" paragraph>
          • <strong>Strong Association:</strong> |Loading| &gt; 0.5
          <br />
          • <strong>Moderate Association:</strong> |Loading| 0.3 - 0.5
          <br />
          • <strong>Weak Association:</strong> |Loading| &lt; 0.3
        </Typography>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Communality Interpretation
        </Typography>
        <Typography variant="body2" paragraph>
          • <strong>Well Represented:</strong> h² &gt; 0.5 (variable well explained by factors)
          <br />
          • <strong>Poorly Represented:</strong> h² &lt; 0.3 (variable not well captured)
        </Typography>
      </Paper>

      <Paper sx={{ p: 3, mb: 3, bgcolor: 'info.light' }}>
        <Typography variant="h6" gutterBottom>
          Key Findings
        </Typography>
        <Typography variant="body2">
          {results?.n_factors} factors extracted explaining {(results?.variance_explained?.total_variance_explained * 100)?.toFixed(1)}% of total variance.
          Detailed factor loadings and variable groupings are available in the generated report.
        </Typography>
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <Button variant="contained" onClick={onContinue}>
          Continue to Report
        </Button>
      </Box>
    </Box>
  );
}

export default FactorInterpretation;
