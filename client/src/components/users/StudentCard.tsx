import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { UserData } from './UserCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import EditStudentProfileModal from '../students/EditStudentProfileModal';
import {
  Calendar,
  ClipboardList,
  Bell,
  BarChart2,
  UserCheck,
  MapPin,
  GraduationCap
} from 'lucide-react';

// Интерфейс для данных о ближайшем занятии
export interface UpcomingLesson {
  id: number;
  subjectName: string;
  startTime: string;
  endTime: string;
  roomNumber?: string;
  teacherName?: string;
  dayOfWeek: number;
}

// Интерфейс для данных студента
export interface Student extends UserData {
  group?: string;
  groupId?: number;
  major?: string;
  course?: number;
  upcomingLesson?: UpcomingLesson | null;
  tasksOpen?: number;
  tasksDone?: number;
  unreadNotifications?: number;
  averageGrade?: number;
  missedClasses?: number;
  role: 'student'; // Явно указываем, что это студент
}

interface StudentCardProps {
  student: Student;
  onClick?: (id: number) => void;
  onEdit?: (student: Student) => void;
}

/**
 * Форматирует ближайшее занятие для отображения
 */
const formatUpcomingLesson = (lesson: UpcomingLesson | null | undefined): string | null => {
  if (!lesson) return null;
  
  const daysOfWeek = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  const dayName = daysOfWeek[lesson.dayOfWeek];
  
  let displayText = `${lesson.subjectName}, ${lesson.startTime}`;
  if (lesson.roomNumber) {
    displayText += `, ауд. ${lesson.roomNumber}`;
  }
  
  // Если сегодня, показываем "Сегодня в 15:00"
  const now = new Date();
  if (now.getDay() === lesson.dayOfWeek) {
    displayText = `Сегодня в ${lesson.startTime}`;
  } else {
    displayText = `${dayName}, ${lesson.startTime}`;
  }
  
  return displayText;
};

