/**
 * RAG Performance Monitoring — feature-disabled stub.
 *
 * The previous implementation of this page rendered two dashboards
 * (RAGPerformanceDashboard, RAGPerformanceMonitorDashboard) whose
 * "metrics" were generated from Math.random() on every render — see
 * docs/CRITICAL_REVIEW_2026-05-06.md §P1-9 (Phase 3 P3.15). Without
 * a real RAG (retrieval-augmented generation) monitoring backend
 * emitting live telemetry, those dashboards displayed fabricated
 * numbers as if they were live data.
 *
 * Until a real RAG monitoring backend is wired in, the page renders
 * a clear "feature unavailable" notice so admins are not misled. The
 * underlying dashboard components remain in the source tree as
 * scaffolding for the eventual real implementation but are no longer
 * imported here.
 */

import React from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Alert,
  AlertTitle,
} from '@mui/material';
import { Storage as StorageIcon } from '@mui/icons-material';

const RAGPerformanceMonitoringPage = () => {
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <StorageIcon sx={{ fontSize: 36, mr: 2 }} aria-hidden="true" />
        <Typography variant="h4" component="h1">
          RAG Performance Monitoring
        </Typography>
      </Box>

      <Alert severity="warning" variant="outlined" sx={{ mb: 3 }}>
        <AlertTitle>Feature unavailable</AlertTitle>
        Live RAG (retrieval-augmented generation) performance telemetry
        is not currently wired to a backend metrics source. Earlier
        builds of this page rendered dashboards whose numbers were
        generated from <code>Math.random()</code>; those have been
        removed to prevent fabricated metrics from being mistaken for
        live data. See{' '}
        <code>docs/CRITICAL_REVIEW_2026-05-06.md</code> §P1-9 for
        background.
      </Alert>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          What was here
        </Typography>
        <Typography variant="body2" component="div" sx={{ mb: 2 }}>
          Two dashboard surfaces previously displayed query latency,
          throughput, error rates, memory and CPU utilisation, and
          per-query history. None of those values were sourced from a
          real monitoring backend.
        </Typography>
        <Typography variant="h6" gutterBottom>
          What needs to happen to re-enable
        </Typography>
        <Typography variant="body2" component="div">
          A backend Prometheus exporter (or equivalent) must publish
          the relevant RAG metrics at a documented endpoint, and the
          dashboard components must be wired to fetch from that
          endpoint instead of generating random numbers. Tracked under
          WORK_PLAN <code>P3.15</code>.
        </Typography>
      </Paper>
    </Container>
  );
};

export default RAGPerformanceMonitoringPage;
