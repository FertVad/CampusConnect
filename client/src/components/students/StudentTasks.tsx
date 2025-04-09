import React from 'react';
import { useTranslation } from 'react-i18next';
import StudentTaskItem, { Task } from './StudentTaskItem';
import { AlertCircle } from 'lucide-react';

interface StudentTasksProps {
  userId: number;
  tasks: Task[];
  isLoading: boolean;
}

const StudentTasks: React.FC<StudentTasksProps> = ({ userId, tasks, isLoading }) => {
  const { t } = useTranslation();

  // Состояние загрузки
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-muted-foreground">{t('common.loading', 'Загрузка...')}</p>
      </div>
    );
  }

  // Нет задач
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center">
        <AlertCircle className="h-10 w-10 text-muted-foreground mb-3 opacity-50" />
        <p className="text-muted-foreground">
          {t('tasks.empty', 'Нет активных задач')}
        </p>
      </div>
    );
  }

  // Группировка задач по статусу
  const activeTasks = tasks.filter(t => t.status === 'new' || t.status === 'in_progress' || t.status === 'on_hold');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div className="space-y-4">
      {/* Активные задачи */}
      {activeTasks.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2 text-muted-foreground">
            {t('tasks.active', 'Активные задачи')}
          </h4>
          <ul className="space-y-3">
            {activeTasks.map(task => (
              <li key={task.id}>
                <StudentTaskItem
                  task={task}
                  userId={userId}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Завершенные задачи */}
      {completedTasks.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2 text-muted-foreground">
            {t('tasks.completed', 'Завершенные задачи')}
          </h4>
          <ul className="space-y-3">
            {completedTasks.slice(0, 3).map(task => (
              <li key={task.id}>
                <StudentTaskItem
                  task={task}
                  userId={userId}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default StudentTasks;