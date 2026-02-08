/**
 * Color Palettes for Publication-Quality Plots
 *
 * Scientifically validated palettes matching major journal styles.
 * Sources: ggsci R package, journal submission guidelines.
 */

export const COLOR_PALETTES = {
  default: {
    name: 'Default',
    colors: ['#667eea', '#764ba2', '#48bb78', '#f6ad55', '#f56565', '#4299e1', '#ed64a6', '#38b2ac'],
  },
  nature: {
    name: 'Nature',
    colors: ['#E64B35', '#4DBBD5', '#00A087', '#3C5488', '#F39B7F', '#8491B4', '#91D1C2', '#DC0000'],
  },
  science: {
    name: 'Science (AAAS)',
    colors: ['#3B4992', '#EE0000', '#008B45', '#631879', '#008280', '#BB0021', '#5F559B', '#A20056'],
  },
  nejm: {
    name: 'NEJM',
    colors: ['#BC3C29', '#0072B5', '#E18727', '#20854E', '#7876B1', '#6F99AD', '#FFDC91', '#EE4C97'],
  },
  lancet: {
    name: 'Lancet',
    colors: ['#00468B', '#ED0000', '#42B540', '#0099B4', '#925E9F', '#FDAF91', '#AD002A', '#ADB6B6'],
  },
  jama: {
    name: 'JAMA',
    colors: ['#374E55', '#DF8F44', '#00A1D5', '#B24745', '#79AF97', '#6A6599', '#80796B', '#0072B5'],
  },
  grayscale: {
    name: 'Grayscale',
    colors: ['#2d2d2d', '#555555', '#808080', '#aaaaaa', '#404040', '#696969', '#333333', '#999999'],
  },
  colorblind: {
    name: 'Colorblind-Safe',
    colors: ['#0072B2', '#E69F00', '#009E73', '#CC79A7', '#56B4E9', '#D55E00', '#F0E442', '#000000'],
  },
};

export const getPaletteColors = (paletteName) => {
  return COLOR_PALETTES[paletteName]?.colors || COLOR_PALETTES.default.colors;
};

export const getColor = (paletteName, index) => {
  const colors = getPaletteColors(paletteName);
  return colors[index % colors.length];
};

export const PALETTE_NAMES = Object.keys(COLOR_PALETTES);
