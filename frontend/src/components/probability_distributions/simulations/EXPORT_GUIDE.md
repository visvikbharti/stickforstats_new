# D3.js Visualization Export Guide

This guide explains how to use the export functionality to save D3.js visualizations as SVG and PNG files. The export functionality is built into our optimized D3.js components and can be used with minimal configuration.

## Table of Contents

1. [Overview](#overview)
2. [Export Formats](#export-formats)
3. [Using ExportControls Component](#using-exportcontrols-component)
4. [Using OptimizedD3Chart](#using-optimizedd3chart)
5. [Export Options](#export-options)
6. [Advanced Usage](#advanced-usage)
7. [Troubleshooting](#troubleshooting)

## Overview

The export functionality allows users to:

- Save D3.js visualizations as SVG or PNG files
- Customize export options (filename, scale, etc.)
- Perform one-click exports or use advanced options
- Export high-quality images suitable for publications, reports, and presentations

## Export Formats

We support two export formats:

1. **SVG (Scalable Vector Graphics)**
   - Vector-based format (scales without quality loss)
   - Excellent for printing and further editing
   - Preserves all chart elements and styling
   - Smaller file size for simple visualizations
   - Can be opened and edited in vector graphics editors

2. **PNG (Portable Network Graphics)**
   - Raster-based format (fixed resolution)
   - Better compatibility with applications
   - Consistent appearance across devices
   - Supports scaling for high-DPI displays
   - Ideal for web usage and sharing

## Using ExportControls Component

The `ExportControls` component provides a simple user interface for exporting visualizations. It can be added to any component that contains an SVG element.

### Basic Example

```jsx
import React, { useRef } from 'react';
import ExportControls from './ExportControls';

const MyChart = () => {
  const svgRef = useRef(null);
  
  // Chart rendering code...
  
  return (
    <div>
      <svg ref={svgRef} width="800" height="400">
        {/* Chart content */}
      </svg>
      
      <ExportControls
        chartRef={svgRef}
        formats={['svg', 'png']}
        chartType="bar-chart"
      />
    </div>
  );
};
```

### ExportControls Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `chartRef` | RefObject | required | Reference to the SVG element |
| `svgSelector` | string | null | CSS selector for the SVG (alternative to chartRef) |
| `chartType` | string | 'generic' | Type of chart for optimized export settings |
| `formats` | array | ['svg', 'png'] | Export formats to offer |
| `exportOptions` | object | {} | Additional export options |
| `variant` | string | 'contained' | Button variant ('contained', 'outlined', 'text') |
| `size` | string | 'small' | Button size ('small', 'medium', 'large') |
| `color` | string | 'primary' | Button color ('primary', 'secondary', etc.) |
| `showAdvancedOptions` | bool | true | Whether to show advanced options button |
| `showIcon` | bool | true | Whether to show icon in button |
| `iconOnly` | bool | false | Whether to show only icon (no text) |
| `orientation` | string | 'horizontal' | Button group orientation ('horizontal', 'vertical') |
| `onExportStart` | function | null | Callback when export starts |
| `onExportComplete` | function | null | Callback when export completes |
| `onExportError` | function | null | Callback when export fails |

## Using OptimizedD3Chart

The `OptimizedD3Chart` component includes built-in export functionality that can be enabled with a simple prop:

```jsx
import React from 'react';
import OptimizedD3Chart from './OptimizedD3Chart';

const MyVisualization = () => {
  // Chart data and rendering function...
  
  return (
    <OptimizedD3Chart
      data={data}
      renderChart={renderChart}
      title="My Visualization"
      enableExport={true}
      exportFormats={['svg', 'png']}
      chartType="time-series"
      exportOptions={{
        filename: 'my_visualization',
        backgroundColor: '#ffffff',
        scale: 2
      }}
      onExport={(format, options) => {
        console.log(`Chart exported as ${format}`);
      }}
    />
  );
};
```

### OptimizedD3Chart Export Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `enableExport` | boolean | true | Enable export functionality |
| `exportFormats` | array | ['svg', 'png'] | Export formats to offer |
| `exportOptions` | object | {} | Additional export options |
| `chartType` | string | 'generic' | Type of chart for optimized export settings |
| `onExport` | function | null | Callback when export completes |

## Export Options

The export functionality accepts various options to customize the export:

### Common Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `filename` | string | 'chart' | Filename for the exported file (without extension) |
| `backgroundColor` | string | '#ffffff' | Background color for the exported image |
| `includeStyles` | boolean | true | Whether to include computed CSS styles |
| `excludeElements` | string | '[data-no-export="true"]' | CSS selector for elements to exclude |
| `beautify` | boolean | true | Beautify the SVG output (SVG only) |

### PNG-Specific Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `scale` | number | 2 | Scale factor for PNG export (2 = 2x resolution) |
| `encoderOptions` | number | 1 | JPEG encoder quality (0-1) if converting to JPEG |

### Chart-Specific Default Options

Different chart types have optimized default export settings:

| Chart Type | Default Filename | Default Settings |
|------------|------------------|------------------|
| 'probability-distribution' | 'probability_distribution_chart' | Excludes control elements |
| 'box-plot' | 'box_plot_chart' | Excludes control elements |
| 'scatter-plot' | 'scatter_plot_chart' | Excludes control elements |
| 'bar-chart' | 'bar_chart' | Excludes control elements |
| 'histogram' | 'histogram_chart' | Excludes control elements |
| 'time-series' | 'time_series_chart' | Excludes control elements |
| 'simulation' | 'statistical_simulation' | Excludes control elements |

## Advanced Usage

### Programmatic Export

You can export charts programmatically using the export utilities:

```javascript
import { exportSvg, exportPng, exportChart } from './ExportUtils';

// Export using the SVG element
const handleExport = async () => {
  const svgElement = document.querySelector('#my-chart svg');
  
  // Export as SVG
  await exportSvg(svgElement, {
    filename: 'my_chart.svg',
    includeStyles: true,
    beautify: true
  });
  
  // Or export as PNG
  await exportPng(svgElement, {
    filename: 'my_chart.png',
    scale: 2,
    backgroundColor: '#ffffff'
  });
  
  // Or use the generic export function
  await exportChart(svgElement, 'png', {
    filename: 'my_chart',
    scale: 2
  });
};
```

### Fixing SVGs for Export

Some D3.js visualizations may require additional preparation for proper export:

```javascript
import { fixSvgForExport } from './ExportUtils';

const prepareSvgForExport = () => {
  const svgElement = document.querySelector('#my-chart svg');
  fixSvgForExport(svgElement);
  // Now the SVG is ready for export
};
```

### Custom Export Buttons

You can create custom export buttons with the provided utility:

```javascript
import { createExportButtons } from './ExportUtils';

const addExportButtons = () => {
  const container = document.querySelector('#export-container');
  const svgElement = document.querySelector('#my-chart svg');
  
  createExportButtons(container, svgElement, {
    formats: ['svg', 'png'],
    chartType: 'bar-chart',
    buttonClassName: 'my-export-button',
    labels: {
      svg: 'Save as SVG',
      png: 'Save as PNG'
    }
  });
};
```

## Troubleshooting

Here are solutions to common export issues:

### SVG Not Displaying Correctly

- **Issue**: SVG export is missing styles or elements
- **Solution**: Make sure `includeStyles` is set to `true` and use `fixSvgForExport` function

```javascript
import { fixSvgForExport } from './ExportUtils';

// Fix SVG before export
fixSvgForExport(svgElement);
```

### PNG Export Resolution Too Low

- **Issue**: PNG export is blurry or low resolution
- **Solution**: Increase the `scale` option

```javascript
// Export with higher resolution
exportPng(svgElement, {
  scale: 3, // 3x resolution
  filename: 'high_res_chart.png'
});
```

### Custom Fonts Not Working

- **Issue**: Custom fonts in the chart are not preserved in export
- **Solution**: Embed fonts or convert text to paths

```javascript
// Convert text to paths before export
svgElement.querySelectorAll('text').forEach(text => {
  // Convert to path using convertTextToPath utility (not included)
  convertTextToPath(text);
});
```

### Export Dialog Not Appearing

- **Issue**: Browser blocking the download
- **Solution**: Ensure export is triggered by a user action (click)

```javascript
// Ensure export is triggered by user action
exportButton.addEventListener('click', () => {
  exportChart(svgElement, 'svg');
});
```

### Elements Missing in Export

- **Issue**: Some chart elements are missing in export
- **Solution**: Check if elements have the `data-no-export` attribute and remove it

```javascript
// Remove data-no-export attribute
svgElement.querySelectorAll('[data-no-export]').forEach(el => {
  el.removeAttribute('data-no-export');
});
```