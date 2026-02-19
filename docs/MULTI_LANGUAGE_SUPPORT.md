# Multi-Language Support (i18n) Documentation

## Overview

StickForStats implements comprehensive internationalization (i18n) support using `react-i18next`, enabling the platform to serve researchers and scientists worldwide in their native languages. The application ships with **16 languages** across 4 translation namespaces, totaling **64 namespace JSON files**.

**Version:** 1.1.0
**Dependencies:** `i18next`, `react-i18next`, `i18next-browser-languagedetector`

---

## Supported Languages

### Complete Language Table

| # | Code | Language | Native Name | Script | Direction | Phase | Region |
|---|------|----------|-------------|--------|-----------|-------|--------|
| 1 | `ar` | Arabic | العربية | Arabic | **RTL** | Phase 2 | Saudi Arabia / MENA |
| 2 | `de` | German | Deutsch | Latin | LTR | Phase 1 | Germany / DACH |
| 3 | `en` | English (default) | English | Latin | LTR | Phase 1 | United States / Global |
| 4 | `es` | Spanish | Espanol | Latin | LTR | Phase 1 | Spain / Latin America |
| 5 | `fr` | French | Francais | Latin | LTR | Phase 1 | France / Francophone |
| 6 | `hi` | Hindi | हिन्दी | Devanagari | LTR | Phase 1 | India |
| 7 | `id` | Indonesian | Bahasa Indonesia | Latin | LTR | Phase 3 | Indonesia |
| 8 | `ja` | Japanese | 日本語 | CJK | LTR | Phase 2 | Japan |
| 9 | `ko` | Korean | 한국어 | Hangul | LTR | Phase 2 | South Korea |
| 10 | `pl` | Polish | Polski | Latin | LTR | Phase 3 | Poland |
| 11 | `pt` | Portuguese | Portugues | Latin | LTR | Phase 2 | Brazil / Portugal |
| 12 | `ru` | Russian | Русский | Cyrillic | LTR | Phase 3 | Russia / CIS |
| 13 | `th` | Thai | ไทย | Thai | LTR | Phase 3 | Thailand |
| 14 | `tr` | Turkish | Turkce | Latin | LTR | Phase 3 | Turkey |
| 15 | `vi` | Vietnamese | Tieng Viet | Latin | LTR | Phase 3 | Vietnam |
| 16 | `zh` | Chinese (Simplified) | 中文 | CJK | LTR | Phase 1 | China |

### Language Addition Phases

| Phase | Version | Languages Added | Count |
|-------|---------|-----------------|-------|
| Phase 1 | v1.0 | en, es, fr, de, zh, hi | 6 |
| Phase 2 | v2.0 | ja, ko, pt, ar | 4 |
| Phase 3 | v2.0 | tr, ru, id, th, vi, pl | 6 |
| | | **Total** | **16** |

### RTL (Right-to-Left) Support

Arabic (`ar`) is the only RTL language currently supported. When Arabic is selected:
- The `dir` attribute on `<html>` is set to `rtl`
- The `lang` attribute is updated to `ar`
- Layout direction is handled automatically via the `changeLanguage()` function

RTL languages are defined in the `RTL_LANGUAGES` array in the i18n config:
```javascript
const RTL_LANGUAGES = ['ar'];
```

---

## Architecture

### Directory Structure

