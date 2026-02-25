/**
 * Variables & Hypotheses Step
 *
 * Step 2 of the Study Design Wizard.
 * Allows users to define independent variables, dependent variables,
 * covariates, and formulate hypotheses.
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  Button,
  Card,
  IconButton,
  Chip,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
  Tooltip,
  Collapse,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  TrendingUp as ContinuousIcon,
  Category as CategoricalIcon,
  Numbers as OrdinalIcon,
  CheckCircle as CheckIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

/**
 * Variable type options
 */
const VARIABLE_TYPES = [
  {
    id: 'continuous',
    label: 'Continuous',
    description: 'Numerical values on a scale (e.g., height, temperature, scores)',
    icon: <ContinuousIcon />,
    examples: 'Height (cm), Test score (0-100), Reaction time (ms)',
  },
  {
    id: 'categorical',
    label: 'Categorical',
    description: 'Distinct groups or categories (e.g., gender, treatment condition)',
    icon: <CategoricalIcon />,
    examples: 'Gender (M/F), Treatment (Control/Experimental), Color (Red/Blue/Green)',
  },
  {
    id: 'ordinal',
    label: 'Ordinal',
    description: 'Ordered categories (e.g., Likert scale, education level)',
    icon: <OrdinalIcon />,
    examples: 'Likert scale (1-5), Education (HS/BS/MS/PhD), Pain level (Low/Medium/High)',
  },
  {
    id: 'binary',
    label: 'Binary',
    description: 'Two categories only (e.g., yes/no, success/failure)',
    icon: <CategoricalIcon />,
    examples: 'Pass/Fail, Yes/No, Alive/Dead, Present/Absent',
  },
];

/**
 * Common variable suggestions based on field
 */
const COMMON_VARIABLES = {
  iv: [
    'Treatment condition',
    'Group assignment',
    'Age group',
    'Gender',
    'Intervention type',
    'Dose level',
    'Time point',
    'Experience level',
  ],
  dv: [
    'Test score',
    'Response time',
    'Accuracy',
    'Satisfaction rating',
    'Performance measure',
    'Anxiety level',
    'Blood pressure',
    'Weight change',
  ],
  covariate: [
    'Age',
    'Gender',
    'Education level',
    'Baseline score',
    'Prior experience',
    'Socioeconomic status',
    'BMI',
    'IQ',
  ],
};

/**
 * Variable Editor Dialog
 */
