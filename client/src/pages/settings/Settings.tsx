import React, { useState } from "react";
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function Settings() {
  const { t } = useTranslation();
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [browserNotifications, setBrowserNotifications] = useState(false);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>{t('settings.notificationSettings')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="email">{t('settings.emailNotifications')}</Label>
            <Switch
              id="email"
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="browser">{t('settings.browserNotifications')}</Label>
            <Switch
              id="browser"
              checked={browserNotifications}
              onCheckedChange={setBrowserNotifications}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
