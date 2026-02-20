/**
 * D3 Point Shape Generator for Publication-Quality Scatter Plots
 *
 * Maps shape names to D3 symbol types for rendering
 * different marker shapes via d3.symbol().
 */

import * as d3 from 'd3';

/**
 * Available point shapes.
 */
export const POINT_SHAPES = [
  { id: 'circle', label: 'Circle', symbol: d3.symbolCircle },
  { id: 'square', label: 'Square', symbol: d3.symbolSquare },
  { id: 'triangle', label: 'Triangle', symbol: d3.symbolTriangle },
  { id: 'diamond', label: 'Diamond', symbol: d3.symbolDiamond },
  { id: 'cross', label: 'Cross', symbol: d3.symbolCross },
  { id: 'star', label: 'Star', symbol: d3.symbolStar },
  { id: 'plus', label: 'Plus', symbol: d3.symbolCross }, // rotated 45°
  { id: 'hexagon', label: 'Hexagon', symbol: d3.symbolWye },
];

/**
 * Get a D3 symbol generator for a given shape name and size.
 *
 * @param {string} shapeName - One of the POINT_SHAPES ids
 * @param {number} size - Area of the symbol in px² (default 64 ~= 4px radius circle)
 * @returns {Function} D3 symbol path generator
 */
export function getSymbolGenerator(shapeName = 'circle', size = 64) {
  const shape = POINT_SHAPES.find(s => s.id === shapeName) || POINT_SHAPES[0];
  return d3.symbol().type(shape.symbol).size(size);
}

/**
 * Get the D3 symbol type for a given shape name.
 *
 * @param {string} shapeName
 * @returns {Object} D3 symbol type
 */
export function getSymbolType(shapeName = 'circle') {
  const shape = POINT_SHAPES.find(s => s.id === shapeName) || POINT_SHAPES[0];
  return shape.symbol;
}

/**
 * Render a single point at (cx, cy) using the specified shape.
 *
 * @param {d3.Selection} container - D3 selection (e.g., a <g> element)
 * @param {number} cx - Center X
 * @param {number} cy - Center Y
 * @param {string} shapeName
 * @param {number} size - Symbol area
 * @param {string} fill - Fill color
 * @param {number} opacity
 * @returns {d3.Selection}
 */
export function renderPoint(container, cx, cy, shapeName, size, fill, opacity = 1) {
  const gen = getSymbolGenerator(shapeName, size);
  return container.append('path')
    .attr('d', gen())
    .attr('transform', `translate(${cx},${cy})`)
    .attr('fill', fill)
    .attr('opacity', opacity)
    .attr('stroke', 'none');
}

/**
 * Convert point radius to D3 symbol area.
 * For a circle: area = pi * r^2, but D3 symbol size is roughly area.
 *
 * @param {number} radius
 * @returns {number}
 */
export function radiusToArea(radius) {
  return Math.PI * radius * radius;
}
