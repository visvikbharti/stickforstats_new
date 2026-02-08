/**
 * Journal Presets for Publication-Quality Plots
 *
 * One-click formatting presets matching major journal requirements.
 */

export const JOURNAL_PRESETS = {
  nature: {
    id: 'nature',
    name: 'Nature',
    description: 'Nature Publishing Group style',
    title: { fontFamily: 'Helvetica, Arial, sans-serif', fontSize: 10, fontWeight: 'bold', color: '#000000' },
    xAxis: { fontFamily: 'Helvetica, Arial, sans-serif', fontSize: 8, fontWeight: 'normal', showGrid: false },
    yAxis: { fontFamily: 'Helvetica, Arial, sans-serif', fontSize: 8, fontWeight: 'normal', showGrid: false },
    legend: { fontFamily: 'Helvetica, Arial, sans-serif', fontSize: 7, position: 'top-right' },
    dimensions: { width: 3.5, height: 2.5, unit: 'inches', dpi: 300 },
    colorPalette: 'nature',
    grid: { showX: false, showY: false, style: 'solid', color: '#cccccc' },
  },
  science: {
    id: 'science',
    name: 'Science (AAAS)',
    description: 'Science / AAAS journal style',
    title: { fontFamily: 'Helvetica, Arial, sans-serif', fontSize: 10, fontWeight: 'bold', color: '#000000' },
    xAxis: { fontFamily: 'Helvetica, Arial, sans-serif', fontSize: 9, fontWeight: 'normal', showGrid: false },
    yAxis: { fontFamily: 'Helvetica, Arial, sans-serif', fontSize: 9, fontWeight: 'normal', showGrid: false },
    legend: { fontFamily: 'Helvetica, Arial, sans-serif', fontSize: 8, position: 'top-right' },
    dimensions: { width: 3.5, height: 3.0, unit: 'inches', dpi: 300 },
    colorPalette: 'science',
    grid: { showX: false, showY: false, style: 'solid', color: '#cccccc' },
  },
  apa7: {
    id: 'apa7',
    name: 'APA 7th Edition',
    description: 'American Psychological Association style',
    title: { fontFamily: '"Times New Roman", Times, serif', fontSize: 12, fontWeight: 'bold', color: '#000000' },
    xAxis: { fontFamily: '"Times New Roman", Times, serif', fontSize: 11, fontWeight: 'normal', showGrid: false },
    yAxis: { fontFamily: '"Times New Roman", Times, serif', fontSize: 11, fontWeight: 'normal', showGrid: false },
    legend: { fontFamily: '"Times New Roman", Times, serif', fontSize: 10, position: 'top-right' },
    dimensions: { width: 6.5, height: 4.5, unit: 'inches', dpi: 300 },
    colorPalette: 'grayscale',
    grid: { showX: false, showY: false, style: 'solid', color: '#cccccc' },
  },
  nejm: {
    id: 'nejm',
    name: 'NEJM',
    description: 'New England Journal of Medicine style',
    title: { fontFamily: 'Helvetica, Arial, sans-serif', fontSize: 10, fontWeight: 'bold', color: '#000000' },
    xAxis: { fontFamily: 'Helvetica, Arial, sans-serif', fontSize: 8, fontWeight: 'normal', showGrid: false },
    yAxis: { fontFamily: 'Helvetica, Arial, sans-serif', fontSize: 8, fontWeight: 'normal', showGrid: false },
    legend: { fontFamily: 'Helvetica, Arial, sans-serif', fontSize: 7, position: 'bottom' },
    dimensions: { width: 3.25, height: 2.5, unit: 'inches', dpi: 300 },
    colorPalette: 'nejm',
    grid: { showX: false, showY: false, style: 'solid', color: '#cccccc' },
  },
  lancet: {
    id: 'lancet',
    name: 'The Lancet',
    description: 'Lancet journal style',
    title: { fontFamily: 'Helvetica, Arial, sans-serif', fontSize: 9, fontWeight: 'bold', color: '#000000' },
    xAxis: { fontFamily: 'Helvetica, Arial, sans-serif', fontSize: 8, fontWeight: 'normal', showGrid: false },
    yAxis: { fontFamily: 'Helvetica, Arial, sans-serif', fontSize: 8, fontWeight: 'normal', showGrid: false },
    legend: { fontFamily: 'Helvetica, Arial, sans-serif', fontSize: 7, position: 'bottom' },
    dimensions: { width: 3.35, height: 2.5, unit: 'inches', dpi: 300 },
    colorPalette: 'lancet',
    grid: { showX: false, showY: false, style: 'solid', color: '#cccccc' },
  },
  grayscale: {
    id: 'grayscale',
    name: 'Grayscale (Print)',
    description: 'Black & white for print journals',
    title: { fontFamily: 'Arial, sans-serif', fontSize: 11, fontWeight: 'bold', color: '#000000' },
    xAxis: { fontFamily: 'Arial, sans-serif', fontSize: 10, fontWeight: 'normal', showGrid: false },
    yAxis: { fontFamily: 'Arial, sans-serif', fontSize: 10, fontWeight: 'normal', showGrid: false },
    legend: { fontFamily: 'Arial, sans-serif', fontSize: 9, position: 'top-right' },
    dimensions: { width: 6.5, height: 4.5, unit: 'inches', dpi: 300 },
    colorPalette: 'grayscale',
    grid: { showX: false, showY: true, style: 'dashed', color: '#e0e0e0' },
  },
  clean: {
    id: 'clean',
    name: 'Clean Minimal',
    description: 'General-purpose clean style',
    title: { fontFamily: 'Arial, sans-serif', fontSize: 12, fontWeight: 'bold', color: '#000000' },
    xAxis: { fontFamily: 'Arial, sans-serif', fontSize: 10, fontWeight: 'normal', showGrid: true },
    yAxis: { fontFamily: 'Arial, sans-serif', fontSize: 10, fontWeight: 'normal', showGrid: true },
    legend: { fontFamily: 'Arial, sans-serif', fontSize: 9, position: 'top-right' },
    dimensions: { width: 6.5, height: 4.5, unit: 'inches', dpi: 300 },
    colorPalette: 'default',
    grid: { showX: true, showY: true, style: 'dashed', color: '#e0e0e0' },
  },
};

export const applyPreset = (preset) => {
  const p = JOURNAL_PRESETS[preset];
  if (!p) return null;
  return {
    title: { ...p.title },
    xAxis: { ...p.xAxis },
    yAxis: { ...p.yAxis },
    legend: { ...p.legend },
    dimensions: { ...p.dimensions },
    colorPalette: p.colorPalette,
    grid: { ...p.grid },
    journalPreset: preset,
  };
};

export const PRESET_NAMES = Object.keys(JOURNAL_PRESETS);
