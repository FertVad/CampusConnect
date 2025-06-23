import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { insertTaskSchema, type InsertTask, type UserSummary as SharedUserSummary } from '@shared/schema';
import { z } from 'zod';

export type UserSummary = SharedUserSummary;

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: 'new' | 'in_progress' | 'completed' | 'on_hold';
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
  updatedAt: string;
  dueDate: string | null;
  clientId: string;
  executorId: string;
  client?: { firstName: string; lastName: string };
  executor?: { firstName: string; lastName: string };
}

const taskFormSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']),
  status: z.enum(['new', 'in_progress', 'on_hold']),
  executorId: z.string(),
  dueDate: z.date().nullable().optional(),
});

export type TaskFormData = z.infer<typeof taskFormSchema>;

export function useTasks() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: users, isLoading: usersLoading } = useQuery<UserSummary[]>({
    queryKey: [user?.role === 'admin' ? '/api/users' : '/api/users/chat'],
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
    enabled: !!user,
  });

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'new',
      priority: 'medium',
      executorId: '',
      dueDate: null,
    },
  });

  const editForm = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'new',
      priority: 'medium',
      executorId: '',
      dueDate: null,
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: InsertTask) => {
      const result = await apiRequest('/api/tasks', 'POST', data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: t('task.created_success'),
        description: t('task.created_description'),
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || error?.error?.message || t('task.try_again');
      toast({
        title: t('task.error_creating'),
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const result = await apiRequest(`/api/tasks/${id}`, 'PUT', { status });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      // also refresh notifications when status changes
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/notifications'] });
      }, 500);
      toast({
        title: t('task.status_updated'),
        description: t('task.status_updated_description'),
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || error?.error?.message || t('task.try_again');
      toast({
        title: t('task.error_updating'),
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      const result = await apiRequest(`/api/tasks/${id}`, 'DELETE');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: t('task.deleted_success'),
        description: t('task.deleted_description'),
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || error?.error?.message || t('task.try_again');
      toast({
        title: t('task.error_deleting'),
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (data: {
      id: number;
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      dueDate?: string | null;
      executorId?: string;
    }) => {
      const { id, ...taskData } = data;
      const result = await apiRequest(`/api/tasks/${id}`, 'PUT', taskData);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      // invalidate notifications so new updates appear instantly
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      // perform a delayed refetch to ensure UI is up to date
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/notifications'] });
      }, 500);
      toast({
        title: t('task.updated'),
        description: t('task.updated_description'),
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || error?.error?.message || t('task.try_again');
      toast({
        title: t('task.error_updating'),
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  const createTask = (data: TaskFormData) => {
    if (!user?.id) {
      toast({
        title: t('task.error_creating'),
        description: t('auth.user_not_found'),
        variant: 'destructive',
      });
      return;
    }

    const taskData = {
      ...data,
      description: data.description || '',
      dueDate: data.dueDate ? data.dueDate.toISOString() : null,
      clientId: user?.id,
    } as InsertTask;

    createTaskMutation.mutate(taskData);
  };


  const editTask = (id: number, data: TaskFormData) => {
    const taskData = {
      id,
      title: data.title,
      description: data.description || '',
      status: data.status,
      priority: data.priority,
      dueDate: data.dueDate ? data.dueDate.toISOString() : null,
      executorId: data.executorId,
    };
    updateTaskMutation.mutate(taskData);
  };

  const changeStatus = (id: number, status: string) => {
    updateTaskStatusMutation.mutate({ id, status });
  };

  const removeTask = (id: number) => {
    deleteTaskMutation.mutate(id);
  };

  return {
    tasks,
    tasksLoading,
    users,
    usersLoading,
    form,
    editForm,
    createTask,
    editTask,
    changeStatus,
    removeTask,
    createTaskMutation,
    updateTaskMutation,
    updateTaskStatusMutation,
    deleteTaskMutation,
  };
}

