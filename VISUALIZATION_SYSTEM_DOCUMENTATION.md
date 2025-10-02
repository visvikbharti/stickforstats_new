# 🎨 Advanced Visualization System Documentation
## Complete Guide for Interactive Statistical Visualizations

---

## 📊 System Overview

The StickForStats Advanced Visualization System provides cutting-edge, interactive, publication-ready visualizations for all statistical analyses with **50 decimal precision** maintained throughout.

### Key Features
- **30+ Visualization Types** - From basic plots to advanced 3D and network graphs
- **Interactive Dashboards** - Real-time, multi-panel statistical dashboards
- **Animation Support** - Animated time series and 3D rotations
- **Publication Export** - SVG, PDF, EPS with LaTeX integration
- **High Precision** - All calculations maintain 50 decimal places
- **Responsive Design** - Works on all devices
- **Real-time Updates** - WebSocket support for live data

---

## 🗂️ File Structure

```
backend/core/
├── comprehensive_visualization_system.py    # Basic visualization system
├── advanced_interactive_visualizations.py   # Advanced interactive plots
└── missing_data_handler.py                 # Missing data visualizations

frontend/src/
├── components/AdvancedVisualization/
│   ├── VisualizationDashboard.jsx         # Main dashboard component
│   ├── Plot3D.jsx                         # 3D plot component
│   ├── AnimatedTimeSeries.jsx             # Animated time series
│   ├── NetworkGraph.jsx                   # Network visualization
│   ├── StatisticalDashboard.jsx           # Multi-panel dashboard
│   └── ExportDialog.jsx                   # Export options dialog
└── services/
    └── VisualizationService.js            # API service for visualizations
```

---

## 📈 Available Visualizations

### 1. Distribution Plots
- **Histogram** - With KDE overlay
- **Q-Q Plot** - Normality assessment
- **P-P Plot** - Probability plots
- **ECDF** - Empirical cumulative distribution
- **Box Plot** - With outliers and mean
- **Violin Plot** - Distribution shape
- **Raincloud Plot** - Combined visualization
- **Strip Plot** - Individual points

### 2. 3D Visualizations
- **3D Scatter** - With rotation animation
- **3D Surface** - Continuous functions
- **3D Mesh** - Complex geometries
- **3D Contour** - Level sets

### 3. Time Series
- **Animated Line** - Play button control
- **Decomposition** - Trend, seasonal, residual
- **Forecast Region** - With confidence bands
- **Multi-series** - Synchronized animation

### 4. Correlation & Relationships
- **Heatmap** - With hierarchical clustering
- **Correlation Network** - Graph visualization
- **Scatter Matrix** - Pairwise relationships
- **Parallel Coordinates** - Multivariate patterns

### 5. Statistical Specific
- **Volcano Plot** - Differential expression
- **Manhattan Plot** - Genome-wide association
- **Forest Plot** - Meta-analysis
- **Funnel Plot** - Publication bias
- **Bland-Altman** - Method comparison
- **ROC Curve** - Classification performance
- **Power Curves** - Sample size analysis

### 6. Hierarchical & Network
- **Dendrogram** - Clustering trees
- **Network Graph** - Interactive nodes
- **Sankey Diagram** - Flow visualization
- **Sunburst Chart** - Hierarchical data
- **Treemap** - Nested rectangles

### 7. Comparison Plots
- **Grouped Bar** - Category comparison
- **Stacked Bar** - Component analysis
- **Radar Chart** - Multi-dimensional comparison
- **Bullet Chart** - Performance metrics

### 8. Advanced Dashboards
- **Statistical Dashboard** - 4-panel analysis
- **Real-time Dashboard** - WebSocket updates
- **Custom Layouts** - 2x2, 3x2, 1x4, etc.

---

## 🔧 Backend Implementation

### Basic Usage

