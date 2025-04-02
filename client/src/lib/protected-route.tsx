import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Route, Redirect } from "wouter";
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

  return (
    <Route path={path}>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      ) : user ? (
        // Если это административный маршрут, проверить роль пользователя
        adminOnly && user.role !== 'admin' ? (
          <div className="flex flex-col items-center justify-center min-h-screen">
            <h1 className="text-3xl font-bold text-red-500 mb-4">{t('errors.forbidden')}</h1>
            <p className="text-muted-foreground mb-6">{t('errors.noAccess', 'У вас нет доступа к этой странице')}</p>
            <Redirect to="/dashboard" />
          </div>
        ) : (
          <Component />
        )
      ) : (
        <Redirect to="/auth" />
      )}
    </Route>
  );
}