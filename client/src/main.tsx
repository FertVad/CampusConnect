import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "./components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";

// Import i18n configuration
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n/i18n";

// Providers wrapped with Error Boundary
function AppWithProviders() {
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider defaultTheme="dark">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ErrorBoundary>
              <App />
              <Toaster />
            </ErrorBoundary>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </I18nextProvider>
  );
}

// Ensure the DOM is fully loaded before attempting to mount React
// This helps prevent issues in Safari where the DOM might not be ready
function safelyInitializeApp() {

  try {
    // Get the root element - we'll handle the null case safely
    const rootElement = document.getElementById("root");

    // Debug: Display rendering location

    if (!rootElement) {
      throw new Error("Root element not found in DOM");
    }

    // Apply a class that will add Safari-specific optimizations
    rootElement.className += " safari-only animate-gpu";

    // Create our React root and render the app
    const root = createRoot(rootElement);

    // Define a rendering function we can use in a timeout
    const renderApp = () => {
      root.render(
        <React.StrictMode>
          <AppWithProviders />
        </React.StrictMode>
      );

      // Remove debug element after successful render
      const debugElement = document.getElementById('debug-message');
      if (debugElement && debugElement.parentNode) {
        debugElement.parentNode.removeChild(debugElement);
      }
    };

    // Add a simple message directly to the body to confirm script execution
    const debugElement = document.createElement('div');
    debugElement.id = 'debug-message';
    debugElement.textContent = 'App initializing...';
    debugElement.style.padding = '10px';
    debugElement.style.backgroundColor = 'rgba(50, 50, 50, 0.8)';
    debugElement.style.color = 'white';
    debugElement.style.position = 'fixed';
    debugElement.style.top = '0';
    debugElement.style.left = '0';
    debugElement.style.zIndex = '9999';
    debugElement.style.borderRadius = '0 0 4px 0';
    debugElement.style.fontSize = '12px';
    document.body.appendChild(debugElement);

    // Use a small timeout to ensure DOM is fully processed
    // This helps with Safari's rendering issues
    setTimeout(renderApp, 10);

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

    // Create a fallback UI with inline styles for maximum compatibility
    const errorHtml = `
      <div style="display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column;padding:20px;text-align:center;background:#1a1a1a;color:#f0f0f0;">
        <h1 style="color:#ff6b6b;margin-bottom:16px;font-size:28px;">${errorTitle}</h1>
        <p style="margin-bottom:16px;font-size:16px;max-width:600px;">${errorMessage}</p>
        <pre style="background:rgba(255,255,255,0.1);padding:15px;margin-bottom:16px;text-align:left;overflow:auto;max-width:80%;border-radius:4px;font-size:12px;">${err instanceof Error ? err.stack : String(err)}</pre>
        <button 
          onclick="window.location.reload()" 
          style="padding:10px 20px;background:#4a72ef;color:white;border:none;border-radius:4px;cursor:pointer;font-size:16px;transition:background 0.2s;">
          ${reloadText}
        </button>
      </div>
    `;

    // Replace the body content without using innerHTML for better safety
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = errorHtml;

    document.body.innerText = ''; // Clear existing content safely
    document.body.appendChild(tempDiv.firstElementChild || tempDiv);
  }
}

// Check if document is ready, and if so initialize immediately
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  safelyInitializeApp();
} else {
  // Otherwise wait for DOMContentLoaded
  document.addEventListener('DOMContentLoaded', safelyInitializeApp);
}
