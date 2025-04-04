import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Route, useLocation } from "wouter";
import { useTranslation } from "react-i18next";

interface ProtectedRouteProps {
  path: string;
  component: () => React.JSX.Element;
  adminOnly?: boolean;
}

export function ProtectedRoute({ path, component: Component, adminOnly = false }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();
  const [redirectAttempted, setRedirectAttempted] = useState(false);

  // Сбрасываем флаг редиректа при изменении пути
  useEffect(() => {
    setRedirectAttempted(false);
  }, [location]);
  
  // Создаем эффект для перенаправления, который запускается только один раз
  useEffect(() => {
    // Проверяем нужно ли перенаправить пользователя
    if (!isLoading) {
      // Если страница только для админа, и пользователь не админ
      if (user && adminOnly && user.role !== 'admin' && !redirectAttempted) {
        setRedirectAttempted(true);
        setLocation('/dashboard');
        return;
      }

      // Если пользователь не авторизован
      if (!user && !redirectAttempted) {
        setRedirectAttempted(true);
        setLocation('/auth');
        return;
      }
    }
  }, [user, isLoading, adminOnly, redirectAttempted, setLocation]);

  // Показываем загрузчик пока проверяем авторизацию
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  // Показываем сообщение о запрете доступа
  if (!isLoading && user && adminOnly && user.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-3xl font-bold text-red-500 mb-4">{t('errors.forbidden')}</h1>
        <p className="text-muted-foreground mb-6">{t('errors.noAccess', 'У вас нет доступа к этой странице')}</p>
      </div>
    );
  }

  // Если пользователь не авторизован, ничего не показываем, потому что useEffect
  // запустит перенаправление
  if (!user) {
    return null;
  }

  // Показываем компонент только если пользователь авторизован и имеет нужные права
  return (
    <Route path={path}>
      <Component />
    </Route>
  );
}