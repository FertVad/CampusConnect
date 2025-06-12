import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { Task } from './useTasks';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  onConfirm: () => void;
  loading: boolean;
}

export default function DeleteTaskDialog({ open, onOpenChange, task, onConfirm, loading }: Props) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{t('task.delete_task')}</DialogTitle>
          <DialogDescription>{t('task.confirm_delete')}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {task && (
            <div>
              <p className="font-semibold">{task.title}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {task.description || t('task.no_description')}
              </p>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.actions.cancel')}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {t('task.delete_task')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

