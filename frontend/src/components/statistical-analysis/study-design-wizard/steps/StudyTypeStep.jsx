/**
 * Study Type Step
 *
 * Step 1 of the Study Design Wizard.
 * Allows users to select their research design type, study purpose, and setting.
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  FormHelperText,
  Alert,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  CompareArrows as BetweenIcon,
  Replay as WithinIcon,
  Merge as MixedIcon,
  TrendingUp as CorrelationalIcon,
  Timeline as RegressionIcon,
  Science as ExploratoryIcon,
  CheckCircle as ConfirmatoryIcon,
  ContentCopy as ReplicationIcon,
  Computer as OnlineIcon,
  LocalHospital as ClinicalIcon,
  Nature as FieldIcon,
  Biotech as LabIcon,
  People as HumansIcon,
  Pets as AnimalsIcon,
  Archive as ArchivalIcon,
} from '@mui/icons-material';

/**
 * Study design options with detailed descriptions
 */
const STUDY_DESIGNS = [
  {
    id: 'between',
    label: 'Between-Subjects',
    description: 'Different participants in each group/condition',
    icon: <BetweenIcon />,
    examples: 'Control vs Treatment, Group A vs Group B',
    tests: ['Independent t-test', 'One-way ANOVA', 'Factorial ANOVA'],
    color: '#2196f3',
  },
  {
    id: 'within',
    label: 'Within-Subjects',
    description: 'Same participants across all conditions',
    icon: <WithinIcon />,
    examples: 'Pre-test/Post-test, Repeated measures',
    tests: ['Paired t-test', 'Repeated Measures ANOVA'],
    color: '#9c27b0',
  },
  {
    id: 'mixed',
    label: 'Mixed Design',
    description: 'Combination of between and within factors',
    icon: <MixedIcon />,
    examples: 'Treatment groups measured over time',
    tests: ['Mixed ANOVA', 'Split-plot ANOVA'],
    color: '#ff9800',
  },
  {
    id: 'correlational',
    label: 'Correlational',
    description: 'Examine relationships between variables',
    icon: <CorrelationalIcon />,
    examples: 'Association between age and performance',
    tests: ['Pearson correlation', 'Spearman correlation'],
    color: '#4caf50',
  },
  {
    id: 'regression',
    label: 'Regression',
    description: 'Predict outcomes from predictors',
    icon: <RegressionIcon />,
    examples: 'Predicting test scores from study time',
    tests: ['Linear regression', 'Multiple regression', 'Logistic regression'],
    color: '#f44336',
  },
];

/**
 * Study purpose options
 */
const STUDY_PURPOSES = [
  {
    id: 'exploratory',
    label: 'Exploratory',
    description: 'Generate hypotheses, discover patterns',
    icon: <ExploratoryIcon />,
  },
  {
    id: 'confirmatory',
    label: 'Confirmatory',
    description: 'Test pre-specified hypotheses',
    icon: <ConfirmatoryIcon />,
  },
  {
    id: 'replication',
    label: 'Replication',
    description: 'Reproduce previous findings',
    icon: <ReplicationIcon />,
  },
];

/**
 * Study setting options
 */
const STUDY_SETTINGS = [
  { id: 'laboratory', label: 'Laboratory', icon: <LabIcon /> },
  { id: 'field', label: 'Field Study', icon: <FieldIcon /> },
  { id: 'online', label: 'Online', icon: <OnlineIcon /> },
  { id: 'clinical', label: 'Clinical', icon: <ClinicalIcon /> },
];

/**
 * Participant type options
 */
const PARTICIPANT_TYPES = [
  { id: 'humans', label: 'Human Participants', icon: <HumansIcon /> },
  { id: 'animals', label: 'Animal Subjects', icon: <AnimalsIcon /> },
  { id: 'archival', label: 'Archival Data', icon: <ArchivalIcon /> },
];

/**
 * Study Type Step Component
 */
