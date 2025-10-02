# SQC Analysis API Documentation

This document outlines the API endpoints available for the Statistical Quality Control (SQC) Analysis module.

## Base URL

```
/api/v1/sqc/
```

## Authentication

All endpoints require authentication. Use JWT authentication by including the token in the Authorization header:

```
Authorization: Bearer <your_token>
```

## Endpoints

### Control Charts

#### Create a Control Chart Analysis

```
POST /control-charts/
```

Creates a new control chart analysis based on the provided parameters.

**Request Body:**

```json
{
  "session_id": "uuid-string",
  "chart_type": "xbar_r",
  "parameter_column": "Measurement",
  "grouping_column": "Batch",
  "time_column": null,
  "sample_size": 5,
  "detect_rules": true,
  "rule_set": "western_electric",
  "custom_control_limits": null
}
```

Parameters:

- `session_id` (required): UUID of the analysis session
- `chart_type` (required): Type of control chart to generate. Options:
  - `xbar_r`: X-bar and R chart
  - `xbar_s`: X-bar and S chart
  - `i_mr`: Individual and Moving Range chart
  - `p`: p chart (proportion defective)
  - `np`: np chart (number defective)
  - `c`: c chart (defect count)
  - `u`: u chart (defects per unit)
- `parameter_column` (required): Column containing measurement values
- `grouping_column`: Column defining subgroups (for X-bar charts) or sample sizes (for attribute charts)
- `time_column`: Column with time/sequence information (for I-MR charts)
- `sample_size`: Sample size per subgroup (default: 5)
- `detect_rules`: Whether to detect control rule violations (default: true)
- `rule_set`: Set of rules to use for violation detection. Options:
  - `western_electric`: Western Electric rules
  - `nelson`: Nelson rules
- `custom_control_limits`: Optional dictionary with custom control limits

**Response:**

```json
{
  "id": "uuid-string",
  "analysis_session": {
    "id": "uuid-string",
    "name": "X-bar R Chart Analysis",
    "description": "",
    "module": "sqc",
    "status": "completed",
    "created_at": "2023-05-11T14:30:00Z",
    "updated_at": "2023-05-11T14:32:10Z"
  },
  "analysis_result": {
    "id": "uuid-string",
    "name": "X-bar R Chart Results",
    "analysis_type": "control_chart_xbar_r",
    "parameters": {
      "chart_type": "xbar_r",
      "parameter_column": "Measurement",
      "grouping_column": "Batch",
      "sample_size": 5,
      "detect_rules": true,
      "rule_set": "western_electric"
    },
    "result_summary": {
      "center_line": 10.32,
      "upper_control_limit": 10.52,
      "lower_control_limit": 10.12,
      "has_violations": false,
      "process_statistics": {
        "average": 10.32,
        "average_range": 0.5,
        "standard_deviation": 0.21,
        "sample_size": 5,
        "num_subgroups": 3
      }
    },
    "interpretation": "The process appears to be in statistical control. Continue monitoring.",
    "created_at": "2023-05-11T14:32:10Z"
  },
  "chart_type": "xbar_r",
  "sample_size": 5,
  "variable_sample_size": false,
  "parameter_column": "Measurement",
  "grouping_column": "Batch",
  "time_column": "",
  "use_custom_limits": false,
  "upper_control_limit": 10.52,
  "lower_control_limit": 10.12,
  "center_line": 10.32,
  "detect_rules": true,
  "rule_set": "western_electric",
  "special_causes_detected": [],
  "created_at": "2023-05-11T14:32:10Z",
  "updated_at": "2023-05-11T14:32:10Z"
}
```

#### Get a Control Chart Analysis

```
GET /control-charts/{id}/
```

Retrieves a specific control chart analysis by ID.

**Response:**

Same as the response for creating a control chart analysis.

#### Get Plot Data

```
GET /control-charts/{id}/plot_data/
```

Retrieves the plot data for a specific control chart analysis.

**Response:**