```
frontend/src/i18n/
├── index.js                    # Main i18n configuration (v1.1.0)
└── locales/
    ├── ar/                     # Arabic (RTL)
    │   ├── common.json
    │   ├── statistics.json
    │   ├── navigation.json
    │   └── education.json
    ├── de/                     # German
    │   ├── common.json
    │   ├── statistics.json
    │   ├── navigation.json
    │   └── education.json
    ├── en/                     # English (default / fallback)
    │   ├── common.json
    │   ├── statistics.json
    │   ├── navigation.json
    │   └── education.json
    ├── es/                     # Spanish
    │   ├── common.json
    │   ├── statistics.json
    │   ├── navigation.json
    │   └── education.json
    ├── fr/                     # French
    │   ├── common.json
    │   ├── statistics.json
    │   ├── navigation.json
    │   └── education.json
    ├── hi/                     # Hindi
    │   ├── common.json
    │   ├── statistics.json
    │   ├── navigation.json
    │   └── education.json
    ├── id/                     # Indonesian
    │   ├── common.json
    │   ├── statistics.json
    │   ├── navigation.json
    │   └── education.json
    ├── ja/                     # Japanese
    │   ├── common.json
    │   ├── statistics.json
    │   ├── navigation.json
    │   └── education.json
    ├── ko/                     # Korean
    │   ├── common.json
    │   ├── statistics.json
    │   ├── navigation.json
    │   └── education.json
    ├── pl/                     # Polish
    │   ├── common.json
    │   ├── statistics.json
    │   ├── navigation.json
    │   └── education.json
    ├── pt/                     # Portuguese
    │   ├── common.json
    │   ├── statistics.json
    │   ├── navigation.json
    │   └── education.json
    ├── ru/                     # Russian
    │   ├── common.json
    │   ├── statistics.json
    │   ├── navigation.json
    │   └── education.json
    ├── th/                     # Thai
    │   ├── common.json
    │   ├── statistics.json
    │   ├── navigation.json
    │   └── education.json
    ├── tr/                     # Turkish
    │   ├── common.json
    │   ├── statistics.json
    │   ├── navigation.json
    │   └── education.json
    ├── vi/                     # Vietnamese
    │   ├── common.json
    │   ├── statistics.json
    │   ├── navigation.json
    │   └── education.json
    └── zh/                     # Chinese (Simplified)
        ├── common.json
        ├── statistics.json
        ├── navigation.json
        └── education.json
```

**Summary:** 16 language directories x 4 namespace files = **64 JSON translation files**

### Translation Namespaces

| Namespace | File | Purpose | Key Count (approx.) |
|-----------|------|---------|---------------------|
| `common` | `common.json` | General UI elements (buttons, labels, messages) | ~96 keys |
| `statistics` | `statistics.json` | Statistical tests, parameters, interpretations | ~120 keys |
| `navigation` | `navigation.json` | Menu items, page titles, footer content | ~40 keys |
| `education` | `education.json` | Learning modules, lessons, progress tracking | ~50 keys |

---

## Configuration

### i18n Initialization (`frontend/src/i18n/index.js`)

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
      useSuspense: false // Disable suspense for compatibility
    }
  });
```

### Language Detection Order

1. **localStorage** -- User's saved preference (key: `stickforstats-language`)
2. **navigator** -- Browser's language setting
3. **htmlTag** -- HTML `lang` attribute

### Fallback Behavior

When a translation key is missing for a given language, i18next falls back to English (`en`). This ensures the UI is always readable even if a translation is incomplete.

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

// Change language (also updates dir attribute for RTL)
changeLanguage('ar'); // Switches to Arabic, sets dir="rtl"
changeLanguage('es'); // Switches to Spanish, sets dir="ltr"

// Get all supported languages (array of 16 language objects)
console.log(SUPPORTED_LANGUAGES);
// [{ code: 'en', name: 'English', nativeName: 'English', flag: '...' }, ...]

// Get info for a specific language
import { getLanguageInfo } from '../i18n';
const info = getLanguageInfo('ja');
// { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '...' }
```

---

## LanguageSelector Component

### Location
`frontend/src/components/common/LanguageSelector.js`

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
    "etaSquared": "Eta-squared"
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
    "copyright": "StickForStats. All rights reserved.",
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

## Adding a New Language

Follow these steps to add a 17th (or subsequent) language to StickForStats.

### Step 1: Create the Language Directory

```bash
cd frontend/src/i18n/locales
mkdir -p <lang_code>   # e.g., mkdir -p sv  (Swedish)
```

### Step 2: Create the 4 Namespace Files

Copy English files as a starting point, then translate each one:

