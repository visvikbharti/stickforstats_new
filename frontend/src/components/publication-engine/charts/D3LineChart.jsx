/**
 * D3LineChart - Line chart with error bands
 */
import { useEffect } from 'react';
import * as d3 from 'd3';
import { usePlotConfig } from '../context/PlotConfigContext';
import { getPaletteColors } from '../utils/colorPalettes';
import { getMargins, styleXAxis, styleYAxis, renderAxisLabels, renderTitle, getDimensions } from '../utils/chartHelpers';

const D3LineChart = ({ svgRef, onScalesReady }) => {
  const { state } = usePlotConfig();

  useEffect(() => {
    if (!svgRef?.current || !state.data || !state.dataMapping.x || !state.dataMapping.y) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('.chart-content').remove();

    const { w, h } = getDimensions(state);
    const { x: xCol, y: yCol, group: groupCol } = state.dataMapping;
    const data = state.data.filter(d => d[xCol] != null && d[yCol] != null);
    const colors = getPaletteColors(state.colorPalette);

    const xIsNum = typeof data[0]?.[xCol] === 'number';
    const categories = xIsNum ? [] : [...new Set(data.map(d => d[xCol]))];

    const margin = getMargins(state, categories.length);
    const innerW = w - margin.left - margin.right;
    const innerH = h - margin.top - margin.bottom;

    const g = svg.append('g').attr('class', 'chart-content')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = xIsNum
      ? d3.scaleLinear().domain(d3.extent(data, d => d[xCol])).nice().range([0, innerW])
      : d3.scalePoint().domain(categories).range([0, innerW]).padding(0.5);

    const yScale = d3.scaleLinear()
      .domain(d3.extent(data, d => d[yCol])).nice()
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

    // Axes with proper rotation
    const xAxisG = g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(xScale));
    styleXAxis(xAxisG, state, categories.length);

    const yAxisG = g.append('g').call(d3.axisLeft(yScale));
    styleYAxis(yAxisG, state);

    // Labels
    renderAxisLabels(g, state, innerW, innerH, categories.length);

    // Title
    renderTitle(svg, state, w);

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
