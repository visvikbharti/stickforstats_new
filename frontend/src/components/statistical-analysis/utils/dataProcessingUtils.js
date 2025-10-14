/**
 * Data Processing Utility Functions
 *
 * Provides functions for data cleaning, preprocessing, and transformation.
 * Used by the Data Preprocessing module.
 */

/**
 * Handle missing values in dataset
 * @param {Array} data - Array of data objects
 * @param {String} strategy - Strategy: 'none', 'drop', 'mean', 'median', 'mode'
 * @returns {Array} - Processed data
 */
export const handleMissingValues = (data, strategy = 'none') => {
  if (!data || data.length === 0) return data;
  if (strategy === 'none') return data;

  const columns = Object.keys(data[0]);
  let processedData = [...data];

  if (strategy === 'drop') {
    // Drop rows with any missing values
    processedData = processedData.filter(row => {
      return columns.every(col => {
        const value = row[col];
        return value !== null && value !== undefined && value !== '';
      });
    });
    return processedData;
  }

  // For fill strategies, calculate statistics per column
  const columnStats = {};
  columns.forEach(col => {
    const values = data.map(row => row[col]).filter(v => v !== null && v !== undefined && v !== '');
    const isNumeric = values.length > 0 && typeof values[0] === 'number';

    if (isNumeric) {
      const numericValues = values.filter(v => typeof v === 'number');
      if (numericValues.length > 0) {
        // Calculate mean
        const mean = numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length;

        // Calculate median
        const sorted = [...numericValues].sort((a, b) => a - b);
        const median = sorted.length % 2 === 0
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)];

        columnStats[col] = { mean, median, isNumeric: true };
      }
    } else {
      // Calculate mode for categorical
      const counts = {};
      values.forEach(v => {
        counts[v] = (counts[v] || 0) + 1;
      });
      const mode = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, null);
      columnStats[col] = { mode, isNumeric: false };
    }
  });

  // Fill missing values
  processedData = processedData.map(row => {
    const newRow = { ...row };
    columns.forEach(col => {
      const value = newRow[col];
      const isEmpty = value === null || value === undefined || value === '';

      if (isEmpty && columnStats[col]) {
        if (columnStats[col].isNumeric) {
          if (strategy === 'mean') {
            newRow[col] = columnStats[col].mean;
          } else if (strategy === 'median') {
            newRow[col] = columnStats[col].median;
          }
        } else {
          if (strategy === 'mode') {
            newRow[col] = columnStats[col].mode;
          }
        }
      }
    });
    return newRow;
  });

  return processedData;
};

/**
 * Scale numeric features
 * @param {Array} data - Array of data objects
 * @param {String} method - Scaling method: 'none', 'standard', 'minmax'
 * @returns {Array} - Scaled data
 */
export const scaleFeatures = (data, method = 'none') => {
  if (!data || data.length === 0 || method === 'none') return data;

  const columns = Object.keys(data[0]);
  const numericColumns = columns.filter(col => {
    const value = data[0][col];
    return typeof value === 'number';
  });

  if (numericColumns.length === 0) return data;

  // Calculate statistics for each numeric column
  const columnStats = {};
  numericColumns.forEach(col => {
    const values = data.map(row => row[col]).filter(v => typeof v === 'number');

    if (values.length > 0) {
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const std = Math.sqrt(variance);
      const min = Math.min(...values);
      const max = Math.max(...values);

      columnStats[col] = { mean, std, min, max };
    }
  });

  // Scale data
  const scaledData = data.map(row => {
    const newRow = { ...row };
    numericColumns.forEach(col => {
      const value = newRow[col];
      if (typeof value === 'number' && columnStats[col]) {
        const { mean, std, min, max } = columnStats[col];

        if (method === 'standard') {
          // Standard scaling: (x - mean) / std
          newRow[col] = std !== 0 ? (value - mean) / std : 0;
        } else if (method === 'minmax') {
          // Min-max scaling: (x - min) / (max - min)
          newRow[col] = (max - min) !== 0 ? (value - min) / (max - min) : 0;
        }
      }
    });
    return newRow;
  });

  return scaledData;
};

/**
 * Encode categorical variables
 * @param {Array} data - Array of data objects
 * @param {String} method - Encoding method: 'none', 'onehot', 'label'
 * @returns {Array} - Encoded data
 */
