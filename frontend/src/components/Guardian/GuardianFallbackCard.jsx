/**
 * GuardianFallbackCard
 * ====================
 * Presentational card shown by a parametric module (t-test, ANOVA) when the
 * live Guardian assumption check (POST /api/guardian/check/) reports one or
 * more violations. It surfaces the violated assumptions and a single, clearly
 * actionable button that routes the user to the appropriate distribution-free
 * (non-parametric) test with their own data.
 *
 * The parent owns the data hand-off (it knows the test design), so this card is
 * purely presentational: it takes the raw /guardian/check/ report, the label of
 * the recommended non-parametric test, and an onRun callback.
 */

import React from 'react';
import { Card, CardContent, Typography, Box, Button } from '@mui/material';
import {
  Security as ShieldIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';

const prettify = (s) =>
  String(s || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

// Slugs that have an actionable home in the Non-Parametric module.
const MAPPABLE = ['mann_whitney', 'kruskal_wallis', 'wilcoxon', 'friedman'];

const GuardianFallbackCard = ({ report, actionLabel, onRun }) => {
  if (!report) return null;

  // The /guardian/check/ endpoint only returns entries that failed, but guard
  // defensively against any that report passed === true.
  const violations = (report.violations || []).filter((v) => v && v.passed !== true);
  if (!violations.length) return null;

  const confidence =
    typeof report.confidence_score === 'number'
      ? Math.round(report.confidence_score * 100)
      : null;

  const extraAlts = (report.alternative_tests || []).filter((s) => !MAPPABLE.includes(s));

  return (
    <Card sx={{ mt: 3, borderLeft: '4px solid', borderColor: 'warning.main' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <ShieldIcon color="warning" sx={{ mr: 1 }} />
          <Typography variant="h6">Guardian: assumptions may not hold</Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" gutterBottom>
          Your data appears to violate {violations.map((v) => prettify(v.assumption)).join(', ')}
          {confidence !== null &&
            ` — Guardian estimates ${confidence}% confidence that the parametric test is valid here.`}
        </Typography>

        <Box component="ul" sx={{ mt: 1, mb: 2, pl: 3 }}>
          {violations.map((v, i) => (
            <li key={i}>
              <Typography variant="body2">
                <strong style={{ textTransform: 'capitalize' }}>{prettify(v.assumption)}</strong>
                {v.severity ? ` (${v.severity})` : ''}
                {v.recommendation ? ` — ${v.recommendation}` : ''}
              </Typography>
            </li>
          ))}
        </Box>

        {actionLabel && onRun && (
          <Button
            variant="contained"
            color="warning"
            endIcon={<ArrowForwardIcon />}
            onClick={onRun}
          >
            {actionLabel}
          </Button>
        )}

        {extraAlts.length > 0 && (
          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1.5 }}>
            Guardian also lists (not run here): {extraAlts.map(prettify).join(', ')}.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default GuardianFallbackCard;
