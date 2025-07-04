import React from 'react';
import { Notification } from '@shared/schema';
import { getRelativeTime } from '@/lib/utils';
import { 
  Bell, 
  MessageSquare, 
  FileText, 
  CheckCircle, 
  File
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationListProps {
  notifications: Notification[];
  onMarkAsRead?: (id: number) => void;
  onMarkAllAsRead?: () => void;
  onViewAll?: () => void;
}

const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onViewAll
}) => {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
      case 'chat':
        return <MessageSquare className="h-5 w-5 text-neutral-400" />;
      case 'assignment':
        return <FileText className="h-5 w-5 text-neutral-400" />;
      case 'request':
        return <CheckCircle className="h-5 w-5 text-neutral-400" />;
      case 'document':
        return <File className="h-5 w-5 text-neutral-400" />;
      default:
        return <Bell className="h-5 w-5 text-neutral-400" />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-100">
      <div className="px-6 py-4 border-b border-neutral-100 flex justify-between items-center">
        <h2 className="text-lg font-medium font-heading text-neutral-700">Notifications</h2>
        <button 
          className="text-xs font-medium text-primary hover:text-primary-dark"
          onClick={onMarkAllAsRead}
        >
          Mark All as Read
        </button>
      </div>
      
      <div className="p-4 max-h-80 overflow-y-auto">
        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="text-center py-4 text-neutral-500">
              No notifications to display
            </div>
          ) : (
            notifications.map((notification) => (
              <div 
                key={notification.id}
                className={cn(
                  "flex p-3 rounded-lg cursor-pointer",
                  !notification.isRead && "bg-primary-light bg-opacity-5 border-l-4 border-primary"
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex-shrink-0 mr-3">
                  {getNotificationIcon(notification.relatedType || 'default')}
                </div>
                <div>
                  <p className="text-sm text-neutral-700">{notification.content}</p>
                  <p className="text-xs text-neutral-500 mt-1">{getRelativeTime(notification.createdAt)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {notifications.length > 0 && (
        <div className="px-4 py-3 bg-neutral-50 rounded-b-lg text-center">
          <button 
            className="text-sm font-medium text-primary hover:text-primary-dark"
            onClick={onViewAll}
          >
            View All Notifications
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationList;
