import React, { useState } from 'react';
import {
  Paper,
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Button,
  Grid,
  Card,
  CardContent,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Lightbulb as LightbulbIcon,
  School as SchoolIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  AutoGraph as GraphIcon,
  Psychology as PsychologyIcon,
  QuestionMark as QuestionIcon,
  BookmarkBorder as BookmarkIcon
} from '@mui/icons-material';

const InterpretationPanel = ({
  results = null,
  testType = '',
  context = 'general',
  showRecommendations = true,
  showLimitations = true,
  showNextSteps = true,
  showTechnical = false,
  customInterpretations = []
}) => {
  const [expandedPanel, setExpandedPanel] = useState('interpretation');
  const [bookmarked, setBookmarked] = useState([]);

  const handlePanelChange = (panel) => (event, isExpanded) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  const toggleBookmark = (item) => {
    setBookmarked(prev =>
      prev.includes(item)
        ? prev.filter(i => i !== item)
        : [...prev, item]
    );
  };

  if (!results) {
    return null;
  }

  const getContextualInterpretation = () => {
    const contexts = {
      medical: {
        significant: 'This finding suggests a clinically meaningful difference that may impact patient outcomes.',
        nonSignificant: 'No statistically significant clinical difference was detected. Consider clinical significance alongside statistical significance.',
        effectSize: 'The clinical importance should be evaluated considering patient-specific factors.'
      },
      business: {
        significant: 'The analysis reveals a significant business impact that warrants strategic consideration.',
        nonSignificant: 'The data does not show a statistically significant business impact. Consider practical significance and cost-benefit analysis.',
        effectSize: 'The practical impact on business metrics should guide decision-making.'
      },
      research: {
        significant: 'The results provide evidence supporting the research hypothesis.',
        nonSignificant: 'The null hypothesis cannot be rejected based on current evidence. Consider sample size and study power.',
        effectSize: 'Effect size provides information about the magnitude of the observed phenomenon.'
      },
      general: {
        significant: 'The test shows a statistically significant result.',
        nonSignificant: 'The test does not show a statistically significant result.',
        effectSize: 'Effect size indicates the practical significance of the finding.'
      }
    };

    return contexts[context] || contexts.general;
  };

  const getStatisticalInterpretation = () => {
    const isSignificant = results.p_value < 0.05;
    const contextInterpretation = getContextualInterpretation();

    return {
      primary: isSignificant
        ? contextInterpretation.significant
        : contextInterpretation.nonSignificant,
      pValue: `p = ${results.p_value.toFixed(4)} ${
        isSignificant ? '< 0.05' : '≥ 0.05'
      }`,
      effectSize: results.effect_size
        ? `Effect size: ${results.effect_size.toFixed(3)} - ${contextInterpretation.effectSize}`
        : null,
      confidence: results.confidence_interval
        ? `95% CI: [${results.confidence_interval[0].toFixed(3)}, ${results.confidence_interval[1].toFixed(3)}]`
        : null
    };
  };

  const getRecommendations = () => {
    const recommendations = [];
    const isSignificant = results.p_value < 0.05;

    if (isSignificant) {
      recommendations.push({
        type: 'action',
        text: 'Consider practical significance alongside statistical significance',
        priority: 'high'
      });
      recommendations.push({
        type: 'validation',
        text: 'Validate findings with additional studies or larger samples',
        priority: 'medium'
      });
    } else {
      recommendations.push({
        type: 'power',
        text: 'Consider conducting power analysis to determine adequate sample size',
        priority: 'high'
      });
      recommendations.push({
        type: 'review',
        text: 'Review study design and measurement procedures',
        priority: 'medium'
      });
    }

    if (results.effect_size && Math.abs(results.effect_size) < 0.2) {
      recommendations.push({
        type: 'effect',
        text: 'Small effect size detected - consider practical importance',
        priority: 'medium'
      });
    }

    return [...recommendations, ...customInterpretations];
  };

  const getLimitations = () => {
    const limitations = [];

    if (results.sample_size && results.sample_size < 30) {
      limitations.push({
        type: 'sample',
        text: 'Small sample size may limit generalizability',
        severity: 'moderate'
      });
    }

    if (results.assumptions_met === false) {
      limitations.push({
        type: 'assumptions',
        text: 'Some statistical assumptions may not be fully met',
        severity: 'high'
      });
    }

    if (!results.effect_size) {
      limitations.push({
        type: 'effect',
        text: 'Effect size not calculated - practical significance unclear',
        severity: 'low'
      });
    }

    return limitations;
  };

  const getNextSteps = () => {
    const steps = [];
    const isSignificant = results.p_value < 0.05;

    if (isSignificant) {
      steps.push('Conduct follow-up analyses to explore the finding further');
      steps.push('Consider replication with independent samples');
      steps.push('Investigate potential moderators or mediators');
    } else {
      steps.push('Review and possibly increase sample size');
      steps.push('Check for measurement error or data quality issues');
      steps.push('Consider alternative statistical approaches');
    }

    steps.push('Document findings and methodology thoroughly');
    steps.push('Prepare visualizations to communicate results');

    return steps;
  };

  const interpretation = getStatisticalInterpretation();
  const recommendations = getRecommendations();
  const limitations = getLimitations();
  const nextSteps = getNextSteps();

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'high': return <ErrorIcon color="error" />;
      case 'moderate': return <WarningIcon color="warning" />;
      case 'low': return <InfoIcon color="info" />;
      default: return <InfoIcon />;
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <PsychologyIcon color="primary" />
        <Typography variant="h6">
          Result Interpretation
        </Typography>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Alert
            severity={results.p_value < 0.05 ? 'success' : 'info'}
            icon={results.p_value < 0.05 ? <CheckCircleIcon /> : <InfoIcon />}
          >
            <AlertTitle>Primary Interpretation</AlertTitle>
            <Typography variant="body2" paragraph>
              {interpretation.primary}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1 }}>
              <Chip label={interpretation.pValue} size="small" />
              {interpretation.effectSize && (
                <Chip label={interpretation.effectSize} size="small" variant="outlined" />
              )}
              {interpretation.confidence && (
                <Chip label={interpretation.confidence} size="small" variant="outlined" />
              )}
            </Box>
          </Alert>
        </Grid>
      </Grid>

      <Accordion
        expanded={expandedPanel === 'interpretation'}
        onChange={handlePanelChange('interpretation')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SchoolIcon color="action" />
            <Typography>Detailed Explanation</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    What does p-value mean?
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    The p-value ({results.p_value.toFixed(4)}) represents the probability of observing
                    results at least as extreme as what was found, assuming the null hypothesis is true.
                    {results.p_value < 0.05
                      ? ' Since p < 0.05, we have evidence against the null hypothesis.'
                      : ' Since p ≥ 0.05, we do not have sufficient evidence against the null hypothesis.'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {results.effect_size && (
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      What about effect size?
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Effect size ({results.effect_size.toFixed(3)}) measures the magnitude of the difference,
                      independent of sample size. This is
                      {Math.abs(results.effect_size) < 0.2 ? ' a small effect' :
                       Math.abs(results.effect_size) < 0.5 ? ' a medium effect' :
                       Math.abs(results.effect_size) < 0.8 ? ' a medium-large effect' : ' a large effect'}.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {showTechnical && (
              <Grid item xs={12}>
                <Alert severity="info">
                  <AlertTitle>Technical Details</AlertTitle>
                  <Typography variant="body2">
                    Test: {testType || 'Statistical Test'}<br />
                    Test Statistic: {results.test_statistic?.toFixed(4)}<br />
                    {results.degrees_of_freedom && `Degrees of Freedom: ${results.degrees_of_freedom}`}
                  </Typography>
                </Alert>
              </Grid>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>

      {showRecommendations && recommendations.length > 0 && (
        <Accordion
          expanded={expandedPanel === 'recommendations'}
          onChange={handlePanelChange('recommendations')}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LightbulbIcon color="action" />
              <Typography>Recommendations</Typography>
              <Chip label={recommendations.length} size="small" />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              {recommendations.map((rec, index) => (
                <ListItem
                  key={index}
                  secondaryAction={
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip
                        label={rec.priority}
                        size="small"
                        color={getPriorityColor(rec.priority)}
                        variant="outlined"
                      />
                      <IconButton
                        size="small"
                        onClick={() => toggleBookmark(`rec-${index}`)}
                      >
                        <BookmarkIcon
                          color={bookmarked.includes(`rec-${index}`) ? 'primary' : 'action'}
                        />
                      </IconButton>
                    </Box>
                  }
                >
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary={rec.text}
                    secondary={`Type: ${rec.type}`}
                  />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      )}

      {showLimitations && limitations.length > 0 && (
        <Accordion
          expanded={expandedPanel === 'limitations'}
          onChange={handlePanelChange('limitations')}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <WarningIcon color="action" />
              <Typography>Limitations & Considerations</Typography>
              <Chip label={limitations.length} size="small" color="warning" />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              {limitations.map((limitation, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    {getSeverityIcon(limitation.severity)}
                  </ListItemIcon>
                  <ListItemText
                    primary={limitation.text}
                    secondary={`Severity: ${limitation.severity}`}
                  />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      )}

      {showNextSteps && (
        <Accordion
          expanded={expandedPanel === 'nextsteps'}
          onChange={handlePanelChange('nextsteps')}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <GraphIcon color="action" />
              <Typography>Next Steps</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              {nextSteps.map((step, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <Typography color="primary">{index + 1}.</Typography>
                  </ListItemIcon>
                  <ListItemText primary={step} />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      )}

      {bookmarked.length > 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <AlertTitle>Bookmarked Items</AlertTitle>
          You have bookmarked {bookmarked.length} item(s) for future reference.
        </Alert>
      )}
    </Paper>
  );
};

export default InterpretationPanel;