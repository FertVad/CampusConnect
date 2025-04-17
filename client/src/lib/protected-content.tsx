import React, { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";

interface ProtectedContentProps {
  children: ReactNode;
  roles?: string[];
}

// Компонент для защиты контента (без маршрутизации)
export function ProtectedContent({ children, roles = [] }: ProtectedContentProps) {
  const { user, isLoading } = useAuth();
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  
  // Показываем загрузчик пока проверяем авторизацию
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }
  
  // Если пользователь не авторизован, перенаправляем на страницу авторизации
  if (!user) {
    setTimeout(() => setLocation('/auth'), 0);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }
  
  // Если указаны роли и роль пользователя не в списке разрешенных, показываем сообщение об ошибке
  if (roles.length > 0 && !roles.includes(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-3xl font-bold text-red-500 mb-4">{t('errors.forbidden')}</h1>
        <p className="text-muted-foreground mb-6">{t('errors.noAccess', 'У вас нет доступа к этой странице')}</p>
      </div>
    );
  }
  
  // Показываем защищенный контент
  return <>{children}</>;
}