import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Select, 
  MenuItem, 
  TextField, 
  Button, 
  FormControl, 
  InputLabel, 
  CircularProgress,
  Alert,
  Grid,
  Divider,
  Card,
  CardContent,
  Tooltip,
  IconButton,
  Fade,
  useTheme,
  useMediaQuery,
  Chip,
  Popover
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import InfoIcon from '@mui/icons-material/Info';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import FunctionsIcon from '@mui/icons-material/Functions';
import HistoryIcon from '@mui/icons-material/History';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SchoolIcon from '@mui/icons-material/School';
import { motion } from 'framer-motion';

import EnhancedTooltip from './EnhancedTooltip';
import EducationalOverlay from './EducationalOverlay';

import DistributionPlot from './DistributionPlot';
import { useErrorHandler } from '../../utils/errorHandlers';

/**
 * ProbabilityCalculator component for calculating probabilities for distributions
 * 
 * @param {Object} props
 * @param {string} props.distributionType - Type of distribution
 * @param {Object} props.parameters - Parameters for the distribution
 * @param {Function} props.onAreaSelect - Callback when probability area is selected (for visualization)
 */
const ProbabilityCalculator = ({ 
  distributionType, 
  parameters,
  onAreaSelect
}) => {
  const handleError = useErrorHandler();
  const [probabilityType, setProbabilityType] = useState('less_than');
  const [lowerBound, setLowerBound] = useState('');
  const [upperBound, setUpperBound] = useState('');
  const [xValue, setXValue] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resultHistory, setResultHistory] = useState([]);
  const [plotConfig, setPlotConfig] = useState({
    width: 600,
    height: 300,
    showPdf: true,
    showCdf: false,
    fillArea: false,
    fillRange: [null, null],
    showGrid: true,
    margin: { top: 30, right: 30, bottom: 50, left: 60 }
  });
  
  // State for educational tooltips and overlay
  const [tooltipAnchorEl, setTooltipAnchorEl] = useState(null);
  const [tooltipContent, setTooltipContent] = useState(null);
  const [showEducationalOverlay, setShowEducationalOverlay] = useState(false);
  
  // Determine if the distribution is discrete (handling undefined distributionType)
  const isDiscrete = distributionType ? ['BINOMIAL', 'POISSON', 'GEOMETRIC', 'NEGATIVEBINOMIAL', 'HYPERGEOMETRIC'].includes(distributionType) : false;
  
  // Set default values based on distribution type and parameters
  useEffect(() => {
    let defaultX;
    
    // Default to 0 if distributionType or parameters are undefined
    if (!distributionType || !parameters) {
      defaultX = 0;
    } else {
      switch (distributionType) {
        case 'NORMAL':
          defaultX = parameters.mean !== undefined ? parameters.mean : 0;
          break;
        case 'BINOMIAL':
          defaultX = (parameters.n !== undefined && parameters.p !== undefined) ? 
            Math.round(parameters.n * parameters.p) : 0;
          break;
        case 'POISSON':
          defaultX = parameters.lambda !== undefined ? Math.round(parameters.lambda) : 0;
          break;
        case 'EXPONENTIAL':
          defaultX = parameters.rate !== undefined ? 1 / parameters.rate : 0;
          break;
        case 'UNIFORM':
          defaultX = (parameters.a !== undefined && parameters.b !== undefined) ? 
            (parameters.a + parameters.b) / 2 : 0;
          break;
        case 'GAMMA':
          defaultX = (parameters.shape !== undefined && parameters.scale !== undefined) ? 
            parameters.shape * parameters.scale : 0;
          break;
        case 'BETA':
          defaultX = (parameters.alpha !== undefined && parameters.beta !== undefined) ? 
            parameters.alpha / (parameters.alpha + parameters.beta) : 0;
          break;
        case 'LOGNORMAL':
          defaultX = parameters.mean !== undefined ? Math.exp(parameters.mean) : 0;
          break;
        case 'WEIBULL':
          defaultX = parameters.scale !== undefined ? parameters.scale : 0;
          break;
        default:
          defaultX = 0;
      }
    }
    
    setXValue(defaultX.toString());
    setLowerBound('');
    setUpperBound('');
    // Clear previous results when distribution changes
    setResult(null);
  }, [distributionType, parameters]);
  
  // Update fields based on probability type
  useEffect(() => {
    if (probabilityType === 'between') {
      // For "between", initialize lower and upper bounds around the center
      let center;
      let spread;
      
      // Default values if distributionType or parameters are undefined
      if (!distributionType || !parameters) {
        center = parseFloat(xValue) || 0;
        spread = 1;
      } else {
        switch (distributionType) {
          case 'NORMAL':
            center = parameters.mean !== undefined ? parameters.mean : 0;
            spread = parameters.std !== undefined ? parameters.std : 1;
            break;
          case 'BINOMIAL':
            if (parameters.n !== undefined && parameters.p !== undefined) {
              center = parameters.n * parameters.p;
              spread = Math.sqrt(parameters.n * parameters.p * (1 - parameters.p));
            } else {
              center = parseFloat(xValue) || 0;
              spread = 1;
            }
            break;
          case 'POISSON':
            if (parameters.lambda !== undefined) {
              center = parameters.lambda;
              spread = Math.sqrt(parameters.lambda);
            } else {
              center = parseFloat(xValue) || 0;
              spread = 1;
            }
            break;
          case 'EXPONENTIAL':
            if (parameters.rate !== undefined) {
              center = 1 / parameters.rate;
              spread = 1 / parameters.rate;
            } else {
              center = parseFloat(xValue) || 0;
              spread = 1;
            }
            break;
          case 'UNIFORM':
            if (parameters.a !== undefined && parameters.b !== undefined) {
              center = (parameters.a + parameters.b) / 2;
              spread = (parameters.b - parameters.a) / 4;
            } else {
              center = parseFloat(xValue) || 0;
              spread = 1;
            }
            break;
          default:
            center = parseFloat(xValue) || 0;
            spread = 1;
        }
      }
      
      setLowerBound((center - spread).toString());
      setUpperBound((center + spread).toString());
    }
  }, [probabilityType, distributionType, parameters, xValue]);
  
  // Educational content handlers
  const handleTooltipOpen = (event, content) => {
    setTooltipAnchorEl(event.currentTarget);
    setTooltipContent(content);
  };

  const handleTooltipClose = () => {
    setTooltipAnchorEl(null);
    setTooltipContent(null);
  };

  const handleOpenEducationalOverlay = () => {
    setShowEducationalOverlay(true);
  };
  
  const getDistributionInfo = (distributionType, params) => {
    // Handle undefined or null distributionType or params
    if (!distributionType || !params) {
      return {
        type: 'Unknown',
        notation: 'Unknown',
        description: 'Distribution information not available',
        formula: '',
        parameters: ''
      };
    }

    switch (distributionType) {
      case 'NORMAL':
        return {
          type: 'Normal',
          notation: `N(\u03bc=${params.mean !== undefined ? params.mean : '?'}, \u03c3=${params.std !== undefined ? params.std : '?'})`,
          description: 'Characterizes phenomena with symmetric variation around a mean',
          formula: 'f(x) = (1/\u03c3\u221a(2\u03c0)) * e^(-(x-\u03bc)\u00b2/(2\u03c3\u00b2))',
          parameters: `\u03bc=${params.mean !== undefined ? params.mean : '?'}, \u03c3=${params.std !== undefined ? params.std : '?'}`
        };
      
      case 'BINOMIAL':
        return {
          type: 'Binomial',
          notation: `B(n=${params.n !== undefined ? params.n : '?'}, p=${params.p !== undefined ? params.p : '?'})`,
          description: 'Models the number of successes in a fixed number of independent trials',
          formula: 'P(X = k) = (n choose k) * p^k * (1-p)^(n-k)',
          parameters: `n=${params.n !== undefined ? params.n : '?'}, p=${params.p !== undefined ? params.p : '?'}`
        };
      
      case 'POISSON':
        return {
          type: 'Poisson',
          notation: `Pois(\u03bb=${params.lambda !== undefined ? params.lambda : '?'})`,
          description: 'Models the number of events occurring in a fixed interval',
          formula: 'P(X = k) = (e^-\u03bb * \u03bb^k) / k!',
          parameters: `\u03bb=${params.lambda !== undefined ? params.lambda : '?'}`
        };
      
      case 'EXPONENTIAL':
        return {
          type: 'Exponential',
          notation: `Exp(\u03bb=${params.rate !== undefined ? params.rate : '?'})`,
          description: 'Models the time between events in a Poisson process',
          formula: 'f(x) = \u03bbe^(-\u03bbx) for x \u2265 0',
          parameters: `\u03bb=${params.rate !== undefined ? params.rate : '?'}`
        };
      
      case 'UNIFORM':
        return {
          type: 'Uniform',
          notation: `U(a=${params.a !== undefined ? params.a : '?'}, b=${params.b !== undefined ? params.b : '?'})`,
          description: 'Models an equal probability across a range of values',
          formula: 'f(x) = 1/(b-a) for a \u2264 x \u2264 b',
          parameters: `a=${params.a !== undefined ? params.a : '?'}, b=${params.b !== undefined ? params.b : '?'}`
        };
      
      case 'GAMMA':
        return {
          type: 'Gamma',
          notation: `\u0393(k=${params.shape !== undefined ? params.shape : '?'}, \u03b8=${params.scale !== undefined ? params.scale : '?'})`,
          description: 'Models waiting times or amounts that are always positive',
          formula: 'f(x) = (x^(k-1) * e^(-x/\u03b8)) / (\u03b8^k * \u0393(k))',
          parameters: `k=${params.shape !== undefined ? params.shape : '?'}, \u03b8=${params.scale !== undefined ? params.scale : '?'}`
        };
      
      case 'BETA':
        return {
          type: 'Beta',
          notation: `Beta(\u03b1=${params.alpha !== undefined ? params.alpha : '?'}, \u03b2=${params.beta !== undefined ? params.beta : '?'})`,
          description: 'Models proportions or probabilities between 0 and 1',
          formula: 'f(x) = (x^(\u03b1-1) * (1-x)^(\u03b2-1)) / B(\u03b1,\u03b2)',
          parameters: `\u03b1=${params.alpha !== undefined ? params.alpha : '?'}, \u03b2=${params.beta !== undefined ? params.beta : '?'}`
        };
      
      case 'LOGNORMAL':
        return {
          type: 'LogNormal',
          notation: `LogN(\u03bc=${params.mean !== undefined ? params.mean : '?'}, \u03c3=${params.sigma !== undefined ? params.sigma : '?'})`,
          description: 'Models positive values with skewed distribution',
          formula: 'f(x) = (1/(x\u03c3\u221a(2\u03c0))) * e^(-(ln(x)-\u03bc)\u00b2/(2\u03c3\u00b2))',
          parameters: `\u03bc=${params.mean !== undefined ? params.mean : '?'}, \u03c3=${params.sigma !== undefined ? params.sigma : '?'}`
        };
      
      case 'WEIBULL':
        return {
          type: 'Weibull',
          notation: `W(k=${params.shape !== undefined ? params.shape : '?'}, \u03bb=${params.scale !== undefined ? params.scale : '?'})`,
          description: 'Models lifetime and survival distributions',
          formula: 'f(x) = (k/\u03bb) * (x/\u03bb)^(k-1) * e^(-(x/\u03bb)^k)',
          parameters: `k=${params.shape !== undefined ? params.shape : '?'}, \u03bb=${params.scale !== undefined ? params.scale : '?'}`
        };
      
      default:
        return {
          type: distributionType,
          notation: distributionType,
          description: 'A probability distribution',
          formula: '',
          parameters: ''
        };
    }
  };

  const getDistributionDescription = (distributionType, params) => {
    const info = getDistributionInfo(distributionType, params);
    return info.notation;
  };
  
  // Calculate probability
  const calculateProbability = (type, params, probType, lower, upper, x) => {
    // This function calculates probabilities directly in the frontend for better interactivity
    // In a production application, consider using a backend API for complex calculations
    
    try {
      let probability = 0;
      
      switch (type) {
        case 'NORMAL': {
          const mean = params.mean;
          const std = params.std;
          
          if (probType === 'less_than') {
            // CDF for normal distribution
            probability = normalCDF(x, mean, std);
          } else if (probType === 'greater_than') {
            probability = 1 - normalCDF(x, mean, std);
          } else if (probType === 'exactly') {
            // For continuous distributions, exactly is approximately 0
            probability = 0;
          } else if (probType === 'between') {
            probability = normalCDF(upper, mean, std) - normalCDF(lower, mean, std);
          }
          break;
        }
        
        case 'BINOMIAL': {
          const n = params.n;
          const p = params.p;
          
          if (probType === 'less_than') {
            probability = 0;
            for (let i = 0; i < x; i++) {
              probability += binomialPMF(i, n, p);
            }
          } else if (probType === 'greater_than') {
            probability = 0;
            for (let i = Math.ceil(x); i <= n; i++) {
              probability += binomialPMF(i, n, p);
            }
          } else if (probType === 'exactly') {
            probability = binomialPMF(Math.round(x), n, p);
          } else if (probType === 'between') {
            probability = 0;
            for (let i = Math.ceil(lower); i <= Math.floor(upper); i++) {
              probability += binomialPMF(i, n, p);
            }
          }
          break;
        }
        
        case 'POISSON': {
          const lambda = params.lambda;
          
          if (probType === 'less_than') {
            probability = 0;
            for (let i = 0; i < x; i++) {
              probability += poissonPMF(i, lambda);
            }
          } else if (probType === 'greater_than') {
            probability = 0;
            // Use a reasonable upper bound for summation
            const upperLimit = lambda + 5 * Math.sqrt(lambda);
            for (let i = Math.ceil(x); i <= upperLimit; i++) {
              probability += poissonPMF(i, lambda);
            }
          } else if (probType === 'exactly') {
            probability = poissonPMF(Math.round(x), lambda);
          } else if (probType === 'between') {
            probability = 0;
            for (let i = Math.ceil(lower); i <= Math.floor(upper); i++) {
              probability += poissonPMF(i, lambda);
            }
          }
          break;
        }
        
        case 'EXPONENTIAL': {
          const rate = params.rate;
          
          if (probType === 'less_than') {
            probability = 1 - Math.exp(-rate * x);
          } else if (probType === 'greater_than') {
            probability = Math.exp(-rate * x);
          } else if (probType === 'exactly') {
            probability = 0; // For continuous distributions
          } else if (probType === 'between') {
            probability = Math.exp(-rate * lower) - Math.exp(-rate * upper);
          }
          break;
        }
        
        case 'UNIFORM': {
          const a = params.a;
          const b = params.b;
          
          if (probType === 'less_than') {
            if (x <= a) probability = 0;
            else if (x >= b) probability = 1;
            else probability = (x - a) / (b - a);
          } else if (probType === 'greater_than') {
            if (x <= a) probability = 1;
            else if (x >= b) probability = 0;
            else probability = (b - x) / (b - a);
          } else if (probType === 'exactly') {
            probability = 0; // For continuous distributions
          } else if (probType === 'between') {
            const lowerProb = lower <= a ? 0 : (lower >= b ? 1 : (lower - a) / (b - a));
            const upperProb = upper <= a ? 0 : (upper >= b ? 1 : (upper - a) / (b - a));
            probability = upperProb - lowerProb;
          }
          break;
        }
        
        default:
          throw new Error('Distribution type not supported for direct calculation');
      }
      
      return { probability };
      
    } catch (error) {
      throw new Error(`Calculation error: ${error.message}`);
    }
  };
  
  // Probability calculation functions
  const normalCDF = (x, mean, std) => {
    // Error function approximation
    const z = (x - mean) / (Math.sqrt(2) * std);
    return 0.5 * (1 + erf(z));
  };
  
  const erf = (x) => {
    // Error function approximation
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);
    
    // Constants for approximation
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    
    return sign * y;
  };
  
  const binomialPMF = (k, n, p) => {
    // Binomial PMF calculation
    if (k < 0 || k > n || p < 0 || p > 1) return 0;
    
    // Using log calculation to avoid overflow
    const logP = Math.log(p);
    const log1minusP = Math.log(1 - p);
    
    let logResult = lnCombination(n, k) + k * logP + (n - k) * log1minusP;
    return Math.exp(logResult);
  };
  
  const lnCombination = (n, k) => {
    // Log of binomial coefficient calculation
    return lnFactorial(n) - lnFactorial(k) - lnFactorial(n - k);
  };
  
  const lnFactorial = (n) => {
    // Log factorial approximation using Stirling's formula for large n
    if (n <= 1) return 0;
    
    // Use lookup table for small values
    if (n <= 20) {
      let result = 0;
      for (let i = 2; i <= n; i++) {
        result += Math.log(i);
      }
      return result;
    }
    
    // Stirling's approximation for larger values
    const x = n + 1;
    return x * Math.log(x) - x + 0.5 * Math.log(2 * Math.PI * x) + 1/(12 * x) - 1/(360 * Math.pow(x, 3));
  };
  
  const poissonPMF = (k, lambda) => {
    // Poisson PMF calculation
    if (k < 0 || lambda <= 0) return 0;
    
    // Using log calculation to avoid overflow
    const logLambda = Math.log(lambda);
    const logResult = k * logLambda - lambda - lnFactorial(k);
    return Math.exp(logResult);
  };
  
  const handleCalculate = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Determine inputs based on probability type
      let requestXValue, requestLowerBound, requestUpperBound;
      
      if (probabilityType === 'between') {
        requestLowerBound = parseFloat(lowerBound);
        requestUpperBound = parseFloat(upperBound);
        
        if (isNaN(requestLowerBound) || isNaN(requestUpperBound)) {
          throw new Error('Please enter valid lower and upper bounds');
        }
        
        if (requestLowerBound >= requestUpperBound) {
          throw new Error('Lower bound must be less than upper bound');
        }
      } else {
        requestXValue = parseFloat(xValue);
        
        if (isNaN(requestXValue)) {
          throw new Error('Please enter a valid value');
        }
      }
      
      // Calculate probability directly in the frontend
      const calcResult = calculateProbability(
        distributionType, 
        parameters, 
        probabilityType,
        requestLowerBound,
        requestUpperBound,
        requestXValue
      );
      
      setResult(calcResult);
      
      // Update plot configuration to show the probability area
      if (probabilityType === 'between') {
        setPlotConfig(prev => ({
          ...prev,
          fillArea: true,
          fillRange: [requestLowerBound, requestUpperBound],
          showCdf: false,
          showPdf: true
        }));
        
        // Notify parent component if callback provided
        if (onAreaSelect) {
          onAreaSelect([requestLowerBound, requestUpperBound]);
        }
      } else if (probabilityType === 'less_than') {
        setPlotConfig(prev => ({
          ...prev,
          fillArea: true,
          fillRange: [Number.NEGATIVE_INFINITY, requestXValue],
          showCdf: true,
          showPdf: true
        }));
        
        // Notify parent component if callback provided
        if (onAreaSelect) {
          onAreaSelect([Number.NEGATIVE_INFINITY, requestXValue]);
        }
      } else if (probabilityType === 'greater_than') {
        setPlotConfig(prev => ({
          ...prev,
          fillArea: true,
          fillRange: [requestXValue, Number.POSITIVE_INFINITY],
          showCdf: true,
          showPdf: true
        }));
        
        // Notify parent component if callback provided
        if (onAreaSelect) {
          onAreaSelect([requestXValue, Number.POSITIVE_INFINITY]);
        }
      } else if (probabilityType === 'exactly') {
        // For discrete distributions, highlight just the exact value
        if (isDiscrete) {
          setPlotConfig(prev => ({
            ...prev,
            fillArea: true,
            fillRange: [Math.floor(requestXValue), Math.ceil(requestXValue)],
            showCdf: false,
            showPdf: true
          }));
          
          // Notify parent component if callback provided
          if (onAreaSelect) {
            onAreaSelect([Math.floor(requestXValue), Math.ceil(requestXValue)]);
          }
        } else {
          // For continuous distributions, show a small interval around the value
          const epsilon = 0.1;
          setPlotConfig(prev => ({
            ...prev,
            fillArea: true,
            fillRange: [requestXValue - epsilon, requestXValue + epsilon],
            showCdf: false,
            showPdf: true
          }));
          
          // Notify parent component if callback provided
          if (onAreaSelect) {
            onAreaSelect([requestXValue - epsilon, requestXValue + epsilon]);
          }
        }
      }
      
      // Add to history
      const historyItem = {
        id: Date.now(),
        distributionType,
        parameters: { ...parameters },
        probabilityType,
        xValue: requestXValue,
        lowerBound: requestLowerBound,
        upperBound: requestUpperBound,
        probability: calcResult.probability
      };
      
      setResultHistory(prev => [historyItem, ...prev].slice(0, 10)); // Keep the 10 most recent calculations
      
    } catch (err) {
      handleError(err, {
        onOtherError: () => setError(err.message || 'Failed to calculate probability')
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Clear calculation history
  const handleClearHistory = () => {
    setResultHistory([]);
  };
  
  // Apply a calculation from history
  const handleApplyFromHistory = (item) => {
    setProbabilityType(item.probabilityType);
    
    if (item.probabilityType === 'between') {
      setLowerBound(item.lowerBound.toString());
      setUpperBound(item.upperBound.toString());
    } else {
      setXValue(item.xValue.toString());
    }
    
    // Show the probability area
    if (item.probabilityType === 'between') {
      setPlotConfig(prev => ({
        ...prev,
        fillArea: true,
        fillRange: [item.lowerBound, item.upperBound],
        showCdf: false,
        showPdf: true
      }));
    } else if (item.probabilityType === 'less_than') {
      setPlotConfig(prev => ({
        ...prev,
        fillArea: true,
        fillRange: [Number.NEGATIVE_INFINITY, item.xValue],
        showCdf: true,
        showPdf: true
      }));
    } else if (item.probabilityType === 'greater_than') {
      setPlotConfig(prev => ({
        ...prev,
        fillArea: true,
        fillRange: [item.xValue, Number.POSITIVE_INFINITY],
        showCdf: true,
        showPdf: true
      }));
    } else {
      const isHistoryDistDiscrete = ['BINOMIAL', 'POISSON', 'GEOMETRIC', 'NEGATIVEBINOMIAL', 'HYPERGEOMETRIC'].includes(item.distributionType);
      
      if (isHistoryDistDiscrete) {
        setPlotConfig(prev => ({
          ...prev,
          fillArea: true,
          fillRange: [Math.floor(item.xValue), Math.ceil(item.xValue)],
          showCdf: false,
          showPdf: true
        }));
      } else {
        const epsilon = 0.1;
        setPlotConfig(prev => ({
          ...prev,
          fillArea: true,
          fillRange: [item.xValue - epsilon, item.xValue + epsilon],
          showCdf: false,
          showPdf: true
        }));
      }
    }
    
    // Set the result
    setResult({ probability: item.probability });
  };
  
  const renderInputFields = () => {
    switch (probabilityType) {
      case 'less_than':
        return (
          <TextField
            label="Value"
            type="number"
            value={xValue}
            onChange={(e) => setXValue(e.target.value)}
            fullWidth
            variant="outlined"
            helperText="Calculate P(X < value)"
            InputProps={{
              sx: { borderRadius: 1.5 }
            }}
            sx={{ '& .MuiFormHelperText-root': { mt: 1 } }}
          />
        );
      
      case 'greater_than':
        return (
          <TextField
            label="Value"
            type="number"
            value={xValue}
            onChange={(e) => setXValue(e.target.value)}
            fullWidth
            variant="outlined"
            helperText="Calculate P(X > value)"
            InputProps={{
              sx: { borderRadius: 1.5 }
            }}
            sx={{ '& .MuiFormHelperText-root': { mt: 1 } }}
          />
        );
      
      case 'exactly':
        return (
          <TextField
            label="Value"
            type="number"
            value={xValue}
            onChange={(e) => setXValue(e.target.value)}
            fullWidth
            variant="outlined"
            helperText={isDiscrete
              ? "Calculate P(X = value)" 
              : "For continuous distributions, this is approximately zero. Consider using 'between' instead."}
            InputProps={{
              sx: { borderRadius: 1.5 }
            }}
            sx={{ '& .MuiFormHelperText-root': { mt: 1 } }}
          />
        );
      
      case 'between':
        return (
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField
              label="Lower Bound"
              type="number"
              value={lowerBound}
              onChange={(e) => setLowerBound(e.target.value)}
              fullWidth
              variant="outlined"
              InputProps={{
                sx: { borderRadius: 1.5 }
              }}
            />
            <TextField
              label="Upper Bound"
              type="number"
              value={upperBound}
              onChange={(e) => setUpperBound(e.target.value)}
              fullWidth
              variant="outlined"
              helperText="Calculate P(lower < X < upper)"
              InputProps={{
                sx: { borderRadius: 1.5 }
              }}
              sx={{ '& .MuiFormHelperText-root': { mt: 1 } }}
            />
          </Box>
        );
      
      default:
        return null;
    }
  };
  
  // Educational content for the overlay
  const educationalContent = [
    {
      title: 'Understanding Probability Distributions',
      label: 'Introduction',
      subtitle: 'Learn about probability distributions and their importance',
      content: (
        <Typography variant="body1" paragraph>
          Probability distributions describe the likelihood of different outcomes in a random experiment. They are mathematical functions that map each possible outcome to its probability of occurrence.
          <br /><br />
          Distributions come in two main types: <strong>discrete</strong> (like Binomial and Poisson) which deal with countable outcomes, and <strong>continuous</strong> (like Normal and Exponential) which deal with measurements on a continuous scale.
        </Typography>
      ),
      example: (
        <Typography variant="body2">
          For example, a Normal distribution describes many natural phenomena, such as heights of people, measurement errors, and test scores. Meanwhile, a Binomial distribution might model the number of successful sales calls out of a fixed number of attempts.
        </Typography>
      )
    },
    {
      title: 'Calculating Probabilities',
      label: 'Calculations',
      subtitle: 'How to find probabilities for different scenarios',
      content: (
        <Typography variant="body1" paragraph>
          There are several ways to calculate probabilities, depending on what you want to know:
          <ul>
            <li><strong>Less Than (CDF)</strong>: The probability that a random variable X is less than some value x.</li>
            <li><strong>Greater Than</strong>: The probability that X exceeds some value x.</li>
            <li><strong>Between</strong>: The probability that X falls within a range of values.</li>
            <li><strong>Exactly</strong>: The probability that X equals a specific value (mainly for discrete distributions).</li>
          </ul>
          For continuous distributions, we calculate probabilities using integration of the probability density function (PDF) over a range of values. For discrete distributions, we sum the probability mass function (PMF) values for the relevant outcomes.
        </Typography>
      ),
      formula: (
        <Typography variant="body2">
          For continuous distributions: P(a &lt; X &lt; b) = \u222b<sub>a</sub><sup>b</sup> f(x) dx
          <br />
          For discrete distributions: P(a &lt; X &lt; b) = \u2211<sub>a&lt;x&lt;b</sub> P(X = x)
        </Typography>
      )
    },
    {
      title: `${getDistributionInfo(distributionType, parameters).type} Distribution`,
      label: 'Current Distribution',
      subtitle: `Learn about the ${getDistributionInfo(distributionType, parameters).type} distribution and its applications`,
      content: (
        <Typography variant="body1" paragraph>
          The {getDistributionInfo(distributionType, parameters).type} distribution {getDistributionInfo(distributionType, parameters).description ? getDistributionInfo(distributionType, parameters).description.toLowerCase() : ''}.
          <br /><br />
          This distribution is commonly used in statistical analysis for modeling various real-world phenomena and making predictions based on probability.
        </Typography>
      ),
      formula: (
        <Typography variant="body2">
          {getDistributionInfo(distributionType, parameters).formula}
          <br />
          where {getDistributionInfo(distributionType, parameters).parameters}
        </Typography>
      ),
      example: (
        <Typography variant="body2">
          {!distributionType && "Select a distribution type to see specific examples."}
          {distributionType === 'NORMAL' && "For example, the heights of adult humans approximately follow a normal distribution. IQ scores are deliberately designed to follow a normal distribution with mean 100 and standard deviation 15."}
          {distributionType === 'BINOMIAL' && parameters && parameters.n !== undefined && parameters.p !== undefined && 
            `For example, if you flip a coin ${parameters.n} times with probability of heads ${parameters.p}, the number of heads follows a binomial distribution.`}
          {distributionType === 'POISSON' && parameters && parameters.lambda !== undefined && 
            `For example, the number of calls received by a call center in a 1-hour period with an average rate of ${parameters.lambda} calls per hour follows a Poisson distribution.`}
          {distributionType === 'EXPONENTIAL' && parameters && parameters.rate !== undefined && 
            `For example, the time between customer arrivals at a service desk with an average rate of ${parameters.rate} customers per minute follows an exponential distribution.`}
          {distributionType === 'UNIFORM' && parameters && parameters.a !== undefined && parameters.b !== undefined && 
            `For example, any value between ${parameters.a} and ${parameters.b} is equally likely to be observed, like a perfect die roll or random number generator.`}
          {distributionType && !['NORMAL', 'BINOMIAL', 'POISSON', 'EXPONENTIAL', 'UNIFORM'].includes(distributionType) && 
            "This distribution has specific applications in statistics and probability theory."}
        </Typography>
      )
    },
    {
      title: 'Visualizing Probabilities',
      label: 'Visualization',
      subtitle: 'How to interpret probability visualizations',
      content: (
        <Typography variant="body1" paragraph>
          Visualizations help us understand probabilities intuitively. In this calculator:
          <ul>
            <li>The <strong>curve</strong> or <strong>bars</strong> show the probability density or mass function.</li>
            <li><strong>Shaded areas</strong> represent the probability being calculated.</li>
            <li>For "Less Than" calculations, the shaded area is to the left of the value.</li>
            <li>For "Greater Than" calculations, the shaded area is to the right.</li>
            <li>For "Between" calculations, the shaded area is between the two values.</li>
          </ul>
          The total area under the curve (or sum of all bars) always equals 1, representing certainty (100% probability).
        </Typography>
      )
    }
  ];
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const calculationTypes = [
    { value: 'less_than', label: 'Less Than', description: 'P(X < value)', icon: '<' },
    { value: 'greater_than', label: 'Greater Than', description: 'P(X > value)', icon: '>' },
    { value: 'between', label: 'Between', description: 'P(a < X < b)', icon: '\u2264...\u2264' },
    { value: 'exactly', label: 'Exactly', description: `P(X = value)${!isDiscrete ? ' \u2248 0' : ''}`, icon: '=' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card 
            elevation={3} 
            sx={{ 
              borderRadius: 2,
              background: 'linear-gradient(to bottom, #ffffff, #fcfcff)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
              position: 'relative',
              overflow: 'hidden',
              height: '100%'
            }}
          >
            <CardContent>
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <FunctionsIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6" component="h2" fontWeight="bold">
                    Probability Calculator
                  </Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary" paragraph sx={{ mb: 3 }}>
                  Calculate probabilities for the current {distributionType ? distributionType.toLowerCase() : 'probability'} distribution.
                </Typography>
                
                {/* Calculation type selector with modern UI */}
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 2, 
                    mb: 3, 
                    backgroundColor: 'rgba(236, 239, 255, 0.5)',
                    borderRadius: 2
                  }}
                >
                  <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                    Calculation Type
                  </Typography>
                  
                  <Grid container spacing={1}>
                    {calculationTypes.map(type => (
                      <Grid item xs={6} sm={3} key={type.value}>
                        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                          <Button
                            variant={probabilityType === type.value ? "contained" : "outlined"}
                            onClick={() => setProbabilityType(type.value)}
                            fullWidth
                            sx={{
                              borderRadius: 2,
                              py: 1.5,
                              boxShadow: probabilityType === type.value ? 2 : 0,
                              borderColor: probabilityType === type.value ? 'primary.main' : 'divider',
                              backgroundColor: probabilityType === type.value ? 'primary.main' : 'background.paper'
                            }}
                          >
                            <Box sx={{ textAlign: 'center' }}>
                              <Box 
                                sx={{ 
                                  mb: 0.5, 
                                  fontWeight: 'bold', 
                                  fontSize: '18px',
                                  color: probabilityType === type.value ? '#fff' : 'text.primary'
                                }}
                              >
                                {type.icon}
                              </Box>
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  display: 'block',
                                  color: probabilityType === type.value ? '#fff' : 'text.secondary',
                                  fontSize: '0.7rem',
                                  lineHeight: 1.2
                                }}
                              >
                                {type.label}
                              </Typography>
                            </Box>
                          </Button>
                        </motion.div>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
                
                <motion.div
                  key={probabilityType}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: 2, 
                      mb: 3, 
                      backgroundColor: 'rgba(245, 247, 250, 0.7)',
                      borderRadius: 2,
                      borderLeft: '4px solid',
                      borderColor: 'primary.main'
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
                      Enter Parameters
                    </Typography>
                    {renderInputFields()}
                  </Paper>
                </motion.div>
                
                {error && (
                  <Alert 
                    severity="error" 
                    sx={{ 
                      mt: 2, 
                      mb: 2,
                      borderRadius: 2,
                      boxShadow: '0 2px 8px rgba(239, 83, 80, 0.15)'
                    }}
                    icon
                  >
                    {error}
                  </Alert>
                )}
                
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CalculateIcon />}
                    onClick={handleCalculate}
                    disabled={loading}
                    fullWidth
                    size="large"
                    sx={{ 
                      mt: 1,
                      py: 1.2,
                      borderRadius: 2,
                      boxShadow: '0 4px 10px rgba(25, 118, 210, 0.3)'
                    }}
                  >
                    {loading ? 'Calculating...' : 'Calculate Probability'}
                  </Button>
                </motion.div>
              </Box>
              
              {/* Results section with animations */}
              <Fade in={!!result} timeout={500}>
                <div>
                  {result && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, type: 'spring', stiffness: 100 }}
                    >
                      <Paper 
                        elevation={2} 
                        sx={{ 
                          mt: 3, 
                          p: 2, 
                          bgcolor: 'background.paper', 
                          borderRadius: 2,
                          background: 'linear-gradient(135deg, #f5f7fa 0%, #f0f4fd 100%)',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        <Box sx={{ 
                          position: 'absolute', 
                          top: 0, 
                          right: 0, 
                          width: '120px', 
                          height: '120px', 
                          background: 'radial-gradient(circle at top right, rgba(25, 118, 210, 0.1), transparent 70%)',
                          borderRadius: '0 0 0 100%',
                          zIndex: 0
                        }} />
                        
                        <Box sx={{ position: 'relative', zIndex: 1 }}>
                          <Typography 
                            variant="subtitle1" 
                            gutterBottom 
                            sx={{ 
                              display: 'flex', 
                              alignItems: 'center',
                              color: 'primary.dark',
                              fontWeight: 500
                            }}
                          >
                            <InfoIcon fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />
                            Result
                          </Typography>
                          
                          <Box sx={{ textAlign: 'center', py: 2 }}>
                            <Chip 
                              label={getHistoryTitle({ 
                                probabilityType, 
                                xValue: parseFloat(xValue), 
                                lowerBound: parseFloat(lowerBound), 
                                upperBound: parseFloat(upperBound) 
                              })}
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ mb: 1 }}
                            />
                            
                            <motion.div
                              initial={{ scale: 0.9 }}
                              animate={{ scale: 1 }}
                              transition={{ duration: 0.5, type: 'spring' }}
                            >
                              <Typography 
                                variant="h3" 
                                color="primary" 
                                align="center" 
                                sx={{ 
                                  my: 1,
                                  fontWeight: 'bold',
                                  fontSize: { xs: '2.2rem', sm: '2.5rem' }
                                }}
                              >
                                {(result.probability * 100).toFixed(6)}%
                              </Typography>
                            </motion.div>
                            
                            <Typography 
                              variant="body2" 
                              color="text.secondary"
                              align="center"
                              sx={{ maxWidth: '90%', mx: 'auto', fontSize: '0.9rem' }}
                            >
                              {getResultDescription(probabilityType, xValue, lowerBound, upperBound, result.probability, distributionType)}
                            </Typography>
                          </Box>
                        </Box>
                      </Paper>
                    </motion.div>
                  )}
                </div>
              </Fade>

              <Box sx={{ mt: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" gutterBottom fontWeight="bold">
                    Visualization
                  </Typography>
                  
                  <Chip 
                    label={getDistributionDescription(distributionType, parameters)}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </Box>
                
                {/* Only render the plot if distributionType and parameters are defined */}
                {distributionType && parameters ? (
                  <DistributionPlot 
                    type={distributionType ? distributionType.toLowerCase() : 'normal'}
                    parameters={distributionType === 'NORMAL' 
                      ? { mean: parameters.mean, sd: parameters.std }
                      : parameters
                    }
                    plotConfig={{
                      ...plotConfig,
                      width: isMobile ? 350 : 600, // Responsive width
                      height: isMobile ? 250 : 300 // Responsive height
                    }}
                  />
                ) : (
                  <Box 
                    sx={{ 
                      height: isMobile ? 250 : 300,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px dashed',
                      borderColor: 'divider',
                      borderRadius: 2,
                      bgcolor: 'rgba(245, 247, 250, 0.7)'
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Distribution parameters not available
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card 
            elevation={3} 
            sx={{ 
              height: '100%',
              borderRadius: 2,
              background: 'linear-gradient(to bottom, #ffffff, #fcfcff)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <HistoryIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6" fontWeight="bold">
                    Calculation History
                  </Typography>
                  <Tooltip title="Learn about probability calculations">
                    <IconButton 
                      size="small" 
                      color="primary" 
                      sx={{ ml: 1 }} 
                      onClick={handleOpenEducationalOverlay}
                    >
                      <SchoolIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                
                {resultHistory.length > 0 && (
                  <Tooltip title="Clear history">
                    <motion.div whileHover={{ rotate: 10 }} whileTap={{ scale: 0.9 }}>
                      <IconButton 
                        onClick={handleClearHistory} 
                        size="small"
                        sx={{ 
                          bgcolor: 'error.light', 
                          color: 'error.main',
                          '&:hover': { bgcolor: 'error.light' }
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </motion.div>
                  </Tooltip>
                )}
              </Box>
              
              {resultHistory.length === 0 ? (
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    py: 4, 
                    px: 2, 
                    textAlign: 'center',
                    backgroundColor: 'rgb(250, 250, 252)',
                    borderRadius: 2,
                    borderStyle: 'dashed'
                  }}
                >
                  <HistoryIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    No calculations yet. Results will appear here.
                  </Typography>
                </Paper>
              ) : (
                <Paper
                  elevation={0}
                  sx={{ 
                    maxHeight: isMobile ? 300 : 400, 
                    overflow: 'auto',
                    bgcolor: 'rgba(245, 247, 250, 0.5)',
                    borderRadius: 2,
                    p: 1
                  }}
                >
                  {resultHistory.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                    >
                      <Paper 
                        elevation={1} 
                        sx={{ 
                          my: 1, 
                          p: 1.5,
                          borderRadius: 1.5,
                          '&:hover': { boxShadow: '0 4px 8px rgba(0,0,0,0.1)' },
                          transition: 'box-shadow 0.2s ease-in-out'
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="subtitle2" fontWeight="medium">
                              {getHistoryTitle(item)}
                            </Typography>
                            
                            <Typography variant="caption" color="text.secondary" display="block">
                              {getDistributionDescription(item.distributionType, item.parameters)}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Chip
                              label={`${(item.probability * 100).toFixed(4)}%`}
                              size="small"
                              color="primary"
                              sx={{ mr: 1, fontWeight: 'bold' }}
                            />
                            
                            <Tooltip title="Show in calculator">
                              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleApplyFromHistory(item)}
                                  color="primary"
                                  sx={{ backgroundColor: 'rgba(25, 118, 210, 0.1)' }}
                                >
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              </motion.div>
                            </Tooltip>
                          </Box>
                        </Box>
                      </Paper>
                    </motion.div>
                  ))}
                </Paper>
              )}
              
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  About Probability Calculations
                </Typography>
                
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 2.5, 
                    borderRadius: 2, 
                    backgroundColor: 'rgba(236, 239, 255, 0.3)' 
                  }}
                >
                  <Typography variant="body2" paragraph>
                    This calculator lets you find probabilities for the current distribution with different methods:
                  </Typography>
                  
                  <Grid container spacing={2}>
                    {calculationTypes.map((type) => (
                      <Grid item xs={12} sm={6} key={type.value}>
                        <Paper 
                          elevation={0} 
                          sx={{ 
                            p: 1.5, 
                            bgcolor: 'white', 
                            borderRadius: 2, 
                            height: '100%',
                            border: '1px solid',
                            borderColor: 'divider'
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Chip 
                              label={type.icon} 
                              size="small" 
                              color="primary" 
                              sx={{ mr: 1, fontWeight: 'bold', minWidth: 32 }} 
                            />
                            <Typography variant="subtitle2" fontWeight="bold">
                              {type.label}
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {type.description.includes('PMF') ? 'Use for discrete distributions only' : type.description}
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                  
                  <Box sx={{ mt: 2, p: 1.5, bgcolor: 'rgba(25, 118, 210, 0.05)', borderRadius: 2 }}>
                    <Typography variant="body2" color="primary.dark" sx={{ fontStyle: 'italic' }}>
                      The visualizations help you see the probability areas directly on the distribution curve.
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Tooltips */}
      <Popover
        open={Boolean(tooltipAnchorEl)}
        anchorEl={tooltipAnchorEl}
        onClose={handleTooltipClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        slotProps={{
          paper: {
            sx: { mt: 1, backgroundColor: 'transparent', boxShadow: 'none' }
          }
        }}
      >
        {tooltipContent && (
          <EnhancedTooltip 
            title={tooltipContent.title} 
            content={tooltipContent.content}
            {...(tooltipContent.sections && {
              content: (
                <Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', opacity: 0.9, mb: 1 }}>
                    {tooltipContent.content}
                  </Typography>
                  {tooltipContent.sections.map((section, index) => (
                    <Box key={index} sx={{ mb: index < tooltipContent.sections.length - 1 ? 1 : 0 }}>
                      <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#fff', display: 'block' }}>
                        {section.title}:
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block', ml: 1, fontSize: '0.75rem' }}>
                        {section.content}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )
            })}
          />
        )}
      </Popover>

      {/* Educational Overlay */}
      <EducationalOverlay
        open={showEducationalOverlay}
        onClose={() => setShowEducationalOverlay(false)}
        title="Understanding Probability Distributions"
        content={educationalContent}
        distribution={getDistributionInfo(distributionType, parameters)}
      />
    </motion.div>
  );
};

// Helper functions for formatting text
const getResultDescription = (probabilityType, xValue, lowerBound, upperBound, probability, distributionType) => {
  const isDiscrete = ['BINOMIAL', 'POISSON', 'GEOMETRIC', 'NEGATIVEBINOMIAL', 'HYPERGEOMETRIC'].includes(distributionType);
  
  switch (probabilityType) {
    case 'less_than':
      return `The probability that a random variable from this distribution is less than ${xValue} is ${(probability * 100).toFixed(6)}%.`;
    
    case 'greater_than':
      return `The probability that a random variable from this distribution is greater than ${xValue} is ${(probability * 100).toFixed(6)}%.`;
    
    case 'exactly':
      if (isDiscrete) {
        return `The probability that a random variable from this distribution equals exactly ${xValue} is ${(probability * 100).toFixed(6)}%.`;
      } else {
        return `For continuous distributions, the probability of exactly ${xValue} is theoretically zero. Consider using 'between' for a small interval around ${xValue}.`;
      }
    
    case 'between':
      return `The probability that a random variable from this distribution is between ${lowerBound} and ${upperBound} is ${(probability * 100).toFixed(6)}%.`;
    
    default:
      return '';
  }
};

const getHistoryTitle = (item) => {
  switch (item.probabilityType) {
    case 'less_than':
      return `P(X < ${item.xValue})`;
    
    case 'greater_than':
      return `P(X > ${item.xValue})`;
    
    case 'exactly':
      return `P(X = ${item.xValue})`;
    
    case 'between':
      return `P(${item.lowerBound} < X < ${item.upperBound})`;
    
    default:
      return '';
  }
};

export default ProbabilityCalculator;