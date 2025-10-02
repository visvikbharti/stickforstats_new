import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import './EnvironmentCapture.scss';

// Environment categories
const EnvironmentCategories = {
  SYSTEM: {
    name: 'System Information',
    icon: '💻',
    items: [
      'Operating System',
      'OS Version',
      'Architecture',
      'CPU Model',
      'CPU Cores',
      'Total Memory',
      'Available Memory',
      'Hostname',
      'User',
      'Timezone'
    ]
  },
  RUNTIME: {
    name: 'Runtime Environment',
    icon: '⚙️',
    items: [
      'Node.js Version',
      'NPM Version',
      'Python Version',
      'R Version',
      'Java Version',
      'Browser',
      'Browser Version'
    ]
  },
  PACKAGES: {
    name: 'Package Dependencies',
    icon: '📦',
    items: [
      'Production Dependencies',
      'Development Dependencies',
      'Python Packages',
      'R Packages',
      'System Libraries'
    ]
  },
  VARIABLES: {
    name: 'Environment Variables',
    icon: '🔧',
    items: [
      'PATH',
      'NODE_ENV',
      'PYTHONPATH',
      'R_HOME',
      'JAVA_HOME',
      'Custom Variables'
    ]
  },
  HARDWARE: {
    name: 'Hardware Configuration',
    icon: '🖥️',
    items: [
      'GPU Model',
      'GPU Memory',
      'CUDA Version',
      'Storage Type',
      'Network Interface'
    ]
  }
};

// Capture levels
const CaptureLevels = {
  MINIMAL: {
    name: 'Minimal',
    description: 'Essential system info only',
    categories: ['SYSTEM']
  },
  STANDARD: {
    name: 'Standard',
    description: 'System and runtime info',
    categories: ['SYSTEM', 'RUNTIME']
  },
  COMPREHENSIVE: {
    name: 'Comprehensive',
    description: 'All environment details',
    categories: ['SYSTEM', 'RUNTIME', 'PACKAGES', 'VARIABLES']
  },
  FULL: {
    name: 'Full',
    description: 'Everything including hardware',
    categories: ['SYSTEM', 'RUNTIME', 'PACKAGES', 'VARIABLES', 'HARDWARE']
  }
};

