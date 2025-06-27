import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from '@/components/ui/card';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent
} from '@/components/ui/accordion';
import { LanguageSwitcher } from '@/components/theme/language-switcher';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Switch } from '@/components/ui/switch';
import EditUserProfileModal from '@/components/users/EditUserProfileModal';
import { useAuth } from '@/hooks/use-auth';
import { useUserPreferences, UserPreferences } from '@/hooks/useUserPreferences';

export default function Settings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [editOpen, setEditOpen] = React.useState(false);
  const { preferences, updatePreferences } = useUserPreferences();

  const handleToggle = (field: keyof UserPreferences) => (value: boolean) => {
    updatePreferences({ [field]: value });
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">{t('settings.title')}</h1>

      <Accordion
        type="multiple"
        defaultValue={["profile"]}
        className="space-y-4 max-w-md"
      >
        <AccordionItem value="profile" className="border-none">
          <Card>
            <CardHeader>
              <AccordionTrigger className="w-full text-left">
                <CardTitle>{t('settings.myProfile')}</CardTitle>
              </AccordionTrigger>
            </CardHeader>
            <AccordionContent>
              <CardContent className="space-y-2">
                {user && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {t('auth.profile.firstName', 'Name')}
                      </span>
                      <span className="font-medium">
                        {user.firstName} {user.lastName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {t('user.email', 'Email')}
                      </span>
                      <span className="font-medium">{user.email}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {t('auth.profile.role', 'Role')}
                      </span>
                      <span className="font-medium">
                        {t(`roles.${user.role}`)}
                      </span>
                    </div>
                    <Button size="sm" onClick={() => setEditOpen(true)}>
                      {t('auth.profile.updateProfile')}
                    </Button>
                  </>
                )}
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>

        <AccordionItem value="notifications" className="border-none">
          <Card>
            <CardHeader>
              <AccordionTrigger className="w-full text-left">
                <CardTitle>{t('settings.notifications')}</CardTitle>
              </AccordionTrigger>
            </CardHeader>
            <AccordionContent>
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
            </AccordionContent>
          </Card>
        </AccordionItem>

        <AccordionItem value="appearance" className="border-none">
          <Card>
            <CardHeader>
              <AccordionTrigger className="w-full text-left">
                <CardTitle>{t('settings.languageAndTheme')}</CardTitle>
              </AccordionTrigger>
            </CardHeader>
            <AccordionContent>
              <CardContent className="flex items-center gap-4">
                <LanguageSwitcher />
                <ThemeToggle />
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>
      </Accordion>

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
