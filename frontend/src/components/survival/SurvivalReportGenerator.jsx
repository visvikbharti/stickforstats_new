import React from 'react';
import { Box, Typography, Paper, Button, Grid } from '@mui/material';
import { PictureAsPdf, Description } from '@mui/icons-material';

function SurvivalReportGenerator({ results, dataset, configuration, onGenerateReport }) {
  const handleGeneratePDF = () => {
    onGenerateReport({ format: 'pdf' });
  };

  const handleGenerateHTML = () => {
    onGenerateReport({ format: 'html' });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Generate Report
      </Typography>

      <Typography variant="body2" color="text.secondary" paragraph>
        Export your survival analysis results in your preferred format.
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <PictureAsPdf sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              PDF Report
            </Typography>
            <Typography variant="body2" paragraph>
              Comprehensive report with tables, charts, and interpretation.
            </Typography>
            <Button
              variant="contained"
              onClick={handleGeneratePDF}
            >
              Download PDF
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Description sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              HTML Report
            </Typography>
            <Typography variant="body2" paragraph>
              Interactive web-based report for sharing online.
            </Typography>
            <Button
              variant="outlined"
              onClick={handleGenerateHTML}
            >
              Generate HTML
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default SurvivalReportGenerator;