```python
from core.advanced_interactive_visualizations import AdvancedVisualizationSystem

# Initialize system
viz = AdvancedVisualizationSystem(theme='plotly_white')

# Create 3D scatter plot
plot_3d = viz.create_3d_scatter(
    data=df,
    x_col='variable1',
    y_col='variable2',
    z_col='variable3',
    color_col='group',
    size_col='value',
    animate=True,
    title="3D Analysis"
)

# Create animated time series
animated = viz.create_animated_time_series(
    data=time_df,
    time_col='date',
    value_cols=['series1', 'series2'],
    show_forecast=True,
    confidence_bands={'series1': (lower, upper)}
)

# Create statistical dashboard
dashboard = viz.create_statistical_dashboard(
    test_results=anova_results,
    data=original_data,
    layout='2x2'
)

# Create volcano plot
volcano = viz.create_volcano_plot(
    fold_changes=fc_array,
    p_values=pval_array,
    gene_names=gene_list,
    significance_threshold=0.05,
    fold_change_threshold=1.0
)

# Create network graph
network = viz.create_network_graph(
    edges=edge_list,
    weights=weight_list,
    node_attributes=node_dict,
    layout_type='spring'
)

# Export for publication
pub_figure = viz.create_publication_ready_figure(
    figure=plot_figure,
    width_inches=6.5,
    height_inches=4.5,
    dpi=300,
    export_format='svg'
)
```

### API Endpoints

```python
# views.py
from rest_framework.views import APIView
from core.advanced_interactive_visualizations import AdvancedVisualizationSystem

class Create3DVisualizationView(APIView):
    def post(self, request):
        viz = AdvancedVisualizationSystem()

        plot_data = viz.create_3d_scatter(
            data=pd.DataFrame(request.data['data']),
            x_col=request.data['x_column'],
            y_col=request.data['y_column'],
            z_col=request.data['z_column'],
            color_col=request.data.get('color_column'),
            animate=request.data.get('animate', False)
        )

        return Response(plot_data)

class CreateDashboardView(APIView):
    def post(self, request):
        viz = AdvancedVisualizationSystem()

        dashboard = viz.create_statistical_dashboard(
            test_results=request.data['test_results'],
            data=pd.DataFrame(request.data['data']),
            layout=request.data.get('layout', '2x2')
        )

        return Response(dashboard)
```

---

## 💻 Frontend Implementation

### React Component Usage

```jsx
import VisualizationDashboard from './components/AdvancedVisualization/VisualizationDashboard';
import VisualizationService from './services/VisualizationService';

function StatisticalAnalysis() {
  const [data, setData] = useState(null);
  const [testResults, setTestResults] = useState(null);

  const handleVisualize = async () => {
    // Create 3D visualization
    const plot3D = await VisualizationService.create3DScatter({
      data: data,
      xCol: 'x',
      yCol: 'y',
      zCol: 'z',
      colorCol: 'group',
      options: { animate: true }
    });

    // Create dashboard
    const dashboard = await VisualizationService.createStatisticalDashboard({
      testResults: testResults,
      data: data,
      layout: '2x2'
    });
  };

  return (
    <VisualizationDashboard
      data={data}
      testResults={testResults}
      visualizationType="dashboard"
      options={{
        theme: 'plotly_white',
        interactive: true
      }}
      onExport={(exportData) => console.log('Exported:', exportData)}
      onShare={(shareUrl) => console.log('Share URL:', shareUrl)}
    />
  );
}
```

### Service Methods

```javascript
// Create various visualizations
const viz3D = await VisualizationService.create3DScatter({...});
const animatedTS = await VisualizationService.createAnimatedTimeSeries({...});
const volcano = await VisualizationService.createVolcanoPlot({...});
const network = await VisualizationService.createNetworkGraph({...});
const heatmap = await VisualizationService.createClusteredHeatmap({...});

// Export visualization
const exportData = await VisualizationService.exportVisualization({
  plotData: viz3D.data,
  plotLayout: viz3D.layout,
  format: 'svg',
  options: { width: 800, height: 600 }
});

// Share visualization
const shareUrl = await VisualizationService.shareVisualization({
  plotData: viz3D.data,
  plotLayout: viz3D.layout,
  options: { expiry: '7d', password: 'optional' }
});

// Real-time dashboard
const rtDashboard = VisualizationService.createRealTimeDashboard({
  dataSource: 'websocket://data-stream',
  updateInterval: 1000,
  plots: ['timeseries', 'histogram', 'scatter']
});

rtDashboard.onData((data) => {
  console.log('New data:', data);
});
```

---

## 🎨 Customization Options

### Themes

```javascript
const themes = [
  'plotly_white',     // Clean white background
  'plotly_dark',      // Dark mode
  'ggplot2',          // R ggplot2 style
  'seaborn',          // Python seaborn style
  'simple_white',     // Minimal style
  'presentation'      // High contrast for presentations
];
```

