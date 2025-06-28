import React from 'react';
import { useTranslation } from 'react-i18next';

export default function ForgotPassword() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-2">{t('auth.forgotPassword.title')}</h1>
      <p className="text-muted-foreground text-center">
        {t('auth.forgotPassword.subtitle')}
      </p>
    </div>
  );
}
