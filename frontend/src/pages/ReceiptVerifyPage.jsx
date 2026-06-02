import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Chip,
  Divider,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Link,
} from '@mui/material';
import {
  VerifiedUser,
  GppMaybe,
  CheckCircleOutline,
  ErrorOutline,
} from '@mui/icons-material';
import { verifyReceipt } from '../services/ManuscriptService';

// Public, no-auth page: paste a receipt ID (and optional download token) to
// confirm a StickForStats reproducibility receipt is genuine and unmodified.
// The signature is RS256; the public key is at /api/v1/receipt/jwks/ and is
// also bundled in a downloaded receipt for fully-offline verification.

function Row({ label, value }) {
  return (
    <TableRow>
      <TableCell sx={{ fontWeight: 600, width: 200, verticalAlign: 'top', border: 0, py: 0.5 }}>
        {label}
      </TableCell>
      <TableCell sx={{ border: 0, py: 0.5, fontFamily: 'monospace', wordBreak: 'break-all' }}>
        {value}
      </TableCell>
    </TableRow>
  );
}

function CheckLine({ ok, label }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {ok ? (
        <CheckCircleOutline fontSize="small" color="success" />
      ) : (
        <ErrorOutline fontSize="small" color="error" />
      )}
      <Typography variant="body2">{label}</Typography>
    </Box>
  );
}

const ReceiptVerifyPage = () => {
  const [searchParams] = useSearchParams();
  const [receiptId, setReceiptId] = useState('');
  const [token, setToken] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const doVerify = useCallback(async (id, tok) => {
    const trimmed = (id || '').trim();
    if (!trimmed) {
      setError('Enter a receipt ID.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const verdict = await verifyReceipt(trimmed, (tok || '').trim() || undefined);
      setResult(verdict);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Verification request failed.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-verify when the page is opened with ?id=… (the shareable link).
  useEffect(() => {
    const id = searchParams.get('id');
    const tok = searchParams.get('token');
    if (id) {
      setReceiptId(id);
      if (tok) setToken(tok);
      doVerify(id, tok);
    }
  }, [searchParams, doVerify]);

  const valid = result && result.valid;

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
          Verify a Reproducibility Receipt
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Confirm that a StickForStats receipt is genuine and has not been altered.
          Verification is public and requires no account — the signature is checked
          against our published key.
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <TextField
          label="Receipt ID"
          fullWidth
          size="small"
          value={receiptId}
          onChange={(e) => setReceiptId(e.target.value)}
          placeholder="e.g. a3c64d03-a8b6-4377-9e4c-cdd618f1ecaa"
          sx={{ mb: 2 }}
        />
        <TextField
          label="Download token (optional)"
          fullWidth
          size="small"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          helperText="Only needed if you also want to confirm the share token; the signature check does not require it."
          sx={{ mb: 2 }}
        />
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <VerifiedUser />}
          onClick={() => doVerify(receiptId, token)}
          disabled={loading}
        >
          {loading ? 'Verifying…' : 'Verify receipt'}
        </Button>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {result && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            {valid ? (
              <VerifiedUser sx={{ fontSize: 40 }} color="success" />
            ) : (
              <GppMaybe sx={{ fontSize: 40 }} color="error" />
            )}
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {valid ? 'Verified' : 'Not verified'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {valid
                  ? 'This receipt is authentic and unmodified.'
                  : result.reason === 'not_found'
                  ? 'No receipt with this ID was found.'
                  : 'This receipt failed verification — see the checks below.'}
              </Typography>
            </Box>
          </Box>

          {result.reason !== 'not_found' && (
            <>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 2 }}>
                <CheckLine ok={result.signature_ok} label="Signature valid (RS256)" />
                <CheckLine ok={result.payload_hash_ok} label="Contents unmodified" />
                <CheckLine ok={!result.is_revoked} label="Not revoked" />
                {result.token_ok !== null && result.token_ok !== undefined && (
                  <CheckLine ok={result.token_ok} label="Share token matches" />
                )}
              </Box>

              <Divider sx={{ mb: 2 }} />

              <Table size="small">
                <TableBody>
                  <Row label="Receipt ID" value={result.receipt_id} />
                  <Row label="Type" value={result.receipt_type} />
                  <Row label="Issued (UTC)" value={result.issued_at} />
                  <Row label="Subject SHA-256" value={result.subject_hash} />
                  <Row label="Signature alg" value={`${result.sig_alg} (key ${result.key_id})`} />
                  {result.verdict && (
                    <Row
                      label="Attested verdict"
                      value={
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, fontFamily: 'inherit' }}>
                          <Chip size="small" label={`SQS ${result.verdict.sqs_score ?? '—'} (${result.verdict.sqs_grade || '—'})`} />
                          <Chip size="small" variant="outlined" label={`${result.verdict.claims_found ?? 0} claims`} />
                          <Chip size="small" variant="outlined" label={`${result.verdict.gross_errors ?? 0} gross errors`} />
                        </Box>
                      }
                    />
                  )}
                </TableBody>
              </Table>

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                Want to verify fully offline? Download the receipt and follow the
                bundled instructions, or fetch the public key at{' '}
                <Link href="/api/v1/receipt/jwks/" target="_blank" rel="noopener">
                  /api/v1/receipt/jwks/
                </Link>
                .
              </Typography>
            </>
          )}
        </Paper>
      )}
    </Container>
  );
};

export default ReceiptVerifyPage;
