import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileUp, FileDown, UserPlus, UserX, BookOpen, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

// Define the ActivityLog interface based on the schema
interface ActivityLog {
  id: number;
  userId: number;
  type: 'file_upload' | 'file_delete' | 'teacher_assign' | 'user_create' | 'user_delete' | 'subject_create' | 'schedule_change' | 'other';
  description: string;
  timestamp: Date;
  entityId: number | null;
  entityType: string | null;
  metadata: string | null;
}

const ActivityFeed: React.FC = () => {
  const { t, i18n } = useTranslation();
  
  const { data: activityLogs = [], isLoading, error } = useQuery<ActivityLog[]>({
    queryKey: ['/api/activity-logs'],
  });

  // Function to get icon based on activity type
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'file_upload':
        return <FileUp className="h-5 w-5 text-green-500" />;
      case 'file_delete':
        return <FileDown className="h-5 w-5 text-red-500" />;
      case 'user_create':
        return <UserPlus className="h-5 w-5 text-blue-500" />;
      case 'user_delete':
        return <UserX className="h-5 w-5 text-orange-500" />;
      case 'subject_create':
        return <BookOpen className="h-5 w-5 text-purple-500" />;
      case 'schedule_change':
        return <Calendar className="h-5 w-5 text-indigo-500" />;
      default:
        return <Badge className="h-5 w-5 bg-gray-300" />;
    }
  };

  // Function to format time in a user-friendly way
  const formatTime = (date: Date) => {
    try {
      if (!(date instanceof Date)) {
        date = new Date(date);
      }
      
      return formatDistanceToNow(date, { 
        addSuffix: true,
        locale: i18n.language === 'ru' ? ru : undefined 
      });
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Invalid date';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-heading">{t('dashboard.recentActivity')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="py-4 text-center text-neutral-500">
            {t('dashboard.loadingActivity')}
          </div>
        ) : error ? (
          <div className="py-4 text-center text-red-500">
            {t('dashboard.errorLoadingActivity')}
          </div>
        ) : activityLogs.length === 0 ? (
          <div className="py-4 text-center text-neutral-500">
            {t('dashboard.noRecentActivity')}
          </div>
        ) : (
          activityLogs.map((log) => (
            <div key={log.id} className="flex items-start space-x-3 p-2 rounded-md hover:bg-neutral-50 transition-colors">
              <div className="mt-1">
                {getActivityIcon(log.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-800 break-words">
                  {log.description}
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  {formatTime(log.timestamp)}
                </p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityFeed;