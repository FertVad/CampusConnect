import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/use-auth';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, CheckCircle, Clock, XCircle, AlertCircle, PauseCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';

// Тип для задачи
type Task = {
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
};

// Схема валидации формы создания задачи
const taskFormSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters long" }),
  description: z.string().optional(),
  status: z.enum(['new', 'in_progress', 'completed', 'on_hold']),
  priority: z.enum(['high', 'medium', 'low']),
  dueDate: z.date().optional().nullable(),
  executorId: z.number().positive(),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

// Компонент карточки задачи
const TaskCard = ({ 
  task, 
  onStatusChange,
  onEditClick,
  onDeleteClick,
  onViewDetails
}: { 
  task: Task, 
  onStatusChange: (id: number, status: string) => void,
  onEditClick?: (task: Task) => void,
  onDeleteClick?: (task: Task) => void,
  onViewDetails?: (task: Task) => void
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isExecutor = user?.id === task.executorId;
  const isClient = user?.id === task.clientId;
  const isCreator = isClient; // Creator is the client
  const isAdmin = user?.role === 'admin';
  
  // Получаем статус и цвет
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">{t('task.status.new')}</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">{t('task.status.in_progress')}</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">{t('task.status.completed')}</Badge>;
      case 'on_hold':
        return <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">{t('task.status.on_hold')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">{t('task.priority.high')}</Badge>;
      case 'medium':
        return <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">{t('task.priority.medium')}</Badge>;
      case 'low':
        return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">{t('task.priority.low')}</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  // Получаем иконку статуса
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'on_hold':
        return <PauseCircle className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  // Форматирование даты
  const formatDate = (dateString: string | null) => {
    if (!dateString) return t('task.no_date');
    const date = new Date(dateString);
    return format(date, 'PP');
  };

  // Информация о постановщике и исполнителе
  const clientName = task.client 
    ? `${task.client.firstName} ${task.client.lastName}` 
    : t('task.not_assigned');
    
  const executorName = task.executor 
    ? `${task.executor.firstName} ${task.executor.lastName}` 
    : t('task.not_assigned');

  return (
    <Card 
      className="h-full flex flex-col bg-gray-900 border border-gray-800 shadow-md cursor-pointer hover:border-primary transition-colors duration-200"
      onClick={(e) => {
        // Предотвращаем всплытие события с Select и кнопок
        if (
          e.target instanceof HTMLElement && 
          (e.target.closest('button') || e.target.closest('[role="combobox"]'))
        ) {
          return;
        }
        
        // Открываем детали задачи
        onViewDetails && onViewDetails(task);
      }}
    >
      <CardHeader className="pb-2 space-y-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg truncate" title={task.title}>{task.title}</CardTitle>
          <div className="flex gap-1">
            {getPriorityBadge(task.priority)}
            {getStatusBadge(task.status)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm mb-3 line-clamp-3" title={task.description || t('task.no_description')}>
          {task.description || t('task.no_description')}
        </p>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>{t('task.client')}:</span>
            <span className="font-medium text-foreground">{clientName}</span>
          </div>
          
          <div className="flex items-center justify-between text-muted-foreground">
            <span>{t('task.executor')}:</span>
            <span className="font-medium text-foreground">{executorName}</span>
          </div>
          
          {task.dueDate && (
            <div className="flex items-center justify-between text-muted-foreground">
              <span>{t('task.due_date')}:</span>
              <span className="font-medium text-foreground">{formatDate(task.dueDate)}</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2 pt-2 border-t border-gray-800">
        <div className="flex justify-between w-full items-center">
          <div className="text-xs text-muted-foreground">
            {t('task.created')}: {formatDate(task.createdAt)}
          </div>
          <div className="text-xs text-muted-foreground">
            ID: {task.id}
          </div>
        </div>
        
        <div className="flex flex-row gap-2 w-full">
          {/* Status dropdown for executors and admins */}
          {(isExecutor || isAdmin) && (
            <Select
              defaultValue={task.status}
              onValueChange={(value) => onStatusChange(task.id, value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('task.change_status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-500" />
                    {t('task.status.new')}
                  </div>
                </SelectItem>
                <SelectItem value="in_progress">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    {t('task.status.in_progress')}
                  </div>
                </SelectItem>
                <SelectItem value="completed">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    {t('task.status.completed')}
                  </div>
                </SelectItem>
                <SelectItem value="on_hold">
                  <div className="flex items-center gap-2">
                    <PauseCircle className="h-4 w-4 text-gray-500" />
                    {t('task.status.on_hold')}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          )}
          
          {/* Edit button only for task creators (clients) and admins */}
          {(isCreator || isAdmin) && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-shrink-0 h-10" 
                title={t('task.edit_task')} 
                onClick={() => onEditClick && onEditClick(task)}
              >
                <span className="sr-only">{t('task.edit_task')}</span>
                {/* Edit icon */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
              </Button>
              
              {/* Delete button only for task creators (clients) and admins */}
              <Button 
                variant="destructive" 
                size="sm" 
                className="flex-shrink-0 h-10" 
                title={t('task.delete_task')} 
                onClick={() => onDeleteClick && onDeleteClick(task)}
              >
                <span className="sr-only">{t('task.delete_task')}</span>
                {/* Trash icon */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
              </Button>
            </>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

// Основной компонент страницы задач
const TasksPage = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Получаем список пользователей для назначения исполнителей
  const { data: users, isLoading: usersLoading } = useQuery<{ id: number, firstName: string, lastName: string, role: string }[]>({
    queryKey: ['/api/users'],
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 минут
  });

  // Получаем задачи текущего пользователя в зависимости от роли
  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
    enabled: !!user
  });

  // Фильтрация задач по статусу
  const filteredTasks = statusFilter 
    ? tasks?.filter(task => task.status === statusFilter) 
    : tasks;

  // Форма создания новой задачи
  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'new',
      priority: 'medium',
      executorId: 0,
      dueDate: null
    }
  });
  
  // Форма редактирования задачи
  const editForm = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'new',
      priority: 'medium',
      executorId: 0,
      dueDate: null
    }
  });

  // Мутация для создания новой задачи
  const createTaskMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      status: string;
      priority: string;
      dueDate: string | null;
      executorId: number;
      clientId: number;
    }) => {
      try {
        console.log('Sending API request with data:', data);
        const result = await apiRequest('POST', '/api/tasks', data);
        console.log('API response:', result);
        return result;
      } catch (error) {
        console.error('API error details:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('Task created successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: t('task.created_success'),
        description: t('task.created_description'),
      });
      setCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      console.error('Error creating task:', error);
      // Показываем более подробную информацию об ошибке, если она доступна
      const errorMessage = error?.message || error?.error?.message || t('task.try_again');
      toast({
        title: t('task.error_creating'),
        description: errorMessage,
        variant: 'destructive',
      });
    }
  });

  // Мутация для обновления статуса задачи
  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      try {
        console.log(`Updating task status: ID=${id}, status=${status}`);
        const result = await apiRequest('PUT', `/api/tasks/${id}`, { status });
        console.log('Task update response:', result);
        return result;
      } catch (error) {
        console.error('API error details for task update:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: t('task.status_updated'),
        description: t('task.status_updated_description'),
      });
    },
    onError: (error: any) => {
      console.error('Error updating task status:', error);
      // Показываем более детальную информацию об ошибке
      const errorMessage = error?.message || error?.error?.message || t('task.try_again');
      toast({
        title: t('task.error_updating'),
        description: errorMessage,
        variant: 'destructive',
      });
    }
  });
  
  // Мутация для удаления задачи
  const deleteTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      try {
        console.log(`Deleting task with ID: ${id}`);
        const result = await apiRequest('DELETE', `/api/tasks/${id}`);
        console.log('Task deletion response:', result);
        return result;
      } catch (error) {
        console.error('API error details for task deletion:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: t('task.deleted_success'),
        description: t('task.deleted_description'),
      });
      setDeleteDialogOpen(false);
      setCurrentTask(null);
    },
    onError: (error: any) => {
      console.error('Error deleting task:', error);
      const errorMessage = error?.message || error?.error?.message || t('task.try_again');
      toast({
        title: t('task.error_deleting'),
        description: errorMessage,
        variant: 'destructive',
      });
    }
  });

  // Мутация для полного обновления задачи (для создателей и админов)
  const updateTaskMutation = useMutation({
    mutationFn: async (data: {
      id: number,
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      dueDate?: string | null;
      executorId?: number;
    }) => {
      try {
        const { id, ...taskData } = data;
        console.log(`Updating full task: ID=${id}`, taskData);
        const result = await apiRequest('PUT', `/api/tasks/${id}`, taskData);
        console.log('Full task update response:', result);
        return result;
      } catch (error) {
        console.error('API error details for full task update:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: t('task.updated'),
        description: t('task.updated_description'),
      });
      // Close the edit dialog
      setEditDialogOpen(false);
      // Reset edit form
      editForm.reset();
    },
    onError: (error: any) => {
      console.error('Error updating task:', error);
      const errorMessage = error?.message || error?.error?.message || t('task.try_again');
      toast({
        title: t('task.error_updating'),
        description: errorMessage,
        variant: 'destructive',
      });
    }
  });

  // Обработчик изменения статуса
  const handleStatusChange = (id: number, status: string) => {
    updateTaskStatusMutation.mutate({ id, status });
  };
  
  // Обработчик для открытия диалога редактирования задачи
  const handleEditClick = (task: Task) => {
    console.log('Opening edit dialog for task:', task);
    
    // Установить текущую задачу
    setCurrentTask(task);
    
    // Заполнить форму существующими данными
    editForm.reset({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      executorId: task.executorId,
      dueDate: task.dueDate ? new Date(task.dueDate) : null
    });
    
    // Открыть диалог
    setEditDialogOpen(true);
  };
  
  // Обработчик для открытия диалога удаления задачи
  const handleDeleteClick = (task: Task) => {
    console.log('Opening delete dialog for task:', task);
    setCurrentTask(task);
    setDeleteDialogOpen(true);
  };
  
  // Обработчик подтверждения удаления задачи
  const handleDeleteConfirm = () => {
    if (!currentTask?.id) {
      console.error('No current task to delete');
      return;
    }
    
    deleteTaskMutation.mutate(currentTask.id);
  };
  
  // Обработчик для просмотра деталей задачи
  const handleViewDetails = (task: Task) => {
    console.log('Opening details dialog for task:', task);
    setCurrentTask(task);
    setDetailDialogOpen(true);
  };
  
  // Обработчик отправки формы редактирования
  const onEditSubmit = (data: TaskFormData) => {
    if (!currentTask?.id) {
      console.error('No current task to edit');
      return;
    }
    
    // Проверяем наличие ошибок
    if (editForm.formState.errors && Object.keys(editForm.formState.errors).length > 0) {
      console.log('Edit form validation errors:', editForm.formState.errors);
      return;
    }
    
    // Создаем объект для обновления
    const taskData = {
      id: currentTask.id,
      title: data.title,
      description: data.description || '',
      status: data.status,
      priority: data.priority,
      dueDate: data.dueDate ? data.dueDate.toISOString() : null,
      executorId: data.executorId
    };
    
    console.log('Submitting edit task data:', taskData);
    updateTaskMutation.mutate(taskData);
  };

  // Обработчик отправки формы создания задачи
  const onSubmit = (data: TaskFormData) => {
    // Проверяем наличие ошибок
    if (form.formState.errors && Object.keys(form.formState.errors).length > 0) {
      console.log('Form validation errors:', form.formState.errors);
      return; // Прерываем отправку при наличии ошибок
    }
    
    // Проверяем критические данные
    if (!user?.id) {
      console.log('User ID is missing');
      toast({
        title: t('task.error_creating'),
        description: t('auth.user_not_found'),
        variant: 'destructive',
      });
      return;
    }
    
    // Преобразуем дату в ISO-строку и создаем объект с типами, которые ожидает мутация
    const taskData = {
      title: data.title,
      description: data.description || '',
      status: data.status,
      priority: data.priority,
      dueDate: data.dueDate ? data.dueDate.toISOString() : null,
      executorId: data.executorId,
      clientId: user.id // текущий пользователь становится клиентом задачи
    };
    
    console.log('Submitting task data:', taskData);
    createTaskMutation.mutate(taskData);
  };

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('task.manager')}</h1>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>{t('task.create_new')}</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('task.new_task')}</DialogTitle>
              <DialogDescription>
                {t('task.new_task_description')}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('task.title')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('task.description')}</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('task.priority.label')}</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('task.priority.select')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="high">{t('task.priority.high')}</SelectItem>
                            <SelectItem value="medium">{t('task.priority.medium')}</SelectItem>
                            <SelectItem value="low">{t('task.priority.low')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('task.status.label')}</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('task.status.select')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="new">{t('task.status.new')}</SelectItem>
                            <SelectItem value="in_progress">{t('task.status.in_progress')}</SelectItem>
                            <SelectItem value="on_hold">{t('task.status.on_hold')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="executorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('task.assignee')}</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value ? field.value.toString() : undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('task.select_assignee')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users && users.length > 0 ? (
                            users.map((user) => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                {user.firstName} {user.lastName} ({t(`role.${user.role}`)})
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no_users" disabled>{t('task.no_users_available')}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{t('task.due_date')}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>{t('task.pick_date')}</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="submit" disabled={createTaskMutation.isPending}>{t('task.create')}</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Диалог редактирования задачи */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('task.edit_task')}</DialogTitle>
            <DialogDescription>
              {t('task.edit_task_description')}
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('task.title')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('task.description')}</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('task.priority.label')}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('task.priority.select')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="high">{t('task.priority.high')}</SelectItem>
                          <SelectItem value="medium">{t('task.priority.medium')}</SelectItem>
                          <SelectItem value="low">{t('task.priority.low')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('task.status.label')}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('task.status.select')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="new">{t('task.status.new')}</SelectItem>
                          <SelectItem value="in_progress">{t('task.status.in_progress')}</SelectItem>
                          <SelectItem value="on_hold">{t('task.status.on_hold')}</SelectItem>
                          <SelectItem value="completed">{t('task.status.completed')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={editForm.control}
                name="executorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('task.assignee')}</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value ? field.value.toString() : undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('task.select_assignee')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users && users.length > 0 ? (
                          users.map((user) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.firstName} {user.lastName} ({t(`role.${user.role}`)})
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no_users" disabled>{t('task.no_users_available')}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t('task.due_date')}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>{t('task.pick_date')}</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit" disabled={updateTaskMutation.isPending}>{t('task.save')}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Диалог подтверждения удаления задачи */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t('task.delete_task')}</DialogTitle>
            <DialogDescription>
              {t('task.confirm_delete')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {currentTask && (
              <div>
                <p className="font-semibold">{currentTask.title}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {currentTask.description || t('task.no_description')}
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              {t('common.actions.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteTaskMutation.isPending}
            >
              {t('task.delete_task')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Диалог просмотра деталей задачи */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {currentTask?.title}
            </DialogTitle>
            <div className="flex flex-wrap gap-2 mt-2">
              {currentTask && (
                <>
                  {(() => {
                    switch (currentTask.priority) {
                      case 'high':
                        return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">{t('task.priority.high')}</Badge>;
                      case 'medium':
                        return <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">{t('task.priority.medium')}</Badge>;
                      case 'low':
                        return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">{t('task.priority.low')}</Badge>;
                      default:
                        return <Badge variant="outline">{currentTask.priority}</Badge>;
                    }
                  })()}
                  {(() => {
                    switch (currentTask.status) {
                      case 'new':
                        return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">{t('task.status.new')}</Badge>;
                      case 'in_progress':
                        return <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">{t('task.status.in_progress')}</Badge>;
                      case 'completed':
                        return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">{t('task.status.completed')}</Badge>;
                      case 'on_hold':
                        return <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">{t('task.status.on_hold')}</Badge>;
                      default:
                        return <Badge variant="outline">{currentTask.status}</Badge>;
                    }
                  })()}
                </>
              )}
            </div>
          </DialogHeader>
          
          {currentTask && (
            <div className="py-4 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">{t('task.description')}</h3>
                <p className="mt-1 whitespace-pre-line">
                  {currentTask.description || t('task.no_description')}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">{t('task.client')}</h3>
                  <p className="font-medium">
                    {currentTask.client 
                      ? `${currentTask.client.firstName} ${currentTask.client.lastName}` 
                      : t('task.not_assigned')}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">{t('task.executor')}</h3>
                  <p className="font-medium">
                    {currentTask.executor 
                      ? `${currentTask.executor.firstName} ${currentTask.executor.lastName}` 
                      : t('task.not_assigned')}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">{t('task.created')}</h3>
                  <p className="font-medium">{format(new Date(currentTask.createdAt), 'PPP, HH:mm')}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">{t('task.updated')}</h3>
                  <p className="font-medium">{format(new Date(currentTask.updatedAt), 'PPP, HH:mm')}</p>
                </div>
              </div>
              
              {currentTask.dueDate && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">{t('task.due_date')}</h3>
                  <p className="font-medium">{format(new Date(currentTask.dueDate), 'PPP')}</p>
                </div>
              )}
              
              <div className="pt-2">
                <p className="text-xs text-muted-foreground">
                  ID: {currentTask.id}
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            {currentTask && (user?.id === currentTask.clientId || user?.role === 'admin') && (
              <>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setDetailDialogOpen(false);
                    handleEditClick(currentTask);
                  }}
                >
                  {t('task.edit_task')}
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => {
                    setDetailDialogOpen(false);
                    handleDeleteClick(currentTask);
                  }}
                >
                  {t('task.delete_task')}
                </Button>
              </>
            )}
            <Button onClick={() => setDetailDialogOpen(false)}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Фильтры */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={statusFilter === null ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(null)}
          >
            {t('task.all')}
          </Button>
          <Button
            variant={statusFilter === 'new' ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter('new')}
            className="flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4" />
            {t('task.status.new')}
          </Button>
          <Button
            variant={statusFilter === 'in_progress' ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter('in_progress')}
            className="flex items-center gap-2"
          >
            <Clock className="h-4 w-4" />
            {t('task.status.in_progress')}
          </Button>
          <Button
            variant={statusFilter === 'completed' ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter('completed')}
            className="flex items-center gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            {t('task.status.completed')}
          </Button>
          <Button
            variant={statusFilter === 'on_hold' ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter('on_hold')}
            className="flex items-center gap-2"
          >
            <PauseCircle className="h-4 w-4" />
            {t('task.status.on_hold')}
          </Button>
        </div>
      </div>

      {/* Содержимое */}
      <div>
        {tasksLoading ? (
          <div className="text-center py-8">{t('task.loading')}</div>
        ) : filteredTasks && filteredTasks.length > 0 ? (
          <div className="cards-container grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTasks.map((task) => (
              <div key={task.id} className="h-full">
                <TaskCard 
                  task={task} 
                  onStatusChange={handleStatusChange} 
                  onEditClick={handleEditClick}
                  onDeleteClick={handleDeleteClick}
                  onViewDetails={handleViewDetails}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">{t('task.no_tasks_found')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TasksPage;