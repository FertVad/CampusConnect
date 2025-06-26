import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import EditUserProfileModal from '@/components/users/EditUserProfileModal';
import { useAuth } from '@/hooks/use-auth';
import { useUserPreferences } from '@/hooks/useUserPreferences';

export default function Settings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [editOpen, setEditOpen] = React.useState(false);
  const { preferences, updatePreferences } = useUserPreferences();

  const handleToggle = (field: keyof typeof preferences) => (value: boolean) => {
    updatePreferences({ [field]: value });
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">{t('settings.title')}</h1>

      <Card className="max-w-md mb-4">
        <CardHeader>
          <CardTitle>{t('settings.notifications')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span>{t('settings.emailNotifications')}</span>
            <Switch
              checked={preferences?.emailNotifications}
              onCheckedChange={handleToggle('emailNotifications')}
            />
          </div>
          <div className="flex items-center justify-between">
            <span>{t('settings.browserNotifications')}</span>
            <Switch
              checked={preferences?.browserNotifications}
              onCheckedChange={handleToggle('browserNotifications')}
            />
          </div>
          <div className="flex items-center justify-between">
            <span>{t('settings.soundNotifications')}</span>
            <Switch
              checked={preferences?.soundNotifications}
              onCheckedChange={handleToggle('soundNotifications')}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>{t('settings.profile')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setEditOpen(true)}>
            {t('auth.profile.updateProfile')}
          </Button>
        </CardContent>
      </Card>

      {user && editOpen && (
        <EditUserProfileModal
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          user={user}
        />
      )}
    </div>
  );
}