const StudentCard: React.FC<StudentCardProps> = ({ 
  student, 
  onClick,
  onEdit
}) => {
  const { t } = useTranslation();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Выводим данные студента для отладки
  console.log('StudentCard received data:', student);
  
  // Подготовка данных для карточки
  const studentData = {
    ...student,
    // Обеспечиваем совместимость с интерфейсом Student, добавляя свойства если они отсутствуют
    tasksOpen: student.tasksOpen !== undefined ? student.tasksOpen : 0,
    tasksDone: student.tasksDone !== undefined ? student.tasksDone : 0,
    unreadNotifications: student.unreadNotifications !== undefined ? student.unreadNotifications : 0,
    averageGrade: student.averageGrade !== undefined ? student.averageGrade : 85,
    missedClasses: student.missedClasses !== undefined ? student.missedClasses : 2
  };
  
  const handleClick = () => {
    if (onClick) {
      onClick(student.id);
    }
  };
  
  const handleEdit = () => {
    setIsEditModalOpen(true);
    if (onEdit) {
      onEdit(student);
    }
  };

  // Получаем инициалы для аватара
  const initials = `${student.firstName?.charAt(0) || ''}${student.lastName?.charAt(0) || ''}`;

  return (
    <>
      <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                {studentData.photoUrl ? (
                  <AvatarImage src={studentData.photoUrl} alt={`${studentData.firstName} ${studentData.lastName}`} />
                ) : (
                  <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <CardTitle className="text-xl">{studentData.firstName} {studentData.lastName}</CardTitle>
                <div className="flex flex-wrap gap-2 mt-1">
                  <Badge variant="secondary" className="flex items-center gap-1 text-sm">
                    <GraduationCap className="h-3.5 w-3.5" />
                    {t('roles.student', 'Студент')}
                  </Badge>
                  {studentData.group && (
                    <Badge variant="outline" className="text-sm">
                      {studentData.group}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Основная информация */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{t('user.email', 'Электронная почта')}</p>
                <p className="font-medium">{studentData.email}</p>
              </div>
              {studentData.phone && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t('user.phone', 'Телефон')}</p>
                  <p className="font-medium">{studentData.phone}</p>
                </div>
              )}
            </div>

            {/* Информация о специальности */}
            {(studentData.major || studentData.course) && (
              <div className="flex flex-col space-y-1">
                {studentData.major && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{t('student.major', 'Специальность')}</p>
                    <p className="font-medium">{studentData.major}</p>
                  </div>
                )}
                {studentData.course && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{t('student.course', 'Курс')}</p>
                    <p className="font-medium">{studentData.course}</p>
                  </div>
                )}
              </div>
            )}

            {/* Блок "Ближайшее занятие" */}
            {studentData.upcomingLesson && (
              <div className="pt-4 border-t">
                <h3 className="font-medium mb-3">{t('student.nextLesson', 'Ближайшее занятие')}</h3>
                <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-3 border border-blue-100 dark:border-blue-800">
                  <div className="flex flex-col gap-1 text-sm">
                    <div className="font-medium">{studentData.upcomingLesson.subjectName}</div>
                    <div className="flex items-center text-blue-600 dark:text-blue-300">
                      <Badge variant="outline" className="border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/40 mr-2">
                        {formatUpcomingLesson(studentData.upcomingLesson)}
                      </Badge>
                    </div>
                    {studentData.upcomingLesson.roomNumber && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="mr-1 h-3 w-3" />
                        <span>Аудитория {studentData.upcomingLesson.roomNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Блок "Статистика" всегда показываем */}
            <div className="pt-4 border-t">
              <h3 className="font-medium mb-3">{t('student.activity', 'Активность')}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Задачи - всегда отображаем */}
                <div className="bg-secondary/50 p-3 rounded-lg flex flex-col">
                  <span className="text-sm text-muted-foreground">{t('student.tasks', 'Задачи')}</span>
                  <div className="flex items-center mt-1">
                    <ClipboardList className="h-4 w-4 mr-1 text-primary" />
                    <span className="text-lg font-bold">
                      {studentData.tasksDone} / {studentData.tasksOpen + studentData.tasksDone}
                    </span>
                  </div>
                </div>
                
                {/* Средний балл - всегда отображаем */}
                <div className="bg-secondary/50 p-3 rounded-lg flex flex-col">
                  <span className="text-sm text-muted-foreground">{t('student.averageGrade', 'Средний балл')}</span>
                  <div className="flex items-center mt-1">
                    <BarChart2 className="h-4 w-4 mr-1 text-primary" />
                    <span className={`text-lg font-bold ${
                      studentData.averageGrade >= 90 ? 'text-green-600' : 
                      studentData.averageGrade >= 75 ? 'text-blue-600' : 
                      studentData.averageGrade >= 60 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {studentData.averageGrade}
                    </span>
                  </div>
                </div>
                
                {/* Пропущенные занятия - всегда отображаем */}
                <div className="bg-secondary/50 p-3 rounded-lg flex flex-col">
                  <span className="text-sm text-muted-foreground">{t('student.missedClasses', 'Пропущено')}</span>
                  <div className="flex items-center mt-1">
                    <Calendar className="h-4 w-4 mr-1 text-primary" />
                    <span className={`text-lg font-bold ${
                      studentData.missedClasses > 5 ? 'text-red-600' : 
                      studentData.missedClasses > 2 ? 'text-amber-600' : 
                      'text-green-600'
                    }`}>
                      {studentData.missedClasses}
                    </span>
                  </div>
                </div>
                
                {/* Уведомления - всегда отображаем */}
                <div className="bg-secondary/50 p-3 rounded-lg flex flex-col">
                  <span className="text-sm text-muted-foreground">{t('notifications.title', 'Уведомления')}</span>
                  <div className="flex items-center mt-1">
                    <Bell className="h-4 w-4 mr-1 text-primary" />
                    <span className="text-lg font-bold">
                      {studentData.unreadNotifications}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Модальное окно редактирования профиля */}
      {isEditModalOpen && (
        <EditStudentProfileModal 
          isOpen={isEditModalOpen} 
          onClose={() => setIsEditModalOpen(false)} 
          student={student} 
        />
      )}
    </>
  );
};

export default StudentCard;