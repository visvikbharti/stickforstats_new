/**
 * Smart Analysis Page — Autonomous Intelligence Layer Entry Point
 * ================================================================
 * The "/smart-analysis" route. Composes SmartUpload + NaturalLanguageBar +
 * PlainEnglishResults + GuidedWizard into a unified autonomous analysis experience.
 *
 * Two modes:
 * - "Quick Analysis": Upload data + ask a question in plain English
 * - "Guided": Step-by-step wizard for beginners
 *
 * Created: February 2026
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
  Fade,
  Divider,
  Alert,
  useTheme,
} from '@mui/material';
import {
  AutoAwesome as AutoAwesomeIcon,
  Search as SearchIcon,
  School as SchoolIcon,
} from '@mui/icons-material';
import SmartUpload from '../components/autonomous/SmartUpload';
import NaturalLanguageBar from '../components/autonomous/NaturalLanguageBar';
import PlainEnglishResults from '../components/autonomous/PlainEnglishResults';
import GuidedWizard from '../components/autonomous/GuidedWizard';

function SmartAnalysisPage() {
  const theme = useTheme();

  // Tab state: 0 = Quick Analysis, 1 = Guided Wizard
  const [activeTab, setActiveTab] = useState(0);

  // Data state
  const [dataFile, setDataFile] = useState(null);
  const [profileResult, setProfileResult] = useState(null);

  // Analysis state
  const [queryResult, setQueryResult] = useState(null);
  const [outputMode, setOutputMode] = useState('plain_english');
  const [error, setError] = useState(null);

  // Suggestions derived from profile
  const [suggestions, setSuggestions] = useState([]);

  const handleProfileComplete = useCallback((result) => {
    setProfileResult(result);
    setError(null);

    // Build suggestions from inferred questions
    const questionSuggestions = (result.inferred_questions || []).map(
      (q) => q.text
    );
    setSuggestions(questionSuggestions);
  }, []);

  const handleDataReady = useCallback((file) => {
    setDataFile(file);
    // Reset previous results when new data is uploaded
    setQueryResult(null);
    setError(null);
  }, []);

  const handleSelectQuestion = useCallback((question) => {
    // When user clicks an inferred question, switch to quick analysis
    // and auto-fill the query (NaturalLanguageBar will handle this)
    setActiveTab(0);
  }, []);

  const handleQueryResult = useCallback((result) => {
    setQueryResult(result);
    setError(null);
  }, []);

  const handleQueryError = useCallback((err) => {
    setError(err?.response?.data?.error || err?.message || 'Analysis failed');
    setQueryResult(null);
  }, []);

  const handleModeChange = useCallback((newMode) => {
    setOutputMode(newMode);
  }, []);

  const handleNextStep = useCallback((action) => {
    if (action === 'query') {
      // Scroll to query bar
      window.scrollTo({ top: 400, behavior: 'smooth' });
    } else if (action === 'wizard') {
      setActiveTab(1);
    }
  }, []);

  const handleWizardComplete = useCallback((result) => {
    setQueryResult(result);
    setActiveTab(0); // Switch back to see results
  }, []);

  const handleWizardRunAnalysis = useCallback((query, file) => {
    // This will be handled by NaturalLanguageBar indirectly
    // For now, set state so the query result flows through
  }, []);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Hero Section */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
          <AutoAwesomeIcon sx={{ fontSize: 36, color: theme.palette.primary.main }} />
          <Typography variant="h3" fontWeight={700}>
            Smart Analysis
          </Typography>
        </Box>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
          Upload your data and ask a question in plain English.
          No statistical knowledge required.
        </Typography>
      </Box>

      {/* Tab Selector */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            icon={<SearchIcon />}
            iconPosition="start"
            label="Quick Analysis"
            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '1rem' }}
          />
          <Tab
            icon={<SchoolIcon />}
            iconPosition="start"
            label="Guided Wizard"
            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '1rem' }}
          />
        </Tabs>
      </Paper>

      {/* Error Display */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Quick Analysis Tab */}
      {activeTab === 0 && (
        <Fade in={activeTab === 0}>
          <Box>
            {/* Step 1: Upload Data */}
            <SmartUpload
              onProfileComplete={handleProfileComplete}
              onSelectQuestion={handleSelectQuestion}
              onDataReady={handleDataReady}
            />

            {/* Step 2: Ask a Question */}
            {profileResult && (
              <Fade in={!!profileResult}>
                <Box sx={{ mt: 4 }}>
                  <Typography variant="h5" fontWeight={600} gutterBottom>
                    Ask Your Question
                  </Typography>
                  <NaturalLanguageBar
                    dataFile={dataFile}
                    suggestions={suggestions}
                    onResult={handleQueryResult}
                    onError={handleQueryError}
                    disabled={!dataFile}
                  />
                </Box>
              </Fade>
            )}

            {/* Step 3: View Results */}
            {queryResult && (
              <Fade in={!!queryResult}>
                <Box sx={{ mt: 4 }}>
                  <Divider sx={{ mb: 3 }} />
                  <PlainEnglishResults
                    result={queryResult}
                    mode={outputMode}
                    onModeChange={handleModeChange}
                    onNextStep={handleNextStep}
                  />
                </Box>
              </Fade>
            )}
          </Box>
        </Fade>
      )}

      {/* Guided Wizard Tab */}
      {activeTab === 1 && (
        <Fade in={activeTab === 1}>
          <Box>
            <GuidedWizard
              dataFile={dataFile}
              profileResult={profileResult}
              onComplete={handleWizardComplete}
              onProfileData={handleDataReady}
              onRunAnalysis={handleWizardRunAnalysis}
            />
          </Box>
        </Fade>
      )}
    </Container>
  );
}

export default SmartAnalysisPage;
