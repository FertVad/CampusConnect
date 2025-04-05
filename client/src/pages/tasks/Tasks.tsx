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
const TaskCard = ({ task, onStatusChange }: { task: Task, onStatusChange: (id: number, status: string) => void }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isExecutor = user?.id === task.executorId;
  
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
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    return format(date, 'PP');
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{task.title}</CardTitle>
          <div className="flex gap-2">
            {getPriorityBadge(task.priority)}
            {getStatusBadge(task.status)}
          </div>
        </div>
        <CardDescription>
          <span className="font-medium">
            {t('task.assigned_to')}: {task.executor?.firstName} {task.executor?.lastName}
          </span>
          {task.dueDate && (
            <div className="text-sm mt-1">
              <span className="text-muted-foreground">{t('task.due_date')}: {formatDate(task.dueDate)}</span>
            </div>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">
          {task.description || t('task.no_description')}
        </p>
      </CardContent>
      <CardFooter className="flex justify-between pt-2">
        <div className="text-xs text-muted-foreground">
          {t('task.created')}: {formatDate(task.createdAt)}
        </div>
        {isExecutor && task.status !== 'completed' && (
          <Select
            defaultValue={task.status}
            onValueChange={(value) => onStatusChange(task.id, value)}
          >
            <SelectTrigger className="w-[160px]">
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

  // Обработчик изменения статуса
  const handleStatusChange = (id: number, status: string) => {
    updateTaskStatusMutation.mutate({ id, status });
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
          <DialogContent className="sm:max-w-[500px]">
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
          filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} onStatusChange={handleStatusChange} />
          ))
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