const VariableEditor = ({ variable, onSave, onCancel, title }) => {
  const [name, setName] = useState(variable?.name || '');
  const [type, setType] = useState(variable?.type || 'continuous');
  const [levels, setLevels] = useState(variable?.levels || []);
  const [levelInput, setLevelInput] = useState('');
  const [description, setDescription] = useState(variable?.description || '');

  const handleAddLevel = () => {
    if (levelInput.trim() && !levels.includes(levelInput.trim())) {
      setLevels([...levels, levelInput.trim()]);
      setLevelInput('');
    }
  };

  const handleRemoveLevel = (levelToRemove) => {
    setLevels(levels.filter(l => l !== levelToRemove));
  };

  const handleSave = () => {
    if (name.trim()) {
      onSave({
        id: variable?.id || Date.now().toString(),
        name: name.trim(),
        type,
        levels: (type === 'categorical' || type === 'ordinal' || type === 'binary') ? levels : [],
        description: description.trim(),
      });
    }
  };

  const showLevels = type === 'categorical' || type === 'ordinal' || type === 'binary';

  return (
    <Card elevation={3} sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        {title}
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Variable Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Treatment condition"
            size="small"
            required
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this variable"
            size="small"
          />
        </Grid>

        <Grid item xs={12}>
          <FormControl component="fieldset" size="small">
            <FormLabel component="legend" sx={{ fontSize: '0.875rem', mb: 1 }}>
              Variable Type
            </FormLabel>
            <RadioGroup
              row
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {VARIABLE_TYPES.map((vType) => (
                <Tooltip key={vType.id} title={vType.description} placement="top">
                  <FormControlLabel
                    value={vType.id}
                    control={<Radio size="small" />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {vType.icon}
                        <Typography variant="body2">{vType.label}</Typography>
                      </Box>
                    }
                  />
                </Tooltip>
              ))}
            </RadioGroup>
          </FormControl>
        </Grid>

        {/* Levels input for categorical/ordinal variables */}
        {showLevels && (
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                size="small"
                label="Add Level/Category"
                value={levelInput}
                onChange={(e) => setLevelInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddLevel()}
                placeholder={type === 'binary' ? 'e.g., Control' : 'e.g., Low'}
                sx={{ flex: 1 }}
              />
              <Button
                variant="outlined"
                onClick={handleAddLevel}
                disabled={!levelInput.trim()}
              >
                Add
              </Button>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {levels.map((level, idx) => (
                <Chip
                  key={idx}
                  label={level}
                  onDelete={() => handleRemoveLevel(level)}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              ))}
              {levels.length === 0 && (
                <Typography variant="caption" color="text.secondary">
                  Add levels for this variable (e.g., Control, Treatment)
                </Typography>
              )}
            </Box>
          </Grid>
        )}

        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button onClick={onCancel} size="small">
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={!name.trim()}
              size="small"
            >
              {variable ? 'Update' : 'Add Variable'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Card>
  );
};

/**
 * Variable List Component
 */
const VariableList = ({ title, variables, onEdit, onDelete, color }) => {
  const theme = useTheme();
  if (variables.length === 0) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          textAlign: 'center',
          bgcolor: theme.palette.grey[theme.palette.mode === 'dark' ? 900 : 50],
          borderStyle: 'dashed',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          No {title.toLowerCase()} defined yet
        </Typography>
      </Paper>
    );
  }

  return (
    <List dense sx={{ bgcolor: 'background.paper', borderRadius: 1, border: `1px solid ${theme.palette.divider}` }}>
      {variables.map((variable, idx) => (
        <React.Fragment key={variable.id}>
          {idx > 0 && <Divider />}
          <ListItem>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: color,
                mr: 1.5,
              }}
            />
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" fontWeight={500}>
                    {variable.name}
                  </Typography>
                  <Chip
                    label={VARIABLE_TYPES.find(t => t.id === variable.type)?.label || variable.type}
                    size="small"
                    sx={{ fontSize: '0.65rem', height: 18 }}
                  />
                </Box>
              }
              secondary={
                variable.levels?.length > 0 ? (
                  <Typography variant="caption" color="text.secondary">
                    Levels: {variable.levels.join(', ')}
                  </Typography>
                ) : variable.description ? (
                  <Typography variant="caption" color="text.secondary">
                    {variable.description}
                  </Typography>
                ) : null
              }
            />
            <ListItemSecondaryAction>
              <IconButton size="small" onClick={() => onEdit(variable)}>
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => onDelete(variable.id)} color="error">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        </React.Fragment>
      ))}
    </List>
  );
};

/**
 * Variables Step Component
 */
