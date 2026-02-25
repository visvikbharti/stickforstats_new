/**
 * D3ViolinPlot - Violin plot with optional box overlay
 */
import { useEffect } from 'react';
import * as d3 from 'd3';
import { usePlotConfig } from '../context/PlotConfigContext';
import { getPaletteColors } from '../utils/colorPalettes';
import { getMargins, styleXAxis, styleYAxis, renderAxisLabels, renderTitle, getDimensions } from '../utils/chartHelpers';

const D3ViolinPlot = ({ svgRef, onScalesReady }) => {
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

    const allVals = data.map(d => d[yCol]);
    const xScale = d3.scaleBand().domain(categories).range([0, innerW]).padding(0.15);
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

    const violinWidth = xScale.bandwidth();

    categories.forEach((cat, i) => {
      const vals = data.filter(d => String(d[xCol]) === cat).map(d => d[yCol]).sort(d3.ascending);
      if (vals.length < 2) return;

      const cx = xScale(cat) + violinWidth / 2;
      const color = colors[i % colors.length];

      // KDE estimation
      const bandwidth = state.violin.bandwidth || (d3.deviation(vals) * 0.9 * Math.pow(vals.length, -0.2));
      const domain = yScale.domain();
      const nBins = 50;
      const step = (domain[1] - domain[0]) / nBins;
      const density = [];

      for (let y = domain[0]; y <= domain[1]; y += step) {
        let sum = 0;
        vals.forEach(v => {
          const u = (y - v) / bandwidth;
          sum += Math.exp(-0.5 * u * u) / (bandwidth * Math.sqrt(2 * Math.PI));
        });
        density.push({ y, d: sum / vals.length });
      }

      const maxDensity = d3.max(density, d => d.d);
      const dScale = d3.scaleLinear().domain([0, maxDensity]).range([0, violinWidth / 2 - 2]);

      // Violin shape
      const area = d3.area()
        .x0(d => cx - dScale(d.d))
        .x1(d => cx + dScale(d.d))
        .y(d => yScale(d.y))
        .curve(d3.curveBasis);

      g.append('path')
        .datum(density)
        .attr('d', area)
        .attr('fill', color)
        .attr('fill-opacity', 0.3)
        .attr('stroke', color)
        .attr('stroke-width', 1.5);

      // Box overlay
      if (state.violin.showBox) {
        const q1 = d3.quantile(vals, 0.25);
        const median = d3.quantile(vals, 0.5);
        const q3 = d3.quantile(vals, 0.75);
        const boxW = 6;

        g.append('rect')
          .attr('x', cx - boxW / 2).attr('y', yScale(q3))
          .attr('width', boxW).attr('height', yScale(q1) - yScale(q3))
          .attr('fill', '#333').attr('fill-opacity', 0.7).attr('rx', 1);

        g.append('line')
          .attr('x1', cx - boxW / 2).attr('x2', cx + boxW / 2)
          .attr('y1', yScale(median)).attr('y2', yScale(median))
          .attr('stroke', '#fff').attr('stroke-width', 2);
      }

      // Median marker
      if (state.violin.showMedian && !state.violin.showBox) {
        const median = d3.quantile(vals, 0.5);
        g.append('circle').attr('cx', cx).attr('cy', yScale(median))
          .attr('r', 3).attr('fill', '#333');
      }

      // Individual points
      if (state.violin.showPoints) {
        vals.forEach(v => {
          const jitter = (Math.random() - 0.5) * 8;
          g.append('circle').attr('cx', cx + jitter).attr('cy', yScale(v))
            .attr('r', 2).attr('fill', color).attr('opacity', 0.5);
        });
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

export default D3ViolinPlot;
