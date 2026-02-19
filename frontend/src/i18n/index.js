/**
 * Internationalization (i18n) Configuration
 *
 * Multi-language support for StickForStats platform.
 * Supports: English, Spanish, Chinese, Portuguese, French, German,
 *           Japanese, Korean, Hindi, Arabic
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enCommon from './locales/en/common.json';
import enStatistics from './locales/en/statistics.json';
import enNavigation from './locales/en/navigation.json';
import enEducation from './locales/en/education.json';

import esCommon from './locales/es/common.json';
import esStatistics from './locales/es/statistics.json';
import esNavigation from './locales/es/navigation.json';
import esEducation from './locales/es/education.json';

import zhCommon from './locales/zh/common.json';
import zhStatistics from './locales/zh/statistics.json';
import zhNavigation from './locales/zh/navigation.json';
import zhEducation from './locales/zh/education.json';

import ptCommon from './locales/pt/common.json';
import ptStatistics from './locales/pt/statistics.json';
import ptNavigation from './locales/pt/navigation.json';
import ptEducation from './locales/pt/education.json';

import frCommon from './locales/fr/common.json';
import frStatistics from './locales/fr/statistics.json';
import frNavigation from './locales/fr/navigation.json';
import frEducation from './locales/fr/education.json';

import deCommon from './locales/de/common.json';
import deStatistics from './locales/de/statistics.json';
import deNavigation from './locales/de/navigation.json';
import deEducation from './locales/de/education.json';

import jaCommon from './locales/ja/common.json';
import jaStatistics from './locales/ja/statistics.json';
import jaNavigation from './locales/ja/navigation.json';
import jaEducation from './locales/ja/education.json';

import koCommon from './locales/ko/common.json';
import koStatistics from './locales/ko/statistics.json';
import koNavigation from './locales/ko/navigation.json';
import koEducation from './locales/ko/education.json';

import hiCommon from './locales/hi/common.json';
import hiStatistics from './locales/hi/statistics.json';
import hiNavigation from './locales/hi/navigation.json';
import hiEducation from './locales/hi/education.json';

import arCommon from './locales/ar/common.json';
import arStatistics from './locales/ar/statistics.json';
import arNavigation from './locales/ar/navigation.json';
import arEducation from './locales/ar/education.json';

// RTL languages
const RTL_LANGUAGES = ['ar'];

// Supported languages configuration
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', dir: 'rtl' }
];

// Resources object with all translations
const resources = {
  en: {
    common: enCommon,
    statistics: enStatistics,
    navigation: enNavigation,
    education: enEducation
  },
  es: {
    common: esCommon,
    statistics: esStatistics,
    navigation: esNavigation,
    education: esEducation
  },
  zh: {
    common: zhCommon,
    statistics: zhStatistics,
    navigation: zhNavigation,
    education: zhEducation
  },
  pt: {
    common: ptCommon,
    statistics: ptStatistics,
    navigation: ptNavigation,
    education: ptEducation
  },
  fr: {
    common: frCommon,
    statistics: frStatistics,
    navigation: frNavigation,
    education: frEducation
  },
  de: {
    common: deCommon,
    statistics: deStatistics,
    navigation: deNavigation,
    education: deEducation
  },
  ja: {
    common: jaCommon,
    statistics: jaStatistics,
    navigation: jaNavigation,
    education: jaEducation
  },
  ko: {
    common: koCommon,
    statistics: koStatistics,
    navigation: koNavigation,
    education: koEducation
  },
  hi: {
    common: hiCommon,
    statistics: hiStatistics,
    navigation: hiNavigation,
    education: hiEducation
  },
  ar: {
    common: arCommon,
    statistics: arStatistics,
    navigation: arNavigation,
    education: arEducation
  }
};

// Initialize i18n
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'statistics', 'navigation', 'education'],

    // Language detection options
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'stickforstats-language',
      caches: ['localStorage']
    },

    interpolation: {
      escapeValue: false // React already escapes values
    },

    react: {
      useSuspense: false // Disable suspense for compatibility
    }
  });

/**
 * Change the current language
 * @param {string} languageCode - Language code (en, es, zh, pt, fr, de, ja, ko, hi, ar)
 */
export const changeLanguage = (languageCode) => {
  i18n.changeLanguage(languageCode);
  localStorage.setItem('stickforstats-language', languageCode);
  document.documentElement.lang = languageCode;
  // Set document direction for RTL languages (e.g., Arabic)
  if (RTL_LANGUAGES.includes(languageCode)) {
    document.documentElement.dir = 'rtl';
  } else {
    document.documentElement.dir = 'ltr';
  }
};

/**
 * Get current language code
 * @returns {string} Current language code
 */
export const getCurrentLanguage = () => {
  return i18n.language || 'en';
};

/**
 * Get language info by code
 * @param {string} code - Language code
 * @returns {Object} Language info object
 */
export const getLanguageInfo = (code) => {
  return SUPPORTED_LANGUAGES.find(lang => lang.code === code) || SUPPORTED_LANGUAGES[0];
};

export default i18n;
