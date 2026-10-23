/**
 * The Privacy & data page must say what the software does with uploaded data.
 *
 * The page it replaced said the site was a closed beta, that "data files and manuscripts you
 * upload" were stored and "retained until you ask us to remove them" (most tools store nothing;
 * manuscript checks keep a record but not the file), that logs held only "timestamps, request
 * paths, errors" (the web servers log IP addresses, browsers and full URLs, and the regression
 * tool logs the data it receives), and routed deletion requests to a public issue tracker.
 * The sources behind each statement are listed at the top of PrivacyPolicyPage.jsx;
 * backend/tests/test_privacy_retention_matches_code.py ties its numbers to the code.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import PrivacyPolicyPage from '../PrivacyPolicyPage';

const text = () => document.body.textContent;
const renderPage = () => render(<PrivacyPolicyPage />);

test('drops the statements that were not true', () => {
  renderPage();
  expect(text()).not.toMatch(/closed beta/i);
  expect(text()).not.toMatch(/retained until you ask us to remove them/i);
  expect(text()).not.toMatch(/Basic server logs \(timestamps, request paths, errors\)/);
  expect(text()).not.toMatch(/product analytics are disabled/i);
});

test('says the data is processed on the server, and that the site needs no password', () => {
  renderPage();
  expect(text()).toMatch(/open to everyone: no account or password is needed/);
  expect(text()).toMatch(/the values you upload or type are sent to our server/);
  expect(text()).toMatch(/The manuscript tools upload the file itself/);
});

test('says whether each kind of data is kept, and for how long', () => {
  renderPage();
  const t = text();
  expect(t).toMatch(/Most tools keep nothing/);
  expect(t).toMatch(/t-test, ANOVA and regression tools\s+keep their result in a cache for up to one hour/);
  expect(t).toMatch(/For ANOVA the cached result can include the group\s+values you sent/);
  expect(t).toMatch(/a SHA-256\s+fingerprint of the file/);
  expect(t).toMatch(/We do not keep the manuscript file or the values in your data files/);
  expect(t).toMatch(/nothing deletes them automatically yet/);
  expect(t).toMatch(/A Cox model\s+file contains each subject.s follow-up time and event/);
  expect(t).toMatch(/backups\s+are kept for 30 days/);
});

test('says what the logs record, including submitted values', () => {
  renderPage();
  const t = text();
  expect(t).toMatch(/IP address,\s+browser identification, the address requested/);
  expect(t).toMatch(/the regression tool currently writes\s+the data it receives into the log/);
  expect(t).toMatch(/No fixed retention period for logs is set in our\s+software/);
});

test('names every third party that receives a request, and when', () => {
  renderPage();
  const t = text();
  expect(t).toMatch(/We do not use analytics, advertising or tracking services/);
  expect(t).toMatch(/Google Fonts/);
  expect(t).toMatch(/cdnjs\.cloudflare\.com/);
  expect(t).toMatch(/If the AI assistant is switched on[\s\S]*sent to\s+Anthropic/);
});

test('deletion requests go to the email link, not to the public issue tracker', () => {
  renderPage();
  expect(text()).toMatch(/use the email link in the footer/);
  expect(text()).toMatch(/is public, so please don.t put personal details there/);
  expect(screen.getByRole('link', { name: 'issue tracker' })).toHaveAttribute(
    'href',
    'https://github.com/visvikbharti/stickforstats_new/issues'
  );
  expect(screen.getByRole('link', { name: 'Privacy settings' })).toHaveAttribute('href', '/privacy-settings');
});

test('says account erasure does not yet reach everything saved under an account', () => {
  renderPage();
  expect(text()).toMatch(/It does not yet delete everything saved\s+under an account/);
});

test('names the third parties every page contacts, not only the Paper Parser\'s', () => {
  renderPage();
  const t = text();
  expect(t).toMatch(/every page after the opening screen\s+loads the MathJax formula renderer from cdnjs\.cloudflare\.com/);
  expect(t).toMatch(/the 3-D plot in PCA loads font files\s+from cdn\.jsdelivr\.net/);
});

test('says closing an account keeps the email address, because it is the username', () => {
  renderPage();
  expect(text()).toMatch(/Your email\s+address stays in our database, because it is also your username/);
  expect(text()).not.toMatch(/erase your account/);
});

test('says the cache holds IP addresses, and how long a backup can outlive a deletion', () => {
  renderPage();
  expect(text()).toMatch(/The cache also holds your IP\s+address: for a minute after each request/);
  expect(text()).toMatch(/can remain in a backup for up to 32 days/);
});

test('no longer lists report or experiment-design storage: those routes were removed', () => {
  renderPage();
  expect(text()).not.toMatch(/report records|experiment-design storage/);
  expect(text()).toMatch(/One programming-interface \(API\) endpoint that no\s+screen uses yet, for data import/);
});

test('says the consent switches are not acted on yet', () => {
  renderPage();
  expect(text()).toMatch(/consent switches in Privacy settings are recorded, but the software does not\s+yet act on them/);
});

