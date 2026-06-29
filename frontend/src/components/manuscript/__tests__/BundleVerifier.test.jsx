/**
 * BundleVerifier Tests
 * ====================
 * Pins the multi-file upload + submit behaviour:
 *   - classifyFile mirrors the backend routing (manuscript|data|image|unknown),
 *   - dropped/selected files appear in the list with their classification,
 *   - the Verify button is gated on having at least one file,
 *   - an oversized file is rejected client-side,
 *   - a successful submit calls verifyBundle and renders the report,
 *   - a backend error is surfaced to the user.
 *
 * VerificationReport is mocked so these tests isolate the upload container.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@mui/material/styles';

import BundleVerifier, { classifyFile, formatFileSize } from '../BundleVerifier';
import { getTheme } from '../../../theme';

jest.mock('../../../services/ManuscriptService', () => ({
  verifyBundle: jest.fn(),
}));
const { verifyBundle } = require('../../../services/ManuscriptService');

jest.mock('../VerificationReport', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-report">report</div>,
  IngestionReport: ({ ingestion }) => (
    <div data-testid="mock-ingestion">{ingestion ? `${ingestion.n_files} files` : ''}</div>
  ),
}));

const wrap = (ui) => render(<ThemeProvider theme={getTheme('light')}>{ui}</ThemeProvider>);

const makeFile = (name, { size, content = 'x', type = '' } = {}) => {
  const f = new File([content], name, { type });
  if (size != null) Object.defineProperty(f, 'size', { value: size });
  return f;
};

beforeEach(() => {
  verifyBundle.mockReset();
});

describe('classifyFile', () => {
  it('routes filenames the way the backend does', () => {
    expect(classifyFile('paper.pdf')).toBe('manuscript');
    expect(classifyFile('paper.docx')).toBe('manuscript');
    expect(classifyFile('article.xml')).toBe('manuscript');
    expect(classifyFile('notes.txt')).toBe('manuscript');
    expect(classifyFile('data.csv')).toBe('data');
    expect(classifyFile('data.xlsx')).toBe('data');
    expect(classifyFile('survey.sav')).toBe('data');
    expect(classifyFile('fig1.png')).toBe('image');
    expect(classifyFile('fig2.tiff')).toBe('image');
    expect(classifyFile('archive.zip')).toBe('unknown');
    expect(classifyFile('noext')).toBe('unknown');
  });
});

describe('formatFileSize', () => {
  it('formats bytes into human units', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(25 * 1024 * 1024)).toBe('25.0 MB');
  });
});

describe('BundleVerifier — initial render', () => {
  it('renders the drop-zone prompt and a disabled verify button', () => {
    wrap(<BundleVerifier />);
    expect(screen.getByText(/drag and drop the whole submission here/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /verify bundle/i })).toBeDisabled();
  });
});

describe('BundleVerifier — file intake', () => {
  it('adds selected files to the list with their classification', () => {
    wrap(<BundleVerifier />);
    const input = screen.getByTestId('bundle-file-input');
    fireEvent.change(input, {
      target: { files: [makeFile('paper.pdf'), makeFile('data.csv')] },
    });

    const list = screen.getByTestId('bundle-file-list');
    expect(list).toHaveTextContent('paper.pdf');
    expect(list).toHaveTextContent('manuscript');
    expect(list).toHaveTextContent('data.csv');
    expect(list).toHaveTextContent('data');
    expect(screen.getByRole('button', { name: /verify bundle/i })).toBeEnabled();
  });

  it('rejects an oversized file with a visible error', () => {
    wrap(<BundleVerifier />);
    const input = screen.getByTestId('bundle-file-input');
    fireEvent.change(input, {
      target: { files: [makeFile('huge.csv', { size: 26 * 1024 * 1024 })] },
    });
    expect(screen.getByRole('alert')).toHaveTextContent(/exceeds 25 MB/i);
    expect(screen.queryByTestId('bundle-file-list')).toBeNull();
  });

  it('de-duplicates identical files', () => {
    wrap(<BundleVerifier />);
    const input = screen.getByTestId('bundle-file-input');
    fireEvent.change(input, { target: { files: [makeFile('paper.pdf', { size: 100 })] } });
    fireEvent.change(input, { target: { files: [makeFile('paper.pdf', { size: 100 })] } });
    const items = within(screen.getByTestId('bundle-file-list')).getAllByRole('listitem');
    expect(items).toHaveLength(1);
  });
});

describe('BundleVerifier — submit', () => {
  it('calls verifyBundle and renders the report on success', async () => {
    verifyBundle.mockResolvedValue({ n_claims: 0, claims: [], certify_note: 'note' });
    wrap(<BundleVerifier />);

    const input = screen.getByTestId('bundle-file-input');
    fireEvent.change(input, { target: { files: [makeFile('paper.pdf')] } });
    fireEvent.click(screen.getByRole('button', { name: /verify bundle/i }));

    await waitFor(() => expect(verifyBundle).toHaveBeenCalledTimes(1));
    const [filesArg, optsArg] = verifyBundle.mock.calls[0];
    expect(filesArg).toHaveLength(1);
    expect(optsArg).toHaveProperty('onUploadProgress');
    expect(await screen.findByTestId('mock-report')).toBeInTheDocument();
  });

  it('surfaces a backend error message', async () => {
    verifyBundle.mockRejectedValue({
      response: { data: { error: 'No manuscript text could be extracted from the bundle.' } },
    });
    wrap(<BundleVerifier />);
    const input = screen.getByTestId('bundle-file-input');
    fireEvent.change(input, { target: { files: [makeFile('data.csv')] } });
    fireEvent.click(screen.getByRole('button', { name: /verify bundle/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/No manuscript text could be extracted/i);
    expect(screen.queryByTestId('mock-report')).toBeNull();
  });

  it('surfaces the per-file ingestion report when a 400 includes one', async () => {
    verifyBundle.mockRejectedValue({
      response: {
        data: {
          error: 'No manuscript text could be extracted from the bundle.',
          ingestion: { n_files: 2, files: [] },
        },
      },
    });
    wrap(<BundleVerifier />);
    fireEvent.change(screen.getByTestId('bundle-file-input'), {
      target: { files: [makeFile('data.csv')] },
    });
    fireEvent.click(screen.getByRole('button', { name: /verify bundle/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/No manuscript text/i);
    expect(screen.getByTestId('mock-ingestion')).toHaveTextContent('2 files');
  });
});
