import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation();
  const map: Record<string, { label: string; className: string }> = {
    new: {
      label: t('task.status.new'),
      className:
        'bg-blue-100/70 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800',
    },
    in_progress: {
      label: t('task.status.in_progress'),
      className:
        'bg-amber-100/70 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800',
    },
    completed: {
      label: t('task.status.completed'),
      className:
        'bg-green-100/70 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-800',
    },
    on_hold: {
      label: t('task.status.on_hold'),
      className:
        'bg-gray-100/70 text-gray-700 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700',
    },
  };
  const info = map[status];
  return (
    <Badge variant="outline" className={info?.className}>
      {info ? info.label : status}
    </Badge>
  );
}

interface PriorityBadgeProps {
  priority: string;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const { t } = useTranslation();
  const map: Record<string, { label: string; className: string }> = {
    high: {
      label: t('task.priority.high'),
      className:
        'bg-red-100/70 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800',
    },
    medium: {
      label: t('task.priority.medium'),
      className:
        'bg-orange-100/70 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-800',
    },
    low: {
      label: t('task.priority.low'),
      className:
        'bg-green-100/70 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-800',
    },
  };
  const info = map[priority];
  return (
    <Badge variant="outline" className={info?.className}>
      {info ? info.label : priority}
    </Badge>
  );
}
