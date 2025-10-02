/**
 * PlainLanguageInterpreter Component
 * 
 * Translates statistical results into plain, understandable language.
 * 
 * @timestamp 2025-08-06 22:44:00 UTC
 */

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
} from '@mui/material';
import {
  Lightbulb as InsightIcon,
  Warning as LimitationIcon,
  TipsAndUpdates as RecommendationIcon,
  CheckCircle as FindingIcon,
  Psychology as MeaningIcon,
  Shield as ConfidenceIcon,
} from '@mui/icons-material';

import { PlainLanguageProps } from './InterpretationEngine.types';

const PlainLanguageInterpreter: React.FC<PlainLanguageProps> = ({
  result,
  context,
  audienceLevel = 'general',
  includeRecommendations = true,
}) => {
  // Determine significance
  const isSignificant = result.pValue < result.alpha;
  const isHighlySignificant = result.pValue < 0.001;
  const isMarginal = !isSignificant && result.pValue < result.alpha * 1.5;

  // Generate summary based on audience level
  const generateSummary = () => {
    if (audienceLevel === 'general') {
      if (isSignificant) {
        return 'Your statistical test found a meaningful difference in your data. This suggests that the pattern you observed is real and not just due to random chance.';
      } else {
        return 'Your statistical test did not find a meaningful difference in your data. This suggests that any patterns you observed could be due to random chance.';
      }
    } else if (audienceLevel === 'professional') {
      if (isSignificant) {
        return `The ${result.testName} yielded statistically significant results, indicating that the observed differences are unlikely to have occurred by chance alone.`;
      } else {
        return `The ${result.testName} did not yield statistically significant results, suggesting that the observed differences could be attributed to sampling variability.`;
      }
    } else {
      // Academic
      if (isSignificant) {
        return `The null hypothesis was rejected based on the ${result.testName} results, supporting the alternative hypothesis at the ${result.alpha} significance level.`;
      } else {
        return `We failed to reject the null hypothesis based on the ${result.testName} results at the ${result.alpha} significance level.`;
      }
    }
  };

  // Generate finding explanation
  const generateFinding = () => {
    const pPercent = (result.pValue * 100).toFixed(1);
    
    if (audienceLevel === 'general') {
      return `If there were truly no difference between your groups, there would be only a ${pPercent}% chance of seeing results like yours. ${isSignificant ? `Since this is very unlikely (less than ${result.alpha * 100}%), we conclude there probably is a real difference.` : `Since this is fairly likely (more than ${result.alpha * 100}%), we cannot be confident there's a real difference.`}`;
    } else {
      return `The probability of obtaining these results under the null hypothesis is ${pPercent}% (p = ${result.pValue.toFixed(4)}). ${isSignificant ? `This falls below the predetermined alpha level of ${result.alpha}.` : `This exceeds the predetermined alpha level of ${result.alpha}.`}`;
    }
  };

  // Generate meaning explanation
  const generateMeaning = () => {
    let meaning = '';
    
    if (isHighlySignificant) {
      meaning = 'Very strong evidence of a real effect. ';
    } else if (isSignificant) {
      meaning = 'Good evidence of a real effect. ';
    } else if (isMarginal) {
      meaning = 'Weak evidence that might suggest an effect. ';
    } else {
      meaning = 'No clear evidence of an effect. ';
    }

    // Add effect size interpretation
    if (result.effectSize) {
      const magnitude = result.effectSize.magnitude;
      if (audienceLevel === 'general') {
        if (magnitude === 'large' || magnitude === 'very_large') {
          meaning += 'The size of the difference is substantial and likely to be practically important.';
        } else if (magnitude === 'medium') {
          meaning += 'The size of the difference is moderate and may have practical importance.';
        } else if (magnitude === 'small') {
          meaning += 'The size of the difference is small but may still be meaningful in certain contexts.';
        } else {
          meaning += 'The size of the difference is very small and may not have practical importance.';
        }
      } else {
        meaning += `Effect size analysis reveals a ${magnitude} effect (${result.effectSize.measure} = ${result.effectSize.value.toFixed(3)}), ${result.effectSize.interpretation}`;
      }
    }

    return meaning;
  };

  // Generate confidence statement
  const generateConfidence = () => {
    const confidencePercent = ((1 - result.alpha) * 100).toFixed(0);
    
    if (audienceLevel === 'general') {
      return `We can be ${confidencePercent}% confident in our statistical conclusion. This means if we repeated this study many times, we would reach the correct conclusion about ${confidencePercent}% of the time.`;
    } else {
      return `Statistical inference conducted at ${confidencePercent}% confidence level (α = ${result.alpha}).`;
    }
  };

  // Generate limitations
  const generateLimitations = () => {
    const limitations = [];
    
    // Sample size
    if (result.sampleInfo.totalN < 30) {
      limitations.push(audienceLevel === 'general' 
        ? 'The study had a small number of participants, which may limit how broadly we can apply these results.'
        : 'Small sample size (N = ' + result.sampleInfo.totalN + ') may limit generalizability.');
    }
    
    // Power
    if (result.powerAnalysis && result.powerAnalysis.observedPower < 0.8) {
      limitations.push(audienceLevel === 'general'
        ? 'The study may not have had enough participants to reliably detect small effects.'
        : `Low statistical power (${(result.powerAnalysis.observedPower * 100).toFixed(0)}%) may increase Type II error risk.`);
    }
    
    // Assumptions
    if (result.assumptionsChecked?.some(a => !a.met)) {
      const violated = result.assumptionsChecked.filter(a => !a.met).map(a => a.assumption);
      limitations.push(audienceLevel === 'general'
        ? 'Some statistical requirements were not perfectly met, which may affect the accuracy of results.'
        : `Assumption violations detected: ${violated.join(', ')}`);
    }
    
    return limitations;
  };

  // Generate recommendations
  const generateRecommendations = () => {
    const recommendations = [];
    
    if (!isSignificant && result.powerAnalysis && result.powerAnalysis.observedPower < 0.8) {
      recommendations.push(audienceLevel === 'general'
        ? 'Consider repeating the study with more participants to get clearer results.'
        : `Increase sample size to N = ${result.powerAnalysis.requiredN || 'TBD'} for adequate power.`);
    }
    
    if (isSignificant && result.effectSize && result.effectSize.magnitude === 'negligible') {
      recommendations.push(audienceLevel === 'general'
        ? 'Although statistically significant, the practical importance may be limited.'
        : 'Consider practical significance alongside statistical significance.');
    }
    
    if (isMarginal) {
      recommendations.push(audienceLevel === 'general'
        ? 'The results are borderline. More data would help clarify the relationship.'
        : 'Marginal significance warrants replication with increased power.');
    }
    
    if (!result.effectSize) {
      recommendations.push(audienceLevel === 'general'
        ? 'Consider calculating how large the effect is, not just whether it exists.'
        : 'Report effect sizes to assess practical significance.');
    }
    
    return recommendations;
  };

  const summary = generateSummary();
  const finding = generateFinding();
  const meaning = generateMeaning();
  const confidence = generateConfidence();
  const limitations = generateLimitations();
  const recommendations = generateRecommendations();

  return (
    <Box>
      {/* Audience Level Indicator */}
      <Box sx={{ mb: 2 }}>
        <Chip
          label={`Explanation for: ${audienceLevel === 'general' ? 'General Audience' : audienceLevel === 'professional' ? 'Professionals' : 'Academics'}`}
          color="primary"
          variant="outlined"
        />
      </Box>

      {/* Summary */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <InsightIcon color="primary" />
            <Typography variant="h6">
              What This Means
            </Typography>
          </Box>
          <Typography variant="body1" paragraph>
            {summary}
          </Typography>
        </CardContent>
      </Card>

      {/* Key Finding */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <FindingIcon color="success" />
            <Typography variant="h6">
              The Statistical Finding
            </Typography>
          </Box>
          <Typography variant="body1" paragraph>
            {finding}
          </Typography>
        </CardContent>
      </Card>

      {/* Interpretation */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <MeaningIcon color="primary" />
            <Typography variant="h6">
              What This Tells Us
            </Typography>
          </Box>
          <Typography variant="body1" paragraph>
            {meaning}
          </Typography>
        </CardContent>
      </Card>

      {/* Confidence */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <ConfidenceIcon color="primary" />
            <Typography variant="h6">
              Confidence in Results
            </Typography>
          </Box>
          <Typography variant="body1">
            {confidence}
          </Typography>
        </CardContent>
      </Card>

      {/* Limitations */}
      {limitations.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Important Limitations
          </Typography>
          <List dense>
            {limitations.map((limitation, idx) => (
              <ListItem key={idx} sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 28 }}>
                  <LimitationIcon color="warning" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={limitation}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            ))}
          </List>
        </Alert>
      )}

      {/* Recommendations */}
      {includeRecommendations && recommendations.length > 0 && (
        <Alert severity="info">
          <Typography variant="subtitle2" gutterBottom>
            Recommendations
          </Typography>
          <List dense>
            {recommendations.map((recommendation, idx) => (
              <ListItem key={idx} sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 28 }}>
                  <RecommendationIcon color="info" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={recommendation}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            ))}
          </List>
        </Alert>
      )}

      {/* Context Note */}
      {context && (
        <Box sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            <strong>Study Context:</strong> {context.studyDesign || 'Not specified'}
            {context.domain && ` | Domain: ${context.domain}`}
            {context.practicalSignificance && ` | Practical threshold: ${context.practicalSignificance.threshold}`}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default PlainLanguageInterpreter;