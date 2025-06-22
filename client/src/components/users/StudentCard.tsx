import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { getTaskStatusLabel } from '@/lib/taskStatus';
import { useQuery } from '@tanstack/react-query';
import { UserData } from './UserCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import EditUserProfileModal from './EditUserProfileModal';
import TaskDetailsModal, { TaskDetail } from '../tasks/TaskDetailsModal';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import {
  Calendar,
  ClipboardList,
  Bell,
  BarChart2,
  UserCheck,
  MapPin,
  GraduationCap,
  FileText,
  ChevronRight,
  Clock,
  Edit
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
  lastLogin?: string;
  documents?: {
    id: number;
    name: string;
    type: string;
    size: number;
    url: string;
    createdAt: string;
  }[];
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

// Форматирование даты последнего входа
const formatLastLogin = (dateString?: string) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return format(date, 'PPP', { locale: ru });
  } catch (e) {
    return '';
  }
};

const StudentCard: React.FC<StudentCardProps> = ({ 
  student, 
  onClick,
  onEdit
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  
  // Запрос для получения задач студента
  const { data: tasks = [], isLoading: isTasksLoading } = useQuery({
    queryKey: ['/api/users', student.id, 'tasks'],
    queryFn: async () => {
      return await apiRequest(`/api/users/${student.id}/tasks`) as TaskDetail[];
    },
    staleTime: 5 * 60 * 1000, // 5 минут
    enabled: !!student.id
  });
  
  // Подготовка данных для карточки
  const studentData = {
    ...student,
    // Обеспечиваем совместимость с интерфейсом Student, добавляя свойства если они отсутствуют
    tasksOpen: student.tasksOpen !== undefined ? student.tasksOpen : 0,
    tasksDone: student.tasksDone !== undefined ? student.tasksDone : 0,
    unreadNotifications: student.unreadNotifications !== undefined ? student.unreadNotifications : 0,
    averageGrade: student.averageGrade !== undefined ? student.averageGrade : 85,
    missedClasses: student.missedClasses !== undefined ? student.missedClasses : 2,
    documents: student.documents || []
  };
  
  // Активные задачи (не выполненные)
  const activeTasks = tasks.filter(task => task.status !== 'completed');
  
  const handleOpenTask = (task: TaskDetail) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };
  
  const handleTaskStatusChange = (taskId: number, status: string) => {
  };
  
  const handleEdit = () => {
    setIsEditModalOpen(true);
    if (onEdit) {
      onEdit(student);
    }
  };

  // Получаем инициалы для аватара
  const initials = `${student.firstName?.charAt(0) || ''}${student.lastName?.charAt(0) || ''}`;
  
  // Проверяем, имеет ли текущий пользователь право редактировать профиль
  const canEdit = user && (user.role === 'admin' || user.role === 'director');

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
            
            {/* Кнопка редактирования (только для админов/директоров) */}
            {canEdit && (
              <Button 
                size="sm" 
                variant="outline" 
                className="h-8" 
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

            {/* Информация о специальности и дате последнего входа */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(studentData.major || studentData.course) && (
                <div className="space-y-1">
                  {studentData.major && (
                    <>
                      <p className="text-sm text-muted-foreground">{t('student.major', 'Специальность')}</p>
                      <p className="font-medium">{studentData.major}</p>
                    </>
                  )}
                  {studentData.course && (
                    <div className="mt-1">
                      <p className="text-sm text-muted-foreground">{t('student.course', 'Курс')}</p>
                      <p className="font-medium">{studentData.course}</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Информация о последнем входе в систему */}
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{t('user.lastLogin', 'Последний вход')}</p>
                <p className="font-medium flex items-center">
                  <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                  {studentData.lastLogin 
                    ? formatLastLogin(studentData.lastLogin)
                    : t('user.never', 'Никогда')}
                </p>
              </div>
            </div>

            {/* Блок "Статистика" - всегда показываем */}
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
            
            {/* Блок "Задачи" - список активных задач с возможностью разворачивания в модальное окно */}
            <div className="pt-4 border-t">
              <h3 className="font-medium mb-3">{t('task.tasks', 'Задачи')}</h3>
              
              {isTasksLoading ? (
                <div className="text-sm text-muted-foreground py-2">
                  {t('common.loading', 'Загрузка...')}
                </div>
              ) : activeTasks.length > 0 ? (
                <div className="space-y-2">
                  {activeTasks.slice(0, 3).map(task => (
                    <div 
                      key={task.id}
                      className="rounded-lg bg-secondary/30 p-3 border border-border cursor-pointer hover:bg-secondary/50 transition-colors"
                      onClick={() => handleOpenTask(task)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm">{task.title}</p>
                          {task.dueDate && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {t('task.due_date', 'Срок')}:{' '}
                              {format(new Date(task.dueDate), 'PPP', { locale: ru })}
                            </p>
                          )}
                        </div>
                        <Badge 
                          variant="outline" 
                          className={
                            task.status === 'new' ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800' :
                            task.status === 'in_progress' ? 'bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-950/50 dark:text-yellow-400 dark:border-yellow-800' :
                            task.status === 'on_hold' ? 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700' :
                            'bg-green-50 text-green-600 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-800'
                          }
                        >
                          {getTaskStatusLabel(task.status, t)}
                        </Badge>
                      </div>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                          {task.description}
                        </p>
                      )}
                    </div>
                  ))}
                  
                  {activeTasks.length > 3 && (
                    <Button variant="ghost" size="sm" className="w-full mt-2">
                      <span>{t('task.viewAll', 'Показать все')} ({activeTasks.length})</span>
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground py-2">
                  {t('task.noTasks', 'Нет активных задач')}
                </div>
              )}
            </div>
            
            {/* Блок "Документы" */}
            <div className="pt-4 border-t">
              <h3 className="font-medium mb-3">{t('student.documents', 'Документы')}</h3>
              
              {studentData.documents && studentData.documents.length > 0 ? (
                <div className="space-y-2">
                  {studentData.documents.map(doc => (
                    <div 
                      key={doc.id}
                      className="rounded-lg bg-secondary/30 p-3 border border-border flex items-center justify-between"
                    >
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2 text-primary" />
                        <div>
                          <p className="font-medium text-sm">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.type} • {(doc.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        {t('common.download', 'Скачать')}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground py-2">
                  {t('student.noDocuments', 'Нет загруженных документов')}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Модальное окно редактирования профиля */}
      {isEditModalOpen && (
        <EditUserProfileModal 
          isOpen={isEditModalOpen} 
          onClose={() => setIsEditModalOpen(false)} 
          user={student} 
        />
      )}
      
      {/* Модальное окно с деталями задачи */}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          open={isTaskModalOpen}
          onOpenChange={setIsTaskModalOpen}
          onStatusChange={handleTaskStatusChange}
          userId={student.id}
        />
      )}
    </>
  );
};

export default StudentCard;