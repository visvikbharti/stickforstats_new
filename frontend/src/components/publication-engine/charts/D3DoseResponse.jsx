/**
 * D3DoseResponse - Dose-response / sigmoidal curve with IC50/EC50.
 * Log-scale X axis, 4PL fitting, error bars, asymptote lines.
 */
import React, { useEffect } from 'react';
import * as d3 from 'd3';
import { usePlotConfig } from '../context/PlotConfigContext';
import { getPaletteColors } from '../utils/colorPalettes';
import { getMargins, styleXAxis, styleYAxis, renderAxisLabels, renderTitle, getDimensions } from '../utils/chartHelpers';
import { fit4PL } from '../utils/curveFitting';

const D3DoseResponse = ({ svgRef, onScalesReady }) => {
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

    const { x: xCol, y: yCol, group: groupCol, error: errorCol } = state.dataMapping;
    const dr = state.doseResponse;
    const colors = getPaletteColors(state.colorPalette);

    const allData = state.data.filter(d => d[xCol] != null && d[yCol] != null && +d[xCol] > 0);
    const groups = groupCol ? [...new Set(allData.map(d => d[groupCol]))] : [null];

    // Global scales (log X)
    const allX = allData.map(d => +d[xCol]);
    const allY = allData.map(d => +d[yCol]);

    const xScale = d3.scaleLog()
      .domain([Math.min(...allX) * 0.5, Math.max(...allX) * 2]).nice()
      .range([0, innerW]);
    const yScale = d3.scaleLinear()
      .domain(d3.extent(allY)).nice()
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

    groups.forEach((grp, gi) => {
      const pts = grp != null ? allData.filter(d => d[groupCol] === grp) : allData;
      const xVals = pts.map(d => +d[xCol]);
      const yVals = pts.map(d => +d[yCol]);
      const color = colors[gi % colors.length];

      // Fit 4PL
      let fitResult = null;
      try {
        fitResult = fit4PL(xVals, yVals, { curvePoints: dr.curvePoints });
      } catch (e) {
        // Fitting failed — just show data points
      }

      // Draw fitted curve
      if (fitResult && fitResult.success && fitResult.curve) {
        const line = d3.line()
          .x(d => xScale(d.x))
          .y(d => yScale(d.y))
          .curve(d3.curveBasis);

        const clippedCurve = fitResult.curve.filter(d =>
          d.x >= xScale.domain()[0] && d.x <= xScale.domain()[1]
        );

        g.append('path')
          .datum(clippedCurve)
          .attr('d', line)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', 2);

        const params = fitResult.parameters;

        // IC50 reference lines
        if (dr.showIC50Line && fitResult.ic50) {
          const ic50Y = (params.Top + params.Bottom) / 2;
          // Horizontal line
          g.append('line')
            .attr('x1', 0).attr('x2', xScale(fitResult.ic50))
            .attr('y1', yScale(ic50Y)).attr('y2', yScale(ic50Y))
            .attr('stroke', color).attr('stroke-width', 1)
            .attr('stroke-dasharray', '4,3').attr('opacity', 0.6);
          // Vertical line
          g.append('line')
            .attr('x1', xScale(fitResult.ic50)).attr('x2', xScale(fitResult.ic50))
            .attr('y1', yScale(ic50Y)).attr('y2', yScale(yScale.domain()[0]))
            .attr('stroke', color).attr('stroke-width', 1)
            .attr('stroke-dasharray', '4,3').attr('opacity', 0.6);
          // Label
          g.append('text')
            .attr('x', xScale(fitResult.ic50) + 4)
            .attr('y', yScale(ic50Y) - 4)
            .attr('font-size', 9).attr('font-family', 'Arial, sans-serif')
            .attr('fill', color)
            .text(`IC50 = ${fitResult.ic50.toExponential(2)}`);
        }

        // Asymptote lines
        if (dr.showAsymptotes) {
          // Top
          g.append('line')
            .attr('x1', 0).attr('x2', innerW)
            .attr('y1', yScale(params.Top)).attr('y2', yScale(params.Top))
            .attr('stroke', '#999').attr('stroke-width', 1)
            .attr('stroke-dasharray', '2,4').attr('opacity', 0.5);
          // Bottom
          g.append('line')
            .attr('x1', 0).attr('x2', innerW)
            .attr('y1', yScale(params.Bottom)).attr('y2', yScale(params.Bottom))
            .attr('stroke', '#999').attr('stroke-width', 1)
            .attr('stroke-dasharray', '2,4').attr('opacity', 0.5);
        }

        // Hill slope annotation
        if (dr.showHillSlope) {
          g.append('text')
            .attr('x', innerW - 5)
            .attr('y', 15 + gi * 14)
            .attr('text-anchor', 'end')
            .attr('font-size', 9).attr('font-family', 'Arial, sans-serif')
            .attr('fill', color)
            .text(`Hill slope = ${params.HillSlope.toFixed(2)}`);
        }
      }

      // Error bars
      if (dr.showErrorBars && errorCol) {
        pts.forEach(d => {
          const cx = xScale(+d[xCol]);
          const cy = yScale(+d[yCol]);
          const err = +d[errorCol];
          if (!isNaN(err) && err > 0) {
            g.append('line')
              .attr('x1', cx).attr('x2', cx)
              .attr('y1', yScale(+d[yCol] - err)).attr('y2', yScale(+d[yCol] + err))
              .attr('stroke', color).attr('stroke-width', 1);
          }
        });
      }

      // Data points
      g.selectAll(`.point-${gi}`)
        .data(pts)
        .join('circle')
        .attr('class', `point-${gi}`)
        .attr('cx', d => xScale(+d[xCol]))
        .attr('cy', d => yScale(+d[yCol]))
        .attr('r', 3.5)
        .attr('fill', color)
        .attr('stroke', '#fff')
        .attr('stroke-width', 0.5);
    });

    // Axes
    const xAxisG = g.append('g').attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(6, '.0e'));
    styleXAxis(xAxisG, state);
    const yAxisG = g.append('g').call(d3.axisLeft(yScale));
    styleYAxis(yAxisG, state);
    renderAxisLabels(g, state, innerW, innerH);
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

export default D3DoseResponse;
