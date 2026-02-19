# StickForStats Mobile

React Native mobile app for field researchers. Provides access to statistical analysis, Guardian protection, and SQS manuscript scoring on the go.

## Prerequisites

- Node.js 18+
- React Native CLI
- Xcode (iOS) or Android Studio (Android)

## Setup

```bash
cd mobile
npm install
npx pod-install  # iOS only

# Run
npm run ios
npm run android
```

## Features

- Quick statistical analysis (t-test, ANOVA, correlation, descriptive)
- Smart analysis with natural language queries
- Guardian assumption validation
- SQS manuscript quality scoring
- Certification exam system
- Interactive statistics lessons
- Offline data caching via AsyncStorage

## Architecture

```
mobile/
├── App.tsx                    # Root component
├── src/
│   ├── api/client.ts          # API client (axios)
│   ├── screens/               # Screen components
│   │   ├── HomeScreen.tsx
│   │   └── QuickAnalysisScreen.tsx
│   └── navigation/
│       └── AppNavigator.tsx   # React Navigation setup
├── package.json
└── tsconfig.json
```
