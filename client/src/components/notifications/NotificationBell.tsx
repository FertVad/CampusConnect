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
import { getTaskStatusLabel } from '@/lib/taskStatus';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

import type { Notification } from '@shared/schema';


export const NotificationBell = () => {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Определяем языковую локаль для форматирования дат
  const dateLocale = i18n.language === 'ru' ? ru : enUS;
  
  // Получаем уведомления текущего пользователя с оптимизированными параметрами
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    enabled: isAuthenticated, // Запрос зависит от аутентификации, но компонент показываем всегда
    refetchInterval: false, // Отключаем автоматические обновления, будем использовать invalidateQueries
    staleTime: 2 * 60 * 1000, // Данные считаются свежими в течение 2 минут
    gcTime: 10 * 60 * 1000, // Храним в кэше 10 минут
    refetchOnMount: false, // Не обновляем при первом монтировании
    refetchOnWindowFocus: true, // Обновляем при возврате на вкладку
  });

  // Получаем количество непрочитанных уведомлений
  const unreadCount = notifications.filter(notification => !notification.isRead).length;

  // Обработчик для отметки уведомления как прочитанное
  const markAsRead = async (id: string) => {
    try {
      await apiRequest(`/api/notifications/${id}/read`, 'PATCH');
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    } catch (error) {
      toast({
        title: t('error'),
        description: error instanceof Error ? error.message : t('unexpected_error'),
        variant: 'destructive',
      });
    }
  };

  // Помечаем все уведомления как прочитанные
  const markAllAsRead = async () => {
    try {
      await apiRequest('/api/notifications/read-all', 'PATCH');
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    } catch (error) {
      toast({
        title: t('error'),
        description: error instanceof Error ? error.message : t('unexpected_error'),
        variant: 'destructive',
      });
    }
  };

  // Форматирование даты уведомления в виде "X времени назад"
  const formatNotificationDate = (date: string) => {
    return formatDistanceToNow(new Date(date), { 
      addSuffix: true,
      locale: dateLocale
    });
  };
  
  const translateTaskStatus = (status: string) =>
    getTaskStatusLabel(status, t);

  // Функция для перевода содержимого уведомлений
  const translateNotificationContent = (notification: Notification) => {
    // Уведомления о задачах
    if (notification.title === "Task Status Updated" && notification.content.includes("has been updated to")) {
      const taskTitle = notification.content.match(/Task "(.*?)" has been updated to/)?.[1] || "";
      const status = notification.content.match(/updated to (.*?)$/)?.[1] || "";
      const translatedStatus = translateTaskStatus(status);
      return t('notifications.taskStatusUpdateContent', {
        title: taskTitle,
        status: translatedStatus
      });
    }

    const statusChangeMatch = notification.content.match(/Task ['"]?(.*?)['"]? status changed from ['"]?(.*?)['"]? to ['"]?(.*?)['"]?$/i);
    if (statusChangeMatch) {
      const [, name, oldStatus, newStatus] = statusChangeMatch;
      return t('notifications.taskStatusChangedContent', {
        name,
        oldStatus: translateTaskStatus(oldStatus),
        newStatus: translateTaskStatus(newStatus)
      });
    }
    
    if (notification.title === "Task Completed" && notification.content.includes("has been marked as completed")) {
      const taskTitle = notification.content.match(/Task "(.*?)" has been marked as completed/)?.[1] || "";
      return t('notifications.taskCompletedContent', {
        title: taskTitle
      });
    }
    
    if (notification.title === "Task Deleted" && notification.content.includes("has been deleted")) {
      const taskTitle = notification.content.match(/Task "(.*?)" has been deleted/)?.[1] || "";
      return t('notifications.taskDeletedContent', {
        title: taskTitle
      });
    }
    
    if (notification.title === "New Task Assigned" && notification.content.includes("You have been assigned a new task")) {
      const taskTitle = notification.content.match(/You have been assigned a new task: (.*?)$/)?.[1] || "";
      return t('notifications.newTaskAssignedContent', {
        title: taskTitle
      });
    }
    
    // Уведомления о пользователях
    if (notification.title === "User Updated") {
      // Обработка различных типов уведомлений об обновлении пользователя
      
      // 1. Пользователь получает уведомление, что его профиль был обновлен администратором
      if (notification.content === "Ваш профиль был обновлён администратором." || 
          notification.content === "Your profile has been updated by an administrator.") {
        return t('notifications.userProfileUpdatedByAdmin');
      }
      
      // 2. Администратор получает уведомление, что он обновил профиль пользователя
      const adminUpdatedMatch = notification.content.match(/Вы обновили профиль пользователя (.*?)\./) || 
                                notification.content.match(/You have updated user profile for (.*?)\./) ;
      if (adminUpdatedMatch) {
        const userName = adminUpdatedMatch[1] || "";
        return t('notifications.adminUpdatedUserProfile', {
          name: userName
        });
      }
      
      // 3. Другие администраторы получают уведомление, что профиль пользователя был обновлен
      const adminNotificationMatch = notification.content.match(/Профиль пользователя (.*?) был обновлён\./) || 
                                     notification.content.match(/User profile for (.*?) has been updated\./);
      if (adminNotificationMatch) {
        const userName = adminNotificationMatch[1] || "";
        return t('notifications.adminNotificationUserUpdated', {
          name: userName
        });
      }
      
      // 4. Старый формат для совместимости
      const userInfoMatch = notification.content.match(/User information has been updated for: (.*?)$/);
      if (userInfoMatch) {
        const userName = userInfoMatch[1] || "";
        return t('notifications.userUpdatedContent', {
          name: userName
        });
      }
      
      // Если не подходит ни один из шаблонов, возвращаем исходное содержимое
      return notification.content;
    }
    
    // Уведомления о расписании
    if (notification.title === "Schedule Changed" && notification.content.includes("Schedule has been changed")) {
      const scheduleInfo = notification.content.match(/Schedule has been changed: (.*?)$/)?.[1] || "";
      return t('notifications.scheduleChangedContent', {
        info: scheduleInfo
      });
    }
    
    // Если нет специального перевода, возвращаем исходное содержимое
    return notification.content;
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
      toast({
        title: t('error'),
        description: error instanceof Error ? error.message : t('unexpected_error'),
        variant: 'destructive',
      });
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
              variant="ghost"
              onClick={markAllAsRead}
              className="text-xs text-sidebar-foreground/80 hover:text-sidebar-foreground p-1 px-2 rounded-md hover:bg-sidebar-accent/10 border-none outline-none"
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
                      {t(`notifications.${notification.title.replace(/\s+/g, '')}`, t('notifications.titles.' + notification.title.replace(/\s+/g, ''), notification.title))}
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
                    {translateNotificationContent(notification)}
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
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation(); // Предотвращаем всплытие события клика
                          markAsRead(notification.id);
                        }}
                        className="text-xs text-sidebar-foreground/90 hover:text-sidebar-foreground hover:bg-sidebar-accent/10 rounded-md py-1 px-2 border-none outline-none"
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