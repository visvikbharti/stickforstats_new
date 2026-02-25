/**
 * D3BoxPlot - Box-and-whisker plot with optional individual points
 */
import { useEffect } from 'react';
import * as d3 from 'd3';
import { usePlotConfig } from '../context/PlotConfigContext';
import { getPaletteColors } from '../utils/colorPalettes';
import { getMargins, styleXAxis, styleYAxis, renderAxisLabels, renderTitle, getDimensions } from '../utils/chartHelpers';

const D3BoxPlot = ({ svgRef, onScalesReady }) => {
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

    // Compute box statistics for each category
    const boxData = categories.map(cat => {
      const vals = data.filter(d => String(d[xCol]) === cat).map(d => d[yCol]).sort(d3.ascending);
      const q1 = d3.quantile(vals, 0.25);
      const median = d3.quantile(vals, 0.5);
      const q3 = d3.quantile(vals, 0.75);
      const iqr = q3 - q1;
      const whiskerLow = state.box.whiskerType === 'tukey'
        ? Math.max(d3.min(vals), q1 - 1.5 * iqr)
        : d3.min(vals);
      const whiskerHigh = state.box.whiskerType === 'tukey'
        ? Math.min(d3.max(vals), q3 + 1.5 * iqr)
        : d3.max(vals);
      const mean = d3.mean(vals);
      const outliers = state.box.whiskerType === 'tukey'
        ? vals.filter(v => v < q1 - 1.5 * iqr || v > q3 + 1.5 * iqr)
        : [];
      return { category: cat, q1, median, q3, whiskerLow, whiskerHigh, mean, vals, outliers };
    });

    const xScale = d3.scaleBand().domain(categories).range([0, innerW]).padding(0.25);
    const allVals = data.map(d => d[yCol]);
    const yPad = (d3.max(allVals) - d3.min(allVals)) * 0.08;
    const yScale = d3.scaleLinear()
      .domain([d3.min(allVals) - yPad, d3.max(allVals) + yPad]).nice()
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

    const boxWidth = Math.min(xScale.bandwidth(), 50);

    boxData.forEach((bd, i) => {
      const cx = xScale(bd.category) + xScale.bandwidth() / 2;
      const color = colors[i % colors.length];

      // Whisker lines
      g.append('line')
        .attr('x1', cx).attr('x2', cx)
        .attr('y1', yScale(bd.whiskerLow)).attr('y2', yScale(bd.q1))
        .attr('stroke', '#333').attr('stroke-width', 1.2);
      g.append('line')
        .attr('x1', cx).attr('x2', cx)
        .attr('y1', yScale(bd.q3)).attr('y2', yScale(bd.whiskerHigh))
        .attr('stroke', '#333').attr('stroke-width', 1.2);

      // Whisker caps
      const capW = boxWidth * 0.3;
      g.append('line')
        .attr('x1', cx - capW).attr('x2', cx + capW)
        .attr('y1', yScale(bd.whiskerLow)).attr('y2', yScale(bd.whiskerLow))
        .attr('stroke', '#333').attr('stroke-width', 1.2);
      g.append('line')
        .attr('x1', cx - capW).attr('x2', cx + capW)
        .attr('y1', yScale(bd.whiskerHigh)).attr('y2', yScale(bd.whiskerHigh))
        .attr('stroke', '#333').attr('stroke-width', 1.2);

      // Box
      g.append('rect')
        .attr('x', cx - boxWidth / 2)
        .attr('y', yScale(bd.q3))
        .attr('width', boxWidth)
        .attr('height', Math.max(0, yScale(bd.q1) - yScale(bd.q3)))
        .attr('fill', color)
        .attr('fill-opacity', 0.35)
        .attr('stroke', color)
        .attr('stroke-width', 1.5)
        .attr('rx', 1);

      // Median line
      g.append('line')
        .attr('x1', cx - boxWidth / 2).attr('x2', cx + boxWidth / 2)
        .attr('y1', yScale(bd.median)).attr('y2', yScale(bd.median))
        .attr('stroke', '#000').attr('stroke-width', 2);

      // Mean diamond
      if (state.box.showMean) {
        const my = yScale(bd.mean);
        g.append('path')
          .attr('d', `M ${cx} ${my - 5} L ${cx + 5} ${my} L ${cx} ${my + 5} L ${cx - 5} ${my} Z`)
          .attr('fill', '#e74c3c').attr('stroke', '#fff').attr('stroke-width', 0.8);
      }

      // Individual points (behind box)
      if (state.box.showPoints) {
        bd.vals.forEach(v => {
          const jitter = (Math.random() - 0.5) * boxWidth * state.box.pointJitter;
          g.append('circle')
            .attr('cx', cx + jitter)
            .attr('cy', yScale(v))
            .attr('r', state.box.pointSize)
            .attr('fill', color)
            .attr('opacity', state.box.pointOpacity)
            .attr('stroke', '#fff')
            .attr('stroke-width', 0.3);
        });
      }

      // Outlier markers
      bd.outliers.forEach(v => {
        g.append('circle')
          .attr('cx', cx).attr('cy', yScale(v))
          .attr('r', 3.5)
          .attr('fill', 'none').attr('stroke', '#e74c3c').attr('stroke-width', 1.5);
      });
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

    if (onScalesReady) {
      onScalesReady({ xScale, yScale, margin, innerWidth: innerW, innerHeight: innerH });
    }
  }, [svgRef, state, onScalesReady]);

  return null;
};

export default D3BoxPlot;
