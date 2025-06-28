import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export interface UserPreferences {
  theme?: string;
  language?: string;
  notificationsEnabled?: boolean;
  assignmentNotifications?: boolean;
  gradeNotifications?: boolean;
  taskNotifications?: boolean;
  systemNotifications?: boolean;
  soundNotifications?: boolean;
  emailNotifications?: boolean;
  browserNotifications?: boolean;
}

export function useUserPreferences({ enabled = true } = {}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['/api/user-preferences'],
    queryFn: async () =>
      (await apiRequest('/api/user-preferences')) as UserPreferences,
    enabled,
  });

  const mutation = useMutation({
    mutationFn: async (prefs: Partial<UserPreferences>) =>
      (await apiRequest('/api/user-preferences', 'PUT', prefs)) as UserPreferences,
    onMutate: async (prefs: Partial<UserPreferences>) => {
      await queryClient.cancelQueries({ queryKey: ['/api/user-preferences'] });
      const previous = queryClient.getQueryData<UserPreferences>(['/api/user-preferences']);
      queryClient.setQueryData(['/api/user-preferences'], {
        ...previous,
        ...prefs,
      });
      return { previous };
    },
    onError: (error: Error, _prefs, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['/api/user-preferences'], context.previous);
      }
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['/api/user-preferences'], updated);
      toast({ title: 'Success', description: 'Settings updated successfully' });
    },
  });

  return {
    preferences: data,
    isLoading,
    updatePreferences: mutation.mutateAsync,
  };
}
