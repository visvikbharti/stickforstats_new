import React, { useState } from 'react';
import { 
  Typography, 
  Box, 
  Paper, 
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  LineChart,
  Line
} from 'recharts';

// Mock data
const mockDatasets = [
  { id: 1, name: 'Sample Dataset 1', type: 'csv', rows: 120, columns: 8 },
  { id: 2, name: 'Gene Expression Data', type: 'excel', rows: 320, columns: 12 },
  { id: 3, name: 'Quality Control Metrics', type: 'csv', rows: 84, columns: 6 },
  { id: 4, name: 'Manufacturing Process', type: 'json', rows: 210, columns: 15 }
];

// Sample data for visualization
const sampleData = [
  { name: 'Category A', value1: 4000, value2: 2400 },
  { name: 'Category B', value1: 3000, value2: 1398 },
  { name: 'Category C', value1: 2000, value2: 9800 },
  { name: 'Category D', value1: 2780, value2: 3908 },
  { name: 'Category E', value1: 1890, value2: 4800 },
  { name: 'Category F', value1: 2390, value2: 3800 },
  { name: 'Category G', value1: 3490, value2: 4300 }
];

const scatterData = [
  { x: 100, y: 200, z: 200 },
  { x: 120, y: 100, z: 260 },
  { x: 170, y: 300, z: 400 },
  { x: 140, y: 250, z: 280 },
  { x: 150, y: 400, z: 500 },
  { x: 110, y: 280, z: 200 }
];

const tableData = [
  { id: 1, column1: 'Row 1, Col 1', column2: 'Row 1, Col 2', column3: 342, column4: 123.45 },
  { id: 2, column1: 'Row 2, Col 1', column2: 'Row 2, Col 2', column3: 123, column4: 456.78 },
  { id: 3, column1: 'Row 3, Col 1', column2: 'Row 3, Col 2', column3: 456, column4: 789.01 },
  { id: 4, column1: 'Row 4, Col 1', column2: 'Row 4, Col 2', column3: 789, column4: 234.56 },
  { id: 5, column1: 'Row 5, Col 1', column2: 'Row 5, Col 2', column3: 234, column4: 567.89 }
];

function DataExplorationPage() {
  const [selectedDataset, setSelectedDataset] = useState('');
  const [chartType, setChartType] = useState('bar');

  const handleDatasetChange = (event) => {
    setSelectedDataset(event.target.value);
  };

  const handleChartTypeChange = (event) => {
    setChartType(event.target.value);
  };

  return (
    <div>
      <Typography variant="h5" gutterBottom>
        Data Exploration
      </Typography>
      <Typography variant="body1" paragraph>
        Explore your datasets with visualizations and summary statistics.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Select Dataset</InputLabel>
            <Select
              value={selectedDataset}
              label="Select Dataset"
              onChange={handleDatasetChange}
            >
              {mockDatasets.map((dataset) => (
                <MenuItem key={dataset.id} value={dataset.id}>
                  {dataset.name} ({dataset.type})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Chart Type</InputLabel>
            <Select
              value={chartType}
              label="Chart Type"
              onChange={handleChartTypeChange}
              disabled={!selectedDataset}
            >
              <MenuItem value="bar">Bar Chart</MenuItem>
              <MenuItem value="line">Line Chart</MenuItem>
              <MenuItem value="scatter">Scatter Plot</MenuItem>
              <MenuItem value="table">Data Table</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {!selectedDataset ? (
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body1">
            Please select a dataset to begin exploration.
          </Typography>
        </Box>
      ) : (
        <Paper elevation={1} sx={{ p: 2, mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            {mockDatasets.find(d => d.id === selectedDataset)?.name} - Exploration
          </Typography>

          <Box sx={{ mt: 3, height: 400 }}>
            {chartType === 'bar' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={sampleData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value1" fill="#8884d8" name="Series 1" />
                  <Bar dataKey="value2" fill="#82ca9d" name="Series 2" />
                </BarChart>
              </ResponsiveContainer>
            )}

            {chartType === 'line' && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={sampleData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="value1" stroke="#8884d8" name="Series 1" />
                  <Line type="monotone" dataKey="value2" stroke="#82ca9d" name="Series 2" />
                </LineChart>
              </ResponsiveContainer>
            )}

            {chartType === 'scatter' && (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  margin={{
                    top: 20,
                    right: 20,
                    bottom: 20,
                    left: 20,
                  }}
                >
                  <CartesianGrid />
                  <XAxis type="number" dataKey="x" name="x value" />
                  <YAxis type="number" dataKey="y" name="y value" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter name="Values" data={scatterData} fill="#8884d8" />
                </ScatterChart>
              </ResponsiveContainer>
            )}

            {chartType === 'table' && (
              <TableContainer>
                <Table sx={{ minWidth: 650 }} aria-label="data table">
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Column 1</TableCell>
                      <TableCell>Column 2</TableCell>
                      <TableCell align="right">Column 3</TableCell>
                      <TableCell align="right">Column 4</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tableData.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell component="th" scope="row">
                          {row.id}
                        </TableCell>
                        <TableCell>{row.column1}</TableCell>
                        <TableCell>{row.column2}</TableCell>
                        <TableCell align="right">{row.column3}</TableCell>
                        <TableCell align="right">{row.column4}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
          
          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button variant="outlined">Export Data</Button>
            <Button variant="outlined">Generate Report</Button>
            <Button variant="outlined">Advanced Analysis</Button>
          </Box>
        </Paper>
      )}
    </div>
  );
}

export default DataExplorationPage;