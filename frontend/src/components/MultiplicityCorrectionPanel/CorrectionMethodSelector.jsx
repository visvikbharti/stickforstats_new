import React, { useState, useMemo } from 'react';
import './CorrectionMethodSelector.scss';

const CorrectionMethodSelector = ({ 
  onMethodSelect, 
  hypothesisCount = 0,
  context = 'general',
  currentMethod = null,
  className = '' 
}) => {
  const [selectedMethod, setSelectedMethod] = useState(currentMethod || 'none');
  const [showComparison, setShowComparison] = useState(false);
  const [showDecisionTree, setShowDecisionTree] = useState(false);
  const [hoveredMethod, setHoveredMethod] = useState(null);
  const [savedPreferences, setSavedPreferences] = useState({});

  // Correction methods with full details
  const CorrectionMethods = {
    none: {
      id: 'none',
      name: 'No Correction',
      category: 'None',
      abbreviation: 'None',
      formula: 'p_adj = p',
      description: 'No adjustment for multiple comparisons',
      pros: ['Simple', 'Maximum power'],
      cons: ['High Type I error rate', 'No control for multiple testing'],
      whenToUse: 'Single hypothesis or exploratory analysis only',
      conservativeness: 0,
      power: 100,
      recommended: false
    },
    bonferroni: {
      id: 'bonferroni',
      name: 'Bonferroni',
      category: 'FWER',
      abbreviation: 'Bonf',
      formula: 'p_adj = min(p × m, 1)',
      description: 'Controls family-wise error rate by dividing α by number of tests',
      pros: ['Simple to implement', 'Strong FWER control', 'Works for any dependency'],
      cons: ['Very conservative', 'Low power for many tests'],
      whenToUse: 'Small number of tests (<20), critical decisions',
      conservativeness: 100,
      power: 20,
      recommended: hypothesisCount <= 20
    },
    holm: {
      id: 'holm',
      name: 'Holm-Bonferroni',
      category: 'FWER',
      abbreviation: 'Holm',
      formula: 'p_adj[i] = min((m-i+1) × p[i], 1)',
      description: 'Sequential Bonferroni with improved power',
      pros: ['More powerful than Bonferroni', 'Strong FWER control', 'Simple'],
      cons: ['Still conservative', 'Requires ordering p-values'],
      whenToUse: 'Moderate number of tests, balance of power and control',
      conservativeness: 85,
      power: 35,
      recommended: hypothesisCount > 20 && hypothesisCount <= 50
    },
    hochberg: {
      id: 'hochberg',
      name: 'Hochberg',
      category: 'FWER',
      abbreviation: 'Hoch',
      formula: 'Step-up procedure: p[i] × (m-i+1)',
      description: 'Step-up version of Holm with more power',
      pros: ['More powerful than Holm', 'FWER control under independence'],
      cons: ['Requires independence assumption', 'Complex implementation'],
      whenToUse: 'Independent tests, need more power than Holm',
      conservativeness: 75,
      power: 45,
      recommended: false
    },
    benjamini_hochberg: {
      id: 'benjamini_hochberg',
      name: 'Benjamini-Hochberg',
      category: 'FDR',
      abbreviation: 'BH',
      formula: 'p_adj[i] = min(p[i] × m/i, 1)',
      description: 'Controls false discovery rate instead of FWER',
      pros: ['Good power', 'Less conservative', 'Widely accepted'],
      cons: ['Only controls FDR, not FWER', 'Requires ordering'],
      whenToUse: 'Many tests (>50), exploratory studies, genomics',
      conservativeness: 50,
      power: 65,
      recommended: hypothesisCount > 50
    },
    benjamini_yekutieli: {
      id: 'benjamini_yekutieli',
      name: 'Benjamini-Yekutieli',
      category: 'FDR',
      abbreviation: 'BY',
      formula: 'p_adj[i] = min(p[i] × m × c(m)/i, 1)',
      description: 'FDR control for any dependency structure',
      pros: ['Works with dependent tests', 'FDR control guarantee'],
      cons: ['More conservative than BH', 'Complex constant c(m)'],
      whenToUse: 'Dependent tests with FDR control needed',
      conservativeness: 65,
      power: 50,
      recommended: false
    },
    sidak: {
      id: 'sidak',
      name: 'Šidák',
      category: 'FWER',
      abbreviation: 'Šidák',
      formula: 'p_adj = 1 - (1 - p)^m',
      description: 'Slightly less conservative than Bonferroni for independent tests',
      pros: ['Exact for independent tests', 'Slightly more powerful than Bonferroni'],
      cons: ['Requires independence', 'Still conservative'],
      whenToUse: 'Independent tests, small number of comparisons',
      conservativeness: 95,
      power: 25,
      recommended: false
    },
    holm_sidak: {
      id: 'holm_sidak',
      name: 'Holm-Šidák',
      category: 'FWER',
      abbreviation: 'HS',
      formula: 'p_adj[i] = 1 - (1 - p[i])^(m-i+1)',
      description: 'Sequential Šidák procedure',
      pros: ['More powerful than Holm', 'FWER control'],
      cons: ['Requires independence', 'Complex calculation'],
      whenToUse: 'Independent tests, need sequential FWER control',
      conservativeness: 80,
      power: 40,
      recommended: false
    },
    fdr_tsbh: {
      id: 'fdr_tsbh',
      name: 'Two-stage BH',
      category: 'FDR',
      abbreviation: 'TSBH',
      formula: 'Two-stage adaptive BH procedure',
      description: 'Adaptive FDR with estimated proportion of true nulls',
      pros: ['More powerful than BH', 'Adaptive to data'],
      cons: ['Complex implementation', 'Requires large m'],
      whenToUse: 'Very many tests (>100), genomics/proteomics',
      conservativeness: 45,
      power: 70,
      recommended: hypothesisCount > 100
    },
    fdr_tsbky: {
      id: 'fdr_tsbky',
      name: 'Two-stage BY',
      category: 'FDR',
      abbreviation: 'TSBY',
      formula: 'Two-stage adaptive BY procedure',
      description: 'Adaptive FDR for dependent tests',
      pros: ['Works with dependence', 'Adaptive'],
      cons: ['Conservative', 'Very complex'],
      whenToUse: 'Many dependent tests',
      conservativeness: 60,
      power: 55,
      recommended: false
    }
  };

  // Context-specific recommendations
  const getRecommendations = useMemo(() => {
    const recommendations = [];
    
    // Based on number of hypotheses
    if (hypothesisCount === 0) {
      recommendations.push({
        method: 'none',
        reason: 'No hypotheses to correct'
      });
    } else if (hypothesisCount === 1) {
      recommendations.push({
        method: 'none',
        reason: 'Single hypothesis - no correction needed'
      });
    } else if (hypothesisCount <= 10) {
      recommendations.push({
        method: 'bonferroni',
        reason: 'Small number of tests - Bonferroni provides strong control'
      });
    } else if (hypothesisCount <= 50) {
      recommendations.push({
        method: 'holm',
        reason: 'Moderate number - Holm balances power and control'
      });
    } else {
      recommendations.push({
        method: 'benjamini_hochberg',
        reason: 'Many tests - FDR control more appropriate'
      });
    }

    // Based on context
    if (context === 'clinical_trial') {
      recommendations.push({
        method: 'bonferroni',
        reason: 'Clinical trials require strict FWER control'
      });
    } else if (context === 'genomics') {
      recommendations.push({
        method: 'benjamini_hochberg',
        reason: 'Genomics studies typically use FDR control'
      });
    } else if (context === 'exploratory') {
      recommendations.push({
        method: 'benjamini_hochberg',
        reason: 'Exploratory analysis benefits from FDR approach'
      });
    } else if (context === 'confirmatory') {
      recommendations.push({
        method: 'holm',
        reason: 'Confirmatory studies need FWER control'
      });
    }

    return recommendations;
  }, [hypothesisCount, context]);

  // Visual comparison data
  const getComparisonData = () => {
    const methods = Object.values(CorrectionMethods);
    return methods.map(method => ({
      name: method.abbreviation,
      conservativeness: method.conservativeness,
      power: method.power,
      category: method.category
    }));
  };

  // Decision tree logic
  const DecisionNode = ({ question, yes, no, result }) => {
    const [answer, setAnswer] = useState(null);
    
    if (result) {
      return (
        <div className="decision-result">
          <span className="result-icon">→</span>
          <span className="result-method">{result}</span>
        </div>
      );
    }

    return (
      <div className="decision-node">
        <div className="question">{question}</div>
        <div className="answers">
          <button 
            className={`answer-btn ${answer === 'yes' ? 'selected' : ''}`}
            onClick={() => setAnswer('yes')}
          >
            Yes
          </button>
          <button 
            className={`answer-btn ${answer === 'no' ? 'selected' : ''}`}
            onClick={() => setAnswer('no')}
          >
            No
          </button>
        </div>
        {answer && (
          <div className="next-node">
            {answer === 'yes' ? yes : no}
          </div>
        )}
      </div>
    );
  };

  const handleMethodSelect = (methodId) => {
    setSelectedMethod(methodId);
    if (onMethodSelect) {
      onMethodSelect(methodId, CorrectionMethods[methodId]);
    }
  };

  const savePreference = () => {
    const prefs = {
      ...savedPreferences,
      [context]: selectedMethod
    };
    setSavedPreferences(prefs);
    localStorage.setItem('correction_preferences', JSON.stringify(prefs));
  };

  return (
    <div className={`correction-method-selector ${className}`}>
      <div className="selector-header">
        <h3>Multiple Testing Correction Method</h3>
        <div className="header-info">
          <span className="hypothesis-count">
            {hypothesisCount} {hypothesisCount === 1 ? 'hypothesis' : 'hypotheses'}
          </span>
          <span className="context-badge">{context.replace('_', ' ')}</span>
        </div>
      </div>

      <div className="recommendations-section">
        <h4>Recommendations</h4>
        <div className="recommendation-cards">
          {getRecommendations.map((rec, index) => (
            <div 
              key={index}
              className={`recommendation-card ${selectedMethod === rec.method ? 'selected' : ''}`}
              onClick={() => handleMethodSelect(rec.method)}
            >
              <div className="rec-method">{CorrectionMethods[rec.method].name}</div>
              <div className="rec-reason">{rec.reason}</div>
              <div className="rec-badge">Recommended</div>
            </div>
          ))}
        </div>
      </div>

      <div className="methods-grid">
        <h4>All Methods</h4>
        <div className="method-categories">
          <div className="category">
            <h5>FWER Control</h5>
            <div className="method-list">
              {Object.values(CorrectionMethods)
                .filter(m => m.category === 'FWER')
                .map(method => (
                  <div
                    key={method.id}
                    className={`method-card ${selectedMethod === method.id ? 'selected' : ''} ${method.recommended ? 'recommended' : ''}`}
                    onClick={() => handleMethodSelect(method.id)}
                    onMouseEnter={() => setHoveredMethod(method.id)}
                    onMouseLeave={() => setHoveredMethod(null)}
                  >
                    <div className="method-name">{method.name}</div>
                    <div className="method-formula">{method.formula}</div>
                    {method.recommended && <span className="recommended-badge">★</span>}
                  </div>
                ))}
            </div>
          </div>

          <div className="category">
            <h5>FDR Control</h5>
            <div className="method-list">
              {Object.values(CorrectionMethods)
                .filter(m => m.category === 'FDR')
                .map(method => (
                  <div
                    key={method.id}
                    className={`method-card ${selectedMethod === method.id ? 'selected' : ''} ${method.recommended ? 'recommended' : ''}`}
                    onClick={() => handleMethodSelect(method.id)}
                    onMouseEnter={() => setHoveredMethod(method.id)}
                    onMouseLeave={() => setHoveredMethod(null)}
                  >
                    <div className="method-name">{method.name}</div>
                    <div className="method-formula">{method.formula}</div>
                    {method.recommended && <span className="recommended-badge">★</span>}
                  </div>
                ))}
            </div>
          </div>

          <div className="category">
            <h5>No Correction</h5>
            <div className="method-list">
              <div
                className={`method-card ${selectedMethod === 'none' ? 'selected' : ''}`}
                onClick={() => handleMethodSelect('none')}
                onMouseEnter={() => setHoveredMethod('none')}
                onMouseLeave={() => setHoveredMethod(null)}
              >
                <div className="method-name">No Correction</div>
                <div className="method-formula">p_adj = p</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {hoveredMethod && (
        <div className="method-details">
          <h4>{CorrectionMethods[hoveredMethod].name}</h4>
          <p className="description">{CorrectionMethods[hoveredMethod].description}</p>
          
          <div className="details-grid">
            <div className="detail-section">
              <h5>Pros</h5>
              <ul>
                {CorrectionMethods[hoveredMethod].pros.map((pro, i) => (
                  <li key={i}>{pro}</li>
                ))}
              </ul>
            </div>
            
            <div className="detail-section">
              <h5>Cons</h5>
              <ul>
                {CorrectionMethods[hoveredMethod].cons.map((con, i) => (
                  <li key={i}>{con}</li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="when-to-use">
            <strong>When to use:</strong> {CorrectionMethods[hoveredMethod].whenToUse}
          </div>
          
          <div className="metrics">
            <div className="metric">
              <span className="metric-label">Conservativeness:</span>
              <div className="metric-bar">
                <div 
                  className="metric-fill conservative"
                  style={{ width: `${CorrectionMethods[hoveredMethod].conservativeness}%` }}
                />
              </div>
              <span className="metric-value">{CorrectionMethods[hoveredMethod].conservativeness}%</span>
            </div>
            
            <div className="metric">
              <span className="metric-label">Statistical Power:</span>
              <div className="metric-bar">
                <div 
                  className="metric-fill power"
                  style={{ width: `${CorrectionMethods[hoveredMethod].power}%` }}
                />
              </div>
              <span className="metric-value">{CorrectionMethods[hoveredMethod].power}%</span>
            </div>
          </div>
        </div>
      )}

      <div className="selector-tools">
        <button 
          className="tool-btn"
          onClick={() => setShowComparison(!showComparison)}
        >
          Visual Comparison
        </button>
        <button 
          className="tool-btn"
          onClick={() => setShowDecisionTree(!showDecisionTree)}
        >
          Decision Tree
        </button>
        <button 
          className="tool-btn"
          onClick={savePreference}
        >
          Save Preference
        </button>
      </div>

      {showComparison && (
        <div className="comparison-view">
          <h4>Method Comparison</h4>
          <div className="comparison-chart">
            <div className="chart-header">
              <span className="axis-label">← More Conservative</span>
              <span className="axis-label">More Powerful →</span>
            </div>
            <div className="chart-body">
              {getComparisonData().map(method => (
                <div key={method.name} className="comparison-row">
                  <span className="method-label">{method.name}</span>
                  <div className="comparison-bars">
                    <div className="bar-container">
                      <div 
                        className="bar conservative-bar"
                        style={{ width: `${method.conservativeness}%` }}
                      />
                    </div>
                    <div className="bar-container">
                      <div 
                        className="bar power-bar"
                        style={{ width: `${method.power}%` }}
                      />
                    </div>
                  </div>
                  <span className={`category-badge ${method.category.toLowerCase()}`}>
                    {method.category}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showDecisionTree && (
        <div className="decision-tree">
          <h4>Interactive Decision Tree</h4>
          <DecisionNode
            question="Are you conducting a clinical trial or safety-critical analysis?"
            yes={<DecisionNode result="Use Bonferroni or Holm for strict FWER control" />}
            no={
              <DecisionNode
                question="Do you have more than 50 hypotheses to test?"
                yes={
                  <DecisionNode
                    question="Is this an exploratory analysis?"
                    yes={<DecisionNode result="Use Benjamini-Hochberg (FDR)" />}
                    no={<DecisionNode result="Consider Holm or FDR methods based on field standards" />}
                  />
                }
                no={
                  <DecisionNode
                    question="Do you need to maintain family-wise error rate?"
                    yes={<DecisionNode result="Use Holm-Bonferroni for better power than Bonferroni" />}
                    no={<DecisionNode result="Consider Benjamini-Hochberg for balanced approach" />}
                  />
                }
              />
            }
          />
        </div>
      )}

      <div className="selected-method-summary">
        <h4>Selected Method: {CorrectionMethods[selectedMethod].name}</h4>
        <div className="summary-content">
          <div className="formula-display">
            <span className="formula-label">Formula:</span>
            <code>{CorrectionMethods[selectedMethod].formula}</code>
          </div>
          <div className="method-category">
            <span className="category-label">Type:</span>
            <span className={`category-value ${CorrectionMethods[selectedMethod].category.toLowerCase()}`}>
              {CorrectionMethods[selectedMethod].category || 'None'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CorrectionMethodSelector;