import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  User,
  GraduationCap,
  Settings as SettingsIcon,
  Edit
} from 'lucide-react';
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

  const roleIcons: Record<string, JSX.Element> = {
    student: <User className="h-3.5 w-3.5 mr-1" />,
    teacher: <GraduationCap className="h-3.5 w-3.5 mr-1" />,
    admin: <SettingsIcon className="h-3.5 w-3.5 mr-1" />,
    director: <SettingsIcon className="h-3.5 w-3.5 mr-1" />,
  };

  const handleToggle = (field: keyof UserPreferences) => (value: boolean) => {
    updatePreferences({ [field]: value });
  };

  return (
    <div className="container mx-auto py-6">

      {user && (
        <>
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 w-full">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback>
                    {user.firstName.charAt(0)}
                    {user.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-xl">
                    {user.firstName} {user.lastName}
                  </CardTitle>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <Badge variant="secondary" className="flex items-center gap-1 text-sm">
                      {roleIcons[user.role]}
                      {t(`roles.${user.role}`)}
                    </Badge>
                  </div>
                </div>
              </div>
              <Button variant="outline" className="h-11" onClick={() => setEditOpen(true)}>
                <Edit className="h-4 w-4 mr-1" />
                {t('auth.profile.updateProfile')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t('user.email', 'Электронная почта')}</p>
              <p className="font-medium text-sm">{user.email}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t('user.phone', 'Телефон')}</p>
              <p className="font-medium text-sm">{user.phone || '—'}</p>
            </div>
          </div>
        </div>
      </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 w-full mt-6">
          <Accordion type="single" collapsible>
            <AccordionItem value="notifications" className="border-b-0">
              <AccordionTrigger className="w-full text-left">
                <CardTitle>{t('settings.notifications')}</CardTitle>
              </AccordionTrigger>
              <AccordionContent className="px-6">
                <div className="flex flex-col gap-4">
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
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 w-full mt-6">
          <Accordion type="single" collapsible>
            <AccordionItem value="appearance" className="border-b-0">
              <AccordionTrigger className="w-full text-left">
                <CardTitle>{t('settings.languageAndTheme')}</CardTitle>
              </AccordionTrigger>
              <AccordionContent className="px-6">
                <div className="flex items-center gap-4">
                  <LanguageSwitcher />
                  <ThemeToggle />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
        </>
      )}

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
