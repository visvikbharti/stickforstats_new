// Internationalization (i18n) Configuration
// Provides language support for the enterprise statistical analysis application

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Translation resources
const resources = {
  en: {
    translation: {
      // Common UI elements
      common: {
        loading: 'Loading...',
        error: 'Error',
        success: 'Success',
        warning: 'Warning',
        info: 'Information',
        cancel: 'Cancel',
        confirm: 'Confirm',
        save: 'Save',
        delete: 'Delete',
        edit: 'Edit',
        create: 'Create',
        update: 'Update',
        search: 'Search',
        filter: 'Filter',
        export: 'Export',
        import: 'Import',
        download: 'Download',
        upload: 'Upload',
        yes: 'Yes',
        no: 'No',
        ok: 'OK',
        close: 'Close',
        back: 'Back',
        next: 'Next',
        previous: 'Previous',
        submit: 'Submit',
        reset: 'Reset',
        clear: 'Clear',
        select: 'Select',
        selectAll: 'Select All',
        deselectAll: 'Deselect All',
        apply: 'Apply',
        refresh: 'Refresh',
        retry: 'Retry',
        help: 'Help',
        settings: 'Settings',
        preferences: 'Preferences',
        profile: 'Profile',
        logout: 'Logout',
        login: 'Login'
      },

      // Navigation
      navigation: {
        home: 'Home',
        dashboard: 'Dashboard',
        analysis: 'Analysis',
        data: 'Data',
        reports: 'Reports',
        workflows: 'Workflows',
        settings: 'Settings',
        help: 'Help & Support'
      },

      // Statistical Analysis
      statistics: {
        analysis: 'Statistical Analysis',
        descriptive: 'Descriptive Statistics',
        inferential: 'Inferential Statistics',
        correlation: 'Correlation Analysis',
        regression: 'Regression Analysis',
        anova: 'ANOVA',
        ttest: 'T-Test',
        chisquare: 'Chi-Square Test',
        hypothesis: 'Hypothesis Testing',
        confidenceInterval: 'Confidence Interval',
        pvalue: 'P-Value',
        significance: 'Significance Level',
        effect: 'Effect Size',
        power: 'Statistical Power',
        sample: 'Sample Size',
        population: 'Population',
        variable: 'Variable',
        dependent: 'Dependent Variable',
        independent: 'Independent Variable',
        mean: 'Mean',
        median: 'Median',
        mode: 'Mode',
        standardDeviation: 'Standard Deviation',
        variance: 'Variance',
        distribution: 'Distribution',
        normal: 'Normal Distribution',
        skewness: 'Skewness',
        kurtosis: 'Kurtosis'
      },

      // Data Management
      data: {
        dataset: 'Dataset',
        variable: 'Variable',
        observation: 'Observation',
        missing: 'Missing Values',
        outlier: 'Outliers',
        transformation: 'Data Transformation',
        cleaning: 'Data Cleaning',
        validation: 'Data Validation',
        import: 'Import Data',
        export: 'Export Data',
        preview: 'Data Preview',
        summary: 'Data Summary',
        types: 'Data Types',
        numeric: 'Numeric',
        categorical: 'Categorical',
        ordinal: 'Ordinal',
        nominal: 'Nominal',
        continuous: 'Continuous',
        discrete: 'Discrete'
      },

      // Reports
      reports: {
        generate: 'Generate Report',
        template: 'Report Template',
        custom: 'Custom Report',
        standard: 'Standard Report',
        export: 'Export Report',
        schedule: 'Schedule Report',
        share: 'Share Report',
        format: 'Report Format',
        pdf: 'PDF Format',
        excel: 'Excel Format',
        word: 'Word Format',
        html: 'HTML Format',
        results: 'Analysis Results',
        summary: 'Summary',
        details: 'Detailed Results',
        charts: 'Charts & Visualizations',
        tables: 'Data Tables',
        interpretation: 'Statistical Interpretation'
      },

      // Workflows
      workflows: {
        create: 'Create Workflow',
        execute: 'Execute Workflow',
        template: 'Workflow Template',
        step: 'Workflow Step',
        automation: 'Process Automation',
        schedule: 'Schedule Execution',
        monitor: 'Monitor Progress',
        history: 'Execution History',
        status: 'Status',
        pending: 'Pending',
        running: 'Running',
        completed: 'Completed',
        failed: 'Failed',
        cancelled: 'Cancelled'
      },

      // Error Messages
      errors: {
        generic: 'An unexpected error occurred',
        network: 'Network connection error',
        server: 'Server error',
        validation: 'Validation error',
        permission: 'Permission denied',
        notFound: 'Resource not found',
        timeout: 'Request timeout',
        fileSize: 'File size too large',
        fileType: 'Invalid file type',
        required: 'This field is required',
        invalid: 'Invalid value',
        duplicate: 'Duplicate entry'
      },

      // Success Messages
      success: {
        saved: 'Successfully saved',
        updated: 'Successfully updated',
        deleted: 'Successfully deleted',
        created: 'Successfully created',
        imported: 'Data imported successfully',
        exported: 'Data exported successfully',
        generated: 'Report generated successfully',
        executed: 'Workflow executed successfully'
      }
    }
  },

  es: {
    translation: {
      common: {
        loading: 'Cargando...',
        error: 'Error',
        success: 'Éxito',
        warning: 'Advertencia',
        info: 'Información',
        cancel: 'Cancelar',
        confirm: 'Confirmar',
        save: 'Guardar',
        delete: 'Eliminar',
        edit: 'Editar',
        create: 'Crear',
        update: 'Actualizar',
        search: 'Buscar',
        filter: 'Filtrar',
        export: 'Exportar',
        import: 'Importar',
        download: 'Descargar',
        upload: 'Subir',
        yes: 'Sí',
        no: 'No',
        ok: 'OK',
        close: 'Cerrar',
        back: 'Atrás',
        next: 'Siguiente',
        previous: 'Anterior',
        submit: 'Enviar',
        reset: 'Restablecer',
        clear: 'Limpiar'
      },
      navigation: {
        home: 'Inicio',
        dashboard: 'Panel de Control',
        analysis: 'Análisis',
        data: 'Datos',
        reports: 'Informes',
        workflows: 'Flujos de Trabajo',
        settings: 'Configuración',
        help: 'Ayuda y Soporte'
      },
      statistics: {
        analysis: 'Análisis Estadístico',
        descriptive: 'Estadísticas Descriptivas',
        inferential: 'Estadísticas Inferenciales',
        correlation: 'Análisis de Correlación',
        regression: 'Análisis de Regresión',
        mean: 'Media',
        median: 'Mediana',
        mode: 'Moda',
        standardDeviation: 'Desviación Estándar',
        variance: 'Varianza'
      }
    }
  },

  fr: {
    translation: {
      common: {
        loading: 'Chargement...',
        error: 'Erreur',
        success: 'Succès',
        warning: 'Avertissement',
        info: 'Information',
        cancel: 'Annuler',
        confirm: 'Confirmer',
        save: 'Enregistrer',
        delete: 'Supprimer',
        edit: 'Modifier',
        create: 'Créer',
        update: 'Mettre à jour',
        search: 'Rechercher',
        filter: 'Filtrer'
      },
      navigation: {
        home: 'Accueil',
        dashboard: 'Tableau de Bord',
        analysis: 'Analyse',
        data: 'Données',
        reports: 'Rapports',
        workflows: 'Flux de Travail',
        settings: 'Paramètres',
        help: 'Aide et Support'
      },
      statistics: {
        analysis: 'Analyse Statistique',
        descriptive: 'Statistiques Descriptives',
        mean: 'Moyenne',
        median: 'Médiane',
        standardDeviation: 'Écart Type'
      }
    }
  },

  de: {
    translation: {
      common: {
        loading: 'Laden...',
        error: 'Fehler',
        success: 'Erfolg',
        warning: 'Warnung',
        info: 'Information',
        cancel: 'Abbrechen',
        confirm: 'Bestätigen',
        save: 'Speichern',
        delete: 'Löschen',
        edit: 'Bearbeiten',
        create: 'Erstellen',
        update: 'Aktualisieren',
        search: 'Suchen',
        filter: 'Filtern'
      },
      navigation: {
        home: 'Startseite',
        dashboard: 'Dashboard',
        analysis: 'Analyse',
        data: 'Daten',
        reports: 'Berichte',
        workflows: 'Arbeitsabläufe',
        settings: 'Einstellungen',
        help: 'Hilfe und Support'
      },
      statistics: {
        analysis: 'Statistische Analyse',
        descriptive: 'Deskriptive Statistik',
        mean: 'Mittelwert',
        median: 'Median',
        standardDeviation: 'Standardabweichung'
      }
    }
  }
};