const VariablesStep = ({ data, updateData, errors }) => {
  const theme = useTheme();
  const { variables, studyType } = data;

  // Editor state
  const [editingIV, setEditingIV] = useState(null);
  const [editingDV, setEditingDV] = useState(null);
  const [editingCovariate, setEditingCovariate] = useState(null);
  const [showIVEditor, setShowIVEditor] = useState(false);
  const [showDVEditor, setShowDVEditor] = useState(false);
  const [showCovariateEditor, setShowCovariateEditor] = useState(false);

  /**
   * Add or update independent variable
   */
  const handleSaveIV = useCallback((variable) => {
    const existing = variables.independentVariables.find(v => v.id === variable.id);
    if (existing) {
      updateData('variables', {
        independentVariables: variables.independentVariables.map(v =>
          v.id === variable.id ? variable : v
        ),
      });
    } else {
      updateData('variables', {
        independentVariables: [...variables.independentVariables, variable],
      });
    }
    setEditingIV(null);
    setShowIVEditor(false);
  }, [variables.independentVariables, updateData]);

  /**
   * Add or update dependent variable
   */
  const handleSaveDV = useCallback((variable) => {
    const existing = variables.dependentVariables.find(v => v.id === variable.id);
    if (existing) {
      updateData('variables', {
        dependentVariables: variables.dependentVariables.map(v =>
          v.id === variable.id ? variable : v
        ),
      });
    } else {
      updateData('variables', {
        dependentVariables: [...variables.dependentVariables, variable],
      });
    }
    setEditingDV(null);
    setShowDVEditor(false);
  }, [variables.dependentVariables, updateData]);

  /**
   * Add or update covariate
   */
  const handleSaveCovariate = useCallback((variable) => {
    const existing = variables.covariates.find(v => v.id === variable.id);
    if (existing) {
      updateData('variables', {
        covariates: variables.covariates.map(v =>
          v.id === variable.id ? variable : v
        ),
      });
    } else {
      updateData('variables', {
        covariates: [...variables.covariates, variable],
      });
    }
    setEditingCovariate(null);
    setShowCovariateEditor(false);
  }, [variables.covariates, updateData]);

  /**
   * Delete variable
   */
  const handleDeleteVariable = useCallback((type, id) => {
    const key = type === 'iv' ? 'independentVariables' :
                type === 'dv' ? 'dependentVariables' : 'covariates';
    updateData('variables', {
      [key]: variables[key].filter(v => v.id !== id),
    });
  }, [variables, updateData]);

  /**
   * Handle hypothesis change
   */
  const handleHypothesisChange = (event) => {
    updateData('variables', { hypothesis: event.target.value });
  };

  /**
   * Handle hypothesis type change
   */
  const handleHypothesisTypeChange = (event) => {
    updateData('variables', { hypothesisType: event.target.value });
  };

  // Check if correlational design (no IV needed)
  const isCorrelational = studyType.design === 'correlational';

  return (
    <Box>
      {/* Guidance based on study type */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          {isCorrelational ? (
            <>
              <strong>Correlational Design:</strong> Define the variables you want to examine
              the relationship between. Both variables will be measured, not manipulated.
            </>
          ) : (
            <>
              <strong>{studyType.design === 'between' ? 'Between-Subjects' :
                       studyType.design === 'within' ? 'Within-Subjects' :
                       studyType.design === 'mixed' ? 'Mixed' : 'Regression'} Design:</strong>{' '}
              Define your independent variable(s) (what you manipulate or group by) and
              dependent variable(s) (what you measure).
            </>
          )}
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        {/* Independent Variables */}
        {!isCorrelational && (
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle1" fontWeight={600} color="primary">
                  Independent Variables (IV)
                </Typography>
                <Button
                  startIcon={<AddIcon />}
                  size="small"
                  onClick={() => {
                    setEditingIV(null);
                    setShowIVEditor(true);
                  }}
                  variant="outlined"
                >
                  Add IV
                </Button>
              </Box>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                Variables you manipulate or use to define groups
              </Typography>

              {errors.independentVariables && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {errors.independentVariables}
                </Alert>
              )}

              <Collapse in={showIVEditor || !!editingIV}>
                <VariableEditor
                  variable={editingIV}
                  onSave={handleSaveIV}
                  onCancel={() => {
                    setEditingIV(null);
                    setShowIVEditor(false);
                  }}
                  title={editingIV ? 'Edit Independent Variable' : 'Add Independent Variable'}
                />
              </Collapse>

              <VariableList
                title="Independent Variables"
                variables={variables.independentVariables}
                onEdit={(v) => setEditingIV(v)}
                onDelete={(id) => handleDeleteVariable('iv', id)}
                color="primary.main"
              />
            </Box>
          </Grid>
        )}

        {/* Dependent Variables */}
        <Grid item xs={12} md={isCorrelational ? 12 : 6}>
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle1" fontWeight={600} color="success.main">
                {isCorrelational ? 'Variables to Correlate' : 'Dependent Variables (DV)'}
              </Typography>
              <Button
                startIcon={<AddIcon />}
                size="small"
                onClick={() => {
                  setEditingDV(null);
                  setShowDVEditor(true);
                }}
                variant="outlined"
                color="success"
              >
                Add {isCorrelational ? 'Variable' : 'DV'}
              </Button>
            </Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
              {isCorrelational
                ? 'Variables you want to examine the relationship between'
                : 'Variables you measure as outcomes'}
            </Typography>

            {errors.dependentVariables && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {errors.dependentVariables}
              </Alert>
            )}

            <Collapse in={showDVEditor || !!editingDV}>
              <VariableEditor
                variable={editingDV}
                onSave={handleSaveDV}
                onCancel={() => {
                  setEditingDV(null);
                  setShowDVEditor(false);
                }}
                title={editingDV ? 'Edit Variable' : 'Add Variable'}
              />
            </Collapse>

            <VariableList
              title={isCorrelational ? 'Variables' : 'Dependent Variables'}
              variables={variables.dependentVariables}
              onEdit={(v) => setEditingDV(v)}
              onDelete={(id) => handleDeleteVariable('dv', id)}
              color="success.main"
            />
          </Box>
        </Grid>

        {/* Covariates */}
        <Grid item xs={12}>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle1" fontWeight={600} color="warning.main">
                  Covariates (Optional)
                </Typography>
                <Tooltip title="Variables you want to control for in the analysis">
                  <InfoIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                </Tooltip>
              </Box>
              <Button
                startIcon={<AddIcon />}
                size="small"
                onClick={() => {
                  setEditingCovariate(null);
                  setShowCovariateEditor(true);
                }}
                variant="outlined"
                color="warning"
              >
                Add Covariate
              </Button>
            </Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
              Variables to statistically control for (e.g., age, gender, baseline scores)
            </Typography>

            <Collapse in={showCovariateEditor || !!editingCovariate}>
              <VariableEditor
                variable={editingCovariate}
                onSave={handleSaveCovariate}
                onCancel={() => {
                  setEditingCovariate(null);
                  setShowCovariateEditor(false);
                }}
                title={editingCovariate ? 'Edit Covariate' : 'Add Covariate'}
              />
            </Collapse>

            {variables.covariates.length > 0 ? (
              <VariableList
                title="Covariates"
                variables={variables.covariates}
                onEdit={(v) => setEditingCovariate(v)}
                onDelete={(id) => handleDeleteVariable('covariate', id)}
                color="warning.main"
              />
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                No covariates added. Covariates are optional but can help control for confounding variables.
              </Typography>
            )}
          </Box>
        </Grid>

        {/* Hypothesis Section */}
        <Grid item xs={12}>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Research Hypothesis
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Formulate your hypothesis. This will help determine the appropriate statistical test.
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Hypothesis Statement"
                value={variables.hypothesis}
                onChange={handleHypothesisChange}
                placeholder={isCorrelational
                  ? "e.g., There is a positive correlation between study time and test performance."
                  : "e.g., Participants in the treatment group will show higher test scores than the control group."}
                helperText="State your hypothesis in clear, testable terms"
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl component="fieldset">
                <FormLabel component="legend" sx={{ fontSize: '0.875rem', mb: 1 }}>
                  Hypothesis Direction
                </FormLabel>
                <RadioGroup
                  row
                  value={variables.hypothesisType}
                  onChange={handleHypothesisTypeChange}
                >
                  <FormControlLabel
                    value="two-tailed"
                    control={<Radio size="small" />}
                    label={
                      <Tooltip title="Predicting a difference, but not the direction">
                        <span>Two-tailed (non-directional)</span>
                      </Tooltip>
                    }
                  />
                  <FormControlLabel
                    value="one-tailed-greater"
                    control={<Radio size="small" />}
                    label={
                      <Tooltip title="Predicting group 1 will be greater than group 2">
                        <span>One-tailed (greater than)</span>
                      </Tooltip>
                    }
                  />
                  <FormControlLabel
                    value="one-tailed-less"
                    control={<Radio size="small" />}
                    label={
                      <Tooltip title="Predicting group 1 will be less than group 2">
                        <span>One-tailed (less than)</span>
                      </Tooltip>
                    }
                  />
                </RadioGroup>
              </FormControl>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Summary */}
      {(variables.independentVariables.length > 0 || variables.dependentVariables.length > 0) && (
        <Alert severity="success" sx={{ mt: 3 }} icon={<CheckIcon />}>
          <Typography variant="body2">
            <strong>Summary:</strong>{' '}
            {!isCorrelational && variables.independentVariables.length > 0 && (
              <>
                {variables.independentVariables.length} IV{variables.independentVariables.length > 1 ? 's' : ''}{' '}
                ({variables.independentVariables.map(v => v.name).join(', ')}){' '}
              </>
            )}
            {variables.dependentVariables.length > 0 && (
              <>
                {isCorrelational ? '' : '→ '}
                {variables.dependentVariables.length} {isCorrelational ? 'variable' : 'DV'}{variables.dependentVariables.length > 1 ? 's' : ''}{' '}
                ({variables.dependentVariables.map(v => v.name).join(', ')})
              </>
            )}
            {variables.covariates.length > 0 && (
              <>
                {' '}+ {variables.covariates.length} covariate{variables.covariates.length > 1 ? 's' : ''}
              </>
            )}
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default VariablesStep;
