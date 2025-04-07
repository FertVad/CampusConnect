import React, { useState } from 'react';
import { BellIcon, BellRingIcon } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/use-auth';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';

// Определение типа для уведомлений
export interface Notification {
  id: number;
  userId: number;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  relatedId?: number | null;
  relatedType?: string | null;
}

export const NotificationBell = () => {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  console.log('[NotificationBell] Component rendering:', {
    user,
    isAuthenticated,
    userId: user?.id,
    mounted: true
  });

  // Добавляем логи для отладки проблемы с аутентификацией
  console.log('NotificationBell auth state:', { 
    isAuthenticated, 
    userId: user?.id, 
    userRole: user?.role,
    userEmail: user?.email,
    userExists: !!user,
    authState: localStorage.getItem('isAuthenticated')
  });

  // Определяем языковую локаль для форматирования дат
  const dateLocale = i18n.language === 'ru' ? ru : enUS;

  // Определяем статус аутентификации из нескольких источников
  const storageAuthValue = localStorage.getItem('isAuthenticated');
  const authFromStorage = storageAuthValue === 'true';
  // ВАЖНО: Требуем наличия объекта пользователя в любом случае, чтобы избежать ошибок при запросах
  const combinedAuthCheck = isAuthenticated && !!user;
  
  // Получаем уведомления текущего пользователя
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    enabled: isAuthenticated, // Query still depends on auth, but component will show for all
    refetchInterval: 60000,
  });

  // Получаем количество непрочитанных уведомлений
  const unreadCount = notifications.filter(notification => !notification.isRead).length;

  // Обработчик для отметки уведомления как прочитанное
  const markAsRead = async (id: number) => {
    try {
      await apiRequest('PATCH', `/api/notifications/${id}/read`);
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Помечаем все уведомления как прочитанные
  const markAllAsRead = async () => {
    try {
      console.log('Marking all notifications as read');
      
      // Используем новый API эндпоинт для отметки всех уведомлений как прочитанных
      await apiRequest('PATCH', '/api/notifications/read-all');
      
      // Обновляем кэш запросов
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  // Форматирование даты уведомления в виде "X времени назад"
  const formatNotificationDate = (date: string) => {
    return formatDistanceToNow(new Date(date), { 
      addSuffix: true,
      locale: dateLocale
    });
  };

  // Добавляем отладочный лог
  console.log('🔔 NotificationBell mounted');
  console.log('Authorization debug in NotificationBell:', {
    authFromHook: isAuthenticated,
    authFromStorage,
    userExists: !!user,
    combinedCheck: combinedAuthCheck,
    userId: user?.id
  });

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="border border-red-500 p-0.5"> {/* Добавлена красная рамка для отладки */}
          <div className="w-10 h-10 bg-primary/10 hover:bg-primary/20 transition-colors rounded-full flex items-center justify-center cursor-pointer relative">
            {unreadCount > 0 ? (
              <>
                <BellRingIcon className="h-6 w-6 text-primary" />
                <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </>
            ) : (
              <BellIcon className="h-6 w-6 text-primary" />
            )}
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-medium">{t('notifications.title')}</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs"
            >
              {t('notifications.markAllAsRead')}
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              {t('common.loading')}...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              {t('notifications.empty')}
            </div>
          ) : (
            <div>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b hover:bg-accent/50 transition-colors ${
                    !notification.isRead ? 'bg-accent/30' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <h4 className="font-medium">{notification.title}</h4>
                    <small className="text-xs text-muted-foreground">
                      {formatNotificationDate(notification.createdAt)}
                    </small>
                  </div>
                  <p className="mt-1 text-sm">{notification.content}</p>
                  {!notification.isRead && (
                    <div className="mt-2 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                        className="text-xs"
                      >
                        {t('notifications.markAsRead')}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

// Именованный экспорт уже добавлен выше