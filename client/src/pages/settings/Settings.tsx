import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { LanguageSwitcher } from '@/components/theme/language-switcher';

export default function Settings() {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">{t('settings.title')}</h1>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>{t('settings.appearance')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span>{t('settings.language')}</span>
            <LanguageSwitcher />
          </div>
          <div className="flex items-center justify-between">
            <span>{t('settings.theme')}</span>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
