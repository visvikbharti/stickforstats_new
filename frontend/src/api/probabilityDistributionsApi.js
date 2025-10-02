import axios from 'axios';
import jStat from 'jstat';

const API_BASE_URL = '/api/v1/probability-distributions';

// Demo mode flag - use fallback implementations only when API calls fail
const DEMO_MODE = process.env.REACT_APP_DEMO_MODE === 'true' || process.env.REACT_APP_DISABLE_API === 'true';

// Helper to generate a unique ID
const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

// Mock data for projects
const demoProjects = [
  {
    id: 'proj-1',
    name: 'Clinical Trial Analysis',
    description: 'Statistical analysis for new drug efficacy',
    created_at: '2025-05-10T14:32:11Z',
    updated_at: '2025-05-12T09:15:43Z'
  },
  {
    id: 'proj-2',
    name: 'Manufacturing Quality Control',
    description: 'QC analysis for production line',
    created_at: '2025-05-11T10:24:18Z',
    updated_at: '2025-05-11T16:45:22Z'
  },
  {
    id: 'proj-3',
    name: 'Customer Wait Time Analysis',
    description: 'Service time optimization study',
    created_at: '2025-05-12T08:12:33Z',
    updated_at: '2025-05-12T08:12:33Z'
  }
];

// Mock data for distributions
const demoDistributions = {
  'proj-1': [
    {
      id: 'dist-1',
      project: 'proj-1',
      name: 'Control Group',
      description: 'Placebo treatment results',
      distribution_type: 'NORMAL',
      parameters: { mean: 5.2, std: 1.3 },
      created_at: '2025-05-10T15:30:22Z',
      updated_at: '2025-05-10T15:30:22Z'
    },
    {
      id: 'dist-2',
      project: 'proj-1',
      name: 'Treatment Group',
      description: 'Drug treatment results',
      distribution_type: 'NORMAL',
      parameters: { mean: 7.8, std: 1.1 },
      created_at: '2025-05-10T15:31:44Z',
      updated_at: '2025-05-10T15:31:44Z'
    }
  ],
  'proj-2': [
    {
      id: 'dist-3',
      project: 'proj-2',
      name: 'Defect Rate',
      description: 'Manufacturing defects per batch',
      distribution_type: 'POISSON',
      parameters: { lambda: 2.3 },
      created_at: '2025-05-11T11:12:53Z',
      updated_at: '2025-05-11T11:12:53Z'
    }
  ],
  'proj-3': [
    {
      id: 'dist-4',
      project: 'proj-3',
      name: 'Service Time',
      description: 'Customer service time in minutes',
      distribution_type: 'EXPONENTIAL',
      parameters: { rate: 0.25 },
      created_at: '2025-05-12T08:15:31Z',
      updated_at: '2025-05-12T08:15:31Z'
    }
  ]
};

// Implementation functions for statistical calculations
const calculateNormalPdf = (x, params) => {
  return jStat.normal.pdf(x, params.mean, params.std);
};

const calculateNormalCdf = (x, params) => {
  return jStat.normal.cdf(x, params.mean, params.std);
};

const calculatePoissonPmf = (x, params) => {
  return jStat.poisson.pdf(x, params.lambda);
};

const calculatePoissonCdf = (x, params) => {
  return jStat.poisson.cdf(x, params.lambda);
};

const calculateExponentialPdf = (x, params) => {
  return jStat.exponential.pdf(x, params.rate);
};

const calculateExponentialCdf = (x, params) => {
  return jStat.exponential.cdf(x, params.rate);
};

const calculateBinomialPmf = (x, params) => {
  return jStat.binomial.pdf(x, params.n, params.p);
};

const calculateBinomialCdf = (x, params) => {
  return jStat.binomial.cdf(x, params.n, params.p);
};

// Map distribution types to their PDF/PMF calculation functions
const pdfFunctions = {
  NORMAL: calculateNormalPdf,
  POISSON: calculatePoissonPmf,
  EXPONENTIAL: calculateExponentialPdf,
  BINOMIAL: calculateBinomialPmf
};

// Map distribution types to their CDF calculation functions
const cdfFunctions = {
  NORMAL: calculateNormalCdf,
  POISSON: calculatePoissonCdf,
  EXPONENTIAL: calculateExponentialCdf,
  BINOMIAL: calculateBinomialCdf
};

