/**
 * The Privacy settings page must not promise more than its export and erase do.
 *
 * It said the export was "a complete copy of all personal data we hold about you" and that
 * erasing meant "All your personal data will be permanently deleted or anonymized". Executed
 * (core/services/gdpr_service.py): the export holds account details, consents, memberships, 90
 * days of usage records and 100 audit entries; erasure keeps the username, which is the email
 * address (authentication/serializers.py), and leaves saved projects and receipts in place.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { apiClient } from '../../services/api';
import PrivacyDashboardPage from '../PrivacyDashboardPage';

jest.mock('../../services/api', () => ({
  __esModule: true,
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

const pageText = () => document.body.textContent;

beforeEach(() => {
  apiClient.get.mockImplementation((url) =>
    url.endsWith('/info/')
      ? Promise.resolve({ data: { controller: 'StickForStats', purposes: [], rights: [] } })
      : Promise.resolve({ data: { consents: {} } })
  );
});

afterEach(() => jest.clearAllMocks());

test('the export is described as what it contains, not as everything', async () => {
  render(<PrivacyDashboardPage />);
  expect(await screen.findByText('Export Your Data')).toBeInTheDocument();
  expect(pageText()).not.toMatch(/complete copy of all personal data/i);
  expect(pageText()).toMatch(/the last 90 days of usage records\s+and your latest 100 audit entries/);
});

test('erasure is described as what it does, including what it keeps', async () => {
  render(<PrivacyDashboardPage />);
  expect(await screen.findByText('Delete Your Data')).toBeInTheDocument();
  expect(pageText()).not.toMatch(/All your personal data will be permanently/);
  expect(pageText()).toMatch(/Your email address is kept as\s+your username, and saved projects and receipts are not deleted/);
});
