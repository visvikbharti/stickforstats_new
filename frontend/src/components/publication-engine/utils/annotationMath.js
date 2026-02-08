/**
 * Annotation Mathematics for Significance Brackets
 *
 * Handles positioning, auto-stacking, and path generation
 * for significance brackets on publication plots.
 */

/**
 * Calculate the bracket path for two groups
 * @param {number} x1 - Left x position (pixels)
 * @param {number} x2 - Right x position (pixels)
 * @param {number} yTop - Top of bracket (pixels)
 * @param {number} tickHeight - Height of vertical ticks (pixels)
 * @returns {string} SVG path d attribute
 */
export const getBracketPath = (x1, x2, yTop, tickHeight = 8) => {
  const yBottom = yTop + tickHeight;
  return `M ${x1} ${yBottom} L ${x1} ${yTop} L ${x2} ${yTop} L ${x2} ${yBottom}`;
};

/**
 * Auto-stack brackets to avoid overlap.
 * Sorts by span width (smallest first) and assigns increasing y-offsets.
 * @param {Array} annotations - Array of annotation objects
 * @param {Function} xScale - D3 scale for x axis
 * @param {number} baseY - Base y position (top of tallest data)
 * @param {number} stepSize - Vertical spacing between brackets (pixels)
 * @returns {Array} Annotations with computed yPosition
 */
export const stackBrackets = (annotations, xScale, baseY, stepSize = 25) => {
  if (!annotations || annotations.length === 0) return [];

  const brackets = annotations
    .filter(a => a.type === 'bracket')
    .map(a => ({
      ...a,
      x1: typeof a.fromGroup === 'number' ? xScale(a.fromGroup) : 0,
      x2: typeof a.toGroup === 'number' ? xScale(a.toGroup) : 0,
    }))
    .sort((a, b) => Math.abs(a.x2 - a.x1) - Math.abs(b.x2 - b.x1));

  return brackets.map((bracket, index) => ({
    ...bracket,
    yPosition: baseY - (index + 1) * stepSize,
  }));
};

/**
 * Format p-value for display on brackets
 * @param {number|string} pValue - The p-value or label
 * @returns {string} Formatted label
 */
export const formatPValue = (pValue) => {
  if (typeof pValue === 'string') return pValue;
  if (pValue < 0.001) return '***';
  if (pValue < 0.01) return '**';
  if (pValue < 0.05) return '*';
  return 'ns';
};

/**
 * Generate a unique annotation ID
 */
let annotationCounter = 0;
export const generateAnnotationId = () => {
  annotationCounter += 1;
  return `ann-${Date.now()}-${annotationCounter}`;
};
