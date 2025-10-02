import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import './i18n/config'; // Initialize i18n

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
    console.log('Service worker registration successful with scope:', registration.scope);
  },
  onUpdate: (registration) => {
    console.log('New app version available. Please refresh the page to update.');
    // You could show a notification to the user here
  }
});

// If you want to measure performance in your app, enable this
// and review the reportWebVitals output in your browser console
reportWebVitals(console.log);