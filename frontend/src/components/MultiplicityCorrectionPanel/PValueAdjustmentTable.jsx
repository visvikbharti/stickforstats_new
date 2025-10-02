import React, { useState, useMemo } from 'react';
import './PValueAdjustmentTable.scss';

const PValueAdjustmentTable = ({ 
  pValues = [],
  correctionMethod = 'bonferroni',
  alpha = 0.05,
  onExport,
  className = '' 
}) => {
  const [sortBy, setSortBy] = useState('original'); // original, adjusted, difference, hypothesis
  const [sortDirection, setSortDirection] = useState('asc');
  const [highlightChanges, setHighlightChanges] = useState(true);
  const [showOnlyChanges, setShowOnlyChanges] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');

  // Calculate adjusted p-values based on method
  const adjustedPValues = useMemo(() => {
    if (!pValues || pValues.length === 0) return [];

    const m = pValues.length;
    const sorted = [...pValues].sort((a, b) => a.pValue - b.pValue);
    const adjustedData = [];

    pValues.forEach((item, originalIndex) => {
      let adjusted = item.pValue;
      const rank = sorted.findIndex(s => s.id === item.id) + 1;

      switch (correctionMethod) {
        case 'bonferroni':
          adjusted = Math.min(item.pValue * m, 1);
          break;
          
        case 'holm':
          // Holm: p[i] * (m - i + 1) for ordered p-values
          adjusted = Math.min(item.pValue * (m - rank + 1), 1);
          break;
          
        case 'hochberg':
          // Hochberg: step-up procedure
          adjusted = Math.min(item.pValue * (m - rank + 1), 1);
          break;
          
        case 'benjamini_hochberg':
          // BH: p[i] * m / i for ordered p-values
          adjusted = Math.min((item.pValue * m) / rank, 1);
          break;
          
        case 'benjamini_yekutieli':
          // BY: p[i] * m * c(m) / i
          const c_m = Array.from({length: m}, (_, i) => 1 / (i + 1))
            .reduce((sum, val) => sum + val, 0);
          adjusted = Math.min((item.pValue * m * c_m) / rank, 1);
          break;
          
        case 'sidak':
          adjusted = 1 - Math.pow(1 - item.pValue, m);
          break;
          
        case 'holm_sidak':
          adjusted = 1 - Math.pow(1 - item.pValue, m - rank + 1);
          break;
          
        case 'none':
        default:
          adjusted = item.pValue;
      }

      // For step procedures, ensure monotonicity
      if (['holm', 'hochberg', 'benjamini_hochberg', 'benjamini_yekutieli'].includes(correctionMethod)) {
        if (adjustedData.length > 0) {
          const prevAdjusted = adjustedData[adjustedData.length - 1].adjustedPValue;
          adjusted = Math.max(adjusted, prevAdjusted);
        }
      }

      const wasSignificant = item.pValue < alpha;
      const isSignificant = adjusted < alpha;
      const decisionChanged = wasSignificant !== isSignificant;

      adjustedData.push({
        ...item,
        originalIndex: originalIndex + 1,
        rank,
        adjustedPValue: adjusted,
        difference: adjusted - item.pValue,
        percentChange: ((adjusted - item.pValue) / item.pValue * 100),
        wasSignificant,
        isSignificant,
        decisionChanged,
        decisionType: decisionChanged ? 
          (wasSignificant ? 'lost_significance' : 'gained_significance') : 
          'no_change'
      });
    });

    return adjustedData;
  }, [pValues, correctionMethod, alpha]);

  // Apply sorting
  const sortedData = useMemo(() => {
    let data = [...adjustedPValues];

    if (showOnlyChanges) {
      data = data.filter(row => row.decisionChanged);
    }

    data.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'original':
          comparison = a.pValue - b.pValue;
          break;
        case 'adjusted':
          comparison = a.adjustedPValue - b.adjustedPValue;
          break;
        case 'difference':
          comparison = Math.abs(a.difference) - Math.abs(b.difference);
          break;
        case 'hypothesis':
          comparison = (a.hypothesis || '').localeCompare(b.hypothesis || '');
          break;
        default:
          comparison = a.originalIndex - b.originalIndex;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return data;
  }, [adjustedPValues, sortBy, sortDirection, showOnlyChanges]);

  // Summary statistics
  const summary = useMemo(() => {
    const stats = {
      total: adjustedPValues.length,
      originallySignificant: adjustedPValues.filter(p => p.wasSignificant).length,
      stillSignificant: adjustedPValues.filter(p => p.isSignificant).length,
      lostSignificance: adjustedPValues.filter(p => p.decisionType === 'lost_significance').length,
      gainedSignificance: adjustedPValues.filter(p => p.decisionType === 'gained_significance').length,
      avgIncrease: 0,
      maxIncrease: 0,
      minPValue: Math.min(...adjustedPValues.map(p => p.pValue)),
      maxPValue: Math.max(...adjustedPValues.map(p => p.pValue)),
      minAdjusted: Math.min(...adjustedPValues.map(p => p.adjustedPValue)),
      maxAdjusted: Math.max(...adjustedPValues.map(p => p.adjustedPValue))
    };

    if (adjustedPValues.length > 0) {
      const increases = adjustedPValues.map(p => p.difference);
      stats.avgIncrease = increases.reduce((sum, val) => sum + val, 0) / increases.length;
      stats.maxIncrease = Math.max(...increases);
    }

    return stats;
  }, [adjustedPValues]);

  // Handle sorting
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  // Export functionality
  const handleExport = () => {
    let content = '';
    const headers = ['Index', 'Hypothesis', 'Original p-value', 'Adjusted p-value', 
                    'Difference', 'Original Decision', 'Adjusted Decision', 'Change'];

    if (exportFormat === 'csv') {
      content = headers.join(',') + '\n';
      sortedData.forEach(row => {
        content += [
          row.originalIndex,
          `"${row.hypothesis || ''}"`,
          row.pValue.toFixed(6),
          row.adjustedPValue.toFixed(6),
          row.difference.toFixed(6),
          row.wasSignificant ? 'Significant' : 'Not Significant',
          row.isSignificant ? 'Significant' : 'Not Significant',
          row.decisionChanged ? 'Changed' : 'No Change'
        ].join(',') + '\n';
      });
    } else if (exportFormat === 'tsv') {
      content = headers.join('\t') + '\n';
      sortedData.forEach(row => {
        content += [
          row.originalIndex,
          row.hypothesis || '',
          row.pValue.toFixed(6),
          row.adjustedPValue.toFixed(6),
          row.difference.toFixed(6),
          row.wasSignificant ? 'Significant' : 'Not Significant',
          row.isSignificant ? 'Significant' : 'Not Significant',
          row.decisionChanged ? 'Changed' : 'No Change'
        ].join('\t') + '\n';
      });
    } else if (exportFormat === 'latex') {
      content = '\\begin{table}[h]\n\\centering\n\\begin{tabular}{|c|l|c|c|c|c|}\n\\hline\n';
      content += headers.join(' & ') + ' \\\\\n\\hline\n';
      sortedData.forEach(row => {
        content += [
          row.originalIndex,
          row.hypothesis || '',
          row.pValue.toFixed(4),
          row.adjustedPValue.toFixed(4),
          row.difference.toFixed(4),
          row.decisionChanged ? '\\textbf{Changed}' : 'No Change'
        ].join(' & ') + ' \\\\\n';
      });
      content += '\\hline\n\\end{tabular}\n\\caption{P-value Adjustment Table}\n\\end{table}';
    }

    const blob = new Blob([content], { 
      type: exportFormat === 'csv' ? 'text/csv' : 
            exportFormat === 'tsv' ? 'text/tab-separated-values' :
            'text/plain' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pvalue_adjustments_${correctionMethod}.${exportFormat === 'latex' ? 'tex' : exportFormat}`;
    a.click();
    URL.revokeObjectURL(url);

    if (onExport) {
      onExport(sortedData, exportFormat);
    }
  };

  // Visual significance indicator
  const SignificanceIndicator = ({ wasSignificant, isSignificant, decisionChanged }) => {
    if (decisionChanged) {
      if (wasSignificant && !isSignificant) {
        return (
          <span className="significance-change lost">
            <span className="arrow">↓</span>
            Lost Significance
          </span>
        );
      } else if (!wasSignificant && isSignificant) {
        return (
          <span className="significance-change gained">
            <span className="arrow">↑</span>
            Gained Significance
          </span>
        );
      }
    }
    
    return (
      <span className={`significance-stable ${isSignificant ? 'significant' : 'not-significant'}`}>
        {isSignificant ? '✓ Significant' : '✗ Not Significant'}
      </span>
    );
  };

  // P-value cell with visual formatting
  const PValueCell = ({ value, significant, highlight }) => {
    const getColor = () => {
      if (value < 0.001) return '#b71c1c';
      if (value < 0.01) return '#d32f2f';
      if (value < 0.05) return '#f44336';
      if (value < 0.1) return '#ff9800';
      return '#757575';
    };

    return (
      <td 
        className={`p-value-cell ${significant ? 'significant' : ''} ${highlight ? 'highlight' : ''}`}
        style={{ color: getColor() }}
      >
        {value < 0.001 ? '<0.001' : value.toFixed(4)}
      </td>
    );
  };

  return (
    <div className={`pvalue-adjustment-table ${className}`}>
      <div className="table-header">
        <h3>P-value Adjustment Table</h3>
        <div className="header-info">
          <span className="method-badge">{correctionMethod.replace('_', '-')}</span>
          <span className="alpha-badge">α = {alpha}</span>
          <span className="count-badge">{sortedData.length} hypotheses</span>
        </div>
      </div>

      <div className="table-controls">
        <div className="view-controls">
          <label className="checkbox-label">
            <input 
              type="checkbox"
              checked={highlightChanges}
              onChange={(e) => setHighlightChanges(e.target.checked)}
            />
            Highlight Changes
          </label>
          <label className="checkbox-label">
            <input 
              type="checkbox"
              checked={showOnlyChanges}
              onChange={(e) => setShowOnlyChanges(e.target.checked)}
            />
            Show Only Changes
          </label>
        </div>

        <div className="export-controls">
          <select 
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
          >
            <option value="csv">CSV</option>
            <option value="tsv">TSV</option>
            <option value="latex">LaTeX</option>
          </select>
          <button className="btn-export" onClick={handleExport}>
            Export Table
          </button>
        </div>
      </div>

      <div className="summary-stats">
        <div className="stat-card">
          <span className="stat-value">{summary.originallySignificant}</span>
          <span className="stat-label">Originally Significant</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{summary.stillSignificant}</span>
          <span className="stat-label">Still Significant</span>
        </div>
        <div className="stat-card lost">
          <span className="stat-value">{summary.lostSignificance}</span>
          <span className="stat-label">Lost Significance</span>
        </div>
        <div className="stat-card gained">
          <span className="stat-value">{summary.gainedSignificance}</span>
          <span className="stat-label">Gained Significance</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{summary.avgIncrease.toFixed(4)}</span>
          <span className="stat-label">Avg. Increase</span>
        </div>
      </div>

      <div className="table-container">
        <table className="adjustment-table">
          <thead>
            <tr>
              <th>#</th>
              <th 
                className="sortable"
                onClick={() => handleSort('hypothesis')}
              >
                Hypothesis
                {sortBy === 'hypothesis' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
              <th 
                className="sortable"
                onClick={() => handleSort('original')}
              >
                Original p-value
                {sortBy === 'original' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
              <th 
                className="sortable"
                onClick={() => handleSort('adjusted')}
              >
                Adjusted p-value
                {sortBy === 'adjusted' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
              <th 
                className="sortable"
                onClick={() => handleSort('difference')}
              >
                Difference
                {sortBy === 'difference' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
              <th>% Change</th>
              <th>Decision</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, index) => (
              <tr 
                key={row.id || index}
                className={`
                  ${row.decisionChanged && highlightChanges ? 'decision-changed' : ''}
                  ${row.decisionType === 'lost_significance' ? 'lost-significance' : ''}
                  ${row.decisionType === 'gained_significance' ? 'gained-significance' : ''}
                `}
              >
                <td className="index-cell">{row.originalIndex}</td>
                <td className="hypothesis-cell">
                  <span title={row.hypothesis}>
                    {row.hypothesis || `Hypothesis ${row.originalIndex}`}
                  </span>
                  {row.test && (
                    <span className="test-type">{row.test}</span>
                  )}
                </td>
                <PValueCell 
                  value={row.pValue}
                  significant={row.wasSignificant}
                  highlight={false}
                />
                <PValueCell 
                  value={row.adjustedPValue}
                  significant={row.isSignificant}
                  highlight={row.decisionChanged && highlightChanges}
                />
                <td className={`difference-cell ${row.difference > 0 ? 'positive' : 'negative'}`}>
                  {row.difference > 0 ? '+' : ''}{row.difference.toFixed(4)}
                </td>
                <td className="percent-cell">
                  {row.percentChange > 0 ? '+' : ''}{row.percentChange.toFixed(1)}%
                </td>
                <td className="decision-cell">
                  <SignificanceIndicator 
                    wasSignificant={row.wasSignificant}
                    isSignificant={row.isSignificant}
                    decisionChanged={row.decisionChanged}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sortedData.length === 0 && (
          <div className="empty-state">
            <p>No p-values to display</p>
            <span>Add hypotheses and run tests to see adjustments</span>
          </div>
        )}
      </div>

      <div className="table-footer">
        <div className="footer-notes">
          <p>
            <strong>Method:</strong> {correctionMethod.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </p>
          <p>
            <strong>Interpretation:</strong> Adjusted p-values control for multiple testing. 
            Values below α = {alpha} remain statistically significant after correction.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PValueAdjustmentTable;