const StudyTypeStep = ({ data, updateData, errors }) => {
  const { studyType } = data;

  /**
   * Handle design selection
   */
  const handleDesignSelect = (designId) => {
    updateData('studyType', { design: designId });
  };

  /**
   * Handle purpose selection
   */
  const handlePurposeChange = (event) => {
    updateData('studyType', { purpose: event.target.value });
  };

  /**
   * Handle setting selection
   */
  const handleSettingChange = (event) => {
    updateData('studyType', { setting: event.target.value });
  };

  /**
   * Handle participant type selection
   */
  const handleParticipantsChange = (event) => {
    updateData('studyType', { participants: event.target.value });
  };

  return (
    <Box>
      {/* Study Design Selection */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          Research Design *
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Select the design that best matches your research question
        </Typography>

        {errors.design && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errors.design}
          </Alert>
        )}

        <Grid container spacing={2}>
          {STUDY_DESIGNS.map((design) => (
            <Grid item xs={12} sm={6} md={4} key={design.id}>
              <Card
                elevation={studyType.design === design.id ? 8 : 1}
                sx={{
                  height: '100%',
                  border: studyType.design === design.id
                    ? `3px solid ${design.color}`
                    : '1px solid #e0e0e0',
                  transition: 'all 0.3s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
              >
                <CardActionArea
                  onClick={() => handleDesignSelect(design.id)}
                  sx={{ height: '100%' }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Box sx={{ color: design.color }}>
                        {design.icon}
                      </Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {design.label}
                      </Typography>
                      {studyType.design === design.id && (
                        <Box
                          sx={{
                            ml: 'auto',
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            bgcolor: design.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <ConfirmatoryIcon sx={{ color: 'white', fontSize: 16 }} />
                        </Box>
                      )}
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      {design.description}
                    </Typography>

                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                      <strong>Example:</strong> {design.examples}
                    </Typography>

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {design.tests.slice(0, 2).map((test, idx) => (
                        <Chip
                          key={idx}
                          label={test}
                          size="small"
                          sx={{
                            fontSize: '0.65rem',
                            height: 20,
                            bgcolor: studyType.design === design.id
                              ? `${design.color}20`
                              : '#f5f5f5',
                          }}
                        />
                      ))}
                      {design.tests.length > 2 && (
                        <Chip
                          label={`+${design.tests.length - 2}`}
                          size="small"
                          sx={{ fontSize: '0.65rem', height: 20 }}
                        />
                      )}
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Study Purpose */}
      <Box sx={{ mb: 4 }}>
        <FormControl component="fieldset" error={!!errors.purpose}>
          <FormLabel component="legend" sx={{ fontWeight: 600, mb: 1 }}>
            Study Purpose *
          </FormLabel>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            What is the primary goal of your research?
          </Typography>

          <RadioGroup
            row
            value={studyType.purpose}
            onChange={handlePurposeChange}
          >
            {STUDY_PURPOSES.map((purpose) => (
              <Tooltip key={purpose.id} title={purpose.description} placement="top">
                <FormControlLabel
                  value={purpose.id}
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {purpose.icon}
                      {purpose.label}
                    </Box>
                  }
                  sx={{
                    mr: 3,
                    p: 1,
                    borderRadius: 1,
                    bgcolor: studyType.purpose === purpose.id ? '#e3f2fd' : 'transparent',
                    transition: 'all 0.2s',
                  }}
                />
              </Tooltip>
            ))}
          </RadioGroup>
          {errors.purpose && <FormHelperText>{errors.purpose}</FormHelperText>}
        </FormControl>

        {/* Confirmatory study warning */}
        {studyType.purpose === 'confirmatory' && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Pre-registration recommended:</strong> For confirmatory studies,
              consider pre-registering your hypotheses and analysis plan on platforms
              like OSF, AsPredicted, or ClinicalTrials.gov to enhance transparency and
              credibility.
            </Typography>
          </Alert>
        )}

        {/* Replication study guidance */}
        {studyType.purpose === 'replication' && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Replication best practices:</strong> Consider using the original
              study's effect size for power analysis. For direct replications, aim for
              higher power (90%+) to adequately test the original finding.
            </Typography>
          </Alert>
        )}
      </Box>

      {/* Study Setting */}
      <Box sx={{ mb: 4 }}>
        <FormControl component="fieldset">
          <FormLabel component="legend" sx={{ fontWeight: 600, mb: 1 }}>
            Study Setting
          </FormLabel>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Where will your study be conducted?
          </Typography>

          <RadioGroup
            row
            value={studyType.setting}
            onChange={handleSettingChange}
          >
            {STUDY_SETTINGS.map((setting) => (
              <FormControlLabel
                key={setting.id}
                value={setting.id}
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {setting.icon}
                    {setting.label}
                  </Box>
                }
                sx={{
                  mr: 3,
                  p: 1,
                  borderRadius: 1,
                  bgcolor: studyType.setting === setting.id ? '#e8f5e9' : 'transparent',
                  transition: 'all 0.2s',
                }}
              />
            ))}
          </RadioGroup>
        </FormControl>
      </Box>

      {/* Participant Type */}
      <Box sx={{ mb: 2 }}>
        <FormControl component="fieldset">
          <FormLabel component="legend" sx={{ fontWeight: 600, mb: 1 }}>
            Participant Type
          </FormLabel>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            What type of data will you be collecting?
          </Typography>

          <RadioGroup
            row
            value={studyType.participants}
            onChange={handleParticipantsChange}
          >
            {PARTICIPANT_TYPES.map((pType) => (
              <FormControlLabel
                key={pType.id}
                value={pType.id}
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {pType.icon}
                    {pType.label}
                  </Box>
                }
                sx={{
                  mr: 3,
                  p: 1,
                  borderRadius: 1,
                  bgcolor: studyType.participants === pType.id ? '#fff3e0' : 'transparent',
                  transition: 'all 0.2s',
                }}
              />
            ))}
          </RadioGroup>
        </FormControl>

        {/* Ethics reminder */}
        {studyType.participants === 'humans' && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Ethics approval required:</strong> Studies involving human
              participants require Institutional Review Board (IRB) approval.
              Ensure you have proper consent procedures in place.
            </Typography>
          </Alert>
        )}

        {studyType.participants === 'animals' && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>IACUC approval required:</strong> Studies involving animal
              subjects require Institutional Animal Care and Use Committee (IACUC)
              approval. Follow the 3Rs principles (Replace, Reduce, Refine).
            </Typography>
          </Alert>
        )}
      </Box>

      {/* Summary */}
      {studyType.design && studyType.purpose && (
        <Alert severity="success" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Your selection:</strong> You're planning a{' '}
            <strong>{STUDY_DESIGNS.find(d => d.id === studyType.design)?.label}</strong> study
            for <strong>{STUDY_PURPOSES.find(p => p.id === studyType.purpose)?.label.toLowerCase()}</strong> purposes
            {studyType.setting && (
              <> in a <strong>{STUDY_SETTINGS.find(s => s.id === studyType.setting)?.label.toLowerCase()}</strong> setting</>
            )}
            {studyType.participants && (
              <> with <strong>{PARTICIPANT_TYPES.find(p => p.id === studyType.participants)?.label.toLowerCase()}</strong></>
            )}.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default StudyTypeStep;
