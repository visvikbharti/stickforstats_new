// Educational banner components only
// Note: LearningHub is NOT re-exported here because it is lazy-loaded
// directly in App.jsx. Re-exporting it through this barrel caused a webpack
// code-splitting conflict where the barrel resolved in one chunk while
// LearningHub lived in a separate lazy chunk, leading to:
//   TypeError: Cannot read properties of undefined (reading 'call')
//   at options.factory / __webpack_require__
export { default as EducationalBanner, QuickLearnCard, LearningHubPromo } from './EducationalBanner';
