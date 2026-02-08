/**
 * D3DotPlot - Strip chart / dot plot with jitter
 */
import React, { useEffect } from 'react';
import * as d3 from 'd3';
import { usePlotConfig } from '../context/PlotConfigContext';
import { getPaletteColors } from '../utils/colorPalettes';

const D3DotPlot = ({ svgRef, onScalesReady }) => {
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
        .attr('stroke-dasharray', state.grid.style === 'dashed' ? '4,4' : '');
      g.select('.grid .domain').remove();
    }

    // Points with jitter
    categories.forEach((cat, ci) => {
      const vals = data.filter(d => d[xCol] === cat);
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

    // Axes
    g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(xScale))
      .selectAll('text').style('font-family', state.xAxis.fontFamily).style('font-size', `${state.xAxis.fontSize}px`);
    g.append('g').call(d3.axisLeft(yScale))
      .selectAll('text').style('font-family', state.yAxis.fontFamily).style('font-size', `${state.yAxis.fontSize}px`);

    g.append('text').attr('x', innerW / 2).attr('y', innerH + 45).attr('text-anchor', 'middle')
      .attr('font-family', state.xAxis.fontFamily).attr('font-size', state.xAxis.fontSize)
      .attr('fill', state.xAxis.color).text(state.xAxis.label);
    g.append('text').attr('transform', 'rotate(-90)').attr('x', -innerH / 2).attr('y', -45).attr('text-anchor', 'middle')
      .attr('font-family', state.yAxis.fontFamily).attr('font-size', state.yAxis.fontSize)
      .attr('fill', state.yAxis.color).text(state.yAxis.label);

    if (state.title.text) {
      svg.append('text').attr('class', 'chart-content').attr('x', w / 2).attr('y', 25)
        .attr('text-anchor', 'middle').attr('font-family', state.title.fontFamily)
        .attr('font-size', state.title.fontSize).attr('font-weight', state.title.fontWeight)
        .attr('fill', state.title.color).text(state.title.text);
    }

    if (onScalesReady) onScalesReady({ xScale, yScale, margin, innerWidth: innerW, innerHeight: innerH });
  }, [svgRef, state, onScalesReady]);

  return null;
};

export default D3DotPlot;
