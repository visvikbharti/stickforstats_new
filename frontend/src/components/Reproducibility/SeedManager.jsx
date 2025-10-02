import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import './SeedManager.scss';

// Seed generation strategies
const SeedStrategies = {
  MANUAL: {
    id: 'manual',
    name: 'Manual Entry',
    description: 'User provides specific seed values',
    icon: '✏️'
  },
  TIMESTAMP: {
    id: 'timestamp',
    name: 'Timestamp-based',
    description: 'Generate from current timestamp',
    icon: '🕐'
  },
  HASH: {
    id: 'hash',
    name: 'Hash-based',
    description: 'Generate from data fingerprint',
    icon: '#️⃣'
  },
  SEQUENTIAL: {
    id: 'sequential',
    name: 'Sequential',
    description: 'Increment from base seed',
    icon: '🔢'
  },
  RANDOM: {
    id: 'random',
    name: 'Random',
    description: 'Cryptographically secure random',
    icon: '🎲'
  },
  REPRODUCIBLE: {
    id: 'reproducible',
    name: 'Reproducible Random',
    description: 'Deterministic pseudo-random sequence',
    icon: '🔄'
  }
};

// Supported RNG types
const RNGTypes = {
  JAVASCRIPT: {
    id: 'javascript',
    name: 'JavaScript Math.random',
    seedable: false,
    range: [0, 1],
    precision: 53
  },
  MERSENNE: {
    id: 'mersenne',
    name: 'Mersenne Twister (MT19937)',
    seedable: true,
    range: [0, 2**32 - 1],
    precision: 32,
    period: '2^19937 - 1'
  },
  PCG: {
    id: 'pcg',
    name: 'PCG (Permuted Congruential)',
    seedable: true,
    range: [0, 2**32 - 1],
    precision: 32,
    period: '2^64'
  },
  XORSHIFT: {
    id: 'xorshift',
    name: 'XorShift128+',
    seedable: true,
    range: [0, 2**32 - 1],
    precision: 32,
    period: '2^128 - 1'
  },
  LCG: {
    id: 'lcg',
    name: 'Linear Congruential',
    seedable: true,
    range: [0, 2**31 - 1],
    precision: 31,
    period: '2^31'
  }
};

// Seed usage contexts
const SeedContexts = {
  DATA_SAMPLING: 'Data Sampling',
  BOOTSTRAP: 'Bootstrap Resampling',
  CROSS_VALIDATION: 'Cross-validation Splits',
  MONTE_CARLO: 'Monte Carlo Simulation',
  PERMUTATION: 'Permutation Tests',
  INITIALIZATION: 'Model Initialization',
  AUGMENTATION: 'Data Augmentation',
  NOISE: 'Noise Generation'
};

