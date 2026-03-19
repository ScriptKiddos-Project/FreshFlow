import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../frontend/src/index.css';
import App from '../../../../frontend/src/App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