```bash
cp en/common.json <lang_code>/common.json
cp en/statistics.json <lang_code>/statistics.json
cp en/navigation.json <lang_code>/navigation.json
cp en/education.json <lang_code>/education.json
```

Translate every value in each file. Do **not** modify the keys -- only the values.

### Step 3: Add Imports in `frontend/src/i18n/index.js`

Add 4 import statements for the new language (follow the alphabetical pattern):

```javascript
import svCommon from './locales/sv/common.json';
import svStatistics from './locales/sv/statistics.json';
import svNavigation from './locales/sv/navigation.json';
import svEducation from './locales/sv/education.json';
```

### Step 4: Add to `SUPPORTED_LANGUAGES` Array

```javascript
export const SUPPORTED_LANGUAGES = [
  // ... existing languages ...
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '...' }
];
```

If the language is RTL, also add a `dir: 'rtl'` property and include the code in `RTL_LANGUAGES`:

```javascript
const RTL_LANGUAGES = ['ar', 'new_rtl_code'];
```

### Step 5: Add to `resources` Object

```javascript
const resources = {
  // ... existing languages ...
  sv: {
    common: svCommon,
    statistics: svStatistics,
    navigation: svNavigation,
    education: svEducation
  }
};
```

### Step 6: Verify

1. Start the development server (`cd frontend && npm start`)
2. Open the language selector and confirm the new language appears
3. Switch to the new language and verify text displays correctly
4. Check the browser console for any `missingKey` warnings
5. Test that the language persists after page refresh

---

## Statistical Terminology Guidelines

When translating statistical terms, follow these guidelines:

### 1. Use Standard Academic Terminology

Use terms that appear in peer-reviewed journals and textbooks in the target language.

### 2. Preserve Technical Accuracy

Some terms should remain in English or use internationally recognized abbreviations:
- **ANOVA** -- not translated in most languages
- **p-value** -- often kept as "p" with the native word for "value"
- **R-squared** -- universal notation
- **Cohen's d** -- universally recognized effect size measure

### 3. Cross-Language Terminology Examples

| English | Spanish | Chinese | German | Japanese | Korean | Arabic |
|---------|---------|---------|--------|----------|--------|--------|
| Standard Deviation | Desviacion Estandar | 标准差 | Standardabweichung | 標準偏差 | 표준편차 | الانحراف المعياري |
| Confidence Interval | Intervalo de Confianza | 置信区间 | Konfidenzintervall | 信頼区間 | 신뢰구간 | فاصل الثقة |
| Effect Size | Tamano del Efecto | 效应量 | Effektstarke | 効果量 | 효과 크기 | حجم الأثر |
| Null Hypothesis | Hipotesis Nula | 零假设 | Nullhypothese | 帰無仮説 | 귀무가설 | الفرضية الصفرية |

### 4. References for Statistical Terminology

- APA Publication Manual (7th edition)
- ISO statistical standards
- Language-specific statistical textbooks
- Peer-reviewed journals in the target language

---

## RTL (Right-to-Left) Language Support

### How RTL Works

The `changeLanguage()` function in `frontend/src/i18n/index.js` handles RTL automatically:

```javascript
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
```

### Currently Supported RTL Languages

| Code | Language | Status |
|------|----------|--------|
| `ar` | Arabic | Supported |

### Adding a New RTL Language

To add another RTL language (e.g., Hebrew `he`, Urdu `ur`, Farsi `fa`):

1. Follow the standard "Adding a New Language" steps above
2. Add the language code to `RTL_LANGUAGES`:
   ```javascript
   const RTL_LANGUAGES = ['ar', 'he'];
   ```
3. Add `dir: 'rtl'` to the language entry in `SUPPORTED_LANGUAGES`
4. Test all UI layouts to ensure proper RTL rendering

---

## Persistence & Storage

### LocalStorage Key
```
stickforstats-language
```

### Stored Value
Language code string (e.g., `"en"`, `"es"`, `"zh"`, `"ar"`)