const SeedManager = () => {
  const dispatch = useDispatch();
  const currentProject = useSelector(state => state.project?.current);
  
  // State management
  const [seedStrategy, setSeedStrategy] = useState('manual');
  const [globalSeed, setGlobalSeed] = useState(42);
  const [seeds, setSeeds] = useState({});
  const [seedHistory, setSeedHistory] = useState([]);
  const [rngType, setRngType] = useState('mersenne');
  const [seedGroups, setSeedGroups] = useState([]);
  const [activeSeedGroup, setActiveSeedGroup] = useState(null);
  const [seedValidation, setSeedValidation] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [seedPolicy, setSeedPolicy] = useState({
    enforceReproducibility: true,
    warnOnUnseedable: true,
    logAllSeeds: true,
    validateRanges: true,
    preventDuplicates: false
  });
  
  // Generate seed based on strategy
  const generateSeed = useCallback((strategy = seedStrategy, context = null) => {
    switch (strategy) {
      case 'manual':
        return globalSeed;
        
      case 'timestamp':
        return Date.now() % 2147483647; // Keep within 32-bit range
        
      case 'hash':
        // Generate from data fingerprint if available
        const dataString = context ? JSON.stringify(context) : String(Date.now());
        let hash = 0;
        for (let i = 0; i < dataString.length; i++) {
          const char = dataString.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
        
      case 'sequential':
        const lastSeed = Object.values(seeds).sort((a, b) => b - a)[0] || globalSeed;
        return lastSeed + 1;
        
      case 'random':
        // Cryptographically secure random
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        return array[0] % 2147483647;
        
      case 'reproducible':
        // Deterministic pseudo-random based on global seed
        let seed = globalSeed;
        seed = (seed * 9301 + 49297) % 233280;
        return seed;
        
      default:
        return 42;
    }
  }, [seedStrategy, globalSeed, seeds]);
  
  // Create new seed group
  const createSeedGroup = useCallback((name, description = '') => {
    const newGroup = {
      id: `group_${Date.now()}`,
      name,
      description,
      created: new Date().toISOString(),
      seeds: {},
      strategy: seedStrategy,
      rngType
    };
    
    setSeedGroups(prev => [...prev, newGroup]);
    setActiveSeedGroup(newGroup.id);
    
    // Add to history
    setSeedHistory(prev => [...prev, {
      timestamp: new Date().toISOString(),
      action: 'Group Created',
      group: name,
      details: `Strategy: ${seedStrategy}, RNG: ${rngType}`
    }]);
    
    return newGroup;
  }, [seedStrategy, rngType]);
  
  // Add seed to active group
  const addSeed = useCallback((context, value = null) => {
    const seedValue = value !== null ? value : generateSeed();
    
    setSeeds(prev => ({
      ...prev,
      [context]: seedValue
    }));
    
    // Update active group if exists
    if (activeSeedGroup) {
      setSeedGroups(prev => prev.map(group => 
        group.id === activeSeedGroup
          ? { ...group, seeds: { ...group.seeds, [context]: seedValue } }
          : group
      ));
    }
    
    // Validate seed
    validateSeed(context, seedValue);
    
    // Add to history
    setSeedHistory(prev => [...prev, {
      timestamp: new Date().toISOString(),
      action: 'Seed Added',
      context,
      value: seedValue,
      strategy: seedStrategy
    }]);
    
    return seedValue;
  }, [generateSeed, activeSeedGroup, seedStrategy]);
  
  // Validate seed value
  const validateSeed = useCallback((context, value) => {
    const validation = {
      valid: true,
      warnings: [],
      errors: []
    };
    
    // Check range for RNG type
    const rng = RNGTypes[rngType];
    if (rng && seedPolicy.validateRanges) {
      if (value < rng.range[0] || value > rng.range[1]) {
        validation.valid = false;
        validation.errors.push(`Seed out of range for ${rng.name}`);
      }
    }
    
    // Check for duplicates if policy enabled
    if (seedPolicy.preventDuplicates) {
      const duplicateContext = Object.entries(seeds).find(
        ([ctx, val]) => ctx !== context && val === value
      );
      
      if (duplicateContext) {
        validation.warnings.push(`Duplicate seed with ${duplicateContext[0]}`);
      }
    }
    
    // Check if RNG is seedable
    if (!rng.seedable && seedPolicy.warnOnUnseedable) {
      validation.warnings.push(`${rng.name} is not seedable`);
    }
    
    // Check for special values
    if (value === 0) {
      validation.warnings.push('Seed value 0 may cause issues with some RNGs');
    }
    
    setSeedValidation(prev => ({
      ...prev,
      [context]: validation
    }));
    
    return validation;
  }, [rngType, seeds, seedPolicy]);
  
  // Synchronize seeds across contexts
  const synchronizeSeeds = useCallback((baseContext = null) => {
    const baseSeed = baseContext ? seeds[baseContext] : globalSeed;
    
    setIsGenerating(true);
    
    // Generate related seeds using deterministic transformation
    const newSeeds = {};
    Object.values(SeedContexts).forEach((context, index) => {
      // Use linear congruential generator for deterministic sequence
      const a = 1664525;
      const c = 1013904223;
      const m = 2**32;
      
      newSeeds[context] = (a * (baseSeed + index) + c) % m;
    });
    
    setSeeds(newSeeds);
    
    // Update active group
    if (activeSeedGroup) {
      setSeedGroups(prev => prev.map(group => 
        group.id === activeSeedGroup
          ? { ...group, seeds: newSeeds }
          : group
      ));
    }
    
    // Add to history
    setSeedHistory(prev => [...prev, {
      timestamp: new Date().toISOString(),
      action: 'Seeds Synchronized',
      baseSeed,
      contexts: Object.keys(newSeeds).length
    }]);
    
    setIsGenerating(false);
  }, [seeds, globalSeed, activeSeedGroup]);
  
  // Export seed configuration
  const exportSeedConfig = useCallback(() => {
    const config = {
      version: '1.0',
      exported: new Date().toISOString(),
      globalSeed,
      strategy: seedStrategy,
      rngType,
      seeds,
      groups: seedGroups,
      policy: seedPolicy,
      validation: seedValidation
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], 
      { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seed_config_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [globalSeed, seedStrategy, rngType, seeds, seedGroups, seedPolicy, seedValidation]);
  
  // Import seed configuration
  const importSeedConfig = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const config = JSON.parse(event.target.result);
        
        // Restore configuration
        setGlobalSeed(config.globalSeed || 42);
        setSeedStrategy(config.strategy || 'manual');
        setRngType(config.rngType || 'mersenne');
        setSeeds(config.seeds || {});
        setSeedGroups(config.groups || []);
        setSeedPolicy(config.policy || seedPolicy);
        setSeedValidation(config.validation || {});
        
        // Add to history
        setSeedHistory(prev => [...prev, {
          timestamp: new Date().toISOString(),
          action: 'Configuration Imported',
          source: file.name
        }]);
        
      } catch (error) {
        console.error('Failed to import seed configuration:', error);
      }
    };
    reader.readAsText(file);
  }, [seedPolicy]);
  
  // Generate code snippet for seed usage
  const generateCode = useCallback((language = 'python') => {
    const seedEntries = Object.entries(seeds);
    
    if (language === 'python') {
      return `# Seed Configuration
import random
import numpy as np
import torch
import tensorflow as tf

# Global seed
GLOBAL_SEED = ${globalSeed}

# Set seeds for reproducibility
def set_all_seeds(seed=GLOBAL_SEED):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    tf.random.set_seed(seed)
    
    # Make operations deterministic
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False

# Context-specific seeds
seeds = {
${seedEntries.map(([ctx, val]) => `    "${ctx}": ${val}`).join(',\n')}
}

# Initialize with global seed
set_all_seeds()

# Usage example
def get_seed(context):
    """Get seed for specific context"""
    return seeds.get(context, GLOBAL_SEED)
`;
    } else if (language === 'r') {
      return `# Seed Configuration
# Global seed
GLOBAL_SEED <- ${globalSeed}

# Set global seed
set.seed(GLOBAL_SEED)

# Context-specific seeds
seeds <- list(
${seedEntries.map(([ctx, val]) => `  "${ctx}" = ${val}`).join(',\n')}
)

# Function to get seed for context
get_seed <- function(context) {
  if (context %in% names(seeds)) {
    return(seeds[[context]])
  } else {
    return(GLOBAL_SEED)
  }
}

# Usage example
# set.seed(get_seed("bootstrap"))
`;
    } else if (language === 'javascript') {
      return `// Seed Configuration
// Note: Native Math.random() is not seedable
// Consider using seedrandom library

const GLOBAL_SEED = ${globalSeed};

// Context-specific seeds
const seeds = {
${seedEntries.map(([ctx, val]) => `  "${ctx}": ${val}`).join(',\n')}
};

// Seedable PRNG using linear congruential generator
class SeededRandom {
  constructor(seed = GLOBAL_SEED) {
    this.seed = seed;
  }
  
  next() {
    this.seed = (this.seed * 1664525 + 1013904223) % 2147483648;
    return this.seed / 2147483648;
  }
  
  reset(seed) {
    this.seed = seed;
  }
}

// Get seed for context
function getSeed(context) {
  return seeds[context] || GLOBAL_SEED;
}

// Create seeded RNG for context
function createRNG(context) {
  return new SeededRandom(getSeed(context));
}
`;
    }
    
    return '';
  }, [globalSeed, seeds]);
  
  // Test seed reproducibility
  const testReproducibility = useCallback(() => {
    const results = [];
    
    // Simple LCG for testing
    const lcg = (seed) => {
      let current = seed;
      return () => {
        current = (current * 1664525 + 1013904223) % 2147483648;
        return current / 2147483648;
      };
    };
    
    // Test each seed
    Object.entries(seeds).forEach(([context, seed]) => {
      const rng1 = lcg(seed);
      const rng2 = lcg(seed);
      
      // Generate sequences
      const seq1 = Array(10).fill(0).map(() => rng1());
      const seq2 = Array(10).fill(0).map(() => rng2());
      
      // Check if sequences match
      const matches = seq1.every((val, idx) => Math.abs(val - seq2[idx]) < 1e-10);
      
      results.push({
        context,
        seed,
        reproducible: matches,
        firstValue: seq1[0],
        checksum: seq1.reduce((sum, val) => sum + val, 0)
      });
    });
    
    // Add to history
    setSeedHistory(prev => [...prev, {
      timestamp: new Date().toISOString(),
      action: 'Reproducibility Test',
      results: results.filter(r => !r.reproducible).length === 0 ? 'All Pass' : 'Some Fail',
      details: results
    }]);
    
    return results;
  }, [seeds]);
  
  // Initialize with default seed
  useEffect(() => {
    if (Object.keys(seeds).length === 0) {
      // Add default seeds for common contexts
      Object.values(SeedContexts).forEach(context => {
        addSeed(context);
      });
    }
  }, []);
  
  return (
    <div className="seed-manager">
      <div className="manager-header">
        <h2>Seed Manager</h2>
        <div className="header-controls">
          <div className="strategy-selector">
            <select
              value={seedStrategy}
              onChange={(e) => setSeedStrategy(e.target.value)}
            >
              {Object.entries(SeedStrategies).map(([key, strategy]) => (
                <option key={key} value={key}>
                  {strategy.icon} {strategy.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="rng-selector">
            <select
              value={rngType}
              onChange={(e) => setRngType(e.target.value)}
            >
              {Object.entries(RNGTypes).map(([key, rng]) => (
                <option key={key} value={key}>
                  {rng.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="global-seed">
            <label>Global:</label>
            <input
              type="number"
              value={globalSeed}
              onChange={(e) => setGlobalSeed(parseInt(e.target.value) || 0)}
              className="seed-input"
            />
          </div>
          
          <button
            className="sync-btn"
            onClick={() => synchronizeSeeds()}
            disabled={isGenerating}
          >
            Synchronize All
          </button>
        </div>
      </div>
      
      <div className="manager-body">
        <div className="seeds-panel">
          <div className="panel-header">
            <h3>Seed Configuration</h3>
            <div className="panel-controls">
              <button
                onClick={() => createSeedGroup(
                  prompt('Enter group name:') || `Group ${seedGroups.length + 1}`
                )}
              >
                New Group
              </button>
              <button onClick={testReproducibility}>
                Test
              </button>
            </div>
          </div>
          
          <div className="seeds-list">
            <div className="seed-contexts">
              <h4>Active Seeds</h4>
              {Object.entries(SeedContexts).map(([key, context]) => (
                <div key={key} className="seed-item">
                  <div className="seed-context">
                    <span className="context-name">{context}</span>
                    {seedValidation[context]?.warnings?.length > 0 && (
                      <span className="warning-badge" title={seedValidation[context].warnings[0]}>
                        ⚠️
                      </span>
                    )}
                  </div>
                  
                  <div className="seed-value">
                    <input
                      type="number"
                      value={seeds[context] || ''}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value)) {
                          addSeed(context, value);
                        }
                      }}
                      className={seedValidation[context]?.valid === false ? 'invalid' : ''}
                    />
                    
                    <button
                      className="generate-btn"
                      onClick={() => addSeed(context)}
                      title="Generate new seed"
                    >
                      🎲
                    </button>
                    
                    <button
                      className="copy-btn"
                      onClick={() => {
                        if (seeds[context]) {
                          navigator.clipboard.writeText(seeds[context]);
                        }
                      }}
                      title="Copy seed"
                    >
                      📋
                    </button>
                  </div>
                  
                  <div className="seed-info">
                    <span className="seed-type">
                      {RNGTypes[rngType]?.seedable ? 'Seedable' : 'Not Seedable'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            {seedGroups.length > 0 && (
              <div className="seed-groups">
                <h4>Seed Groups</h4>
                {seedGroups.map(group => (
                  <div key={group.id} className="seed-group">
                    <div 
                      className="group-header"
                      onClick={() => setExpandedGroups(prev => ({
                        ...prev,
                        [group.id]: !prev[group.id]
                      }))}
                    >
                      <span className="expand-icon">
                        {expandedGroups[group.id] ? '▼' : '▶'}
                      </span>
                      <span className="group-name">{group.name}</span>
                      <span className="group-count">
                        {Object.keys(group.seeds).length} seeds
                      </span>
                      {activeSeedGroup === group.id && (
                        <span className="active-badge">Active</span>
                      )}
                    </div>
                    
                    {expandedGroups[group.id] && (
                      <div className="group-content">
                        <div className="group-info">
                          <div>Strategy: {group.strategy}</div>
                          <div>RNG: {group.rngType}</div>
                          <div>Created: {new Date(group.created).toLocaleString()}</div>
                        </div>
                        
                        <div className="group-seeds">
                          {Object.entries(group.seeds).map(([ctx, val]) => (
                            <div key={ctx} className="group-seed">
                              <span>{ctx}:</span>
                              <code>{val}</code>
                            </div>
                          ))}
                        </div>
                        
                        <div className="group-actions">
                          <button onClick={() => setActiveSeedGroup(group.id)}>
                            Set Active
                          </button>
                          <button onClick={() => {
                            setSeeds(group.seeds);
                            setSeedStrategy(group.strategy);
                            setRngType(group.rngType);
                          }}>
                            Load
                          </button>
                          <button onClick={() => {
                            setSeedGroups(prev => prev.filter(g => g.id !== group.id));
                            if (activeSeedGroup === group.id) {
                              setActiveSeedGroup(null);
                            }
                          }}>
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="policy-section">
            <h4>Reproducibility Policy</h4>
            <div className="policy-options">
              {Object.entries(seedPolicy).map(([key, value]) => (
                <label key={key} className="policy-option">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => setSeedPolicy(prev => ({
                      ...prev,
                      [key]: e.target.checked
                    }))}
                  />
                  <span>{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        
        <div className="info-panel">
          <div className="rng-info">
            <h3>RNG Information</h3>
            <div className="rng-details">
              <div className="info-item">
                <label>Type:</label>
                <span>{RNGTypes[rngType]?.name}</span>
              </div>
              <div className="info-item">
                <label>Seedable:</label>
                <span className={RNGTypes[rngType]?.seedable ? 'yes' : 'no'}>
                  {RNGTypes[rngType]?.seedable ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="info-item">
                <label>Range:</label>
                <span>
                  [{RNGTypes[rngType]?.range[0]}, {RNGTypes[rngType]?.range[1]}]
                </span>
              </div>
              <div className="info-item">
                <label>Precision:</label>
                <span>{RNGTypes[rngType]?.precision} bits</span>
              </div>
              {RNGTypes[rngType]?.period && (
                <div className="info-item">
                  <label>Period:</label>
                  <span>{RNGTypes[rngType].period}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="code-generation">
            <h3>Code Generation</h3>
            <div className="code-controls">
              <select id="code-language">
                <option value="python">Python</option>
                <option value="r">R</option>
                <option value="javascript">JavaScript</option>
              </select>
              <button onClick={() => {
                const lang = document.getElementById('code-language').value;
                const code = generateCode(lang);
                navigator.clipboard.writeText(code);
              }}>
                Copy Code
              </button>
            </div>
            <pre className="code-preview">
              {generateCode(document.getElementById('code-language')?.value || 'python')}
            </pre>
          </div>
          
          <div className="seed-history">
            <h3>History</h3>
            <div className="history-list">
              {seedHistory.slice(-10).reverse().map((entry, index) => (
                <div key={index} className="history-item">
                  <div className="history-time">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </div>
                  <div className="history-action">{entry.action}</div>
                  {entry.context && (
                    <div className="history-context">{entry.context}</div>
                  )}
                  {entry.value !== undefined && (
                    <div className="history-value">{entry.value}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="manager-footer">
        <div className="footer-controls">
          <button onClick={exportSeedConfig}>
            Export Config
          </button>
          <input
            type="file"
            accept=".json"
            onChange={importSeedConfig}
            style={{ display: 'none' }}
            id="import-config"
          />
          <button onClick={() => document.getElementById('import-config').click()}>
            Import Config
          </button>
        </div>
        
        <div className="footer-info">
          <span>{Object.keys(seeds).length} seeds configured</span>
          <span>Strategy: {SeedStrategies[seedStrategy]?.name}</span>
        </div>
      </div>
    </div>
  );
};

export default SeedManager;