export type TaskStatus = 'new' | 'in_progress' | 'completed' | 'on_hold';

export function getTaskStatusLabel(status: string): string {
  const map: Record<string, string> = {
    new: 'Новая',
    in_progress: 'В работе',
    completed: 'Завершена',
    on_hold: 'Приостановлена',
  };
  return map[status] ?? status;
}
