import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

// Интерфейс для данных задачи
export interface TaskDetail {
  id: number;
  title: string;
  description?: string;
  status: 'new' | 'in_progress' | 'completed' | 'on_hold';
  createdAt: string;
  updatedAt?: string;
  dueDate?: string;
  clientId?: number;
  executorId?: number;
  creatorName?: string;
  executorName?: string;
  priority?: 'high' | 'medium' | 'low';
}

interface TaskDetailsModalProps {
  task: TaskDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange?: (taskId: number, status: string) => void;
  onAfterStatusChange?: () => void;
  userId: number;
}

const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({ 
  task, 
  open, 
  onOpenChange,
  onStatusChange,
  onAfterStatusChange,
  userId
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Получение статуса задачи в виде текста
  const getStatusText = (status: string) => {
    switch (status) {
      case 'in_progress': 
        return t('task.status.inProgress', 'В процессе');
      case 'completed': 
        return t('task.status.completed', 'Выполнено');
      case 'on_hold': 
        return t('task.status.onHold', 'На паузе');
      default: 
        return t('task.status.new', 'Новая');
    }
  };

  // Получение класса для статуса
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'new':
        return "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800";
      case 'in_progress':
        return "bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-950/50 dark:text-yellow-400 dark:border-yellow-800";
      case 'completed':
        return "bg-green-50 text-green-600 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-800";
      case 'on_hold':
        return "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700";
      default:
        return "";
    }
  };
  
  // Получение класса для приоритета
  const getPriorityBadgeClass = (priority: string = 'medium') => {
    switch (priority) {
      case 'high':
        return "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800";
      case 'medium':
        return "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-800";
      case 'low':
        return "bg-green-50 text-green-600 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-800";
      default:
        return "";
    }
  };

  // Форматирование даты
  const formatDateString = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      // Для русской локализации
      return format(date, 'PPP', { locale: ru });
    } catch (e) {
      return dateString;
    }
  };
  
  // Форматирование даты и времени
  const formatDateTimeString = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      // Для русской локализации с временем
      return format(date, 'PPP, HH:mm', { locale: ru });
    } catch (e) {
      return dateString;
    }
  };

  // Обработчик смены статуса задачи на "Выполнено"
  const handleMarkAsCompleted = async () => {
    if (!task) return;
    
    try {
      setIsUpdating(true);
      const response = await apiRequest('PATCH', `/api/tasks/${task.id}/status`, {
        status: 'completed'
      });

      if (!response.ok) {
        throw new Error(t('task.statusUpdateFailed', 'Не удалось обновить статус задачи'));
      }

      // Инвалидация кэша задач
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      
      // Вызов пользовательского обработчика
      if (onStatusChange) {
        onStatusChange(task.id, 'completed');
      }
      
      if (onAfterStatusChange) {
        onAfterStatusChange();
      }
      
      toast({
        title: t('task.statusUpdated', 'Статус задачи обновлен'),
        description: t('task.markedAsCompleted', 'Задача отмечена как выполненная'),
        variant: 'default',
      });
      
      // Закрываем модальное окно
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating task status:', error);
      toast({
        title: t('errors.updateFailed', 'Ошибка обновления'),
        description: error instanceof Error ? error.message : t('task.statusUpdateFailed', 'Не удалось обновить статус задачи'),
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Если нет задачи, не показываем содержимое
  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {task.title}
          </DialogTitle>
          <div className="flex flex-wrap gap-2 mt-2">
            {task.priority && (
              <Badge variant="outline" className={getPriorityBadgeClass(task.priority)}>
                {task.priority === 'high' ? t('task.priority.high', 'Высокий') :
                 task.priority === 'medium' ? t('task.priority.medium', 'Средний') :
                 t('task.priority.low', 'Низкий')}
              </Badge>
            )}
            
            <Badge variant="outline" className={getStatusBadgeClass(task.status)}>
              {getStatusText(task.status)}
            </Badge>
          </div>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          {/* Описание задачи */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">
              {t('task.description', 'Описание')}
            </h3>
            <div className="mt-1 whitespace-pre-line max-h-[200px] overflow-y-auto">
              <p>{task.description || t('task.no_description', 'Описание отсутствует')}</p>
            </div>
          </div>
          
          {/* Информация о создателе и исполнителе */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Создатель (Клиент) */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">
                {t('task.client', 'Заказчик')}
              </h3>
              <p className="font-medium">
                {task.creatorName || t('task.not_assigned', 'Не назначен')}
              </p>
            </div>
            
            {/* Исполнитель */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">
                {t('task.executor', 'Исполнитель')}
              </h3>
              <p className="font-medium">
                {task.executorName || t('task.not_assigned', 'Не назначен')}
              </p>
            </div>
          </div>
          
          {/* Даты создания и обновления */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">
                {t('task.created', 'Создано')}
              </h3>
              <p className="font-medium">{formatDateTimeString(task.createdAt)}</p>
            </div>
            
            {task.updatedAt && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  {t('task.updated', 'Обновлено')}
                </h3>
                <p className="font-medium">{formatDateTimeString(task.updatedAt)}</p>
              </div>
            )}
          </div>
          
          {/* Срок выполнения */}
          {task.dueDate && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">
                {t('task.due_date', 'Срок выполнения')}
              </h3>
              <p className="font-medium">{formatDateString(task.dueDate)}</p>
            </div>
          )}
          
          {/* ID задачи */}
          <div className="pt-2">
            <p className="text-xs text-muted-foreground">
              ID: {task.id}
            </p>
          </div>
        </div>
        
        <DialogFooter className="gap-2">
          {/* Кнопка "Отметить как выполненную" для незавершенных задач */}
          {task.status !== 'completed' && (
            <Button 
              onClick={handleMarkAsCompleted}
              disabled={isUpdating}
            >
              {t('task.markAsCompleted', 'Отметить как выполненную')}
            </Button>
          )}
          
          {/* Кнопка закрытия */}
          <Button 
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t('common.close', 'Закрыть')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailsModal;