# Multi-Language Support (i18n) Documentation

## Overview

StickForStats implements comprehensive internationalization (i18n) support using `react-i18next`, enabling the platform to serve researchers and scientists worldwide in their native languages. This document covers the architecture, supported languages, and usage guidelines.

**Implementation Date:** December 2025
**Version:** 1.0.0
**Dependencies:** `i18next`, `react-i18next`, `i18next-browser-languagedetector`

---

## Supported Languages

| Code | Language | Native Name | Region | Flag |
|------|----------|-------------|--------|------|
| `en` | English | English | United States | US |
| `es` | Spanish | Español | Spain/Latin America | ES |
| `zh` | Chinese (Simplified) | 中文 | China | CN |
| `pt` | Portuguese | Português | Brazil/Portugal | BR |
| `fr` | French | Français | France | FR |
| `de` | German | Deutsch | Germany | DE |

These languages were selected based on:
- Global scientific community representation
- Major research publication languages
- User base demographics in academia and industry

---

## Architecture

### Directory Structure

```
frontend/src/i18n/
├── index.js                    # Main i18n configuration
└── locales/
    ├── en/                     # English translations
    │   ├── common.json         # Common UI strings
    │   ├── statistics.json     # Statistical terminology
    │   ├── navigation.json     # Navigation & menu items
    │   └── education.json      # Learning hub content
    ├── es/                     # Spanish translations
    │   ├── common.json
    │   ├── statistics.json
    │   ├── navigation.json
    │   └── education.json
    ├── zh/                     # Chinese translations
    │   ├── common.json
    │   ├── statistics.json
    │   ├── navigation.json
    │   └── education.json
    ├── pt/                     # Portuguese translations
    │   ├── common.json
    │   ├── statistics.json
    │   ├── navigation.json
    │   └── education.json
    ├── fr/                     # French translations
    │   ├── common.json
    │   ├── statistics.json
    │   ├── navigation.json
    │   └── education.json
    └── de/                     # German translations
        ├── common.json
        ├── statistics.json
        ├── navigation.json
        └── education.json
```

### Translation Namespaces

| Namespace | Purpose | Key Count |
|-----------|---------|-----------|
| `common` | General UI elements (buttons, labels, messages) | ~96 keys |
| `statistics` | Statistical tests, parameters, interpretations | ~120 keys |
| `navigation` | Menu items, page titles, footer content | ~40 keys |
| `education` | Learning modules, lessons, progress tracking | ~50 keys |

---

## Configuration

### i18n Initialization (`src/i18n/index.js`)

```javascript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'statistics', 'navigation', 'education'],

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'stickforstats-language',
      caches: ['localStorage']
    },

    interpolation: {
      escapeValue: false // React handles escaping
    },

    react: {
      useSuspense: false
    }
  });
```

### Language Detection Order

1. **localStorage** - User's saved preference (`stickforstats-language`)
2. **navigator** - Browser's language setting
3. **htmlTag** - HTML `lang` attribute

---

## Usage Guide

### Basic Usage in Components

```jsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  // Default namespace (common)
  const { t } = useTranslation();

  return (
    <div>
      <button>{t('save')}</button>      {/* "Save" / "Guardar" / "保存" */}
      <button>{t('cancel')}</button>    {/* "Cancel" / "Cancelar" / "取消" */}
    </div>
  );
}
```

### Using Specific Namespaces

```jsx
import { useTranslation } from 'react-i18next';

function StatisticalTest() {
  const { t } = useTranslation('statistics');

  return (
    <div>
      <h2>{t('tests.tTest.name')}</h2>           {/* "t-Test" / "Prueba t" */}
      <p>{t('tests.tTest.description')}</p>       {/* Description text */}
      <span>{t('parameters.pValue')}</span>       {/* "p-Value" / "Valor-p" */}
    </div>
  );
}
```

### Multiple Namespaces

```jsx
import { useTranslation } from 'react-i18next';

function Dashboard() {
  const { t } = useTranslation(['common', 'navigation', 'statistics']);

  return (
    <div>
      <h1>{t('navigation:dashboard')}</h1>
      <p>{t('common:welcome')}</p>
      <span>{t('statistics:parameters.mean')}</span>
    </div>
  );
}
```

### Programmatic Language Change