export const encodeCategorical = (data, method = 'none') => {
  if (!data || data.length === 0 || method === 'none') return data;

  const columns = Object.keys(data[0]);
  const categoricalColumns = columns.filter(col => {
    const value = data[0][col];
    return typeof value === 'string';
  });

  if (categoricalColumns.length === 0) return data;

  if (method === 'onehot') {
    // One-hot encoding: Create binary columns for each category
    const encodedData = data.map(row => {
      const newRow = { ...row };

      categoricalColumns.forEach(col => {
        const value = row[col];
        // Remove original column
        delete newRow[col];

        // Get unique values for this column
        const uniqueValues = [...new Set(data.map(r => r[col]).filter(v => v))];

        // Create binary columns
        uniqueValues.forEach(uniqueVal => {
          const newColName = `${col}_${uniqueVal}`;
          newRow[newColName] = value === uniqueVal ? 1 : 0;
        });
      });

      return newRow;
    });
    return encodedData;

  } else if (method === 'label') {
    // Label encoding: Assign numeric values to categories
    const labelMaps = {};

    categoricalColumns.forEach(col => {
      const uniqueValues = [...new Set(data.map(r => r[col]).filter(v => v))];
      labelMaps[col] = {};
      uniqueValues.forEach((value, idx) => {
        labelMaps[col][value] = idx;
      });
    });

    const encodedData = data.map(row => {
      const newRow = { ...row };
      categoricalColumns.forEach(col => {
        const value = row[col];
        if (value && labelMaps[col][value] !== undefined) {
          newRow[col] = labelMaps[col][value];
        }
      });
      return newRow;
    });
    return encodedData;
  }

  return data;
};

/**
 * Get summary of changes made during preprocessing
 * @param {Array} originalData - Original dataset
 * @param {Array} processedData - Processed dataset
 * @returns {Object} - Summary of changes
 */
export const getPreprocessingSummary = (originalData, processedData) => {
  if (!originalData || !processedData) return null;

  const originalColumns = Object.keys(originalData[0] || {});
  const processedColumns = Object.keys(processedData[0] || {});

  const summary = {
    originalRows: originalData.length,
    processedRows: processedData.length,
    rowsRemoved: originalData.length - processedData.length,
    originalColumns: originalColumns.length,
    processedColumns: processedColumns.length,
    columnsAdded: processedColumns.length - originalColumns.length,
    columnChanges: []
  };

  // Detect column transformations
  const addedColumns = processedColumns.filter(col => !originalColumns.includes(col));
  const removedColumns = originalColumns.filter(col => !processedColumns.includes(col));

  if (addedColumns.length > 0) {
    summary.columnChanges.push(`Added ${addedColumns.length} columns: ${addedColumns.slice(0, 5).join(', ')}${addedColumns.length > 5 ? '...' : ''}`);
  }

  if (removedColumns.length > 0) {
    summary.columnChanges.push(`Removed ${removedColumns.length} columns: ${removedColumns.slice(0, 5).join(', ')}${removedColumns.length > 5 ? '...' : ''}`);
  }

  // Count missing values filled
  let missingFilled = 0;
  originalColumns.forEach(col => {
    if (processedColumns.includes(col)) {
      const originalMissing = originalData.filter(row => {
        const val = row[col];
        return val === null || val === undefined || val === '';
      }).length;

      const processedMissing = processedData.filter(row => {
        const val = row[col];
        return val === null || val === undefined || val === '';
      }).length;

      missingFilled += Math.max(0, originalMissing - processedMissing);
    }
  });

  if (missingFilled > 0) {
    summary.columnChanges.push(`Filled ${missingFilled} missing values`);
  }

  return summary;
};

/**
 * Export data as CSV string
 * @param {Array} data - Data to export
 * @returns {String} - CSV string
 */
export const exportToCSV = (data) => {
  if (!data || data.length === 0) return '';

  const columns = Object.keys(data[0]);
  const headerRow = columns.join(',');

  const dataRows = data.map(row => {
    return columns.map(col => {
      const value = row[col];
      // Handle values with commas by wrapping in quotes
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value}"`;
      }
      return value;
    }).join(',');
  });

  return [headerRow, ...dataRows].join('\n');
};

/**
 * Detect column types in dataset
 * @param {Array} data - Dataset
 * @returns {Object} - Column types mapping
 */
export const detectColumnTypes = (data) => {
  if (!data || data.length === 0) return {};

  const columns = Object.keys(data[0]);
  const types = {};

  columns.forEach(col => {
    const values = data.map(row => row[col]).filter(v => v !== null && v !== undefined && v !== '');

    if (values.length === 0) {
      types[col] = 'empty';
      return;
    }

    const firstValue = values[0];
    if (typeof firstValue === 'number') {
      types[col] = 'numeric';
    } else if (typeof firstValue === 'string') {
      types[col] = 'categorical';
    } else {
      types[col] = 'unknown';
    }
  });

  return types;
};
