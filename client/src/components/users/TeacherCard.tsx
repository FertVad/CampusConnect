import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, GraduationCap, Clipboard, Calendar, Star, Edit, Clock } from 'lucide-react';
import { UserData } from '@/components/users/UserCard';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/use-auth';
import EditUserProfileModal from './EditUserProfileModal';

export interface Teacher extends UserData {
  department?: string;
  specialty?: string;
  subjects?: string[];
  education?: string;
  experience?: number;
  rating?: number;
  lastLogin?: string;
  nextClass?: {
    name: string;
    time: string;
    room: string;
  };
  tasksOpen?: number;
  tasksDone?: number;
  stats?: {
    students?: number;
    courses?: number;
    classes?: number;
    averageGrade?: number;
  };
}

interface TeacherCardProps {
  teacher: Teacher;
  onClick?: (id: string) => void;
  onEdit?: (teacher: Teacher) => void;
}

const TeacherCard: React.FC<TeacherCardProps> = ({ teacher, onClick, onEdit }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Проверяем, имеет ли текущий пользователь право редактировать профиль
  const canEdit = user && (user.role === 'admin' || user.role === 'director');
  
  const handleEdit = () => {
    setIsEditModalOpen(true);
    if (onEdit) {
      onEdit(teacher);
    }
  };

  const {
    id,
    firstName,
    lastName,
    email,
    photoUrl,
    phone,
    department,
    specialty,
    subjects,
    education,
    experience,
    nextClass,
    stats,
    rating,
    tasksOpen,
    tasksDone,
    lastLogin
  } = teacher;

  // Получаем инициалы для аватарки
  const initials = `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`;

  // Функция для отрисовки звездочек рейтинга
  const renderRating = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating - fullStars >= 0.5;
    
    return (
      <div className="flex items-center">
        {Array.from({ length: fullStars }).map((_, index) => (
          <Star key={`full-${index}`} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
        ))}
        {hasHalfStar && (
          <div className="relative">
            <Star className="h-4 w-4 text-yellow-400" />
            <div className="absolute inset-0 overflow-hidden w-1/2">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            </div>
          </div>
        )}
        {Array.from({ length: 5 - fullStars - (hasHalfStar ? 1 : 0) }).map((_, index) => (
          <Star key={`empty-${index}`} className="h-4 w-4 text-yellow-400" />
        ))}
        <span className="ml-1 text-sm">{rating.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <>
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
                    <GraduationCap className="h-3.5 w-3.5" />
                    {t('roles.teacher', 'Преподаватель')}
                  </Badge>
                  {department && (
                    <Badge variant="outline" className="text-sm">
                      {department}
                    </Badge>
                  )}
                </div>
                {rating !== undefined && (
                  <div className="mt-2">
                    {renderRating(rating)}
                  </div>
                )}
              </div>
            </div>
            
            {/* Кнопка редактирования (только для админов/директоров) */}
            {canEdit && (
              <Button
                variant="outline"
                className="h-11"
                onClick={handleEdit}
              >
                <Edit className="h-4 w-4 mr-1" />
                {t('user.edit', 'Редактировать')}
              </Button>
            )}
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

            {/* Дополнительная информация */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t">
              {experience !== undefined && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t('teacher.experience', 'Опыт работы')}</p>
                  <p className="font-medium">{t('teacher.experienceYears', '{{years}} лет', { years: experience })}</p>
                </div>
              )}
              
              {/* Информация о последнем входе в систему */}
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{t('user.lastLogin', 'Последний вход')}</p>
                <p className="font-medium flex items-center">
                  <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                  {lastLogin 
                    ? new Date(lastLogin).toLocaleDateString()
                    : t('user.never', 'Никогда')}
                </p>
              </div>
            </div>

            {specialty && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{t('teacher.specialty', 'Специальность')}</p>
                <p className="font-medium">{specialty}</p>
              </div>
            )}

            {subjects && subjects.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{t('teacher.subjects', 'Предметы')}</p>
                <div className="flex flex-wrap gap-1">
                  {subjects.map((subject, index) => (
                    <Badge key={index} variant="outline" className="bg-secondary/30">
                      {subject}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {education && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{t('teacher.education', 'Образование')}</p>
                <p className="font-medium">{education}</p>
              </div>
            )}

            {/* Следующее занятие */}
            {nextClass && (
              <div className="pt-4 border-t">
                <h3 className="font-medium mb-3">{t('teacher.nextClass', 'Следующее занятие')}</h3>
                <div className="bg-secondary/50 p-3 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">{nextClass.name}</p>
                      <div className="flex items-center text-sm text-muted-foreground gap-3 mt-1">
                        <span>{nextClass.time}</span>
                        <span>• {t('teacher.room', 'Аудитория')}: {nextClass.room}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Статистика */}
            {stats && (
              <div className="pt-4 border-t">
                <h3 className="font-medium mb-3">{t('teacher.stats', 'Статистика')}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {stats.students !== undefined && (
                    <div className="bg-secondary/50 p-3 rounded-lg flex flex-col">
                      <span className="text-sm text-muted-foreground">{t('teacher.stats.students', 'Студенты')}</span>
                      <div className="flex items-center mt-1">
                        <GraduationCap className="h-4 w-4 mr-1 text-primary" />
                        <span className="text-lg font-bold">{stats.students}</span>
                      </div>
                    </div>
                  )}
                  {stats.courses !== undefined && (
                    <div className="bg-secondary/50 p-3 rounded-lg flex flex-col">
                      <span className="text-sm text-muted-foreground">{t('teacher.stats.courses', 'Курсы')}</span>
                      <div className="flex items-center mt-1">
                        <BookOpen className="h-4 w-4 mr-1 text-primary" />
                        <span className="text-lg font-bold">{stats.courses}</span>
                      </div>
                    </div>
                  )}
                  {stats.classes !== undefined && (
                    <div className="bg-secondary/50 p-3 rounded-lg flex flex-col">
                      <span className="text-sm text-muted-foreground">{t('teacher.stats.classes', 'Занятия')}</span>
                      <div className="flex items-center mt-1">
                        <Calendar className="h-4 w-4 mr-1 text-primary" />
                        <span className="text-lg font-bold">{stats.classes}</span>
                      </div>
                    </div>
                  )}
                  {stats.averageGrade !== undefined && (
                    <div className="bg-secondary/50 p-3 rounded-lg flex flex-col">
                      <span className="text-sm text-muted-foreground">{t('teacher.stats.averageGrade', 'Средняя оценка')}</span>
                      <div className="flex items-center mt-1">
                        <Star className="h-4 w-4 mr-1 text-primary" />
                        <span className="text-lg font-bold">{stats.averageGrade.toFixed(1)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Задачи */}
            {(tasksOpen !== undefined || tasksDone !== undefined) && (
              <div className="pt-4 border-t">
                <h3 className="font-medium mb-3">{t('teacher.tasks', 'Задачи')}</h3>
                <div className="grid grid-cols-2 gap-3">
                  {tasksOpen !== undefined && (
                    <div className="bg-secondary/50 p-3 rounded-lg flex flex-col">
                      <span className="text-sm text-muted-foreground">{t('teacher.tasks.open', 'Активные')}</span>
                      <div className="flex items-center mt-1">
                        <Clipboard className="h-4 w-4 mr-1 text-primary" />
                        <span className="text-lg font-bold">{tasksOpen}</span>
                      </div>
                    </div>
                  )}
                  {tasksDone !== undefined && (
                    <div className="bg-secondary/50 p-3 rounded-lg flex flex-col">
                      <span className="text-sm text-muted-foreground">{t('teacher.tasks.done', 'Выполненные')}</span>
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
      
      {/* Модальное окно редактирования профиля */}
      {isEditModalOpen && (
        <EditUserProfileModal 
          isOpen={isEditModalOpen} 
          onClose={() => setIsEditModalOpen(false)} 
          user={teacher} 
        />
      )}
    </>
  );
};

export default TeacherCard;