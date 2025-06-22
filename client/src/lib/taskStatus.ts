import { TFunction } from 'i18next';
import { getTaskStatusLabel as baseStatusLabel } from '@shared/utils';

export type TaskStatus = 'new' | 'in_progress' | 'completed' | 'on_hold';

export function getTaskStatusLabel(status: string, t: TFunction): string {
  const fallback = baseStatusLabel(status);
  return t(`task.status.${status}`, fallback);
}
