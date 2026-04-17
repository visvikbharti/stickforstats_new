/**
 * SmartUpload Tests (Pillar 1 — Autonomous Intelligence Layer)
 * ============================================================
 *
 * SmartUpload is the CSV/XLSX entry point for the autonomous analysis
 * pipeline. It hands files to SmartProfiler via `profileData`, surfaces
 * Guardian-aware violation summaries, and offers the user a set of
 * follow-up questions that downstream components (NaturalLanguageBar,
 * GuidedWizard) can consume.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@mui/material/styles';

import SmartUpload from '../SmartUpload';
import { getTheme } from '../../../theme';

jest.mock('../../../services/AutonomousService', () => ({
  profileData: jest.fn(),
}));
const { profileData } = require('../../../services/AutonomousService');

const wrap = (ui) => render(<ThemeProvider theme={getTheme('light')}>{ui}</ThemeProvider>);

const makeFile = (name, content = 'a,b,c\n1,2,3\n') =>
  new File([content], name, { type: 'text/csv' });

beforeEach(() => {
  profileData.mockReset();
});

describe('SmartUpload — initial render', () => {
  it('renders the drop-zone prompt', () => {
    wrap(<SmartUpload />);
    expect(screen.getByText(/drag and drop your data file here/i)).toBeInTheDocument();
    expect(screen.getByText(/csv and excel files accepted/i)).toBeInTheDocument();
  });
});

describe('SmartUpload — file acceptance', () => {
  it('rejects an unsupported extension with a visible error', async () => {
    wrap(<SmartUpload />);

    // Find the hidden file input (type=file) and drop a .txt file into it.
    const input = document.querySelector('input[type="file"]');
    const badFile = new File(['hello'], 'notes.txt', { type: 'text/plain' });
    await act(async () => {
      fireEvent.change(input, { target: { files: [badFile] } });
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/unsupported file type/i);
    expect(profileData).not.toHaveBeenCalled();
  });

  it('calls profileData and onProfileComplete when a CSV is provided', async () => {
    const onProfileComplete = jest.fn();
    const onDataReady = jest.fn();
    const profile = {
      profile: { n_rows: 2, n_cols: 3, guardian_warnings: [] },
      questions: [{ id: 'q1', text: 'Are the two groups different?' }],
    };
    profileData.mockResolvedValue(profile);

    wrap(
      <SmartUpload
        onProfileComplete={onProfileComplete}
        onDataReady={onDataReady}
      />
    );

    const input = document.querySelector('input[type="file"]');
    const file = makeFile('wine.csv');
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    expect(onDataReady).toHaveBeenCalledWith(file);
    await waitFor(() => {
      expect(profileData).toHaveBeenCalledWith(file);
    });
    await waitFor(() => {
      expect(onProfileComplete).toHaveBeenCalledWith(profile);
    });
    // Filename rendered back to the user.
    expect(screen.getByText('wine.csv')).toBeInTheDocument();
  });

  it('shows the backend error when profileData rejects', async () => {
    profileData.mockRejectedValue({ response: { data: { detail: 'Bad CSV header' } } });

    wrap(<SmartUpload />);
    const input = document.querySelector('input[type="file"]');
    await act(async () => {
      fireEvent.change(input, { target: { files: [makeFile('broken.csv')] } });
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/bad csv header/i);
    });
  });
});
