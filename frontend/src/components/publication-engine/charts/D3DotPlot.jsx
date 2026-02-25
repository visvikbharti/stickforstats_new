/**
 * D3DotPlot - Strip chart / dot plot with jitter
 */
import { useEffect } from 'react';
import * as d3 from 'd3';
import { usePlotConfig } from '../context/PlotConfigContext';
import { getPaletteColors } from '../utils/colorPalettes';
import { getMargins, styleXAxis, styleYAxis, renderAxisLabels, renderTitle, getDimensions } from '../utils/chartHelpers';

const D3DotPlot = ({ svgRef, onScalesReady }) => {
  const { state } = usePlotConfig();

  useEffect(() => {
    if (!svgRef?.current || !state.data || !state.dataMapping.x || !state.dataMapping.y) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('.chart-content').remove();

    const { w, h } = getDimensions(state);
    const { x: xCol, y: yCol } = state.dataMapping;
    const data = state.data.filter(d => d[xCol] != null && d[yCol] != null);
    const categories = [...new Set(data.map(d => String(d[xCol])))];
    const colors = getPaletteColors(state.colorPalette);

    const margin = getMargins(state, categories.length);
    const innerW = w - margin.left - margin.right;
    const innerH = h - margin.top - margin.bottom;

    const g = svg.append('g').attr('class', 'chart-content')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleBand().domain(categories).range([0, innerW]).padding(0.3);
    const allVals = data.map(d => d[yCol]);
    const yScale = d3.scaleLinear()
      .domain([d3.min(allVals) * 0.95, d3.max(allVals) * 1.05]).nice()
      .range([innerH, 0]);

    // Grid
    if (state.grid.showY) {
      const gridG = g.append('g').attr('class', 'grid');
      gridG.call(d3.axisLeft(yScale).tickSize(-innerW).tickFormat(''));
      gridG.selectAll('line').attr('stroke', state.grid.color || '#e0e0e0')
        .attr('stroke-dasharray', state.grid.style === 'dashed' ? '4,4' : state.grid.style === 'dotted' ? '2,2' : '')
        .attr('stroke-width', 0.5);
      gridG.select('.domain').remove();
    }

    // Points with jitter
    categories.forEach((cat, ci) => {
      const vals = data.filter(d => String(d[xCol]) === cat);
      const cx = xScale(cat) + xScale.bandwidth() / 2;
      const color = colors[ci % colors.length];
      const jitterW = xScale.bandwidth() * state.dotplot.jitter;

      vals.forEach(d => {
        const jitter = (Math.random() - 0.5) * jitterW;
        g.append('circle')
          .attr('cx', cx + jitter)
          .attr('cy', yScale(d[yCol]))
          .attr('r', state.dotplot.pointSize)
          .attr('fill', color)
          .attr('opacity', state.dotplot.pointOpacity);
      });

      // Mean line
      if (state.dotplot.showMean) {
        const mean = d3.mean(vals, d => d[yCol]);
        const lineW = xScale.bandwidth() * 0.4;
        g.append('line')
          .attr('x1', cx - lineW).attr('x2', cx + lineW)
          .attr('y1', yScale(mean)).attr('y2', yScale(mean))
          .attr('stroke', '#000').attr('stroke-width', 2.5);
      }

      // Median line
      if (state.dotplot.showMedian) {
        const sorted = vals.map(d => d[yCol]).sort(d3.ascending);
        const median = d3.quantile(sorted, 0.5);
        const lineW = xScale.bandwidth() * 0.4;
        g.append('line')
          .attr('x1', cx - lineW).attr('x2', cx + lineW)
          .attr('y1', yScale(median)).attr('y2', yScale(median))
          .attr('stroke', '#333').attr('stroke-width', 2).attr('stroke-dasharray', '4,4');
      }
    });

    // Axes with proper rotation
    const xAxisG = g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(xScale));
    styleXAxis(xAxisG, state, categories.length);

    const yAxisG = g.append('g').call(d3.axisLeft(yScale));
    styleYAxis(yAxisG, state);

    // Labels
    renderAxisLabels(g, state, innerW, innerH, categories.length);

    // Title
    renderTitle(svg, state, w);

    if (onScalesReady) onScalesReady({ xScale, yScale, margin, innerWidth: innerW, innerHeight: innerH });
  }, [svgRef, state, onScalesReady]);

  return null;
};

export default D3DotPlot;
