/**
 * D3ForestPlot - Forest plot for meta-analysis / hazard ratio visualization.
 * CI lines, weight-sized squares, diamond for pooled effect, reference line.
 */
import { useEffect } from 'react';
import * as d3 from 'd3';
import { usePlotConfig } from '../context/PlotConfigContext';
import { getPaletteColors } from '../utils/colorPalettes';
import { styleXAxis, renderTitle, getDimensions } from '../utils/chartHelpers';

const D3ForestPlot = ({ svgRef, onScalesReady }) => {
  const { state } = usePlotConfig();

  useEffect(() => {
    if (!svgRef?.current || !state.data || !state.dataMapping.x || !state.dataMapping.y) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('.chart-content').remove();

    const { w, h } = getDimensions(state);
    const fp = state.forest;
    const colors = getPaletteColors(state.colorPalette);

    // Data mapping: x = effect_size, y = study_label, error = ci_lower/ci_upper (or SE)
    const { x: esCol, y: studyCol, error: errorCol } = state.dataMapping;

    // Parse data — expect ci_lower and ci_upper columns, or error as SE
    const studies = state.data
      .filter(d => d[esCol] != null && d[studyCol] != null)
      .map(d => {
        const es = +d[esCol];
        let ciLower, ciUpper;

        // Try to find ci_lower/ci_upper columns
        const lowerCol = Object.keys(d).find(k => /ci.?lower|lower.?ci|lcl/i.test(k));
        const upperCol = Object.keys(d).find(k => /ci.?upper|upper.?ci|ucl/i.test(k));

        if (lowerCol && upperCol) {
          ciLower = +d[lowerCol];
          ciUpper = +d[upperCol];
        } else if (errorCol && d[errorCol] != null) {
          const se = +d[errorCol];
          ciLower = es - 1.96 * se;
          ciUpper = es + 1.96 * se;
        } else {
          ciLower = es;
          ciUpper = es;
        }

        // Weight column (optional)
        const weightCol = Object.keys(d).find(k => /weight/i.test(k));
        const weight = weightCol ? +d[weightCol] : 1;

        return {
          study: String(d[studyCol]),
          es,
          ciLower,
          ciUpper,
          weight: isNaN(weight) ? 1 : weight,
        };
      });

    if (!studies.length) return;

    // Layout
    const labelWidth = 140;
    const statsWidth = fp.showWeights ? 120 : 80;
    const margin = { top: state.title.text ? 55 : 30, right: statsWidth + 10, bottom: 55, left: labelWidth + 10 };
    const innerW = w - margin.left - margin.right;
    const innerH = h - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('class', 'chart-content')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const studyNames = studies.map(s => s.study);

    // X scale (effect size)
    const allVals = studies.flatMap(s => [s.ciLower, s.ciUpper]);
    const xMin = Math.min(...allVals, fp.referenceValue);
    const xMax = Math.max(...allVals, fp.referenceValue);
    const xPad = (xMax - xMin) * 0.15 || 0.5;

    const xScale = (fp.logScale
      ? d3.scaleLog().domain([Math.max(0.01, xMin - xPad * 0.5), xMax + xPad])
      : d3.scaleLinear().domain([xMin - xPad, xMax + xPad])
    ).nice().range([0, innerW]);

    // Y scale (studies)
    const rowHeight = Math.min(30, innerH / (studies.length + 1));
    const yScale = d3.scaleBand()
      .domain(studyNames)
      .range([0, studies.length * rowHeight])
      .padding(0.3);

    // Reference line
    g.append('line')
      .attr('x1', xScale(fp.referenceValue))
      .attr('x2', xScale(fp.referenceValue))
      .attr('y1', 0)
      .attr('y2', studies.length * rowHeight)
      .attr('stroke', '#333')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,3');

    // Weight scale for square size
    const maxWeight = d3.max(studies, s => s.weight) || 1;
    const [minSq, maxSq] = fp.squareSizeRange;
    const sizeScale = d3.scaleLinear()
      .domain([0, maxWeight])
      .range([minSq, maxSq]);

    // Individual studies
    studies.forEach((study, i) => {
      const cy = yScale(study.study) + yScale.bandwidth() / 2;
      const color = colors[0];

      // CI line
      const x1 = xScale(Math.max(study.ciLower, xScale.domain()[0]));
      const x2 = xScale(Math.min(study.ciUpper, xScale.domain()[1]));
      g.append('line')
        .attr('x1', x1).attr('x2', x2)
        .attr('y1', cy).attr('y2', cy)
        .attr('stroke', color).attr('stroke-width', 1.5);

      // Square marker (sized by weight)
      const sqSize = sizeScale(study.weight);
      g.append('rect')
        .attr('x', xScale(study.es) - sqSize / 2)
        .attr('y', cy - sqSize / 2)
        .attr('width', sqSize)
        .attr('height', sqSize)
        .attr('fill', color);

      // Study label (left)
      g.append('text')
        .attr('x', -8)
        .attr('y', cy + 4)
        .attr('text-anchor', 'end')
        .attr('font-size', 9).attr('font-family', 'Arial, sans-serif')
        .attr('fill', '#333')
        .text(study.study);

      // Effect + CI text (right)
      const esText = `${study.es.toFixed(2)} [${study.ciLower.toFixed(2)}, ${study.ciUpper.toFixed(2)}]`;
      g.append('text')
        .attr('x', innerW + 8)
        .attr('y', cy + 4)
        .attr('text-anchor', 'start')
        .attr('font-size', 8).attr('font-family', 'Arial, sans-serif')
        .attr('fill', '#333')
        .text(esText);
    });

    // Pooled effect diamond
    const pooledES = d3.sum(studies, s => s.es * s.weight) / d3.sum(studies, s => s.weight);
    const pooledSE = Math.sqrt(1 / d3.sum(studies, s => 1 / ((s.ciUpper - s.ciLower) / 3.92) ** 2));
    const pooledCI = [pooledES - 1.96 * pooledSE, pooledES + 1.96 * pooledSE];
    const diamondY = studies.length * rowHeight + 10;
    const dh = fp.diamondHeight / 2;

    const diamondPath = [
      [xScale(pooledCI[0]), diamondY],
      [xScale(pooledES), diamondY - dh],
      [xScale(pooledCI[1]), diamondY],
      [xScale(pooledES), diamondY + dh],
    ];

    g.append('polygon')
      .attr('points', diamondPath.map(p => p.join(',')).join(' '))
      .attr('fill', colors[1] || '#c62828')
      .attr('stroke', '#333')
      .attr('stroke-width', 0.5);

    // "Overall" label
    g.append('text')
      .attr('x', -8).attr('y', diamondY + 4)
      .attr('text-anchor', 'end')
      .attr('font-size', 9).attr('font-family', 'Arial, sans-serif')
      .attr('font-weight', 'bold').attr('fill', '#333')
      .text('Overall');

    g.append('text')
      .attr('x', innerW + 8).attr('y', diamondY + 4)
      .attr('text-anchor', 'start')
      .attr('font-size', 8).attr('font-family', 'Arial, sans-serif')
      .attr('font-weight', 'bold').attr('fill', '#333')
      .text(`${pooledES.toFixed(2)} [${pooledCI[0].toFixed(2)}, ${pooledCI[1].toFixed(2)}]`);

    // Heterogeneity annotation (simplified I²)
    if (fp.showHeterogeneity) {
      const predicted = studies.map(() => pooledES);
      const Q = d3.sum(studies, (s, i) => s.weight * (s.es - predicted[i]) ** 2);
      const df = studies.length - 1;
      const I2 = df > 0 ? Math.max(0, ((Q - df) / Q) * 100) : 0;

      g.append('text')
        .attr('x', 0).attr('y', diamondY + dh + 18)
        .attr('font-size', 8).attr('font-family', 'Arial, sans-serif')
        .attr('fill', '#666')
        .text(`Heterogeneity: I\u00B2 = ${I2.toFixed(1)}%, Q = ${Q.toFixed(2)}, df = ${df}`);
    }

    // X axis
    const xAxisG = g.append('g')
      .attr('transform', `translate(0,${diamondY + dh + (fp.showHeterogeneity ? 28 : 14)})`)
      .call(d3.axisBottom(xScale).ticks(6));
    styleXAxis(xAxisG, state);

    renderTitle(svg, state, w);

    if (onScalesReady) {
      onScalesReady({ xScale, yScale, margin, innerWidth: innerW, innerHeight: innerH });
    }
  }, [svgRef, state, onScalesReady]);

  return null;
};

export default D3ForestPlot;