// Project-related API calls
export const fetchDistributionProjects = async () => {
  if (DEMO_MODE) {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
    return { results: demoProjects };
  }
  
  try {
    const response = await axios.get(`${API_BASE_URL}/projects/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching distribution projects:', error);
    if (DEMO_MODE) {
      console.log('Using fallback demo data for projects');
      return { results: demoProjects };
    }
    throw error;
  }
};

export const fetchDistributionProject = async (projectId) => {
  if (DEMO_MODE) {
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay
    const project = demoProjects.find(p => p.id === projectId);
    if (project) {
      return project;
    }
    throw new Error(`Project with ID ${projectId} not found`);
  }
  
  try {
    const response = await axios.get(`${API_BASE_URL}/projects/${projectId}/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching distribution project ${projectId}:`, error);
    if (DEMO_MODE) {
      console.log(`Using fallback demo data for project ${projectId}`);
      const project = demoProjects.find(p => p.id === projectId);
      if (project) {
        return project;
      }
    }
    throw error;
  }
};

export const createDistributionProject = async (projectData) => {
  if (DEMO_MODE) {
    await new Promise(resolve => setTimeout(resolve, 600)); // Simulate network delay
    const newProject = {
      id: generateId(),
      name: projectData.name,
      description: projectData.description || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    demoProjects.push(newProject);
    demoDistributions[newProject.id] = [];
    return newProject;
  }
  
  try {
    const response = await axios.post(`${API_BASE_URL}/projects/`, projectData);
    return response.data;
  } catch (error) {
    console.error('Error creating distribution project:', error);
    if (DEMO_MODE) {
      console.log('Using fallback demo mode for project creation');
      const newProject = {
        id: generateId(),
        name: projectData.name,
        description: projectData.description || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      demoProjects.push(newProject);
      demoDistributions[newProject.id] = [];
      return newProject;
    }
    throw error;
  }
};

export const updateDistributionProject = async (projectId, projectData) => {
  if (DEMO_MODE) {
    await new Promise(resolve => setTimeout(resolve, 400)); // Simulate network delay
    const projectIndex = demoProjects.findIndex(p => p.id === projectId);
    if (projectIndex !== -1) {
      const updatedProject = {
        ...demoProjects[projectIndex],
        name: projectData.name || demoProjects[projectIndex].name,
        description: projectData.description || demoProjects[projectIndex].description,
        updated_at: new Date().toISOString()
      };
      demoProjects[projectIndex] = updatedProject;
      return updatedProject;
    }
    throw new Error(`Project with ID ${projectId} not found`);
  }
  
  try {
    const response = await axios.put(`${API_BASE_URL}/projects/${projectId}/`, projectData);
    return response.data;
  } catch (error) {
    console.error(`Error updating distribution project ${projectId}:`, error);
    if (DEMO_MODE) {
      console.log(`Using fallback demo mode for project ${projectId} update`);
      const projectIndex = demoProjects.findIndex(p => p.id === projectId);
      if (projectIndex !== -1) {
        const updatedProject = {
          ...demoProjects[projectIndex],
          name: projectData.name || demoProjects[projectIndex].name,
          description: projectData.description || demoProjects[projectIndex].description,
          updated_at: new Date().toISOString()
        };
        demoProjects[projectIndex] = updatedProject;
        return updatedProject;
      }
    }
    throw error;
  }
};

export const deleteDistributionProject = async (projectId) => {
  if (DEMO_MODE) {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
    const projectIndex = demoProjects.findIndex(p => p.id === projectId);
    if (projectIndex !== -1) {
      demoProjects.splice(projectIndex, 1);
      delete demoDistributions[projectId];
      return true;
    }
    throw new Error(`Project with ID ${projectId} not found`);
  }
  
  try {
    await axios.delete(`${API_BASE_URL}/projects/${projectId}/`);
    return true;
  } catch (error) {
    console.error(`Error deleting distribution project ${projectId}:`, error);
    if (DEMO_MODE) {
      console.log(`Using fallback demo mode for project ${projectId} deletion`);
      const projectIndex = demoProjects.findIndex(p => p.id === projectId);
      if (projectIndex !== -1) {
        demoProjects.splice(projectIndex, 1);
        delete demoDistributions[projectId];
        return true;
      }
    }
    throw error;
  }
};

export const duplicateDistributionProject = async (projectId) => {
  if (DEMO_MODE) {
    await new Promise(resolve => setTimeout(resolve, 700)); // Simulate network delay
    const project = demoProjects.find(p => p.id === projectId);
    if (project) {
      const newProject = {
        id: generateId(),
        name: `${project.name} (Copy)`,
        description: project.description,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      demoProjects.push(newProject);
      
      // Duplicate distributions
      if (demoDistributions[projectId]) {
        demoDistributions[newProject.id] = demoDistributions[projectId].map(dist => ({
          ...dist,
          id: generateId(),
          project: newProject.id,
          name: `${dist.name} (Copy)`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
      } else {
        demoDistributions[newProject.id] = [];
      }
      
      return newProject;
    }
    throw new Error(`Project with ID ${projectId} not found`);
  }
  
  try {
    const response = await axios.post(`${API_BASE_URL}/projects/${projectId}/duplicate/`);
    return response.data;
  } catch (error) {
    console.error(`Error duplicating distribution project ${projectId}:`, error);
    if (DEMO_MODE) {
      console.log(`Using fallback demo mode for project ${projectId} duplication`);
      const project = demoProjects.find(p => p.id === projectId);
      if (project) {
        const newProject = {
          id: generateId(),
          name: `${project.name} (Copy)`,
          description: project.description,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        demoProjects.push(newProject);
        
        // Duplicate distributions
        if (demoDistributions[projectId]) {
          demoDistributions[newProject.id] = demoDistributions[projectId].map(dist => ({
            ...dist,
            id: generateId(),
            project: newProject.id,
            name: `${dist.name} (Copy)`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));
        } else {
          demoDistributions[newProject.id] = [];
        }
        
        return newProject;
      }
    }
    throw error;
  }
};

// Distribution-related API calls
export const fetchDistributions = async (projectId) => {
  if (DEMO_MODE) {
    await new Promise(resolve => setTimeout(resolve, 400)); // Simulate network delay
    return { results: demoDistributions[projectId] || [] };
  }
  
  try {
    const response = await axios.get(`${API_BASE_URL}/distributions/`, {
      params: { project: projectId }
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching distributions for project ${projectId}:`, error);
    if (DEMO_MODE) {
      console.log(`Using fallback demo data for distributions in project ${projectId}`);
      return { results: demoDistributions[projectId] || [] };
    }
    throw error;
  }
};

