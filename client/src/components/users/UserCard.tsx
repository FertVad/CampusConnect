import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Базовый интерфейс с данными пользователя
export interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  photoUrl?: string;
  phone?: string;
  role: 'student' | 'teacher' | 'admin' | 'director';
}

interface UserCardProps {
  user: UserData;
  onClick?: (id: string) => void;
}

const UserCard: React.FC<UserCardProps> = ({ user, onClick }) => {
  const { t } = useTranslation();

  const {
    firstName,
    lastName,
    email,
    photoUrl,
    phone,
    role,
  } = user;

  // Получаем инициалы для аватарки
  const initials = `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`;

  // Функция для получения отображаемого имени роли
  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'student': return t('roles.student', 'Студент');
      case 'teacher': return t('roles.teacher', 'Преподаватель');
      case 'admin': return t('roles.admin', 'Администратор');
      case 'director': return t('roles.director', 'Директор');
      default: return role;
    }
  };

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
                  <User className="h-3.5 w-3.5" />
                  {getRoleDisplay(role)}
                </Badge>
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
        </div>
      </CardContent>
    </Card>
  );
};

export default UserCard;