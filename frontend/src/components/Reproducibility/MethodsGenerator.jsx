import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import './MethodsGenerator.scss';

// Journal formats
const JournalFormats = {
  NATURE: {
    name: 'Nature',
    sections: ['Study Design', 'Participants', 'Randomization', 'Statistical Analysis', 'Data Availability'],
    wordLimit: 3000,
    style: 'concise',
    citations: 'numbered'
  },
  SCIENCE: {
    name: 'Science',
    sections: ['Materials and Methods', 'Statistical Analysis', 'Data and Code Availability'],
    wordLimit: 2500,
    style: 'detailed',
    citations: 'numbered'
  },
  PLOS: {
    name: 'PLOS',
    sections: ['Study Design', 'Ethics Statement', 'Participants', 'Data Collection', 'Statistical Analysis'],
    wordLimit: null,
    style: 'comprehensive',
    citations: 'author-year'
  },
  CELL: {
    name: 'Cell',
    sections: ['STAR Methods', 'Experimental Model', 'Quantification', 'Statistical Analysis'],
    wordLimit: null,
    style: 'structured',
    citations: 'numbered'
  },
  JAMA: {
    name: 'JAMA',
    sections: ['Study Design', 'Setting', 'Participants', 'Main Outcomes', 'Statistical Analysis'],
    wordLimit: 3000,
    style: 'clinical',
    citations: 'numbered'
  },
  CUSTOM: {
    name: 'Custom',
    sections: [],
    wordLimit: null,
    style: 'flexible',
    citations: 'flexible'
  }
};

// Method components to track
const MethodComponents = {
  DESIGN: {
    name: 'Study Design',
    elements: [
      'Study type',
      'Design structure',
      'Blinding',
      'Control groups',
      'Randomization'
    ]
  },
  SAMPLING: {
    name: 'Sampling',
    elements: [
      'Population',
      'Inclusion criteria',
      'Exclusion criteria',
      'Sample size calculation',
      'Recruitment'
    ]
  },
  MEASUREMENTS: {
    name: 'Measurements',
    elements: [
      'Primary outcomes',
      'Secondary outcomes',
      'Measurement tools',
      'Validation',
      'Timing'
    ]
  },
  ANALYSIS: {
    name: 'Statistical Analysis',
    elements: [
      'Descriptive statistics',
      'Inferential tests',
      'Effect sizes',
      'Confidence intervals',
      'Multiple comparisons',
      'Missing data'
    ]
  },
  SOFTWARE: {
    name: 'Software & Tools',
    elements: [
      'Statistical software',
      'Version numbers',
      'Packages/libraries',
      'Custom scripts',
      'Computational environment'
    ]
  },
  REPRODUCIBILITY: {
    name: 'Reproducibility',
    elements: [
      'Data availability',
      'Code availability',
      'Pre-registration',
      'Reporting guidelines',
      'Supplementary materials'
    ]
  }
};

// Statistical test descriptions
const StatisticalTests = {
  't-test': {
    description: 'Independent samples t-test',
    assumptions: 'normality, equal variances',
    citation: 'Student (1908)'
  },
  'ANOVA': {
    description: 'One-way analysis of variance',
    assumptions: 'normality, homogeneity of variances, independence',
    citation: 'Fisher (1925)'
  },
  'regression': {
    description: 'Multiple linear regression',
    assumptions: 'linearity, independence, homoscedasticity, normality of residuals',
    citation: null
  },
  'chi-square': {
    description: 'Pearson\'s chi-square test',
    assumptions: 'expected frequencies > 5',
    citation: 'Pearson (1900)'
  },
  'mann-whitney': {
    description: 'Mann-Whitney U test',
    assumptions: 'independent samples, ordinal scale',
    citation: 'Mann & Whitney (1947)'
  },
  'mixed-model': {
    description: 'Linear mixed-effects model',
    assumptions: 'linearity, normality of residuals and random effects',
    citation: 'Laird & Ware (1982)'
  }
};