### Color Palettes

```javascript
const palettes = {
  scientific: ['#1f77b4', '#ff7f0e', '#2ca02c', ...],  // Nature journal
  nature: ['#E64B35', '#4DBBD5', '#00A087', ...],       // Nature colors
  lancet: ['#00468B', '#ED0000', '#42B540', ...],       // Lancet journal
  jama: ['#374E55', '#DF8F44', '#00A1D5', ...],         // JAMA journal
  gradient: generateGradientPalette(n)                   // Custom gradient
};
```

### Layout Options

```javascript
const dashboardLayouts = [
  '2x2',  // 4 panels in grid
  '3x2',  // 6 panels
  '1x4',  // Single row
  '4x1',  // Single column
  'custom' // Custom configuration
];
```

---

## 📤 Export Options

### Formats Supported

| Format | Type | Quality | Use Case |
|--------|------|---------|----------|
| SVG | Vector | Lossless | Publications, Web |
| PDF | Vector | Lossless | Documents, Papers |
| EPS | Vector | Lossless | LaTeX, Journals |
| PNG | Raster | High DPI | Presentations |
| JPEG | Raster | Compressed | Web, Email |
| JSON | Data | Full | Reproducibility |
| HTML | Interactive | Full | Sharing |

### Export Configuration

```javascript
const exportConfig = {
  format: 'svg',
  width: 6.5,        // inches for print
  height: 4.5,       // inches for print
  dpi: 300,          // for raster formats
  fontFamily: 'Arial',
  fontSize: 10,
  scale: 2,          // for high resolution
  background: 'white'
};

// Export for publication
const publication = await VisualizationService.createPublicationFigure({
  plotData: data,
  plotLayout: layout,
  options: exportConfig
});

// LaTeX caption included
console.log(publication.latex_caption);
// \caption{Statistical Analysis. Generated using high-precision...}
```

---

## 🔄 Real-time Updates

### WebSocket Configuration

```javascript
// Create real-time connection
const realtime = VisualizationService.createRealTimeDashboard({
  dataSource: 'ws://localhost:8000/realtime',
  updateInterval: 1000,
  plots: [
    { type: 'timeseries', id: 'ts1' },
    { type: 'histogram', id: 'hist1' },
    { type: 'scatter', id: 'scatter1' }
  ]
});

// Handle updates
realtime.onData((update) => {
  console.log('Plot updated:', update.plotId);
  updateVisualization(update.data);
});

// Handle errors
realtime.onError((error) => {
  console.error('WebSocket error:', error);
});

// Clean up
realtime.close();
```

---

## 🎯 Performance Optimization

### Best Practices

1. **Data Sampling** - For large datasets (>10k points)
```javascript
const sampled = data.sample(n=5000, method='stratified');
```

2. **Lazy Loading** - Load visualizations on demand
```javascript
const LazyPlot = React.lazy(() => import('./Plot3D'));
```

3. **Caching** - Cache computed visualizations
```javascript
const cached = await VisualizationService.getCached(cacheKey);
```

4. **WebGL Rendering** - For 3D and large datasets
```javascript
config: {
  plotGlPixelRatio: 2,
  use_webgl: true
}
```

---

## 📊 Integration Examples

### With T-Test Results

```javascript
const tTestViz = await VisualizationService.createStatisticalDashboard({
  testResults: {
    test_type: 't-test',
    t_statistic: '2.345...',
    p_value: '0.023...',
    effect_size: { cohens_d: '0.78...' },
    assumptions: { normality: true, equal_variance: false }
  },
  data: originalData,
  layout: '2x2'
});
```

### With ANOVA Results

```javascript
const anovaViz = await VisualizationService.createVisualization({
  type: 'dashboard',
  testResults: anovaResults,
  data: groupedData,
  options: {
    includePostHoc: true,
    showInteractions: true
  }
});
```

### With Regression Results

```javascript
const regressionViz = await VisualizationService.createVisualization({
  type: 'regression_diagnostics',
  testResults: regressionResults,
  data: {
    residuals: results.residuals,
    leverage: results.diagnostics.leverage,
    cooks_distance: results.diagnostics.cooks_distance
  }
});
```

---

## 🚀 Advanced Features

### 1. Custom Animations

