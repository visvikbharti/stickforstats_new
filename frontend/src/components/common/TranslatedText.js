import React from 'react';
import { Typography } from '@mui/material';

// Translation mapping for different languages
const translations = {
  en: {
    'app.title': 'StickForStats',
    'app.tagline': 'Statistical Analysis Made Simple',
    'app.subtitle': 'Professional statistical tools for scientists and researchers',
    'nav.home': 'Home',
    'nav.features': 'Features',
    'nav.pricing': 'Pricing',
    'nav.about': 'About',
    'nav.contact': 'Contact',
    'btn.getStarted': 'Get Started',
    'btn.learnMore': 'Learn More',
    'btn.tryFree': 'Try for Free',
    'btn.signIn': 'Sign In',
    'btn.signUp': 'Sign Up',
    'hero.title': 'Advanced Statistical Analysis Platform',
    'hero.description': 'Empower your research with comprehensive statistical tools',
    'feature.dataAnalysis': 'Data Analysis',
    'feature.visualization': 'Data Visualization',
    'feature.reporting': 'Automated Reporting',
    'feature.collaboration': 'Team Collaboration',
  },
  es: {
    'app.title': 'StickForStats',
    'app.tagline': 'Análisis Estadístico Simplificado',
    'app.subtitle': 'Herramientas estadísticas profesionales para científicos e investigadores',
    'nav.home': 'Inicio',
    'nav.features': 'Características',
    'nav.pricing': 'Precios',
    'nav.about': 'Acerca de',
    'nav.contact': 'Contacto',
    'btn.getStarted': 'Comenzar',
    'btn.learnMore': 'Saber Más',
    'btn.tryFree': 'Prueba Gratis',
    'btn.signIn': 'Iniciar Sesión',
    'btn.signUp': 'Registrarse',
    'hero.title': 'Plataforma Avanzada de Análisis Estadístico',
    'hero.description': 'Potencia tu investigación con herramientas estadísticas integrales',
    'feature.dataAnalysis': 'Análisis de Datos',
    'feature.visualization': 'Visualización de Datos',
    'feature.reporting': 'Informes Automatizados',
    'feature.collaboration': 'Colaboración en Equipo',
  },
  fr: {
    'app.title': 'StickForStats',
    'app.tagline': 'Analyse Statistique Simplifiée',
    'app.subtitle': 'Outils statistiques professionnels pour scientifiques et chercheurs',
    'nav.home': 'Accueil',
    'nav.features': 'Fonctionnalités',
    'nav.pricing': 'Tarifs',
    'nav.about': 'À propos',
    'nav.contact': 'Contact',
    'btn.getStarted': 'Commencer',
    'btn.learnMore': 'En Savoir Plus',
    'btn.tryFree': 'Essai Gratuit',
    'btn.signIn': 'Connexion',
    'btn.signUp': "S'inscrire",
    'hero.title': "Plateforme d'Analyse Statistique Avancée",
    'hero.description': 'Renforcez votre recherche avec des outils statistiques complets',
    'feature.dataAnalysis': 'Analyse de Données',
    'feature.visualization': 'Visualisation de Données',
    'feature.reporting': 'Rapports Automatisés',
    'feature.collaboration': "Collaboration d'Équipe",
  },
};

// Component for displaying translated text
const TranslatedText = ({ 
  i18nKey, 
  variant = 'body1',
  component,
  children,
  values = {},
  fallback,
  ...props 
}) => {
  // Get current language from localStorage or default to 'en'
  const currentLanguage = localStorage.getItem('language') || 'en';
  
  // Get translation for current language, fallback to English if not found
  const getTranslation = () => {
    const langTranslations = translations[currentLanguage] || translations.en;
    let text = langTranslations[i18nKey] || translations.en[i18nKey] || fallback || i18nKey;
    
    // Replace placeholders with values
    Object.keys(values).forEach(key => {
      text = text.replace(`{${key}}`, values[key]);
    });
    
    return text;
  };

  // If children is provided, use it as the translation
  const displayText = children || getTranslation();

  // If it's just a text component, return the string
  if (!variant && !component) {
    return displayText;
  }

  // Otherwise return Typography component
  return (
    <Typography
      variant={variant}
      component={component}
      {...props}
    >
      {displayText}
    </Typography>
  );
};

// Hook for using translations in JavaScript
export const useTranslation = () => {
  const currentLanguage = localStorage.getItem('language') || 'en';
  
  const t = (key, values = {}) => {
    const langTranslations = translations[currentLanguage] || translations.en;
    let text = langTranslations[key] || translations.en[key] || key;
    
    Object.keys(values).forEach(k => {
      text = text.replace(`{${k}}`, values[k]);
    });
    
    return text;
  };
  
  return { t, currentLanguage };
};

export default TranslatedText;