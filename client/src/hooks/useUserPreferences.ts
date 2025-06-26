import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export interface UserPreferences {
  theme?: string;
  language?: string;
  emailNotifications?: boolean;
  browserNotifications?: boolean;
  soundNotifications?: boolean;
}

export function useUserPreferences() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['/api/user-preferences'],
    queryFn: async () =>
      (await apiRequest('/api/user-preferences')) as UserPreferences,
  });

  const mutation = useMutation({
    mutationFn: async (prefs: Partial<UserPreferences>) =>
      (await apiRequest('/api/user-preferences', 'PUT', prefs)) as UserPreferences,
    onSuccess: (updated) => {
      queryClient.setQueryData(['/api/user-preferences'], updated);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    preferences: data,
    isLoading,
    updatePreferences: mutation.mutate,
  };
}
