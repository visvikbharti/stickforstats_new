import React, { useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  PlayArrow as RunIcon,
  Science as ExampleIcon,
} from '@mui/icons-material';

/**
 * Long-format data entry for a two-factor (factorial) design.
 *
 * A two-way ANOVA needs one row per observation with TWO grouping labels, which the
 * k-column DataInput cannot express -- so the ANOVA module simply never offered the design,
 * even though its own Theory tab teaches it and the backend has implemented it all along.
 *
 * Accepts three columns: value, factorA, factorB. Column order is detected from the header
 * when there is one, otherwise assumed to be value,factorA,factorB.
 */

const EXAMPLE = `yield,fertiliser,irrigation
21.4,A,low
23.1,A,low
20.8,A,low
27.6,A,high
28.9,A,high
26.4,A,high
18.2,B,low
19.5,B,low
17.9,B,low
30.1,B,high
31.8,B,high
29.6,B,high`;

const isNumeric = (token) => token !== '' && Number.isFinite(Number(token));

export const parseFactorialText = (text) => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error('Enter at least a few rows: a value and its two factor levels.');
  }

  const split = (line) => line.split(/[,\t;]/).map((cell) => cell.trim());

  let header = null;
  let rows = lines;
  const firstCells = split(lines[0]);
  // A header is a first row whose value column is not a number.
  if (firstCells.length >= 3 && !firstCells.some(isNumeric)) {
    header = firstCells;
    rows = lines.slice(1);
  }

  // Find the value column: the one that is numeric throughout.
  const widths = new Set(rows.map((line) => split(line).length));
  if (widths.size !== 1) {
    throw new Error('Every row needs the same number of columns.');
  }
  const width = [...widths][0];
  if (width < 3) {
    throw new Error('Three columns are required: a numeric value and two factor levels.');
  }

  const columns = Array.from({ length: width }, (_, index) =>
    rows.map((line) => split(line)[index])
  );
  const numericColumns = columns
    .map((column, index) => ({ index, numeric: column.every(isNumeric) }))
    .filter((column) => column.numeric)
    .map((column) => column.index);

  if (numericColumns.length === 0) {
    throw new Error('No numeric column found — one column must hold the measured value.');
  }

  const valueIndex = numericColumns[0];
  const factorIndices = columns
    .map((_, index) => index)
    .filter((index) => index !== valueIndex)
    .slice(0, 2);

  if (factorIndices.length < 2) {
    throw new Error('Two factor columns are required alongside the value column.');
  }

  const parsed = rows.map((line) => {
    const cells = split(line);
    return {
      value: Number(cells[valueIndex]),
      factor1: cells[factorIndices[0]],
      factor2: cells[factorIndices[1]],
    };
  });

  if (parsed.some((row) => !Number.isFinite(row.value))) {
    throw new Error('Every value must be a number.');
  }
  if (parsed.some((row) => !row.factor1 || !row.factor2)) {
    throw new Error('Every row needs a label for both factors.');
  }

  return {
    rows: parsed,
    names: header
      ? {
          value: header[valueIndex],
          factor1: header[factorIndices[0]],
          factor2: header[factorIndices[1]],
        }
      : { value: 'value', factor1: 'Factor A', factor2: 'Factor B' },
  };
};

const FactorialDataInput = ({ onSubmit, disabled = false }) => {
  const [text, setText] = useState('');
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const fileRef = useRef(null);

  const handleChange = (value) => {
    setText(value);
    setError(null);
    if (!value.trim()) {
      setPreview(null);
      return;
    }
    try {
      setPreview(parseFactorialText(value));
    } catch (err) {
      setPreview(null);
    }
  };

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => handleChange(String(reader.result || ''));
    reader.readAsText(file);
    // Allow re-selecting the same file.
    event.target.value = '';
  };

  const handleRun = () => {
    try {
      const parsed = parseFactorialText(text);
      setError(null);
      onSubmit(parsed);
    } catch (err) {
      setError(err.message);
    }
  };

  const cellCounts = preview
    ? (() => {
        const levels1 = [...new Set(preview.rows.map((row) => row.factor1))];
        const levels2 = [...new Set(preview.rows.map((row) => row.factor2))];
        return { levels1, levels2 };
      })()
    : null;

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Your data — one row per observation
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Three columns: the measured value, and the level of each of the two factors. Paste it
        below or upload a CSV. A header row is optional.
      </Typography>

      <TextField
        multiline
        minRows={8}
        fullWidth
        value={text}
        onChange={(event) => handleChange(event.target.value)}
        placeholder={'yield,fertiliser,irrigation\n21.4,A,low\n27.6,A,high\n18.2,B,low\n30.1,B,high'}
        disabled={disabled}
        sx={{ fontFamily: 'monospace' }}
        inputProps={{ style: { fontFamily: 'monospace' } }}
      />

      <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
        <Button
          variant="contained"
          startIcon={<RunIcon />}
          onClick={handleRun}
          disabled={disabled || !text.trim()}
        >
          Run two-way ANOVA
        </Button>
        <Button
          variant="outlined"
          startIcon={<UploadIcon />}
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
        >
          Upload CSV
        </Button>
        <Button
          variant="text"
          startIcon={<ExampleIcon />}
          onClick={() => handleChange(EXAMPLE)}
          disabled={disabled}
        >
          Load an example
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.tsv,.txt"
          hidden
          onChange={handleFile}
        />
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {preview && cellCounts && (
        <Box sx={{ mt: 2 }}>
          <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}>
            <Chip size="small" label={`${preview.rows.length} observations`} />
            <Chip
              size="small"
              color="primary"
              label={`${preview.names.factor1}: ${cellCounts.levels1.length} levels`}
            />
            <Chip
              size="small"
              color="secondary"
              label={`${preview.names.factor2}: ${cellCounts.levels2.length} levels`}
            />
            <Chip
              size="small"
              variant="outlined"
              label={`${cellCounts.levels1.length * cellCounts.levels2.length} cells`}
            />
          </Stack>

          <TableContainer sx={{ maxHeight: 200 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>{preview.names.value}</TableCell>
                  <TableCell>{preview.names.factor1}</TableCell>
                  <TableCell>{preview.names.factor2}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {preview.rows.slice(0, 8).map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row.value}</TableCell>
                    <TableCell>{row.factor1}</TableCell>
                    <TableCell>{row.factor2}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {preview.rows.length > 8 && (
            <Typography variant="caption" color="text.secondary">
              …and {preview.rows.length - 8} more rows
            </Typography>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default FactorialDataInput;
