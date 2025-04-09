import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Crown, Building, Users, Clipboard, BarChart3, GraduationCap, BookOpen } from 'lucide-react';
import { UserData } from '@/components/users/UserCard';
import { useTranslation } from 'react-i18next';

export interface Director extends UserData {
  title?: string;
  department?: string;
  organization?: string;
  stats?: {
    teachers?: number;
    students?: number;
    courses?: number;
    completionRate?: number;
  };
  tasksOpen?: number;
  tasksDone?: number;
}

interface DirectorCardProps {
  director: Director;
  onClick?: (id: number) => void;
  onEdit?: (director: Director) => void;
}

const DirectorCard: React.FC<DirectorCardProps> = ({ director, onClick, onEdit }) => {
  const { t } = useTranslation();

  const {
    id,
    firstName,
    lastName,
    email,
    photoUrl,
    phone,
    title,
    department,
    organization,
    stats,
    tasksOpen,
    tasksDone,
  } = director;

  // Получаем инициалы для аватарки
  const initials = `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`;

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              {photoUrl ? (
                <AvatarImage src={photoUrl} alt={`${firstName} ${lastName}`} />
              ) : (
                <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <CardTitle className="text-xl">{firstName} {lastName}</CardTitle>
              <div className="flex flex-wrap gap-2 mt-1">
                <Badge variant="secondary" className="flex items-center gap-1 text-sm">
                  <Crown className="h-3.5 w-3.5" />
                  {t('roles.director', 'Директор')}
                </Badge>
                {title && (
                  <Badge variant="outline" className="text-sm">
                    {title}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t('user.email', 'Электронная почта')}</p>
              <p className="font-medium">{email}</p>
            </div>
            {phone && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{t('user.phone', 'Телефон')}</p>
                <p className="font-medium">{phone}</p>
              </div>
            )}
          </div>

          {department && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t('director.department', 'Департамент')}</p>
              <p className="font-medium">{department}</p>
            </div>
          )}

          {organization && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t('director.organization', 'Организация')}</p>
              <div className="flex items-center mt-1">
                <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                <p className="font-medium">{organization}</p>
              </div>
            </div>
          )}

          {/* Статистика */}
          {stats && (
            <div className="pt-4 border-t">
              <h3 className="font-medium mb-3">{t('director.stats', 'Управление')}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {stats.teachers !== undefined && (
                  <div className="bg-secondary/50 p-3 rounded-lg flex flex-col">
                    <span className="text-sm text-muted-foreground">{t('director.stats.teachers', 'Преподаватели')}</span>
                    <div className="flex items-center mt-1">
                      <GraduationCap className="h-4 w-4 mr-1 text-primary" />
                      <span className="text-lg font-bold">{stats.teachers}</span>
                    </div>
                  </div>
                )}
                {stats.students !== undefined && (
                  <div className="bg-secondary/50 p-3 rounded-lg flex flex-col">
                    <span className="text-sm text-muted-foreground">{t('director.stats.students', 'Студенты')}</span>
                    <div className="flex items-center mt-1">
                      <Users className="h-4 w-4 mr-1 text-primary" />
                      <span className="text-lg font-bold">{stats.students}</span>
                    </div>
                  </div>
                )}
                {stats.courses !== undefined && (
                  <div className="bg-secondary/50 p-3 rounded-lg flex flex-col">
                    <span className="text-sm text-muted-foreground">{t('director.stats.courses', 'Курсы')}</span>
                    <div className="flex items-center mt-1">
                      <BookOpen className="h-4 w-4 mr-1 text-primary" />
                      <span className="text-lg font-bold">{stats.courses}</span>
                    </div>
                  </div>
                )}
                {stats.completionRate !== undefined && (
                  <div className="bg-secondary/50 p-3 rounded-lg flex flex-col">
                    <span className="text-sm text-muted-foreground">{t('director.stats.completionRate', 'Завершаемость')}</span>
                    <div className="flex items-center mt-1">
                      <BarChart3 className="h-4 w-4 mr-1 text-primary" />
                      <span className="text-lg font-bold">{stats.completionRate}%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Задачи */}
          {(tasksOpen !== undefined || tasksDone !== undefined) && (
            <div className="pt-4 border-t">
              <h3 className="font-medium mb-3">{t('director.tasks', 'Задачи')}</h3>
              <div className="grid grid-cols-2 gap-3">
                {tasksOpen !== undefined && (
                  <div className="bg-secondary/50 p-3 rounded-lg flex flex-col">
                    <span className="text-sm text-muted-foreground">{t('director.tasks.open', 'Активные')}</span>
                    <div className="flex items-center mt-1">
                      <Clipboard className="h-4 w-4 mr-1 text-primary" />
                      <span className="text-lg font-bold">{tasksOpen}</span>
                    </div>
                  </div>
                )}
                {tasksDone !== undefined && (
                  <div className="bg-secondary/50 p-3 rounded-lg flex flex-col">
                    <span className="text-sm text-muted-foreground">{t('director.tasks.done', 'Выполненные')}</span>
                    <div className="flex items-center mt-1">
                      <Clipboard className="h-4 w-4 mr-1 text-primary" />
                      <span className="text-lg font-bold">{tasksDone}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DirectorCard;