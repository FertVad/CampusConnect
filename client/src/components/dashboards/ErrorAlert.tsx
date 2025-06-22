import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface ErrorAlertProps {
  error: unknown;
  onRetry: () => void;
}

export default function ErrorAlert({ error, onRetry }: ErrorAlertProps) {
  const { t } = useTranslation();
  const message = error instanceof Error ? error.message : t('errors.connectionError');
  return (
    <Alert variant="destructive" className="flex justify-between items-start">
      <div className="flex gap-2">
        <AlertCircle className="h-4 w-4" />
        <div>
          <AlertTitle>{t('errors.loadingFailed', 'Не удалось загрузить данные')}</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </div>
      </div>
      <Button size="sm" onClick={onRetry}>{t('common.actions.retry', 'Повторить')}</Button>
    </Alert>
  );
}
