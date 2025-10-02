# SQC Analysis Tutorial

This tutorial will guide you through the Statistical Quality Control (SQC) Analysis module of the StickForStats platform. You'll learn how to create control charts, analyze process capability, design acceptance sampling plans, and conduct measurement system analysis.

## Prerequisites

- An account on the StickForStats platform
- Basic understanding of statistical quality control concepts
- Sample data for analysis (you can use our provided example datasets)

## Getting Started

### Accessing the SQC Module

1. Log in to the StickForStats platform
2. From the dashboard, select "SQC Analysis" from the modules menu
3. You'll be directed to the SQC Analysis main page

## Part 1: Control Charts

Control charts are powerful tools for monitoring process stability over time. They help distinguish between common cause variation (inherent to the process) and special cause variation (external factors that need investigation).

### Creating a Control Chart

1. **Upload your data**
   - Click on the "Upload Data" button
   - Select a CSV or Excel file containing your process data
   - Our example dataset `manufacturing_process_data.csv` is a good starting point
   - Verify that the data is loaded correctly in the preview

2. **Configure the control chart**
   - Select the chart type:
     - **X-bar R Chart**: For variables data with subgroups (recommended for subgroups of size 2-9)
     - **X-bar S Chart**: For variables data with larger subgroups (n > 9)
     - **I-MR Chart**: For individual measurements with no natural subgroups
     - **p Chart**: For proportion defective (attribute data)
   - Choose the measurement column (e.g., "Measurement")
   - Select the subgroup column (e.g., "Batch") for X-bar charts
   - Set additional parameters like sample size and rule detection options
   - Click "Generate Control Chart"

3. **Analyze the results**
   - The system will calculate control limits and generate the chart
   - The chart will show:
     - Center line (process average)
     - Upper and lower control limits
     - Data points for each subgroup or individual measurement
     - Rule violations (if any) highlighted with red markers
   - Below the chart, you'll find:
     - Process statistics (average, standard deviation, etc.)
     - Interpretation of the control chart results
     - Recommendations for further analysis

### Example: Creating an X-bar R Chart

For this example, we'll use the manufacturing process data:

1. Upload `manufacturing_process_data.csv`
2. Select "X-bar R Chart" as the chart type
3. Choose "Measurement" as the parameter column
4. Select "Batch" as the grouping column
5. Set sample size to 5 (each batch has 5 measurements)
6. Enable rule detection with "Western Electric Rules"
7. Generate the chart

The resulting chart will show the average measurement for each batch and the corresponding range. The interpretation will indicate whether the process is in statistical control or if there are any special cause variations that need investigation.

### Understanding Control Chart Rules

Control charts use statistical rules to identify potential special causes of variation:

- **Rule 1**: Any point beyond the control limits (±3 sigma)
- **Rule 2**: 2 out of 3 consecutive points in Zone A or beyond (±2 sigma)
- **Rule 3**: 4 out of 5 consecutive points in Zone B or beyond (±1 sigma)
- **Rule 4**: 8 consecutive points on the same side of the center line

When these patterns occur, they signal that something beyond normal random variation is affecting your process, warranting investigation.

## Part 2: Process Capability Analysis

Process capability analysis evaluates how well a process meets specifications by comparing the natural process variation to the specification limits.

### Creating a Process Capability Analysis

1. **Upload your data**
   - Use the same data as for control charts or upload a new dataset
   - The process should be in statistical control before performing capability analysis

2. **Configure the analysis**
   - Select the measurement column
   - Enter specification limits:
     - Lower Specification Limit (LSL)
     - Upper Specification Limit (USL)
     - Target value (optional)
   - Choose distribution options:
     - Assume normality (default)
     - Or select a transformation method for non-normal data
   - Click "Run Process Capability Analysis"

3. **Interpret the results**
   - The system will calculate capability indices:
     - Cp: Process capability (spread)
     - Cpk: Process capability (centering)
     - Pp: Process performance (spread)
     - Ppk: Process performance (centering)
   - View the histogram with specification limits
   - Check the process statistics and defects per million (DPM) estimate
   - Review the interpretation and recommendations

### Example: Process Capability Analysis

For this example, let's analyze the manufacturing process with specification limits:

1. Upload `manufacturing_process_data.csv`
2. Choose "Measurement" as the parameter column
3. Set specification limits:
   - LSL: 9.8
   - USL: 10.8
   - Target: 10.3
4. Run the analysis

