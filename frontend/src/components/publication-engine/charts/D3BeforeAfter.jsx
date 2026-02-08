/**
 * D3BeforeAfter - Paired data before-after (slope) chart
 */
import React, { useEffect } from 'react';
import * as d3 from 'd3';
import { usePlotConfig } from '../context/PlotConfigContext';
import { getPaletteColors } from '../utils/colorPalettes';

const D3BeforeAfter = ({ svgRef, onScalesReady }) => {
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
    const colors = getPaletteColors(state.colorPalette);

    // x = before values, y = after values
    const pairs = state.data
      .filter(d => d[xCol] != null && d[yCol] != null)
      .map(d => ({ before: d[xCol], after: d[yCol] }));

    if (pairs.length === 0) return;

    const allVals = pairs.flatMap(p => [p.before, p.after]);
    const yScale = d3.scaleLinear()
      .domain([d3.min(allVals) * 0.9, d3.max(allVals) * 1.1]).nice()
      .range([innerH, 0]);

    const xScale = d3.scalePoint()
      .domain(['Before', 'After'])
      .range([innerW * 0.25, innerW * 0.75])
      .padding(0);

    // Grid
    if (state.grid.showY) {
      g.append('g').attr('class', 'grid')
        .call(d3.axisLeft(yScale).tickSize(-innerW).tickFormat(''))
        .selectAll('line').attr('stroke', state.grid.color)
        .attr('stroke-dasharray', state.grid.style === 'dashed' ? '4,4' : '');
      g.select('.grid .domain').remove();
    }

    // Connecting lines
    pairs.forEach((p, i) => {
      const increasing = p.after > p.before;
      g.append('line')
        .attr('x1', xScale('Before')).attr('y1', yScale(p.before))
        .attr('x2', xScale('After')).attr('y2', yScale(p.after))
        .attr('stroke', increasing ? colors[0] : colors[1] || '#999')
        .attr('stroke-width', state.beforeAfter.lineWidth)
        .attr('opacity', state.beforeAfter.lineOpacity);
    });

    // Points
    pairs.forEach((p, i) => {
      g.append('circle')
        .attr('cx', xScale('Before')).attr('cy', yScale(p.before))
        .attr('r', state.beforeAfter.pointSize)
        .attr('fill', colors[0]);
      g.append('circle')
        .attr('cx', xScale('After')).attr('cy', yScale(p.after))
        .attr('r', state.beforeAfter.pointSize)
        .attr('fill', colors[1] || colors[0]);
    });

    // Mean lines
    if (state.beforeAfter.showMean) {
      const meanBefore = d3.mean(pairs, p => p.before);
      const meanAfter = d3.mean(pairs, p => p.after);
      const lineW = 30;

      g.append('line')
        .attr('x1', xScale('Before') - lineW).attr('x2', xScale('Before') + lineW)
        .attr('y1', yScale(meanBefore)).attr('y2', yScale(meanBefore))
        .attr('stroke', '#000').attr('stroke-width', 2.5);
      g.append('line')
        .attr('x1', xScale('After') - lineW).attr('x2', xScale('After') + lineW)
        .attr('y1', yScale(meanAfter)).attr('y2', yScale(meanAfter))
        .attr('stroke', '#000').attr('stroke-width', 2.5);
    }

    // Axes
    g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(xScale))
      .selectAll('text').style('font-family', state.xAxis.fontFamily).style('font-size', `${state.xAxis.fontSize + 2}px`).style('font-weight', 'bold');
    g.append('g').call(d3.axisLeft(yScale))
      .selectAll('text').style('font-family', state.yAxis.fontFamily).style('font-size', `${state.yAxis.fontSize}px`);

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

export default D3BeforeAfter;
