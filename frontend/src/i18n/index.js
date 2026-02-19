/**
 * Internationalization (i18n) Configuration
 *
 * Multi-language support for StickForStats platform.
 * Supports: English, Spanish, Chinese, Portuguese, French, German,
 *           Japanese, Korean, Hindi, Arabic, Turkish, Russian,
 *           Indonesian, Thai, Vietnamese, Polish
 *
 * @author StickForStats Team
 * @version 1.1.0
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

import trCommon from './locales/tr/common.json';
import trStatistics from './locales/tr/statistics.json';
import trNavigation from './locales/tr/navigation.json';
import trEducation from './locales/tr/education.json';

import ruCommon from './locales/ru/common.json';
import ruStatistics from './locales/ru/statistics.json';
import ruNavigation from './locales/ru/navigation.json';
import ruEducation from './locales/ru/education.json';

import idCommon from './locales/id/common.json';
import idStatistics from './locales/id/statistics.json';
import idNavigation from './locales/id/navigation.json';
import idEducation from './locales/id/education.json';

import thCommon from './locales/th/common.json';
import thStatistics from './locales/th/statistics.json';
import thNavigation from './locales/th/navigation.json';
import thEducation from './locales/th/education.json';

import viCommon from './locales/vi/common.json';
import viStatistics from './locales/vi/statistics.json';
import viNavigation from './locales/vi/navigation.json';
import viEducation from './locales/vi/education.json';

import plCommon from './locales/pl/common.json';
import plStatistics from './locales/pl/statistics.json';
import plNavigation from './locales/pl/navigation.json';
import plEducation from './locales/pl/education.json';

// RTL languages
const RTL_LANGUAGES = ['ar'];

// Supported languages configuration
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '\ud83c\uddfa\ud83c\uddf8' },
  { code: 'es', name: 'Spanish', nativeName: 'Espa\u00f1ol', flag: '\ud83c\uddea\ud83c\uddf8' },
  { code: 'zh', name: 'Chinese', nativeName: '\u4e2d\u6587', flag: '\ud83c\udde8\ud83c\uddf3' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Portugu\u00eas', flag: '\ud83c\udde7\ud83c\uddf7' },
  { code: 'fr', name: 'French', nativeName: 'Fran\u00e7ais', flag: '\ud83c\uddeb\ud83c\uddf7' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '\ud83c\udde9\ud83c\uddea' },
  { code: 'ja', name: 'Japanese', nativeName: '\u65e5\u672c\u8a9e', flag: '\ud83c\uddef\ud83c\uddf5' },
  { code: 'ko', name: 'Korean', nativeName: '\ud55c\uad6d\uc5b4', flag: '\ud83c\uddf0\ud83c\uddf7' },
  { code: 'hi', name: 'Hindi', nativeName: '\u0939\u093f\u0928\u094d\u0926\u0940', flag: '\ud83c\uddee\ud83c\uddf3' },
  { code: 'ar', name: 'Arabic', nativeName: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629', flag: '\ud83c\uddf8\ud83c\udde6', dir: 'rtl' },
  { code: 'tr', name: 'Turkish', nativeName: 'T\u00fcrk\u00e7e', flag: '\ud83c\uddf9\ud83c\uddf7' },
  { code: 'ru', name: 'Russian', nativeName: '\u0420\u0443\u0441\u0441\u043a\u0438\u0439', flag: '\ud83c\uddf7\ud83c\uddfa' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '\ud83c\uddee\ud83c\udde9' },
  { code: 'th', name: 'Thai', nativeName: '\u0e44\u0e17\u0e22', flag: '\ud83c\uddf9\ud83c\udded' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Ti\u1ebfng Vi\u1ec7t', flag: '\ud83c\uddfb\ud83c\uddf3' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '\ud83c\uddf5\ud83c\uddf1' }
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
  },
  tr: {
    common: trCommon,
    statistics: trStatistics,
    navigation: trNavigation,
    education: trEducation
  },
  ru: {
    common: ruCommon,
    statistics: ruStatistics,
    navigation: ruNavigation,
    education: ruEducation
  },
  id: {
    common: idCommon,
    statistics: idStatistics,
    navigation: idNavigation,
    education: idEducation
  },
  th: {
    common: thCommon,
    statistics: thStatistics,
    navigation: thNavigation,
    education: thEducation
  },
  vi: {
    common: viCommon,
    statistics: viStatistics,
    navigation: viNavigation,
    education: viEducation
  },
  pl: {
    common: plCommon,
    statistics: plStatistics,
    navigation: plNavigation,
    education: plEducation
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
 * @param {string} languageCode - Language code (en, es, zh, pt, fr, de, ja, ko, hi, ar, tr, ru, id, th, vi, pl)
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
