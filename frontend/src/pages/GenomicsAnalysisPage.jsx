import React, { useState, useCallback } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Chip,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  LinearProgress,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Science as ScienceIcon,
  BarChart as ChartIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Shield as ShieldIcon,
} from '@mui/icons-material';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

const GenomicsAnalysisPage = () => {
  const [file, setFile] = useState(null);
  const [csvData, setCsvData] = useState('');
  const [sampleGroups, setSampleGroups] = useState([]);
  const [group1Name, setGroup1Name] = useState('control');
  const [group2Name, setGroup2Name] = useState('treatment');
  const [alpha, setAlpha] = useState(0.05);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [sortField, setSortField] = useState('adjusted_p_value');
  const [sortDir, setSortDir] = useState('asc');
  const [step, setStep] = useState('upload'); // upload | configure | results

  // Handle file upload
  const handleFileUpload = useCallback((e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      setCsvData(text);

      // Parse header to get sample names
      const lines = text.trim().split('\n');
      const header = lines[0].split(',');
      const samples = header.slice(1);

      // Auto-detect groups from sample names
      const groups = samples.map((s) => {
        const lower = s.toLowerCase();
        if (lower.includes('ctrl') || lower.includes('control') || lower.includes('wt'))
          return 'control';
        if (lower.includes('treat') || lower.includes('ko') || lower.includes('mut'))
          return 'treatment';
        return '';
      });
      setSampleGroups(groups);
      setStep('configure');
    };
    reader.readAsText(uploadedFile);
  }, []);

  // Run analysis
  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/genomics/differential-expression/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csv_data: csvData,
          sample_groups: sampleGroups,
          group1_name: group1Name,
          group2_name: group2Name,
          alpha,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Analysis failed');
      }

      const data = await response.json();
      setResult(data);
      setStep('results');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Sort gene results
  const sortedGenes = result?.gene_results
    ? [...result.gene_results].sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      })
    : [];

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ScienceIcon color="primary" fontSize="large" />
          Genomics Differential Expression Analysis
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Upload a gene expression matrix. Guardian validates assumptions per gene and
          automatically applies BH-FDR correction. Genes failing normality are tested with
          Mann-Whitney U instead of t-test.
        </Typography>
      </Box>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <UploadIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Upload Gene Expression Matrix
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            CSV format: first column = gene names, remaining columns = sample expression values.
            First row = header with sample names.
          </Typography>
          <Button variant="contained" component="label" size="large">
            Choose CSV File
            <input type="file" hidden accept=".csv,.tsv,.txt" onChange={handleFileUpload} />
          </Button>
          {file && (
            <Typography sx={{ mt: 2 }} color="success.main">
              Loaded: {file.name}
            </Typography>
          )}
        </Paper>
      )}

      {/* Step 2: Configure */}
      {step === 'configure' && (
        <Paper sx={{ p: 4 }}>
          <Typography variant="h6" gutterBottom>
            Configure Groups
          </Typography>

          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Reference Group Name"
                value={group1Name}
                onChange={(e) => setGroup1Name(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Comparison Group Name"
                value={group2Name}
                onChange={(e) => setGroup2Name(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="FDR Threshold (alpha)"
                type="number"
                value={alpha}
                onChange={(e) => setAlpha(parseFloat(e.target.value))}
                inputProps={{ step: 0.01, min: 0.001, max: 0.5 }}
              />
            </Grid>
          </Grid>

          <Typography variant="subtitle2" gutterBottom>
            Assign samples to groups:
          </Typography>
          <Box sx={{ maxHeight: 300, overflow: 'auto', mb: 3 }}>
            {sampleGroups.map((group, idx) => {
              const header = csvData.split('\n')[0].split(',');
              const sampleName = header[idx + 1] || `Sample ${idx + 1}`;
              return (
                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Typography variant="body2" sx={{ minWidth: 150 }}>
                    {sampleName}
                  </Typography>
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Group</InputLabel>
                    <Select
                      value={group}
                      label="Group"
                      onChange={(e) => {
                        const newGroups = [...sampleGroups];
                        newGroups[idx] = e.target.value;
                        setSampleGroups(newGroups);
                      }}
                    >
                      <MenuItem value="control">{group1Name}</MenuItem>
                      <MenuItem value="treatment">{group2Name}</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              );
            })}
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined" onClick={() => setStep('upload')}>
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleAnalyze}
              disabled={loading || sampleGroups.some((g) => !g)}
              startIcon={loading ? <CircularProgress size={20} /> : <ScienceIcon />}
            >
              {loading ? 'Analyzing...' : 'Run Differential Expression'}
            </Button>
          </Box>

          {loading && <LinearProgress sx={{ mt: 2 }} />}
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Paper>
      )}

      {/* Step 3: Results */}
      {step === 'results' && result && (
        <Box>
          {/* Summary Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="overline" color="text.secondary">Total Genes</Typography>
                  <Typography variant="h4">{result.summary.n_genes}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="overline" color="text.secondary">Significant (FDR &lt; {alpha})</Typography>
                  <Typography variant="h4" color="success.main">{result.summary.n_significant}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="overline" color="text.secondary">Guardian Cascaded</Typography>
                  <Typography variant="h4" color="warning.main">{result.summary.n_cascaded}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="overline" color="text.secondary">Mean Confidence</Typography>
                  <Typography variant="h4">
                    {(result.guardian_summary.mean_confidence * 100).toFixed(1)}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Guardian Summary */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <ShieldIcon color="primary" />
              Guardian Summary
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} md={3}>
                <Typography variant="body2" color="text.secondary">Normality Violations</Typography>
                <Typography variant="h6">{result.guardian_summary.n_normality_violations}</Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="body2" color="text.secondary">Variance Violations</Typography>
                <Typography variant="h6">{result.guardian_summary.n_variance_violations}</Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="body2" color="text.secondary">Cascade Rate</Typography>
                <Typography variant="h6">{(result.guardian_summary.cascade_rate * 100).toFixed(1)}%</Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="body2" color="text.secondary">Min Confidence</Typography>
                <Typography variant="h6">{(result.guardian_summary.min_confidence * 100).toFixed(1)}%</Typography>
              </Grid>
            </Grid>
            {result.guardian_summary.cascade_rate > 0.5 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Over 50% of genes failed normality checks. Guardian automatically used Mann-Whitney U
                test for these genes, providing more reliable p-values for non-normal expression data.
              </Alert>
            )}
          </Paper>

          {/* Volcano Plot */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <ChartIcon color="primary" />
              Volcano Plot
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="log2fc"
                  name="log2 Fold Change"
                  type="number"
                  label={{ value: 'log2 Fold Change', position: 'bottom', offset: 20 }}
                />
                <YAxis
                  dataKey="neg_log10_padj"
                  name="-log10(adjusted p)"
                  type="number"
                  label={{ value: '-log10(adjusted p-value)', angle: -90, position: 'left', offset: 10 }}
                />
                <RechartsTooltip
                  content={({ payload }) => {
                    if (payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <Paper sx={{ p: 1 }}>
                          <Typography variant="body2"><strong>{d.gene}</strong></Typography>
                          <Typography variant="caption">log2FC: {d.log2fc}</Typography><br />
                          <Typography variant="caption">-log10(padj): {d.neg_log10_padj}</Typography><br />
                          <Typography variant="caption">
                            {d.significant ? 'Significant' : 'Not significant'}
                            {d.cascaded ? ' (Guardian cascaded)' : ''}
                          </Typography>
                        </Paper>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={-Math.log10(alpha)} stroke="#ff5722" strokeDasharray="5 5" />
                <ReferenceLine x={-1} stroke="#9e9e9e" strokeDasharray="3 3" />
                <ReferenceLine x={1} stroke="#9e9e9e" strokeDasharray="3 3" />
                <Scatter data={result.volcano_data} shape="circle">
                  {result.volcano_data.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={
                        entry.significant && Math.abs(entry.log2fc) > 1
                          ? '#d32f2f'
                          : entry.significant
                          ? '#ff9800'
                          : '#bdbdbd'
                      }
                      r={entry.significant ? 5 : 3}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 1 }}>
              <Chip size="small" sx={{ bgcolor: '#d32f2f', color: 'white' }} label="Significant + |FC| > 2" />
              <Chip size="small" sx={{ bgcolor: '#ff9800', color: 'white' }} label="Significant" />
              <Chip size="small" sx={{ bgcolor: '#bdbdbd' }} label="Not significant" />
            </Box>
          </Paper>

          {/* Gene Results Table */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Gene Results ({sortedGenes.length} genes)
            </Typography>
            <TableContainer sx={{ maxHeight: 500 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Gene</TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortField === 'log2_fold_change'}
                        direction={sortField === 'log2_fold_change' ? sortDir : 'asc'}
                        onClick={() => handleSort('log2_fold_change')}
                      >
                        log2 FC
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortField === 'adjusted_p_value'}
                        direction={sortField === 'adjusted_p_value' ? sortDir : 'asc'}
                        onClick={() => handleSort('adjusted_p_value')}
                      >
                        Adj. p-value
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Test Used</TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortField === 'guardian_confidence'}
                        direction={sortField === 'guardian_confidence' ? sortDir : 'asc'}
                        onClick={() => handleSort('guardian_confidence')}
                      >
                        Guardian
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedGenes.slice(0, 100).map((gene) => (
                    <TableRow key={gene.gene_name} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={gene.significant ? 600 : 400}>
                          {gene.gene_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          color={gene.log2_fold_change > 0 ? 'error.main' : 'primary.main'}
                        >
                          {gene.log2_fold_change > 0 ? '+' : ''}{gene.log2_fold_change.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {gene.adjusted_p_value < 0.001
                            ? gene.adjusted_p_value.toExponential(2)
                            : gene.adjusted_p_value.toFixed(4)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={gene.cascaded ? 'Guardian cascaded to nonparametric' : 'Parametric test'}>
                          <Chip
                            size="small"
                            label={gene.test_used}
                            color={gene.cascaded ? 'warning' : 'default'}
                            variant="outlined"
                          />
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={`Confidence: ${(gene.guardian_confidence * 100).toFixed(0)}%`}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {gene.guardian_confidence >= 0.8 ? (
                              <CheckIcon fontSize="small" color="success" />
                            ) : (
                              <WarningIcon fontSize="small" color="warning" />
                            )}
                            <Typography variant="caption">
                              {(gene.guardian_confidence * 100).toFixed(0)}%
                            </Typography>
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        {gene.significant ? (
                          <Chip size="small" label="DEG" color="error" />
                        ) : (
                          <Chip size="small" label="NS" variant="outlined" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined" onClick={() => { setResult(null); setStep('upload'); }}>
              New Analysis
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                const blob = new Blob(
                  [JSON.stringify(result, null, 2)],
                  { type: 'application/json' }
                );
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'differential_expression_results.json';
                a.click();
              }}
            >
              Export Results (JSON)
            </Button>
          </Box>
        </Box>
      )}
    </Container>
  );
};

export default GenomicsAnalysisPage;