const EnvironmentCapture = () => {
  const dispatch = useDispatch();
  
  // State management
  const [captureLevel, setCaptureLevel] = useState('STANDARD');
  const [currentEnvironment, setCurrentEnvironment] = useState({});
  const [savedEnvironments, setSavedEnvironments] = useState([]);
  const [compareEnvironment, setCompareEnvironment] = useState(null);
  const [differences, setDifferences] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState(['SYSTEM', 'RUNTIME']);
  const [environmentTags, setEnvironmentTags] = useState([]);
  const [captureHistory, setCaptureHistory] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [exportFormat, setExportFormat] = useState('json');
  
  // Capture system information
  const captureSystemInfo = useCallback(() => {
    const info = {};
    
    // Browser/client-side system detection
    const platform = navigator.platform;
    const userAgent = navigator.userAgent;
    
    // Parse user agent for OS info
    let os = 'Unknown';
    let osVersion = '';
    
    if (userAgent.indexOf('Win') !== -1) {
      os = 'Windows';
      if (userAgent.indexOf('Windows NT 10.0') !== -1) osVersion = '10/11';
      else if (userAgent.indexOf('Windows NT 6.3') !== -1) osVersion = '8.1';
      else if (userAgent.indexOf('Windows NT 6.2') !== -1) osVersion = '8';
    } else if (userAgent.indexOf('Mac') !== -1) {
      os = 'macOS';
      const match = userAgent.match(/Mac OS X ([\d_]+)/);
      if (match) osVersion = match[1].replace(/_/g, '.');
    } else if (userAgent.indexOf('Linux') !== -1) {
      os = 'Linux';
    }
    
    info['Operating System'] = os;
    info['OS Version'] = osVersion;
    info['Platform'] = platform;
    info['Architecture'] = navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} cores` : 'Unknown';
    info['User Agent'] = userAgent;
    info['Language'] = navigator.language;
    info['Timezone'] = Intl.DateTimeFormat().resolvedOptions().timeZone;
    info['Screen Resolution'] = `${window.screen.width}x${window.screen.height}`;
    info['Color Depth'] = `${window.screen.colorDepth} bits`;
    info['Pixel Ratio'] = window.devicePixelRatio;
    info['Online Status'] = navigator.onLine ? 'Online' : 'Offline';
    info['Cookies Enabled'] = navigator.cookieEnabled;
    info['Memory'] = navigator.deviceMemory ? `${navigator.deviceMemory} GB` : 'Unknown';
    
    return info;
  }, []);
  
  // Capture runtime information
  const captureRuntimeInfo = useCallback(() => {
    const info = {};
    
    // Browser information
    const userAgent = navigator.userAgent;
    let browser = 'Unknown';
    let browserVersion = '';
    
    if (userAgent.indexOf('Chrome') !== -1) {
      browser = 'Chrome';
      browserVersion = userAgent.match(/Chrome\/([\d.]+)/)?.[1] || '';
    } else if (userAgent.indexOf('Firefox') !== -1) {
      browser = 'Firefox';
      browserVersion = userAgent.match(/Firefox\/([\d.]+)/)?.[1] || '';
    } else if (userAgent.indexOf('Safari') !== -1) {
      browser = 'Safari';
      browserVersion = userAgent.match(/Version\/([\d.]+)/)?.[1] || '';
    } else if (userAgent.indexOf('Edge') !== -1) {
      browser = 'Edge';
      browserVersion = userAgent.match(/Edge\/([\d.]+)/)?.[1] || '';
    }
    
    info['Browser'] = browser;
    info['Browser Version'] = browserVersion;
    info['JavaScript Engine'] = 'V8/SpiderMonkey/JavaScriptCore';
    info['React Version'] = React.version;
    info['Redux Version'] = '4.x'; // Would need to import from package.json
    info['Node Environment'] = process.env.NODE_ENV || 'development';
    info['Build Time'] = new Date().toISOString();
    
    // WebGL capabilities
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      info['WebGL Version'] = gl.getParameter(gl.VERSION);
      info['WebGL Vendor'] = gl.getParameter(gl.VENDOR);
      info['WebGL Renderer'] = gl.getParameter(gl.RENDERER);
    }
    
    return info;
  }, []);
  
  // Capture package information
  const capturePackageInfo = useCallback(() => {
    const info = {};
    
    // This would normally read from package.json
    // For demonstration, using mock data structure
    info['React'] = '18.2.0';
    info['Redux'] = '4.2.1';
    info['React-Redux'] = '8.1.3';
    info['D3.js'] = '7.8.5';
    info['Lodash'] = '4.17.21';
    info['Axios'] = '1.6.0';
    
    return info;
  }, []);
  
  // Capture environment variables (limited in browser)
  const captureEnvironmentVariables = useCallback(() => {
    const info = {};
    
    // Browser environment has limited access to env vars
    info['NODE_ENV'] = process.env.NODE_ENV || 'Not set';
    info['PUBLIC_URL'] = process.env.PUBLIC_URL || 'Not set';
    info['Location'] = window.location.href;
    info['Protocol'] = window.location.protocol;
    info['Host'] = window.location.host;
    info['Port'] = window.location.port || 'Default';
    
    return info;
  }, []);
  
  // Capture hardware information
  const captureHardwareInfo = useCallback(() => {
    const info = {};
    
    // Limited hardware info available in browser
    info['CPU Cores'] = navigator.hardwareConcurrency || 'Unknown';
    info['Device Memory'] = navigator.deviceMemory ? `${navigator.deviceMemory} GB` : 'Unknown';
    info['Max Touch Points'] = navigator.maxTouchPoints;
    info['Connection Type'] = navigator.connection?.effectiveType || 'Unknown';
    info['Connection Speed'] = navigator.connection?.downlink ? `${navigator.connection.downlink} Mbps` : 'Unknown';
    
    // GPU info via WebGL
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        info['GPU Vendor'] = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        info['GPU Renderer'] = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      }
    }
    
    return info;
  }, []);
  
  // Perform comprehensive environment capture
  const captureEnvironment = useCallback(async () => {
    setIsCapturing(true);
    
    try {
      const environment = {
        id: `env_${Date.now()}`,
        timestamp: new Date().toISOString(),
        level: captureLevel,
        tags: environmentTags,
        categories: {}
      };
      
      const levelConfig = CaptureLevels[captureLevel];
      
      // Capture based on selected level
      if (levelConfig.categories.includes('SYSTEM')) {
        environment.categories.SYSTEM = captureSystemInfo();
      }
      
      if (levelConfig.categories.includes('RUNTIME')) {
        environment.categories.RUNTIME = captureRuntimeInfo();
      }
      
      if (levelConfig.categories.includes('PACKAGES')) {
        environment.categories.PACKAGES = capturePackageInfo();
      }
      
      if (levelConfig.categories.includes('VARIABLES')) {
        environment.categories.VARIABLES = captureEnvironmentVariables();
      }
      
      if (levelConfig.categories.includes('HARDWARE')) {
        environment.categories.HARDWARE = captureHardwareInfo();
      }
      
      // Generate fingerprint
      const envString = JSON.stringify(environment.categories);
      const encoder = new TextEncoder();
      const data = encoder.encode(envString);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      environment.fingerprint = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      setCurrentEnvironment(environment);
      
      // Add to history
      setCaptureHistory(prev => [...prev, {
        timestamp: environment.timestamp,
        level: captureLevel,
        fingerprint: environment.fingerprint.substring(0, 8),
        tags: environmentTags.join(', ')
      }]);
      
    } catch (error) {
      console.error('Environment capture failed:', error);
    } finally {
      setIsCapturing(false);
    }
  }, [captureLevel, environmentTags, captureSystemInfo, captureRuntimeInfo, 
      capturePackageInfo, captureEnvironmentVariables, captureHardwareInfo]);
  
  // Compare two environments
  const compareEnvironments = useCallback((env1, env2) => {
    const diffs = [];
    
    // Compare each category
    Object.keys(EnvironmentCategories).forEach(category => {
      const cat1 = env1.categories?.[category] || {};
      const cat2 = env2.categories?.[category] || {};
      
      // Find differences in this category
      const allKeys = new Set([...Object.keys(cat1), ...Object.keys(cat2)]);
      
      allKeys.forEach(key => {
        const val1 = cat1[key];
        const val2 = cat2[key];
        
        if (val1 !== val2) {
          diffs.push({
            category,
            key,
            environment1: val1 || 'Not captured',
            environment2: val2 || 'Not captured',
            type: !val1 ? 'added' : !val2 ? 'removed' : 'changed'
          });
        }
      });
    });
    
    setDifferences(diffs);
    return diffs;
  }, []);
  
  // Save current environment
  const saveEnvironment = useCallback((name) => {
    if (!currentEnvironment.id) return;
    
    const savedEnv = {
      ...currentEnvironment,
      name: name || `Environment ${savedEnvironments.length + 1}`,
      saved: new Date().toISOString()
    };
    
    setSavedEnvironments(prev => [...prev, savedEnv]);
    
    // Store in localStorage for persistence
    const stored = JSON.parse(localStorage.getItem('saved_environments') || '[]');
    stored.push(savedEnv);
    localStorage.setItem('saved_environments', JSON.stringify(stored));
  }, [currentEnvironment, savedEnvironments]);
  
  // Load saved environments
  const loadSavedEnvironments = useCallback(() => {
    const stored = JSON.parse(localStorage.getItem('saved_environments') || '[]');
    setSavedEnvironments(stored);
  }, []);
  
  // Export environment configuration
  const exportEnvironment = useCallback(() => {
    if (!currentEnvironment.id) return;
    
    let content;
    let filename;
    let mimeType;
    
    switch (exportFormat) {
      case 'json':
        content = JSON.stringify(currentEnvironment, null, 2);
        filename = `environment_${currentEnvironment.id}.json`;
        mimeType = 'application/json';
        break;
        
      case 'yaml':
        // Simple YAML conversion (would use js-yaml in production)
        content = convertToYAML(currentEnvironment);
        filename = `environment_${currentEnvironment.id}.yaml`;
        mimeType = 'text/yaml';
        break;
        
      case 'dockerfile':
        content = generateDockerfile(currentEnvironment);
        filename = 'Dockerfile';
        mimeType = 'text/plain';
        break;
        
      case 'requirements':
        content = generateRequirements(currentEnvironment);
        filename = 'requirements.txt';
        mimeType = 'text/plain';
        break;
        
      default:
        content = JSON.stringify(currentEnvironment, null, 2);
        filename = `environment_${currentEnvironment.id}.json`;
        mimeType = 'application/json';
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [currentEnvironment, exportFormat]);
  
  // Convert to YAML format
  const convertToYAML = useCallback((obj, indent = 0) => {
    let yaml = '';
    const spaces = '  '.repeat(indent);
    
    Object.entries(obj).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        yaml += `${spaces}${key}:\n`;
        yaml += convertToYAML(value, indent + 1);
      } else {
        yaml += `${spaces}${key}: ${value}\n`;
      }
    });
    
    return yaml;
  }, []);
  
  // Generate Dockerfile
  const generateDockerfile = useCallback((env) => {
    const system = env.categories?.SYSTEM || {};
    const runtime = env.categories?.RUNTIME || {};
    
    let dockerfile = `# Generated Environment Configuration
# Created: ${env.timestamp}

FROM node:18-alpine

# System Information
LABEL os="${system['Operating System'] || 'Unknown'}"
LABEL architecture="${system['Architecture'] || 'Unknown'}"

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Environment variables
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
`;
    
    return dockerfile;
  }, []);
  
  // Generate requirements.txt
  const generateRequirements = useCallback((env) => {
    const packages = env.categories?.PACKAGES || {};
    
    let requirements = '# Generated Requirements\n';
    requirements += `# Environment: ${env.id}\n`;
    requirements += `# Created: ${env.timestamp}\n\n`;
    
    Object.entries(packages).forEach(([pkg, version]) => {
      requirements += `${pkg.toLowerCase().replace('.', '-')}==${version}\n`;
    });
    
    return requirements;
  }, []);
  
  // Monitor environment changes
  const monitorChanges = useCallback(() => {
    // Set up periodic monitoring
    const interval = setInterval(() => {
      const currentInfo = captureSystemInfo();
      
      // Check for changes
      if (currentEnvironment.categories?.SYSTEM) {
        const changes = [];
        Object.entries(currentInfo).forEach(([key, value]) => {
          if (currentEnvironment.categories.SYSTEM[key] !== value) {
            changes.push({ key, old: currentEnvironment.categories.SYSTEM[key], new: value });
          }
        });
        
        if (changes.length > 0) {
          console.log('Environment changes detected:', changes);
        }
      }
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, [currentEnvironment, captureSystemInfo]);
  
  // Effects
  useEffect(() => {
    loadSavedEnvironments();
    // Capture initial environment
    captureEnvironment();
  }, []);
  
  useEffect(() => {
    // Update selected categories based on capture level
    const level = CaptureLevels[captureLevel];
    setSelectedCategories(level.categories);
  }, [captureLevel]);
  
  return (
    <div className="environment-capture">
      <div className="capture-header">
        <h2>Environment Capture</h2>
        <div className="header-controls">
          <select
            value={captureLevel}
            onChange={(e) => setCaptureLevel(e.target.value)}
            className="level-select"
          >
            {Object.entries(CaptureLevels).map(([key, level]) => (
              <option key={key} value={key}>
                {level.name} - {level.description}
              </option>
            ))}
          </select>
          
          <button
            className="capture-btn"
            onClick={captureEnvironment}
            disabled={isCapturing}
          >
            {isCapturing ? 'Capturing...' : 'Capture Now'}
          </button>
          
          <button
            className="save-btn"
            onClick={() => {
              const name = prompt('Enter environment name:');
              if (name) saveEnvironment(name);
            }}
            disabled={!currentEnvironment.id}
          >
            Save
          </button>
        </div>
      </div>
      
      <div className="capture-body">
        <div className="environment-panel">
          <div className="panel-header">
            <h3>Current Environment</h3>
            {currentEnvironment.fingerprint && (
              <span className="fingerprint">
                {currentEnvironment.fingerprint.substring(0, 12)}...
              </span>
            )}
          </div>
          
          <div className="environment-content">
            {Object.entries(EnvironmentCategories).map(([key, category]) => (
              <div key={key} className="category-section">
                <div 
                  className="category-header"
                  onClick={() => setExpandedCategories(prev => ({
                    ...prev,
                    [key]: !prev[key]
                  }))}
                >
                  <span className="expand-icon">
                    {expandedCategories[key] ? '▼' : '▶'}
                  </span>
                  <span className="category-icon">{category.icon}</span>
                  <span className="category-name">{category.name}</span>
                  {currentEnvironment.categories?.[key] && (
                    <span className="item-count">
                      {Object.keys(currentEnvironment.categories[key]).length} items
                    </span>
                  )}
                </div>
                
                {expandedCategories[key] && currentEnvironment.categories?.[key] && (
                  <div className="category-content">
                    {Object.entries(currentEnvironment.categories[key]).map(([item, value]) => (
                      <div key={item} className="environment-item">
                        <span className="item-key">{item}:</span>
                        <span className="item-value">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="tags-section">
            <h4>Tags</h4>
            <div className="tags-input">
              <input
                type="text"
                placeholder="Add tag..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.target.value) {
                    setEnvironmentTags(prev => [...prev, e.target.value]);
                    e.target.value = '';
                  }
                }}
              />
              <div className="tags-list">
                {environmentTags.map((tag, index) => (
                  <span key={index} className="tag">
                    {tag}
                    <button onClick={() => {
                      setEnvironmentTags(prev => prev.filter((_, i) => i !== index));
                    }}>×</button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="comparison-panel">
          <div className="panel-header">
            <h3>Environment Comparison</h3>
            <select
              onChange={(e) => {
                const env = savedEnvironments.find(env => env.id === e.target.value);
                setCompareEnvironment(env);
                if (env && currentEnvironment.id) {
                  compareEnvironments(currentEnvironment, env);
                }
              }}
            >
              <option value="">Select environment to compare...</option>
              {savedEnvironments.map(env => (
                <option key={env.id} value={env.id}>
                  {env.name} ({new Date(env.saved).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>
          
          {differences.length > 0 && (
            <div className="differences-list">
              <div className="diff-summary">
                {differences.filter(d => d.type === 'changed').length} changed,
                {' '}{differences.filter(d => d.type === 'added').length} added,
                {' '}{differences.filter(d => d.type === 'removed').length} removed
              </div>
              
              {differences.map((diff, index) => (
                <div key={index} className={`diff-item ${diff.type}`}>
                  <div className="diff-category">
                    {EnvironmentCategories[diff.category]?.name}
                  </div>
                  <div className="diff-key">{diff.key}</div>
                  <div className="diff-values">
                    <span className="old-value">{diff.environment1}</span>
                    <span className="arrow">→</span>
                    <span className="new-value">{diff.environment2}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="saved-environments">
            <h4>Saved Environments</h4>
            <div className="saved-list">
              {savedEnvironments.map(env => (
                <div key={env.id} className="saved-item">
                  <div className="env-name">{env.name}</div>
                  <div className="env-date">
                    {new Date(env.saved).toLocaleDateString()}
                  </div>
                  <div className="env-fingerprint">
                    {env.fingerprint.substring(0, 8)}...
                  </div>
                  <button onClick={() => setCurrentEnvironment(env)}>
                    Load
                  </button>
                  <button onClick={() => {
                    setSavedEnvironments(prev => prev.filter(e => e.id !== env.id));
                    const stored = JSON.parse(localStorage.getItem('saved_environments') || '[]');
                    const updated = stored.filter(e => e.id !== env.id);
                    localStorage.setItem('saved_environments', JSON.stringify(updated));
                  }}>
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="capture-footer">
        <div className="export-controls">
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            className="format-select"
          >
            <option value="json">JSON</option>
            <option value="yaml">YAML</option>
            <option value="dockerfile">Dockerfile</option>
            <option value="requirements">Requirements.txt</option>
          </select>
          <button onClick={exportEnvironment}>
            Export
          </button>
        </div>
        
        <div className="capture-history">
          <span>History:</span>
          {captureHistory.slice(-3).map((entry, index) => (
            <span key={index} className="history-entry">
              {new Date(entry.timestamp).toLocaleTimeString()}
              {' '}({entry.level})
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EnvironmentCapture;