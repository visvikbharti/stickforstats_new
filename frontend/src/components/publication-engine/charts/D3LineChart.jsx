/**
 * D3LineChart - Line chart with error bands
 */
import React, { useEffect } from 'react';
import * as d3 from 'd3';
import { usePlotConfig } from '../context/PlotConfigContext';
import { getPaletteColors } from '../utils/colorPalettes';

const D3LineChart = ({ svgRef, onScalesReady }) => {
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

    const { x: xCol, y: yCol, group: groupCol } = state.dataMapping;
    const data = state.data.filter(d => d[xCol] != null && d[yCol] != null);
    const colors = getPaletteColors(state.colorPalette);

    const xIsNum = typeof data[0]?.[xCol] === 'number';
    const xScale = xIsNum
      ? d3.scaleLinear().domain(d3.extent(data, d => d[xCol])).nice().range([0, innerW])
      : d3.scalePoint().domain([...new Set(data.map(d => d[xCol]))]).range([0, innerW]).padding(0.5);

    const yScale = d3.scaleLinear()
      .domain(d3.extent(data, d => d[yCol])).nice()
      .range([innerH, 0]);

    // Grid
    if (state.grid.showY) {
      g.append('g').attr('class', 'grid')
        .call(d3.axisLeft(yScale).tickSize(-innerW).tickFormat(''))
        .selectAll('line').attr('stroke', state.grid.color)
        .attr('stroke-dasharray', state.grid.style === 'dashed' ? '4,4' : '');
      g.select('.grid .domain').remove();
    }

    const curveType = state.line.interpolation === 'monotone' ? d3.curveMonotoneX
      : state.line.interpolation === 'step' ? d3.curveStep : d3.curveLinear;

    const groups = groupCol ? [...new Set(data.map(d => d[groupCol]))] : [null];

    groups.forEach((grp, gi) => {
      const pts = (grp ? data.filter(d => d[groupCol] === grp) : data)
        .sort((a, b) => (a[xCol] > b[xCol] ? 1 : -1));
      const color = colors[gi % colors.length];

      const line = d3.line()
        .x(d => xScale(d[xCol]))
        .y(d => yScale(d[yCol]))
        .curve(curveType);

      // Error band
      if (state.line.showErrorBand && pts.length > 3) {
        const mean = d3.mean(pts, d => d[yCol]);
        const sd = d3.deviation(pts, d => d[yCol]);
        const area = d3.area()
          .x(d => xScale(d[xCol]))
          .y0(d => yScale(d[yCol] - sd))
          .y1(d => yScale(d[yCol] + sd))
          .curve(curveType);

        g.append('path').datum(pts).attr('d', area)
          .attr('fill', color).attr('fill-opacity', 0.1).attr('stroke', 'none');
      }

      // Line
      g.append('path').datum(pts).attr('d', line)
        .attr('fill', 'none').attr('stroke', color)
        .attr('stroke-width', state.line.lineWidth);

      // Points
      if (state.line.showPoints) {
        g.selectAll(`.line-point-${gi}`)
          .data(pts).join('circle')
          .attr('class', `line-point-${gi}`)
          .attr('cx', d => xScale(d[xCol]))
          .attr('cy', d => yScale(d[yCol]))
          .attr('r', state.line.pointSize)
          .attr('fill', color);
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

    // Legend
    if (state.legend.show && groupCol && groups.length > 1) {
      const legendG = svg.append('g').attr('class', 'chart-content')
        .attr('transform', `translate(${w - margin.right - 10}, ${margin.top})`);
      groups.forEach((grp, i) => {
        legendG.append('line').attr('x1', -80).attr('x2', -65).attr('y1', i * 18 + 6).attr('y2', i * 18 + 6)
          .attr('stroke', colors[i % colors.length]).attr('stroke-width', 2);
        legendG.append('text').attr('x', -62).attr('y', i * 18 + 10).text(grp)
          .attr('font-family', state.legend.fontFamily).attr('font-size', state.legend.fontSize).attr('fill', '#333');
      });
    }

    if (onScalesReady) onScalesReady({ xScale, yScale, margin, innerWidth: innerW, innerHeight: innerH });
  }, [svgRef, state, onScalesReady]);

  return null;
};

export default D3LineChart;
