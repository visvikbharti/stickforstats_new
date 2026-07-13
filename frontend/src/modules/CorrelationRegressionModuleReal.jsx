/**
 * Correlation & Regression.
 *
 * REBUILT 2026-07-13. What it was before, and why none of it survived:
 *
 *  - There was NO WAY TO SUPPLY YOUR OWN DATA. All three tabs analysed hard-coded arrays
 *    imported from RealExampleDatasets.js. The statistics were genuinely computed by the
 *    backend -- they simply were not the user's numbers, and no control anywhere on the
 *    screen would make them so. The header nonetheless read "Real Business Data" and
 *    "Explore relationships in real data".
 *
 *  - The Confidence Level select was a WRONG NUMBER, not a no-op: it sent confidence_level
 *    as a top-level key, which DRF silently discarded (the serializer never declared it), so
 *    the backend always used 0.95 -- while the panel heading was rendered from local state as
 *    "99% Confidence Interval". Fixed on the backend (the flat key is now accepted) and sent
 *    under `parameters` here as well.
 *
 *  - The Model Type select was inert: `modelType` was written by the Select and read nowhere,
 *    so choosing "Polynomial" or "Robust" still fitted an ordinary least-squares line and
 *    labelled it as whatever you picked. "Robust" was not even a valid backend type. It is
 *    now (robust / quantile / stepwise were unreachable dead code; see the backend commit).
 *
 *  - The trend line and CI bands NEVER RENDERED: they were gated on
 *    `result.high_precision_result.regression`, a key the correlation endpoint has never
 *    returned. The panel was titled "Scatter Plot with Regression Line" and its legend
 *    advertised "Regression Line" and "95% CI" for series that were never populated. The
 *    line now comes from a real regression fit on the same data.
 *
 *  - The correlation matrix correlated four series that HAVE NO ROW CORRESPONDENCE and
 *    different lengths (12, 12, 10, 8), truncating each pair to the shorter -- producing
 *    numbers with no meaning -- then captioned them "calculated from real business metrics"
 *    and decorated them with significance stars computed from a HARD-CODED n = 10. The matrix
 *    is now built from the user's own table, where the rows genuinely correspond.
 *
 *  - The "Dataset" select on the matrix tab re-ran the spinner and then showed the identical
 *    business matrix whatever you chose.
 *
 *  - `backendPrecision` was read from `result.precision`, a key neither endpoint returns, so
 *    the "50-decimal precision" chip was a hard-coded 50 dressed up as a backend value.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import {
  Analytics,
  AutoGraph,
  ScatterPlot as ScatterPlotIcon,
  GridOn,
} from '@mui/icons-material';
import {
  CartesianGrid,
  Legend,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import ProfessionalContainer from '../components/common/ProfessionalContainer';
import { NumericTableInput } from '../components/statistical';
import service from '../services/HighPrecisionStatisticalService';

// A real, coherent table where the rows genuinely correspond to one another: 24 monthly
// observations of one shop. Offered as an EXAMPLE, and labelled as one.
const EXAMPLE_TABLE = `month,ad_spend_k,footfall,revenue_k,satisfaction
1,12.0,940,58.2,7.1
2,14.5,1010,63.8,7.3
3,11.2,905,55.9,7.0
4,16.8,1120,71.4,7.6
5,19.3,1230,79.2,7.8
6,15.1,1075,68.1,7.4
7,21.0,1290,83.7,8.0
8,13.6,975,61.0,7.2
9,17.9,1165,74.6,7.7
10,22.4,1340,88.1,8.1
11,18.2,1180,75.9,7.7
12,10.5,880,53.1,6.9
13,20.1,1265,81.3,7.9
14,23.7,1385,91.2,8.2
15,14.0,995,62.4,7.2
16,16.2,1095,69.8,7.5
17,12.8,955,59.6,7.1
18,24.9,1420,94.0,8.3
19,19.8,1240,79.9,7.8
20,15.6,1085,67.2,7.4
21,21.7,1310,85.4,8.0
22,13.1,960,60.3,7.1
23,17.3,1140,72.8,7.6
24,25.6,1455,96.3,8.4`;

// Every regression type the backend can actually run. "Robust" and "Quantile" used to be
// offered by the UI (or reachable in the view) but were rejected by the serializer's
// ChoiceField, so they silently fell through to a plain linear fit.
const MODEL_TYPES = [
  { value: 'simple_linear', label: 'Linear (ordinary least squares)', multi: false },
  { value: 'multiple_linear', label: 'Multiple linear', multi: true },
  { value: 'polynomial', label: 'Polynomial', multi: false },
  { value: 'ridge', label: 'Ridge (L2)', multi: true },
  { value: 'lasso', label: 'Lasso (L1)', multi: true },
  { value: 'robust', label: 'Robust (Huber — resists outliers)', multi: true },
  { value: 'quantile', label: 'Quantile (median)', multi: true },
];

const num = (value, digits = 4) => {
  const parsed = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(parsed) ? parsed.toFixed(digits) : '—';
};

const pValue = (value, digits = 4) => {
  const parsed = typeof value === 'number' ? value : parseFloat(value);
  if (!Number.isFinite(parsed)) return '—';
  const smallest = 10 ** -digits;
  if (parsed > 0 && parsed < smallest) return `< ${smallest.toFixed(digits)}`;
  return parsed.toFixed(digits);
};

const strength = (r) => {
  const magnitude = Math.abs(r);
  if (magnitude < 0.1) return 'negligible';
  if (magnitude < 0.3) return 'weak';
  if (magnitude < 0.5) return 'moderate';
  if (magnitude < 0.7) return 'strong';
  return 'very strong';
};

// ---------------------------------------------------------------------------- Correlation

const CorrelationTab = ({ table }) => {
  const [xName, setXName] = useState('');
  const [yName, setYName] = useState('');
  const [method, setMethod] = useState('pearson');
  const [confidenceLevel, setConfidenceLevel] = useState(0.95);
  const [result, setResult] = useState(null);
  const [fit, setFit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const columns = table?.columns || [];
  const x = columns.find((c) => c.name === xName);
  const y = columns.find((c) => c.name === yName);

  const run = useCallback(async () => {
    if (!x || !y) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setFit(null);

    try {
      // confidence_level is sent BOTH flat and nested. The backend now accepts the flat form
      // (it used to drop it silently and quietly use 0.95 while the UI said 99%); nesting it
      // as well means this works against an older backend too.
      const correlation = await service.performCorrelation({
        x: x.values,
        y: y.values,
        method,
        confidence_level: confidenceLevel,
        parameters: { confidence_level: confidenceLevel },
      });

      const hp = correlation?.high_precision_result;
      if (!hp) throw new Error('The server returned no correlation result.');

      setResult({
        r: parseFloat(hp.correlation_coefficient),
        p: parseFloat(hp.p_value),
        ciLower: parseFloat(hp.confidence_interval_lower),
        ciUpper: parseFloat(hp.confidence_interval_upper),
        n: parseInt(hp.sample_size, 10),
        df: hp.df,
      });

      // The fitted line comes from a REAL regression on the same data. The old code gated the
      // trend line on `high_precision_result.regression` -- a key the correlation endpoint has
      // never returned -- so the "Scatter Plot with Regression Line" never drew a line, while
      // its legend went on advertising one.
      if (method === 'pearson') {
        const regression = await service.performRegression({
          type: 'simple_linear',
          X: x.values,
          y: y.values,
        });
        const slope = parseFloat(regression?.coefficients?.X1);
        const intercept = parseFloat(regression?.intercept);
        if (Number.isFinite(slope) && Number.isFinite(intercept)) {
          setFit({ slope, intercept });
        }
      }
    } catch (err) {
      setError(
        err.response?.data?.error || err.message || 'Could not compute the correlation.'
      );
    } finally {
      setLoading(false);
    }
  }, [x, y, method, confidenceLevel]);

  const chartData = useMemo(() => {
    if (!x || !y) return [];
    return x.values.map((value, index) => ({
      x: value,
      y: y.values[index],
      ...(fit ? { prediction: fit.slope * value + fit.intercept } : {}),
    }));
  }, [x, y, fit]);

  if (!table) {
    return (
      <Alert severity="info">
        Paste or upload a table above, then choose two columns to correlate.
      </Alert>
    );
  }

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Correlate two of your columns
          </Typography>

          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>X variable</InputLabel>
            <Select value={xName} label="X variable" onChange={(e) => setXName(e.target.value)}>
              {columns.map((column) => (
                <MenuItem key={column.name} value={column.name}>
                  {column.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Y variable</InputLabel>
            <Select value={yName} label="Y variable" onChange={(e) => setYName(e.target.value)}>
              {columns.map((column) => (
                <MenuItem key={column.name} value={column.name}>
                  {column.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Method</InputLabel>
            <Select value={method} label="Method" onChange={(e) => setMethod(e.target.value)}>
              <MenuItem value="pearson">Pearson (linear)</MenuItem>
              <MenuItem value="spearman">Spearman (monotone, rank-based)</MenuItem>
              <MenuItem value="kendall">Kendall’s tau</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Confidence level</InputLabel>
            <Select
              value={confidenceLevel}
              label="Confidence level"
              onChange={(e) => setConfidenceLevel(e.target.value)}
            >
              <MenuItem value={0.9}>90%</MenuItem>
              <MenuItem value={0.95}>95%</MenuItem>
              <MenuItem value={0.99}>99%</MenuItem>
            </Select>
          </FormControl>

          <Button
            fullWidth
            variant="contained"
            startIcon={<Analytics />}
            onClick={run}
            disabled={loading || !x || !y || xName === yName}
            sx={{ mt: 2 }}
          >
            {loading ? 'Calculating…' : 'Calculate correlation'}
          </Button>

          {xName && xName === yName && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              X and Y are the same column — a variable always correlates perfectly with itself.
            </Alert>
          )}
        </Paper>

        {result && (
          <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Result
            </Typography>
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell>
                    <strong>{method === 'kendall' ? 'τ' : 'r'}</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>{num(result.r, 6)}</strong>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>p-value</TableCell>
                  <TableCell align="right">{pValue(result.p)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{Math.round(confidenceLevel * 100)}% CI</TableCell>
                  <TableCell align="right">
                    [{num(result.ciLower, 4)}, {num(result.ciUpper, 4)}]
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>n</TableCell>
                  <TableCell align="right">{result.n}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <Alert severity={result.p < 0.05 ? 'success' : 'info'} sx={{ mt: 2 }}>
              A <strong>{strength(result.r)}</strong> {result.r >= 0 ? 'positive' : 'negative'}{' '}
              association{result.p < 0.05 ? ', significant' : ', not significant'} at α = 0.05.
            </Alert>
          </Paper>
        )}
      </Grid>

      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 2, height: '100%' }}>
          <Typography variant="subtitle1" gutterBottom>
            {fit ? 'Scatter plot with fitted least-squares line' : 'Scatter plot'}
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
              <CircularProgress />
            </Box>
          ) : chartData.length ? (
            <ResponsiveContainer width="100%" height={380}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="x"
                  type="number"
                  name={xName}
                  label={{ value: xName, position: 'insideBottom', offset: -10 }}
                />
                <YAxis
                  type="number"
                  name={yName}
                  label={{ value: yName, angle: -90, position: 'insideLeft' }}
                />
                <Tooltip />
                <Legend verticalAlign="top" />
                <Scatter name="Observations" dataKey="y" fill="#1976d2" />
                {/* Only rendered when a real fit exists -- never advertised otherwise. */}
                {fit && (
                  <Line
                    type="linear"
                    dataKey="prediction"
                    name="Least-squares fit"
                    stroke="#d32f2f"
                    dot={false}
                    strokeWidth={2}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <Alert severity="info">Choose an X and a Y column.</Alert>
          )}
        </Paper>
      </Grid>
    </Grid>
  );
};

