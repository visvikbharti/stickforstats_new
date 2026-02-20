/**
 * D3BlandAltman - Bland-Altman agreement plot for method comparison.
 * Scatter of (mean) vs (difference) with bias line and LOA.
 */
import React, { useEffect } from 'react';
import * as d3 from 'd3';
import { usePlotConfig } from '../context/PlotConfigContext';
import { getPaletteColors } from '../utils/colorPalettes';
import { getMargins, styleXAxis, styleYAxis, renderAxisLabels, renderTitle, getDimensions } from '../utils/chartHelpers';
import { processBlandAltmanData } from '../utils/blandAltmanCalc';

const D3BlandAltman = ({ svgRef, onScalesReady }) => {
  const { state } = usePlotConfig();

  useEffect(() => {
    if (!svgRef?.current || !state.data || !state.dataMapping.x || !state.dataMapping.y) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('.chart-content').remove();

    const { w, h } = getDimensions(state);
    const margin = getMargins(state);
    const innerW = w - margin.left - margin.right;
    const innerH = h - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('class', 'chart-content')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const { x: col1, y: col2 } = state.dataMapping;
    const ba = state.blandAltman;
    const colors = getPaletteColors(state.colorPalette);

    // Compute stats
    const stats = processBlandAltmanData(state.data, col1, col2, ba.sdMultiplier, ba.showPercentageDiff);
    if (stats.n === 0) return;

    const { means, diffs, bias, sd, loa } = stats;

    // Scales
    const xPad = (d3.max(means) - d3.min(means)) * 0.05 || 1;
    const yPad = (d3.max(diffs) - d3.min(diffs)) * 0.15 || 1;

    const xScale = d3.scaleLinear()
      .domain([d3.min(means) - xPad, d3.max(means) + xPad])
      .range([0, innerW]);
    const yScale = d3.scaleLinear()
      .domain([
        Math.min(d3.min(diffs), loa.lower) - yPad,
        Math.max(d3.max(diffs), loa.upper) + yPad,
      ])
      .range([innerH, 0]);

    if (state.xAxis.min != null) xScale.domain([state.xAxis.min, xScale.domain()[1]]);
    if (state.xAxis.max != null) xScale.domain([xScale.domain()[0], state.xAxis.max]);
    if (state.yAxis.min != null) yScale.domain([state.yAxis.min, yScale.domain()[1]]);
    if (state.yAxis.max != null) yScale.domain([yScale.domain()[0], state.yAxis.max]);

    // Grid
    if (state.grid.showY) {
      const gridG = g.append('g').attr('class', 'grid');
      gridG.call(d3.axisLeft(yScale).tickSize(-innerW).tickFormat(''));
      gridG.selectAll('line').attr('stroke', state.grid.color || '#e0e0e0')
        .attr('stroke-dasharray', state.grid.style === 'dashed' ? '4,4' : state.grid.style === 'dotted' ? '2,2' : '')
        .attr('stroke-width', 0.5);
      gridG.select('.domain').remove();
    }

    // Bias line (mean difference)
    if (ba.showBiasLine) {
      g.append('line')
        .attr('x1', 0).attr('x2', innerW)
        .attr('y1', yScale(bias)).attr('y2', yScale(bias))
        .attr('stroke', '#333').attr('stroke-width', 1.5);

      g.append('text')
        .attr('x', innerW + 3).attr('y', yScale(bias) + 3)
        .attr('font-size', 8).attr('font-family', 'Arial, sans-serif')
        .attr('fill', '#333')
        .text(`Bias: ${bias.toFixed(2)}`);
    }

    // LOA lines
    if (ba.showLOA) {
      // Upper LOA
      g.append('line')
        .attr('x1', 0).attr('x2', innerW)
        .attr('y1', yScale(loa.upper)).attr('y2', yScale(loa.upper))
        .attr('stroke', '#c62828').attr('stroke-width', 1)
        .attr('stroke-dasharray', '6,3');

      g.append('text')
        .attr('x', innerW + 3).attr('y', yScale(loa.upper) + 3)
        .attr('font-size', 8).attr('font-family', 'Arial, sans-serif')
        .attr('fill', '#c62828')
        .text(`+${ba.sdMultiplier} SD: ${loa.upper.toFixed(2)}`);

      // Lower LOA
      g.append('line')
        .attr('x1', 0).attr('x2', innerW)
        .attr('y1', yScale(loa.lower)).attr('y2', yScale(loa.lower))
        .attr('stroke', '#c62828').attr('stroke-width', 1)
        .attr('stroke-dasharray', '6,3');

      g.append('text')
        .attr('x', innerW + 3).attr('y', yScale(loa.lower) + 3)
        .attr('font-size', 8).attr('font-family', 'Arial, sans-serif')
        .attr('fill', '#c62828')
        .text(`-${ba.sdMultiplier} SD: ${loa.lower.toFixed(2)}`);
    }

    // Zero reference line
    if (yScale.domain()[0] <= 0 && yScale.domain()[1] >= 0) {
      g.append('line')
        .attr('x1', 0).attr('x2', innerW)
        .attr('y1', yScale(0)).attr('y2', yScale(0))
        .attr('stroke', '#999').attr('stroke-width', 0.5)
        .attr('stroke-dasharray', '2,2');
    }

    // Points
    const pointData = means.map((m, i) => ({ mean: m, diff: diffs[i] }));
    g.selectAll('.ba-point')
      .data(pointData)
      .join('circle')
      .attr('class', 'ba-point')
      .attr('cx', d => xScale(d.mean))
      .attr('cy', d => yScale(d.diff))
      .attr('r', ba.pointSize || 4)
      .attr('fill', colors[0])
      .attr('opacity', 0.7)
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5);

    // Stats annotation
    if (ba.showStats) {
      const statsG = g.append('g').attr('transform', `translate(8, 12)`);
      const unit = ba.showPercentageDiff ? '%' : '';
      const lines = [
        `n = ${stats.n}`,
        `Bias = ${bias.toFixed(3)}${unit}`,
        `SD = ${sd.toFixed(3)}${unit}`,
        `LOA = [${loa.lower.toFixed(2)}, ${loa.upper.toFixed(2)}]${unit}`,
      ];
      lines.forEach((txt, i) => {
        statsG.append('text')
          .attr('x', 0).attr('y', i * 13)
          .attr('font-size', 9).attr('font-family', 'Arial, sans-serif')
          .attr('fill', '#333')
          .text(txt);
      });
    }

    // Axes
    const xAxisG = g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(xScale));
    styleXAxis(xAxisG, state);
    const yAxisG = g.append('g').call(d3.axisLeft(yScale));
    styleYAxis(yAxisG, state);
    renderAxisLabels(g, state, innerW, innerH);
    renderTitle(svg, state, w);

    if (onScalesReady) {
      onScalesReady({ xScale, yScale, margin, innerWidth: innerW, innerHeight: innerH });
    }
  }, [svgRef, state, onScalesReady]);

  return null;
};

export default D3BlandAltman;
