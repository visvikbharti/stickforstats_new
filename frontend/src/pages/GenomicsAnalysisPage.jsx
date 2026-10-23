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
  FormControlLabel,
  FormLabel,
  InputLabel,
  Radio,
  RadioGroup,
  Tooltip,
  LinearProgress,
  Card,
  CardContent,
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
  CONFIDENCE_DEFINITION,
  GUARDIAN_COLUMN_DEFINITION,
  MEAN_CONFIDENCE_DEFINITION,
  MIN_CONFIDENCE_DEFINITION,
} from '../utils/genomicsConfidence';
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
import { describeTestUsed } from '../utils/genomicsTestUsed';
import { formatPValue, compareWithMissingLast } from '../utils/formatStats';
import {
  INPUT_SCALE_AUTO,
  INPUT_SCALE_LINEAR,
  INPUT_SCALE_LOG2,
  detectInputScale,
  expressionValuesFromCsv,
  resolveInputScale,
} from '../utils/inputScale';

const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:8000/api') + '/v1';

// The scale the values are on decides what the fold change IS: the log2 of a ratio of group means
// on a linear scale, the difference of group means on a log2 one. The backend computes both, but
// only if it is told which; this page used to never say, so the API's "linear" default was applied
// to log2 uploads, giving log2 of a ratio of log-scale means -- not a fold change (issue #31).
const SCALE_LABELS = {
  [INPUT_SCALE_LINEAR]: 'linear values (counts, CPM, TPM or intensities)',
  [INPUT_SCALE_LOG2]: 'already log2-transformed values',
};

const foldChangeRule = (scale, group1, group2) =>
  scale === INPUT_SCALE_LOG2
    ? `log2 fold change = mean(${group2}) − mean(${group1})`
    : `log2 fold change = log2(mean(${group2}) / mean(${group1}))`;

const InputScaleChoice = ({ value, onChange }) => (
  <FormControl component="fieldset">
    <FormLabel component="legend" id="input-scale-label">
      Scale of the expression values
    </FormLabel>
    <RadioGroup
      name="input-scale"
      aria-labelledby="input-scale-label"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <FormControlLabel
        value={INPUT_SCALE_AUTO}
        control={<Radio />}
        label="Detect from the values (suggested)"
      />
      <FormControlLabel
        value={INPUT_SCALE_LINEAR}
        control={<Radio />}
        label="Linear: counts, CPM, TPM or intensities"
      />
      <FormControlLabel
        value={INPUT_SCALE_LOG2}
        control={<Radio />}
        label="Already log2-transformed, e.g. log2(TPM + 1)"
      />
    </RadioGroup>
  </FormControl>
);