### Document Attributes Updated on Language Change
```javascript
document.documentElement.lang = languageCode;  // e.g., "ja"
document.documentElement.dir = 'rtl' | 'ltr';  // based on RTL_LANGUAGES
```

---

## Testing

### Manual Testing Checklist

- [ ] Language selector appears in navigation bar
- [ ] All 16 languages are listed in the selector dropdown
- [ ] Clicking a language changes all UI text
- [ ] Language preference persists after page refresh
- [ ] Browser language detection works for new users
- [ ] All 4 namespaces load correctly for each language
- [ ] No missing translation warnings in console
- [ ] Statistical terms are accurate in all languages
- [ ] Arabic (ar) renders in RTL layout correctly
- [ ] CJK characters (zh, ja, ko) display correctly
- [ ] Devanagari script (hi) displays correctly
- [ ] Thai script (th) displays correctly
- [ ] Cyrillic script (ru) displays correctly

### Browser Developer Tools

Check for missing translations in console:
```
i18next::translator: missingKey en statistics newKey
```

### Verifying All Locale Files Exist

```bash
# From project root -- should output 64 files (16 languages x 4 namespaces)
find frontend/src/i18n/locales -name "*.json" | wc -l
```

---

## Performance Considerations

1. **Bundle Size**: All 64 translation files are bundled at build time (total ~120KB uncompressed)
2. **No Runtime Fetching**: Translations load synchronously via static imports (no network requests)
3. **Lazy Loading Option**: For future scaling, implement `i18next-http-backend` to load translations on demand
4. **Build Memory**: Use `NODE_OPTIONS="--max-old-space-size=4096"` for production builds if memory is constrained

---

## Exported API Reference

The i18n module (`frontend/src/i18n/index.js`) exports the following:

| Export | Type | Description |
|--------|------|-------------|
| `default` (i18n) | `i18n instance` | The configured i18next instance |
| `SUPPORTED_LANGUAGES` | `Array<Object>` | Array of 16 language objects with `code`, `name`, `nativeName`, `flag`, and optional `dir` |
| `changeLanguage(code)` | `Function` | Changes language, updates localStorage, sets `lang` and `dir` attributes |
| `getCurrentLanguage()` | `Function` | Returns current language code string (defaults to `'en'`) |
| `getLanguageInfo(code)` | `Function` | Returns language object for a given code, or English if not found |

---

## Troubleshooting

### Common Issues

**Issue**: Translation key shows instead of text
```
statistics.tests.tTest.name
```
**Solution**: Check that the key exists in the JSON file and the namespace is correctly specified.

**Issue**: Language does not change
**Solution**: Verify `changeLanguage()` is being called and localStorage is accessible. Check the browser console for errors.

**Issue**: Console warnings about missing keys
**Solution**: Add missing keys to all 16 language files. Use English as the baseline.

**Issue**: Arabic text renders left-to-right
**Solution**: Ensure `changeLanguage('ar')` is used instead of directly calling `i18n.changeLanguage('ar')`, as the wrapper function handles the `dir` attribute.

**Issue**: CJK characters display as boxes or question marks
**Solution**: Ensure the web fonts loaded by the application support CJK, Devanagari, Thai, and Cyrillic character sets.

---

## Contributing Translations

We welcome translation contributions from the scientific community. To contribute:

1. Fork the repository
2. Add or improve translations in `frontend/src/i18n/locales/<lang_code>/`
3. Ensure statistical terminology accuracy by consulting domain experts
4. Verify that all 4 namespace files have the same key structure as the English files
5. Submit a pull request with a description of changes

**Contact**: For translation questions, open an issue on GitHub.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Dec 2025 | Initial implementation with 6 languages (en, es, fr, de, zh, hi) |
| 1.1.0 | Feb 2026 | Expanded to 16 languages: added ja, ko, pt, ar (Phase 2) and tr, ru, id, th, vi, pl (Phase 3). Added RTL support for Arabic. Total: 64 namespace files |

---

*Documentation maintained by StickForStats Development Team*
