/**
 * Feasibility Step
 *
 * Step 5 of the Study Design Wizard.
 * Evaluates practical constraints and adjusts sample size for attrition.
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  Slider,
  Paper,
  Alert,
  List,
  ListItem,
  FormControlLabel,
  Checkbox,
  Card,
  CardContent,
  LinearProgress,
  InputAdornment,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  People as PeopleIcon,
  AttachMoney as BudgetIcon,
  Schedule as TimeIcon,
  TrendingDown as AttritionIcon,
  Lightbulb as TipIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';

/**
 * Common constraints checklist
 */
const COMMON_CONSTRAINTS = [
  { id: 'budget', label: 'Limited budget', impact: 'May need to reduce sample size or simplify design' },
  { id: 'time', label: 'Time constraints', impact: 'May need sequential data collection or shorter follow-up' },
  { id: 'access', label: 'Limited participant access', impact: 'Consider online recruitment or broader eligibility criteria' },
  { id: 'location', label: 'Geographic limitations', impact: 'Consider multi-site study or remote participation' },
  { id: 'equipment', label: 'Equipment availability', impact: 'May need to schedule sessions or find alternatives' },
  { id: 'expertise', label: 'Specialized expertise needed', impact: 'Plan for training or collaboration' },
  { id: 'ethics', label: 'IRB/Ethics approval timeline', impact: 'Start approval process early' },
  { id: 'funding', label: 'Funding deadline', impact: 'Plan realistic milestones' },
];

/**
 * Feasibility status evaluator
 */
function evaluateFeasibility(requiredN, availableN, constraints) {
  if (!availableN) {
    return {
      status: 'unknown',
      message: 'Enter available participants to evaluate feasibility',
      color: '#9e9e9e',
      icon: <AssessmentIcon />,
    };
  }

  const ratio = availableN / requiredN;

  if (ratio >= 1.2) {
    return {
      status: 'feasible',
      message: `You have ${((ratio - 1) * 100).toFixed(0)}% more participants than needed. Study is highly feasible.`,
      color: '#4caf50',
      icon: <CheckIcon />,
    };
  }

  if (ratio >= 1.0) {
    return {
      status: 'feasible',
      message: 'You have enough participants. Consider adding a buffer for attrition.',
      color: '#4caf50',
      icon: <CheckIcon />,
    };
  }

  if (ratio >= 0.8) {
    return {
      status: 'marginal',
      message: `You're ${((1 - ratio) * 100).toFixed(0)}% short. Consider recruiting more or accepting lower power.`,
      color: '#ff9800',
      icon: <WarningIcon />,
    };
  }

  return {
    status: 'infeasible',
    message: `You're ${((1 - ratio) * 100).toFixed(0)}% short. Significant changes needed to study design.`,
    color: '#f44336',
    icon: <ErrorIcon />,
  };
}

/**
 * Feasibility Step Component
 */