const MethodsGenerator = () => {
  const dispatch = useDispatch();
  const analysisHistory = useSelector(state => state.analysis?.history || []);
  const projectInfo = useSelector(state => state.project?.info || {});
  
  // State management
  const [selectedFormat, setSelectedFormat] = useState('NATURE');
  const [methodsContent, setMethodsContent] = useState({});
  const [customSections, setCustomSections] = useState([]);
  const [includeDetails, setIncludeDetails] = useState({
    effectSizes: true,
    confidenceIntervals: true,
    assumptions: true,
    software: true,
    reproducibility: true,
    citations: true
  });
  const [wordCount, setWordCount] = useState(0);
  const [exportFormat, setExportFormat] = useState('markdown');
  const [generatedText, setGeneratedText] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [trackedAnalyses, setTrackedAnalyses] = useState([]);
  const [reportingGuideline, setReportingGuideline] = useState('CONSORT');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Track analysis from history
  const trackAnalysis = useCallback(() => {
    const analyses = [];
    
    // Parse analysis history for statistical tests
    analysisHistory.forEach(entry => {
      if (entry.type === 'statistical_test') {
        analyses.push({
          test: entry.test,
          variables: entry.variables,
          results: entry.results,
          timestamp: entry.timestamp
        });
      }
    });
    
    setTrackedAnalyses(analyses);
    return analyses;
  }, [analysisHistory]);
  
  // Generate methods section content
  const generateContent = useCallback(() => {
    const content = {};
    const format = JournalFormats[selectedFormat];
    
    // Study Design section
    content['Study Design'] = `This was a ${projectInfo.studyType || '[study type]'} study conducted from ${projectInfo.startDate || '[start date]'} to ${projectInfo.endDate || '[end date]'}. The study protocol was approved by ${projectInfo.ethicsCommittee || '[ethics committee]'} (approval number: ${projectInfo.ethicsNumber || '[number]'}).`;
    
    // Participants/Sampling section
    content['Participants'] = `Participants were recruited from ${projectInfo.recruitmentSite || '[recruitment site]'}. Inclusion criteria were: ${projectInfo.inclusionCriteria?.join(', ') || '[inclusion criteria]'}. Exclusion criteria were: ${projectInfo.exclusionCriteria?.join(', ') || '[exclusion criteria]'}. A total of ${projectInfo.sampleSize || '[n]'} participants were enrolled.`;
    
    // Statistical Analysis section
    let statsContent = 'Statistical analyses were performed using ';
    
    // Add software information
    if (includeDetails.software) {
      statsContent += `R version 4.3.0 (R Core Team, 2023) and Python version 3.11 with the following packages: numpy (v1.24.0), scipy (v1.10.0), statsmodels (v0.14.0). `;
    }
    
    // Add descriptive statistics
    statsContent += `Continuous variables are presented as mean ± standard deviation (SD) or median [interquartile range (IQR)] depending on distribution. Categorical variables are presented as frequencies and percentages. `;
    
    // Add inferential statistics
    if (trackedAnalyses.length > 0) {
      statsContent += 'The following statistical tests were performed: ';
      
      const testDescriptions = trackedAnalyses.map(analysis => {
        const testInfo = StatisticalTests[analysis.test];
        let desc = testInfo ? testInfo.description : analysis.test;
        
        if (includeDetails.assumptions && testInfo?.assumptions) {
          desc += ` (assumptions: ${testInfo.assumptions})`;
        }
        
        if (includeDetails.citations && testInfo?.citation) {
          desc += ` [${testInfo.citation}]`;
        }
        
        return desc;
      });
      
      statsContent += testDescriptions.join('; ') + '. ';
    }
    
    // Add effect sizes
    if (includeDetails.effectSizes) {
      statsContent += `Effect sizes were calculated using Cohen's d for t-tests, eta-squared for ANOVA, and Cramér's V for chi-square tests. `;
    }
    
    // Add confidence intervals
    if (includeDetails.confidenceIntervals) {
      statsContent += `All estimates are presented with 95% confidence intervals. `;
    }
    
    // Add significance level
    statsContent += `Statistical significance was set at α = 0.05. `;
    
    // Add multiple comparisons correction
    if (projectInfo.multipleComparisons) {
      statsContent += `Multiple comparisons were corrected using the ${projectInfo.correctionMethod || 'Bonferroni'} method. `;
    }
    
    // Add missing data handling
    if (projectInfo.missingData) {
      statsContent += `Missing data were handled using ${projectInfo.missingMethod || 'complete case analysis'}. `;
    }
    
    content['Statistical Analysis'] = statsContent;
    
    // Data Availability section
    if (includeDetails.reproducibility) {
      content['Data Availability'] = `The datasets generated and analyzed during the current study are available in the ${projectInfo.repository || '[repository name]'} repository, [${projectInfo.doi || 'DOI'}]. Analysis code is available at ${projectInfo.codeRepository || '[GitHub URL]'}. This study was pre-registered at ${projectInfo.preregistration || '[registry]'} (ID: ${projectInfo.registrationId || '[ID]'}).`;
    }
    
    // Reporting guideline statement
    content['Reporting'] = `This study is reported in accordance with the ${reportingGuideline} ${getGuidelineFullName(reportingGuideline)} guidelines.`;
    
    setMethodsContent(content);
    return content;
  }, [selectedFormat, projectInfo, trackedAnalyses, includeDetails, reportingGuideline]);
  
  // Get full name of reporting guideline
  const getGuidelineFullName = useCallback((guideline) => {
    const guidelines = {
      'CONSORT': 'Consolidated Standards of Reporting Trials',
      'STROBE': 'Strengthening the Reporting of Observational Studies in Epidemiology',
      'PRISMA': 'Preferred Reporting Items for Systematic Reviews and Meta-Analyses',
      'STARD': 'Standards for Reporting Diagnostic Accuracy',
      'ARRIVE': 'Animal Research: Reporting of In Vivo Experiments',
      'SPIRIT': 'Standard Protocol Items: Recommendations for Interventional Trials'
    };
    return guidelines[guideline] || guideline;
  }, []);
  
  // Generate full methods text
  const generateFullText = useCallback(() => {
    setIsGenerating(true);
    
    const format = JournalFormats[selectedFormat];
    const sections = format.sections.length > 0 ? format.sections : Object.keys(methodsContent);
    
    let fullText = '';
    
    // Add title
    fullText += '# Methods\n\n';
    
    // Add each section
    sections.forEach(section => {
      if (methodsContent[section]) {
        fullText += `## ${section}\n\n`;
        fullText += methodsContent[section] + '\n\n';
      }
    });
    
    // Add custom sections
    customSections.forEach(section => {
      if (section.content) {
        fullText += `## ${section.title}\n\n`;
        fullText += section.content + '\n\n';
      }
    });
    
    // Calculate word count
    const words = fullText.split(/\s+/).filter(word => word.length > 0).length;
    setWordCount(words);
    
    // Check word limit
    if (format.wordLimit && words > format.wordLimit) {
      fullText += `\n---\n⚠️ Word count: ${words} (exceeds ${format.wordLimit} word limit for ${format.name})\n`;
    }
    
    setGeneratedText(fullText);
    setIsGenerating(false);
    
    return fullText;
  }, [selectedFormat, methodsContent, customSections]);
  
  // Export methods section
  const exportMethods = useCallback(() => {
    let content = generatedText;
    let filename = 'methods';
    let mimeType = 'text/plain';
    
    switch (exportFormat) {
      case 'markdown':
        filename += '.md';
        mimeType = 'text/markdown';
        break;
        
      case 'latex':
        content = convertToLaTeX(generatedText);
        filename += '.tex';
        mimeType = 'text/x-latex';
        break;
        
      case 'word':
        content = convertToRTF(generatedText);
        filename += '.rtf';
        mimeType = 'application/rtf';
        break;
        
      case 'html':
        content = convertToHTML(generatedText);
        filename += '.html';
        mimeType = 'text/html';
        break;
        
      default:
        filename += '.txt';
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [generatedText, exportFormat]);
  
  // Convert to LaTeX format
  const convertToLaTeX = useCallback((text) => {
    let latex = '\\section{Methods}\n\n';
    
    const lines = text.split('\n');
    lines.forEach(line => {
      if (line.startsWith('# ')) {
        // Skip main title
      } else if (line.startsWith('## ')) {
        latex += `\\subsection{${line.substring(3)}}\n\n`;
      } else if (line.trim()) {
        latex += line + '\n';
      } else {
        latex += '\n';
      }
    });
    
    // Replace special characters
    latex = latex.replace(/±/g, '$\\pm$');
    latex = latex.replace(/α/g, '$\\alpha$');
    latex = latex.replace(/β/g, '$\\beta$');
    latex = latex.replace(/η²/g, '$\\eta^2$');
    
    return latex;
  }, []);
  
  // Convert to RTF format
  const convertToRTF = useCallback((text) => {
    let rtf = '{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}\\f0\\fs24\n';
    
    const lines = text.split('\n');
    lines.forEach(line => {
      if (line.startsWith('# ')) {
        rtf += `\\b\\fs32 ${line.substring(2)}\\b0\\fs24\\par\n`;
      } else if (line.startsWith('## ')) {
        rtf += `\\b\\fs28 ${line.substring(3)}\\b0\\fs24\\par\n`;
      } else if (line.trim()) {
        rtf += `${line}\\par\n`;
      } else {
        rtf += '\\par\n';
      }
    });
    
    rtf += '}';
    return rtf;
  }, []);
  
  // Convert to HTML format
  const convertToHTML = useCallback((text) => {
    let html = '<!DOCTYPE html>\n<html>\n<head>\n';
    html += '<meta charset="UTF-8">\n';
    html += '<title>Methods</title>\n';
    html += '<style>body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }</style>\n';
    html += '</head>\n<body>\n';
    
    const lines = text.split('\n');
    lines.forEach(line => {
      if (line.startsWith('# ')) {
        html += `<h1>${line.substring(2)}</h1>\n`;
      } else if (line.startsWith('## ')) {
        html += `<h2>${line.substring(3)}</h2>\n`;
      } else if (line.trim()) {
        html += `<p>${line}</p>\n`;
      }
    });
    
    html += '</body>\n</html>';
    return html;
  }, []);
  
  // Add custom section
  const addCustomSection = useCallback(() => {
    const title = prompt('Enter section title:');
    if (title) {
      setCustomSections(prev => [...prev, {
        id: `custom_${Date.now()}`,
        title,
        content: ''
      }]);
    }
  }, []);
  
  // Update custom section content
  const updateCustomSection = useCallback((id, content) => {
    setCustomSections(prev => prev.map(section =>
      section.id === id ? { ...section, content } : section
    ));
  }, []);
  
  // Generate checklist for reporting guideline
  const generateChecklist = useCallback(() => {
    const checklists = {
      'CONSORT': [
        'Title and abstract',
        'Introduction (Background and objectives)',
        'Methods (Trial design, Participants, Interventions, Outcomes, Sample size, Randomization, Blinding, Statistical methods)',
        'Results (Participant flow, Recruitment, Baseline data, Numbers analyzed, Outcomes and estimation, Ancillary analyses, Harms)',
        'Discussion (Limitations, Generalizability, Interpretation)',
        'Other information (Registration, Protocol, Funding)'
      ],
      'STROBE': [
        'Title and abstract',
        'Introduction (Background/rationale, Objectives)',
        'Methods (Study design, Setting, Participants, Variables, Data sources, Bias, Study size, Quantitative variables, Statistical methods)',
        'Results (Participants, Descriptive data, Outcome data, Main results, Other analyses)',
        'Discussion (Key results, Limitations, Interpretation, Generalizability)',
        'Other information (Funding)'
      ]
    };
    
    return checklists[reportingGuideline] || [];
  }, [reportingGuideline]);
  
  // Effects
  useEffect(() => {
    trackAnalysis();
  }, [trackAnalysis]);
  
  useEffect(() => {
    if (Object.keys(methodsContent).length === 0) {
      generateContent();
    }
  }, [generateContent, methodsContent]);
  
  return (
    <div className="methods-generator">
      <div className="generator-header">
        <h2>Methods Generator</h2>
        <div className="header-controls">
          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            className="format-select"
          >
            {Object.entries(JournalFormats).map(([key, format]) => (
              <option key={key} value={key}>
                {format.name} Format
              </option>
            ))}
          </select>
          
          <select
            value={reportingGuideline}
            onChange={(e) => setReportingGuideline(e.target.value)}
            className="guideline-select"
          >
            <option value="CONSORT">CONSORT</option>
            <option value="STROBE">STROBE</option>
            <option value="PRISMA">PRISMA</option>
            <option value="STARD">STARD</option>
            <option value="ARRIVE">ARRIVE</option>
            <option value="SPIRIT">SPIRIT</option>
          </select>
          
          <button
            className="generate-btn"
            onClick={() => {
              generateContent();
              generateFullText();
            }}
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Generate Methods'}
          </button>
          
          <button
            className="edit-btn"
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? 'Preview' : 'Edit'}
          </button>
        </div>
      </div>
      
      <div className="generator-body">
        <div className="configuration-panel">
          <div className="panel-section">
            <h3>Content Options</h3>
            <div className="options-list">
              {Object.entries(includeDetails).map(([key, value]) => (
                <label key={key} className="option-item">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => setIncludeDetails(prev => ({
                      ...prev,
                      [key]: e.target.checked
                    }))}
                  />
                  <span>{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div className="panel-section">
            <h3>Method Components</h3>
            <div className="components-list">
              {Object.entries(MethodComponents).map(([key, component]) => (
                <div key={key} className="component-item">
                  <h4>{component.name}</h4>
                  <ul>
                    {component.elements.map((element, index) => (
                      <li key={index}>{element}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          
          <div className="panel-section">
            <h3>Tracked Analyses</h3>
            <div className="analyses-list">
              {trackedAnalyses.length > 0 ? (
                trackedAnalyses.map((analysis, index) => (
                  <div key={index} className="analysis-item">
                    <span className="test-name">{analysis.test}</span>
                    <span className="test-vars">
                      {analysis.variables?.join(' vs ') || 'No variables'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="no-analyses">No analyses tracked yet</div>
              )}
            </div>
          </div>
          
          <div className="panel-section">
            <h3>Custom Sections</h3>
            <button onClick={addCustomSection} className="add-section-btn">
              + Add Section
            </button>
            <div className="custom-sections">
              {customSections.map(section => (
                <div key={section.id} className="custom-section">
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => {
                      setCustomSections(prev => prev.map(s =>
                        s.id === section.id ? { ...s, title: e.target.value } : s
                      ));
                    }}
                    className="section-title"
                  />
                  <textarea
                    value={section.content}
                    onChange={(e) => updateCustomSection(section.id, e.target.value)}
                    placeholder="Enter section content..."
                    className="section-content"
                  />
                  <button onClick={() => {
                    setCustomSections(prev => prev.filter(s => s.id !== section.id));
                  }}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="preview-panel">
          <div className="panel-header">
            <h3>Generated Methods</h3>
            <div className="word-count">
              {wordCount} words
              {JournalFormats[selectedFormat].wordLimit && (
                <span className={wordCount > JournalFormats[selectedFormat].wordLimit ? 'over-limit' : ''}>
                  {' '}/ {JournalFormats[selectedFormat].wordLimit} limit
                </span>
              )}
            </div>
          </div>
          
          <div className="methods-content">
            {editMode ? (
              <textarea
                value={generatedText}
                onChange={(e) => setGeneratedText(e.target.value)}
                className="methods-editor"
              />
            ) : (
              <div className="methods-preview">
                {generatedText.split('\n').map((line, index) => {
                  if (line.startsWith('# ')) {
                    return <h1 key={index}>{line.substring(2)}</h1>;
                  } else if (line.startsWith('## ')) {
                    return <h2 key={index}>{line.substring(3)}</h2>;
                  } else if (line.trim()) {
                    return <p key={index}>{line}</p>;
                  } else {
                    return <br key={index} />;
                  }
                })}
              </div>
            )}
          </div>
          
          <div className="checklist-section">
            <h4>{reportingGuideline} Checklist</h4>
            <div className="checklist-items">
              {generateChecklist().map((item, index) => (
                <label key={index} className="checklist-item">
                  <input type="checkbox" />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="generator-footer">
        <div className="export-controls">
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            className="export-format"
          >
            <option value="markdown">Markdown</option>
            <option value="latex">LaTeX</option>
            <option value="word">Word (RTF)</option>
            <option value="html">HTML</option>
          </select>
          <button onClick={exportMethods}>
            Export Methods
          </button>
          <button onClick={() => navigator.clipboard.writeText(generatedText)}>
            Copy to Clipboard
          </button>
        </div>
        
        <div className="footer-info">
          Format: {JournalFormats[selectedFormat].name} | 
          Guideline: {reportingGuideline} | 
          Sections: {Object.keys(methodsContent).length + customSections.length}
        </div>
      </div>
    </div>
  );
};

export default MethodsGenerator;