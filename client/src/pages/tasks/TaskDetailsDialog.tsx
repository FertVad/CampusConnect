import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Task } from './useTasks';
import { useAuth } from '@/hooks/use-auth';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export default function TaskDetailsDialog({ open, onOpenChange, task, onEdit, onDelete }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{task?.title}</DialogTitle>
          <div className="flex flex-wrap gap-2 mt-2">
            {task && (
              <>
                {(() => {
                  switch (task.priority) {
                    case 'high':
                      return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">{t('task.priority.high')}</Badge>;
                    case 'medium':
                      return <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">{t('task.priority.medium')}</Badge>;
                    case 'low':
                      return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">{t('task.priority.low')}</Badge>;
                    default:
                      return <Badge variant="outline">{task.priority}</Badge>;
                  }
                })()}
                {(() => {
                  switch (task.status) {
                    case 'new':
                      return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">{t('task.status.new')}</Badge>;
                    case 'in_progress':
                      return <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">{t('task.status.in_progress')}</Badge>;
                    case 'completed':
                      return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">{t('task.status.completed')}</Badge>;
                    case 'on_hold':
                      return <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">{t('task.status.on_hold')}</Badge>;
                    default:
                      return <Badge variant="outline">{task.status}</Badge>;
                  }
                })()}
              </>
            )}
          </div>
        </DialogHeader>
        {task && (
          <div className="py-4 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">{t('task.description')}</h3>
              <p className="mt-1 whitespace-pre-line">{task.description || t('task.no_description')}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">{t('task.client')}</h3>
                <p className="font-medium">
                  {task.client ? `${task.client.firstName} ${task.client.lastName}` : t('task.not_assigned')}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">{t('task.executor')}</h3>
                <p className="font-medium">
                  {task.executor ? `${task.executor.firstName} ${task.executor.lastName}` : t('task.not_assigned')}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">{t('task.created')}</h3>
                <p className="font-medium">{format(new Date(task.createdAt), 'PPP, HH:mm')}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">{t('task.updated')}</h3>
                <p className="font-medium">{format(new Date(task.updatedAt), 'PPP, HH:mm')}</p>
              </div>
            </div>
            {task.dueDate && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">{t('task.due_date')}</h3>
                <p className="font-medium">{format(new Date(task.dueDate), 'PPP')}</p>
              </div>
            )}
            <div className="pt-2">
              <p className="text-xs text-muted-foreground">ID: {task.id}</p>
            </div>
          </div>
        )}
        <DialogFooter className="gap-2">
          {task && (user?.id === task.clientId || user?.role === 'admin') && (
            <>
              <Button variant="outline" onClick={() => task && onEdit(task)}>{t('task.edit_task')}</Button>
              <Button variant="destructive" onClick={() => task && onDelete(task)}>{t('task.delete_task')}</Button>
            </>
          )}
          <Button onClick={() => onOpenChange(false)}>{t('common.close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

