import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Menu, Search, MessageSquare, Bell, BellRing, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { apiRequest } from '@/lib/queryClient';
import { useTranslation } from 'react-i18next';

// Определение типа для уведомлений
interface Notification {
  id: number;
  userId: number;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  relatedId?: number | null;
  relatedType?: string | null;
}

const TopBar = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const { user, logoutMutation, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  // Получаем уведомления через API
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    enabled: !!user && isAuthenticated,
    refetchInterval: 60000, // Обновляем каждую минуту
  });
  
  // Вычисляем количество непрочитанных уведомлений
  const unreadCount = notifications.filter((notification: Notification) => !notification.isRead).length;
  
  // Запасной вариант для тестирования, если API не возвращает данные
  const testUnreadCount = 3;
  
  // Мутация для отметки одного уведомления как прочитанного
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: number) => 
      apiRequest('PATCH', `/api/notifications/${notificationId}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    }
  });

  // Мутация для отметки всех уведомлений как прочитанных
  const markAllAsReadMutation = useMutation({
    mutationFn: () => apiRequest('PATCH', '/api/notifications/read-all', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      setIsNotificationsOpen(false);
    }
  });
  
  // Обработчик для отметки одного уведомления как прочитанного
  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate(notificationId);
  };
  
  // Обработчик для отметки всех уведомлений как прочитанных
  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };
  
  // Закрытие выпадающего списка при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
    // This would control a mobile sidebar in a real implementation
  };
  
  return (
    <header className="bg-white shadow-sm z-10">
      <div className="px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        {/* Mobile Menu Button */}
        <div className="flex items-center md:hidden">
          <button 
            onClick={toggleSidebar}
            className="text-neutral-500 hover:text-neutral-700 focus:outline-none focus:text-neutral-700"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
        
        {/* Mobile Logo */}
        <div className="md:hidden flex items-center">
          <div className="bg-primary p-1.5 rounded-lg mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-lg font-medium font-heading text-neutral-700">EduPortal</h1>
        </div>
        
        {/* Search Bar (Hidden on mobile) */}
        <div className="flex-1 max-w-xl mx-8 hidden md:block">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-neutral-400" />
            </div>
            <input 
              type="text" 
              placeholder={t('common.search_placeholder')} 
              className="block w-full pl-10 pr-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        
        {/* Action Icons */}
        <div className="flex items-center space-x-4">
          {user && isAuthenticated && (
            <div className="relative inline-block cursor-pointer">
              <div 
                className="w-10 h-10 bg-primary/10 hover:bg-primary/20 transition-colors rounded-full flex items-center justify-center"
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              >
                {unreadCount > 0 ? (
                  <>
                    <BellRing className="h-6 w-6 text-primary" />
                    <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  </>
                ) : (
                  <Bell className="h-6 w-6 text-primary" />
                )}
              </div>
              
              {/* Выпадающий список уведомлений */}
              {isNotificationsOpen && (
                <div 
                  ref={notificationsRef}
                  className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg py-2 z-50 border border-gray-200"
                >
                  <div className="px-4 py-2 border-b border-gray-100">
                    <h3 className="text-sm font-medium text-gray-700">{t('notifications.title')}</h3>
                  </div>
                  
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center">
                        {t('notifications.no_notifications')}
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div 
                          key={notification.id}
                          className={`px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${!notification.isRead ? 'bg-primary/5' : ''}`}
                        >
                          <div className="flex items-start">
                            <div className={`flex-1 ${!notification.isRead ? 'font-medium' : ''}`}>
                              <p className="text-sm text-gray-800">{notification.title}</p>
                              <p className="text-xs text-gray-500 mt-1">{notification.content}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                {format(
                                  new Date(notification.createdAt), 
                                  'dd MMM, HH:mm', 
                                  { locale: t('common.locale') === 'ru' ? ru : enUS }
                                )}
                              </p>
                            </div>
                            {!notification.isRead && (
                              <button 
                                className="text-primary hover:text-primary/80 p-1"
                                onClick={() => handleMarkAsRead(notification.id)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {notifications.length > 0 && (
                    <div className="px-4 py-2 border-t border-gray-100">
                      <button 
                        className="text-xs text-primary hover:text-primary/80 font-medium"
                        onClick={handleMarkAllAsRead}
                      >
                        {t('notifications.mark_all_as_read')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Резервный вариант иконки уведомлений - обычная кнопка с яркими цветами */}
          {user && isAuthenticated && (
            <button className="relative p-2 bg-red-500 text-white rounded-full hidden">
              <Bell className="h-5 w-5" />
              {testUnreadCount > 0 && (
                <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-400 text-[10px] text-black font-bold">
                  {testUnreadCount}
                </span>
              )}
            </button>
          )}
          
          <Link href="/chat">
            <button className="text-neutral-500 hover:text-neutral-700 focus:outline-none">
              <MessageSquare className="h-6 w-6" />
            </button>
          </Link>
          
          <div className="border-l border-neutral-200 h-6 mx-2"></div>
          
          {/* User Profile */}
          <div className="hidden md:flex items-center">
            <img 
              src={`https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}&background=random`} 
              alt="User avatar" 
              className="h-8 w-8 rounded-full"
            />
            <div className="ml-2">
              <span className="text-sm font-medium text-neutral-700">
                {user?.firstName} {user?.lastName}
              </span>
            </div>
          </div>
          
          {/* Logout Button */}
          <button 
            onClick={handleLogout}
            className="text-sm text-neutral-500 hover:text-neutral-700"
          >
            {t('auth.logout')}
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