// i18n configuration
i18n
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Initialize React integration
  .init({
    resources,
    
    // Default language
    lng: 'en',
    
    // Fallback language
    fallbackLng: 'en',
    
    // Debug mode (enable in development)
    debug: process.env.NODE_ENV === 'development',
    
    // Interpolation options
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    // Language detection options
    detection: {
      // Order of language detection methods
      order: ['localStorage', 'navigator', 'htmlTag'],
      
      // Cache user language in localStorage
      caches: ['localStorage'],
      
      // localStorage key
      lookupLocalStorage: 'i18nextLng',
      
      // Check for language in these locations
      checkWhitelist: true,
    },
    
    // Namespace configuration
    defaultNS: 'translation',
    ns: ['translation'],
    
    // React options
    react: {
      useSuspense: false, // Disable suspense for SSR compatibility
      bindI18n: 'languageChanged',
      bindI18nStore: '',
    },
    
    // Load configuration
    load: 'languageOnly', // Load only language codes (en, not en-US)
    
    // Whitelist supported languages
    whitelist: ['en', 'es', 'fr', 'de'],
    
    // Non-explicit whitelist handling
    nonExplicitWhitelist: true,
  });

// Helper functions for translation management
export const changeLanguage = (language) => {
  return i18n.changeLanguage(language);
};

export const getCurrentLanguage = () => {
  return i18n.language;
};

export const getSupportedLanguages = () => {
  return [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'de', name: 'German', nativeName: 'Deutsch' }
  ];
};

export const addTranslationResource = (language, namespace, resource) => {
  i18n.addResourceBundle(language, namespace, resource, true, true);
};

export const loadTranslations = async (language, namespace) => {
  try {
    // Example: Load translations from API or external files
    const response = await fetch(`/locales/${language}/${namespace}.json`);
    if (response.ok) {
      const translations = await response.json();
      addTranslationResource(language, namespace, translations);
    }
  } catch (error) {
    console.warn(`Failed to load translations for ${language}/${namespace}:`, error);
  }
};

export default i18n;