```json
{
  "x_data": [1, 2, 3, 4, 5],
  "xbar_values": [10.3, 10.4, 10.2, 10.6, 10.3],
  "range_values": [0.4, 0.4, 0.4, 0.3, 0.3],
  "x_center_line": 10.32,
  "x_ucl": 10.52,
  "x_lcl": 10.12,
  "r_center_line": 0.4,
  "r_ucl": 0.85,
  "r_lcl": 0,
  "subgroup_labels": ["A", "B", "C", "D", "E"],
  "x_violations": [],
  "r_violations": [],
  "subgroups": [
    {
      "name": "A",
      "values": [10.2, 10.5, 10.3, 10.4, 10.1]
    },
    {
      "name": "B",
      "values": [10.3, 10.6, 10.4, 10.5, 10.2]
    },
    {
      "name": "C",
      "values": [10.1, 10.4, 10.2, 10.3, 10.0]
    },
    {
      "name": "D",
      "values": [10.6, 10.7, 10.5, 10.8, 10.6]
    },
    {
      "name": "E",
      "values": [10.4, 10.3, 10.2, 10.5, 10.3]
    }
  ]
}
```

#### Get Recommendations

```
GET /control-charts/{id}/recommendations/
```

Retrieves recommendations based on the control chart analysis results.

**Response:**

```json
{
  "recommendations": [
    {
      "title": "Process appears to be in control",
      "description": "Your control chart shows no signs of special cause variation. The process appears to be stable.",
      "action_type": "information",
      "severity": "low"
    },
    {
      "title": "Process Capability Analysis",
      "description": "Perform a process capability analysis to evaluate how well your process meets specifications.",
      "action_type": "analysis",
      "analysis_type": "process_capability",
      "severity": "medium"
    },
    {
      "title": "Learn about X-bar R Charts",
      "description": "Explore the educational materials about X-bar R charts to deepen your understanding.",
      "action_type": "education",
      "resource_id": "xbar_r_charts",
      "severity": "low"
    }
  ]
}
```

### Process Capability Analysis

#### Create a Process Capability Analysis

```
POST /process-capability/
```

Creates a new process capability analysis based on the provided parameters.

**Request Body:**

```json
{
  "session_id": "uuid-string",
  "parameter_column": "Measurement",
  "grouping_column": "Batch",
  "lower_spec_limit": 9.8,
  "upper_spec_limit": 10.8,
  "target_value": 10.3,
  "assume_normality": true,
  "transformation_method": "none"
}
```

Parameters:

- `session_id` (required): UUID of the analysis session
- `parameter_column` (required): Column containing measurement values
- `grouping_column`: Column defining subgroups (optional)
- `lower_spec_limit`: Lower specification limit (required if upper_spec_limit not provided)
- `upper_spec_limit`: Upper specification limit (required if lower_spec_limit not provided)
- `target_value`: Target value (optional)
- `assume_normality`: Whether to assume normal distribution (default: true)
- `transformation_method`: Method for non-normal data. Options:
  - `none`: No transformation
  - `box_cox`: Box-Cox transformation
  - `johnson`: Johnson transformation
  - `log`: Logarithmic transformation

**Response:**

```json
{
  "id": "uuid-string",
  "analysis_session": {
    "id": "uuid-string",
    "name": "Process Capability Analysis",
    "description": "",
    "module": "sqc",
    "status": "completed",
    "created_at": "2023-05-11T15:30:00Z",
    "updated_at": "2023-05-11T15:32:10Z"
  },
  "analysis_result": {
    "id": "uuid-string",
    "name": "Process Capability Results",
    "analysis_type": "process_capability",
    "parameters": {
      "parameter_column": "Measurement",
      "grouping_column": "Batch",
      "lower_spec_limit": 9.8,
      "upper_spec_limit": 10.8,
      "target_value": 10.3,
      "assume_normality": true,
      "transformation_method": "none"
    },
    "result_summary": {
      "cp": 1.58,
      "cpk": 1.42,
      "pp": 1.45,
      "ppk": 1.32,
      "mean": 10.32,
      "std_dev": 0.21,
      "dpm": 123.4,
      "process_yield": 99.988
    },
    "interpretation": "The process is capable of meeting specifications (Cpk > 1.33).",
    "created_at": "2023-05-11T15:32:10Z"
  },
  "parameter_column": "Measurement",
  "grouping_column": "Batch",
  "lower_spec_limit": 9.8,
  "upper_spec_limit": 10.8,
  "target_value": 10.3,
  "assume_normality": true,
  "transformation_method": "none",
  "transformation_lambda": null,
  "cp": 1.58,
  "cpk": 1.42,
  "pp": 1.45,
  "ppk": 1.32,
  "mean": 10.32,
  "std_dev": 0.21,
  "within_std_dev": 0.21,
  "overall_std_dev": 0.23,
  "dpm": 123.4,
  "process_yield": 99.988,
  "created_at": "2023-05-11T15:32:10Z",
  "updated_at": "2023-05-11T15:32:10Z"
}
```

