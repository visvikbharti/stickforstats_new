import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import LoadingFallback from '../components/common/LoadingFallback';
import NotFoundPage from '../pages/NotFoundPage';
import AccessDeniedPage from '../pages/AccessDeniedPage';
import TermsOfServicePage from '../pages/TermsOfServicePage';
import PrivacyPolicyPage from '../pages/PrivacyPolicyPage';
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

const AppRoutes = () => (
  <Routes>
    {ROUTE_CONFIG.map(({ path, ...routeProps }) => (
      <Route key={path} path={path} element={<SuspenseRoute {...routeProps} />} />
    ))}
    <Route path="/unauthorized" element={<AccessDeniedPage />} />
    <Route path="/terms" element={<TermsOfServicePage />} />
    <Route path="/privacy" element={<PrivacyPolicyPage />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);

export default AppRoutes;
