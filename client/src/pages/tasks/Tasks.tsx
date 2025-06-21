import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/use-auth';


import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, AlertCircle, PauseCircle } from 'lucide-react';
import TaskCard from '@/components/tasks/TaskCard';
import CreateTaskDialog from './CreateTaskDialog';
import EditTaskDialog from './EditTaskDialog';
import DeleteTaskDialog from './DeleteTaskDialog';
import TaskDetailsDialog from './TaskDetailsDialog';
import { useTasks, Task, TaskFormData } from './useTasks';

// Основной компонент страницы задач
const TasksPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
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

  const handleTaskCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    setCreateDialogOpen(false);
    form.reset();
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
        <CreateTaskDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          form={form}
          loading={createTaskMutation.isPending}
          users={users}
          onTaskCreated={handleTaskCreated}
        />
      </div>

        {/* Диалог редактирования задачи */}
        <EditTaskDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          form={editForm}
          onSubmit={onEditSubmit}
          loading={updateTaskMutation.isPending}
          users={users}
        />

        {/* Диалог подтверждения удаления задачи */}
        <DeleteTaskDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          task={currentTask}
          onConfirm={handleDeleteConfirm}
          loading={deleteTaskMutation.isPending}
        />
      
        {/* Диалог просмотра деталей задачи */}
        <TaskDetailsDialog
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          task={currentTask}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
        />

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