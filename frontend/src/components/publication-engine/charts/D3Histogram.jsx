/**
 * D3Histogram - Histogram with optional density overlay
 */
import React, { useEffect } from 'react';
import * as d3 from 'd3';
import { usePlotConfig } from '../context/PlotConfigContext';
import { getPaletteColors } from '../utils/colorPalettes';
import { getMargins, styleXAxis, styleYAxis, renderAxisLabels, renderTitle, getDimensions } from '../utils/chartHelpers';

const D3Histogram = ({ svgRef, onScalesReady }) => {
  const { state } = usePlotConfig();

  useEffect(() => {
    if (!svgRef?.current || !state.data || !state.dataMapping.x) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('.chart-content').remove();

    const { w, h } = getDimensions(state);
    const margin = getMargins(state);
    const innerW = w - margin.left - margin.right;
    const innerH = h - margin.top - margin.bottom;

    const g = svg.append('g').attr('class', 'chart-content')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xCol = state.dataMapping.x;
    const values = state.data.map(d => d[xCol]).filter(v => typeof v === 'number' && !isNaN(v));
    if (values.length === 0) return;

    const colors = getPaletteColors(state.colorPalette);
    const binCount = state.histogram.binCount || 20;

    const xScale = d3.scaleLinear()
      .domain(d3.extent(values)).nice()
      .range([0, innerW]);

    const histogram = d3.bin()
      .domain(xScale.domain())
      .thresholds(xScale.ticks(binCount));

    const bins = histogram(values);
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(bins, d => d.length)]).nice()
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

    // Bars
    g.selectAll('.hist-bar')
      .data(bins)
      .join('rect')
      .attr('class', 'hist-bar')
      .attr('x', d => xScale(d.x0) + 1)
      .attr('y', d => yScale(d.length))
      .attr('width', d => Math.max(0, xScale(d.x1) - xScale(d.x0) - 2))
      .attr('height', d => innerH - yScale(d.length))
      .attr('fill', colors[0])
      .attr('fill-opacity', 0.7)
      .attr('stroke', colors[0])
      .attr('stroke-width', 0.5);

    // Density overlay
    if (state.histogram.showDensityOverlay && values.length > 5) {
      const mean = d3.mean(values);
      const sd = d3.deviation(values);
      if (sd > 0) {
        const binWidth = bins[0] ? (bins[0].x1 - bins[0].x0) : 1;
        const scaleFactor = values.length * binWidth;

        const xRange = d3.range(xScale.domain()[0], xScale.domain()[1], (xScale.domain()[1] - xScale.domain()[0]) / 100);
        const normalData = xRange.map(x => {
          const z = (x - mean) / sd;
          const density = (1 / (sd * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z);
          return { x, y: density * scaleFactor };
        });

        const line = d3.line()
          .x(d => xScale(d.x))
          .y(d => yScale(d.y))
          .curve(d3.curveBasis);

        g.append('path')
          .datum(normalData)
          .attr('d', line)
          .attr('fill', 'none')
          .attr('stroke', colors[1] || '#e74c3c')
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '6,3');
      }
    }

    // Rug plot
    if (state.histogram.showRug) {
      values.forEach(v => {
        g.append('line')
          .attr('x1', xScale(v)).attr('x2', xScale(v))
          .attr('y1', innerH).attr('y2', innerH + 6)
          .attr('stroke', colors[0]).attr('stroke-width', 0.5).attr('opacity', 0.4);
      });
    }

    // Axes
    const xAxisG = g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(xScale));
    styleXAxis(xAxisG, state);

    const yAxisG = g.append('g').call(d3.axisLeft(yScale));
    styleYAxis(yAxisG, state);

    // Labels
    renderAxisLabels(g, state, innerW, innerH);

    // Title
    renderTitle(svg, state, w);

    if (onScalesReady) {
      onScalesReady({ xScale, yScale, margin, innerWidth: innerW, innerHeight: innerH });
    }
  }, [svgRef, state, onScalesReady]);

  return null;
};

export default D3Histogram;
