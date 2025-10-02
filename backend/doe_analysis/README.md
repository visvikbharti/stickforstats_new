# Design of Experiments (DOE) Analysis Module

This module provides comprehensive functionality for designing, analyzing, and optimizing experiments using Design of Experiments (DOE) methodology.

## Features

- **Experimental Design Generation**
  - Full Factorial Designs
  - Fractional Factorial Designs
  - Response Surface Methods
    - Central Composite Designs (CCD)
    - Box-Behnken Designs (BBD)
  - Plackett-Burman Designs
  - Latin Square Designs
  - Support for categorical factors

- **Model Analysis**
  - ANOVA analysis
  - Regression modeling
  - Effect estimation
  - Residual analysis
  - Model diagnostics
  - Contour and surface plots

- **Response Optimization**
  - Single and multiple response optimization
  - Desirability function approach
  - Constrained optimization
  - Graphical interpretation of results

- **Report Generation**
  - Comprehensive PDF reports
  - Interactive visualization
  - Model interpretation

## Usage

### API Endpoints

The DOE module provides the following RESTful API endpoints:

#### Experiment Designs

- `GET /api/doe/experiment-designs/`: List all experiment designs
- `POST /api/doe/experiment-designs/`: Create a new experiment design
- `GET /api/doe/experiment-designs/{id}/`: Get details of a specific experiment design
- `PUT /api/doe/experiment-designs/{id}/`: Update an experiment design
- `DELETE /api/doe/experiment-designs/{id}/`: Delete an experiment design
- `POST /api/doe/experiment-designs/generate_design/`: Generate a new design based on specified factors
- `POST /api/doe/experiment-designs/{id}/upload_design_data/`: Upload results for an experiment
- `GET /api/doe/experiment-designs/{id}/export_design/`: Export design as CSV

#### Model Analysis

- `GET /api/doe/model-analyses/`: List all model analyses
- `POST /api/doe/model-analyses/`: Create a new model analysis
- `GET /api/doe/model-analyses/{id}/`: Get details of a specific model analysis
- `PUT /api/doe/model-analyses/{id}/`: Update a model analysis
- `DELETE /api/doe/model-analyses/{id}/`: Delete a model analysis
- `POST /api/doe/model-analyses/run_analysis/`: Run a model analysis on experiment data
- `GET /api/doe/model-analyses/{id}/generate_report/`: Generate a report for a model analysis

#### Optimization Analysis

- `GET /api/doe/optimization-analyses/`: List all optimization analyses
- `POST /api/doe/optimization-analyses/`: Create a new optimization analysis
- `GET /api/doe/optimization-analyses/{id}/`: Get details of a specific optimization analysis
- `PUT /api/doe/optimization-analyses/{id}/`: Update an optimization analysis
- `DELETE /api/doe/optimization-analyses/{id}/`: Delete an optimization analysis
- `POST /api/doe/optimization-analyses/run_optimization/`: Run optimization on a model analysis
- `GET /api/doe/optimization-analyses/{id}/generate_report/`: Generate a report for an optimization analysis

### WebSocket Endpoints

For real-time updates during long-running analyses:

- `ws/doe/analysis/{user_id}/{experiment_id}/`: WebSocket for model analysis updates
- `ws/doe/optimization/{user_id}/{analysis_id}/`: WebSocket for optimization updates

## Models

- **ExperimentDesign**: Base model for storing experimental designs
- **FactorDefinition**: Defines factors (variables) in an experiment
- **ResponseDefinition**: Defines responses (outcomes) to be measured
- **ExperimentRun**: Individual experimental runs with factor settings and response values
- **ModelAnalysis**: Analysis of experimental data with models and statistical tests
- **OptimizationAnalysis**: Optimization of responses based on model results

## Services

- **DesignGeneratorService**: Generates various types of experimental designs
- **ModelAnalyzerService**: Analyzes experimental data using statistical models
- **ReportGeneratorService**: Generates comprehensive reports with visualizations

## Sample Data

The module includes sample datasets in the `sample_data` directory:

- `factorial_design.csv`: A full factorial design with 3 factors
- `central_composite_design.csv`: A central composite design with 2 factors

## Example Usage

### Generating a Factorial Design

```python
from doe_analysis.services.design_generator import DesignGeneratorService

# Initialize the service
design_service = DesignGeneratorService()

# Define factors
factors = [
    {
        'name': 'Temperature',
        'low_level': 60,
        'high_level': 80,
        'is_categorical': False
    },
    {
        'name': 'Pressure',
        'low_level': 100,
        'high_level': 200,
        'is_categorical': False
    },
    {
        'name': 'Catalyst',
        'is_categorical': True,
        'categories': ['A', 'B', 'C']
    }
]

# Generate a full factorial design
design = design_service.generate_design(
    design_type='FACTORIAL',
    factors=factors,
    center_points=0
)

# The result is a pandas DataFrame with the design matrix
print(design)
```

### Analyzing a Model

```python
import pandas as pd
from doe_analysis.services.model_analyzer import ModelAnalyzerService

# Initialize the service
analyzer = ModelAnalyzerService()

# Load data
data = pd.read_csv('sample_data/factorial_design.csv')

# Analyze the model
result = analyzer.analyze_model(
    design_type='FACTORIAL',
    data=data,
    factor_names=['Temperature', 'Pressure', 'Catalyst'],
    response_names=['Yield'],
    analysis_type='FACTORIAL'
)

# The result contains ANOVA tables, model coefficients, equations, and statistics
print(result['model_equations']['Yield'])
```

### Optimizing Responses

```python
from doe_analysis.services.model_analyzer import ModelAnalyzerService

# Initialize the service
analyzer = ModelAnalyzerService()

# Using the model results from above
model_results = result

# Define factors for optimization
factors = [
    {
        'name': 'Temperature',
        'low_level': 60,
        'high_level': 80,
        'is_categorical': False
    },
    {
        'name': 'Pressure',
        'low_level': 100,
        'high_level': 200,
        'is_categorical': False
    }
]

# Define response goals
response_goals = {
    'Yield': {
        'goal': 'MAXIMIZE',
        'lower_bound': 70,
        'upper_bound': 100,
        'weight': 1.0
    }
}

# Run optimization
optimization_result = analyzer.optimize_response(
    model_results=model_results,
    factors=factors,
    response_goals=response_goals,
    optimization_type='DESIRABILITY'
)

# Get the optimal solution
optimal_solution = optimization_result['optimal_solutions'][0]
print(f"Optimal settings: {optimal_solution['factor_settings']}")
print(f"Predicted response: {optimal_solution['predicted_responses']}")
print(f"Desirability: {optimal_solution['desirability']}")
```

## Dependencies

- Django and Django REST Framework
- Pandas for data handling
- NumPy and SciPy for numerical calculations
- Statsmodels for statistical modeling
- Matplotlib and Seaborn for visualization

## Integration

This module integrates with the main StickForStats application and can be used standalone or in conjunction with other statistical modules.