import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/use-auth';


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
import { TextField } from '@/components/forms/TextField';
import { TextareaField } from '@/components/forms/TextareaField';
import { SelectField } from '@/components/forms/SelectField';
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
import { CalendarIcon, CheckCircle, Clock, AlertCircle, PauseCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import TaskCard from '@/components/tasks/TaskCard';
import { useTasks, Task, TaskFormData } from './useTasks';

// Основной компонент страницы задач
const TasksPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const {
    tasks,
    tasksLoading,
    users,
    form,
    editForm,
    createTask,
    editTask,
    changeStatus,
    removeTask,
    createTaskMutation,
    updateTaskMutation,
    deleteTaskMutation,
  } = useTasks();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const filteredTasks = statusFilter ? tasks?.filter((task) => task.status === statusFilter) : tasks;

  const handleStatusChange = (id: number, status: string) => {
    changeStatus(id, status);
  };

  const handleEditClick = (task: Task) => {
    setCurrentTask(task);
    editForm.reset({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      executorId: task.executorId,
      dueDate: task.dueDate ? new Date(task.dueDate) : null,
    });
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (task: Task) => {
    setCurrentTask(task);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (currentTask) {
      removeTask(currentTask.id);
    }
  };

  const handleViewDetails = (task: Task) => {
    setCurrentTask(task);
    setDetailDialogOpen(true);
  };

  const onEditSubmit = (data: TaskFormData) => {
    if (!currentTask) return;
    editTask(currentTask.id, data);
  };

  const onSubmit = (data: TaskFormData) => {
    createTask(data);
  };

  useEffect(() => {
    if (createTaskMutation.isSuccess) {
      setCreateDialogOpen(false);
      form.reset();
    }
  }, [createTaskMutation.isSuccess]);

  useEffect(() => {
    if (updateTaskMutation.isSuccess) {
      setEditDialogOpen(false);
      editForm.reset();
    }
  }, [updateTaskMutation.isSuccess]);

  useEffect(() => {
    if (deleteTaskMutation.isSuccess) {
      setDeleteDialogOpen(false);
      setCurrentTask(null);
    }
  }, [deleteTaskMutation.isSuccess]);


  return (
    <div className="container py-8 px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold font-heading">{t('task.manager')}</h1>
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
                <TextField control={form.control} name="title" label={t('task.title')} />
                
                <TextareaField control={form.control} name="description" label={t('task.description')} />
                
                <div className="grid grid-cols-2 gap-4">
                  <SelectField
                    control={form.control}
                    name="priority"
                    label={t('task.priority.label')}
                    placeholder={t('task.priority.select')}
                    options={[
                      { value: 'high', label: t('task.priority.high') },
                      { value: 'medium', label: t('task.priority.medium') },
                      { value: 'low', label: t('task.priority.low') }
                    ]}
                  />
                  
                  <SelectField
                    control={form.control}
                    name="status"
                    label={t('task.status.label')}
                    placeholder={t('task.status.select')}
                    options={[
                      { value: 'new', label: t('task.status.new') },
                      { value: 'in_progress', label: t('task.status.in_progress') },
                      { value: 'on_hold', label: t('task.status.on_hold') }
                    ]}
                  />
                </div>
                
                <SelectField
                  control={form.control}
                  name="executorId"
                  label={t('task.assignee')}
                  placeholder={t('task.select_assignee')}
                  options={(users || []).map(u => ({
                    value: u.id,
                    label: `${u.firstName} ${u.lastName} (${t(`role.${u.role}`)})`
                  }))}
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
              <TextField control={editForm.control} name="title" label={t('task.title')} />
              
              <TextareaField control={editForm.control} name="description" label={t('task.description')} />
              
              <div className="grid grid-cols-2 gap-4">
                <SelectField
                  control={editForm.control}
                  name="priority"
                  label={t('task.priority.label')}
                  placeholder={t('task.priority.select')}
                  options={[
                    { value: 'high', label: t('task.priority.high') },
                    { value: 'medium', label: t('task.priority.medium') },
                    { value: 'low', label: t('task.priority.low') }
                  ]}
                />
                
                <SelectField
                  control={editForm.control}
                  name="status"
                  label={t('task.status.label')}
                  placeholder={t('task.status.select')}
                  options={[
                    { value: 'new', label: t('task.status.new') },
                    { value: 'in_progress', label: t('task.status.in_progress') },
                    { value: 'on_hold', label: t('task.status.on_hold') },
                    { value: 'completed', label: t('task.status.completed') }
                  ]}
                />
              </div>
              
              <SelectField
                control={editForm.control}
                name="executorId"
                label={t('task.assignee')}
                placeholder={t('task.select_assignee')}
                options={(users || []).map(u => ({
                  value: u.id,
                  label: `${u.firstName} ${u.lastName} (${t(`role.${u.role}`)})`
                }))}
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