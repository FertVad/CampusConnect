import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { insertTaskSchema, type InsertTask } from '@shared/schema';

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: 'new' | 'in_progress' | 'completed' | 'on_hold';
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
  updatedAt: string;
  dueDate: string | null;
  clientId: number;
  executorId: number;
  client?: { firstName: string; lastName: string };
  executor?: { firstName: string; lastName: string };
}

export type TaskFormData = InsertTask;

export function useTasks() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: users, isLoading: usersLoading } = useQuery<{ id: number; firstName: string; lastName: string; role: string }[]>({
    queryKey: [user?.role === 'admin' ? '/api/users' : '/api/users/chat'],
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
    enabled: !!user,
  });

  const form = useForm<TaskFormData>({
    resolver: zodResolver(insertTaskSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'new',
      priority: 'medium',
      executorId: 0,
      dueDate: null,
    },
  });

  const editForm = useForm<TaskFormData>({
    resolver: zodResolver(insertTaskSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'new',
      priority: 'medium',
      executorId: 0,
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
      executorId?: number;
    }) => {
      const { id, ...taskData } = data;
      const result = await apiRequest(`/api/tasks/${id}`, 'PUT', taskData);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
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
      clientId: user.id,
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

