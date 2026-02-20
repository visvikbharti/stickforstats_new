/**
 * D3KaplanMeier - Kaplan-Meier survival curve with CI bands,
 * censoring marks, multi-group overlay, risk table, and median line.
 */
import React, { useEffect } from 'react';
import * as d3 from 'd3';
import { usePlotConfig } from '../context/PlotConfigContext';
import { getPaletteColors } from '../utils/colorPalettes';
import { getMargins, styleXAxis, styleYAxis, renderAxisLabels, renderTitle, getDimensions } from '../utils/chartHelpers';
import { processKMData } from '../utils/kaplanMeierCalc';

const D3KaplanMeier = ({ svgRef, onScalesReady }) => {
  const { state } = usePlotConfig();

  useEffect(() => {
    if (!svgRef?.current || !state.data || !state.dataMapping.x || !state.dataMapping.y) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('.chart-content').remove();

    const { w, h } = getDimensions(state);
    const km = state.kaplanMeier;
    const riskTableHeight = km.showRiskTable ? 60 : 0;

    const margin = {
      ...getMargins(state),
      bottom: getMargins(state).bottom + riskTableHeight,
    };
    const innerW = w - margin.left - margin.right;
    const innerH = h - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('class', 'chart-content')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const { x: timeCol, y: eventCol, group: groupCol } = state.dataMapping;
    const colors = getPaletteColors(state.colorPalette);

    // Process KM data
    const kmData = processKMData(state.data, timeCol, eventCol, groupCol);
    const groupNames = Object.keys(kmData.groups);

    // Find global time range
    let maxTime = 0;
    for (const grp of groupNames) {
      const curve = kmData.groups[grp].curve;
      if (curve.length) maxTime = Math.max(maxTime, curve[curve.length - 1].time);
    }

    const xScale = d3.scaleLinear().domain([0, maxTime]).nice().range([0, innerW]);
    const yScale = d3.scaleLinear().domain([0, 1]).range([innerH, 0]);

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

    // Draw each group
    groupNames.forEach((grp, gi) => {
      const { curve, ci, censorTimes } = kmData.groups[grp];
      const color = colors[gi % colors.length];

      // CI band
      if (km.showCI && ci.length > 1) {
        // Build step-function area data for CI
        const ciAreaData = [];
        for (let i = 0; i < ci.length; i++) {
          ciAreaData.push({ time: ci[i].time, lower: ci[i].lower, upper: ci[i].upper });
          if (i < ci.length - 1) {
            ciAreaData.push({ time: ci[i + 1].time, lower: ci[i].lower, upper: ci[i].upper });
          }
        }

        const area = d3.area()
          .x(d => xScale(d.time))
          .y0(d => yScale(d.lower))
          .y1(d => yScale(d.upper));

        g.append('path')
          .datum(ciAreaData)
          .attr('d', area)
          .attr('fill', color)
          .attr('fill-opacity', 0.15)
          .attr('stroke', 'none');
      }

      // Step curve
      const line = d3.line()
        .x(d => xScale(d.time))
        .y(d => yScale(d.survival))
        .curve(d3.curveStepAfter);

      g.append('path')
        .datum(curve)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 2);

      // Censoring marks
      if (km.showCensorMarks && censorTimes.length > 0) {
        const markSize = km.censorMarkSize || 6;
        censorTimes.forEach(ct => {
          g.append('line')
            .attr('x1', xScale(ct.time))
            .attr('x2', xScale(ct.time))
            .attr('y1', yScale(ct.survival) - markSize / 2)
            .attr('y2', yScale(ct.survival) + markSize / 2)
            .attr('stroke', color)
            .attr('stroke-width', 1.5);
        });
      }

      // Median survival line
      if (km.showMedianLine) {
        const median = kmData.groups[grp].median;
        if (median !== null) {
          // Horizontal from y=0.5 to median time
          g.append('line')
            .attr('x1', 0).attr('x2', xScale(median))
            .attr('y1', yScale(0.5)).attr('y2', yScale(0.5))
            .attr('stroke', color).attr('stroke-width', 1)
            .attr('stroke-dasharray', '4,3').attr('opacity', 0.6);
          // Vertical from median time down
          g.append('line')
            .attr('x1', xScale(median)).attr('x2', xScale(median))
            .attr('y1', yScale(0.5)).attr('y2', yScale(0))
            .attr('stroke', color).attr('stroke-width', 1)
            .attr('stroke-dasharray', '4,3').attr('opacity', 0.6);
        }
      }
    });

    // Axes
    const xAxisG = g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(xScale));
    styleXAxis(xAxisG, state);
    const yAxisG = g.append('g').call(d3.axisLeft(yScale).tickFormat(d3.format('.0%')));
    styleYAxis(yAxisG, state);
    renderAxisLabels(g, state, innerW, innerH);
    renderTitle(svg, state, w);

    // Risk table
    if (km.showRiskTable) {
      const tableG = g.append('g')
        .attr('transform', `translate(0,${innerH + 40})`);

      groupNames.forEach((grp, gi) => {
        const rt = kmData.groups[grp].riskTable;
        const yOff = gi * 16;
        const color = colors[gi % colors.length];

        tableG.append('text')
          .attr('x', -10).attr('y', yOff + 10)
          .attr('text-anchor', 'end')
          .attr('font-size', 8).attr('font-family', 'Arial, sans-serif')
          .attr('fill', color)
          .text(groupNames.length > 1 ? grp : 'At risk');

        rt.forEach(pt => {
          tableG.append('text')
            .attr('x', xScale(pt.time)).attr('y', yOff + 10)
            .attr('text-anchor', 'middle')
            .attr('font-size', 8).attr('font-family', 'Arial, sans-serif')
            .attr('fill', '#333')
            .text(pt.nRisk);
        });
      });
    }

    // Legend
    if (state.legend.show && groupCol && groupNames.length > 1) {
      const legendG = svg.append('g').attr('class', 'chart-content')
        .attr('transform', `translate(${w - margin.right - 10}, ${margin.top})`);
      groupNames.forEach((grp, i) => {
        legendG.append('line')
          .attr('x1', -80).attr('x2', -65)
          .attr('y1', i * 18 + 6).attr('y2', i * 18 + 6)
          .attr('stroke', colors[i % colors.length]).attr('stroke-width', 2);
        legendG.append('text')
          .attr('x', -60).attr('y', i * 18 + 10).text(grp)
          .attr('font-family', state.legend.fontFamily).attr('font-size', state.legend.fontSize).attr('fill', '#333');
      });
    }

    if (onScalesReady) {
      onScalesReady({ xScale, yScale, margin, innerWidth: innerW, innerHeight: innerH });
    }
  }, [svgRef, state, onScalesReady]);

  return null;
};

export default D3KaplanMeier;
