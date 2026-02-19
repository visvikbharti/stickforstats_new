import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
// i18n initialized via App.jsx -> ./i18n/index.js

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);

// Register the service worker for offline capabilities and caching
serviceWorkerRegistration.register({
  onSuccess: (registration) => {
    // Service worker registration successful
  },
  onUpdate: (registration) => {
    // New app version available
  }
});

// Performance metrics reporting (disabled in production)
reportWebVitals();