const FeasibilityStep = ({ data, updateData, errors }) => {
  const { feasibility, powerAnalysis } = data;

  const requiredSampleSize = powerAnalysis.totalSampleSize || 0;

  /**
   * Calculate adjusted sample size accounting for attrition
   */
  const adjustedSampleSize = useMemo(() => {
    if (!requiredSampleSize) return null;
    const attritionMultiplier = 1 / (1 - feasibility.attritionRate);
    return Math.ceil(requiredSampleSize * attritionMultiplier);
  }, [requiredSampleSize, feasibility.attritionRate]);

  /**
   * Evaluate feasibility
   */
  const feasibilityResult = useMemo(() => {
    return evaluateFeasibility(
      adjustedSampleSize || requiredSampleSize,
      feasibility.availableParticipants,
      feasibility.constraints
    );
  }, [adjustedSampleSize, requiredSampleSize, feasibility.availableParticipants, feasibility.constraints]);

  /**
   * Handle available participants change
   */
  const handleAvailableChange = (event) => {
    const value = parseInt(event.target.value) || null;
    updateData('feasibility', { availableParticipants: value });
  };

  /**
   * Handle attrition rate change
   */
  const handleAttritionChange = (event, value) => {
    updateData('feasibility', { attritionRate: value });
  };

  /**
   * Handle budget change
   */
  const handleBudgetChange = (event) => {
    const value = parseFloat(event.target.value) || null;
    updateData('feasibility', { budget: value });
  };

  /**
   * Handle time constraint change
   */
  const handleTimeChange = (event) => {
    const value = parseInt(event.target.value) || null;
    updateData('feasibility', { timeConstraint: value });
  };

  /**
   * Handle constraint toggle
   */
  const handleConstraintToggle = (constraintId) => {
    const current = feasibility.constraints || [];
    const updated = current.includes(constraintId)
      ? current.filter(c => c !== constraintId)
      : [...current, constraintId];
    updateData('feasibility', { constraints: updated });
  };

  /**
   * Calculate per-participant cost
   */
  const costPerParticipant = useMemo(() => {
    if (feasibility.budget && adjustedSampleSize) {
      return (feasibility.budget / adjustedSampleSize).toFixed(2);
    }
    return null;
  }, [feasibility.budget, adjustedSampleSize]);

  /**
   * Calculate participants per week needed
   */
  const participantsPerWeek = useMemo(() => {
    if (feasibility.timeConstraint && adjustedSampleSize) {
      return (adjustedSampleSize / feasibility.timeConstraint).toFixed(1);
    }
    return null;
  }, [feasibility.timeConstraint, adjustedSampleSize]);

  // Update feasibility status in data
  React.useEffect(() => {
    updateData('feasibility', {
      adjustedSampleSize,
      feasibilityStatus: feasibilityResult.status,
    });
  }, [adjustedSampleSize, feasibilityResult.status, updateData]);

  return (
    <Box>
      {/* Guidance */}
      <Alert severity="info" sx={{ mb: 3 }} icon={<TipIcon />}>
        <Typography variant="body2">
          <strong>Feasibility Check:</strong> Evaluate whether your study is practically achievable
          given your resources and constraints. This step helps identify potential issues early.
        </Typography>
      </Alert>

      {/* Sample Size Summary */}
      <Paper elevation={2} sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
          Required Sample Size Summary
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">Calculated</Typography>
            <Typography variant="h6" fontWeight={600}>
              {requiredSampleSize || '—'}
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">Attrition Rate</Typography>
            <Typography variant="h6" fontWeight={600}>
              {(feasibility.attritionRate * 100).toFixed(0)}%
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">With Attrition Buffer</Typography>
            <Typography variant="h6" fontWeight={600} color="primary">
              {adjustedSampleSize || '—'}
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">Per Group</Typography>
            <Typography variant="h6" fontWeight={600}>
              {adjustedSampleSize ? Math.ceil(adjustedSampleSize / powerAnalysis.numberOfGroups) : '—'}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        {/* Left Column - Resource Inputs */}
        <Grid item xs={12} md={6}>
          {/* Available Participants */}
          <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              <PeopleIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
              Available Participants
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              How many participants can you realistically recruit?
            </Typography>
            <TextField
              fullWidth
              type="number"
              value={feasibility.availableParticipants || ''}
              onChange={handleAvailableChange}
              placeholder="e.g., 150"
              size="small"
              InputProps={{
                startAdornment: <InputAdornment position="start"><PeopleIcon /></InputAdornment>,
              }}
            />
          </Paper>

          {/* Attrition Rate */}
          <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              <AttritionIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#ff9800' }} />
              Expected Attrition Rate
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Percentage of participants expected to drop out
            </Typography>
            <Slider
              value={feasibility.attritionRate}
              onChange={handleAttritionChange}
              min={0}
              max={0.5}
              step={0.05}
              valueLabelDisplay="on"
              valueLabelFormat={(v) => `${(v * 100).toFixed(0)}%`}
              marks={[
                { value: 0.1, label: '10%' },
                { value: 0.2, label: '20%' },
                { value: 0.3, label: '30%' },
              ]}
            />
            <Alert severity="info" sx={{ mt: 1 }}>
              <Typography variant="caption">
                <strong>Guideline:</strong> Lab studies: 5-10%, Online studies: 10-20%,
                Longitudinal: 20-30%, Clinical trials: 15-25%
              </Typography>
            </Alert>
          </Paper>

          {/* Budget */}
          <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              <BudgetIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#4caf50' }} />
              Research Budget (Optional)
            </Typography>
            <TextField
              fullWidth
              type="number"
              value={feasibility.budget || ''}
              onChange={handleBudgetChange}
              placeholder="e.g., 5000"
              size="small"
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
            />
            {costPerParticipant && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                ≈ ${costPerParticipant} per participant available for incentives/materials
              </Typography>
            )}
          </Paper>

          {/* Time Constraint */}
          <Paper elevation={1} sx={{ p: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              <TimeIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#9c27b0' }} />
              Data Collection Timeline (Optional)
            </Typography>
            <TextField
              fullWidth
              type="number"
              value={feasibility.timeConstraint || ''}
              onChange={handleTimeChange}
              placeholder="e.g., 12"
              size="small"
              InputProps={{
                endAdornment: <InputAdornment position="end">weeks</InputAdornment>,
              }}
            />
            {participantsPerWeek && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                You need to recruit ~{participantsPerWeek} participants per week
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Right Column - Feasibility Result & Constraints */}
        <Grid item xs={12} md={6}>
          {/* Feasibility Status Card */}
          <Card
            elevation={3}
            sx={{
              mb: 2,
              border: `2px solid ${feasibilityResult.color}`,
              bgcolor: `${feasibilityResult.color}10`,
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    bgcolor: feasibilityResult.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                  }}
                >
                  {feasibilityResult.icon}
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={600} sx={{ textTransform: 'capitalize' }}>
                    {feasibilityResult.status}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Feasibility Assessment
                  </Typography>
                </Box>
              </Box>

              <Typography variant="body2">
                {feasibilityResult.message}
              </Typography>

              {feasibility.availableParticipants && adjustedSampleSize && (
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption">
                      Available: {feasibility.availableParticipants}
                    </Typography>
                    <Typography variant="caption">
                      Required: {adjustedSampleSize}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min((feasibility.availableParticipants / adjustedSampleSize) * 100, 100)}
                    sx={{
                      height: 10,
                      borderRadius: 5,
                      bgcolor: (t) => t.palette.mode === 'dark' ? t.palette.grey[700] : t.palette.grey[300],
                      '& .MuiLinearProgress-bar': {
                        bgcolor: feasibilityResult.color,
                      },
                    }}
                  />
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Constraints Checklist */}
          <Paper elevation={1} sx={{ p: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Potential Constraints
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Check any constraints that apply to your study
            </Typography>

            <List dense>
              {COMMON_CONSTRAINTS.map((constraint) => (
                <ListItem
                  key={constraint.id}
                  sx={{
                    bgcolor: (t) => feasibility.constraints?.includes(constraint.id) ? (t.palette.mode === 'dark' ? 'rgba(255, 152, 0, 0.12)' : '#fff3e0') : 'transparent',
                    borderRadius: 1,
                    mb: 0.5,
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={feasibility.constraints?.includes(constraint.id) || false}
                        onChange={() => handleConstraintToggle(constraint.id)}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2">{constraint.label}</Typography>
                        {feasibility.constraints?.includes(constraint.id) && (
                          <Typography variant="caption" color="text.secondary">
                            {constraint.impact}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>

      {/* Recommendations */}
      {feasibilityResult.status !== 'unknown' && (
        <Paper elevation={2} sx={{ p: 2, mt: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Recommendations
          </Typography>

          <Grid container spacing={2}>
            {feasibilityResult.status === 'infeasible' && (
              <>
                <Grid item xs={12} sm={6}>
                  <Alert severity="warning">
                    <Typography variant="body2">
                      <strong>Option 1:</strong> Increase effect size threshold (detect only larger effects)
                    </Typography>
                  </Alert>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Alert severity="warning">
                    <Typography variant="body2">
                      <strong>Option 2:</strong> Accept lower power (e.g., 70% instead of 80%)
                    </Typography>
                  </Alert>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Alert severity="warning">
                    <Typography variant="body2">
                      <strong>Option 3:</strong> Use within-subjects design to reduce N needed
                    </Typography>
                  </Alert>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Alert severity="warning">
                    <Typography variant="body2">
                      <strong>Option 4:</strong> Conduct a pilot study to refine estimates
                    </Typography>
                  </Alert>
                </Grid>
              </>
            )}

            {feasibilityResult.status === 'marginal' && (
              <Grid item xs={12}>
                <Alert severity="info">
                  <Typography variant="body2">
                    Your study is marginally feasible. Consider recruiting from additional sources
                    or extending your timeline. Document your constraints for the methods section.
                  </Typography>
                </Alert>
              </Grid>
            )}

            {feasibilityResult.status === 'feasible' && (
              <Grid item xs={12}>
                <Alert severity="success">
                  <Typography variant="body2">
                    Your study appears feasible! Remember to account for the attrition buffer
                    in your recruitment targets. Aim to recruit <strong>{adjustedSampleSize}</strong> participants
                    to ensure you have {requiredSampleSize} for analysis.
                  </Typography>
                </Alert>
              </Grid>
            )}
          </Grid>
        </Paper>
      )}
    </Box>
  );
};

export default FeasibilityStep;
