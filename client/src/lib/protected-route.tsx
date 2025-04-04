import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Route, Redirect, useLocation } from "wouter";
import NotFound from "@/pages/not-found";
import { useTranslation } from "react-i18next";

interface ProtectedRouteProps {
  path: string;
  component: () => React.JSX.Element;
  adminOnly?: boolean;
}

export function ProtectedRoute({ path, component: Component, adminOnly = false }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const { t } = useTranslation();
  const [location] = useLocation();
  // Use a state to track if we've already initiated a redirect to prevent loops
  const [redirected, setRedirected] = useState(false);

  // Reset the redirected state when the location changes
  useEffect(() => {
    setRedirected(false);
  }, [location]);

  // If the route requires admin role and user is not an admin, redirect to dashboard
  const showForbidden = !isLoading && user && adminOnly && user.role !== 'admin';
  
  // If the user is not authenticated and not already loading, redirect to auth
  const redirectToAuth = !isLoading && !user && !redirected;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <Route path={path}>
      {showForbidden ? (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h1 className="text-3xl font-bold text-red-500 mb-4">{t('errors.forbidden')}</h1>
          <p className="text-muted-foreground mb-6">{t('errors.noAccess', 'У вас нет доступа к этой странице')}</p>
          {!redirected && (
            <>
              {setRedirected(true)}
              <Redirect to="/dashboard" />
            </>
          )}
        </div>
      ) : redirectToAuth ? (
        <>
          {setRedirected(true)}
          <Redirect to="/auth" />
        </>
      ) : user ? (
        <Component />
      ) : null}
    </Route>
  );
}