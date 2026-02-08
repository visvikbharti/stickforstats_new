/**
 * D3ScatterPlot - Scatter plot with regression line and CI bands
 */
import React, { useEffect } from 'react';
import * as d3 from 'd3';
import { usePlotConfig } from '../context/PlotConfigContext';
import { getPaletteColors } from '../utils/colorPalettes';
import { getMargins, styleXAxis, styleYAxis, renderAxisLabels, renderTitle, getDimensions } from '../utils/chartHelpers';

const D3ScatterPlot = ({ svgRef, onScalesReady }) => {
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

    const { x: xCol, y: yCol, group: groupCol } = state.dataMapping;
    const data = state.data.filter(d => d[xCol] != null && d[yCol] != null);
    const colors = getPaletteColors(state.colorPalette);

    const xScale = (state.xAxis.scale === 'log' ? d3.scaleLog() : d3.scaleLinear())
      .domain(d3.extent(data, d => d[xCol])).nice()
      .range([0, innerW]);
    const yScale = (state.yAxis.scale === 'log' ? d3.scaleLog() : d3.scaleLinear())
      .domain(d3.extent(data, d => d[yCol])).nice()
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
    if (state.grid.showX) {
      const gridG = g.append('g').attr('class', 'grid')
        .attr('transform', `translate(0,${innerH})`);
      gridG.call(d3.axisBottom(xScale).tickSize(-innerH).tickFormat(''));
      gridG.selectAll('line').attr('stroke', state.grid.color || '#e0e0e0')
        .attr('stroke-dasharray', state.grid.style === 'dashed' ? '4,4' : state.grid.style === 'dotted' ? '2,2' : '')
        .attr('stroke-width', 0.5);
      gridG.select('.domain').remove();
    }

    // Regression line
    if (state.scatter.showRegression && data.length > 2) {
      const xVals = data.map(d => d[xCol]);
      const yVals = data.map(d => d[yCol]);
      const n = xVals.length;
      const sumX = d3.sum(xVals);
      const sumY = d3.sum(yVals);
      const sumXY = d3.sum(xVals.map((x, i) => x * yVals[i]));
      const sumX2 = d3.sum(xVals.map(x => x * x));
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      const xDomain = xScale.domain();
      const lineData = [
        { x: xDomain[0], y: slope * xDomain[0] + intercept },
        { x: xDomain[1], y: slope * xDomain[1] + intercept },
      ];

      g.append('line')
        .attr('x1', xScale(lineData[0].x)).attr('y1', yScale(lineData[0].y))
        .attr('x2', xScale(lineData[1].x)).attr('y2', yScale(lineData[1].y))
        .attr('stroke', '#333').attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '6,3');

      // CI band
      if (state.scatter.showCI) {
        const yPred = xVals.map(x => slope * x + intercept);
        const residuals = yVals.map((y, i) => y - yPred[i]);
        const sse = d3.sum(residuals.map(r => r * r));
        const mse = sse / (n - 2);
        const xMean = d3.mean(xVals);
        const ssx = d3.sum(xVals.map(x => (x - xMean) ** 2));
        const tValue = 1.96; // approximate for large n

        const nPoints = 50;
        const xRange = d3.range(xDomain[0], xDomain[1], (xDomain[1] - xDomain[0]) / nPoints);
        const upper = [];
        const lower = [];
        xRange.forEach(x => {
          const yHat = slope * x + intercept;
          const se = Math.sqrt(mse * (1 / n + (x - xMean) ** 2 / ssx));
          upper.push({ x, y: yHat + tValue * se });
          lower.push({ x, y: yHat - tValue * se });
        });

        const area = d3.area()
          .x(d => xScale(d.x))
          .y0((d, i) => yScale(lower[i].y))
          .y1(d => yScale(d.y));

        g.append('path')
          .datum(upper)
          .attr('d', area)
          .attr('fill', colors[0])
          .attr('fill-opacity', 0.1)
          .attr('stroke', 'none');
      }
    }

    // Points
    const groups = groupCol ? [...new Set(data.map(d => d[groupCol]))] : [null];
    groups.forEach((grp, gi) => {
      const pts = grp ? data.filter(d => d[groupCol] === grp) : data;
      g.selectAll(`.point-${gi}`)
        .data(pts)
        .join('circle')
        .attr('class', `point-${gi}`)
        .attr('cx', d => xScale(d[xCol]))
        .attr('cy', d => yScale(d[yCol]))
        .attr('r', state.scatter.pointSize)
        .attr('fill', colors[gi % colors.length])
        .attr('opacity', state.scatter.pointOpacity);
    });

    // Axes
    const xAxisG = g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(xScale));
    styleXAxis(xAxisG, state);

    const yAxisG = g.append('g').call(d3.axisLeft(yScale));
    styleYAxis(yAxisG, state);

    // Labels
    renderAxisLabels(g, state, innerW, innerH);

    // Title
    renderTitle(svg, state, w);

    // Legend
    if (state.legend.show && groupCol && groups.length > 1) {
      const legendG = svg.append('g').attr('class', 'chart-content')
        .attr('transform', `translate(${w - margin.right - 10}, ${margin.top})`);
      groups.forEach((grp, i) => {
        legendG.append('circle').attr('cx', -70).attr('cy', i * 18 + 6).attr('r', 4)
          .attr('fill', colors[i % colors.length]);
        legendG.append('text').attr('x', -62).attr('y', i * 18 + 10).text(grp)
          .attr('font-family', state.legend.fontFamily).attr('font-size', state.legend.fontSize).attr('fill', '#333');
      });
    }

    if (onScalesReady) {
      onScalesReady({ xScale, yScale, margin, innerWidth: innerW, innerHeight: innerH });
    }
  }, [svgRef, state, onScalesReady]);

  return null;
};

export default D3ScatterPlot;
