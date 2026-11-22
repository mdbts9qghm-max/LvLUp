import '@fontsource/press-start-2p/400.css';
import '@fontsource/vt323/400.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './ui/App';
import './ui/styles.css';

// Speicher als "dauerhaft" anfragen, damit iOS die Daten nicht so schnell löscht
if (navigator.storage?.persist) navigator.storage.persist().catch(() => undefined);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
