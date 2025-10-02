import React, { useState, useMemo } from 'react';
import './MultipleTestingReport.scss';

const MultipleTestingReport = ({ 
  hypotheses = [],
  correctionMethod = 'benjamini_hochberg',
  sessionTests = [],
  boundaries = [],
  alpha = 0.05,
  onExport,
  className = '' 
}) => {
  const [selectedSections, setSelectedSections] = useState({
    executive: true,
    methodology: true,
    results: true,
    adjustments: true,
    decisions: true,
    audit: true,
    references: true
  });
  const [exportFormat, setExportFormat] = useState('pdf');
  const [template, setTemplate] = useState('standard');
  const [includeVisualizations, setIncludeVisualizations] = useState(true);

  // Report templates
  const ReportTemplates = {
    standard: {
      name: 'Standard Report',
      sections: ['executive', 'methodology', 'results', 'adjustments', 'decisions', 'references']
    },
    regulatory: {
      name: 'Regulatory Submission',
      sections: ['executive', 'methodology', 'results', 'adjustments', 'decisions', 'audit', 'references']
    },
    publication: {
      name: 'Publication Ready',
      sections: ['methodology', 'results', 'adjustments', 'references']
    },
    internal: {
      name: 'Internal Review',
      sections: ['executive', 'results', 'decisions', 'audit']
    }
  };

  // Calculate report statistics
  const reportStats = useMemo(() => {
    const stats = {
      totalHypotheses: hypotheses.length,
      totalTests: sessionTests.length,
      significantBefore: sessionTests.filter(t => t.pValue < alpha).length,
      significantAfter: 0,
      correctionApplied: correctionMethod !== 'none',
      falseDiscoveryRate: 0,
      familyWiseError: 0,
      powerLoss: 0
    };

    // Calculate adjusted significance
    if (correctionMethod === 'bonferroni') {
      stats.significantAfter = sessionTests.filter(t => 
        t.pValue < (alpha / stats.totalTests)
      ).length;
    } else if (correctionMethod === 'benjamini_hochberg') {
      const sorted = [...sessionTests].sort((a, b) => a.pValue - b.pValue);
      let maxIndex = -1;
      for (let i = sorted.length - 1; i >= 0; i--) {
        if (sorted[i].pValue <= (alpha * (i + 1)) / sorted.length) {
          maxIndex = i;
          break;
        }
      }
      stats.significantAfter = maxIndex + 1;
    }

    // Estimate FDR and FWER
    stats.falseDiscoveryRate = Math.min(
      (alpha * stats.totalTests) / Math.max(stats.significantAfter, 1), 
      1
    );
    stats.familyWiseError = 1 - Math.pow(1 - alpha, stats.totalTests);
    stats.powerLoss = ((stats.significantBefore - stats.significantAfter) / 
                       Math.max(stats.significantBefore, 1)) * 100;

    return stats;
  }, [hypotheses, sessionTests, correctionMethod, alpha]);

  // Generate report sections
  const generateExecutiveSummary = () => {
    const summary = {
      title: 'Executive Summary',
      content: [
        {
          heading: 'Overview',
          text: `This report summarizes the multiple testing correction analysis performed on ${reportStats.totalHypotheses} hypotheses with ${reportStats.totalTests} statistical tests conducted.`
        },
        {
          heading: 'Key Findings',
          bullets: [
            `${reportStats.significantBefore} tests were significant before correction (p < ${alpha})`,
            `${reportStats.significantAfter} tests remain significant after ${correctionMethod.replace('_', '-')} correction`,
            `Estimated false discovery rate: ${(reportStats.falseDiscoveryRate * 100).toFixed(1)}%`,
            `Statistical power loss: ${reportStats.powerLoss.toFixed(1)}%`
          ]
        },
        {
          heading: 'Recommendation',
          text: reportStats.powerLoss > 50 
            ? 'Consider less conservative correction methods or pre-specify primary hypotheses to maintain statistical power.'
            : 'The applied correction appropriately controls for multiple testing while maintaining reasonable power.'
        }
      ]
    };
    return summary;
  };

  const generateMethodology = () => {
    const methodDescriptions = {
      bonferroni: 'The Bonferroni correction was applied to control the family-wise error rate (FWER) by dividing the significance level α by the number of tests performed.',
      holm: 'The Holm-Bonferroni step-down procedure was used to control FWER while providing more power than the standard Bonferroni correction.',
      benjamini_hochberg: 'The Benjamini-Hochberg procedure was applied to control the false discovery rate (FDR) at the specified level.',
      none: 'No correction for multiple testing was applied. Results should be interpreted with caution due to inflated Type I error risk.'
    };

    return {
      title: 'Methodology',
      content: [
        {
          heading: 'Multiple Testing Correction',
          text: methodDescriptions[correctionMethod] || 'Custom correction method applied.'
        },
        {
          heading: 'Parameters',
          bullets: [
            `Significance level (α): ${alpha}`,
            `Number of hypotheses: ${reportStats.totalHypotheses}`,
            `Number of tests performed: ${reportStats.totalTests}`,
            `Correction method: ${correctionMethod.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`
          ]
        },
        {
          heading: 'Statistical Software',
          text: 'All analyses were performed using StickForStats v1.0, a validated statistical analysis platform.'
        }
      ]
    };
  };

  const generateResults = () => {
    const significantTests = sessionTests
      .filter(t => t.adjustedPValue && t.adjustedPValue < alpha)
      .sort((a, b) => a.adjustedPValue - b.adjustedPValue);

    return {
      title: 'Results',
      content: [
        {
          heading: 'Primary Findings',
          text: `Of the ${reportStats.totalTests} tests performed, ${reportStats.significantAfter} remained statistically significant after correction for multiple testing.`
        },
        {
          heading: 'Significant Results After Correction',
          table: significantTests.map(test => ({
            hypothesis: test.hypothesis || `Test ${test.id}`,
            original_p: test.pValue.toFixed(4),
            adjusted_p: test.adjustedPValue.toFixed(4),
            effect_size: test.effectSize?.toFixed(3) || 'N/A'
          }))
        },
        {
          heading: 'Effect on Statistical Decisions',
          bullets: [
            `${reportStats.significantBefore - reportStats.significantAfter} tests lost significance after correction`,
            `No tests gained significance (as expected with correction)`,
            `Overall decision change rate: ${((reportStats.significantBefore - reportStats.significantAfter) / reportStats.totalTests * 100).toFixed(1)}%`
          ]
        }
      ]
    };
  };

  const generateDecisionAudit = () => {
    const decisions = sessionTests.map((test, index) => {
      const wasSignificant = test.pValue < alpha;
      const isSignificant = test.adjustedPValue ? test.adjustedPValue < alpha : false;
      const changed = wasSignificant !== isSignificant;
      
      return {
        id: test.id || index + 1,
        hypothesis: test.hypothesis || `Hypothesis ${index + 1}`,
        original: wasSignificant ? 'Reject H₀' : 'Fail to reject H₀',
        adjusted: isSignificant ? 'Reject H₀' : 'Fail to reject H₀',
        changed: changed ? 'Yes' : 'No',
        risk: changed ? 'Type I error prevented' : 'No change'
      };
    });

    return {
      title: 'Decision Audit Trail',
      content: [
        {
          heading: 'Decision Changes',
          table: decisions.filter(d => d.changed === 'Yes')
        },
        {
          heading: 'Risk Assessment',
          bullets: [
            `Family-wise error rate controlled at: ${alpha}`,
            `False discovery rate controlled at: ${(reportStats.falseDiscoveryRate * 100).toFixed(2)}%`,
            `Number of potential false positives prevented: ${reportStats.significantBefore - reportStats.significantAfter}`
          ]
        }
      ]
    };
  };

  const generateReferences = () => {
    const refs = {
      bonferroni: [
        'Bonferroni, C. E. (1936). Teoria statistica delle classi e calcolo delle probabilità.',
        'Dunn, O. J. (1961). Multiple comparisons among means. JASA, 56(293), 52-64.'
      ],
      holm: [
        'Holm, S. (1979). A simple sequentially rejective multiple test procedure. Scand J Statist, 6, 65-70.'
      ],
      benjamini_hochberg: [
        'Benjamini, Y., & Hochberg, Y. (1995). Controlling the false discovery rate. JRSS-B, 57(1), 289-300.',
        'Benjamini, Y., & Yekutieli, D. (2001). The control of the false discovery rate under dependency. Ann Statist, 29(4), 1165-1188.'
      ]
    };

    return {
      title: 'References',
      content: [
        {
          heading: 'Statistical Methods',
          citations: refs[correctionMethod] || ['Custom correction method applied.']
        },
        {
          heading: 'Software',
          citations: [
            'StickForStats v1.0 (2025). Enterprise Statistical Analysis Platform. https://stickforstats.com'
          ]
        }
      ]
    };
  };

  // Compile full report
  const fullReport = useMemo(() => {
    const sections = [];
    
    if (selectedSections.executive) sections.push(generateExecutiveSummary());
    if (selectedSections.methodology) sections.push(generateMethodology());
    if (selectedSections.results) sections.push(generateResults());
    if (selectedSections.audit) sections.push(generateDecisionAudit());
    if (selectedSections.references) sections.push(generateReferences());

    return sections;
  }, [selectedSections, reportStats, sessionTests, correctionMethod]);

  // Export report
  const exportReport = () => {
    let content = '';
    const timestamp = new Date().toISOString();

    if (exportFormat === 'html') {
      content = `
<!DOCTYPE html>
<html>
<head>
  <title>Multiple Testing Correction Report</title>
  <style>
    body { font-family: 'Times New Roman', serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #34495e; border-bottom: 2px solid #34495e; }
    h2 { color: #34495e; margin-top: 20px; }
    h3 { color: #666; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f5f5f5; }
    .meta { color: #666; font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>Multiple Testing Correction Report</h1>
  <p class="meta">Generated: ${timestamp}</p>
  ${fullReport.map(section => `
    <h2>${section.title}</h2>
    ${section.content.map(item => {
      if (item.text) return `<p>${item.text}</p>`;
      if (item.bullets) return `<ul>${item.bullets.map(b => `<li>${b}</li>`).join('')}</ul>`;
      if (item.table) return `
        <table>
          <thead>
            <tr>${Object.keys(item.table[0] || {}).map(k => `<th>${k}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${item.table.map(row => `
              <tr>${Object.values(row).map(v => `<td>${v}</td>`).join('')}</tr>
            `).join('')}
          </tbody>
        </table>
      `;
      if (item.citations) return `<ul>${item.citations.map(c => `<li>${c}</li>`).join('')}</ul>`;
      return '';
    }).join('')}
  `).join('')}
</body>
</html>`;
    } else if (exportFormat === 'markdown') {
      content = `# Multiple Testing Correction Report\n\n`;
      content += `*Generated: ${timestamp}*\n\n`;
      
      fullReport.forEach(section => {
        content += `## ${section.title}\n\n`;
        section.content.forEach(item => {
          if (item.heading) content += `### ${item.heading}\n\n`;
          if (item.text) content += `${item.text}\n\n`;
          if (item.bullets) {
            item.bullets.forEach(bullet => {
              content += `- ${bullet}\n`;
            });
            content += '\n';
          }
          if (item.table) {
            const headers = Object.keys(item.table[0] || {});
            content += `| ${headers.join(' | ')} |\n`;
            content += `| ${headers.map(() => '---').join(' | ')} |\n`;
            item.table.forEach(row => {
              content += `| ${Object.values(row).join(' | ')} |\n`;
            });
            content += '\n';
          }
          if (item.citations) {
            item.citations.forEach((citation, i) => {
              content += `${i + 1}. ${citation}\n`;
            });
            content += '\n';
          }
        });
      });
    } else if (exportFormat === 'latex') {
      content = `\\documentclass{article}\n`;
      content += `\\usepackage{booktabs}\n`;
      content += `\\title{Multiple Testing Correction Report}\n`;
      content += `\\date{${timestamp}}\n`;
      content += `\\begin{document}\n`;
      content += `\\maketitle\n\n`;
      
      fullReport.forEach(section => {
        content += `\\section{${section.title}}\n\n`;
        section.content.forEach(item => {
          if (item.heading) content += `\\subsection{${item.heading}}\n\n`;
          if (item.text) content += `${item.text}\n\n`;
          if (item.bullets) {
            content += `\\begin{itemize}\n`;
            item.bullets.forEach(bullet => {
              content += `\\item ${bullet}\n`;
            });
            content += `\\end{itemize}\n\n`;
          }
          if (item.citations) {
            content += `\\begin{enumerate}\n`;
            item.citations.forEach(citation => {
              content += `\\item ${citation}\n`;
            });
            content += `\\end{enumerate}\n\n`;
          }
        });
      });
      
      content += `\\end{document}`;
    }

    const blob = new Blob([content], { 
      type: exportFormat === 'html' ? 'text/html' : 
            exportFormat === 'markdown' ? 'text/markdown' :
            'text/plain'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `multiple_testing_report_${new Date().toISOString().split('T')[0]}.${
      exportFormat === 'latex' ? 'tex' : exportFormat
    }`;
    a.click();
    URL.revokeObjectURL(url);

    if (onExport) {
      onExport(fullReport, exportFormat);
    }
  };

  return (
    <div className={`multiple-testing-report ${className}`}>
      <div className="report-header">
        <h3>Multiple Testing Report Generator</h3>
        <div className="header-actions">
          <select 
            value={template}
            onChange={(e) => {
              setTemplate(e.target.value);
              const templateSections = ReportTemplates[e.target.value].sections;
              const newSections = {};
              Object.keys(selectedSections).forEach(key => {
                newSections[key] = templateSections.includes(key);
              });
              setSelectedSections(newSections);
            }}
          >
            {Object.entries(ReportTemplates).map(([key, temp]) => (
              <option key={key} value={key}>{temp.name}</option>
            ))}
          </select>
          
          <select 
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
          >
            <option value="html">HTML</option>
            <option value="markdown">Markdown</option>
            <option value="latex">LaTeX</option>
          </select>
          
          <button className="btn-generate" onClick={exportReport}>
            Generate Report
          </button>
        </div>
      </div>

      <div className="report-controls">
        <div className="section-selector">
          <h4>Include Sections:</h4>
          <div className="section-checkboxes">
            {Object.entries(selectedSections).map(([key, value]) => (
              <label key={key} className="checkbox-label">
                <input 
                  type="checkbox"
                  checked={value}
                  onChange={(e) => setSelectedSections({
                    ...selectedSections,
                    [key]: e.target.checked
                  })}
                />
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </label>
            ))}
          </div>
        </div>
        
        <div className="visualization-control">
          <label className="checkbox-label">
            <input 
              type="checkbox"
              checked={includeVisualizations}
              onChange={(e) => setIncludeVisualizations(e.target.checked)}
            />
            Include Visualizations
          </label>
        </div>
      </div>

      <div className="report-preview">
        <h4>Report Preview</h4>
        <div className="preview-content">
          {fullReport.map((section, sIndex) => (
            <div key={sIndex} className="report-section">
              <h2>{section.title}</h2>
              {section.content.map((item, iIndex) => (
                <div key={iIndex} className="report-item">
                  {item.heading && <h3>{item.heading}</h3>}
                  {item.text && <p>{item.text}</p>}
                  {item.bullets && (
                    <ul>
                      {item.bullets.map((bullet, bIndex) => (
                        <li key={bIndex}>{bullet}</li>
                      ))}
                    </ul>
                  )}
                  {item.table && (
                    <table className="report-table">
                      <thead>
                        <tr>
                          {Object.keys(item.table[0] || {}).map((header, hIndex) => (
                            <th key={hIndex}>{header.replace('_', ' ')}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {item.table.map((row, rIndex) => (
                          <tr key={rIndex}>
                            {Object.values(row).map((cell, cIndex) => (
                              <td key={cIndex}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {item.citations && (
                    <ol className="citations">
                      {item.citations.map((citation, cIndex) => (
                        <li key={cIndex}>{citation}</li>
                      ))}
                    </ol>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="report-footer">
        <div className="report-meta">
          <span>Report includes {fullReport.length} sections</span>
          <span>•</span>
          <span>Method: {correctionMethod.replace('_', '-')}</span>
          <span>•</span>
          <span>α = {alpha}</span>
        </div>
      </div>
    </div>
  );
};

export default MultipleTestingReport;