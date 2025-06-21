import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { supabase, setupRealtimeSubscription } from '@/lib/supabase';
import type { Notification } from '@/types/notifications';
import { useAuth } from '@/hooks/use-auth';

export function useNotifications() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch notifications for the current user
  const {
    data: notifications = [],
    isLoading,
    error,
    refetch,
  } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      return await apiRequest('/api/notifications') as Notification[];
    },
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 0,
    cacheTime: 1000 * 60 * 2,
  });

  // Mark a single notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      await apiRequest(`/api/notifications/${notificationId}/read`, 'PATCH');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  // Mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('/api/notifications/read-all', 'PATCH');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  // Delete a notification
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      await apiRequest(`/api/notifications/${notificationId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    let subscription: any = null;

    const setupSubscription = async () => {
      const session = await setupRealtimeSubscription(() => {
        subscription = supabase
          .channel('notifications')
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `userId=eq.${user?.publicId}`,
          }, () => {
            console.log('New notification received via realtime');
            queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
          })
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `userId=eq.${user?.publicId}`,
          }, () => {
            console.log('Notification updated via realtime');
            queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
          })
          .subscribe();
      });
      return session;
    };

    if (user?.publicId) {
      setupSubscription();
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [user?.publicId, queryClient]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    refetch,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    deleteNotification: deleteNotificationMutation.mutate,
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
    isDeletingNotification: deleteNotificationMutation.isPending,
  };
}