```jsx
import { changeLanguage, getCurrentLanguage, SUPPORTED_LANGUAGES } from '../i18n';

// Get current language
const currentLang = getCurrentLanguage(); // "en"

// Change language
changeLanguage('es'); // Switches to Spanish

// Get all supported languages
console.log(SUPPORTED_LANGUAGES);
// [{ code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' }, ...]
```

---

## LanguageSelector Component

### Location
`src/components/common/LanguageSelector.js`

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'icon'` \| `'text'` \| `'compact'` | `'icon'` | Display style |
| `size` | `'small'` \| `'medium'` \| `'large'` | `'medium'` | Icon/button size |
| `showTooltip` | `boolean` | `true` | Show tooltip on hover |
| `showFlag` | `boolean` | `true` | Display flag emoji |

### Usage Examples

```jsx
// Icon button (default) - used in navigation
<LanguageSelector />

// Text variant with flag
<LanguageSelector variant="text" />

// Compact variant (flag + code)
<LanguageSelector variant="compact" />

// Small icon without tooltip
<LanguageSelector size="small" showTooltip={false} />
```

### Integration in Navigation

The LanguageSelector is integrated into `SimpleNavigation.jsx`:

```jsx
import LanguageSelector from './common/LanguageSelector';

// In the navigation bar
<LanguageSelector variant="icon" size="small" />
```

---

## Translation Key Reference

### Common Namespace (`common.json`)

```json
{
  "appName": "StickForStats",
  "tagline": "Professional Statistical Analysis Platform",
  "save": "Save",
  "cancel": "Cancel",
  "loading": "Loading...",
  "error": "Error",
  "success": "Success",
  "pValue": "p-Value",
  "confidenceInterval": "Confidence Interval"
  // ... 90+ more keys
}
```

### Statistics Namespace (`statistics.json`)

```json
{
  "title": "Statistical Analysis",
  "categories": {
    "parametric": "Parametric Tests",
    "nonparametric": "Non-Parametric Tests"
  },
  "tests": {
    "tTest": {
      "name": "t-Test",
      "description": "Compare means between groups",
      "oneSample": "One-Sample t-Test",
      "independent": "Independent t-Test",
      "paired": "Paired t-Test"
    },
    "anova": {
      "name": "ANOVA",
      "description": "Analysis of Variance"
    }
  },
  "parameters": {
    "mean": "Mean",
    "standardDeviation": "Standard Deviation",
    "effectSize": "Effect Size"
  },
  "effectSizes": {
    "cohensD": "Cohen's d",
    "etaSquared": "Eta-squared (η²)"
  }
}
```

### Navigation Namespace (`navigation.json`)

```json
{
  "home": "Home",
  "dashboard": "Dashboard",
  "learningHub": "Learning Hub",
  "statisticalAnalysis": "Statistical Analysis",
  "metaAnalysis": "Meta-Analysis",
  "paperParser": "Paper Parser",
  "menu": {
    "analysis": "Analysis",
    "education": "Education",
    "tools": "Tools"
  },
  "footer": {
    "copyright": "© 2025 StickForStats. All rights reserved.",
    "privacyPolicy": "Privacy Policy"
  }
}
```

### Education Namespace (`education.json`)

```json
{
  "title": "Learning Hub",
  "subtitle": "Master statistics through interactive lessons",
  "modules": {
    "pca": "Principal Component Analysis",
    "confidenceIntervals": "Confidence Intervals",
    "doe": "Design of Experiments"
  },
  "levels": {
    "beginner": "Beginner",
    "intermediate": "Intermediate",
    "advanced": "Advanced"
  },
  "lesson": {
    "objectives": "Learning Objectives",
    "nextLesson": "Next Lesson",
    "complete": "Complete Lesson"
  }
}
```

---

## Adding New Translations

### Step 1: Add Keys to English (Baseline)

Always add new keys to English first as the baseline:

```json
// src/i18n/locales/en/statistics.json
{
  "tests": {
    "newTest": {
      "name": "New Statistical Test",
      "description": "Description of the test"
    }
  }
}
```

### Step 2: Add Translations to Other Languages

Add the same keys with translated values to each language file:

```json
// src/i18n/locales/es/statistics.json
{
  "tests": {
    "newTest": {
      "name": "Nueva Prueba Estadística",
      "description": "Descripción de la prueba"
    }
  }
}
```

### Step 3: Use in Components

```jsx
const { t } = useTranslation('statistics');
<span>{t('tests.newTest.name')}</span>
```

---

## Adding a New Language

### Step 1: Create Language Directory

```bash
mkdir -p src/i18n/locales/ja  # Japanese example
```

### Step 2: Create Translation Files

Copy English files and translate:

```bash
cp src/i18n/locales/en/*.json src/i18n/locales/ja/
# Then translate each file
```

### Step 3: Update Configuration

In `src/i18n/index.js`:

```javascript
// Add imports
import jaCommon from './locales/ja/common.json';
import jaStatistics from './locales/ja/statistics.json';
import jaNavigation from './locales/ja/navigation.json';
import jaEducation from './locales/ja/education.json';

// Add to SUPPORTED_LANGUAGES
export const SUPPORTED_LANGUAGES = [
  // ... existing languages
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' }
];

// Add to resources
const resources = {
  // ... existing languages
  ja: {
    common: jaCommon,
    statistics: jaStatistics,
    navigation: jaNavigation,
    education: jaEducation
  }
};
```

---

## Statistical Terminology Guidelines

When translating statistical terms, follow these guidelines:

### 1. Use Standard Academic Terminology

Use terms that appear in peer-reviewed journals and textbooks in the target language.

### 2. Preserve Technical Accuracy

Some terms should remain in English or use internationally recognized abbreviations:
- ANOVA (not translated in most languages)
- p-value (often kept as "p" with native word for "value")
- R² (universal notation)

### 3. Examples of Correct Translations

| English | Spanish | Chinese | German |
|---------|---------|---------|--------|
| Standard Deviation | Desviación Estándar | 标准差 | Standardabweichung |
| Confidence Interval | Intervalo de Confianza | 置信区间 | Konfidenzintervall |
| Effect Size | Tamaño del Efecto | 效应量 | Effektstärke |
| Null Hypothesis | Hipótesis Nula | 零假设 | Nullhypothese |

### 4. References for Statistical Terminology

- APA Publication Manual (7th edition)
- ISO statistical standards
- Language-specific statistical textbooks
- Peer-reviewed journals in target language

---

## Persistence & Storage

### LocalStorage Key
```
stickforstats-language
```

### Stored Value
Language code string (e.g., `"en"`, `"es"`, `"zh"`)

### Document Language
The `<html lang="...">` attribute is updated when language changes:
```javascript
document.documentElement.lang = languageCode;
```

---

## Testing

### Manual Testing Checklist

- [ ] Language selector appears in navigation
- [ ] Clicking language changes UI text
- [ ] Language persists after page refresh
- [ ] Browser language detection works for new users
- [ ] All namespaces load correctly
- [ ] No missing translation warnings in console
- [ ] Statistical terms are accurate in all languages

### Browser Developer Tools

Check for missing translations in console:
```
i18next::translator: missingKey en statistics newKey
```

---

## Performance Considerations

1. **Bundle Size**: All translations are bundled at build time (~50KB total)
2. **No Runtime Fetching**: Translations load synchronously (no network requests)
3. **Lazy Loading Option**: For future scaling, implement `i18next-http-backend`

---

## Future Enhancements

1. **Additional Languages**: Japanese, Korean, Arabic, Hindi
2. **RTL Support**: Right-to-left layout for Arabic, Hebrew
3. **Dynamic Loading**: Lazy-load translations for less common languages
4. **Translation Management**: Integration with translation management platforms
5. **Community Contributions**: Allow users to submit translation improvements

---

## Troubleshooting

### Common Issues

**Issue**: Translation key shows instead of text
```
statistics.tests.tTest.name
```
**Solution**: Check that the key exists in the JSON file and namespace is correct.

**Issue**: Language doesn't change
**Solution**: Verify `changeLanguage()` is called and localStorage is accessible.

**Issue**: Console warnings about missing keys
**Solution**: Add missing keys to all language files.

---

## Contributing Translations

We welcome translation contributions from the scientific community. To contribute:

1. Fork the repository
2. Add/improve translations in `src/i18n/locales/`
3. Ensure statistical terminology accuracy
4. Submit a pull request with description of changes

**Contact**: For translation questions, open an issue on GitHub.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Dec 2025 | Initial implementation with 6 languages |

---

*Documentation maintained by StickForStats Development Team*
