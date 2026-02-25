import React from 'react';
import { Box, Typography, Button } from '@mui/material';

const TermsOfServicePage = () => (
  <Box sx={{ maxWidth: 800, mx: 'auto', p: 4, minHeight: '60vh' }}>
    <Typography variant="h4" gutterBottom>Terms of Service</Typography>
    <Typography variant="body1" paragraph>StickForStats is open-source software released under the MIT License. It is provided as-is for academic and research purposes.</Typography>
    <Typography variant="body1" paragraph>By using this software, you agree to use it responsibly and in accordance with your institution's policies. You are solely responsible for verifying the correctness of any statistical results before using them in publications or decision-making.</Typography>
    <Typography variant="body1" paragraph>This software is not a substitute for professional statistical consultation. The authors make no warranties regarding the accuracy or suitability of the software for any particular purpose.</Typography>
    <Button variant="outlined" href="/" sx={{ mt: 2 }}>Return Home</Button>
  </Box>
);

export default TermsOfServicePage;
