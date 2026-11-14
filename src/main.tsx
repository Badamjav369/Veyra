import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Fonts are bundled locally (no requests to a font CDN) and include Cyrillic for Mongolian.
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './styles/index.css';

import App from './App';
import { I18nProvider } from './i18n/index';
import { ToastProvider } from './lib/toast';
import { PrefsProvider } from './state/prefs';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PrefsProvider>
      <I18nProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </I18nProvider>
    </PrefsProvider>
  </StrictMode>,
);
