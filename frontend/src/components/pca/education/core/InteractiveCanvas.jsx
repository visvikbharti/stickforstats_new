import React, { useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * InteractiveCanvas
 *
 * Reusable canvas component for PCA educational visualizations.
 * Handles:
 * - Canvas setup and resizing
 * - Coordinate transformations
 * - Mouse/touch interactions
 * - Rendering loop management
 */
const InteractiveCanvas = ({
  width = 600,
  height = 400,
  backgroundColor = '#ffffff',
  onRender,
  onClick,
  onMouseMove,
  onMouseDown,
  onMouseUp,
  onDrag,
  style = {},
  className = '',
  showGrid = false,
  gridColor = '#e0e0e0',
  gridSpacing = 50,
  showAxes = false,
  axesColor = '#999',
  pixelRatio = window.devicePixelRatio || 1
}) => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const frameRef = useRef(null);
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  /**
   * Initialize canvas context with proper scaling
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctxRef.current = ctx;

    // Set display size (CSS pixels)
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Set actual size in memory (scaled for retina displays)
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;

    // Scale all drawing operations
    ctx.scale(pixelRatio, pixelRatio);

    // Set rendering defaults
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }, [width, height, pixelRatio]);

  /**
   * Coordinate transformation: canvas to data space
   * Assumes data space is centered at canvas center
   */
  const canvasToData = useCallback((canvasX, canvasY) => {
    return {
      x: canvasX - width / 2,
      y: height / 2 - canvasY // Flip Y axis
    };
  }, [width, height]);

  /**
   * Coordinate transformation: data to canvas space
   */
  const dataToCanvas = useCallback((dataX, dataY) => {
    return {
      x: dataX + width / 2,
      y: height / 2 - dataY // Flip Y axis
    };
  }, [width, height]);

  /**
   * Draw grid
   */
  const drawGrid = useCallback((ctx) => {
    if (!showGrid) return;

    ctx.save();
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;

    // Vertical lines
    for (let x = 0; x <= width; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= height; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.restore();
  }, [showGrid, gridColor, gridSpacing, width, height]);

  /**
   * Draw coordinate axes
   */
  const drawAxes = useCallback((ctx) => {
    if (!showAxes) return;

    const centerX = width / 2;
    const centerY = height / 2;

    ctx.save();
    ctx.strokeStyle = axesColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.7;

    // X axis
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Y axis
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, height);
    ctx.stroke();

    // Arrowheads
    const arrowSize = 8;

    // X axis arrow
    ctx.beginPath();
    ctx.moveTo(width, centerY);
    ctx.lineTo(width - arrowSize, centerY - arrowSize / 2);
    ctx.lineTo(width - arrowSize, centerY + arrowSize / 2);
    ctx.closePath();
    ctx.fillStyle = axesColor;
    ctx.fill();

    // Y axis arrow
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX - arrowSize / 2, arrowSize);
    ctx.lineTo(centerX + arrowSize / 2, arrowSize);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }, [showAxes, axesColor, width, height]);

  /**
   * Main render loop
   */
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Draw grid and axes
    drawGrid(ctx);
    drawAxes(ctx);

    // Custom rendering
    if (onRender) {
      onRender(ctx, { width, height, canvasToData, dataToCanvas });
    }

    frameRef.current = requestAnimationFrame(render);
  }, [backgroundColor, width, height, onRender, drawGrid, drawAxes, canvasToData, dataToCanvas]);

  /**
   * Start rendering loop
   */
  useEffect(() => {
    frameRef.current = requestAnimationFrame(render);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [render]);

  /**
   * Get mouse position relative to canvas
   */
  const getMousePos = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }, []);

  /**
   * Mouse event handlers
   */
  const handleMouseDown = useCallback((e) => {
    const pos = getMousePos(e);
    lastMousePosRef.current = pos;
    isDraggingRef.current = true;

    if (onMouseDown) {
      const dataPos = canvasToData(pos.x, pos.y);
      onMouseDown(dataPos, pos);
    }
  }, [getMousePos, onMouseDown, canvasToData]);

  const handleMouseMove = useCallback((e) => {
    const pos = getMousePos(e);

    if (onMouseMove) {
      const dataPos = canvasToData(pos.x, pos.y);
      onMouseMove(dataPos, pos);
    }

    if (isDraggingRef.current && onDrag) {
      const lastPos = lastMousePosRef.current;
      const delta = {
        x: pos.x - lastPos.x,
        y: pos.y - lastPos.y
      };
      const dataPos = canvasToData(pos.x, pos.y);
      const lastDataPos = canvasToData(lastPos.x, lastPos.y);
      const dataDelta = {
        x: dataPos.x - lastDataPos.x,
        y: dataPos.y - lastDataPos.y
      };

      onDrag(dataPos, pos, dataDelta, delta);
    }

    lastMousePosRef.current = pos;
  }, [getMousePos, onMouseMove, onDrag, canvasToData]);

  const handleMouseUp = useCallback((e) => {
    const pos = getMousePos(e);
    isDraggingRef.current = false;

    if (onMouseUp) {
      const dataPos = canvasToData(pos.x, pos.y);
      onMouseUp(dataPos, pos);
    }
  }, [getMousePos, onMouseUp, canvasToData]);

  const handleClick = useCallback((e) => {
    const pos = getMousePos(e);

    if (onClick) {
      const dataPos = canvasToData(pos.x, pos.y);
      onClick(dataPos, pos);
    }
  }, [getMousePos, onClick, canvasToData]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        ...style,
        cursor: onDrag ? 'crosshair' : 'default'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
      onMouseLeave={handleMouseUp}
    />
  );
};

