/**
 * The two pages that describe closing an account say the same thing, and it is what the code does.
 *
 * The confirmation dialog of Privacy settings said "This will permanently delete all your personal
 * data including: Account information (email, name)", its button said "Permanently Delete All
 * Data", and the message afterwards said "Your personal data has been erased". The Privacy & data
 * page said that the email address stays in the database. The page was right
 * (core/services/gdpr_service.py keeps the username, which is the email address).
 * backend/tests/test_privacy_erasure_matches_the_pages.py runs the erasure against the same lines.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { apiClient } from '../../services/api';
import PrivacyDashboardPage from '../PrivacyDashboardPage';
import PrivacyPolicyPage from '../PrivacyPolicyPage';
import {
  EMAIL_ADDRESS_IS_KEPT,
  ERASURE_ANONYMISES,
  ERASURE_CHANGES_THE_ACCOUNT,
  ERASURE_DELETES,
  ERASURE_DONE,
  ERASURE_KEEPS,
} from '../privacyErasure';

jest.mock('../../services/api', () => ({
  __esModule: true,
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

const squeezed = (node) => node.textContent.replace(/\s+/g, ' ');

beforeEach(() => {
  apiClient.get.mockImplementation((url) =>
    url.endsWith('/info/')
      ? Promise.resolve({ data: { controller: 'StickForStats', purposes: [], rights: [] } })
      : Promise.resolve({ data: { consents: {} } })
  );
  apiClient.post.mockResolvedValue({ data: { status: 'erased' } });
});

afterEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
});

const openTheDialog = async () => {
  render(<PrivacyDashboardPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Request Data Erasure' }));
  return screen.findByRole('dialog');
};

test('the dialog lists what is deleted, what is anonymised and what is kept', async () => {
  const dialog = await openTheDialog();
  const lines = (name) =>
    within(within(dialog).getByRole('list', { name })).getAllByRole('listitem').map((li) => li.textContent);
  expect(lines('Deleted')).toEqual(ERASURE_DELETES);
  expect(lines('Anonymised or changed')).toEqual([...ERASURE_ANONYMISES, ERASURE_CHANGES_THE_ACCOUNT]);
  expect(lines('Kept')).toEqual(ERASURE_KEEPS);
  expect(lines('Kept')[0]).toBe('Your email address stays in our database, because it is also your username.');
});

test('the dialog does not say that the email address or all personal data is deleted', async () => {
  const dialog = await openTheDialog();
  const text = squeezed(dialog);
  expect(text).not.toMatch(/permanently delete all your personal data/i);
  expect(text).not.toMatch(/Account information \(email, name\)/);
  expect(text).not.toMatch(/Delete All Data/i);
  expect(within(within(dialog).getByRole('list', { name: 'Deleted' })).queryByText(/email/i)).toBeNull();
  expect(text).toContain('Closing your account does not delete everything.');
  expect(within(dialog).getByRole('button', { name: 'Close my account' })).toBeDisabled();
});

test('the Privacy & data page and the dialog say the same sentence about the email address', async () => {
  const dialog = await openTheDialog();
  expect(squeezed(dialog)).toContain(EMAIL_ADDRESS_IS_KEPT);
  const { container } = render(<PrivacyPolicyPage />);
  expect(squeezed(container)).toContain(EMAIL_ADDRESS_IS_KEPT);
  expect(squeezed(container)).toContain(
    'clears your name and deactivates the account. Your email address stays in our database, because it is also your username. It does not yet delete'
  );
});

test('the message after closing the account says what was done and what was kept', async () => {
  jest.useFakeTimers();
  const dialog = await openTheDialog();
  fireEvent.change(within(dialog).getByPlaceholderText('DELETE MY DATA'), { target: { value: 'DELETE MY DATA' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close my account' }));
  await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/v1/privacy/erase/', { confirm: true }));
  const alert = await screen.findByText(ERASURE_DONE);
  expect(alert.textContent).not.toMatch(/Your personal data has been erased/);
  expect(alert.textContent).toMatch(/Your email address is still stored as the username of the deactivated account/);
});
