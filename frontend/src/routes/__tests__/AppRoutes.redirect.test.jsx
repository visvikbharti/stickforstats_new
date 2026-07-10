import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Replace the real route table so no lazy chunks (and no MUI trees) are pulled in.
jest.mock('../routeConfig', () => ({
  __esModule: true,
  default: [
    { path: '/target', component: () => <div>TARGET PAGE</div>, loadingMessage: 'x' },
    { path: '/alias', redirect: '/target' },
    { path: '/guarded', component: () => <div>GUARDED PAGE</div>, protected: true },
  ],
}));

jest.mock('../../components/auth/ProtectedRoute', () => ({
  __esModule: true,
  default: ({ children }) => <div>PROTECTED:{children}</div>,
}));
jest.mock('../../components/common/LoadingFallback', () => ({
  __esModule: true,
  default: () => <div>loading</div>,
}));
jest.mock('../../pages/NotFoundPage', () => ({ __esModule: true, default: () => <div>NOT FOUND</div> }));
jest.mock('../../pages/AccessDeniedPage', () => ({ __esModule: true, default: () => <div>denied</div> }));
jest.mock('../../pages/TermsOfServicePage', () => ({ __esModule: true, default: () => <div>terms</div> }));
jest.mock('../../pages/PrivacyPolicyPage', () => ({ __esModule: true, default: () => <div>PRIVACY POLICY</div> }));
jest.mock('../../pages/ReceiptVerifyPage', () => ({ __esModule: true, default: () => <div>verify</div> }));

// eslint-disable-next-line import/first
import AppRoutes from '../AppRoutes';

const at = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>
  );

describe('AppRoutes', () => {
  it('renders the target page for a redirect entry', async () => {
    at('/alias');
    expect(await screen.findByText('TARGET PAGE')).toBeInTheDocument();
  });

  it('does not 404 a redirect entry', async () => {
    at('/alias');
    expect(await screen.findByText('TARGET PAGE')).toBeInTheDocument();
    expect(screen.queryByText('NOT FOUND')).not.toBeInTheDocument();
  });

  it('still renders ordinary component entries', async () => {
    at('/target');
    expect(await screen.findByText('TARGET PAGE')).toBeInTheDocument();
  });

  it('still wraps protected entries in ProtectedRoute', async () => {
    at('/guarded');
    expect(await screen.findByText(/PROTECTED:/)).toBeInTheDocument();
  });

  it('serves the legal privacy policy at /privacy', async () => {
    at('/privacy');
    expect(await screen.findByText('PRIVACY POLICY')).toBeInTheDocument();
  });

  it('still 404s an unknown path', async () => {
    at('/no-such-route');
    expect(await screen.findByText('NOT FOUND')).toBeInTheDocument();
  });
});
