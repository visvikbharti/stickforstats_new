import React, { useState, useCallback, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import './StudyDesignWizard.scss';

const StudyTypes = {
  EXPERIMENTAL: {
    id: 'experimental',
    name: 'Experimental Study',
    description: 'Controlled manipulation of variables',
    subtypes: [
      { id: 'rct', name: 'Randomized Controlled Trial', icon: '🎲' },
      { id: 'quasi', name: 'Quasi-Experimental', icon: '⚡' },
      { id: 'factorial', name: 'Factorial Design', icon: '⊞' },
      { id: 'crossover', name: 'Crossover Design', icon: '↔' },
      { id: 'splitplot', name: 'Split-Plot Design', icon: '⊟' }
    ]
  },
  OBSERVATIONAL: {
    id: 'observational',
    name: 'Observational Study',
    description: 'No controlled manipulation',
    subtypes: [
      { id: 'cohort', name: 'Cohort Study', icon: '📊' },
      { id: 'case_control', name: 'Case-Control', icon: '🔍' },
      { id: 'cross_sectional', name: 'Cross-Sectional', icon: '📷' },
      { id: 'ecological', name: 'Ecological Study', icon: '🌍' }
    ]
  },
  DIAGNOSTIC: {
    id: 'diagnostic',
    name: 'Diagnostic Study',
    description: 'Test accuracy evaluation',
    subtypes: [
      { id: 'sensitivity', name: 'Sensitivity/Specificity', icon: '🎯' },
      { id: 'roc', name: 'ROC Analysis', icon: '📈' },
      { id: 'agreement', name: 'Agreement Study', icon: '🤝' }
    ]
  }
};

const DesignTemplates = {
  twoArmRCT: {
    name: 'Two-Arm Parallel RCT',
    structure: {
      groups: 2,
      allocation: 'randomized',
      blinding: 'double',
      control: 'placebo',
      primaryEndpoint: 1,
      secondaryEndpoints: 3
    }
  },
  factorial2x2: {
    name: '2×2 Factorial Design',
    structure: {
      factors: 2,
      levels: [2, 2],
      groups: 4,
      allocation: 'randomized',
      interactions: true
    }
  },
  crossover2Period: {
    name: 'Two-Period Crossover',
    structure: {
      periods: 2,
      sequences: 2,
      washout: true,
      carryover: 'tested'
    }
  },
  adaptiveDose: {
    name: 'Adaptive Dose-Finding',
    structure: {
      doses: 5,
      allocation: 'adaptive',
      stopping: 'futility+efficacy',
      interimAnalyses: 3
    }
  }
};

const RandomizationMethods = {
  simple: {
    name: 'Simple Randomization',
    description: 'Equal probability, like coin flip',
    advantages: ['Simple', 'Unpredictable'],
    disadvantages: ['Imbalance possible in small samples'],
    formula: 'P(treatment) = 0.5'
  },
  block: {
    name: 'Block Randomization',
    description: 'Ensures balance at intervals',
    advantages: ['Maintains balance', 'Good for interim analyses'],
    disadvantages: ['Predictable if block size known'],
    formula: 'Blocks of size 2k, k treatments each',
    parameters: ['blockSize']
  },
  stratified: {
    name: 'Stratified Randomization',
    description: 'Balance within subgroups',
    advantages: ['Controls confounders', 'Ensures representation'],
    disadvantages: ['Complex with many strata'],
    formula: 'Randomize within strata',
    parameters: ['strata']
  },
  minimization: {
    name: 'Minimization',
    description: 'Dynamic allocation to minimize imbalance',
    advantages: ['Optimal balance', 'Handles many factors'],
    disadvantages: ['Deterministic element', 'Complex'],
    formula: 'P ∝ imbalance score',
    parameters: ['factors', 'weights']
  },
  adaptive: {
    name: 'Response-Adaptive',
    description: 'Allocation based on outcomes',
    advantages: ['More patients get better treatment', 'Ethical'],
    disadvantages: ['Statistical complexity', 'Bias potential'],
    formula: 'P(treatment) ∝ success rate',
    parameters: ['adaptationRule']
  }
};

const QualityMetrics = {
  recruitment: {
    name: 'Recruitment Rate',
    target: '≥ 80% of planned',
    calculation: 'enrolled / eligible × 100%'
  },
  retention: {
    name: 'Retention Rate',
    target: '≥ 90%',
    calculation: 'completed / enrolled × 100%'
  },
  protocol_adherence: {
    name: 'Protocol Adherence',
    target: '≥ 95%',
    calculation: 'adherent / total × 100%'
  },
  data_completeness: {
    name: 'Data Completeness',
    target: '≥ 98%',
    calculation: 'non-missing / total × 100%'
  }
};

const StudyDesignWizard = () => {
  const dispatch = useDispatch();
  const { currentProject } = useSelector(state => state.project || {});
  
  const [wizardStep, setWizardStep] = useState(1);
  const [studyDesign, setStudyDesign] = useState({
    title: '',
    studyType: null,
    subtype: null,
    objectives: {
      primary: '',
      secondary: [],
      exploratory: []
    },
    hypotheses: {
      null: '',
      alternative: '',
      direction: 'two-sided'
    },
    population: {
      target: '',
      accessible: '',
      inclusion: [],
      exclusion: []
    },
    variables: {
      primary: null,
      secondary: [],
      covariates: [],
      confounders: []
    },
    design: {
      template: null,
      groups: 2,
      timepoints: 1,
      allocation: 'randomized',
      blinding: 'none',
      control: 'none'
    },
    sampleSize: {
      calculated: null,
      method: null,
      assumptions: {
        alpha: 0.05,
        power: 0.80,
        effectSize: null,
        attrition: 0.10
      }
    },
    randomization: {
      method: null,
      parameters: {},
      stratificationFactors: [],
      allocationConcealment: true
    },
    timeline: {
      phases: [],
      milestones: [],
      totalDuration: null
    },
    resources: {
      personnel: [],
      equipment: [],
      budget: null
    },
    quality: {
      monitoring: [],
      stopping: [],
      dataManagement: {}
    },
    ethics: {
      approvalRequired: true,
      consentType: 'written',
      risks: [],
      benefits: []
    },
    analysis: {
      primary: null,
      secondary: [],
      interim: [],
      missing: 'complete_case'
    }
  });
  
  const [validationErrors, setValidationErrors] = useState({});
  const [recommendations, setRecommendations] = useState([]);
  const [designScore, setDesignScore] = useState(null);

  const wizardSteps = [
    { id: 1, name: 'Study Type', icon: '📋' },
    { id: 2, name: 'Objectives', icon: '🎯' },
    { id: 3, name: 'Population', icon: '👥' },
    { id: 4, name: 'Variables', icon: '📊' },
    { id: 5, name: 'Design', icon: '🏗️' },
    { id: 6, name: 'Sample Size', icon: '📏' },
    { id: 7, name: 'Randomization', icon: '🎲' },
    { id: 8, name: 'Timeline', icon: '📅' },
    { id: 9, name: 'Quality', icon: '✓' },
    { id: 10, name: 'Review', icon: '📝' }
  ];

  const calculateSampleSize = useCallback(() => {
    const { studyType, design, sampleSize } = studyDesign;
    const { alpha, power, effectSize, attrition } = sampleSize.assumptions;
    
    if (!effectSize) return null;
    
    // Standard normal quantiles
    const z_alpha = studyDesign.hypotheses.direction === 'two-sided' 
      ? 1.96 : 1.645; // α = 0.05
    const z_beta = 0.84; // power = 0.80
    
    let n_per_group;
    
    switch (design.template) {
      case 'twoArmRCT':
        // Two-sample t-test formula
        n_per_group = 2 * Math.pow((z_alpha + z_beta) / effectSize, 2);
        break;
        
      case 'factorial2x2':
        // Factorial design (main effects)
        n_per_group = 4 * Math.pow((z_alpha + z_beta) / effectSize, 2);
        break;
        
      case 'crossover2Period':
        // Crossover design (paired)
        n_per_group = Math.pow((z_alpha + z_beta) / effectSize, 2) / 2;
        break;
        
      default:
        // Generic two-group comparison
        n_per_group = 2 * Math.pow((z_alpha + z_beta) / effectSize, 2);
    }
    
    // Adjust for attrition
    const adjusted_n = Math.ceil(n_per_group / (1 - attrition));
    const total_n = adjusted_n * design.groups;
    
    return {
      perGroup: adjusted_n,
      total: total_n,
      withoutAttrition: Math.ceil(n_per_group),
      method: 'Altman nomogram approximation'
    };
  }, [studyDesign]);

  const generateRandomizationSequence = useCallback(() => {
    const { method, parameters } = studyDesign.randomization;
    const n = studyDesign.sampleSize.calculated?.total || 100;
    
    let sequence = [];
    
    switch (method) {
      case 'simple':
        for (let i = 0; i < n; i++) {
          sequence.push(Math.random() < 0.5 ? 'A' : 'B');
        }
        break;
        
      case 'block':
        const blockSize = parameters.blockSize || 4;
        const nBlocks = Math.ceil(n / blockSize);
        
        for (let b = 0; b < nBlocks; b++) {
          const block = [];
          for (let i = 0; i < blockSize / 2; i++) {
            block.push('A', 'B');
          }
          // Shuffle block
          for (let i = block.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [block[i], block[j]] = [block[j], block[i]];
          }
          sequence.push(...block);
        }
        sequence = sequence.slice(0, n);
        break;
        
      case 'stratified':
        // Simplified stratified randomization
        const strata = parameters.strata || 2;
        const perStratum = Math.floor(n / strata);
        
        for (let s = 0; s < strata; s++) {
          for (let i = 0; i < perStratum; i++) {
            sequence.push(Math.random() < 0.5 ? 'A' : 'B');
          }
        }
        break;
        
      default:
        sequence = Array(n).fill('?');
    }
    
    return sequence;
  }, [studyDesign]);

  const evaluateDesignQuality = useCallback(() => {
    const scores = {
      objectives: 0,
      population: 0,
      variables: 0,
      design: 0,
      sampleSize: 0,
      randomization: 0,
      quality: 0,
      ethics: 0
    };
    
    // Objectives scoring
    if (studyDesign.objectives.primary) scores.objectives += 40;
    if (studyDesign.objectives.secondary.length > 0) scores.objectives += 30;
    if (studyDesign.hypotheses.null && studyDesign.hypotheses.alternative) scores.objectives += 30;
    
    // Population scoring
    if (studyDesign.population.target) scores.population += 25;
    if (studyDesign.population.inclusion.length >= 3) scores.population += 25;
    if (studyDesign.population.exclusion.length >= 2) scores.population += 25;
    if (studyDesign.population.accessible) scores.population += 25;
    
    // Variables scoring
    if (studyDesign.variables.primary) scores.variables += 40;
    if (studyDesign.variables.secondary.length > 0) scores.variables += 30;
    if (studyDesign.variables.covariates.length > 0) scores.variables += 30;
    
    // Design scoring
    if (studyDesign.design.template) scores.design += 30;
    if (studyDesign.design.allocation === 'randomized') scores.design += 30;
    if (studyDesign.design.blinding !== 'none') scores.design += 20;
    if (studyDesign.design.control !== 'none') scores.design += 20;
    
    // Sample size scoring
    if (studyDesign.sampleSize.calculated) scores.sampleSize += 50;
    if (studyDesign.sampleSize.assumptions.power >= 0.80) scores.sampleSize += 25;
    if (studyDesign.sampleSize.assumptions.attrition > 0) scores.sampleSize += 25;
    
    // Randomization scoring
    if (studyDesign.randomization.method) scores.randomization += 40;
    if (studyDesign.randomization.allocationConcealment) scores.randomization += 30;
    if (studyDesign.randomization.stratificationFactors.length > 0) scores.randomization += 30;
    
    // Quality scoring
    if (studyDesign.quality.monitoring.length > 0) scores.quality += 50;
    if (studyDesign.quality.stopping.length > 0) scores.quality += 50;
    
    // Ethics scoring
    if (studyDesign.ethics.approvalRequired) scores.ethics += 40;
    if (studyDesign.ethics.risks.length > 0) scores.ethics += 30;
    if (studyDesign.ethics.benefits.length > 0) scores.ethics += 30;
    
    const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0) / 8;
    
    return {
      overall: Math.round(totalScore),
      components: scores,
      grade: totalScore >= 90 ? 'A' : totalScore >= 80 ? 'B' : totalScore >= 70 ? 'C' : totalScore >= 60 ? 'D' : 'F',
      recommendations: generateRecommendations(scores)
    };
  }, [studyDesign]);

  const generateRecommendations = (scores) => {
    const recs = [];
    
    if (scores.objectives < 70) {
      recs.push({
        category: 'Objectives',
        priority: 'High',
        message: 'Clearly define primary and secondary objectives with measurable outcomes'
      });
    }
    
    if (scores.population < 70) {
      recs.push({
        category: 'Population',
        priority: 'High',
        message: 'Specify detailed inclusion/exclusion criteria for participant selection'
      });
    }
    
    if (scores.sampleSize < 70) {
      recs.push({
        category: 'Sample Size',
        priority: 'Critical',
        message: 'Calculate adequate sample size with power ≥ 80% and account for attrition'
      });
    }
    
    if (scores.randomization < 70 && studyDesign.design.allocation === 'randomized') {
      recs.push({
        category: 'Randomization',
        priority: 'High',
        message: 'Implement proper randomization with allocation concealment'
      });
    }
    
    if (scores.quality < 50) {
      recs.push({
        category: 'Quality',
        priority: 'Medium',
        message: 'Add quality monitoring and stopping rules for safety'
      });
    }
    
    return recs;
  };

  const generateProtocol = useCallback(() => {
    const protocol = {
      title: studyDesign.title || 'Study Protocol',
      version: '1.0',
      date: new Date().toISOString().split('T')[0],
      
      synopsis: {
        studyType: studyDesign.studyType,
        design: studyDesign.design.template,
        primaryObjective: studyDesign.objectives.primary,
        population: studyDesign.population.target,
        sampleSize: studyDesign.sampleSize.calculated?.total,
        duration: studyDesign.timeline.totalDuration
      },
      
      background: {
        rationale: 'Study rationale here',
        hypotheses: studyDesign.hypotheses
      },
      
      objectives: studyDesign.objectives,
      
      methods: {
        design: studyDesign.design,
        population: studyDesign.population,
        variables: studyDesign.variables,
        randomization: studyDesign.randomization,
        sampleSize: studyDesign.sampleSize
      },
      
      procedures: {
        screening: 'Screening procedures',
        enrollment: 'Enrollment procedures',
        intervention: 'Intervention details',
        followUp: 'Follow-up schedule'
      },
      
      statistical: {
        primaryAnalysis: studyDesign.analysis.primary,
        secondaryAnalyses: studyDesign.analysis.secondary,
        interimAnalyses: studyDesign.analysis.interim,
        missingData: studyDesign.analysis.missing
      },
      
      ethics: studyDesign.ethics,
      
      quality: studyDesign.quality,
      
      timeline: studyDesign.timeline,
      
      resources: studyDesign.resources
    };
    
    return protocol;
  }, [studyDesign]);

  const exportDesign = useCallback((format = 'json') => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `study_design_${timestamp}`;
    
    let content, mimeType;
    
    switch (format) {
      case 'json':
        content = JSON.stringify(studyDesign, null, 2);
        mimeType = 'application/json';
        break;
        
      case 'protocol':
        const protocol = generateProtocol();
        content = JSON.stringify(protocol, null, 2);
        mimeType = 'application/json';
        break;
        
      case 'csv':
        // Simplified CSV export
        const rows = [
          ['Parameter', 'Value'],
          ['Study Type', studyDesign.studyType],
          ['Design', studyDesign.design.template],
          ['Sample Size', studyDesign.sampleSize.calculated?.total],
          ['Power', studyDesign.sampleSize.assumptions.power],
          ['Alpha', studyDesign.sampleSize.assumptions.alpha],
          ['Randomization', studyDesign.randomization.method]
        ];
        content = rows.map(row => row.join(',')).join('\n');
        mimeType = 'text/csv';
        break;
        
      default:
        return;
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [studyDesign, generateProtocol]);

  const validateStep = useCallback((step) => {
    const errors = {};
    
    switch (step) {
      case 1:
        if (!studyDesign.studyType) errors.studyType = 'Select study type';
        if (!studyDesign.subtype) errors.subtype = 'Select study subtype';
        break;
        
      case 2:
        if (!studyDesign.objectives.primary) errors.primary = 'Define primary objective';
        if (!studyDesign.hypotheses.null) errors.null = 'State null hypothesis';
        if (!studyDesign.hypotheses.alternative) errors.alternative = 'State alternative hypothesis';
        break;
        
      case 3:
        if (!studyDesign.population.target) errors.target = 'Define target population';
        if (studyDesign.population.inclusion.length === 0) errors.inclusion = 'Add inclusion criteria';
        break;
        
      case 4:
        if (!studyDesign.variables.primary) errors.primary = 'Define primary outcome';
        break;
        
      case 5:
        if (!studyDesign.design.template) errors.template = 'Select design template';
        break;
        
      case 6:
        if (!studyDesign.sampleSize.assumptions.effectSize) errors.effectSize = 'Specify effect size';
        break;
        
      case 7:
        if (studyDesign.design.allocation === 'randomized' && !studyDesign.randomization.method) {
          errors.method = 'Select randomization method';
        }
        break;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [studyDesign]);

  const handleNext = () => {
    if (validateStep(wizardStep)) {
      if (wizardStep === 6) {
        // Calculate sample size when leaving that step
        const calculated = calculateSampleSize();
        setStudyDesign(prev => ({
          ...prev,
          sampleSize: {
            ...prev.sampleSize,
            calculated
          }
        }));
      }
      
      if (wizardStep === 10) {
        // Final step - evaluate design
        const score = evaluateDesignQuality();
        setDesignScore(score);
      } else {
        setWizardStep(prev => Math.min(prev + 1, 10));
      }
    }
  };

  const handlePrevious = () => {
    setWizardStep(prev => Math.max(prev - 1, 1));
    setValidationErrors({});
  };

  const renderStepContent = () => {
    switch (wizardStep) {
      case 1: // Study Type
        return (
          <div className="step-content study-type">
            <h3>Select Study Type and Design</h3>
            
            <div className="study-types">
              {Object.values(StudyTypes).map(type => (
                <div 
                  key={type.id}
                  className={`study-type-card ${studyDesign.studyType === type.id ? 'selected' : ''}`}
                  onClick={() => setStudyDesign(prev => ({ ...prev, studyType: type.id, subtype: null }))}
                >
                  <h4>{type.name}</h4>
                  <p>{type.description}</p>
                </div>
              ))}
            </div>
            
            {studyDesign.studyType && (
              <div className="subtypes">
                <h4>Select Specific Design</h4>
                <div className="subtype-grid">
                  {StudyTypes[studyDesign.studyType.toUpperCase()].subtypes.map(subtype => (
                    <div
                      key={subtype.id}
                      className={`subtype-card ${studyDesign.subtype === subtype.id ? 'selected' : ''}`}
                      onClick={() => setStudyDesign(prev => ({ ...prev, subtype: subtype.id }))}
                    >
                      <span className="icon">{subtype.icon}</span>
                      <span>{subtype.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
        
      case 2: // Objectives
        return (
          <div className="step-content objectives">
            <h3>Define Study Objectives and Hypotheses</h3>
            
            <div className="objective-section">
              <label>Primary Objective</label>
              <textarea
                value={studyDesign.objectives.primary}
                onChange={(e) => setStudyDesign(prev => ({
                  ...prev,
                  objectives: { ...prev.objectives, primary: e.target.value }
                }))}
                placeholder="Clear, measurable primary objective..."
                rows={3}
              />
              {validationErrors.primary && <span className="error">{validationErrors.primary}</span>}
            </div>
            
            <div className="objective-section">
              <label>Secondary Objectives</label>
              {studyDesign.objectives.secondary.map((obj, idx) => (
                <div key={idx} className="objective-row">
                  <input
                    type="text"
                    value={obj}
                    onChange={(e) => {
                      const newSecondary = [...studyDesign.objectives.secondary];
                      newSecondary[idx] = e.target.value;
                      setStudyDesign(prev => ({
                        ...prev,
                        objectives: { ...prev.objectives, secondary: newSecondary }
                      }));
                    }}
                    placeholder="Secondary objective..."
                  />
                  <button 
                    className="remove-btn"
                    onClick={() => {
                      const newSecondary = studyDesign.objectives.secondary.filter((_, i) => i !== idx);
                      setStudyDesign(prev => ({
                        ...prev,
                        objectives: { ...prev.objectives, secondary: newSecondary }
                      }));
                    }}
                  >×</button>
                </div>
              ))}
              <button 
                className="add-btn"
                onClick={() => setStudyDesign(prev => ({
                  ...prev,
                  objectives: { ...prev.objectives, secondary: [...prev.objectives.secondary, ''] }
                }))}
              >
                + Add Secondary Objective
              </button>
            </div>
            
            <div className="hypotheses-section">
              <h4>Hypotheses</h4>
              
              <div className="hypothesis">
                <label>Null Hypothesis (H₀)</label>
                <textarea
                  value={studyDesign.hypotheses.null}
                  onChange={(e) => setStudyDesign(prev => ({
                    ...prev,
                    hypotheses: { ...prev.hypotheses, null: e.target.value }
                  }))}
                  placeholder="State null hypothesis..."
                  rows={2}
                />
                {validationErrors.null && <span className="error">{validationErrors.null}</span>}
              </div>
              
              <div className="hypothesis">
                <label>Alternative Hypothesis (H₁)</label>
                <textarea
                  value={studyDesign.hypotheses.alternative}
                  onChange={(e) => setStudyDesign(prev => ({
                    ...prev,
                    hypotheses: { ...prev.hypotheses, alternative: e.target.value }
                  }))}
                  placeholder="State alternative hypothesis..."
                  rows={2}
                />
                {validationErrors.alternative && <span className="error">{validationErrors.alternative}</span>}
              </div>
              
              <div className="hypothesis-direction">
                <label>Test Direction</label>
                <select
                  value={studyDesign.hypotheses.direction}
                  onChange={(e) => setStudyDesign(prev => ({
                    ...prev,
                    hypotheses: { ...prev.hypotheses, direction: e.target.value }
                  }))}
                >
                  <option value="two-sided">Two-sided</option>
                  <option value="one-sided-greater">One-sided (greater)</option>
                  <option value="one-sided-less">One-sided (less)</option>
                </select>
              </div>
            </div>
          </div>
        );
        
      case 3: // Population
        return (
          <div className="step-content population">
            <h3>Define Study Population</h3>
            
            <div className="population-section">
              <label>Target Population</label>
              <textarea
                value={studyDesign.population.target}
                onChange={(e) => setStudyDesign(prev => ({
                  ...prev,
                  population: { ...prev.population, target: e.target.value }
                }))}
                placeholder="Describe target population..."
                rows={2}
              />
              {validationErrors.target && <span className="error">{validationErrors.target}</span>}
            </div>
            
            <div className="population-section">
              <label>Accessible Population</label>
              <textarea
                value={studyDesign.population.accessible}
                onChange={(e) => setStudyDesign(prev => ({
                  ...prev,
                  population: { ...prev.population, accessible: e.target.value }
                }))}
                placeholder="Describe accessible population..."
                rows={2}
              />
            </div>
            
            <div className="criteria-section">
              <h4>Inclusion Criteria</h4>
              {studyDesign.population.inclusion.map((criterion, idx) => (
                <div key={idx} className="criterion-row">
                  <span className="criterion-number">{idx + 1}.</span>
                  <input
                    type="text"
                    value={criterion}
                    onChange={(e) => {
                      const newInclusion = [...studyDesign.population.inclusion];
                      newInclusion[idx] = e.target.value;
                      setStudyDesign(prev => ({
                        ...prev,
                        population: { ...prev.population, inclusion: newInclusion }
                      }));
                    }}
                    placeholder="Inclusion criterion..."
                  />
                  <button 
                    className="remove-btn"
                    onClick={() => {
                      const newInclusion = studyDesign.population.inclusion.filter((_, i) => i !== idx);
                      setStudyDesign(prev => ({
                        ...prev,
                        population: { ...prev.population, inclusion: newInclusion }
                      }));
                    }}
                  >×</button>
                </div>
              ))}
              <button 
                className="add-btn"
                onClick={() => setStudyDesign(prev => ({
                  ...prev,
                  population: { ...prev.population, inclusion: [...prev.population.inclusion, ''] }
                }))}
              >
                + Add Inclusion Criterion
              </button>
              {validationErrors.inclusion && <span className="error">{validationErrors.inclusion}</span>}
            </div>
            
            <div className="criteria-section">
              <h4>Exclusion Criteria</h4>
              {studyDesign.population.exclusion.map((criterion, idx) => (
                <div key={idx} className="criterion-row">
                  <span className="criterion-number">{idx + 1}.</span>
                  <input
                    type="text"
                    value={criterion}
                    onChange={(e) => {
                      const newExclusion = [...studyDesign.population.exclusion];
                      newExclusion[idx] = e.target.value;
                      setStudyDesign(prev => ({
                        ...prev,
                        population: { ...prev.population, exclusion: newExclusion }
                      }));
                    }}
                    placeholder="Exclusion criterion..."
                  />
                  <button 
                    className="remove-btn"
                    onClick={() => {
                      const newExclusion = studyDesign.population.exclusion.filter((_, i) => i !== idx);
                      setStudyDesign(prev => ({
                        ...prev,
                        population: { ...prev.population, exclusion: newExclusion }
                      }));
                    }}
                  >×</button>
                </div>
              ))}
              <button 
                className="add-btn"
                onClick={() => setStudyDesign(prev => ({
                  ...prev,
                  population: { ...prev.population, exclusion: [...prev.population.exclusion, ''] }
                }))}
              >
                + Add Exclusion Criterion
              </button>
            </div>
          </div>
        );
        
      case 4: // Variables
        return (
          <div className="step-content variables">
            <h3>Define Study Variables</h3>
            
            <div className="variable-section">
              <label>Primary Outcome Variable</label>
              <input
                type="text"
                value={studyDesign.variables.primary || ''}
                onChange={(e) => setStudyDesign(prev => ({
                  ...prev,
                  variables: { ...prev.variables, primary: e.target.value }
                }))}
                placeholder="e.g., Change in blood pressure after 12 weeks"
              />
              {validationErrors.primary && <span className="error">{validationErrors.primary}</span>}
            </div>
            
            <div className="variable-section">
              <label>Secondary Outcome Variables</label>
              {studyDesign.variables.secondary.map((variable, idx) => (
                <div key={idx} className="variable-row">
                  <input
                    type="text"
                    value={variable}
                    onChange={(e) => {
                      const newSecondary = [...studyDesign.variables.secondary];
                      newSecondary[idx] = e.target.value;
                      setStudyDesign(prev => ({
                        ...prev,
                        variables: { ...prev.variables, secondary: newSecondary }
                      }));
                    }}
                    placeholder="Secondary outcome..."
                  />
                  <button 
                    className="remove-btn"
                    onClick={() => {
                      const newSecondary = studyDesign.variables.secondary.filter((_, i) => i !== idx);
                      setStudyDesign(prev => ({
                        ...prev,
                        variables: { ...prev.variables, secondary: newSecondary }
                      }));
                    }}
                  >×</button>
                </div>
              ))}
              <button 
                className="add-btn"
                onClick={() => setStudyDesign(prev => ({
                  ...prev,
                  variables: { ...prev.variables, secondary: [...prev.variables.secondary, ''] }
                }))}
              >
                + Add Secondary Outcome
              </button>
            </div>
            
            <div className="variable-section">
              <label>Covariates</label>
              {studyDesign.variables.covariates.map((covariate, idx) => (
                <div key={idx} className="variable-row">
                  <input
                    type="text"
                    value={covariate}
                    onChange={(e) => {
                      const newCovariates = [...studyDesign.variables.covariates];
                      newCovariates[idx] = e.target.value;
                      setStudyDesign(prev => ({
                        ...prev,
                        variables: { ...prev.variables, covariates: newCovariates }
                      }));
                    }}
                    placeholder="Covariate (e.g., age, gender, BMI)..."
                  />
                  <button 
                    className="remove-btn"
                    onClick={() => {
                      const newCovariates = studyDesign.variables.covariates.filter((_, i) => i !== idx);
                      setStudyDesign(prev => ({
                        ...prev,
                        variables: { ...prev.variables, covariates: newCovariates }
                      }));
                    }}
                  >×</button>
                </div>
              ))}
              <button 
                className="add-btn"
                onClick={() => setStudyDesign(prev => ({
                  ...prev,
                  variables: { ...prev.variables, covariates: [...prev.variables.covariates, ''] }
                }))}
              >
                + Add Covariate
              </button>
            </div>
          </div>
        );
        
      case 5: // Design
        return (
          <div className="step-content design">
            <h3>Study Design Configuration</h3>
            
            <div className="design-templates">
              <label>Select Design Template</label>
              <div className="template-grid">
                {Object.entries(DesignTemplates).map(([key, template]) => (
                  <div
                    key={key}
                    className={`template-card ${studyDesign.design.template === key ? 'selected' : ''}`}
                    onClick={() => setStudyDesign(prev => ({
                      ...prev,
                      design: { ...prev.design, template: key, ...template.structure }
                    }))}
                  >
                    <h4>{template.name}</h4>
                    <div className="template-details">
                      {Object.entries(template.structure).slice(0, 3).map(([param, value]) => (
                        <div key={param} className="detail">
                          <span className="param">{param}:</span>
                          <span className="value">{value.toString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {validationErrors.template && <span className="error">{validationErrors.template}</span>}
            </div>
            
            <div className="design-parameters">
              <div className="parameter-row">
                <label>Number of Groups</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={studyDesign.design.groups}
                  onChange={(e) => setStudyDesign(prev => ({
                    ...prev,
                    design: { ...prev.design, groups: parseInt(e.target.value) }
                  }))}
                />
              </div>
              
              <div className="parameter-row">
                <label>Allocation</label>
                <select
                  value={studyDesign.design.allocation}
                  onChange={(e) => setStudyDesign(prev => ({
                    ...prev,
                    design: { ...prev.design, allocation: e.target.value }
                  }))}
                >
                  <option value="randomized">Randomized</option>
                  <option value="non-randomized">Non-randomized</option>
                  <option value="quasi-experimental">Quasi-experimental</option>
                </select>
              </div>
              
              <div className="parameter-row">
                <label>Blinding</label>
                <select
                  value={studyDesign.design.blinding}
                  onChange={(e) => setStudyDesign(prev => ({
                    ...prev,
                    design: { ...prev.design, blinding: e.target.value }
                  }))}
                >
                  <option value="none">None (Open-label)</option>
                  <option value="single">Single-blind</option>
                  <option value="double">Double-blind</option>
                  <option value="triple">Triple-blind</option>
                </select>
              </div>
              
              <div className="parameter-row">
                <label>Control Type</label>
                <select
                  value={studyDesign.design.control}
                  onChange={(e) => setStudyDesign(prev => ({
                    ...prev,
                    design: { ...prev.design, control: e.target.value }
                  }))}
                >
                  <option value="none">No control</option>
                  <option value="placebo">Placebo</option>
                  <option value="active">Active control</option>
                  <option value="standard">Standard care</option>
                  <option value="historical">Historical control</option>
                </select>
              </div>
            </div>
          </div>
        );
        
      case 6: // Sample Size
        return (
          <div className="step-content sample-size">
            <h3>Sample Size Calculation</h3>
            
            <div className="assumptions">
              <h4>Statistical Assumptions</h4>
              
              <div className="assumption-row">
                <label>Significance Level (α)</label>
                <select
                  value={studyDesign.sampleSize.assumptions.alpha}
                  onChange={(e) => setStudyDesign(prev => ({
                    ...prev,
                    sampleSize: {
                      ...prev.sampleSize,
                      assumptions: { ...prev.sampleSize.assumptions, alpha: parseFloat(e.target.value) }
                    }
                  }))}
                >
                  <option value={0.01}>0.01</option>
                  <option value={0.05}>0.05</option>
                  <option value={0.10}>0.10</option>
                </select>
              </div>
              
              <div className="assumption-row">
                <label>Statistical Power (1-β)</label>
                <select
                  value={studyDesign.sampleSize.assumptions.power}
                  onChange={(e) => setStudyDesign(prev => ({
                    ...prev,
                    sampleSize: {
                      ...prev.sampleSize,
                      assumptions: { ...prev.sampleSize.assumptions, power: parseFloat(e.target.value) }
                    }
                  }))}
                >
                  <option value={0.70}>70%</option>
                  <option value={0.80}>80%</option>
                  <option value={0.85}>85%</option>
                  <option value={0.90}>90%</option>
                  <option value={0.95}>95%</option>
                </select>
              </div>
              
              <div className="assumption-row">
                <label>Effect Size (Cohen's d)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="2.0"
                  value={studyDesign.sampleSize.assumptions.effectSize || ''}
                  onChange={(e) => setStudyDesign(prev => ({
                    ...prev,
                    sampleSize: {
                      ...prev.sampleSize,
                      assumptions: { ...prev.sampleSize.assumptions, effectSize: parseFloat(e.target.value) }
                    }
                  }))}
                  placeholder="e.g., 0.5 for medium effect"
                />
                {validationErrors.effectSize && <span className="error">{validationErrors.effectSize}</span>}
                <div className="effect-size-guide">
                  <span>Small: 0.2</span>
                  <span>Medium: 0.5</span>
                  <span>Large: 0.8</span>
                </div>
              </div>
              
              <div className="assumption-row">
                <label>Expected Attrition Rate</label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="0.5"
                  value={studyDesign.sampleSize.assumptions.attrition}
                  onChange={(e) => setStudyDesign(prev => ({
                    ...prev,
                    sampleSize: {
                      ...prev.sampleSize,
                      assumptions: { ...prev.sampleSize.assumptions, attrition: parseFloat(e.target.value) }
                    }
                  }))}
                />
                <span className="unit">({(studyDesign.sampleSize.assumptions.attrition * 100).toFixed(0)}%)</span>
              </div>
            </div>
            
            <button 
              className="calculate-btn"
              onClick={() => {
                const calculated = calculateSampleSize();
                setStudyDesign(prev => ({
                  ...prev,
                  sampleSize: { ...prev.sampleSize, calculated }
                }));
              }}
            >
              Calculate Sample Size
            </button>
            
            {studyDesign.sampleSize.calculated && (
              <div className="calculation-results">
                <h4>Sample Size Requirements</h4>
                <div className="result-grid">
                  <div className="result-item">
                    <label>Per Group (without attrition)</label>
                    <span className="value">{studyDesign.sampleSize.calculated.withoutAttrition}</span>
                  </div>
                  <div className="result-item">
                    <label>Per Group (with attrition)</label>
                    <span className="value">{studyDesign.sampleSize.calculated.perGroup}</span>
                  </div>
                  <div className="result-item total">
                    <label>Total Sample Size</label>
                    <span className="value">{studyDesign.sampleSize.calculated.total}</span>
                  </div>
                  <div className="result-item">
                    <label>Calculation Method</label>
                    <span className="value">{studyDesign.sampleSize.calculated.method}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
        
      case 7: // Randomization
        return (
          <div className="step-content randomization">
            <h3>Randomization Strategy</h3>
            
            {studyDesign.design.allocation === 'randomized' ? (
              <>
                <div className="randomization-methods">
                  <label>Select Randomization Method</label>
                  <div className="method-grid">
                    {Object.entries(RandomizationMethods).map(([key, method]) => (
                      <div
                        key={key}
                        className={`method-card ${studyDesign.randomization.method === key ? 'selected' : ''}`}
                        onClick={() => setStudyDesign(prev => ({
                          ...prev,
                          randomization: { ...prev.randomization, method: key }
                        }))}
                      >
                        <h4>{method.name}</h4>
                        <p className="description">{method.description}</p>
                        <div className="method-details">
                          <div className="advantages">
                            <strong>Advantages:</strong>
                            <ul>
                              {method.advantages.map((adv, idx) => (
                                <li key={idx}>{adv}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="formula">
                            <code>{method.formula}</code>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {validationErrors.method && <span className="error">{validationErrors.method}</span>}
                </div>
                
                {studyDesign.randomization.method === 'block' && (
                  <div className="method-parameters">
                    <label>Block Size</label>
                    <select
                      value={studyDesign.randomization.parameters.blockSize || 4}
                      onChange={(e) => setStudyDesign(prev => ({
                        ...prev,
                        randomization: {
                          ...prev.randomization,
                          parameters: { ...prev.randomization.parameters, blockSize: parseInt(e.target.value) }
                        }
                      }))}
                    >
                      <option value={4}>4</option>
                      <option value={6}>6</option>
                      <option value={8}>8</option>
                      <option value={10}>10</option>
                    </select>
                  </div>
                )}
                
                {studyDesign.randomization.method === 'stratified' && (
                  <div className="stratification-factors">
                    <label>Stratification Factors</label>
                    {studyDesign.randomization.stratificationFactors.map((factor, idx) => (
                      <div key={idx} className="factor-row">
                        <input
                          type="text"
                          value={factor}
                          onChange={(e) => {
                            const newFactors = [...studyDesign.randomization.stratificationFactors];
                            newFactors[idx] = e.target.value;
                            setStudyDesign(prev => ({
                              ...prev,
                              randomization: { ...prev.randomization, stratificationFactors: newFactors }
                            }));
                          }}
                          placeholder="e.g., Age group, Gender, Disease severity"
                        />
                        <button 
                          className="remove-btn"
                          onClick={() => {
                            const newFactors = studyDesign.randomization.stratificationFactors.filter((_, i) => i !== idx);
                            setStudyDesign(prev => ({
                              ...prev,
                              randomization: { ...prev.randomization, stratificationFactors: newFactors }
                            }));
                          }}
                        >×</button>
                      </div>
                    ))}
                    <button 
                      className="add-btn"
                      onClick={() => setStudyDesign(prev => ({
                        ...prev,
                        randomization: {
                          ...prev.randomization,
                          stratificationFactors: [...prev.randomization.stratificationFactors, '']
                        }
                      }))}
                    >
                      + Add Stratification Factor
                    </button>
                  </div>
                )}
                
                <div className="allocation-concealment">
                  <label>
                    <input
                      type="checkbox"
                      checked={studyDesign.randomization.allocationConcealment}
                      onChange={(e) => setStudyDesign(prev => ({
                        ...prev,
                        randomization: { ...prev.randomization, allocationConcealment: e.target.checked }
                      }))}
                    />
                    Use allocation concealment (recommended)
                  </label>
                </div>
                
                {studyDesign.randomization.method && (
                  <div className="sequence-preview">
                    <h4>Randomization Sequence Preview</h4>
                    <div className="sequence">
                      {generateRandomizationSequence().slice(0, 20).map((allocation, idx) => (
                        <span key={idx} className={`allocation allocation-${allocation}`}>
                          {allocation}
                        </span>
                      ))}
                      <span className="more">...</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="non-randomized-note">
                <p>This is a non-randomized study. Randomization settings are not applicable.</p>
                <p>Consider potential confounders and selection bias in your analysis plan.</p>
              </div>
            )}
          </div>
        );
        
      case 8: // Timeline
        return (
          <div className="step-content timeline">
            <h3>Study Timeline and Milestones</h3>
            
            <div className="phases-section">
              <h4>Study Phases</h4>
              <div className="phase-list">
                <div className="phase-item">
                  <input type="text" placeholder="Phase name (e.g., Recruitment)" />
                  <input type="number" placeholder="Duration (weeks)" min="1" />
                  <input type="date" placeholder="Start date" />
                </div>
                <button className="add-btn">+ Add Phase</button>
              </div>
            </div>
            
            <div className="milestones-section">
              <h4>Key Milestones</h4>
              <div className="milestone-list">
                <div className="milestone-item">
                  <input type="text" placeholder="Milestone (e.g., First patient enrolled)" />
                  <input type="date" placeholder="Target date" />
                </div>
                <button className="add-btn">+ Add Milestone</button>
              </div>
            </div>
            
            <div className="total-duration">
              <label>Total Study Duration</label>
              <input
                type="number"
                value={studyDesign.timeline.totalDuration || ''}
                onChange={(e) => setStudyDesign(prev => ({
                  ...prev,
                  timeline: { ...prev.timeline, totalDuration: parseInt(e.target.value) }
                }))}
                placeholder="Months"
              />
              <span className="unit">months</span>
            </div>
          </div>
        );
        
      case 9: // Quality
        return (
          <div className="step-content quality">
            <h3>Quality Assurance and Monitoring</h3>
            
            <div className="quality-metrics">
              <h4>Quality Metrics</h4>
              <div className="metrics-grid">
                {Object.entries(QualityMetrics).map(([key, metric]) => (
                  <div key={key} className="metric-card">
                    <h5>{metric.name}</h5>
                    <div className="metric-details">
                      <div className="target">Target: {metric.target}</div>
                      <div className="formula">Formula: {metric.calculation}</div>
                    </div>
                    <label>
                      <input
                        type="checkbox"
                        checked={studyDesign.quality.monitoring.includes(key)}
                        onChange={(e) => {
                          const monitoring = e.target.checked
                            ? [...studyDesign.quality.monitoring, key]
                            : studyDesign.quality.monitoring.filter(m => m !== key);
                          setStudyDesign(prev => ({
                            ...prev,
                            quality: { ...prev.quality, monitoring }
                          }));
                        }}
                      />
                      Monitor this metric
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="stopping-rules">
              <h4>Stopping Rules</h4>
              <label>
                <input
                  type="checkbox"
                  checked={studyDesign.quality.stopping.includes('safety')}
                  onChange={(e) => {
                    const stopping = e.target.checked
                      ? [...studyDesign.quality.stopping, 'safety']
                      : studyDesign.quality.stopping.filter(s => s !== 'safety');
                    setStudyDesign(prev => ({
                      ...prev,
                      quality: { ...prev.quality, stopping }
                    }));
                  }}
                />
                Safety stopping rule
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={studyDesign.quality.stopping.includes('futility')}
                  onChange={(e) => {
                    const stopping = e.target.checked
                      ? [...studyDesign.quality.stopping, 'futility']
                      : studyDesign.quality.stopping.filter(s => s !== 'futility');
                    setStudyDesign(prev => ({
                      ...prev,
                      quality: { ...prev.quality, stopping }
                    }));
                  }}
                />
                Futility stopping rule
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={studyDesign.quality.stopping.includes('efficacy')}
                  onChange={(e) => {
                    const stopping = e.target.checked
                      ? [...studyDesign.quality.stopping, 'efficacy']
                      : studyDesign.quality.stopping.filter(s => s !== 'efficacy');
                    setStudyDesign(prev => ({
                      ...prev,
                      quality: { ...prev.quality, stopping }
                    }));
                  }}
                />
                Efficacy stopping rule
              </label>
            </div>
          </div>
        );
        
      case 10: // Review
        return (
          <div className="step-content review">
            <h3>Study Design Review</h3>
            
            {designScore && (
              <div className="design-score">
                <div className="score-header">
                  <h4>Design Quality Score</h4>
                  <div className={`overall-score grade-${designScore.grade}`}>
                    <span className="score">{designScore.overall}%</span>
                    <span className="grade">{designScore.grade}</span>
                  </div>
                </div>
                
                <div className="component-scores">
                  {Object.entries(designScore.components).map(([component, score]) => (
                    <div key={component} className="component-score">
                      <label>{component}</label>
                      <div className="score-bar">
                        <div 
                          className="score-fill"
                          style={{ width: `${score}%` }}
                        />
                      </div>
                      <span>{score}%</span>
                    </div>
                  ))}
                </div>
                
                {designScore.recommendations.length > 0 && (
                  <div className="recommendations">
                    <h5>Recommendations</h5>
                    {designScore.recommendations.map((rec, idx) => (
                      <div key={idx} className={`recommendation priority-${rec.priority.toLowerCase()}`}>
                        <span className="category">{rec.category}</span>
                        <span className="message">{rec.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            <div className="design-summary">
              <h4>Design Summary</h4>
              <div className="summary-grid">
                <div className="summary-item">
                  <label>Study Type</label>
                  <span>{studyDesign.studyType} - {studyDesign.subtype}</span>
                </div>
                <div className="summary-item">
                  <label>Design</label>
                  <span>{studyDesign.design.template}</span>
                </div>
                <div className="summary-item">
                  <label>Sample Size</label>
                  <span>{studyDesign.sampleSize.calculated?.total || 'Not calculated'}</span>
                </div>
                <div className="summary-item">
                  <label>Primary Outcome</label>
                  <span>{studyDesign.variables.primary || 'Not specified'}</span>
                </div>
                <div className="summary-item">
                  <label>Randomization</label>
                  <span>{studyDesign.randomization.method || 'Not applicable'}</span>
                </div>
                <div className="summary-item">
                  <label>Duration</label>
                  <span>{studyDesign.timeline.totalDuration || 'Not specified'} months</span>
                </div>
              </div>
            </div>
            
            <div className="export-options">
              <h4>Export Options</h4>
              <div className="export-buttons">
                <button onClick={() => exportDesign('json')}>
                  Export as JSON
                </button>
                <button onClick={() => exportDesign('protocol')}>
                  Generate Protocol
                </button>
                <button onClick={() => exportDesign('csv')}>
                  Export Summary CSV
                </button>
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="study-design-wizard">
      <div className="wizard-header">
        <h2>Study Design Wizard</h2>
        <div className="wizard-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${(wizardStep / 10) * 100}%` }}
            />
          </div>
          <div className="step-indicators">
            {wizardSteps.map(step => (
              <div
                key={step.id}
                className={`step-indicator ${wizardStep === step.id ? 'active' : ''} ${wizardStep > step.id ? 'completed' : ''}`}
                onClick={() => step.id < wizardStep && setWizardStep(step.id)}
              >
                <span className="step-icon">{step.icon}</span>
                <span className="step-name">{step.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="wizard-body">
        {renderStepContent()}
      </div>
      
      <div className="wizard-footer">
        <div className="navigation-buttons">
          <button 
            className="prev-btn"
            onClick={handlePrevious}
            disabled={wizardStep === 1}
          >
            ← Previous
          </button>
          
          <div className="step-info">
            Step {wizardStep} of {wizardSteps.length}
          </div>
          
          <button 
            className="next-btn"
            onClick={handleNext}
          >
            {wizardStep === 10 ? 'Complete' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudyDesignWizard;