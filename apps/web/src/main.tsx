import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { preloadArt } from './scene/Hero';
preloadArt();
import './index.css';
import { applyLite } from './lite';
applyLite();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary><App /></ErrorBoundary>
  </StrictMode>,
);

// 배포판에서만 서비스 워커 등록 (개발 서버에서는 캐시가 개발을 방해한다)
if ('serviceWorker' in navigator && import.meta.env.PROD) addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => undefined); });