### Acceptance Sampling

#### Create an Acceptance Sampling Plan

```
POST /acceptance-sampling/
```

Creates a new acceptance sampling plan based on the provided parameters.

**Request Body:**

```json
{
  "session_id": "uuid-string",
  "plan_type": "single",
  "lot_size": 1000,
  "sample_size": 50,
  "acceptance_number": 2,
  "rejection_number": 3,
  "standard_used": "ansi_z1.4",
  "aql": 0.65
}
```

### Measurement System Analysis

#### Create a Measurement System Analysis

```
POST /msa/
```

Creates a new measurement system analysis based on the provided parameters.

**Request Body:**

```json
{
  "session_id": "uuid-string",
  "msa_type": "gage_rr",
  "parameter_column": "Measurement",
  "part_column": "Part",
  "operator_column": "Operator",
  "reference_column": "Reference"
}
```

## WebSocket API

WebSocket connections are available for real-time updates during analysis processing.

### SQC Analysis WebSocket

```
ws://example.com/ws/sqc/analysis/{session_id}/
```

Messages sent from client to server:

```json
{
  "type": "request_status",
  "session_id": "uuid-string"
}
```

Messages sent from server to client:

```json
{
  "type": "status_update",
  "data": {
    "session_id": "uuid-string",
    "status": "in_progress",
    "progress": 50,
    "message": "Calculating control limits..."
  }
}
```

```json
{
  "type": "analysis_complete",
  "data": {
    "session_id": "uuid-string",
    "result_id": "uuid-string",
    "message": "Analysis completed successfully!"
  }
}
```

## Error Responses

When an error occurs, the API will return an appropriate HTTP status code and an error message:

```json
{
  "error": "Error message",
  "detail": "Detailed error information"
}
```

Common error status codes:

- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication failed
- `403 Forbidden`: Permission denied
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Sample API Usage

### Example: Creating an X-bar R Chart

```python
import requests

# API endpoint
url = "http://example.com/api/v1/sqc/control-charts/"

# Authentication headers
headers = {
    "Authorization": "Bearer your_token_here",
    "Content-Type": "application/json"
}

# Request payload
data = {
    "session_id": "12345678-1234-5678-1234-567812345678",
    "chart_type": "xbar_r",
    "parameter_column": "Measurement",
    "grouping_column": "Batch",
    "sample_size": 5,
    "detect_rules": True,
    "rule_set": "western_electric"
}

# Send POST request
response = requests.post(url, json=data, headers=headers)

# Check response
if response.status_code == 201:
    result = response.json()
    print(f"Control chart created with ID: {result['id']}")
    print(f"Center line: {result['center_line']}")
    print(f"UCL: {result['upper_control_limit']}")
    print(f"LCL: {result['lower_control_limit']}")
else:
    print(f"Error: {response.status_code}")
    print(response.json())
```

### Example: WebSocket Connection for Real-time Updates

```javascript
// Create WebSocket connection
const socket = new WebSocket(`ws://example.com/ws/sqc/analysis/${sessionId}/`);

// Connection opened
socket.addEventListener('open', (event) => {
    // Request status update
    socket.send(JSON.stringify({
        type: 'request_status',
        session_id: sessionId
    }));
});

// Listen for messages
socket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === 'status_update') {
        // Update progress indicator
        updateProgress(data.data.progress, data.data.message);
    }
    else if (data.type === 'analysis_complete') {
        // Show completion message and load results
        showCompletion(data.data.message);
        loadAnalysisResults(data.data.result_id);
    }
});

// Connection closed
socket.addEventListener('close', (event) => {
    console.log('Connection closed:', event.code, event.reason);
});

// Connection error
socket.addEventListener('error', (event) => {
    console.error('WebSocket error:', event);
});
```