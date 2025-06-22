import { TFunction } from 'i18next';

export type TaskStatus = 'new' | 'in_progress' | 'completed' | 'on_hold';

export function getTaskStatusLabel(status: string, t: TFunction): string {
  const map: Record<string, string> = {
    new: t('task.status.new', 'Новая'),
    in_progress: t('task.status.in_progress', 'В работе'),
    completed: t('task.status.completed', 'Завершена'),
    on_hold: t('task.status.on_hold', 'Приостановлена'),
  };
  return map[status] ?? status;
}
