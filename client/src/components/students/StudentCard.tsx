import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { 
  Card, 
  CardContent, 
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { 
  Mail, 
  Phone, 
  Calendar, 
  ClipboardList, 
  Bell, 
  BarChart2, 
  UserCheck,
  Info,
  Edit,
  Bookmark
} from 'lucide-react';

// Интерфейс для данных студента
export interface Student {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  group?: string;
  major?: string;
  course?: number;
  lastLogin?: string;
  upcomingLesson?: string;
  tasksOpen?: number;
  tasksDone?: number;
  unreadNotifications?: number;
  averageGrade?: number;
  missedClasses?: number;
  note?: string;
}

interface StudentCardProps {
  student: Student;
  onClick?: (id: number) => void;
}

/**
 * Получает инициалы из имени и фамилии
 */
const getInitials = (firstName: string, lastName: string): string => {
  return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
};

/**
 * Получает URL аватара Gravatar по email
 */
const getGravatarUrl = (email: string): string => {
  // Простой MD5 хеш в данном случае не применяем, используем дефолтный аватар
  return `https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y`;
};

const StudentCard: React.FC<StudentCardProps> = ({ student, onClick }) => {
  const handleClick = () => {
    if (onClick) {
      onClick(student.id);
    }
  };

  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="h-14 w-14 border-2 border-primary/10">
              <AvatarImage 
                src={getGravatarUrl(student.email)} 
                alt={`${student.firstName} ${student.lastName}`} 
              />
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(student.firstName, student.lastName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-xl font-semibold">
                {student.firstName} {student.lastName}
              </h3>
              <p className="text-sm text-muted-foreground">
                {student.group && `${student.group} • `}
                {student.major && `${student.major} • `}
                {student.course && `${student.course} курс`}
              </p>
            </div>
          </div>

          {student.note && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-500">
                  <Bookmark size={16} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Заметка</h4>
                  <p className="text-sm text-muted-foreground">{student.note}</p>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </CardHeader>

      <CardContent className="pb-2">
        <div className="space-y-4">
          {/* Контактная информация */}
          <div className="flex flex-col space-y-1.5">
            <div className="flex items-center text-sm">
              <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{student.email}</span>
            </div>
            {student.phone && (
              <div className="flex items-center text-sm">
                <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{student.phone}</span>
              </div>
            )}
          </div>

          {/* Блок "Активность" */}
          <div className="rounded-lg bg-secondary/30 p-3 space-y-2">
            <h4 className="text-sm font-medium flex items-center">
              <UserCheck className="mr-2 h-4 w-4" />
              Активность
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {student.lastLogin && (
                <div className="flex items-center">
                  <span className="text-muted-foreground">Последний вход:</span>
                  <span className="ml-2">
                    {formatDistanceToNow(new Date(student.lastLogin), { 
                      addSuffix: true,
                      locale: ru
                    })}
                  </span>
                </div>
              )}
              
              {student.upcomingLesson && (
                <div className="flex items-center">
                  <Calendar className="mr-2 h-4 w-4 text-blue-500" />
                  <span>{student.upcomingLesson}</span>
                </div>
              )}
              
              {(student.tasksOpen !== undefined || student.tasksDone !== undefined) && (
                <div className="flex items-center">
                  <ClipboardList className="mr-2 h-4 w-4 text-green-600" />
                  <span>
                    Задачи: {student.tasksDone || 0} / {(student.tasksOpen || 0) + (student.tasksDone || 0)}
                  </span>
                </div>
              )}
              
              {student.unreadNotifications !== undefined && student.unreadNotifications > 0 && (
                <div className="flex items-center">
                  <Bell className="mr-2 h-4 w-4 text-amber-500" />
                  <span>Уведомления:</span>
                  <Badge variant="secondary" className="ml-2 bg-primary/10">
                    {student.unreadNotifications}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Блок "Успеваемость и посещаемость" */}
          {(student.averageGrade !== undefined || student.missedClasses !== undefined) && (
            <div className="rounded-lg bg-secondary/30 p-3 space-y-2">
              <h4 className="text-sm font-medium flex items-center">
                <BarChart2 className="mr-2 h-4 w-4" />
                Успеваемость
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {student.averageGrade !== undefined && (
                  <div className="flex items-center">
                    <span className="text-muted-foreground">Средний балл:</span>
                    <Badge 
                      className={`ml-2 ${
                        student.averageGrade >= 90 ? 'bg-green-500' : 
                        student.averageGrade >= 75 ? 'bg-blue-500' : 
                        student.averageGrade >= 60 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                    >
                      {student.averageGrade}
                    </Badge>
                  </div>
                )}
                
                {student.missedClasses !== undefined && (
                  <div className="flex items-center">
                    <span className="text-muted-foreground">Пропущено занятий:</span>
                    <Badge 
                      variant="outline" 
                      className={`ml-2 ${
                        student.missedClasses > 5 ? 'border-red-500 text-red-500' : 
                        student.missedClasses > 2 ? 'border-amber-500 text-amber-500' : 
                        'border-green-500 text-green-500'
                      }`}
                    >
                      {student.missedClasses}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-2 flex justify-between">
        <Button variant="outline" size="sm" onClick={handleClick}>
          <Info className="mr-2 h-4 w-4" />
          Подробнее
        </Button>
        <Button variant="ghost" size="sm">
          <Edit className="mr-2 h-4 w-4" />
          Редактировать
        </Button>
      </CardFooter>
    </Card>
  );
};

export default StudentCard;