import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

// Error reporting for production
const reportError = (error: Error, errorInfo?: any) => {
  console.error('Admin App Error:', error, errorInfo);
  
  // In production, send errors to monitoring service
  if (import.meta.env.PROD) {
    // Example: Sentry.captureException(error);
    try {
      fetch('/api/admin/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent,
          additionalInfo: errorInfo
        }),
      }).catch(() => {
        // Silently fail if error reporting fails
      });
    } catch (reportingError) {
      console.warn('Failed to report error:', reportingError);
    }
  }
};

// Global error handler
window.addEventListener('error', (event) => {
  reportError(new Error(event.message), {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  reportError(new Error(), {
    reason: event.reason,
  });
});

// Performance monitoring
if (import.meta.env.PROD) {
  // Log performance metrics
  window.addEventListener('load', () => {
    setTimeout(() => {
      const perfData = performance.timing;
      const loadTime = perfData.loadEventEnd - perfData.navigationStart;
      const domReady = perfData.domContentLoadedEventEnd - perfData.navigationStart;
      
      console.log('Admin App Performance:', {
        loadTime: `${loadTime}ms`,
        domReady: `${domReady}ms`,
        timestamp: new Date().toISOString()
      });

      // Report to analytics service
      try {
        fetch('/api/admin/metrics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'performance',
            loadTime,
            domReady,
            timestamp: new Date().toISOString(),
            url: window.location.href,
          }),
        }).catch(() => {
          // Silently fail if metrics reporting fails
        });
      } catch (error) {
        console.warn('Failed to report performance metrics:', error);
      }
    }, 0);
  });
}

// Development helpers
if (import.meta.env.DEV) {
  // React DevTools
  if (typeof window !== 'undefined') {
    (window as any)._REACT_DEVTOOLS_GLOBAL_HOOK_ = 
      (window as any)._REACT_DEVTOOLS_GLOBAL_HOOK_ || {};
  }

  // Development logging
  console.log('🚀 FreshFlow Admin Panel - Development Mode');
  console.log('Environment:', import.meta.env.MODE);
  console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001');
  console.log('Socket URL:', import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001');
}

// App configuration
const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  socketUrl: import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001',
  environment: import.meta.env.MODE,
  version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  buildTime: import.meta.env.VITE_BUILD_TIME || new Date().toISOString(),
};

// Make config available globally for debugging
if (import.meta.env.DEV) {
  (window as any)._FRESHFLOW_CONFIG_ = config;
}

// Initialize React app
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found. Make sure you have a div with id="root" in your HTML.');
}

const root = ReactDOM.createRoot(rootElement);

// Render app with error boundary
try {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error('Failed to render React app:', error);
  reportError(error as Error, { phase: 'app-initialization' });
  
  // Fallback UI
  rootElement.innerHTML = `
    <div style="
      display: flex;
      items-center: center;
      justify-content: center;
      min-height: 100vh;
      background-color: #f9fafb;
      font-family: system-ui, -apple-system, sans-serif;
    ">
      <div style="text-align: center; padding: 2rem;">
        <h1 style="color: #dc2626; margin-bottom: 1rem;">Application Error</h1>
        <p style="color: #6b7280; margin-bottom: 1rem;">
          FreshFlow Admin Panel failed to load. Please refresh the page or contact support.
        </p>
        <button 
          onclick="window.location.reload()" 
          style="
            background-color: #3b82f6;
            color: white;
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 0.375rem;
            cursor: pointer;
            font-size: 0.875rem;
          "
        >
          Reload Page
        </button>
      </div>
    </div>
  `;
}

// Service Worker registration for PWA features (if needed)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered: ', registration);
      
      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available, notify user
              console.log('New content available! Please refresh.');
              
              // You could show a toast notification here
              const shouldRefresh = confirm(
                'A new version of the admin panel is available. Refresh to update?'
              );
              if (shouldRefresh) {
                window.location.reload();
              }
            }
          });
        }
      });
    } catch (error) {
      console.log('SW registration failed: ', error);
    }
  });
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  // Clean up any active connections, timers, etc.
  console.log('Admin panel unloading...');
  
  // Cancel any pending API requests
  if ('AbortController' in window) {
    // This would be handled by the API service layer
  }
});

// Handle online/offline status
window.addEventListener('online', () => {
  console.log('Admin panel back online');
  // You could dispatch a global event here to notify components
});

window.addEventListener('offline', () => {
  console.log('Admin panel offline');
  // You could show an offline banner here
});