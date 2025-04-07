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

const NotificationBell = () => {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // Определяем языковую локаль для форматирования дат
  const dateLocale = i18n.language === 'ru' ? ru : enUS;

  // Получаем уведомления текущего пользователя
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    enabled: !!user && isAuthenticated, // Запрос только для аутентифицированных пользователей
    refetchInterval: 60000, // Обновляем каждую минуту
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
      const unreadNotifications = notifications.filter(notification => !notification.isRead);
      
      // Используем Promise.all для параллельной обработки запросов
      await Promise.all(
        unreadNotifications.map(notification => 
          apiRequest('PATCH', `/api/notifications/${notification.id}/read`)
        )
      );
      
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

  // Отладочный лог для проверки рендера компонента
  console.log("🔔 NotificationBell rendered", { 
    isAuthenticated, 
    user, 
    hasUser: !!user,
    userType: typeof user,
    userKeys: user ? Object.keys(user) : null
  });
  
  // Если пользователь не авторизован, показываем базовую иконку
  if (!isAuthenticated || !user) {
    return (
      <div className="relative inline-block cursor-pointer">
        <div className="w-10 h-10 bg-slate-200 flex items-center justify-center rounded-full">
          <BellIcon className="h-6 w-6 text-slate-700" />
        </div>
      </div>
    );
  }

  console.log("🔔 NotificationBell отображается с уведомлениями")
    return (
      <div className="relative inline-block cursor-pointer">
        <div className="w-10 h-10 bg-slate-200 flex items-center justify-center rounded-full">
          <BellIcon className="h-6 w-6 text-slate-700" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white border-2 border-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="w-8 h-8 relative">
          {unreadCount > 0 ? (
            <>
              <BellRingIcon className="h-6 w-6 text-red-500" />
              <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </>
          ) : (
            <BellIcon className="h-6 w-6 text-neutral-600" />
          )}
        </Button>
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

export default NotificationBell;