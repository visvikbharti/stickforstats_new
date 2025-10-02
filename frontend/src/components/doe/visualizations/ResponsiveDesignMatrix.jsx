import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  FormControlLabel,
  Tooltip,
  IconButton,
  Stack,
  Button,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip,
  Collapse,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  CardActions,
  Divider
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import FilterListIcon from '@mui/icons-material/FilterList';
import GetAppIcon from '@mui/icons-material/GetApp';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';

import { MobileOnly, TabletOnly, DesktopOnly, useIsMobile } from '../utils/ResponsiveUtils';

/**
 * Responsive Design Matrix Component
 * Provides a responsive visualization of DOE design matrices
 * 
 * @param {Object} props
 * @param {Array} props.designMatrix - The design matrix data
 * @param {Array} props.factors - List of factors
 * @param {Array} props.responses - List of responses
 * @param {string} props.designType - Type of experiment design
 * @param {Function} props.onRunSelect - Callback when a run is selected
 * @param {Function} props.onExport - Callback for exporting the design
 */
const ResponsiveDesignMatrix = ({
  designMatrix,
  factors,
  responses,
  designType,
  onRunSelect,
  onExport
}) => {
  const theme = useTheme();
  const isMobile = useIsMobile();
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  
  const [showCoded, setShowCoded] = useState(true);
  const [showResponses, setShowResponses] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  // Handle row expansion for mobile view
  const handleRowToggle = (runId) => {
    setExpandedRow(expandedRow === runId ? null : runId);
  };
  
  // Toggle filter panel
  const toggleFilters = () => {
    setFiltersOpen(!filtersOpen);
  };
  
  // Get factor value display with units if appropriate
  const getFactorDisplay = (run, factor) => {
    const value = showCoded 
      ? (run[`${factor.name}_coded`] || run[factor.name]) 
      : (run[`${factor.name}_natural`] || (() => {
          // Convert coded to natural if natural isn't provided
          const coded = run[`${factor.name}_coded`] || run[factor.name] || 0;
          if (coded === -1) return factor.low;
          if (coded === 1) return factor.high;
          if (coded === 0) return (parseFloat(factor.low) + parseFloat(factor.high)) / 2;
          return coded;
        })());
    
    // Format display value
    let displayValue = value;
    if (typeof value === 'number') {
      displayValue = value.toFixed(2);
      // Trim trailing zeros after decimal
      if (displayValue.includes('.')) {
        displayValue = displayValue.replace(/\.?0+$/, '');
      }
    }
    
    return `${displayValue}${!showCoded && factor.units ? ` ${factor.units}` : ''}`;
  };

  // Handle run selection
  const handleRunSelect = (run) => {
    if (onRunSelect) {
      onRunSelect(run);
    }
  };
  
  // Handle export
  const handleExport = () => {
    if (onExport) {
      onExport(designMatrix);
    } else {
      // Default CSV export
      const headers = ['RunOrder', 'StdOrder', ...factors.map(f => f.name)];
      if (responses && responses.length > 0) {
        headers.push(...responses.map(r => r.name));
      }
      
      const csv = [
        headers.join(','),
        ...designMatrix.map(run => {
          return [
            run.runOrder,
            run.stdOrder,
            ...factors.map(factor => {
              const value = showCoded 
                ? run[`${factor.name}_coded`] || run[factor.name] || 0
                : run[`${factor.name}_natural`] || (() => {
                    const coded = run[`${factor.name}_coded`] || run[factor.name] || 0;
                    if (coded === -1) return factor.low;
                    if (coded === 1) return factor.high;
                    if (coded === 0) return (parseFloat(factor.low) + parseFloat(factor.high)) / 2;
                    return coded;
                  })();
              return value;
            }),
            ...(responses && showResponses ? responses.map(res => run[res.name] || '') : [])
          ].join(',');
        })
      ].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `design_matrix_${designType.toLowerCase().replace(/\s/g, '_')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };
  
  // Render design info
  const renderDesignInfo = () => (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        Design Information
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        <Chip label={`Type: ${designType}`} variant="outlined" size="small" />
        <Chip label={`Runs: ${designMatrix.length}`} variant="outlined" size="small" />
        <Chip label={`Factors: ${factors.length}`} variant="outlined" size="small" />
        {responses && (
          <Chip label={`Responses: ${responses.length}`} variant="outlined" size="small" />
        )}
      </Box>
    </Box>
  );
  
  // Render control panel
  const renderControlPanel = () => (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">
          Design Matrix
          <Tooltip title="The design matrix shows the experimental runs with factor settings and measured responses">
            <IconButton size="small">
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
        
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<FilterListIcon />}
            onClick={toggleFilters}
          >
            {isMobile ? '' : 'Filters'}
          </Button>
          
          <Button
            variant="outlined"
            size="small"
            startIcon={<GetAppIcon />}
            onClick={handleExport}
          >
            {isMobile ? '' : 'Export'}
          </Button>
        </Stack>
      </Box>
      
      <Collapse in={filtersOpen}>
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControlLabel
              control={
                <Checkbox 
                  checked={showCoded} 
                  onChange={(e) => setShowCoded(e.target.checked)}
                  size="small"
                />
              }
              label="Coded Values"
            />
            
            {responses && responses.length > 0 && (
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={showResponses} 
                    onChange={(e) => setShowResponses(e.target.checked)}
                    size="small"
                  />
                }
                label="Show Responses"
              />
            )}
          </Stack>
        </Paper>
      </Collapse>
    </Box>
  );
  
  // Render desktop view (regular table)
  const renderDesktopView = () => (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Run</TableCell>
            <TableCell>Std</TableCell>
            {factors.map(factor => (
              <TableCell key={factor.name}>
                {factor.name}
                {factor.units && !showCoded && ` (${factor.units})`}
              </TableCell>
            ))}
            {responses && showResponses && responses.map(response => (
              <TableCell key={response.name}>
                {response.name}
                {response.units && ` (${response.units})`}
              </TableCell>
            ))}
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {designMatrix.map((run, index) => {
            // Check if this is a center point
            const isCenter = factors.every(factor => 
              run[`${factor.name}_coded`] === 0 || run[factor.name] === 0
            );
            
            return (
              <TableRow
                key={run.runOrder || index}
                hover
                sx={{
                  cursor: 'pointer',
                  ...(isCenter && {
                    backgroundColor: theme.palette.warning.light + '20'
                  })
                }}
              >
                <TableCell>{run.runOrder || index + 1}</TableCell>
                <TableCell>{run.stdOrder || index + 1}</TableCell>
                
                {factors.map(factor => (
                  <TableCell key={`${run.runOrder || index}-${factor.name}`}>
                    {getFactorDisplay(run, factor)}
                  </TableCell>
                ))}
                
                {responses && showResponses && responses.map(response => (
                  <TableCell key={`${run.runOrder || index}-${response.name}`}>
                    {run[response.name] !== undefined && run[response.name] !== null
                      ? `${run[response.name]}${response.units ? ` ${response.units}` : ''}`
                      : ''}
                  </TableCell>
                ))}
                
                <TableCell>
                  <IconButton 
                    size="small" 
                    onClick={() => handleRunSelect(run)}
                    color="primary"
                  >
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
  
  // Render tablet view (simplified table)
  const renderTabletView = () => (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Run</TableCell>
            {factors.slice(0, 3).map(factor => (
              <TableCell key={factor.name}>
                {factor.name}
                {factor.units && !showCoded && ` (${factor.units})`}
              </TableCell>
            ))}
            {factors.length > 3 && <TableCell>More</TableCell>}
            {responses && showResponses && responses.length > 0 && (
              <TableCell>
                {responses[0].name}
              </TableCell>
            )}
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {designMatrix.map((run, index) => {
            // Check if this is a center point
            const isCenter = factors.every(factor => 
              run[`${factor.name}_coded`] === 0 || run[factor.name] === 0
            );
            
            return (
              <TableRow
                key={run.runOrder || index}
                hover
                sx={{
                  cursor: 'pointer',
                  ...(isCenter && {
                    backgroundColor: theme.palette.warning.light + '20'
                  })
                }}
              >
                <TableCell>{run.runOrder || index + 1}</TableCell>
                
                {factors.slice(0, 3).map(factor => (
                  <TableCell key={`${run.runOrder || index}-${factor.name}`}>
                    {getFactorDisplay(run, factor)}
                  </TableCell>
                ))}
                
                {factors.length > 3 && (
                  <TableCell>
                    <Tooltip title={factors.slice(3).map(f => `${f.name}: ${getFactorDisplay(run, f)}`).join(', ')}>
                      <IconButton size="small">
                        <InfoOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                )}
                
                {responses && showResponses && responses.length > 0 && (
                  <TableCell>
                    {run[responses[0].name] !== undefined && run[responses[0].name] !== null
                      ? `${run[responses[0].name]}${responses[0].units ? ` ${responses[0].units}` : ''}`
                      : ''}
                  </TableCell>
                )}
                
                <TableCell>
                  <IconButton 
                    size="small" 
                    onClick={() => handleRunSelect(run)}
                    color="primary"
                  >
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
  
  // Render mobile view (card-based)
  const renderMobileView = () => (
    <Stack spacing={2}>
      {designMatrix.map((run, index) => {
        // Check if this is a center point
        const isCenter = factors.every(factor => 
          run[`${factor.name}_coded`] === 0 || run[factor.name] === 0
        );
        const isExpanded = expandedRow === (run.runOrder || index);
        
        return (
          <Card 
            key={run.runOrder || index} 
            variant="outlined"
            sx={{
              ...(isCenter && {
                borderColor: theme.palette.warning.main,
                borderWidth: 2
              })
            }}
          >
            <CardContent sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1">
                  Run {run.runOrder || index + 1}
                </Typography>
                <IconButton 
                  size="small" 
                  onClick={() => handleRowToggle(run.runOrder || index)}
                  aria-expanded={isExpanded}
                  aria-label="show more"
                >
                  {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                </IconButton>
              </Box>
              
              {/* Always visible factor summary */}
              <Box sx={{ mt: 1 }}>
                {factors.slice(0, 2).map(factor => (
                  <Box key={factor.name} sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      {factor.name}:
                    </Typography>
                    <Typography variant="body2">
                      {getFactorDisplay(run, factor)}
                    </Typography>
                  </Box>
                ))}
                
                {factors.length > 2 && !isExpanded && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, textAlign: 'right' }}>
                    +{factors.length - 2} more factors
                  </Typography>
                )}
              </Box>
              
              {/* Expandable section */}
              <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                <Divider sx={{ my: 1 }} />
                
                {/* Additional factors */}
                {factors.slice(2).map(factor => (
                  <Box key={factor.name} sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      {factor.name}:
                    </Typography>
                    <Typography variant="body2">
                      {getFactorDisplay(run, factor)}
                    </Typography>
                  </Box>
                ))}
                
                {/* Responses if available */}
                {responses && showResponses && responses.length > 0 && (
                  <>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 1 }}>
                      Responses:
                    </Typography>
                    
                    {responses.map(response => (
                      <Box key={response.name} sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          {response.name}:
                        </Typography>
                        <Typography variant="body2">
                          {run[response.name] !== undefined && run[response.name] !== null
                            ? `${run[response.name]}${response.units ? ` ${response.units}` : ''}`
                            : '-'}
                        </Typography>
                      </Box>
                    ))}
                  </>
                )}
              </Collapse>
            </CardContent>
            
            <CardActions>
              <Button 
                size="small" 
                startIcon={<VisibilityIcon />}
                onClick={() => handleRunSelect(run)}
              >
                View Details
              </Button>
            </CardActions>
          </Card>
        );
      })}
    </Stack>
  );
  
  return (
    <Box>
      {renderDesignInfo()}
      {renderControlPanel()}
      
      {/* Responsive design matrix views */}
      <MobileOnly>
        {renderMobileView()}
      </MobileOnly>
      
      <TabletOnly>
        {renderTabletView()}
      </TabletOnly>
      
      <DesktopOnly>
        {renderDesktopView()}
      </DesktopOnly>
    </Box>
  );
};

ResponsiveDesignMatrix.propTypes = {
  designMatrix: PropTypes.arrayOf(PropTypes.object).isRequired,
  factors: PropTypes.arrayOf(PropTypes.object).isRequired,
  responses: PropTypes.arrayOf(PropTypes.object),
  designType: PropTypes.string,
  onRunSelect: PropTypes.func,
  onExport: PropTypes.func
};

ResponsiveDesignMatrix.defaultProps = {
  designType: 'Factorial',
  responses: []
};

export default ResponsiveDesignMatrix;