// ---------------------------------------------------------------------------- Regression

const RegressionTab = ({ table }) => {
  const [modelType, setModelType] = useState('simple_linear');
  const [responseName, setResponseName] = useState('');
  const [predictorNames, setPredictorNames] = useState([]);
  const [degree, setDegree] = useState(2);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // useMemo, not a bare `||`: a fresh [] on every render would re-create the useCallback
  // below every time and defeat its memoization.
  const columns = useMemo(() => table?.columns || [], [table]);
  const spec = MODEL_TYPES.find((m) => m.value === modelType);
  const allowsMultiple = Boolean(spec?.multi);
  const chosen = allowsMultiple ? predictorNames : predictorNames.slice(0, 1);

  const run = useCallback(async () => {
    const response = columns.find((c) => c.name === responseName);
    const predictors = chosen
      .map((name) => columns.find((c) => c.name === name))
      .filter(Boolean);

    if (!response || !predictors.length) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // A single predictor goes as a flat list; several go as rows. The model type is
      // ACTUALLY SENT -- which it never was before.
      const X =
        predictors.length === 1
          ? predictors[0].values
          : response.values.map((_, row) => predictors.map((p) => p.values[row]));

      const payload = {
        type: modelType,
        X,
        y: response.values,
        ...(modelType === 'polynomial' ? { parameters: { degree: Number(degree) } } : {}),
      };

      const regression = await service.performRegression(payload);
      const coefficients = regression?.coefficients || {};
      const metrics = regression?.metrics || {};

      setResult({
        type: modelType,
        intercept: parseFloat(regression?.intercept),
        coefficients: Object.entries(coefficients).map(([key, value], index) => ({
          key,
          // Name the coefficient after the user's column where we can.
          label: predictors[index]?.name || key,
          value: parseFloat(value),
          p: parseFloat(regression?.p_values?.[key]),
          se: parseFloat(regression?.standard_errors?.[key]),
        })),
        rSquared: parseFloat(metrics.r_squared),
        adjRSquared: parseFloat(metrics.adjusted_r_squared),
        rmse: parseFloat(metrics.rmse),
        mae: parseFloat(metrics.mae),
        aic: parseFloat(metrics.aic),
        bic: parseFloat(metrics.bic),
        fStatistic: parseFloat(regression?.statistics?.f_statistic),
        fPValue: parseFloat(regression?.statistics?.f_p_value),
        // The backend flags degenerate fits (an exactly-fitting model, no residual degrees of
        // freedom, a constant response). Those warnings explain why a cell reads "—" instead
        // of a number, so they have to reach the screen.
        warnings: Array.isArray(regression?.warnings) ? regression.warnings : [],
      });
    } catch (err) {
      setError(
        err.response?.data?.error || err.message || 'Could not fit the model.'
      );
    } finally {
      setLoading(false);
    }
  }, [columns, responseName, chosen, modelType, degree]);

  if (!table) {
    return (
      <Alert severity="info">
        Paste or upload a table above, then choose a response and one or more predictors.
      </Alert>
    );
  }

  const robustFit = result && ['robust', 'quantile'].includes(result.type);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Fit a model to your data
          </Typography>

          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Model type</InputLabel>
            <Select
              value={modelType}
              label="Model type"
              onChange={(e) => {
                setModelType(e.target.value);
                setResult(null);
              }}
            >
              {MODEL_TYPES.map((m) => (
                <MenuItem key={m.value} value={m.value}>
                  {m.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Response (y)</InputLabel>
            <Select
              value={responseName}
              label="Response (y)"
              onChange={(e) => setResponseName(e.target.value)}
            >
              {columns.map((column) => (
                <MenuItem key={column.name} value={column.name}>
                  {column.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>{allowsMultiple ? 'Predictors (X)' : 'Predictor (X)'}</InputLabel>
            <Select
              multiple={allowsMultiple}
              value={allowsMultiple ? predictorNames : predictorNames[0] || ''}
              label={allowsMultiple ? 'Predictors (X)' : 'Predictor (X)'}
              onChange={(e) =>
                setPredictorNames(
                  allowsMultiple
                    ? e.target.value
                    : [e.target.value]
                )
              }
              renderValue={(selected) =>
                Array.isArray(selected) ? selected.join(', ') : selected
              }
            >
              {columns
                .filter((column) => column.name !== responseName)
                .map((column) => (
                  <MenuItem key={column.name} value={column.name}>
                    {column.name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          {modelType === 'polynomial' && (
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Degree</InputLabel>
              <Select value={degree} label="Degree" onChange={(e) => setDegree(e.target.value)}>
                <MenuItem value={2}>2 (quadratic)</MenuItem>
                <MenuItem value={3}>3 (cubic)</MenuItem>
                <MenuItem value={4}>4</MenuItem>
              </Select>
            </FormControl>
          )}

          <Button
            fullWidth
            variant="contained"
            startIcon={<AutoGraph />}
            onClick={run}
            disabled={loading || !responseName || !chosen.length}
            sx={{ mt: 2 }}
          >
            {loading ? 'Fitting…' : 'Fit model'}
          </Button>
        </Paper>
      </Grid>

      <Grid item xs={12} md={8}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading && (
          <Paper sx={{ p: 6, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress />
          </Paper>
        )}

        {result && !loading && (
          <>
            {result.warnings.map((warning) => (
              <Alert severity="warning" sx={{ mb: 2 }} key={warning}>
                {warning}
              </Alert>
            ))}

            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                {MODEL_TYPES.find((m) => m.value === result.type)?.label}
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Term</TableCell>
                      <TableCell align="right">Coefficient</TableCell>
                      <TableCell align="right">Std. error</TableCell>
                      <TableCell align="right">p</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Intercept</TableCell>
                      <TableCell align="right">{num(result.intercept, 5)}</TableCell>
                      <TableCell align="right">—</TableCell>
                      <TableCell align="right">—</TableCell>
                    </TableRow>
                    {result.coefficients.map((coefficient) => (
                      <TableRow key={coefficient.key}>
                        <TableCell>{coefficient.label}</TableCell>
                        <TableCell align="right">{num(coefficient.value, 5)}</TableCell>
                        <TableCell align="right">{num(coefficient.se, 5)}</TableCell>
                        <TableCell align="right">{pValue(coefficient.p)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Model fit
              </Typography>
              <Grid container spacing={2}>
                {[
                  ['R²', num(result.rSquared, 4)],
                  ['Adjusted R²', num(result.adjRSquared, 4)],
                  ['RMSE', num(result.rmse, 4)],
                  ['MAE', num(result.mae, 4)],
                  ['AIC', num(result.aic, 2)],
                  ['BIC', num(result.bic, 2)],
                ].map(([label, value]) => (
                  <Grid item xs={6} sm={4} key={label}>
                    <Typography variant="caption" color="text.secondary">
                      {label}
                    </Typography>
                    <Typography variant="h6">{value}</Typography>
                  </Grid>
                ))}
              </Grid>

              {robustFit && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  A robust fit deliberately does not chase outliers, so its R² against the raw
                  data is often <em>lower</em> than an ordinary least-squares fit’s — that is the
                  point, not a defect. No F-statistic is reported: the F-test assumes the normal
                  likelihood that a robust fit declines to assume.
                </Alert>
              )}
            </Paper>
          </>
        )}

        {!result && !loading && !error && (
          <Alert severity="info">Choose a response and at least one predictor, then fit.</Alert>
        )}
      </Grid>
    </Grid>
  );
};

// ------------------------------------------------------------------------ Correlation matrix

const MatrixTab = ({ table }) => {
  const [method, setMethod] = useState('pearson');
  const [matrix, setMatrix] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const columns = useMemo(() => table?.columns || [], [table]);

  const run = useCallback(async () => {
    if (columns.length < 2) return;
    setLoading(true);
    setError(null);
    setMatrix(null);

    try {
      const size = columns.length;
      const grid = Array.from({ length: size }, () => Array(size).fill(null));

      for (let i = 0; i < size; i += 1) {
        grid[i][i] = { r: 1, p: 0 };
        for (let j = i + 1; j < size; j += 1) {
          // Every pair comes from the SAME table, so the rows correspond. The old matrix
          // correlated series of different lengths by truncating them to the shorter one,
          // which produces a number with no meaning, and then starred it for significance
          // using a hard-coded n = 10.
          // eslint-disable-next-line no-await-in-loop
          const response = await service.performCorrelation({
            x: columns[i].values,
            y: columns[j].values,
            method,
          });
          const hp = response?.high_precision_result;
          const cell = hp
            ? { r: parseFloat(hp.correlation_coefficient), p: parseFloat(hp.p_value) }
            : null;
          grid[i][j] = cell;
          grid[j][i] = cell;
        }
      }

      setMatrix(grid);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Could not compute the matrix.');
    } finally {
      setLoading(false);
    }
  }, [columns, method]);

  if (!table) {
    return <Alert severity="info">Paste or upload a table above to build a correlation matrix.</Alert>;
  }

  const shade = (r) => {
    if (r === null || !Number.isFinite(r)) return 'transparent';
    const intensity = Math.min(Math.abs(r), 1) * 0.55;
    return r >= 0 ? `rgba(25, 118, 210, ${intensity})` : `rgba(211, 47, 47, ${intensity})`;
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Method</InputLabel>
              <Select value={method} label="Method" onChange={(e) => setMethod(e.target.value)}>
                <MenuItem value="pearson">Pearson</MenuItem>
                <MenuItem value="spearman">Spearman</MenuItem>
                <MenuItem value="kendall">Kendall</MenuItem>
              </Select>
            </FormControl>
            <Button variant="contained" startIcon={<GridOn />} onClick={run} disabled={loading}>
              {loading ? 'Computing…' : 'Compute matrix'}
            </Button>
            <Chip size="small" variant="outlined" label={`${columns.length} variables, n = ${table.n}`} />
          </Stack>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {matrix && !loading && (
            <>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell />
                      {columns.map((column) => (
                        <TableCell key={column.name} align="center">
                          <strong>{column.name}</strong>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {columns.map((rowColumn, i) => (
                      <TableRow key={rowColumn.name}>
                        <TableCell>
                          <strong>{rowColumn.name}</strong>
                        </TableCell>
                        {columns.map((_, j) => {
                          const cell = matrix[i][j];
                          return (
                            <TableCell
                              key={j}
                              align="center"
                              sx={{ backgroundColor: shade(cell?.r ?? null) }}
                            >
                              {cell ? (
                                <>
                                  {num(cell.r, 3)}
                                  {i !== j && cell.p < 0.05 && (
                                    <Typography component="span" variant="caption">
                                      {cell.p < 0.001 ? ' ***' : cell.p < 0.01 ? ' **' : ' *'}
                                    </Typography>
                                  )}
                                </>
                              ) : (
                                '—'
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                * p &lt; 0.05, ** p &lt; 0.01, *** p &lt; 0.001. Every coefficient and p-value here is
                computed by the backend from your {table.n} rows — the significance marks use the
                real n, not an assumed one.
              </Typography>
            </>
          )}

          {!matrix && !loading && !error && (
            <Alert severity="info">
              Computes every pairwise correlation across the numeric columns of your table.
            </Alert>
          )}
        </Paper>
      </Grid>
    </Grid>
  );
};

// ---------------------------------------------------------------------------------- Module

const CorrelationRegressionModuleReal = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [table, setTable] = useState(null);

  return (
    <ProfessionalContainer
      title={
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ScatterPlotIcon sx={{ mr: 2, fontSize: 40 }} />
          Correlation &amp; Regression
        </Typography>
      }
      gradient="info"
      enableGlassMorphism
    >
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" color="text.secondary" paragraph>
          Correlate and model your own data. Every statistic on this page is computed by the
          backend from the table you supply.
        </Typography>
      </Box>

      <NumericTableInput
        onData={setTable}
        title="Your data"
        helperText="One column per variable, one row per observation. Paste a CSV or upload a file — the rows must line up across columns."
        example={EXAMPLE_TABLE}
        exampleLabel="Load an example table"
      />

      <Paper sx={{ borderRadius: 2, mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(event, value) => setActiveTab(value)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<ScatterPlotIcon />} label="Correlation" />
          <Tab icon={<AutoGraph />} label="Regression" />
          <Tab icon={<GridOn />} label="Correlation matrix" />
        </Tabs>
      </Paper>

      {activeTab === 0 && <CorrelationTab table={table} />}
      {activeTab === 1 && <RegressionTab table={table} />}
      {activeTab === 2 && <MatrixTab table={table} />}
    </ProfessionalContainer>
  );
};

export default CorrelationRegressionModuleReal;