export const fetchDistribution = async (distributionId) => {
  if (DEMO_MODE) {
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay
    // Search through all distributions to find the matching ID
    for (const projectId in demoDistributions) {
      const distribution = demoDistributions[projectId].find(d => d.id === distributionId);
      if (distribution) {
        return distribution;
      }
    }
    throw new Error(`Distribution with ID ${distributionId} not found`);
  }
  
  try {
    const response = await axios.get(`${API_BASE_URL}/distributions/${distributionId}/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching distribution ${distributionId}:`, error);
    if (DEMO_MODE) {
      console.log(`Using fallback demo data for distribution ${distributionId}`);
      // Search through all distributions to find the matching ID
      for (const projectId in demoDistributions) {
        const distribution = demoDistributions[projectId].find(d => d.id === distributionId);
        if (distribution) {
          return distribution;
        }
      }
    }
    throw error;
  }
};

// Alias for fetchDistribution for compatibility
export const getDistributionData = fetchDistribution;

export const createDistribution = async (distributionData) => {
  if (DEMO_MODE) {
    await new Promise(resolve => setTimeout(resolve, 600)); // Simulate network delay
    const newDistribution = {
      id: generateId(),
      project: distributionData.project,
      name: distributionData.name,
      description: distributionData.description || '',
      distribution_type: distributionData.distribution_type,
      parameters: distributionData.parameters,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    if (!demoDistributions[distributionData.project]) {
      demoDistributions[distributionData.project] = [];
    }
    
    demoDistributions[distributionData.project].push(newDistribution);
    return newDistribution;
  }
  
  try {
    const response = await axios.post(`${API_BASE_URL}/distributions/`, distributionData);
    return response.data;
  } catch (error) {
    console.error('Error creating distribution:', error);
    if (DEMO_MODE) {
      console.log('Using fallback demo mode for distribution creation');
      const newDistribution = {
        id: generateId(),
        project: distributionData.project,
        name: distributionData.name,
        description: distributionData.description || '',
        distribution_type: distributionData.distribution_type,
        parameters: distributionData.parameters,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      if (!demoDistributions[distributionData.project]) {
        demoDistributions[distributionData.project] = [];
      }
      
      demoDistributions[distributionData.project].push(newDistribution);
      return newDistribution;
    }
    throw error;
  }
};

export const updateDistribution = async (distributionId, distributionData) => {
  if (DEMO_MODE) {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
    // Search through all distributions to find the matching ID
    for (const projectId in demoDistributions) {
      const distIndex = demoDistributions[projectId].findIndex(d => d.id === distributionId);
      if (distIndex !== -1) {
        const updatedDistribution = {
          ...demoDistributions[projectId][distIndex],
          name: distributionData.name || demoDistributions[projectId][distIndex].name,
          description: distributionData.description || demoDistributions[projectId][distIndex].description,
          distribution_type: distributionData.distribution_type || demoDistributions[projectId][distIndex].distribution_type,
          parameters: distributionData.parameters || demoDistributions[projectId][distIndex].parameters,
          updated_at: new Date().toISOString()
        };
        demoDistributions[projectId][distIndex] = updatedDistribution;
        return updatedDistribution;
      }
    }
    throw new Error(`Distribution with ID ${distributionId} not found`);
  }
  
  try {
    const response = await axios.put(`${API_BASE_URL}/distributions/${distributionId}/`, distributionData);
    return response.data;
  } catch (error) {
    console.error(`Error updating distribution ${distributionId}:`, error);
    if (DEMO_MODE) {
      console.log(`Using fallback demo mode for distribution ${distributionId} update`);
      // Search through all distributions to find the matching ID
      for (const projectId in demoDistributions) {
        const distIndex = demoDistributions[projectId].findIndex(d => d.id === distributionId);
        if (distIndex !== -1) {
          const updatedDistribution = {
            ...demoDistributions[projectId][distIndex],
            name: distributionData.name || demoDistributions[projectId][distIndex].name,
            description: distributionData.description || demoDistributions[projectId][distIndex].description,
            distribution_type: distributionData.distribution_type || demoDistributions[projectId][distIndex].distribution_type,
            parameters: distributionData.parameters || demoDistributions[projectId][distIndex].parameters,
            updated_at: new Date().toISOString()
          };
          demoDistributions[projectId][distIndex] = updatedDistribution;
          return updatedDistribution;
        }
      }
    }
    throw error;
  }
};

export const deleteDistribution = async (distributionId) => {
  if (DEMO_MODE) {
    await new Promise(resolve => setTimeout(resolve, 400)); // Simulate network delay
    // Search through all distributions to find the matching ID
    for (const projectId in demoDistributions) {
      const distIndex = demoDistributions[projectId].findIndex(d => d.id === distributionId);
      if (distIndex !== -1) {
        demoDistributions[projectId].splice(distIndex, 1);
        return true;
      }
    }
    throw new Error(`Distribution with ID ${distributionId} not found`);
  }
  
  try {
    await axios.delete(`${API_BASE_URL}/distributions/${distributionId}/`);
    return true;
  } catch (error) {
    console.error(`Error deleting distribution ${distributionId}:`, error);
    if (DEMO_MODE) {
      console.log(`Using fallback demo mode for distribution ${distributionId} deletion`);
      // Search through all distributions to find the matching ID
      for (const projectId in demoDistributions) {
        const distIndex = demoDistributions[projectId].findIndex(d => d.id === distributionId);
        if (distIndex !== -1) {
          demoDistributions[projectId].splice(distIndex, 1);
          return true;
        }
      }
    }
    throw error;
  }
};

// Distribution calculation API calls
export const calculatePmfPdf = async (distributionType, parameters, xValues) => {
  if (DEMO_MODE) {
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay
    
    const pdfFunction = pdfFunctions[distributionType];
    if (!pdfFunction) {
      throw new Error(`Unsupported distribution type: ${distributionType}`);
    }
    
    const results = xValues.map(x => ({
      x: x,
      y: pdfFunction(x, parameters)
    }));
    
    return {
      distribution_type: distributionType,
      parameters,
      results
    };
  }
  
  try {
    const response = await axios.post(`${API_BASE_URL}/utilities/calculate-pmf-pdf/`, {
      distribution_type: distributionType,
      parameters,
      x_values: xValues
    });
    return response.data;
  } catch (error) {
    console.error('Error calculating PMF/PDF:', error);
    if (DEMO_MODE) {
      console.log('Using fallback demo mode for PMF/PDF calculation');
      
      const pdfFunction = pdfFunctions[distributionType];
      if (!pdfFunction) {
        throw new Error(`Unsupported distribution type: ${distributionType}`);
      }
      
      const results = xValues.map(x => ({
        x: x,
        y: pdfFunction(x, parameters)
      }));
      
      return {
        distribution_type: distributionType,
        parameters,
        results
      };
    }
    throw error;
  }
};

export const calculateCdf = async (distributionType, parameters, xValues) => {
  if (DEMO_MODE) {
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay
    
    const cdfFunction = cdfFunctions[distributionType];
    if (!cdfFunction) {
      throw new Error(`Unsupported distribution type: ${distributionType}`);
    }
    
    const results = xValues.map(x => ({
      x: x,
      y: cdfFunction(x, parameters)
    }));
    
    return {
      distribution_type: distributionType,
      parameters,
      results
    };
  }
  
  try {
    const response = await axios.post(`${API_BASE_URL}/utilities/calculate-cdf/`, {
      distribution_type: distributionType,
      parameters,
      x_values: xValues
    });
    return response.data;
  } catch (error) {
    console.error('Error calculating CDF:', error);
    if (DEMO_MODE) {
      console.log('Using fallback demo mode for CDF calculation');
      
      const cdfFunction = cdfFunctions[distributionType];
      if (!cdfFunction) {
        throw new Error(`Unsupported distribution type: ${distributionType}`);
      }
      
      const results = xValues.map(x => ({
        x: x,
        y: cdfFunction(x, parameters)
      }));
      
      return {
        distribution_type: distributionType,
        parameters,
        results
      };
    }
    throw error;
  }
};

export const calculateProbability = async (distributionType, parameters, probabilityType, lowerBound, upperBound, xValue) => {
  if (DEMO_MODE) {
    await new Promise(resolve => setTimeout(resolve, 400)); // Simulate network delay
    
    const cdfFunction = cdfFunctions[distributionType];
    if (!cdfFunction) {
      throw new Error(`Unsupported distribution type: ${distributionType}`);
    }
    
    let probability;
    switch (probabilityType) {
      case 'LESS_THAN':
        probability = cdfFunction(xValue, parameters);
        break;
      case 'GREATER_THAN':
        probability = 1 - cdfFunction(xValue, parameters);
        break;
      case 'BETWEEN':
        probability = cdfFunction(upperBound, parameters) - cdfFunction(lowerBound, parameters);
        break;
      case 'EQUAL_TO':
        // For continuous distributions, P(X = x) is 0, so we use the PDF instead
        if (['NORMAL', 'EXPONENTIAL'].includes(distributionType)) {
          probability = pdfFunctions[distributionType](xValue, parameters) * 0.01; // Small delta
        } else {
          probability = pdfFunctions[distributionType](xValue, parameters);
        }
        break;
      default:
        throw new Error(`Unsupported probability type: ${probabilityType}`);
    }
    
    return {
      distribution_type: distributionType,
      parameters,
      probability_type: probabilityType,
      lower_bound: lowerBound,
      upper_bound: upperBound,
      x_value: xValue,
      probability
    };
  }
  
  try {
    const response = await axios.post(`${API_BASE_URL}/utilities/calculate-probability/`, {
      distribution_type: distributionType,
      parameters,
      probability_type: probabilityType,
      lower_bound: lowerBound,
      upper_bound: upperBound,
      x_value: xValue
    });
    return response.data;
  } catch (error) {
    console.error('Error calculating probability:', error);
    if (DEMO_MODE) {
      console.log('Using fallback demo mode for probability calculation');
      
      const cdfFunction = cdfFunctions[distributionType];
      if (!cdfFunction) {
        throw new Error(`Unsupported distribution type: ${distributionType}`);
      }
      
      let probability;
      switch (probabilityType) {
        case 'LESS_THAN':
          probability = cdfFunction(xValue, parameters);
          break;
        case 'GREATER_THAN':
          probability = 1 - cdfFunction(xValue, parameters);
          break;
        case 'BETWEEN':
          probability = cdfFunction(upperBound, parameters) - cdfFunction(lowerBound, parameters);
          break;
        case 'EQUAL_TO':
          // For continuous distributions, P(X = x) is 0, so we use the PDF instead
          if (['NORMAL', 'EXPONENTIAL'].includes(distributionType)) {
            probability = pdfFunctions[distributionType](xValue, parameters) * 0.01; // Small delta
          } else {
            probability = pdfFunctions[distributionType](xValue, parameters);
          }
          break;
        default:
          throw new Error(`Unsupported probability type: ${probabilityType}`);
      }
      
      return {
        distribution_type: distributionType,
        parameters,
        probability_type: probabilityType,
        lower_bound: lowerBound,
        upper_bound: upperBound,
        x_value: xValue,
        probability
      };
    }
    throw error;
  }
};

export const generateRandomSample = async (distributionType, parameters, sampleSize, seed) => {
  // Validate inputs
  if (!distributionType) {
    throw new Error('Distribution type is required');
  }
  
  if (!parameters) {
    throw new Error('Parameters are required');
  }
  
  if (!sampleSize || isNaN(sampleSize) || sampleSize <= 0) {
    throw new Error('Sample size must be a positive number');
  }
  
  if (DEMO_MODE) {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
    
    // Generate random sample based on distribution type
    let samples = [];
    
    // Set random seed if provided
    if (seed) {
      Math.seedrandom(seed);
    }
    
    switch (distributionType) {
      case 'NORMAL':
        // Validate parameters
        if (parameters.mean === undefined || parameters.std === undefined) {
          throw new Error('Normal distribution requires mean and std parameters');
        }
        // Box-Muller transform for normal distribution
        for (let i = 0; i < sampleSize; i++) {
          const u1 = Math.random();
          const u2 = Math.random();
          const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
          samples.push(parameters.mean + parameters.std * z0);
        }
        break;
      
      case 'POISSON':
        // Validate parameters
        if (parameters.lambda === undefined) {
          throw new Error('Poisson distribution requires lambda parameter');
        }
        // Simulate Poisson using jStat
        for (let i = 0; i < sampleSize; i++) {
          let L = Math.exp(-parameters.lambda);
          let k = 0;
          let p = 1;
          
          do {
            k++;
            p *= Math.random();
          } while (p > L);
          
          samples.push(k - 1);
        }
        break;
      
      case 'EXPONENTIAL':
        // Validate parameters
        if (parameters.rate === undefined) {
          throw new Error('Exponential distribution requires rate parameter');
        }
        // Inverse transform for exponential
        for (let i = 0; i < sampleSize; i++) {
          samples.push(-Math.log(Math.random()) / parameters.rate);
        }
        break;
      
      case 'BINOMIAL':
        // Validate parameters
        if (parameters.n === undefined || parameters.p === undefined) {
          throw new Error('Binomial distribution requires n and p parameters');
        }
        // Simulate binomial trials
        for (let i = 0; i < sampleSize; i++) {
          let successes = 0;
          for (let j = 0; j < parameters.n; j++) {
            if (Math.random() < parameters.p) {
              successes++;
            }
          }
          samples.push(successes);
        }
        break;
      
      default:
        throw new Error(`Unsupported distribution type: ${distributionType}`);
    }
    
    return {
      distribution_type: distributionType,
      parameters,
      sample_size: sampleSize,
      sample: samples  // Use 'sample' consistently
    };
  }
  
  try {
    const response = await axios.post(`${API_BASE_URL}/utilities/generate-random-sample/`, {
      distribution_type: distributionType,
      parameters,
      sample_size: sampleSize,
      seed
    });
    
    // Normalize the response to ensure consistent keys
    const data = response.data;
    
    // If the API returns 'samples' but not 'sample', normalize it
    if (data.samples && !data.sample) {
      data.sample = data.samples;
    }
    
    // If still no 'sample' key, throw an error
    if (!data.sample) {
      throw new Error('API response missing sample data');
    }
    
    return data;
  } catch (error) {
    console.error('Error generating random sample:', error);
    if (DEMO_MODE) {
      console.log('Using fallback demo mode for random sample generation');
      
      // Generate random sample based on distribution type
      let samples = [];
      
      // Set random seed if provided
      if (seed) {
        Math.seedrandom(seed);
      }
      
      switch (distributionType) {
        case 'NORMAL':
          // Validate parameters
          if (parameters.mean === undefined || parameters.std === undefined) {
            throw new Error('Normal distribution requires mean and std parameters');
          }
          // Box-Muller transform for normal distribution
          for (let i = 0; i < sampleSize; i++) {
            const u1 = Math.random();
            const u2 = Math.random();
            const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
            samples.push(parameters.mean + parameters.std * z0);
          }
          break;
        
        case 'POISSON':
          // Validate parameters
          if (parameters.lambda === undefined) {
            throw new Error('Poisson distribution requires lambda parameter');
          }
          // Simulate Poisson using jStat
          for (let i = 0; i < sampleSize; i++) {
            let L = Math.exp(-parameters.lambda);
            let k = 0;
            let p = 1;
            
            do {
              k++;
              p *= Math.random();
            } while (p > L);
            
            samples.push(k - 1);
          }
          break;
        
        case 'EXPONENTIAL':
          // Validate parameters
          if (parameters.rate === undefined) {
            throw new Error('Exponential distribution requires rate parameter');
          }
          // Inverse transform for exponential
          for (let i = 0; i < sampleSize; i++) {
            samples.push(-Math.log(Math.random()) / parameters.rate);
          }
          break;
        
        case 'BINOMIAL':
          // Validate parameters
          if (parameters.n === undefined || parameters.p === undefined) {
            throw new Error('Binomial distribution requires n and p parameters');
          }
          // Simulate binomial trials
          for (let i = 0; i < sampleSize; i++) {
            let successes = 0;
            for (let j = 0; j < parameters.n; j++) {
              if (Math.random() < parameters.p) {
                successes++;
              }
            }
            samples.push(successes);
          }
          break;
        
        default:
          throw new Error(`Unsupported distribution type: ${distributionType}`);
      }
      
      return {
        distribution_type: distributionType,
        parameters,
        sample_size: sampleSize,
        sample: samples  // Use 'sample' consistently
      };
    }
    throw error;
  }
};

// Binomial approximation API calls
export const compareBinomialApproximations = async (n, p, approximationTypes = ['POISSON', 'NORMAL'], save = false, projectId = null) => {
  if (DEMO_MODE) {
    await new Promise(resolve => setTimeout(resolve, 600)); // Simulate network delay
    
    // Calculate exact binomial probabilities
    const xValues = Array.from({ length: n + 1 }, (_, i) => i);
    const binomialProbs = xValues.map(x => jStat.binomial.pdf(x, n, p));
    
    // Calculate approximations
    const results = {
      binomial: {
        params: { n, p },
        probabilities: binomialProbs.map((prob, i) => ({ x: i, y: prob }))
      }
    };
    
    if (approximationTypes.includes('POISSON')) {
      const lambda = n * p;
      const poissonProbs = xValues.map(x => jStat.poisson.pdf(x, lambda));
      results.poisson = {
        params: { lambda },
        probabilities: poissonProbs.map((prob, i) => ({ x: i, y: prob }))
      };
    }
    
    if (approximationTypes.includes('NORMAL')) {
      const mean = n * p;
      const std = Math.sqrt(n * p * (1 - p));
      const normalProbs = xValues.map(x => {
        // Continuity correction for normal approximation
        return jStat.normal.pdf(x + 0.5, mean, std) - jStat.normal.pdf(x - 0.5, mean, std);
      });
      results.normal = {
        params: { mean, std },
        probabilities: normalProbs.map((prob, i) => ({ x: i, y: prob }))
      };
    }
    
    return {
      n,
      p,
      approximation_types: approximationTypes,
      results
    };
  }
  
  try {
    const response = await axios.post(`${API_BASE_URL}/utilities/binomial-approximation/`, {
      n,
      p,
      approximation_types: approximationTypes,
      save,
      project_id: projectId
    });
    return response.data;
  } catch (error) {
    console.error('Error comparing binomial approximations:', error);
    if (DEMO_MODE) {
      console.log('Using fallback demo mode for binomial approximation comparison');
      
      // Calculate exact binomial probabilities
      const xValues = Array.from({ length: n + 1 }, (_, i) => i);
      const binomialProbs = xValues.map(x => jStat.binomial.pdf(x, n, p));
      
      // Calculate approximations
      const results = {
        binomial: {
          params: { n, p },
          probabilities: binomialProbs.map((prob, i) => ({ x: i, y: prob }))
        }
      };
      
      if (approximationTypes.includes('POISSON')) {
        const lambda = n * p;
        const poissonProbs = xValues.map(x => jStat.poisson.pdf(x, lambda));
        results.poisson = {
          params: { lambda },
          probabilities: poissonProbs.map((prob, i) => ({ x: i, y: prob }))
        };
      }
      
      if (approximationTypes.includes('NORMAL')) {
        const mean = n * p;
        const std = Math.sqrt(n * p * (1 - p));
        const normalProbs = xValues.map(x => {
          // Continuity correction for normal approximation
          return jStat.normal.pdf(x + 0.5, mean, std) - jStat.normal.pdf(x - 0.5, mean, std);
        });
        results.normal = {
          params: { mean, std },
          probabilities: normalProbs.map((prob, i) => ({ x: i, y: prob }))
        };
      }
      
      return {
        n,
        p,
        approximation_types: approximationTypes,
        results
      };
    }
    throw error;
  }
};

// Add the missing fitDistribution function
// Handle both API-based and direct data fitting
export const fitDistribution = async (
  projectIdOrData, 
  dataIdOrDistributions = ['NORMAL', 'GAMMA', 'LOGNORMAL'], 
  saveToProject = false, 
  projectId = null,
  dataName = '',
  dataDescription = ''
) => {
  // Check if the first parameter is an array (direct data) or string/number (project ID)
  const isDirectData = Array.isArray(projectIdOrData);
  
  if (DEMO_MODE) {
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay
    
    if (isDirectData) {
      // Calculate basic stats for more realistic demo data
      const data = projectIdOrData;
      const n = data.length;
      const sum = data.reduce((a, b) => a + b, 0);
      const mean = sum / n;
      const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
      const std = Math.sqrt(variance);
      
      // Generate random but somewhat realistic parameters for different distributions
      return {
        fitted_distributions: [
          {
            distribution_type: 'NORMAL',
            parameters: { mean, std },
            goodness_of_fit: { aic: 100 + Math.random() * 50, bic: 110 + Math.random() * 50, ks_pvalue: 0.3 + Math.random() * 0.6 },
            x_values: Array.from({ length: 100 }, (_, i) => mean - 3 * std + i * 6 * std / 99),
            pdf_values: Array.from({ length: 100 }, (_, i) => {
              const x = mean - 3 * std + i * 6 * std / 99;
              return Math.exp(-Math.pow(x - mean, 2) / (2 * std * std)) / (std * Math.sqrt(2 * Math.PI));
            })
          },
          {
            distribution_type: 'GAMMA',
            parameters: { shape: 2 + Math.random() * 3, scale: std * std / mean },
            goodness_of_fit: { aic: 120 + Math.random() * 50, bic: 130 + Math.random() * 50, ks_pvalue: 0.2 + Math.random() * 0.5 },
            x_values: Array.from({ length: 100 }, (_, i) => i * mean * 3 / 99),
            pdf_values: Array.from({ length: 100 }, (_, i) => {
              const x = i * mean * 3 / 99;
              const shape = 2 + Math.random() * 3;
              const scale = std * std / mean;
              return Math.pow(x, shape - 1) * Math.exp(-x / scale) / 
                     (Math.pow(scale, shape) * (function(x) {
                       let res = 1;
                       for (let i = 2; i < x; i++) res *= i;
                       return res;
                     })(shape));
            })
          },
          {
            distribution_type: 'LOGNORMAL',
            parameters: { mu: Math.log(mean * mean / Math.sqrt(variance + mean * mean)), sigma: Math.sqrt(Math.log(1 + variance / (mean * mean))) },
            goodness_of_fit: { aic: 140 + Math.random() * 50, bic: 150 + Math.random() * 50, ks_pvalue: 0.1 + Math.random() * 0.4 },
            x_values: Array.from({ length: 100 }, (_, i) => i * mean * 3 / 99),
            pdf_values: Array.from({ length: 100 }, (_, i) => {
              const x = i * mean * 3 / 99;
              if (x <= 0) return 0;
              const mu = Math.log(mean * mean / Math.sqrt(variance + mean * mean));
              const sigma = Math.sqrt(Math.log(1 + variance / (mean * mean)));
              return Math.exp(-Math.pow(Math.log(x) - mu, 2) / (2 * sigma * sigma)) / (x * sigma * Math.sqrt(2 * Math.PI));
            })
          }
        ]
      };
    }
    
    // API call mode demo
    return {
      best_fit: 'normal',
      fits: {
        normal: { params: { mean: 5.2, std: 1.3 }, goodness_of_fit: 0.95 },
        gamma: { params: { shape: 2.1, scale: 2.5 }, goodness_of_fit: 0.87 },
        lognormal: { params: { mu: 1.6, sigma: 0.4 }, goodness_of_fit: 0.82 }
      }
    };
  }
  
  try {
    if (isDirectData) {
      const data = projectIdOrData;
      const distributions = dataIdOrDistributions;
      
      // Direct data fitting API call
      const response = await axios.post(`${API_BASE_URL}/utilities/fit-distribution/`, {
        data,
        distributions: distributions.map(d => d.toUpperCase()),
        save_to_project: saveToProject,
        project_id: projectId,
        name: dataName,
        description: dataDescription
      });
      return response.data;
    } else {
      // Project/dataset based API call
      const projectId = projectIdOrData;
      const dataId = dataIdOrDistributions;
      const distributions = Array.isArray(dataId) ? dataId : ['NORMAL', 'GAMMA', 'LOGNORMAL'];
      
      const response = await axios.post(`${API_BASE_URL}/fit-distribution/`, {
        project_id: projectId,
        data_id: Array.isArray(dataId) ? null : dataId,
        distributions: distributions.map(d => d.toUpperCase())
      });
      return response.data;
    }
  } catch (error) {
    console.error('Error fitting distributions:', error);
    
    if (DEMO_MODE) {
      if (isDirectData) {
        // Calculate basic stats for more realistic demo data
        const data = projectIdOrData;
        const n = data.length;
        const sum = data.reduce((a, b) => a + b, 0);
        const mean = sum / n;
        const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
        const std = Math.sqrt(variance);
        
        return {
          fitted_distributions: [
            {
              distribution_type: 'NORMAL',
              parameters: { mean, std },
              goodness_of_fit: { aic: 100 + Math.random() * 50, bic: 110 + Math.random() * 50, ks_pvalue: 0.3 + Math.random() * 0.6 }
            },
            {
              distribution_type: 'GAMMA',
              parameters: { shape: 2 + Math.random() * 3, scale: std * std / mean },
              goodness_of_fit: { aic: 120 + Math.random() * 50, bic: 130 + Math.random() * 50, ks_pvalue: 0.2 + Math.random() * 0.5 }
            },
            {
              distribution_type: 'LOGNORMAL',
              parameters: { mu: Math.log(mean * mean / Math.sqrt(variance + mean * mean)), sigma: Math.sqrt(Math.log(1 + variance / (mean * mean))) },
              goodness_of_fit: { aic: 140 + Math.random() * 50, bic: 150 + Math.random() * 50, ks_pvalue: 0.1 + Math.random() * 0.4 }
            }
          ]
        };
      }
      
      // API call mode demo
      return {
        best_fit: 'normal',
        fits: {
          normal: { params: { mean: 5.2, std: 1.3 }, goodness_of_fit: 0.95 },
          gamma: { params: { shape: 2.1, scale: 2.5 }, goodness_of_fit: 0.87 },
          lognormal: { params: { mu: 1.6, sigma: 0.4 }, goodness_of_fit: 0.82 }
        }
      };
    }
    throw error;
  }
};

// All exports are already done via named exports