InteractiveCanvas.propTypes = {
  width: PropTypes.number,
  height: PropTypes.number,
  backgroundColor: PropTypes.string,
  onRender: PropTypes.func.isRequired,
  onClick: PropTypes.func,
  onMouseMove: PropTypes.func,
  onMouseDown: PropTypes.func,
  onMouseUp: PropTypes.func,
  onDrag: PropTypes.func,
  style: PropTypes.object,
  className: PropTypes.string,
  showGrid: PropTypes.bool,
  gridColor: PropTypes.string,
  gridSpacing: PropTypes.number,
  showAxes: PropTypes.bool,
  axesColor: PropTypes.string,
  pixelRatio: PropTypes.number
};

export default InteractiveCanvas;

/**
 * Common canvas drawing utilities
 * These can be imported separately and used with any canvas context
 */

/**
 * Draw a point
 */
export const drawPoint = (ctx, x, y, radius = 4, color = '#1976d2', strokeColor = '#fff', strokeWidth = 1) => {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = strokeWidth;

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
};

/**
 * Draw a line
 */
export const drawLine = (ctx, x1, y1, x2, y2, color = '#000', lineWidth = 2, dash = []) => {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash(dash);

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.restore();
};

/**
 * Draw an arrow
 */
export const drawArrow = (ctx, x1, y1, x2, y2, color = '#000', lineWidth = 2, headSize = 10) => {
  const angle = Math.atan2(y2 - y1, x2 - x1);

  // Draw line
  drawLine(ctx, x1, y1, x2, y2, color, lineWidth);

  // Draw arrowhead
  ctx.save();
  ctx.fillStyle = color;

  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headSize * Math.cos(angle - Math.PI / 6),
    y2 - headSize * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    x2 - headSize * Math.cos(angle + Math.PI / 6),
    y2 - headSize * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();

  ctx.restore();
};

/**
 * Draw text with background
 */
export const drawTextWithBackground = (
  ctx,
  text,
  x,
  y,
  {
    font = '14px Arial',
    textColor = '#000',
    backgroundColor = '#fff',
    padding = 4,
    borderRadius = 4
  } = {}
) => {
  ctx.save();
  ctx.font = font;

  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  const textHeight = 16; // Approximate height

  // Draw background
  ctx.fillStyle = backgroundColor;
  ctx.beginPath();
  ctx.roundRect(
    x - padding,
    y - textHeight - padding,
    textWidth + 2 * padding,
    textHeight + 2 * padding,
    borderRadius
  );
  ctx.fill();

  // Draw text
  ctx.fillStyle = textColor;
  ctx.textBaseline = 'top';
  ctx.fillText(text, x, y - textHeight);

  ctx.restore();
};

/**
 * Draw ellipse (covariance ellipse)
 */
export const drawEllipse = (
  ctx,
  centerX,
  centerY,
  radiusX,
  radiusY,
  rotation = 0,
  {
    strokeColor = '#1976d2',
    fillColor = null,
    lineWidth = 2,
    dash = [],
    alpha = 1
  } = {}
) => {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash(dash);

  ctx.beginPath();
  ctx.ellipse(centerX, centerY, radiusX, radiusY, rotation, 0, 2 * Math.PI);

  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }

  ctx.stroke();
  ctx.restore();
};

/**
 * Draw variance line (direction line through data)
 */
export const drawVarianceLine = (
  ctx,
  centerX,
  centerY,
  angle,
  length,
  {
    color = '#f44336',
    lineWidth = 3,
    dash = [],
    alpha = 0.8
  } = {}
) => {
  const dx = Math.cos(angle) * length;
  const dy = Math.sin(angle) * length;

  ctx.save();
  ctx.globalAlpha = alpha;

  drawLine(
    ctx,
    centerX - dx,
    centerY - dy,
    centerX + dx,
    centerY + dy,
    color,
    lineWidth,
    dash
  );

  ctx.restore();
};

/**
 * Draw projection lines from points to line
 */
export const drawProjections = (
  ctx,
  points,
  centerX,
  centerY,
  angle,
  {
    color = '#999',
    lineWidth = 1,
    dash = [5, 5],
    alpha = 0.5
  } = {}
) => {
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash(dash);

  points.forEach(point => {
    const dx = point.x - centerX;
    const dy = point.y - centerY;
    const projection = dx * ux + dy * uy;

    const projX = centerX + projection * ux;
    const projY = centerY + projection * uy;

    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    ctx.lineTo(projX, projY);
    ctx.stroke();
  });

  ctx.restore();
};
