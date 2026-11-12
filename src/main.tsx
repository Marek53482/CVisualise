import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/courgette/latin-400.css';
import App from './App';
import './styles/app.css';
import './styles/cv.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
