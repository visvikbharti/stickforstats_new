/**
 * D3BoxPlot - Box-and-whisker plot with optional individual points
 */
import React, { useEffect } from 'react';
import * as d3 from 'd3';
import { usePlotConfig } from '../context/PlotConfigContext';
import { getPaletteColors } from '../utils/colorPalettes';

const D3BoxPlot = ({ svgRef, onScalesReady }) => {
  const { state } = usePlotConfig();

  useEffect(() => {
    if (!svgRef?.current || !state.data || !state.dataMapping.x || !state.dataMapping.y) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('.chart-content').remove();

    const { width, height, unit } = state.dimensions;
    const w = unit === 'inches' ? width * 96 : width;
    const h = unit === 'inches' ? height * 96 : height;
    const margin = { top: 50, right: 30, bottom: 60, left: 60 };
    const innerW = w - margin.left - margin.right;
    const innerH = h - margin.top - margin.bottom;

    const g = svg.append('g').attr('class', 'chart-content')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const { x: xCol, y: yCol } = state.dataMapping;
    const data = state.data.filter(d => d[xCol] != null && d[yCol] != null);
    const categories = [...new Set(data.map(d => d[xCol]))];
    const colors = getPaletteColors(state.colorPalette);

    // Compute box statistics for each category
    const boxData = categories.map(cat => {
      const vals = data.filter(d => d[xCol] === cat).map(d => d[yCol]).sort(d3.ascending);
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

    const xScale = d3.scaleBand().domain(categories).range([0, innerW]).padding(0.3);
    const allVals = data.map(d => d[yCol]);
    const yScale = d3.scaleLinear()
      .domain([d3.min(allVals) * 0.95, d3.max(allVals) * 1.05]).nice()
      .range([innerH, 0]);

    // Grid
    if (state.grid.showY) {
      g.append('g').attr('class', 'grid')
        .call(d3.axisLeft(yScale).tickSize(-innerW).tickFormat(''))
        .selectAll('line').attr('stroke', state.grid.color)
        .attr('stroke-dasharray', state.grid.style === 'dashed' ? '4,4' : state.grid.style === 'dotted' ? '2,2' : '');
      g.select('.grid .domain').remove();
    }

    const boxWidth = Math.min(xScale.bandwidth(), 60);

    boxData.forEach((bd, i) => {
      const cx = xScale(bd.category) + xScale.bandwidth() / 2;
      const color = colors[i % colors.length];

      // Whisker lines
      g.append('line')
        .attr('x1', cx).attr('x2', cx)
        .attr('y1', yScale(bd.whiskerLow)).attr('y2', yScale(bd.q1))
        .attr('stroke', '#333').attr('stroke-width', 1);
      g.append('line')
        .attr('x1', cx).attr('x2', cx)
        .attr('y1', yScale(bd.q3)).attr('y2', yScale(bd.whiskerHigh))
        .attr('stroke', '#333').attr('stroke-width', 1);

      // Whisker caps
      g.append('line')
        .attr('x1', cx - boxWidth * 0.25).attr('x2', cx + boxWidth * 0.25)
        .attr('y1', yScale(bd.whiskerLow)).attr('y2', yScale(bd.whiskerLow))
        .attr('stroke', '#333').attr('stroke-width', 1);
      g.append('line')
        .attr('x1', cx - boxWidth * 0.25).attr('x2', cx + boxWidth * 0.25)
        .attr('y1', yScale(bd.whiskerHigh)).attr('y2', yScale(bd.whiskerHigh))
        .attr('stroke', '#333').attr('stroke-width', 1);

      // Box
      g.append('rect')
        .attr('x', cx - boxWidth / 2)
        .attr('y', yScale(bd.q3))
        .attr('width', boxWidth)
        .attr('height', yScale(bd.q1) - yScale(bd.q3))
        .attr('fill', color)
        .attr('fill-opacity', 0.3)
        .attr('stroke', color)
        .attr('stroke-width', 1.5);

      // Median line
      g.append('line')
        .attr('x1', cx - boxWidth / 2).attr('x2', cx + boxWidth / 2)
        .attr('y1', yScale(bd.median)).attr('y2', yScale(bd.median))
        .attr('stroke', '#333').attr('stroke-width', 2);

      // Mean diamond
      if (state.box.showMean) {
        const my = yScale(bd.mean);
        g.append('path')
          .attr('d', `M ${cx} ${my - 4} L ${cx + 4} ${my} L ${cx} ${my + 4} L ${cx - 4} ${my} Z`)
          .attr('fill', '#ff0000').attr('stroke', '#fff').attr('stroke-width', 0.5);
      }

      // Individual points
      if (state.box.showPoints) {
        bd.vals.forEach(v => {
          const jitter = (Math.random() - 0.5) * boxWidth * state.box.pointJitter;
          g.append('circle')
            .attr('cx', cx + jitter)
            .attr('cy', yScale(v))
            .attr('r', state.box.pointSize)
            .attr('fill', color)
            .attr('opacity', state.box.pointOpacity);
        });
      }

      // Outlier markers
      bd.outliers.forEach(v => {
        g.append('circle')
          .attr('cx', cx).attr('cy', yScale(v))
          .attr('r', 3)
          .attr('fill', 'none').attr('stroke', '#333').attr('stroke-width', 1);
      });
    });

    // Axes
    g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(xScale))
      .selectAll('text').style('font-family', state.xAxis.fontFamily).style('font-size', `${state.xAxis.fontSize}px`);
    g.append('g').call(d3.axisLeft(yScale))
      .selectAll('text').style('font-family', state.yAxis.fontFamily).style('font-size', `${state.yAxis.fontSize}px`);

    // Labels
    g.append('text').attr('x', innerW / 2).attr('y', innerH + 45).attr('text-anchor', 'middle')
      .attr('font-family', state.xAxis.fontFamily).attr('font-size', state.xAxis.fontSize)
      .attr('fill', state.xAxis.color).text(state.xAxis.label);
    g.append('text').attr('transform', 'rotate(-90)').attr('x', -innerH / 2).attr('y', -45).attr('text-anchor', 'middle')
      .attr('font-family', state.yAxis.fontFamily).attr('font-size', state.yAxis.fontSize)
      .attr('fill', state.yAxis.color).text(state.yAxis.label);

    // Title
    if (state.title.text) {
      svg.append('text').attr('class', 'chart-content').attr('x', w / 2).attr('y', 25)
        .attr('text-anchor', 'middle').attr('font-family', state.title.fontFamily)
        .attr('font-size', state.title.fontSize).attr('font-weight', state.title.fontWeight)
        .attr('fill', state.title.color).text(state.title.text);
    }

    if (onScalesReady) {
      onScalesReady({ xScale, yScale, margin, innerWidth: innerW, innerHeight: innerH });
    }
  }, [svgRef, state, onScalesReady]);

  return null;
};

export default D3BoxPlot;
