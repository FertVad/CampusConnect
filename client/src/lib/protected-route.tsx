import React, { useEffect, useState, useRef } from "react";
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
  
  // Используем ref для отслеживания предыдущего значения пользователя
  const prevUserRef = useRef<any>(null);
  
  // Сбрасываем флаг редиректа только при значимых изменениях пути
  useEffect(() => {
    // Проверяем, что изменение пути - это не часть бесконечного цикла
    if (location !== '/login' && location !== '/dashboard') {
      setRedirectAttempted(false);
    }
  }, [location]);
  
  // Сохраняем предыдущее значение пользователя
  useEffect(() => {
    prevUserRef.current = user;
  }, [user]);
  
  // Эффект для перенаправления с защитой от циклов
  useEffect(() => {
    // Работаем только когда загрузка завершена
    if (isLoading) return;
    
    // Чтобы избежать бесконечной цепочки перенаправлений, проверяем:
    // 1. Изменился ли пользователь с последнего раза (не было ли уже редиректа)
    // 2. Не пытались ли мы уже перенаправить пользователя
    const userChanged = prevUserRef.current !== user;
    
    // Если страница только для админа, и пользователь не админ
    if (user && adminOnly && user.role !== 'admin' && !redirectAttempted && userChanged) {
      setRedirectAttempted(true);
      
      // Используем setTimeout для избежания проблем с React 18 StrictMode
      setTimeout(() => setLocation('/dashboard'), 0);
      return;
    }

    // Если пользователь не авторизован и это не страница авторизации
    if (!user && !redirectAttempted && userChanged && location !== '/login') {
      setRedirectAttempted(true);

      // Используем setTimeout для избежания проблем с React 18 StrictMode
      setTimeout(() => setLocation('/login'), 0);
      return;
    }
  }, [user, isLoading, adminOnly, redirectAttempted, location, setLocation]);

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

  // Если пользователь не авторизован, ничего не рендерим
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