import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, CheckCircle, Clock, PauseCircle } from 'lucide-react';
import { Task } from '@/pages/tasks/useTasks';

interface Props {
  task: Task;
  onStatusChange: (id: number, status: string) => void;
  onEditClick?: (task: Task) => void;
  onDeleteClick?: (task: Task) => void;
  onViewDetails?: (task: Task) => void;
}

const TaskCard = ({ task, onStatusChange, onEditClick, onDeleteClick, onViewDetails }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isExecutor = user?.id === task.executorId;
  const isClient = user?.id === task.clientId;
  const isCreator = isClient;
  const isAdmin = user?.role === 'admin';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return (
          <Badge variant="outline" className="bg-blue-100/70 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800">
            {t('task.status.new')}
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge variant="outline" className="bg-amber-100/70 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800">
            {t('task.status.in_progress')}
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="bg-green-100/70 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-800">
            {t('task.status.completed')}
          </Badge>
        );
      case 'on_hold':
        return (
          <Badge variant="outline" className="bg-gray-100/70 text-gray-700 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700">
            {t('task.status.on_hold')}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return (
          <Badge variant="outline" className="bg-red-100/70 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800">
            {t('task.priority.high')}
          </Badge>
        );
      case 'medium':
        return (
          <Badge variant="outline" className="bg-orange-100/70 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-800">
            {t('task.priority.medium')}
          </Badge>
        );
      case 'low':
        return (
          <Badge variant="outline" className="bg-green-100/70 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-800">
            {t('task.priority.low')}
          </Badge>
        );
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLElement && (e.target.closest('button') || e.target.closest('[role="combobox"]'))) {
      return;
    }
    onViewDetails && onViewDetails(task);
  };

  return (
    <Card
      className="h-full flex flex-col border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900 cursor-pointer hover:border-primary hover:shadow-md transition-all duration-200 card-hover"
      onClick={handleCardClick}
    >
      <CardHeader className="pb-2 space-y-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg break-words" title={task.title}>
            {task.title}
          </CardTitle>
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
            <span className="font-medium text-foreground">
              {task.client ? `${task.client.firstName} ${task.client.lastName}` : t('task.not_assigned')}
            </span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>{t('task.executor')}:</span>
            <span className="font-medium text-foreground">
              {task.executor ? `${task.executor.firstName} ${task.executor.lastName}` : t('task.not_assigned')}
            </span>
          </div>
          {task.dueDate && (
            <div className="flex items-center justify-between text-muted-foreground">
              <span>{t('task.due_date')}:</span>
              <span className="font-medium text-foreground">{new Date(task.dueDate).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
        <div className="flex justify-between w-full items-center">
          <div className="text-xs text-muted-foreground">
            {t('task.created')}: {new Date(task.createdAt).toLocaleDateString()}
          </div>
          <div className="text-xs text-muted-foreground">ID: {task.id}</div>
        </div>
        <div className="flex flex-row gap-2 w-full">
          {(isExecutor || isAdmin) && (
            <Select defaultValue={task.status} onValueChange={(value) => onStatusChange(task.id, value)}>
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
          {(isCreator || isAdmin) && (
            <>
              <Button variant="outline" size="sm" className="flex-shrink-0 h-10" title={t('task.edit_task')} onClick={() => onEditClick && onEditClick(task)}>
                <span className="sr-only">{t('task.edit_task')}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
              </Button>
              <Button variant="destructive" size="sm" className="flex-shrink-0 h-10" title={t('task.delete_task')} onClick={() => onDeleteClick && onDeleteClick(task)}>
                <span className="sr-only">{t('task.delete_task')}</span>
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

export default TaskCard;
