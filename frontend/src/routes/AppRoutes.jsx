import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import LoadingFallback from '../components/common/LoadingFallback';
import NotFoundPage from '../pages/NotFoundPage';
import AccessDeniedPage from '../pages/AccessDeniedPage';
import TermsOfServicePage from '../pages/TermsOfServicePage';
import PrivacyPolicyPage from '../pages/PrivacyPolicyPage';
import ReceiptVerifyPage from '../pages/ReceiptVerifyPage';
import ROUTE_CONFIG from './routeConfig';

const SuspenseRoute = ({ component: Component, loadingMessage, skeleton, protected: isProtected, requiredRole, props }) => {
  const element = (
    <Suspense fallback={<LoadingFallback message={loadingMessage} skeleton={skeleton} />}>
      <Component {...props} />
    </Suspense>
  );

  if (isProtected) {
    return <ProtectedRoute requiredRole={requiredRole}>{element}</ProtectedRoute>;
  }

  return element;
};

// A route entry with a `redirect` is a retired path kept alive so bookmarks and
// old links do not 404. `replace` keeps it out of the history stack, so Back
// returns to where the user came from rather than bouncing through the alias.
const renderRoute = ({ path, redirect, ...routeProps }) =>
  redirect ? (
    <Route key={path} path={path} element={<Navigate to={redirect} replace />} />
  ) : (
    <Route key={path} path={path} element={<SuspenseRoute {...routeProps} />} />
  );

const AppRoutes = () => (
  <Routes>
    {ROUTE_CONFIG.map(renderRoute)}
    <Route path="/unauthorized" element={<AccessDeniedPage />} />
    <Route path="/terms" element={<TermsOfServicePage />} />
    <Route path="/privacy" element={<PrivacyPolicyPage />} />
    <Route path="/verify" element={<ReceiptVerifyPage />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);

export default AppRoutes;
