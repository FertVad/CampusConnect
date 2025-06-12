import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MessageCircleOff } from 'lucide-react';

export default function Chat() {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">{t('chat.title')}</h1>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t('chat.disabled.title')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <MessageCircleOff className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-lg text-center mb-2">{t('chat.disabled.message')}</p>
          <p className="text-sm text-muted-foreground text-center">
            {t('chat.disabled.description')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}