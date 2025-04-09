import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  ChevronDown, 
  ChevronUp, 
  Clock,
  User,
  CheckCircle2
} from 'lucide-react';

// Интерфейс для данных задачи
export interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'new' | 'in_progress' | 'completed' | 'on_hold';
  createdAt: string;
  createdBy?: number;
  creatorName?: string;
  dueDate?: string;
  priority?: 'high' | 'medium' | 'low';
}

interface StudentTaskItemProps {
  task: Task;
  userId: number;
  isExpanded: boolean;
  onToggle: (id: number) => void;
}

const StudentTaskItem: React.FC<StudentTaskItemProps> = ({ 
  task, 
  userId,
  isExpanded, 
  onToggle 
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
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

  // Получение цвета для статуса
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': 
        return 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300';
      case 'in_progress': 
        return 'bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-300';
      case 'on_hold': 
        return 'bg-amber-100 text-amber-800 dark:bg-amber-800/30 dark:text-amber-300';
      default: 
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  // Форматирование даты
  const formatDateString = (dateString: string) => {
    try {
      return format(new Date(dateString), 'PPP', { locale: ru });
    } catch (e) {
      return dateString;
    }
  };

  // Обработчик смены статуса задачи на "Выполнено"
  const handleMarkAsCompleted = async () => {
    try {
      setIsUpdating(true);
      const response = await apiRequest('PATCH', `/api/tasks/${task.id}/status`, {
        status: 'completed'
      });

      if (!response.ok) {
        throw new Error('Не удалось обновить статус задачи');
      }

      // Инвалидация кэша задач
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      
      toast({
        title: t('task.statusUpdated', 'Статус задачи обновлен'),
        description: t('task.markedAsCompleted', 'Задача отмечена как выполненная'),
        variant: 'default',
      });
    } catch (error) {
      console.error('Error updating task status:', error);
      toast({
        title: t('errors.updateFailed', 'Ошибка обновления'),
        description: error instanceof Error ? error.message : 'Не удалось обновить статус задачи',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Collapsible
      open={isExpanded}
      onOpenChange={() => onToggle(task.id)}
      className="rounded-md bg-secondary/30"
    >
      <CollapsibleTrigger className="flex w-full justify-between items-start p-3 text-left">
        <div>
          <h4 className="font-medium">{task.title}</h4>
          {!isExpanded && task.description && (
            <p className="text-sm text-muted-foreground line-clamp-1">{task.description}</p>
          )}
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${getStatusColor(task.status)}`}>
            {getStatusText(task.status)}
          </span>
        </div>
        <div className="flex items-center">
          <span className="text-xs text-muted-foreground mr-2">
            {formatDateString(task.createdAt)}
          </span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="px-3 pb-3 pt-1 border-t border-border/40 mt-1 space-y-3">
          {/* Полное описание задачи */}
          {task.description && (
            <div className="text-sm">
              <p>{task.description}</p>
            </div>
          )}
          
          {/* Метаданные задачи */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {/* Автор задачи */}
            {task.creatorName && (
              <div className="flex items-center text-xs text-muted-foreground">
                <User className="mr-1.5 h-3.5 w-3.5" />
                <span>
                  {t('task.createdBy', 'Назначил')}: {task.creatorName}
                </span>
              </div>
            )}
            
            {/* Срок выполнения */}
            {task.dueDate && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Clock className="mr-1.5 h-3.5 w-3.5" />
                <span>
                  {t('task.dueDate', 'Срок')}: {formatDateString(task.dueDate)}
                </span>
              </div>
            )}
            
            {/* Приоритет */}
            {task.priority && (
              <div className="flex items-center text-xs">
                <span className="text-muted-foreground mr-1.5">
                  {t('task.priority', 'Приоритет')}:
                </span>
                <Badge variant="outline" className={
                  task.priority === 'high' ? 'border-red-500 text-red-500' :
                  task.priority === 'medium' ? 'border-amber-500 text-amber-500' :
                  'border-green-500 text-green-500'
                }>
                  {task.priority === 'high' ? t('task.priority.high', 'Высокий') :
                   task.priority === 'medium' ? t('task.priority.medium', 'Средний') :
                   t('task.priority.low', 'Низкий')}
                </Badge>
              </div>
            )}
          </div>
          
          {/* Кнопка "Отметить как выполненную" */}
          {task.status !== 'completed' && (
            <div className="flex justify-end mt-4">
              <Button 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkAsCompleted();
                }}
                disabled={isUpdating}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {t('task.markAsCompleted', 'Отметить как выполненную')}
              </Button>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default StudentTaskItem;