// What the analysis is about to assume about the scale, and why -- always visible before it runs.
const InputScaleNote = ({ choice, detection, group1Name, group2Name }) => {
  if (choice === INPUT_SCALE_AUTO) {
    if (!detection || !detection.scale) {
      return (
        <Alert severity="warning" sx={{ mt: 2 }} data-testid="input-scale-note">
          The scale could not be detected{detection ? `: ${detection.reason}` : ''}. Choose linear
          or log2 above before running the analysis.
        </Alert>
      );
    }
    return (
      <Alert severity="info" sx={{ mt: 2 }} data-testid="input-scale-note">
        <strong>Assumed: {SCALE_LABELS[detection.scale]}</strong>, detected from your data
        because {detection.reason}. So {foldChangeRule(detection.scale, group1Name, group2Name)}.
        If that is wrong, choose the scale above.
      </Alert>
    );
  }
  const disagrees = Boolean(detection && detection.scale && detection.scale !== choice);
  return (
    <Alert severity={disagrees ? 'warning' : 'info'} sx={{ mt: 2 }} data-testid="input-scale-note">
      <strong>Assumed: {SCALE_LABELS[choice]}</strong>, as you chose.
      {' '}So {foldChangeRule(choice, group1Name, group2Name)}.
      {disagrees &&
        ` Check this choice: the values look like ${SCALE_LABELS[detection.scale]}, because ` +
          `${detection.reason}.`}
    </Alert>
  );
};

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
  const [inputScaleChoice, setInputScaleChoice] = useState(INPUT_SCALE_AUTO);
  const [scaleDetection, setScaleDetection] = useState(null);
  // The scale the last request sent, and whether it was detected or chosen, for the results note.
  const [analysedScale, setAnalysedScale] = useState(null);
  const inputScale = resolveInputScale(inputScaleChoice, scaleDetection);

  // Handle file upload
  const handleFileUpload = useCallback((e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      setCsvData(text);
      setScaleDetection(detectInputScale(expressionValuesFromCsv(text)));

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
          // Always sent: left out, the API assumes "linear", which is wrong for log2 uploads.
          input_scale: inputScale,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Analysis failed');
      }

      const data = await response.json();
      setResult(data);
      setAnalysedScale({
        sent: inputScale,
        source: inputScaleChoice === INPUT_SCALE_AUTO ? 'detected' : 'chosen',
        // A choice the detector disagreed with stays flagged on the results, not just before.
        detectedOtherwise:
          scaleDetection && scaleDetection.scale && scaleDetection.scale !== inputScale
            ? scaleDetection.scale
            : null,
      });
      setStep('results');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Sort gene results
  const sortedGenes = result?.gene_results
    ? [...result.gene_results].sort((a, b) =>
        // Null-safe: a failed-test gene (e.g. adjusted_p_value === null) must not
        // sort as if it were the most significant -- push missing values last.
        compareWithMissingLast(a[sortField], b[sortField], sortDir)
      )
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
          automatically applies BH-FDR correction. Instead of Student's t-test, genes failing
          normality are tested with Mann-Whitney U, and genes failing only the equal-variance
          check with Welch's t-test.
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
          <Box sx={{ maxWidth: 600, mx: 'auto', textAlign: 'left', mb: 3 }}>
            <InputScaleChoice value={inputScaleChoice} onChange={setInputScaleChoice} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              The scale decides how the fold change is computed: on linear values it is the log2 of
              the ratio of the group means; on log2 values it is the difference of the group means.
              The scale assumed is shown, with the reason, before you run the analysis. Values on
              another log scale (natural log, log10) must be converted to log2 first: the base
              cannot be detected.
            </Typography>
          </Box>
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

          <Box sx={{ mb: 3 }}>
            <InputScaleChoice value={inputScaleChoice} onChange={setInputScaleChoice} />
            <InputScaleNote
              choice={inputScaleChoice}
              detection={scaleDetection}
              group1Name={group1Name}
              group2Name={group2Name}
            />
          </Box>

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
              disabled={loading || sampleGroups.some((g) => !g) || !inputScale}
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
          {/* The scale the backend says it computed on (echoed in its response), not the one this
              page asked for -- if the two ever differ, the note must describe what was done. */}
          {SCALE_LABELS[result.summary.input_scale] && (
            <Alert
              severity={
                result.summary.input_scale === analysedScale?.sent && !analysedScale?.detectedOtherwise
                  ? 'info'
                  : 'warning'
              }
              sx={{ mb: 3 }}
              data-testid="results-input-scale"
            >
              Fold changes were computed for {SCALE_LABELS[result.summary.input_scale]}
              {result.summary.input_scale !== analysedScale?.sent
                ? `, not the ${SCALE_LABELS[analysedScale?.sent]} this page sent`
                : analysedScale.source === 'detected'
                ? ', detected from your data'
                : analysedScale.detectedOtherwise
                ? `, as you chose, although the values looked like ${SCALE_LABELS[analysedScale.detectedOtherwise]}`
                : ', as you chose'}
              : {foldChangeRule(result.summary.input_scale, group1Name, group2Name)}.
            </Alert>
          )}

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
                  <Typography variant="caption" color="text.secondary" data-testid="mean-confidence-definition">
                    {MEAN_CONFIDENCE_DEFINITION}
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
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }} data-testid="confidence-definition">
              {CONFIDENCE_DEFINITION}
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
                <Typography variant="caption" color="text.secondary" data-testid="min-confidence-definition">
                  {MIN_CONFIDENCE_DEFINITION}
                </Typography>
              </Grid>
            </Grid>
            {/* cascade_rate counts EVERY switch away from Student's t-test, Welch's included, so
                the alert counts each destination rather than calling them all non-normal. */}
            {result.guardian_summary.cascade_rate > 0.5 && (
              <Alert severity="info" sx={{ mt: 2 }} data-testid="cascade-alert">
                Guardian switched {result.summary.n_cascaded} of {result.summary.n_genes} genes away
                from Student's t-test:{' '}
                {[
                  ['mann_whitney', 'to Mann-Whitney U (nonparametric), because normality was rejected or could not be checked'],
                  ['welch_t_test', "to Welch's t-test (unequal variances), because the equal-variance check failed or could not be computed"],
                  ['kruskal_wallis', 'to Kruskal-Wallis (nonparametric)'],
                ]
                  .map(([test, why]) => [
                    result.gene_results.filter((g) => g.test_used === test).length,
                    why,
                  ])
                  .filter(([count]) => count > 0)
                  .map(([count, why]) => `${count} ${why}`)
                  .join('; ')}
                .
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
            <Typography
              variant="caption"
              color="text.secondary"
              component="p"
              sx={{ mb: 1 }}
              data-testid="guardian-column-definition"
            >
              {GUARDIAN_COLUMN_DEFINITION}
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
                          {/* Null-safe: on a linear scale the fold change does not exist when a
                              group mean is 0, and the backend says so with null. */}
                          {gene.log2_fold_change == null
                            ? '—'
                            : `${gene.log2_fold_change > 0 ? '+' : ''}${gene.log2_fold_change.toFixed(2)}`}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {/* Null-safe: adjusted_p_value is null for genes whose
                              test failed (zero-variance genes, common in RNA-seq);
                              formatPValue renders an em dash instead of crashing. */}
                          {formatPValue(gene.adjusted_p_value)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={describeTestUsed(gene)}>
                          <Chip
                            size="small"
                            label={gene.test_used}
                            color={gene.cascaded ? 'warning' : 'default'}
                            variant="outlined"
                          />
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Tooltip
                          // Short on purpose: MUI copies a string title into the cell's aria-label,
                          // and the full definition is already on the page, above the table.
                          title={`Confidence ${(gene.guardian_confidence * 100).toFixed(0)}%: Guardian's assumption-check score, not a probability (defined under Guardian Summary)`}
                        >
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
            <Button
              variant="outlined"
              onClick={() => {
                // A new file starts from detection again: a scale chosen for the last file must not
                // carry over to the next one unnoticed.
                setResult(null);
                setFile(null);
                setScaleDetection(null);
                setInputScaleChoice(INPUT_SCALE_AUTO);
                setAnalysedScale(null);
                setError(null);
                setStep('upload');
              }}
            >
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
