/**
 * AnnotationLayer - Significance brackets rendered as SVG
 *
 * Renders significance brackets (*, **, ***) between groups
 * as SVG paths overlaid on the chart.
 */

import React from 'react';
import { usePlotConfig } from '../context/PlotConfigContext';
import { getBracketPath, stackBrackets } from '../utils/annotationMath';

const AnnotationLayer = ({ scales }) => {
  const { state } = usePlotConfig();
  const { annotations } = state;

  if (!scales || !annotations || annotations.length === 0) return null;

  const { xScale, yScale, margin } = scales;
  if (!xScale || !margin) return null;

  // Stack brackets to avoid overlap
  const baseY = margin.top + 10;
  const stacked = stackBrackets(annotations, xScale, baseY, 25);

  return (
    <g className="annotation-layer">
      {stacked.map((ann) => {
        const { x1, x2, yPosition, label, id, lineWidth = 1, fontSize = 11 } = ann;
        const tickHeight = 8;
        const path = getBracketPath(x1, x2, yPosition, tickHeight);
        const midX = (x1 + x2) / 2;

        return (
          <g key={id}>
            <path
              d={path}
              fill="none"
              stroke="#000000"
              strokeWidth={lineWidth}
            />
            <text
              x={midX}
              y={yPosition - 4}
              textAnchor="middle"
              fontSize={fontSize}
              fontFamily="Arial, sans-serif"
              fill="#000000"
            >
              {label || ''}
            </text>
          </g>
        );
      })}
    </g>
  );
};

export default AnnotationLayer;
