# PCA Module Frontend Documentation

This document provides a comprehensive guide to the Principal Component Analysis (PCA) module frontend implementation.

## Table of Contents

1. [Overview](#overview)
2. [Component Structure](#component-structure)
3. [Core Components](#core-components)
4. [API Endpoints](#api-endpoints)
5. [WebSocket Integration](#websocket-integration)
6. [State Management](#state-management)
7. [Visualizations](#visualizations)
8. [Usage Flow](#usage-flow)
9. [Technology Stack](#technology-stack)
10. [Implementation Notes](#implementation-notes)

## Overview

The PCA Module provides a comprehensive interface for performing Principal Component Analysis on gene expression data. It includes features for data upload, sample group management, PCA configuration, result visualization, interpretation, and report generation.

## Component Structure

The PCA module follows a step-based workflow implemented using the following components:

```
PcaPage (container)
│
├── PcaIntroduction
├── DataUploader
├── SampleGroupManager
├── PcaConfiguration
│   └── PcaProgressTracker
├── PcaVisualization
│   ├── 2D/3D Scatter Plot
│   ├── Loading Plot
│   ├── Gene Contribution Plot
│   └── Scree Plot
├── PcaInterpretation
│   ├── Key Insights
│   ├── Pathway Analysis 
│   └── Technical Details
└── PcaReportGenerator
```

## Core Components

### PcaPage

The main container component that manages the workflow and step progression.

**Key Features:**
- Step-based navigation
- WebSocket connection for real-time updates
- Project data loading and management

### PcaIntroduction

Provides an educational introduction to PCA concepts, theory, and applications.

**Key Features:**
- Animated visualizations explaining PCA concepts
- Interactive examples
- Mathematical explanations

### DataUploader

Handles data file upload and initial processing.

**Key Features:**
- CSV/TSV file upload
- Data preview
- Column mapping
- Data scaling options

### SampleGroupManager

Manages sample grouping and metadata.

**Key Features:**
- Group creation and editing
- Sample assignment to groups
- Group color and name customization
- Batch operations

### PcaConfiguration

Configures PCA parameters and initiates analysis.

**Key Features:**
- Component selection
- Scaling options
- Advanced parameter configuration
- Analysis execution
- Real-time progress tracking

### PcaProgressTracker

Displays real-time analysis progress using WebSockets.

**Key Features:**
- Step-by-step progress visualization
- Time remaining estimation
- Cancellation support
- Error handling

### PcaVisualization

Visualizes PCA results through multiple interactive plots.

**Key Features:**
- 2D/3D scatter plots for sample visualization
- Gene loading plot showing component contributions
- Gene contribution visualization with pathway annotations
- Scree plot showing explained variance
- Real-time updates via WebSockets
- Plot customization options
- Export functionality

### PcaInterpretation

Provides tools for interpreting PCA results.

**Key Features:**
- Key insights extraction
- Pathway enrichment analysis
- Variance component breakdown
- Technical details explanation
- Educational content

### PcaReportGenerator

Generates comprehensive reports from PCA results.

**Key Features:**
- PDF report generation
- Visualization inclusion
- Data export options
- Report customization

## API Endpoints

The PCA frontend communicates with the backend through the following API endpoints:

- **Project Management**
  - `GET /api/pca/projects/` - List all projects
  - `GET /api/pca/projects/{id}/` - Get project details
  - `POST /api/pca/projects/` - Create new project
  - `PATCH /api/pca/projects/{id}/` - Update project
  - `DELETE /api/pca/projects/{id}/` - Delete project

- **Data Upload**
  - `POST /api/pca/projects/upload_data/` - Upload data file
  - `POST /api/pca/projects/create_demo/` - Create demo project

- **Sample Management**
  - `GET /api/pca/projects/{id}/samples/` - List samples
  - `PATCH /api/pca/projects/{id}/samples/{sample_id}/` - Update sample

- **Group Management**
  - `GET /api/pca/projects/{id}/groups/` - List groups
  - `POST /api/pca/projects/{id}/groups/` - Create group
  - `PATCH /api/pca/projects/{id}/groups/{group_id}/` - Update group
  - `DELETE /api/pca/projects/{id}/groups/{group_id}/` - Delete group

- **Gene Management**
  - `GET /api/pca/projects/{id}/genes/` - List genes

- **Analysis**
  - `POST /api/pca/projects/{id}/run_pca/` - Run PCA analysis

- **Results**
  - `GET /api/pca/results/{id}/` - Get specific result
  - `GET /api/pca/results/` - List results (filtered by project)

- **Visualizations**
  - `GET /api/pca/results/{id}/visualization_data/` - Get visualization data
  - `GET /api/pca/results/{id}/visualizations/` - List visualizations
  - `POST /api/pca/results/{id}/visualizations/` - Create visualization
  - `GET /api/pca/results/{id}/visualizations/{viz_id}/data/` - Get specific visualization
  - `GET /api/pca/results/{id}/gene_contributions/` - Get gene contributions

## WebSocket Integration

The PCA module uses WebSockets for real-time updates:

### Project-Level WebSocket

**Endpoint**: `/ws/pca_analysis/{projectId}/`

**Messages**:
- `new_result` - When a new result is added to the project
- `new_visualization` - When a new visualization is created
- `project_updated` - When the project details are updated

### Analysis-Level WebSocket

**Endpoint**: `/ws/pca_analysis/progress/{projectId}/{analysisId}/`

**Messages**:
- `analysis_progress` - Updates on analysis progress
- `analysis_complete` - When analysis is completed
- `analysis_error` - When analysis encounters an error
- `analysis_cancelled` - When analysis is cancelled

### Visualization WebSocket

**Endpoint**: `/ws/pca_analysis/{projectId}/{resultId}/`

**Messages**:
- `new_visualization` - When a new visualization is created
- `update_visualization` - When an existing visualization is updated
- `analysis_status` - Updates on analysis status

## State Management

Each component maintains its own state for component-specific interactions. Project-level state is passed down through props from the PcaPage component. WebSocket connections update relevant components in real-time.

Key state elements include:
- `project` - Current project data
- `latestResult` - Most recent analysis result
- `activeStep` - Current workflow step
- `isRunningAnalysis` - Analysis execution status
- `currentAnalysisId` - ID of the currently running analysis
- `visualizationData` - Data for current visualizations

## Visualizations

The PCA module includes several D3.js and React Three Fiber visualizations:

### 2D Scatter Plot

Visualizes samples in a 2D principal component space with customizable axes, colors, and confidence ellipses.

### 3D Scatter Plot

Provides an interactive 3D view of samples in principal component space using React Three Fiber.

### Loading Plot

Shows gene loadings across principal components, indicating the contribution of genes to each component.

### Gene Contribution Plot

Visualizes the contribution of top genes to a specific principal component with pathway annotations.

### Scree Plot

Displays explained variance for each principal component with cumulative variance line.

## Usage Flow

1. **Introduction** - User learns about PCA concepts
2. **Data Upload** - User uploads gene expression data
3. **Group Configuration** - User defines sample groups
4. **Analysis Configuration** - User sets PCA parameters and runs analysis
5. **Visualization** - User explores PCA results through interactive visualizations
6. **Interpretation** - User interprets findings with assistance
7. **Report Generation** - User creates a comprehensive report of findings

## Technology Stack

- **UI Framework**: React with Material-UI
- **Visualizations**: D3.js for 2D visualizations, React Three Fiber for 3D
- **API Communication**: Axios for HTTP requests
- **Real-time Updates**: WebSockets with custom hooks
- **PDF Generation**: jsPDF and html2canvas
- **Data Processing**: Client-side processing with JavaScript

## Implementation Notes

### WebSocket Integration

The module uses three custom hooks for WebSocket communication:
- `useWebSocket` - Base WebSocket communication hook with reconnection logic
- `usePcaProgress` - Tracks PCA analysis progress with detailed step information
- `useVisualizationUpdates` - Provides real-time visualization updates

### Visualization Performance

For optimal performance with large datasets:
- Memoization is used to prevent unnecessary re-renders
- D3.js visualizations are only re-rendered when data or view parameters change
- Dynamic loading is implemented for gene data
- Components use virtualized lists for large datasets

### Accessibility

The module includes the following accessibility features:
- Keyboard navigation for all interactive elements
- ARIA labels for visualization elements
- Color schemes tested for color-blindness compatibility
- Text alternatives for visual information

### Testing

Components are tested using Jest and React Testing Library with:
- Unit tests for individual component functionality
- Integration tests for component interactions
- Mock WebSocket servers for real-time communication testing

### Mobile Responsiveness

The interface adapts to different screen sizes:
- Visualizations are responsive and resize appropriately
- Controls are reorganized for smaller screens
- Touch interactions are supported for mobile devices