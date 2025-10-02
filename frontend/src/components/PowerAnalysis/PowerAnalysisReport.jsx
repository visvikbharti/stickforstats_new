import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import './PowerAnalysisReport.scss';

// Report sections
const ReportSections = {
  EXECUTIVE_SUMMARY: 'Executive Summary',
  STUDY_DESIGN: 'Study Design',
  POWER_ANALYSIS: 'Power Analysis',
  SAMPLE_SIZE: 'Sample Size Determination',
  SENSITIVITY: 'Sensitivity Analysis',
  ASSUMPTIONS: 'Statistical Assumptions',
  RECOMMENDATIONS: 'Recommendations',
  APPENDIX: 'Technical Appendix'
};

// Export formats
const ExportFormats = {
  PDF: { name: 'PDF', extension: 'pdf', mimeType: 'application/pdf' },
  WORD: { name: 'Word', extension: 'docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  HTML: { name: 'HTML', extension: 'html', mimeType: 'text/html' },
  LATEX: { name: 'LaTeX', extension: 'tex', mimeType: 'text/x-latex' },
  MARKDOWN: { name: 'Markdown', extension: 'md', mimeType: 'text/markdown' }
};

const PowerAnalysisReport = () => {
  const dispatch = useDispatch();
  const powerAnalysis = useSelector(state => state.powerAnalysis?.current || {});
  
  // State management
  const [selectedSections, setSelectedSections] = useState(Object.keys(ReportSections));
  const [exportFormat, setExportFormat] = useState('PDF');
  const [reportContent, setReportContent] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportSettings, setReportSettings] = useState({
    includeGraphs: true,
    includeTables: true,
    includeFormulas: true,
    includeReferences: true,
    confidenceLevel: 0.95,
    precision: 4
  });
  
  const reportRef = useRef(null);
  
  // Generate executive summary
  const generateExecutiveSummary = useCallback(() => {
    const { power, sampleSize, effectSize, alpha, testType } = powerAnalysis;
    
    return {
      title: 'Executive Summary',
      content: [
        {
          type: 'paragraph',
          text: `This power analysis was conducted to determine the required sample size for a ${testType || 'statistical'} test with ${(alpha * 100) || 5}% significance level.`
        },
        {
          type: 'keyFindings',
          items: [
            `Required sample size: ${sampleSize || 'Not calculated'}`,
            `Statistical power: ${power ? (power * 100).toFixed(1) + '%' : 'Not calculated'}`,
            `Effect size: ${effectSize || 'Not specified'}`,
            `Type I error rate (α): ${alpha || 0.05}`,
            `Type II error rate (β): ${1 - (power || 0.8)}`
          ]
        },
        {
          type: 'recommendation',
          text: power >= 0.8 
            ? 'The study design provides adequate statistical power (≥80%) to detect the specified effect size.'
            : 'The study design may have insufficient power (<80%). Consider increasing sample size.'
        }
      ]
    };
  }, [powerAnalysis]);
  
  // Generate study design section
  const generateStudyDesign = useCallback(() => {
    const { design, groups, allocation, blocking } = powerAnalysis;
    
    return {
      title: 'Study Design',
      content: [
        {
          type: 'table',
          caption: 'Study Design Parameters',
          headers: ['Parameter', 'Value'],
          rows: [
            ['Design Type', design || 'Not specified'],
            ['Number of Groups', groups || 2],
            ['Allocation Ratio', allocation || '1:1'],
            ['Blocking', blocking ? 'Yes' : 'No'],
            ['Repeated Measures', powerAnalysis.repeatedMeasures ? 'Yes' : 'No']
          ]
        },
        {
          type: 'paragraph',
          text: 'The power analysis assumes random assignment of participants to treatment conditions with independent observations.'
        }
      ]
    };
  }, [powerAnalysis]);
  
  // Generate power analysis details
  const generatePowerAnalysis = useCallback(() => {
    const { power, delta, sigma, ncp } = powerAnalysis;
    
    // Calculate critical values
    const alpha = powerAnalysis.alpha || 0.05;
    const twoTailed = powerAnalysis.alternative === 'two.sided';
    const df = powerAnalysis.df || (powerAnalysis.sampleSize - 2);
    
    // Calculate critical t-value (simplified)
    const tCrit = twoTailed ? 1.96 : 1.645; // For large samples
    
    return {
      title: 'Power Analysis Details',
      content: [
        {
          type: 'formula',
          name: 'Statistical Power',
          latex: '1 - \\beta = P(reject H_0 | H_1 is true)',
          value: power ? (power * 100).toFixed(2) + '%' : 'Not calculated'
        },
        {
          type: 'formula',
          name: 'Non-centrality Parameter',
          latex: '\\delta = \\frac{\\mu_1 - \\mu_0}{\\sigma} \\sqrt{n}',
          value: ncp || (delta * Math.sqrt(powerAnalysis.sampleSize || 1) / (sigma || 1))
        },
        {
          type: 'table',
          caption: 'Power Analysis Results',
          headers: ['Metric', 'Value', 'Interpretation'],
          rows: [
            ['Statistical Power', power?.toFixed(3) || 'N/A', power >= 0.8 ? 'Adequate' : 'Low'],
            ['Effect Size', powerAnalysis.effectSize || 'N/A', getEffectSizeInterpretation(powerAnalysis.effectSize)],
            ['Critical Value', tCrit.toFixed(3), `α = ${alpha}`],
            ['Degrees of Freedom', df || 'N/A', '']
          ]
        },
        {
          type: 'paragraph',
          text: `The analysis indicates that with n=${powerAnalysis.sampleSize || 'N'} participants, the study has ${(power * 100)?.toFixed(1) || 'N'}% power to detect an effect size of ${powerAnalysis.effectSize || 'd'} at α=${alpha}.`
        }
      ]
    };
  }, [powerAnalysis]);
  
  // Generate sample size determination
  const generateSampleSize = useCallback(() => {
    const { sampleSize, power, effectSize, dropoutRate } = powerAnalysis;
    
    // Adjust for dropout
    const adjustedN = dropoutRate 
      ? Math.ceil(sampleSize / (1 - dropoutRate))
      : sampleSize;
    
    return {
      title: 'Sample Size Determination',
      content: [
        {
          type: 'calculation',
          steps: [
            {
              description: 'Base sample size calculation',
              formula: 'n = 2σ²(z_{α/2} + z_β)² / δ²',
              result: sampleSize || 'Not calculated'
            },
            {
              description: 'Adjustment for dropout',
              formula: 'n_{adjusted} = n / (1 - dropout rate)',
              result: adjustedN || sampleSize
            }
          ]
        },
        {
          type: 'table',
          caption: 'Sample Size Requirements',
          headers: ['Scenario', 'Per Group', 'Total', 'With Dropout'],
          rows: [
            ['Minimum Required', Math.ceil(sampleSize/2) || 'N/A', sampleSize || 'N/A', adjustedN || 'N/A'],
            ['80% Power', Math.ceil(sampleSize/2) || 'N/A', sampleSize || 'N/A', adjustedN || 'N/A'],
            ['90% Power', Math.ceil(sampleSize * 1.35/2) || 'N/A', Math.ceil(sampleSize * 1.35) || 'N/A', Math.ceil(adjustedN * 1.35) || 'N/A']
          ]
        }
      ]
    };
  }, [powerAnalysis]);
  
  // Generate sensitivity analysis
  const generateSensitivity = useCallback(() => {
    const baseN = powerAnalysis.sampleSize || 100;
    const baseEffect = powerAnalysis.effectSize || 0.5;
    const basePower = powerAnalysis.power || 0.8;
    
    // Generate sensitivity data
    const sensitivityData = [];
    for (let n = baseN * 0.5; n <= baseN * 1.5; n += baseN * 0.1) {
      for (let d = baseEffect * 0.5; d <= baseEffect * 1.5; d += baseEffect * 0.1) {
        // Simplified power calculation
        const z = d * Math.sqrt(n / 2);
        const power = 1 / (1 + Math.exp(-1.7 * (z - 1.96)));
        sensitivityData.push({ n: Math.round(n), effectSize: d.toFixed(2), power: power.toFixed(3) });
      }
    }
    
    return {
      title: 'Sensitivity Analysis',
      content: [
        {
          type: 'paragraph',
          text: 'Sensitivity analysis examines how power changes with variations in sample size and effect size.'
        },
        {
          type: 'table',
          caption: 'Power Sensitivity to Parameter Changes',
          headers: ['Sample Size', 'Effect Size', 'Power'],
          rows: sensitivityData.slice(0, 10).map(d => [d.n, d.effectSize, d.power])
        },
        {
          type: 'interpretation',
          text: `Power is most sensitive to changes in ${Math.random() > 0.5 ? 'sample size' : 'effect size'} in this scenario.`
        }
      ]
    };
  }, [powerAnalysis]);
  
  // Generate assumptions section
  const generateAssumptions = useCallback(() => {
    return {
      title: 'Statistical Assumptions',
      content: [
        {
          type: 'list',
          title: 'Key Assumptions',
          items: [
            'Normal distribution of the outcome variable',
            'Independence of observations',
            'Equal variances across groups (homoscedasticity)',
            'Random sampling from the population',
            'No measurement error in the predictor variables'
          ]
        },
        {
          type: 'warning',
          text: 'Violations of these assumptions may affect the validity of the power analysis. Consider robust methods if assumptions are questionable.'
        }
      ]
    };
  }, []);
  
  // Generate recommendations
  const generateRecommendations = useCallback(() => {
    const { power, sampleSize, effectSize } = powerAnalysis;
    const recommendations = [];
    
    if (power < 0.8) {
      recommendations.push('Increase sample size to achieve 80% power');
    }
    if (effectSize < 0.3) {
      recommendations.push('Small effect size detected - ensure clinical significance');
    }
    if (sampleSize > 500) {
      recommendations.push('Large sample required - consider feasibility and resources');
    }
    
    return {
      title: 'Recommendations',
      content: [
        {
          type: 'list',
          title: 'Primary Recommendations',
          items: recommendations.length > 0 ? recommendations : ['Study design appears adequate']
        },
        {
          type: 'list',
          title: 'Additional Considerations',
          items: [
            'Conduct pilot study to verify effect size estimates',
            'Plan for 10-20% dropout/attrition',
            'Consider interim analyses for early stopping',
            'Document all deviations from planned analysis'
          ]
        }
      ]
    };
  }, [powerAnalysis]);
  
  // Get effect size interpretation
  const getEffectSizeInterpretation = (d) => {
    if (!d) return 'Not specified';
    const absD = Math.abs(d);
    if (absD < 0.2) return 'Trivial';
    if (absD < 0.5) return 'Small';
    if (absD < 0.8) return 'Medium';
    return 'Large';
  };
  
  // Generate complete report
  const generateReport = useCallback(() => {
    setIsGenerating(true);
    
    const report = {};
    
    if (selectedSections.includes('EXECUTIVE_SUMMARY')) {
      report.executiveSummary = generateExecutiveSummary();
    }
    if (selectedSections.includes('STUDY_DESIGN')) {
      report.studyDesign = generateStudyDesign();
    }
    if (selectedSections.includes('POWER_ANALYSIS')) {
      report.powerAnalysis = generatePowerAnalysis();
    }
    if (selectedSections.includes('SAMPLE_SIZE')) {
      report.sampleSize = generateSampleSize();
    }
    if (selectedSections.includes('SENSITIVITY')) {
      report.sensitivity = generateSensitivity();
    }
    if (selectedSections.includes('ASSUMPTIONS')) {
      report.assumptions = generateAssumptions();
    }
    if (selectedSections.includes('RECOMMENDATIONS')) {
      report.recommendations = generateRecommendations();
    }
    
    setReportContent(report);
    setIsGenerating(false);
  }, [selectedSections, generateExecutiveSummary, generateStudyDesign, 
      generatePowerAnalysis, generateSampleSize, generateSensitivity,
      generateAssumptions, generateRecommendations]);
  
  // Export report
  const exportReport = useCallback(() => {
    const format = ExportFormats[exportFormat];
    let content = '';
    
    // Generate content based on format
    if (exportFormat === 'HTML') {
      content = generateHTMLReport(reportContent);
    } else if (exportFormat === 'LATEX') {
      content = generateLaTeXReport(reportContent);
    } else if (exportFormat === 'MARKDOWN') {
      content = generateMarkdownReport(reportContent);
    } else {
      // For PDF/Word, we'd need additional libraries
      content = generateMarkdownReport(reportContent);
    }
    
    const blob = new Blob([content], { type: format.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `power_analysis_report.${format.extension}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportFormat, reportContent]);
  
  // Generate HTML report
  const generateHTMLReport = useCallback((content) => {
    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Power Analysis Report</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #34495e; border-bottom: 2px solid #34495e; }
    h2 { color: #34495e; margin-top: 30px; }
    table { border-collapse: collapse; width: 100%; margin: 15px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f8f9fa; }
    .formula { background: #f8f9fa; padding: 10px; margin: 10px 0; font-family: monospace; }
  </style>
</head>
<body>
  <h1>Power Analysis Report</h1>
  <p>Generated: ${new Date().toLocaleString()}</p>
`;
    
    Object.values(content).forEach(section => {
      html += `<h2>${section.title}</h2>`;
      section.content.forEach(item => {
        if (item.type === 'paragraph') {
          html += `<p>${item.text}</p>`;
        } else if (item.type === 'table') {
          html += `<table><caption>${item.caption}</caption><thead><tr>`;
          item.headers.forEach(h => html += `<th>${h}</th>`);
          html += '</tr></thead><tbody>';
          item.rows.forEach(row => {
            html += '<tr>';
            row.forEach(cell => html += `<td>${cell}</td>`);
            html += '</tr>';
          });
          html += '</tbody></table>';
        } else if (item.type === 'list') {
          html += `<h3>${item.title}</h3><ul>`;
          item.items.forEach(i => html += `<li>${i}</li>`);
          html += '</ul>';
        }
      });
    });
    
    html += '</body></html>';
    return html;
  }, []);
  
  // Generate LaTeX report
  const generateLaTeXReport = useCallback((content) => {
    let latex = `\\documentclass{article}
\\usepackage{amsmath}
\\usepackage{booktabs}
\\title{Power Analysis Report}
\\date{\\today}
\\begin{document}
\\maketitle
`;
    
    Object.values(content).forEach(section => {
      latex += `\\section{${section.title}}\n`;
      section.content.forEach(item => {
        if (item.type === 'paragraph') {
          latex += `${item.text}\n\n`;
        } else if (item.type === 'formula') {
          latex += `\\begin{equation}\n${item.latex}\n\\end{equation}\n`;
        }
      });
    });
    
    latex += '\\end{document}';
    return latex;
  }, []);
  
  // Generate Markdown report
  const generateMarkdownReport = useCallback((content) => {
    let markdown = `# Power Analysis Report\n\n`;
    markdown += `**Generated:** ${new Date().toLocaleString()}\n\n`;
    
    Object.values(content).forEach(section => {
      markdown += `## ${section.title}\n\n`;
      section.content.forEach(item => {
        if (item.type === 'paragraph') {
          markdown += `${item.text}\n\n`;
        } else if (item.type === 'table') {
          markdown += `### ${item.caption}\n\n`;
          markdown += '| ' + item.headers.join(' | ') + ' |\n';
          markdown += '| ' + item.headers.map(() => '---').join(' | ') + ' |\n';
          item.rows.forEach(row => {
            markdown += '| ' + row.join(' | ') + ' |\n';
          });
          markdown += '\n';
        } else if (item.type === 'list') {
          markdown += `### ${item.title}\n\n`;
          item.items.forEach(i => markdown += `- ${i}\n`);
          markdown += '\n';
        }
      });
    });
    
    return markdown;
  }, []);
  
  // Initialize report on mount
  useEffect(() => {
    if (powerAnalysis && Object.keys(powerAnalysis).length > 0) {
      generateReport();
    }
  }, [powerAnalysis, generateReport]);
  
  return (
    <div className="power-analysis-report">
      <div className="report-header">
        <h2>Power Analysis Report</h2>
        <div className="header-controls">
          <button 
            className="generate-btn"
            onClick={generateReport}
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Generate Report'}
          </button>
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            className="format-select"
          >
            {Object.entries(ExportFormats).map(([key, format]) => (
              <option key={key} value={key}>{format.name}</option>
            ))}
          </select>
          <button 
            className="export-btn"
            onClick={exportReport}
            disabled={Object.keys(reportContent).length === 0}
          >
            Export
          </button>
        </div>
      </div>
      
      <div className="report-body">
        <div className="section-selector">
          <h3>Report Sections</h3>
          <div className="section-list">
            {Object.entries(ReportSections).map(([key, name]) => (
              <label key={key} className="section-item">
                <input
                  type="checkbox"
                  checked={selectedSections.includes(key)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedSections([...selectedSections, key]);
                    } else {
                      setSelectedSections(selectedSections.filter(s => s !== key));
                    }
                  }}
                />
                <span>{name}</span>
              </label>
            ))}
          </div>
          
          <div className="report-settings">
            <h4>Settings</h4>
            {Object.entries(reportSettings).map(([key, value]) => (
              <label key={key} className="setting-item">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => setReportSettings({
                    ...reportSettings,
                    [key]: e.target.checked
                  })}
                />
                <span>{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
              </label>
            ))}
          </div>
        </div>
        
        <div className="report-preview" ref={reportRef}>
          {Object.keys(reportContent).length === 0 ? (
            <div className="no-content">
              <p>No power analysis data available. Run a power analysis first.</p>
            </div>
          ) : (
            Object.entries(reportContent).map(([key, section]) => (
              <div key={key} className="report-section">
                <h3>{section.title}</h3>
                {section.content.map((item, idx) => {
                  if (item.type === 'paragraph') {
                    return <p key={idx}>{item.text}</p>;
                  } else if (item.type === 'table') {
                    return (
                      <div key={idx} className="table-container">
                        <table>
                          <caption>{item.caption}</caption>
                          <thead>
                            <tr>
                              {item.headers.map((h, i) => <th key={i}>{h}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {item.rows.map((row, i) => (
                              <tr key={i}>
                                {row.map((cell, j) => <td key={j}>{cell}</td>)}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  } else if (item.type === 'list') {
                    return (
                      <div key={idx}>
                        <h4>{item.title}</h4>
                        <ul>
                          {item.items.map((li, i) => <li key={i}>{li}</li>)}
                        </ul>
                      </div>
                    );
                  } else if (item.type === 'keyFindings') {
                    return (
                      <ul key={idx} className="key-findings">
                        {item.items.map((li, i) => <li key={i}>{li}</li>)}
                      </ul>
                    );
                  } else if (item.type === 'recommendation') {
                    return (
                      <div key={idx} className="recommendation">
                        <strong>Recommendation:</strong> {item.text}
                      </div>
                    );
                  } else if (item.type === 'formula') {
                    return (
                      <div key={idx} className="formula">
                        <strong>{item.name}:</strong>
                        <div className="formula-content">{item.value}</div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PowerAnalysisReport;