The results will show whether the process is capable of consistently meeting specifications. Generally:
- Cpk < 1.0: Process is not capable
- 1.0 ≤ Cpk < 1.33: Marginally capable
- Cpk ≥ 1.33: Process is capable

## Part 3: Acceptance Sampling

Acceptance sampling involves inspecting a sample from a lot to decide whether to accept or reject the entire lot. It's particularly useful when 100% inspection is impractical.

### Creating an Acceptance Sampling Plan

1. **Configure the plan**
   - Select the plan type:
     - Single sampling: One sample is taken
     - Double sampling: A second sample may be taken based on first sample results
     - Multiple sampling: Sequential samples until a decision is reached
   - Enter parameters:
     - Lot size: Number of units in the lot
     - Sample size: Number of units to inspect
     - Acceptance number: Maximum number of defects allowed
   - Or use standard tables:
     - Select a standard (e.g., ANSI/ASQ Z1.4)
     - Enter Acceptable Quality Level (AQL)
     - Choose inspection level
   - Click "Generate Sampling Plan"

2. **Review the results**
   - View the Operating Characteristic (OC) curve
   - Check the producer's risk (alpha) and consumer's risk (beta)
   - See the detailed sampling plan instructions
   - Review recommendations for implementation

### Example: Single Sampling Plan

Let's create a single sampling plan for inspection:

1. Select "Single Sampling" as the plan type
2. Enter parameters:
   - Lot size: 1000
   - Sample size: 80
   - Acceptance number: 2
3. Generate the plan

The system will display the OC curve showing the probability of accepting lots with different defect percentages, along with the detailed sampling instructions.

## Part 4: Measurement System Analysis (MSA)

MSA assesses the reliability of your measurement system by evaluating factors like repeatability (variation from the same operator measuring the same part multiple times) and reproducibility (variation between different operators).

### Conducting a Gage R&R Study

1. **Upload your MSA data**
   - Data should include measurements of parts by different operators with multiple trials
   - Format should have columns for Part, Operator, and Measurement

2. **Configure the analysis**
   - Select the measurement column
   - Choose the part column
   - Select the operator column
   - Set the number of trials
   - Click "Run Gage R&R Analysis"

3. **Interpret the results**
   - View the components of variation:
     - Repeatability (equipment variation)
     - Reproducibility (operator variation)
     - Part-to-part variation
   - Check the %R&R (percentage of total variation due to measurement system)
   - Review the number of distinct categories (ndc)
   - See ANOVA results for statistical significance

### Evaluating Measurement System Acceptability

The general guidelines for interpreting %R&R are:
- < 10%: Excellent measurement system
- 10-30%: Acceptable measurement system
- > 30%: Measurement system needs improvement

Number of distinct categories (ndc) should be at least 5 for an adequate measurement system.

## Advanced Features

### Interactive Visualizations

All visualizations in the SQC module are interactive. You can:
- Hover over data points to see detailed information
- Zoom in on specific regions of the chart
- Click on rule violations to see explanations
- Toggle between different views (e.g., X-bar and R chart)
- Download charts in various formats (PNG, SVG, PDF)

### Report Generation

After completing an analysis, you can generate comprehensive reports:

1. Click "Generate Report" on the results page
2. Configure report options:
   - Choose report format (PDF, Word, HTML)
   - Select sections to include
   - Add title and description
3. Click "Create Report"

The report will include all charts, statistics, interpretations, and recommendations from your analysis, formatted for sharing with team members or management.

### RAG-Based Guidance

The system provides intelligent guidance throughout your analysis:

- Recommendations based on analysis results
- Educational resources tailored to your specific analysis
- Links to related analyses that might provide additional insights
- Suggested next steps based on current findings

## Example Workflows

### Process Monitoring Workflow

1. Create control charts to establish process stability
2. If the process is stable, perform process capability analysis
3. Based on capability results, make process improvements if needed
4. Create new control charts to verify improvements
5. Generate a comprehensive report for management

### Incoming Inspection Workflow

1. Design an acceptance sampling plan based on risk assessment
2. Implement the sampling plan for incoming materials
3. Track acceptance/rejection results over time
4. Use control charts to monitor supplier quality trends
5. Share reports with suppliers for continuous improvement

## Conclusion

The SQC Analysis module provides comprehensive tools for statistical quality control, helping you monitor and improve process quality. By following this tutorial and exploring the educational resources, you'll be able to effectively implement SQC in your organization.

For more advanced topics and detailed guidance, check the educational content within each analysis type or contact our support team.

Happy analyzing!