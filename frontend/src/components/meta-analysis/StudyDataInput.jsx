/**
 * Study Data Input Component
 *
 * Form for entering multiple study data for meta-analysis.
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  IconButton,
  Tooltip,
  Typography,
  Paper,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  CheckCircle as ValidIcon,
  Error as InvalidIcon,
} from '@mui/icons-material';

const StudyDataInput = ({ studies, onUpdateStudy, onRemoveStudy }) => {
  // Validate a study row
  const isStudyValid = (study) => {
    return (
      study.study_name &&
      study.effect_size !== '' && !isNaN(parseFloat(study.effect_size)) &&
      study.standard_error !== '' && !isNaN(parseFloat(study.standard_error)) &&
      parseFloat(study.standard_error) > 0
    );
  };

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'background.default' }}>
            <TableCell width={30}>#</TableCell>
            <TableCell>
              <Tooltip title="Name or reference for the study">
                <span>Study Name *</span>
              </Tooltip>
            </TableCell>
            <TableCell>
              <Tooltip title="Effect size (e.g., Cohen's d, log odds ratio, correlation r)">
                <span>Effect Size *</span>
              </Tooltip>
            </TableCell>
            <TableCell>
              <Tooltip title="Standard error of the effect size">
                <span>SE *</span>
              </Tooltip>
            </TableCell>
            <TableCell>
              <Tooltip title="Total sample size (optional)">
                <span>N</span>
              </Tooltip>
            </TableCell>
            <TableCell>
              <Tooltip title="Subgroup for moderator analysis (optional)">
                <span>Subgroup</span>
              </Tooltip>
            </TableCell>
            <TableCell width={40}>Valid</TableCell>
            <TableCell width={40}></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {studies.map((study, index) => {
            const valid = isStudyValid(study);
            return (
              <TableRow
                key={index}
                sx={{
                  '&:hover': { bgcolor: 'action.hover' },
                  bgcolor: valid ? 'inherit' : 'error.light'
                }}
              >
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {index + 1}
                  </Typography>
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    variant="standard"
                    placeholder="e.g., Smith 2020"
                    value={study.study_name}
                    onChange={(e) => onUpdateStudy(index, 'study_name', e.target.value)}
                    fullWidth
                    error={!study.study_name && (study.effect_size || study.standard_error)}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    variant="standard"
                    type="number"
                    placeholder="0.00"
                    value={study.effect_size}
                    onChange={(e) => onUpdateStudy(index, 'effect_size', e.target.value)}
                    inputProps={{ step: 0.01 }}
                    sx={{ width: 100 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    variant="standard"
                    type="number"
                    placeholder="0.00"
                    value={study.standard_error}
                    onChange={(e) => onUpdateStudy(index, 'standard_error', e.target.value)}
                    inputProps={{ step: 0.01, min: 0.001 }}
                    error={study.standard_error !== '' && parseFloat(study.standard_error) <= 0}
                    sx={{ width: 80 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    variant="standard"
                    type="number"
                    placeholder=""
                    value={study.sample_size}
                    onChange={(e) => onUpdateStudy(index, 'sample_size', e.target.value)}
                    inputProps={{ min: 1 }}
                    sx={{ width: 70 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    variant="standard"
                    placeholder=""
                    value={study.subgroup}
                    onChange={(e) => onUpdateStudy(index, 'subgroup', e.target.value)}
                    sx={{ width: 100 }}
                  />
                </TableCell>
                <TableCell align="center">
                  {valid ? (
                    <ValidIcon color="success" fontSize="small" />
                  ) : (
                    <Tooltip title="Missing required fields">
                      <InvalidIcon color="disabled" fontSize="small" />
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => onRemoveStudy(index)}
                    disabled={studies.length <= 1}
                    color="error"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default StudyDataInput;
