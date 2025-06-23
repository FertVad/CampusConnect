import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getTaskStatusLabel } from '@/lib/taskStatus';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import TaskDetailsModal, { TaskDetail } from '@/components/tasks/TaskDetailsModal';
import { Clock } from 'lucide-react';

// Интерфейс для данных задачи
export interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'new' | 'in_progress' | 'completed' | 'on_hold';
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  creatorName?: string;
  dueDate?: string;
  priority?: 'high' | 'medium' | 'low';
}

interface StudentTaskItemProps {
  task: Task;
  userId: string;
}

const StudentTaskItem: React.FC<StudentTaskItemProps> = ({ 
  task, 
  userId
}) => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Получение статуса задачи в виде текста
  const getStatusText = (status: string) => getTaskStatusLabel(status, t);

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

  // Обработчик клика по задаче - открываем модальное окно
  const handleTaskClick = () => {
    setIsModalOpen(true);
  };

  // Преобразование данных задачи в формат для модального окна
  const taskDetail: TaskDetail = {
    ...task,
    executorName: 'Вы', // Для студента исполнитель - это он сам
  };

  return (
    <>
      <Card 
        className="border rounded-md bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors"
        onClick={handleTaskClick}
      >
        <div className="p-3">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-medium">{task.title}</h4>
              {task.description && (
                <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{task.description}</p>
              )}
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${getStatusColor(task.status)}`}>
                {getStatusText(task.status)}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              {task.dueDate && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <Clock className="mr-1 h-3 w-3" />
                  <span className="whitespace-nowrap">{formatDateString(task.dueDate)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Модальное окно с деталями задачи */}
      <TaskDetailsModal
        task={taskDetail}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        userId={userId}
      />
    </>
  );
};

export default StudentTaskItem;