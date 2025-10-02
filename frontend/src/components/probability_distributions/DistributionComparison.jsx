import React, { useState, useEffect, useRef } from 'react';
import { 
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Divider,
  CircularProgress,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useSnackbar } from 'notistack';

import { Line } from 'react-chartjs-2';
import { MathJax } from 'better-react-mathjax';

import DistributionSelector from './DistributionSelector';
import DistributionParameters from './DistributionParameters';
import { calculatePmfPdf, calculateCdf } from '../../api/probabilityDistributionsApi';

const DistributionComparison = ({ projectId }) => {
  const [distributions, setDistributions] = useState([
    { 
      id: 1, 
      type: 'NORMAL', 
      parameters: { mean: 0, std: 1 },
      color: 'rgba(54, 162, 235, 1)',
      name: 'Distribution 1'
    }
  ]);
  const [nextId, setNextId] = useState(2);
  const [plotData, setPlotData] = useState(null);
  const [plotType, setPlotType] = useState('PDF_PMF');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showLegend, setShowLegend] = useState(true);
  const [showComparison, setShowComparison] = useState(false);
  
  const chartRef = useRef(null);
  const { enqueueSnackbar } = useSnackbar();
  
  // List of colors for different distributions
  const colors = [
    'rgba(54, 162, 235, 1)',
    'rgba(255, 99, 132, 1)',
    'rgba(75, 192, 192, 1)',
    'rgba(255, 159, 64, 1)',
    'rgba(153, 102, 255, 1)',
    'rgba(255, 205, 86, 1)',
    'rgba(201, 203, 207, 1)',
    'rgba(255, 99, 71, 1)',
    'rgba(46, 139, 87, 1)',
    'rgba(106, 90, 205, 1)'
  ];
  
  // Add a new distribution
  const addDistribution = () => {
    if (distributions.length >= 5) {
      enqueueSnackbar('Maximum of 5 distributions allowed for comparison', { variant: 'warning' });
      return;
    }
    
    const newDistribution = {
      id: nextId,
      type: 'NORMAL',
      parameters: { mean: 0, std: 1 },
      color: colors[distributions.length % colors.length],
      name: `Distribution ${nextId}`
    };
    
    setDistributions([...distributions, newDistribution]);
    setNextId(nextId + 1);
  };
  
  // Remove a distribution
  const removeDistribution = (id) => {
    if (distributions.length <= 1) {
      enqueueSnackbar('At least one distribution is required', { variant: 'info' });
      return;
    }
    
    setDistributions(distributions.filter(dist => dist.id !== id));
  };
  
  // Update distribution type
  const handleDistributionTypeChange = (id, newType) => {
    setDistributions(distributions.map(dist => {
      if (dist.id === id) {
        // Set default parameters based on the new type
        let newParams = {};
        switch (newType) {
          case 'NORMAL':
            newParams = { mean: 0, std: 1 };
            break;
          case 'BINOMIAL':
            newParams = { n: 10, p: 0.5 };
            break;
          case 'POISSON':
            newParams = { lambda: 5 };
            break;
          case 'EXPONENTIAL':
            newParams = { rate: 1 };
            break;
          case 'UNIFORM':
            newParams = { a: 0, b: 1 };
            break;
          case 'GAMMA':
            newParams = { shape: 2, scale: 1 };
            break;
          case 'BETA':
            newParams = { alpha: 2, beta: 2 };
            break;
          default:
            newParams = {};
        }
        
        return {
          ...dist,
          type: newType,
          parameters: newParams
        };
      }
      return dist;
    }));
  };
  
  // Update distribution parameters
  const handleParameterChange = (id, paramName, value) => {
    setDistributions(distributions.map(dist => {
      if (dist.id === id) {
        return {
          ...dist,
          parameters: {
            ...dist.parameters,
            [paramName]: value
          }
        };
      }
      return dist;
    }));
  };
  
  // Update distribution name
  const handleNameChange = (id, newName) => {
    setDistributions(distributions.map(dist => {
      if (dist.id === id) {
        return {
          ...dist,
          name: newName
        };
      }
      return dist;
    }));
  };
  
  // Toggle plot type between PDF/PMF and CDF
  const handlePlotTypeChange = () => {
    setPlotType(plotType === 'PDF_PMF' ? 'CDF' : 'PDF_PMF');
  };
  
  // Generate x-values that cover all distributions
  const generateXValues = () => {
    // Determine min and max values based on all distributions
    let min = Infinity;
    let max = -Infinity;
    
    distributions.forEach(dist => {
      const { type, parameters } = dist;
      
      let distMin, distMax;
      
      switch (type) {
        case 'NORMAL':
          distMin = parameters.mean - 4 * parameters.std;
          distMax = parameters.mean + 4 * parameters.std;
          break;
        
        case 'BINOMIAL':
          distMin = 0;
          distMax = parameters.n;
          break;
        
        case 'POISSON':
          distMin = 0;
          distMax = Math.max(20, parameters.lambda * 3);
          break;
        
        case 'EXPONENTIAL':
          distMin = 0;
          distMax = 5 / parameters.rate;
          break;
        
        case 'UNIFORM':
          distMin = parameters.a - 0.2 * (parameters.b - parameters.a);
          distMax = parameters.b + 0.2 * (parameters.b - parameters.a);
          break;
        
        case 'GAMMA':
          distMin = 0;
          distMax = parameters.shape * parameters.scale * 3;
          break;
        
        case 'BETA':
          distMin = 0;
          distMax = 1;
          break;
        
        default:
          distMin = -5;
          distMax = 5;
      }
      
      min = Math.min(min, distMin);
      max = Math.max(max, distMax);
    });
    
    // Generate points
    const count = 200;
    const step = (max - min) / (count - 1);
    
    // Check if any distributions are discrete
    const hasDiscrete = distributions.some(dist => 
      ['BINOMIAL', 'POISSON', 'GEOMETRIC', 'NEGATIVEBINOMIAL', 'HYPERGEOMETRIC'].includes(dist.type)
    );
    
    // For mixed distributions (discrete and continuous), we'll use a regular grid
    // If all are discrete, we'll use integer values
    if (hasDiscrete && distributions.every(dist => 
      ['BINOMIAL', 'POISSON', 'GEOMETRIC', 'NEGATIVEBINOMIAL', 'HYPERGEOMETRIC'].includes(dist.type)
    )) {
      return Array.from({ length: Math.ceil(max - min) + 1 }, (_, i) => Math.floor(min) + i);
    }
    
    return Array.from({ length: count }, (_, i) => min + i * step);
  };
  
  // Fetch data for all distributions
  const fetchDistributionsData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const xValues = generateXValues();
      
      // Fetch data for each distribution
      const results = await Promise.all(distributions.map(async dist => {
        const { type, parameters, color, name } = dist;
        
        // Fetch PDF/PMF or CDF based on plot type
        const result = plotType === 'PDF_PMF'
          ? await calculatePmfPdf(type, parameters, xValues)
          : await calculateCdf(type, parameters, xValues);
        
        return {
          ...dist,
          xValues: result.x_values,
          yValues: plotType === 'PDF_PMF' ? result.pmf_pdf_values : result.cdf_values
        };
      }));
      
      // Prepare chart data
      const datasets = results.map(result => ({
        label: result.name,
        data: result.xValues.map((x, i) => ({
          x,
          y: result.yValues[i]
        })),
        borderColor: result.color,
        backgroundColor: result.color.replace('1)', '0.2)'),
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        tension: 0.1
      }));
      
      setPlotData({
        datasets
      });
      
    } catch (err) {
      console.error('Error fetching distribution data:', err);
      setError('Failed to calculate distribution values');
      enqueueSnackbar('Error calculating distribution values', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch data when distributions or plot type changes
  useEffect(() => {
    fetchDistributionsData();
  }, [distributions, plotType]);
  
  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      x: {
        type: 'linear',
        title: {
          display: true,
          text: 'Value',
        },
      },
      y: {
        title: {
          display: true,
          text: plotType === 'PDF_PMF' 
            ? 'Probability Density/Mass Function'
            : 'Cumulative Distribution Function',
        },
        min: 0,
        max: plotType === 'CDF' ? 1.05 : undefined,
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          title: function(context) {
            return `Value: ${parseFloat(context[0].parsed.x).toFixed(4)}`;
          },
          label: function(context) {
            return `${context.dataset.label}: ${parseFloat(context.parsed.y).toFixed(6)}`;
          }
        }
      },
      legend: {
        display: showLegend,
        position: 'top',
      },
      title: {
        display: true,
        text: plotType === 'PDF_PMF' 
          ? 'Distribution Comparison - PDF/PMF' 
          : 'Distribution Comparison - CDF',
      },
    },
  };
  
  // Calculate summary statistics
  const calculateStats = () => {
    return distributions.map(dist => {
      const { type, parameters, name } = dist;
      
      let mean, variance, median, mode;
      
      switch (type) {
        case 'NORMAL':
          mean = parameters.mean;
          variance = Math.pow(parameters.std, 2);
          median = parameters.mean;
          mode = parameters.mean;
          break;
        
        case 'BINOMIAL':
          mean = parameters.n * parameters.p;
          variance = parameters.n * parameters.p * (1 - parameters.p);
          // Approximate median for binomial
          median = Math.floor(parameters.n * parameters.p + 0.5);
          mode = Math.floor((parameters.n + 1) * parameters.p);
          break;
        
        case 'POISSON':
          mean = parameters.lambda;
          variance = parameters.lambda;
          // Approximate median for Poisson
          median = Math.floor(parameters.lambda + 1/3 - 0.02/parameters.lambda);
          mode = Math.floor(parameters.lambda);
          break;
        
        case 'EXPONENTIAL':
          mean = 1 / parameters.rate;
          variance = 1 / Math.pow(parameters.rate, 2);
          median = Math.log(2) / parameters.rate;
          mode = 0;
          break;
        
        case 'UNIFORM':
          mean = (parameters.a + parameters.b) / 2;
          variance = Math.pow(parameters.b - parameters.a, 2) / 12;
          median = mean;
          mode = 'N/A';
          break;
        
        case 'GAMMA':
          mean = parameters.shape * parameters.scale;
          variance = parameters.shape * Math.pow(parameters.scale, 2);
          // Approximate median for gamma
          median = mean;
          mode = parameters.shape > 1 ? (parameters.shape - 1) * parameters.scale : 0;
          break;
        
        case 'BETA':
          mean = parameters.alpha / (parameters.alpha + parameters.beta);
          variance = (parameters.alpha * parameters.beta) / 
            (Math.pow(parameters.alpha + parameters.beta, 2) * (parameters.alpha + parameters.beta + 1));
          // Mode for beta
          if (parameters.alpha > 1 && parameters.beta > 1) {
            mode = (parameters.alpha - 1) / (parameters.alpha + parameters.beta - 2);
          } else if (parameters.alpha === 1 && parameters.beta === 1) {
            mode = 'Uniform';
          } else if (parameters.alpha < 1 && parameters.beta < 1) {
            mode = 'Bimodal (0,1)';
          } else if (parameters.alpha <= 1) {
            mode = 0;
          } else if (parameters.beta <= 1) {
            mode = 1;
          }
          median = mean; // Approximation
          break;
        
        default:
          mean = variance = median = mode = 'N/A';
      }
      
      return {
        name,
        type,
        mean: typeof mean === 'number' ? mean.toFixed(4) : mean,
        variance: typeof variance === 'number' ? variance.toFixed(4) : variance,
        stdDev: typeof variance === 'number' ? Math.sqrt(variance).toFixed(4) : 'N/A',
        median: typeof median === 'number' ? median.toFixed(4) : median,
        mode: typeof mode === 'number' ? mode.toFixed(4) : mode,
      };
    });
  };
  
  const statsData = calculateStats();
  
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Distribution Comparison
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1">
                Distributions
              </Typography>
              <Button 
                startIcon={<AddIcon />} 
                variant="outlined" 
                size="small"
                onClick={addDistribution}
              >
                Add
              </Button>
            </Box>
            
            {distributions.map((dist, index) => (
              <Box key={dist.id} sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography 
                    variant="subtitle2" 
                    sx={{ borderLeft: `4px solid ${dist.color}`, pl: 1 }}
                  >
                    {dist.name}
                  </Typography>
                  
                  <IconButton 
                    size="small" 
                    onClick={() => removeDistribution(dist.id)}
                    disabled={distributions.length <= 1}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <DistributionSelector 
                    selectedType={dist.type} 
                    onTypeChange={(type) => handleDistributionTypeChange(dist.id, type)} 
                  />
                </Box>
                
                <Box>
                  <DistributionParameters 
                    distributionType={dist.type}
                    parameters={dist.parameters}
                    onParameterChange={(paramName, value) => handleParameterChange(dist.id, paramName, value)}
                  />
                </Box>
                
                {index < distributions.length - 1 && (
                  <Divider sx={{ my: 2 }} />
                )}
              </Box>
            ))}
          </Paper>
          
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Visualization Options
              </Typography>
              
              <FormControlLabel
                control={
                  <Switch 
                    checked={plotType === 'CDF'} 
                    onChange={handlePlotTypeChange}
                  />
                }
                label={plotType === 'CDF' ? 'Show CDF' : 'Show PDF/PMF'}
              />
              
              <FormControlLabel
                control={
                  <Switch 
                    checked={showLegend} 
                    onChange={(e) => setShowLegend(e.target.checked)}
                  />
                }
                label="Show Legend"
              />
              
              <FormControlLabel
                control={
                  <Switch 
                    checked={showComparison} 
                    onChange={(e) => setShowComparison(e.target.checked)}
                  />
                }
                label="Show Statistics Comparison"
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: 400, position: 'relative' }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Alert severity="error">{error}</Alert>
              </Box>
            ) : plotData ? (
              <Line data={plotData} options={chartOptions} ref={chartRef} />
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Typography variant="body2" color="text.secondary">
                  No data available
                </Typography>
              </Box>
            )}
          </Paper>
          
          {showComparison && (
            <Paper sx={{ p: 2, mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Statistical Comparison
              </Typography>
              
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Distribution</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell align="right">Mean</TableCell>
                      <TableCell align="right">Std Dev</TableCell>
                      <TableCell align="right">Variance</TableCell>
                      <TableCell align="right">Median</TableCell>
                      <TableCell align="right">Mode</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {statsData.map((row) => (
                      <TableRow key={row.name}>
                        <TableCell component="th" scope="row">{row.name}</TableCell>
                        <TableCell>{row.type}</TableCell>
                        <TableCell align="right">{row.mean}</TableCell>
                        <TableCell align="right">{row.stdDev}</TableCell>
                        <TableCell align="right">{row.variance}</TableCell>
                        <TableCell align="right">{row.median}</TableCell>
                        <TableCell align="right">{row.mode}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Interpretation
                </Typography>
                <Typography variant="body2">
                  {getComparisonInterpretation(distributions, statsData)}
                </Typography>
              </Box>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

// Helper function to generate interpretation text based on the distributions being compared
const getComparisonInterpretation = (distributions, statsData) => {
  if (distributions.length === 1) {
    return `This chart shows a single ${distributions[0].type.toLowerCase()} distribution. Adjust parameters to see how they affect the shape.`;
  }
  
  if (distributions.length === 2) {
    const dist1 = distributions[0];
    const dist2 = distributions[1];
    const stats1 = statsData[0];
    const stats2 = statsData[1];
    
    if (dist1.type === dist2.type) {
      return `Comparing two ${dist1.type.toLowerCase()} distributions with different parameters. The mean of the first distribution is ${stats1.mean} compared to ${stats2.mean} for the second distribution, while the standard deviations are ${stats1.stdDev} and ${stats2.stdDev} respectively.`;
    } else {
      return `Comparing a ${dist1.type.toLowerCase()} distribution with a ${dist2.type.toLowerCase()} distribution. These distributions have different shapes and properties. The ${dist1.type.toLowerCase()} has a mean of ${stats1.mean} and standard deviation of ${stats1.stdDev}, while the ${dist2.type.toLowerCase()} has a mean of ${stats2.mean} and standard deviation of ${stats2.stdDev}.`;
    }
  }
  
  return `Comparing ${distributions.length} different distributions. Look at the statistical summary table to compare their properties in detail.`;
};

export default DistributionComparison;