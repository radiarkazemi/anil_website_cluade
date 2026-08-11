import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initTheme } from './store/themeStore';

initTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
