import React, { createContext, useState, useContext } from 'react';

const BrandingContext = createContext();

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};

export const BrandingProvider = ({ children }) => {
  const [branding, setBranding] = useState({
    appName: 'StickForStats',
    appTitle: 'StickForStats - Statistical Analysis Platform',
    appDescription: 'World-class statistical analysis for scientists, PhD students, and enterprises',
    logo: '/assets/logo.png',
    primaryColor: '#1976d2',
    secondaryColor: '#dc004e',
    footerText: '© 2025 StickForStats. All rights reserved.',
    organizationName: 'StickForStats',
    supportEmail: 'support@stickforstats.com'
  });

  const updateBranding = (newBranding) => {
    setBranding(prev => ({ ...prev, ...newBranding }));
  };

  const value = {
    branding,
    updateBranding
  };

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
};

export { BrandingContext };
export default BrandingContext;