```javascript
const customAnimation = {
  frames: generateFrames(data),
  transition: { duration: 100 },
  frame: { duration: 50, redraw: true },
  mode: 'immediate'
};
```

### 2. Interactive Selections

```javascript
plotly_selected: (eventData) => {
  const selectedPoints = eventData.points;
  highlightDataPoints(selectedPoints);
}
```

### 3. Synchronized Plots

```javascript
const syncedPlots = createSynchronizedPlots([
  { id: 'plot1', type: 'scatter' },
  { id: 'plot2', type: 'histogram' }
]);
```

### 4. Custom Tooltips

```javascript
hovertemplate:
  '<b>%{text}</b><br>' +
  'X: %{x:.3f}<br>' +
  'Y: %{y:.3f}<br>' +
  'Group: %{customdata[0]}<br>' +
  '<extra></extra>'
```

---

## 📝 Complete API Reference

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/visualization/create/` | POST | Create any visualization |
| `/api/v1/visualization/3d-scatter/` | POST | Create 3D scatter |
| `/api/v1/visualization/dashboard/` | POST | Create dashboard |
| `/api/v1/visualization/export/` | POST | Export visualization |
| `/api/v1/visualization/share/` | POST | Share visualization |
| `/api/v1/visualization/batch/` | POST | Batch create |
| `/api/v1/visualization/realtime/` | WS | Real-time updates |

---

## 🎨 Gallery of Examples

### Example 1: Publication-Ready Regression Plot
```javascript
const regressionPlot = {
  data: [{
    x: xValues,
    y: yValues,
    mode: 'markers',
    name: 'Data',
    marker: { size: 6, color: '#1f77b4' }
  }, {
    x: xValues,
    y: fittedValues,
    mode: 'lines',
    name: 'Fitted',
    line: { color: 'red', width: 2 }
  }, {
    x: xValues,
    y: upperCI,
    mode: 'lines',
    line: { color: 'gray', width: 1, dash: 'dash' },
    showlegend: false
  }],
  layout: {
    title: 'Linear Regression with 95% CI',
    xaxis: { title: 'Independent Variable' },
    yaxis: { title: 'Dependent Variable' },
    font: { family: 'Arial', size: 12 }
  }
};
```

### Example 2: Interactive 3D PCA
```javascript
const pca3D = {
  data: [{
    type: 'scatter3d',
    x: pc1,
    y: pc2,
    z: pc3,
    mode: 'markers+text',
    marker: {
      size: 8,
      color: groups,
      colorscale: 'Viridis',
      showscale: true
    },
    text: sampleNames,
    hovertemplate: 'Sample: %{text}<br>PC1: %{x:.2f}<br>PC2: %{y:.2f}<br>PC3: %{z:.2f}'
  }],
  layout: {
    scene: {
      xaxis: { title: 'PC1 (45.2%)' },
      yaxis: { title: 'PC2 (23.1%)' },
      zaxis: { title: 'PC3 (15.7%)' }
    }
  }
};
```

---

## 🐛 Troubleshooting

### Common Issues

1. **Large datasets slow to render**
   - Solution: Enable WebGL rendering
   - Sample data to reasonable size
   - Use aggregation for overview

2. **Export quality issues**
   - Solution: Increase DPI for raster formats
   - Use vector formats (SVG, PDF) for print
   - Adjust font sizes for readability

3. **Animation performance**
   - Solution: Reduce frame count
   - Simplify data per frame
   - Use requestAnimationFrame

4. **WebSocket connection issues**
   - Solution: Check CORS settings
   - Verify authentication token
   - Check firewall/proxy settings

---

## 📚 Resources

- **Plotly Documentation**: https://plotly.com/javascript/
- **D3.js Integration**: https://d3js.org/
- **WebGL Optimization**: https://webglfundamentals.org/
- **Color Theory**: https://colorbrewer2.org/
- **Publication Guidelines**: https://www.nature.com/nature/for-authors/formatting-guide

---

## ✅ Checklist for Implementation

- [ ] Backend visualization modules installed
- [ ] Frontend components integrated
- [ ] API endpoints configured
- [ ] WebSocket server running (for real-time)
- [ ] Export functionality tested
- [ ] Publication templates configured
- [ ] Performance optimization applied
- [ ] Documentation reviewed

---

**Version:** 2.0.0
**Last Updated:** September 15, 2025
**Precision:** 50 Decimal Places
**Status:** Production Ready