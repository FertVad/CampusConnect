import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "@/components/theme/theme-provider";

// Import i18n configuration
import "./i18n/i18n";

// Wrap App in a special error boundary
function AppWithErrorHandling() {
  const [error, setError] = useState<Error | null>(null);
  
  // Reset error on retry
  const handleRetry = () => {
    setError(null);
    window.location.reload();
  };
  
  // If we caught an error, show a simple error screen
  if (error) {
    // Import necessary i18n components at the top level
    const { t } = require('react-i18next');
    
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
        <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
          <h1 className="mb-4 text-xl font-bold text-red-600">{t('errors.internalServerError')}</h1>
          <p className="mb-4 text-gray-700">
            {t('errors.connectionError')}
          </p>
          <div className="p-3 mb-4 overflow-auto bg-gray-100 rounded text-sm">
            <code>{error.message}</code>
          </div>
          <button
            onClick={handleRetry}
            className="w-full px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
          >
            {t('common.actions.refresh')}
          </button>
        </div>
      </div>
    );
  }
  
  // Otherwise, try to render the app
  try {
    return (
      <React.StrictMode>
        <ThemeProvider defaultTheme="dark">
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <App />
              <Toaster />
            </AuthProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </React.StrictMode>
    );
  } catch (err) {
    // If app rendering fails, update the error state
    console.error("Error rendering application:", err);
    setError(err instanceof Error ? err : new Error(String(err)));
    return null;
  }
}

// Modified app initialization with error handling
console.log("App initialization started");
try {
  // Debug: Display rendering location
  console.log("Rendering to element:", document.getElementById("root"));
  
  // Add a simple message directly to the body to confirm script execution
  const debugElement = document.createElement('div');
  debugElement.id = 'debug-message';
  debugElement.textContent = 'App initializing...';
  debugElement.style.padding = '10px';
  debugElement.style.backgroundColor = '#f0f0f0';
  debugElement.style.position = 'fixed';
  debugElement.style.top = '0';
  debugElement.style.left = '0';
  debugElement.style.zIndex = '9999';
  document.body.appendChild(debugElement);
  
  createRoot(document.getElementById("root")!).render(<AppWithErrorHandling />);
  console.log("App mounted successfully");
} catch (err) {
  console.error("Failed to initialize app:", err);
  // Try to use i18n translations even in critical error state
  let errorTitle = 'Critical Error';
  let errorMessage = 'The application failed to initialize. Please check your console for details.';
  let reloadText = 'Reload Application';
  
  try {
    // Attempt to get translations if i18n is already initialized
    const i18n = require('i18next').default;
    if (i18n.isInitialized) {
      errorTitle = i18n.t('errors.internalServerError');
      errorMessage = i18n.t('errors.connectionError');
      reloadText = i18n.t('common.actions.refresh');
    }
  } catch (e) {
    console.error('Failed to load translations for error message:', e);
  }
  
  document.body.innerHTML = `
    <div style="display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column;padding:20px;text-align:center;">
      <h1 style="color:red;margin-bottom:16px;">${errorTitle}</h1>
      <p style="margin-bottom:16px;">${errorMessage}</p>
      <pre style="background:#f0f0f0;padding:10px;margin-bottom:16px;text-align:left;overflow:auto;max-width:80%;">${err instanceof Error ? err.stack : String(err)}</pre>
      <button 
        onclick="window.location.reload()" 
        style="padding:8px 16px;background:#3b82f6;color:white;border:none;border-radius:4px;cursor:pointer;">
        ${reloadText}
      </button>
    </div>
  `;
}
