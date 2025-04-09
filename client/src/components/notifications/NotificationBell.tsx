import React, { useState, useCallback } from 'react';
import { BellIcon, BellRingIcon, ExternalLinkIcon } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/use-auth';
import { useLocation, useRoute } from 'wouter';
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
  const [, setLocation] = useLocation();

  // Отладочные логи
  console.log('🔔 NotificationBell mounted - ВИДИМЫЙ ВСЕГДА');
  console.log('NotificationBell auth state:', { 
    isAuthenticated, 
    userId: user?.id, 
    userRole: user?.role,
    userEmail: user?.email,
    userExists: !!user
  });

  // Определяем языковую локаль для форматирования дат
  const dateLocale = i18n.language === 'ru' ? ru : enUS;
  
  // Получаем уведомления текущего пользователя - но запрос все равно зависит от статуса аутентификации
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    enabled: isAuthenticated, // Запрос зависит от аутентификации, но компонент показываем всегда
    refetchInterval: 15000, // Сократили интервал до 15 секунд для более быстрого обновления
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
      await apiRequest('PATCH', '/api/notifications/read-all');
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
  
  // Функция для перехода к источнику уведомления
  const navigateToNotificationSource = useCallback(async (notification: Notification) => {
    try {
      // Сначала помечаем уведомление как прочитанное
      await markAsRead(notification.id);
      
      // Определяем маршрут на основе типа и идентификатора
      if (notification.relatedType && notification.relatedId) {
        let path = '/';
        
        switch (notification.relatedType) {
          case 'task':
            path = `/tasks?id=${notification.relatedId}`;
            break;
          case 'user':
            path = `/users?id=${notification.relatedId}`;
            break;
          case 'subject':
            path = `/subjects?id=${notification.relatedId}`;
            break;
          case 'assignment':
            path = `/assignments/${notification.relatedId}`;
            break;
          case 'schedule':
            path = `/schedule?id=${notification.relatedId}`;
            break;
          case 'grade':
            path = `/grades?id=${notification.relatedId}`;
            break;
          default:
            // Если тип не распознан, открываем дашборд
            path = '/';
        }
        
        // Закрываем меню уведомлений
        setIsOpen(false);
        
        // Переходим по маршруту
        setLocation(path);
      }
    } catch (error) {
      console.error('Error navigating to notification source:', error);
    }
  }, [markAsRead, setLocation, setIsOpen]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="w-10 h-10 bg-sidebar-accent hover:bg-sidebar-accent/70 hover:shadow-md hover:scale-105 transform transition-all duration-200 transition-colors rounded-full flex items-center justify-center cursor-pointer relative">
          {unreadCount > 0 ? (
            <>
              <BellRingIcon className="h-6 w-6 text-sidebar-foreground" />
              <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] text-white border border-sidebar-background/20">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </>
          ) : (
            <BellIcon className="h-6 w-6 text-sidebar-foreground" />
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="w-96 p-0 glass-sidebar dark:bg-sidebar-background/95 bg-popover/95 border-sidebar-border shadow-xl rounded-xl overflow-hidden animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95" 
        align="end"
        sideOffset={8}
      >
        <div className="flex items-center justify-end py-2 px-4 border-b border-sidebar-border/50">
          {unreadCount > 0 && (
            <Button
              variant="link"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs text-sidebar-foreground/80 hover:text-sidebar-foreground p-1 px-2 rounded-md hover:bg-sidebar-accent/10"
            >
              {t('notifications.markAllAsRead')}
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="p-4 text-center text-sidebar-foreground/70">
              {t('common.loading')}...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sidebar-foreground/70">
              {t('notifications.empty')}
            </div>
          ) : (
            <div>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-4 py-3 border-b border-sidebar-border/30 hover:bg-muted/50 transition-colors ${
                    !notification.isRead ? 'bg-muted/40' : ''
                  } ${(notification.relatedType && notification.relatedId) ? 'cursor-pointer' : ''}`}
                  onClick={() => {
                    if (notification.relatedType && notification.relatedId) {
                      navigateToNotificationSource(notification);
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className={`${!notification.isRead ? 'font-semibold' : 'font-medium'} text-sidebar-foreground text-base`}>
                      {notification.title}
                    </h4>
                    <small className="text-xs whitespace-nowrap text-sidebar-foreground/70 mt-1">
                      {formatNotificationDate(notification.createdAt)}
                    </small>
                  </div>
                  
                  {notification.relatedType && notification.relatedId && (
                    <div className="mt-1 mb-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-sidebar-accent/20 text-sidebar-foreground/90 inline-block whitespace-nowrap">
                        {t(`notifications.relatedTypes.${notification.relatedType}`)}
                      </span>
                    </div>
                  )}
                  
                  <p className="mt-2 mb-2 text-sm text-sidebar-foreground/80 leading-relaxed">
                    {notification.content}
                  </p>
                  
                  <div className="mt-2 pt-2 flex justify-between items-center border-t border-sidebar-border/20">
                    {(notification.relatedType && notification.relatedId) && (
                      <small className="text-xs text-sidebar-foreground/70 flex items-center">
                        <ExternalLinkIcon className="mr-1 h-3 w-3" />
                        {t('notifications.clickToNavigate')}
                      </small>
                    )}
                    {!notification.isRead && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation(); // Предотвращаем всплытие события клика
                          markAsRead(notification.id);
                        }}
                        className="text-xs text-sidebar-foreground/90 hover:text-sidebar-foreground hover:bg-sidebar-accent/10 rounded-md py-1 px-2"
                      >
                        {t('notifications.markAsRead')}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

// Добавляем экспорт по умолчанию для совместимости
export default NotificationBell;