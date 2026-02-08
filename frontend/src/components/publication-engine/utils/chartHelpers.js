/**
 * Shared chart helper functions for Publication Engine D3 charts
 */

/**
 * Calculate margins based on content needs
 */
export const getMargins = (state, categoryCount = 0) => {
  const needsRotation = categoryCount > 6;
  const longestLabel = needsRotation ? 8 : 0; // approximate char width
  return {
    top: state.title.text ? 55 : 30,
    right: state.legend.show ? 100 : 30,
    bottom: needsRotation ? 80 + longestLabel * 2 : 65,
    left: 65,
  };
};

/**
 * Style x-axis tick labels with rotation if needed
 */
export const styleXAxis = (axisGroup, state, categoryCount = 0) => {
  const needsRotation = categoryCount > 6;
  const sel = axisGroup.selectAll('text')
    .style('font-family', state.xAxis.fontFamily)
    .style('font-size', `${state.xAxis.fontSize}px`)
    .style('fill', state.xAxis.color || '#333');

  if (needsRotation) {
    sel
      .attr('text-anchor', 'end')
      .attr('transform', 'rotate(-45)')
      .attr('dx', '-0.5em')
      .attr('dy', '0.3em');
  }

  // Style the axis line and ticks
  axisGroup.select('.domain').attr('stroke', '#333');
  axisGroup.selectAll('.tick line').attr('stroke', '#333');
};

/**
 * Style y-axis tick labels
 */
export const styleYAxis = (axisGroup, state) => {
  axisGroup.selectAll('text')
    .style('font-family', state.yAxis.fontFamily)
    .style('font-size', `${state.yAxis.fontSize}px`)
    .style('fill', state.yAxis.color || '#333');

  axisGroup.select('.domain').attr('stroke', '#333');
  axisGroup.selectAll('.tick line').attr('stroke', '#333');
};

/**
 * Render grid lines
 */
export const renderGrid = (g, state, xScale, yScale, innerW, innerH) => {
  const dashArray = state.grid.style === 'dashed' ? '4,4' : state.grid.style === 'dotted' ? '2,2' : '';

  if (state.grid.showY) {
    const gridG = g.append('g').attr('class', 'grid-y');
    gridG.call(
      window.d3 ? window.d3.axisLeft(yScale).tickSize(-innerW).tickFormat('') :
      // fallback: manual grid
      (sel) => sel
    );
    gridG.selectAll('line')
      .attr('stroke', state.grid.color || '#e0e0e0')
      .attr('stroke-dasharray', dashArray)
      .attr('stroke-width', 0.5);
    gridG.select('.domain').remove();
  }

  if (state.grid.showX) {
    const gridG = g.append('g').attr('class', 'grid-x')
      .attr('transform', `translate(0,${innerH})`);
    gridG.call(
      window.d3 ? window.d3.axisBottom(xScale).tickSize(-innerH).tickFormat('') :
      (sel) => sel
    );
    gridG.selectAll('line')
      .attr('stroke', state.grid.color || '#e0e0e0')
      .attr('stroke-dasharray', dashArray)
      .attr('stroke-width', 0.5);
    gridG.select('.domain').remove();
  }
};

/**
 * Render axis labels
 */
export const renderAxisLabels = (g, state, innerW, innerH, categoryCount = 0) => {
  const needsRotation = categoryCount > 6;
  const xLabelOffset = needsRotation ? 70 : 45;

  // X axis label
  if (state.xAxis.label) {
    g.append('text')
      .attr('x', innerW / 2)
      .attr('y', innerH + xLabelOffset)
      .attr('text-anchor', 'middle')
      .attr('font-family', state.xAxis.fontFamily)
      .attr('font-size', state.xAxis.fontSize + 1)
      .attr('font-weight', state.xAxis.fontWeight)
      .attr('fill', state.xAxis.color || '#333')
      .text(state.xAxis.label);
  }

  // Y axis label
  if (state.yAxis.label) {
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerH / 2)
      .attr('y', -50)
      .attr('text-anchor', 'middle')
      .attr('font-family', state.yAxis.fontFamily)
      .attr('font-size', state.yAxis.fontSize + 1)
      .attr('font-weight', state.yAxis.fontWeight)
      .attr('fill', state.yAxis.color || '#333')
      .text(state.yAxis.label);
  }
};

/**
 * Render chart title
 */
export const renderTitle = (svg, state, w) => {
  if (!state.title.text) return;
  svg.append('text')
    .attr('class', 'chart-content')
    .attr('x', w / 2)
    .attr('y', 28)
    .attr('text-anchor', 'middle')
    .attr('font-family', state.title.fontFamily)
    .attr('font-size', state.title.fontSize)
    .attr('font-weight', state.title.fontWeight)
    .attr('fill', state.title.color || '#000')
    .text(state.title.text);
};

/**
 * Get pixel dimensions from state
 */
export const getDimensions = (state) => {
  const { width, height, unit } = state.dimensions;
  return {
    w: unit === 'inches' ? width * 96 : width,
    h: unit === 'inches' ? height * 96 : height,
  };
};
