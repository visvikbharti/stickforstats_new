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
  Science as ExampleIcon,
  TableChart as TableIcon,
} from '@mui/icons-material';

/**
 * A multi-column numeric table: paste it or upload a CSV.
 *
 * This exists because several modules that call themselves analysis tools had NO way to
 * supply your own data at all -- they analysed a hard-coded example array and captioned the
 * result "Real Business Data". The numbers were genuinely computed by the backend; they just
 * were not YOUR numbers, and there was no control anywhere on the screen that would make them
 * yours.
 *
 * Columns keep their row correspondence, which matters: correlating two columns of different
 * lengths by truncating them to the shorter one (which is what the old correlation matrix
 * did) produces a number with no meaning.
 */

const isNumeric = (token) => token !== '' && token !== undefined && Number.isFinite(Number(token));

export const parseNumericTable = (text) => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error('Paste at least a header row and two data rows.');
  }

  const split = (line) => line.split(/[,\t;]/).map((cell) => cell.trim());

  const first = split(lines[0]);
  const hasHeader = !first.every(isNumeric);
  const names = hasHeader ? first : first.map((_, i) => `Column ${i + 1}`);
  const dataLines = hasHeader ? lines.slice(1) : lines;

  if (!dataLines.length) {
    throw new Error('No data rows found beneath the header.');
  }

  const width = names.length;
  const rows = dataLines.map((line, index) => {
    const cells = split(line);
    if (cells.length !== width) {
      throw new Error(
        `Row ${index + 1} has ${cells.length} values but the header has ${width} columns.`
      );
    }
    return cells;
  });

  // Keep only the columns that are numeric all the way down -- a label column is fine, it
  // simply is not something you can correlate.
  const columns = names
    .map((name, index) => ({
      name,
      values: rows.map((row) => row[index]),
    }))
    .filter((column) => column.values.every(isNumeric))
    .map((column) => ({ name: column.name, values: column.values.map(Number) }));

  if (columns.length < 2) {
    throw new Error('At least two fully numeric columns are needed.');
  }
  if (columns[0].values.length < 3) {
    throw new Error('At least 3 rows of data are needed.');
  }

  return { columns, n: columns[0].values.length, droppedColumns: names.length - columns.length };
};

const NumericTableInput = ({
  onData,
  title = 'Your data',
  helperText = 'One column per variable, one row per observation. Paste it below or upload a CSV.',
  example = null,
  exampleLabel = 'Load an example',
  disabled = false,
}) => {
  const [text, setText] = useState('');
  const [error, setError] = useState(null);
  const [parsed, setParsed] = useState(null);
  const fileRef = useRef(null);

  const handleChange = (value) => {
    setText(value);
    if (!value.trim()) {
      setParsed(null);
      setError(null);
      onData(null);
      return;
    }
    try {
      const result = parseNumericTable(value);
      setParsed(result);
      setError(null);
      onData(result);
    } catch (err) {
      setParsed(null);
      setError(err.message);
      onData(null);
    }
  };

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => handleChange(String(reader.result || ''));
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TableIcon color="primary" />
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {helperText}
      </Typography>

      <TextField
        multiline
        minRows={6}
        fullWidth
        value={text}
        onChange={(event) => handleChange(event.target.value)}
        placeholder={'x,y\n1,2.1\n2,3.9\n3,6.2'}
        disabled={disabled}
        inputProps={{ style: { fontFamily: 'monospace' } }}
      />

      <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
        <Button
          variant="outlined"
          startIcon={<UploadIcon />}
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
        >
          Upload CSV
        </Button>
        {example && (
          <Button
            variant="text"
            startIcon={<ExampleIcon />}
            onClick={() => handleChange(example)}
            disabled={disabled}
          >
            {exampleLabel}
          </Button>
        )}
        <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" hidden onChange={handleFile} />
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {parsed && (
        <Box sx={{ mt: 2 }}>
          <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}>
            <Chip size="small" color="primary" label={`${parsed.n} rows`} />
            <Chip size="small" color="primary" label={`${parsed.columns.length} numeric columns`} />
            {parsed.droppedColumns > 0 && (
              <Chip
                size="small"
                variant="outlined"
                label={`${parsed.droppedColumns} non-numeric column(s) ignored`}
              />
            )}
          </Stack>

          <TableContainer sx={{ maxHeight: 190 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {parsed.columns.map((column) => (
                    <TableCell key={column.name}>{column.name}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.from({ length: Math.min(parsed.n, 6) }, (_, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {parsed.columns.map((column) => (
                      <TableCell key={column.name}>{column.values[rowIndex]}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {parsed.n > 6 && (
            <Typography variant="caption" color="text.secondary">
              …and {parsed.n - 6} more rows
            </Typography>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default NumericTableInput;
