/**
 * D3BarChart - Grouped/stacked bar chart with error bars
 */
import { useEffect } from 'react';
import * as d3 from 'd3';
import { usePlotConfig } from '../context/PlotConfigContext';
import { getPaletteColors } from '../utils/colorPalettes';
import { getMargins, styleXAxis, styleYAxis, renderAxisLabels, renderTitle, getDimensions } from '../utils/chartHelpers';

const D3BarChart = ({ svgRef, onScalesReady }) => {
  const { state } = usePlotConfig();

  useEffect(() => {
    if (!svgRef?.current || !state.data || !state.dataMapping.x) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('.chart-content').remove();

    const { w, h } = getDimensions(state);
    const { x: xCol, y: yCol, group: groupCol } = state.dataMapping;
    const data = state.data.filter(d => d[xCol] != null);
    const colors = getPaletteColors(state.colorPalette);
    const categories = [...new Set(data.map(d => String(d[xCol])))];

    const margin = getMargins(state, categories.length);
    const innerW = w - margin.left - margin.right;
    const innerH = h - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('class', 'chart-content')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    if (groupCol) {
      // Grouped bar chart
      const groups = [...new Set(data.map(d => d[groupCol]))];

      // Compute group means and error
      const grouped = [];
      categories.forEach(cat => {
        const entry = { category: cat };
        groups.forEach(grp => {
          const vals = data.filter(d => String(d[xCol]) === cat && d[groupCol] === grp).map(d => d[yCol]).filter(v => v != null);
          const mean = vals.length > 0 ? d3.mean(vals) : 0;
          const n = vals.length;
          const sd = vals.length > 1 ? d3.deviation(vals) : 0;
          const sem = n > 0 ? sd / Math.sqrt(n) : 0;
          entry[grp] = mean;
          entry[`${grp}_err`] = state.errorBars.type === 'sd' ? sd : state.errorBars.type === 'ci95' ? sem * 1.96 : sem;
          entry[`${grp}_n`] = n;
        });
        grouped.push(entry);
      });

      const x0 = d3.scaleBand().domain(categories).range([0, innerW]).padding(0.2);
      const x1 = d3.scaleBand().domain(groups).range([0, x0.bandwidth()]).padding(0.05);

      const allVals = grouped.flatMap(d => groups.map(grp => (d[grp] || 0) + (d[`${grp}_err`] || 0)));
      const yMax = d3.max(allVals) * 1.15;
      const yScale = d3.scaleLinear().domain([0, yMax]).nice().range([innerH, 0]);

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
      grouped.forEach((d) => {
        groups.forEach((grp, gi) => {
          const barX = x0(d.category) + x1(grp);
          const barH = innerH - yScale(d[grp] || 0);
          g.append('rect')
            .attr('x', barX)
            .attr('y', yScale(d[grp] || 0))
            .attr('width', x1.bandwidth())
            .attr('height', barH > 0 ? barH : 0)
            .attr('fill', colors[gi % colors.length])
            .attr('rx', 1);

          // Error bars
          if (state.errorBars.enabled && d[`${grp}_err`] > 0) {
            const cx = barX + x1.bandwidth() / 2;
            const yMean = yScale(d[grp] || 0);
            const errPx = yScale(0) - yScale(d[`${grp}_err`] || 0);
            const capW = state.errorBars.capWidth;

            g.append('line')
              .attr('x1', cx).attr('x2', cx)
              .attr('y1', yMean - errPx).attr('y2', yMean)
              .attr('stroke', state.errorBars.color)
              .attr('stroke-width', state.errorBars.lineWidth);
            g.append('line')
              .attr('x1', cx - capW).attr('x2', cx + capW)
              .attr('y1', yMean - errPx).attr('y2', yMean - errPx)
              .attr('stroke', state.errorBars.color)
              .attr('stroke-width', state.errorBars.lineWidth);
          }
        });
      });

      // Axes with proper rotation
      const xAxisG = g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(x0));
      styleXAxis(xAxisG, state, categories.length);

      const yAxisG = g.append('g').call(d3.axisLeft(yScale));
      styleYAxis(yAxisG, state);

      // Labels
      renderAxisLabels(g, state, innerW, innerH, categories.length);

      // Legend
      if (state.legend.show) {
        const legendG = svg.append('g')
          .attr('class', 'chart-content')
          .attr('transform', `translate(${w - margin.right - 10}, ${margin.top})`);
        groups.forEach((grp, i) => {
          legendG.append('rect')
            .attr('x', -80).attr('y', i * 18)
            .attr('width', 12).attr('height', 12)
            .attr('fill', colors[i % colors.length]).attr('rx', 2);
          legendG.append('text')
            .attr('x', -64).attr('y', i * 18 + 10)
            .text(grp)
            .attr('font-family', state.legend.fontFamily)
            .attr('font-size', state.legend.fontSize)
            .attr('fill', '#333');
        });
      }

      if (onScalesReady) {
        onScalesReady({ xScale: x0, yScale, margin, innerWidth: innerW, innerHeight: innerH });
      }
    } else if (yCol) {
      // Simple bar chart (aggregate by x)
      const aggregated = categories.map(cat => {
        const vals = data.filter(d => String(d[xCol]) === cat).map(d => d[yCol]).filter(v => v != null);
        const mean = vals.length > 0 ? d3.mean(vals) : 0;
        const sd = vals.length > 1 ? d3.deviation(vals) : 0;
        const sem = vals.length > 0 ? sd / Math.sqrt(vals.length) : 0;
        return {
          category: cat, mean, sd, sem, n: vals.length,
          err: state.errorBars.type === 'sd' ? sd : state.errorBars.type === 'ci95' ? sem * 1.96 : sem,
        };
      });

      const xScale = d3.scaleBand().domain(categories).range([0, innerW]).padding(0.3);
      const yMax = d3.max(aggregated, d => d.mean + d.err) * 1.15;
      const yScale = d3.scaleLinear().domain([0, yMax]).nice().range([innerH, 0]);

      if (state.grid.showY) {
        const gridG = g.append('g').attr('class', 'grid');
        gridG.call(d3.axisLeft(yScale).tickSize(-innerW).tickFormat(''));
        gridG.selectAll('line').attr('stroke', state.grid.color || '#e0e0e0')
          .attr('stroke-dasharray', state.grid.style === 'dashed' ? '4,4' : state.grid.style === 'dotted' ? '2,2' : '')
          .attr('stroke-width', 0.5);
        gridG.select('.domain').remove();
      }

      aggregated.forEach((d, i) => {
        g.append('rect')
          .attr('x', xScale(d.category))
          .attr('y', yScale(d.mean))
          .attr('width', xScale.bandwidth())
          .attr('height', innerH - yScale(d.mean))
          .attr('fill', colors[i % colors.length])
          .attr('rx', 2);

        if (state.errorBars.enabled && d.err > 0) {
          const cx = xScale(d.category) + xScale.bandwidth() / 2;
          const yMean = yScale(d.mean);
          const errPx = yScale(0) - yScale(d.err);
          const capW = state.errorBars.capWidth;

          g.append('line')
            .attr('x1', cx).attr('x2', cx)
            .attr('y1', yMean - errPx).attr('y2', yMean)
            .attr('stroke', state.errorBars.color)
            .attr('stroke-width', state.errorBars.lineWidth);
          g.append('line')
            .attr('x1', cx - capW).attr('x2', cx + capW)
            .attr('y1', yMean - errPx).attr('y2', yMean - errPx)
            .attr('stroke', state.errorBars.color)
            .attr('stroke-width', state.errorBars.lineWidth);
        }
      });

      // Axes with proper rotation
      const xAxisG = g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(xScale));
      styleXAxis(xAxisG, state, categories.length);

      const yAxisG = g.append('g').call(d3.axisLeft(yScale));
      styleYAxis(yAxisG, state);

      // Labels
      renderAxisLabels(g, state, innerW, innerH, categories.length);

      if (onScalesReady) {
        onScalesReady({ xScale, yScale, margin, innerWidth: innerW, innerHeight: innerH });
      }
    }

    // Title
    renderTitle(svg, state, w);
  }, [svgRef, state, onScalesReady]);

  return null;
};

export default D3BarChart;
