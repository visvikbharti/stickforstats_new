/**
 * D3WaterfallChart - Waterfall chart for sequential/cumulative change visualization.
 * Floating bars with connectors, total bar, and value labels.
 */
import { useEffect } from 'react';
import * as d3 from 'd3';
import { usePlotConfig } from '../context/PlotConfigContext';
import { getPaletteColors } from '../utils/colorPalettes';
import { getMargins, styleXAxis, styleYAxis, renderAxisLabels, renderTitle, getDimensions } from '../utils/chartHelpers';

const D3WaterfallChart = ({ svgRef, onScalesReady }) => {
  const { state } = usePlotConfig();

  useEffect(() => {
    if (!svgRef?.current || !state.data || !state.dataMapping.x || !state.dataMapping.y) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('.chart-content').remove();

    const { w, h } = getDimensions(state);
    const { x: catCol, y: valCol } = state.dataMapping;
    const wf = state.waterfall;
    const colors = getPaletteColors(state.colorPalette);

    // Process data
    const rawData = state.data.filter(d => d[catCol] != null && d[valCol] != null)
      .map(d => ({ category: String(d[catCol]), value: +d[valCol] }));

    // Compute running totals for waterfall bars
    const bars = [];
    let running = 0;
    rawData.forEach(d => {
      const start = running;
      running += d.value;
      bars.push({
        category: d.category,
        value: d.value,
        start,
        end: running,
        isTotal: false,
      });
    });

    // Add total bar
    if (wf.showTotal) {
      bars.push({
        category: wf.totalLabel || 'Total',
        value: running,
        start: 0,
        end: running,
        isTotal: true,
      });
    }

    const categories = bars.map(b => b.category);
    const categoryCount = categories.length;
    const margin = getMargins(state, categoryCount);
    const innerW = w - margin.left - margin.right;
    const innerH = h - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('class', 'chart-content')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleBand()
      .domain(categories)
      .range([0, innerW])
      .padding(0.3);

    const allVals = bars.flatMap(b => [b.start, b.end]);
    const yMin = Math.min(0, ...allVals);
    const yMax = Math.max(0, ...allVals);
    const yPad = (yMax - yMin) * 0.1 || 1;

    const yScale = d3.scaleLinear()
      .domain([yMin - yPad, yMax + yPad]).nice()
      .range([innerH, 0]);

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

    // Connector lines
    if (wf.showConnectors) {
      for (let i = 0; i < bars.length - 1; i++) {
        const curr = bars[i];
        const next = bars[i + 1];
        if (next.isTotal) continue;
        const x1 = xScale(curr.category) + xScale.bandwidth();
        const x2 = xScale(next.category);
        const y = yScale(curr.end);
        g.append('line')
          .attr('x1', x1).attr('x2', x2)
          .attr('y1', y).attr('y2', y)
          .attr('stroke', '#999').attr('stroke-width', 0.8)
          .attr('stroke-dasharray', '3,2');
      }
    }

    // Bars
    const posColor = wf.positiveColor || colors[2] || '#48bb78';
    const negColor = wf.negativeColor || colors[4] || '#f56565';
    const totalColor = colors[0] || '#667eea';

    bars.forEach(bar => {
      const barTop = Math.max(bar.start, bar.end);
      const barBottom = Math.min(bar.start, bar.end);
      const barH = Math.abs(yScale(barBottom) - yScale(barTop));

      let fill;
      if (bar.isTotal) fill = totalColor;
      else if (bar.value >= 0) fill = posColor;
      else fill = negColor;

      g.append('rect')
        .attr('x', xScale(bar.category))
        .attr('y', yScale(barTop))
        .attr('width', xScale.bandwidth())
        .attr('height', Math.max(1, barH))
        .attr('fill', fill)
        .attr('stroke', '#fff')
        .attr('stroke-width', 0.5);

      // Value labels
      if (wf.showValues) {
        const labelY = bar.value >= 0 ? yScale(barTop) - 4 : yScale(barBottom) + 12;
        g.append('text')
          .attr('x', xScale(bar.category) + xScale.bandwidth() / 2)
          .attr('y', labelY)
          .attr('text-anchor', 'middle')
          .attr('font-size', 9).attr('font-family', 'Arial, sans-serif')
          .attr('fill', '#333')
          .text(bar.isTotal ? bar.value.toFixed(1) : (bar.value >= 0 ? '+' : '') + bar.value.toFixed(1));
      }
    });

    // Zero line
    if (yScale.domain()[0] <= 0 && yScale.domain()[1] >= 0) {
      g.append('line')
        .attr('x1', 0).attr('x2', innerW)
        .attr('y1', yScale(0)).attr('y2', yScale(0))
        .attr('stroke', '#333').attr('stroke-width', 1);
    }

    // Axes
    const xAxisG = g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(xScale));
    styleXAxis(xAxisG, state, categoryCount);
    const yAxisG = g.append('g').call(d3.axisLeft(yScale));
    styleYAxis(yAxisG, state);
    renderAxisLabels(g, state, innerW, innerH, categoryCount);
    renderTitle(svg, state, w);

    if (onScalesReady) {
      onScalesReady({ xScale, yScale, margin, innerWidth: innerW, innerHeight: innerH });
    }
  }, [svgRef, state, onScalesReady]);

  return null;
};

export default D3WaterfallChart;
