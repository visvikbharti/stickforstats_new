# Confidence Intervals API Documentation

This document provides an overview of the API endpoints available for the Confidence Intervals module.

## Base URL

All API endpoints are prefixed with `/api/confidence-intervals/`.

## Authentication

All endpoints require authentication except for the educational resources endpoints, which are publicly accessible.

## Projects

Projects represent a collection of confidence interval calculations and simulations.

### Endpoints

- `GET /projects/` - List all projects for the authenticated user
- `POST /projects/` - Create a new project
- `GET /projects/{id}/` - Retrieve a specific project
- `PUT /projects/{id}/` - Update a project
- `DELETE /projects/{id}/` - Delete a project

### Request Body (POST/PUT)

```json
{
  "name": "My Confidence Interval Project",
  "description": "A project to explore confidence intervals",
  "settings": {
    "default_confidence_level": 0.95
  }
}
```

## Interval Data

Represents datasets that can be used for confidence interval calculations.

### Endpoints

- `GET /data/` - List all data for the authenticated user
- `POST /data/` - Create a new dataset
- `GET /data/{id}/` - Retrieve a specific dataset
- `PUT /data/{id}/` - Update a dataset
- `DELETE /data/{id}/` - Delete a dataset

### Request Body (POST/PUT)

```json
{
  "project": "project-uuid",
  "name": "Sample Dataset",
  "data_type": "NUMERIC",
  "numeric_data": [1.2, 2.3, 3.4, 4.5, 5.6],
  "description": "Sample measurements"
}
```

## Interval Results

Represents the results of confidence interval calculations.

### Endpoints

- `GET /results/` - List all interval results for the authenticated user
- `GET /results/{id}/` - Retrieve a specific interval result
- `DELETE /results/{id}/` - Delete an interval result

## Simulation Results

Represents the results of confidence interval simulations.

### Endpoints

- `GET /simulations/` - List all simulation results for the authenticated user
- `GET /simulations/{id}/` - Retrieve a specific simulation result
- `DELETE /simulations/{id}/` - Delete a simulation result

## Educational Resources

Provides educational content for learning about confidence intervals.

### Endpoints

- `GET /educational/` - List all educational resources
- `GET /educational/?section=FUNDAMENTALS` - List resources filtered by section
- `GET /educational/{id}/` - Retrieve a specific educational resource

## Confidence Interval Calculations

Endpoints for performing confidence interval calculations.

### Calculate Endpoint

- `POST /calculate/calculate/` - Calculate a confidence interval

#### Request Body

The request body varies depending on the type of interval being calculated. Here are some examples:

**Mean with Z-interval (known variance)**

```json
{
  "interval_type": "MEAN_Z",
  "project_id": "project-uuid",
  "data_id": "data-uuid",
  "confidence_level": 0.95
}
```

**Mean with T-interval (unknown variance)**

```json
{
  "interval_type": "MEAN_T",
  "project_id": "project-uuid",
  "data_id": "data-uuid",
  "confidence_level": 0.95
}
```

**Alternative: Using summary statistics instead of raw data**

```json
{
  "interval_type": "MEAN_T",
  "project_id": "project-uuid",
  "sample_mean": 10.5,
  "sample_std": 2.3,
  "sample_size": 30,
  "confidence_level": 0.95
}
```

**Proportion interval (Wilson Score method)**

```json
{
  "interval_type": "PROPORTION_WILSON",
  "project_id": "project-uuid",
  "successes": 42,
  "sample_size": 100,
  "confidence_level": 0.95
}
```

**Bootstrap interval**

```json
{
  "interval_type": "BOOTSTRAP_SINGLE",
  "project_id": "project-uuid",
  "data_id": "data-uuid",
  "confidence_level": 0.95,
  "n_resamples": 1000,
  "bootstrap_method": "percentile"
}
```

**Difference in means**

```json
{
  "interval_type": "DIFFERENCE_MEANS",
  "project_id": "project-uuid",
  "data_id": "data-uuid-1",
  "data_id_2": "data-uuid-2",
  "confidence_level": 0.95,
  "equal_variances": false
}
```

### Bootstrap Simulation Endpoint

- `POST /calculate/bootstrap_simulation/` - Run a bootstrap simulation to demonstrate coverage properties

#### Request Body

```json
{
  "project_id": "project-uuid",
  "true_param": 5.0,
  "sample_size": 30,
  "n_simulations": 1000,
  "n_bootstrap": 1000,
  "distribution": "normal",
  "statistic": "mean",
  "confidence_level": 0.95,
  "method": "percentile",
  "dist_params": {
    "mean": 5.0,
    "std": 1.0
  }
}
```

## WebSocket Communication

The module provides WebSocket endpoints for real-time updates during simulations.

### WebSocket URL

- `ws://example.com/ws/confidence_intervals/simulation/{project_id}/`

### Message Format

**Client to Server (Start Simulation)**

```json
{
  "action": "start_bootstrap_simulation",
  "params": {
    "true_param": 5.0,
    "sample_size": 30,
    "n_simulations": 1000,
    "n_bootstrap": 1000,
    "distribution": "normal",
    "statistic": "mean",
    "confidence_level": 0.95,
    "method": "percentile",
    "dist_params": {
      "mean": 5.0,
      "std": 1.0
    }
  }
}
```

**Server to Client (Progress Updates)**

```json
{
  "type": "simulation_update",
  "progress": 50.0,
  "status": "running",
  "current_coverage": 0.94,
  "samples_completed": 500,
  "message": "Processed 500 of 1000 simulations..."
}
```

**Server to Client (Final Results)**

```json
{
  "type": "simulation_complete",
  "status": "complete",
  "results": {
    "coverage_rate": 0.945,
    "mean_interval_width": 1.23,
    "median_interval_width": 1.21,
    "coverages": [...],
    "widths": [...],
    "n_simulations": 1000,
    "n_bootstrap": 1000,
    "confidence_level": 0.95,
    "true_param": 5.0,
    "sample_size": 30
  },
  "message": "Simulation completed successfully"
}
```

## Error Responses

All API endpoints return appropriate HTTP status codes:

- 200 OK: Request successful
- 201 Created: Resource created successfully
- 400 Bad Request: Invalid input parameters
- 401 Unauthorized: Authentication required
- 403 Forbidden: Insufficient permissions
- 404 Not Found: Resource not found
- 500 Internal Server Error: Server error