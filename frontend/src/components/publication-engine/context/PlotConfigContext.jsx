/**
 * PlotConfigContext - State management for Publication Plot Builder
 *
 * Uses useReducer + React Context to manage all plot configuration state.
 * Scoped to the Publication Engine route only.
 */

import React, { createContext, useContext, useReducer, useCallback } from 'react';

const PlotConfigContext = createContext(null);

const DEFAULT_AXIS = {
  label: '',
  fontFamily: 'Arial, sans-serif',
  fontSize: 10,
  fontWeight: 'normal',
  color: '#000000',
  scale: 'linear',
  min: null,
  max: null,
  tickCount: null,
  tickRotation: 0,
  showGrid: true,
  gridStyle: 'dashed',
};

export const initialState = {
  // Data
  data: null,
  columns: [],
  dataMapping: {
    x: null,
    y: null,
    group: null,
    error: null,
    paired: null,
  },

  // Plot type
  plotType: null, // 'bar' | 'scatter' | 'boxplot' | 'histogram' | 'violin' | 'line' | 'beforeafter' | 'dotplot'

  // Title
  title: {
    text: '',
    fontFamily: 'Arial, sans-serif',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },

  // Axes
  xAxis: { ...DEFAULT_AXIS, label: 'X Axis' },
  yAxis: { ...DEFAULT_AXIS, label: 'Y Axis' },

  // Colors
  colorPalette: 'default',
  customColors: [],

  // Error Bars
  errorBars: {
    enabled: false,
    type: 'sem', // 'sd' | 'sem' | 'ci95' | 'custom'
    capWidth: 6,
    lineWidth: 1.5,
    color: '#000000',
  },

  // Legend
  legend: {
    show: true,
    position: 'top-right',
    fontFamily: 'Arial, sans-serif',
    fontSize: 9,
  },

  // Grid
  grid: {
    showX: true,
    showY: true,
    style: 'dashed',
    color: '#e0e0e0',
  },

  // Annotations
  annotations: [],

  // Dimensions
  dimensions: {
    width: 6.5,
    height: 4.5,
    unit: 'inches',
    aspectLocked: false,
    dpi: 300,
  },

  // Journal preset
  journalPreset: null,

  // Plot-specific options
  scatter: {
    showRegression: false,
    regressionType: 'linear',
    showCI: false,
    ciLevel: 0.95,
    pointSize: 4,
    pointShape: 'circle',
    pointOpacity: 0.8,
  },
  bar: {
    orientation: 'vertical',
    barWidth: 0.7,
    showValues: false,
    subType: 'grouped', // 'grouped' | 'stacked'
  },
  box: {
    showPoints: true,
    pointJitter: 0.3,
    whiskerType: 'tukey',
    showMean: false,
    pointSize: 3,
    pointOpacity: 0.5,
  },
  histogram: {
    binCount: 20,
    showDensityOverlay: false,
    showRug: false,
  },
  violin: {
    showBox: true,
    showMedian: true,
    showPoints: false,
    bandwidth: null,
  },
  line: {
    showPoints: true,
    pointSize: 4,
    lineWidth: 2,
    interpolation: 'linear', // 'linear' | 'monotone' | 'step'
    showErrorBand: false,
  },
  beforeAfter: {
    lineWidth: 1.5,
    pointSize: 5,
    lineOpacity: 0.5,
    showMean: true,
  },
  dotplot: {
    jitter: 0.3,
    pointSize: 4,
    pointOpacity: 0.7,
    showMean: true,
    showMedian: false,
    meanSize: 10,
  },
};

const plotConfigReducer = (state, action) => {
  switch (action.type) {
    case 'SET_DATA':
      return { ...state, data: action.payload.data, columns: action.payload.columns };
    case 'SET_DATA_MAPPING':
      return { ...state, dataMapping: { ...state.dataMapping, ...action.payload } };
    case 'SET_PLOT_TYPE':
      return { ...state, plotType: action.payload };
    case 'SET_TITLE':
      return { ...state, title: { ...state.title, ...action.payload }, journalPreset: null };
    case 'SET_X_AXIS':
      return { ...state, xAxis: { ...state.xAxis, ...action.payload }, journalPreset: null };
    case 'SET_Y_AXIS':
      return { ...state, yAxis: { ...state.yAxis, ...action.payload }, journalPreset: null };
    case 'SET_COLOR_PALETTE':
      return { ...state, colorPalette: action.payload, customColors: [], journalPreset: null };
    case 'SET_CUSTOM_COLORS':
      return { ...state, customColors: action.payload, journalPreset: null };
    case 'SET_ERROR_BARS':
      return { ...state, errorBars: { ...state.errorBars, ...action.payload } };
    case 'SET_LEGEND':
      return { ...state, legend: { ...state.legend, ...action.payload }, journalPreset: null };
    case 'SET_GRID':
      return { ...state, grid: { ...state.grid, ...action.payload }, journalPreset: null };
    case 'ADD_ANNOTATION':
      return { ...state, annotations: [...state.annotations, action.payload] };
    case 'UPDATE_ANNOTATION':
      return {
        ...state,
        annotations: state.annotations.map(a =>
          a.id === action.payload.id ? { ...a, ...action.payload } : a
        ),
      };
    case 'REMOVE_ANNOTATION':
      return { ...state, annotations: state.annotations.filter(a => a.id !== action.payload) };
    case 'SET_DIMENSIONS':
      return { ...state, dimensions: { ...state.dimensions, ...action.payload } };
    case 'APPLY_JOURNAL_PRESET':
      return { ...state, ...action.payload };
    case 'SET_SCATTER_OPTIONS':
      return { ...state, scatter: { ...state.scatter, ...action.payload } };
    case 'SET_BAR_OPTIONS':
      return { ...state, bar: { ...state.bar, ...action.payload } };
    case 'SET_BOX_OPTIONS':
      return { ...state, box: { ...state.box, ...action.payload } };
    case 'SET_HISTOGRAM_OPTIONS':
      return { ...state, histogram: { ...state.histogram, ...action.payload } };
    case 'SET_VIOLIN_OPTIONS':
      return { ...state, violin: { ...state.violin, ...action.payload } };
    case 'SET_LINE_OPTIONS':
      return { ...state, line: { ...state.line, ...action.payload } };
    case 'SET_BEFORE_AFTER_OPTIONS':
      return { ...state, beforeAfter: { ...state.beforeAfter, ...action.payload } };
    case 'SET_DOTPLOT_OPTIONS':
      return { ...state, dotplot: { ...state.dotplot, ...action.payload } };
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
};

export const PlotConfigProvider = ({ children }) => {
  const [state, dispatch] = useReducer(plotConfigReducer, initialState);

  const setData = useCallback((data, columns) => {
    dispatch({ type: 'SET_DATA', payload: { data, columns } });
  }, []);

  const setDataMapping = useCallback((mapping) => {
    dispatch({ type: 'SET_DATA_MAPPING', payload: mapping });
  }, []);

  const setPlotType = useCallback((plotType) => {
    dispatch({ type: 'SET_PLOT_TYPE', payload: plotType });
  }, []);

  return (
    <PlotConfigContext.Provider value={{ state, dispatch, setData, setDataMapping, setPlotType }}>
      {children}
    </PlotConfigContext.Provider>
  );
};

export const usePlotConfig = () => {
  const context = useContext(PlotConfigContext);
  if (!context) {
    throw new Error('usePlotConfig must be used within a PlotConfigProvider');
  }
  return context;
};

export default PlotConfigContext;
