import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { format, parseISO, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, eachDayOfInterval } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertCircle, 
  Clock, 
  Download, 
  MapPin, 
  Upload, 
  User, 
  Calendar, 
  CalendarDays, 
  CalendarIcon, 
  CalendarRange, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Subject } from '@shared/schema';
import ScheduleImport from '@/components/schedule/ScheduleImport';
import { isAdmin } from '@/lib/auth';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Map weekday numbers to names
const DAYS_OF_WEEK = [
  'Воскресенье',
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
];

// Format time in 24-hour format for Russian convention
function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// Периоды отображения расписания
type ViewPeriod = 'day' | 'week' | 'month' | 'year' | 'all';

export default function Schedule() {
  const { user } = useAuth();
  const isStudent = user?.role === 'student';
  const isTeacher = user?.role === 'teacher';
  const userIsAdmin = isAdmin(user?.role);
  const [activeTab, setActiveTab] = useState<string>("schedule");
  const [viewPeriod, setViewPeriod] = useState<ViewPeriod>('all');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  
  // Получение всех элементов расписания (для администратора)
  const allSchedule = useQuery({
    queryKey: ['/api/schedule'],
    queryFn: async () => {
      const response = await fetch('/api/schedule');
      if (!response.ok) {
        throw new Error('Не удалось загрузить полное расписание');
      }
      return await response.json();
    },
    enabled: !!user && userIsAdmin, // Только для администраторов
  });
  
  // Получение расписания по роли пользователя (для преподавателей и студентов)
  const roleBasedSchedule = useQuery({
    queryKey: [isStudent ? '/api/schedule/student' : '/api/schedule/teacher'],
    queryFn: async () => {
      const endpoint = isStudent 
        ? `/api/schedule/student`
        : `/api/schedule/teacher`;
      
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error('Не удалось загрузить расписание');
      }
      return await response.json();
    },
    enabled: !!user && !userIsAdmin, // Только для студентов и преподавателей
  });
  
  // Объединяем данные из двух запросов
  const scheduleItems = userIsAdmin ? allSchedule.data : roleBasedSchedule.data;
  const isLoading = userIsAdmin ? allSchedule.isLoading : roleBasedSchedule.isLoading;
  const error = userIsAdmin ? allSchedule.error : roleBasedSchedule.error;
  
  // Функция фильтрации расписания на основе выбранного периода и даты
  const getFilteredScheduleItems = () => {
    if (!scheduleItems) return [];
    
    // Если отображение всех элементов, возвращаем без фильтрации
    if (viewPeriod === 'all') {
      return scheduleItems;
    }
    
    const today = new Date();
    let startDate: Date;
    let endDate: Date;
    
    // Определение периода на основе выбранного значения и даты
    switch (viewPeriod) {
      case 'day':
        startDate = selectedDate;
        endDate = selectedDate;
        break;
      case 'week':
        startDate = startOfWeek(selectedDate, { locale: ru, weekStartsOn: 1 });
        endDate = endOfWeek(selectedDate, { locale: ru, weekStartsOn: 1 });
        break;
      case 'month':
        startDate = startOfMonth(selectedDate);
        endDate = endOfMonth(selectedDate);
        break;
      case 'year':
        startDate = startOfYear(selectedDate);
        endDate = endOfYear(selectedDate);
        break;
      default:
        return scheduleItems;
    }
    
    // В данной версии расписание привязано к дням недели
    // Поэтому мы фильтруем элементы, день недели которых попадает в выбранный период
    const daysInRange = eachDayOfInterval({ start: startDate, end: endDate });
    const weekdaysInRange = daysInRange.map(date => date.getDay());
    // Создаем массив уникальных дней недели
    const uniqueWeekdaysInRange = Array.from(new Set(weekdaysInRange));
    
    // Фильтруем элементы расписания по дням недели
    return scheduleItems.filter((item: any) => uniqueWeekdaysInRange.includes(item.dayOfWeek));
  };
  
  // Получаем отфильтрованные элементы расписания
  const filteredScheduleItems = getFilteredScheduleItems();
  
  // Группировка элементов расписания по дням недели
  const scheduleByDay = React.useMemo(() => {
    if (!filteredScheduleItems || filteredScheduleItems.length === 0) return {};
    
    const grouped: Record<string, any[]> = {};
    
    DAYS_OF_WEEK.forEach(day => {
      grouped[day] = [];
    });
    
    filteredScheduleItems.forEach((item: any) => {
      const day = DAYS_OF_WEEK[item.dayOfWeek];
      if (!grouped[day]) {
        grouped[day] = [];
      }
      grouped[day].push(item);
    });
    
    // Сортировка элементов по времени начала занятия
    Object.keys(grouped).forEach(day => {
      grouped[day].sort((a: any, b: any) => {
        const aTime = a.startTime.split(':').map(Number);
        const bTime = b.startTime.split(':').map(Number);
        
        if (aTime[0] !== bTime[0]) {
          return aTime[0] - bTime[0];
        }
        return aTime[1] - bTime[1];
      });
    });
    
    return grouped;
  }, [filteredScheduleItems]);

  // Determine if we should show admin features
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-8 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }
    
    if (error) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Ошибка</AlertTitle>
          <AlertDescription>
            Не удалось загрузить расписание. Пожалуйста, попробуйте позже.
          </AlertDescription>
        </Alert>
      );
    }
    
    // Если нет элементов расписания или они еще не загружены
    if (!filteredScheduleItems || filteredScheduleItems.length === 0) {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Нет расписания</AlertTitle>
          <AlertDescription>
            {viewPeriod === 'all' 
              ? 'Расписание отсутствует. Попробуйте импортировать расписание или добавить занятия вручную.'
              : 'Нет занятий в выбранном периоде. Попробуйте выбрать другой период или установить "Все расписание".'}
          </AlertDescription>
        </Alert>
      );
    }
    
    // Получаем дни, для которых есть занятия
    const daysWithClasses = Object.keys(scheduleByDay).filter(day => scheduleByDay[day].length > 0);
    
    if (daysWithClasses.length === 0) {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Нет расписания</AlertTitle>
          <AlertDescription>
            Нет занятий в выбранном периоде. Попробуйте выбрать другой период или установить "Все расписание".
          </AlertDescription>
        </Alert>
      );
    }
    
    return (
      <div className="space-y-6">
        {daysWithClasses.map((day) => (
          <Card key={day}>
            <CardHeader className="pb-2">
              <CardTitle>{day}</CardTitle>
              <CardDescription>
                {`${scheduleByDay[day].length} ${scheduleByDay[day].length > 1 ? 'занятий' : 'занятие'} запланировано`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Предмет</TableHead>
                    <TableHead>Время</TableHead>
                    <TableHead>Кабинет</TableHead>
                    <TableHead>Преподаватель</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduleByDay[day].map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.subject?.name || 'Неизвестный предмет'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {formatTime(item.startTime)} - {formatTime(item.endTime)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {item.roomNumber || 'Не назначен'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {item.subject?.teacher?.firstName 
                            ? `${item.subject.teacher.firstName} ${item.subject.teacher.lastName}` 
                            : 'Не назначен'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // Форматирование выбранной даты в понятный формат
  const formattedDate = format(selectedDate, 'dd MMMM yyyy', { locale: ru });
  
  // Функция обновления даты 
  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setIsCalendarOpen(false);
    }
  };
  
  // Функция обновления периода просмотра
  const handlePeriodChange = (value: string) => {
    setViewPeriod(value as ViewPeriod);
  };
  
  // Переход на следующий/предыдущий период
  const navigatePeriod = (direction: 'prev' | 'next') => {
    const today = new Date(selectedDate);
    let newDate;
    
    switch(viewPeriod) {
      case 'day':
        newDate = direction === 'prev' 
          ? addDays(today, -1) 
          : addDays(today, 1);
        break;
      case 'week':
        newDate = direction === 'prev' 
          ? addDays(today, -7) 
          : addDays(today, 7);
        break;
      case 'month':
        newDate = new Date(today.getFullYear(), today.getMonth() + (direction === 'prev' ? -1 : 1), today.getDate());
        break;
      case 'year':
        newDate = new Date(today.getFullYear() + (direction === 'prev' ? -1 : 1), today.getMonth(), today.getDate());
        break;
      default:
        newDate = today;
    }
    
    setSelectedDate(newDate);
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Расписание</h1>
        <div className="flex gap-2">
          {userIsAdmin && (
            <Button 
              variant={activeTab === "import" ? "default" : "outline"}
              onClick={() => setActiveTab(activeTab === "schedule" ? "import" : "schedule")}
            >
              {activeTab === "schedule" ? (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Импорт расписания
                </>
              ) : (
                <>
                  <Clock className="mr-2 h-4 w-4" />
                  Просмотр расписания
                </>
              )}
            </Button>
          )}
        </div>
      </div>
      
      {activeTab === "schedule" ? (
        <>
          <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigatePeriod('prev')}
                disabled={viewPeriod === 'all'}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="min-w-[240px] justify-start text-left font-normal" disabled={viewPeriod === 'all'}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {viewPeriod === 'all' ? 'Все расписание' : formattedDate}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigatePeriod('next')}
                disabled={viewPeriod === 'all'}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Select
                value={viewPeriod}
                onValueChange={handlePeriodChange}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Выберите период" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center">
                      <CalendarRange className="mr-2 h-4 w-4" />
                      <span>Все расписание</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="day">
                    <div className="flex items-center">
                      <Calendar className="mr-2 h-4 w-4" />
                      <span>День</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="week">
                    <div className="flex items-center">
                      <CalendarDays className="mr-2 h-4 w-4" />
                      <span>Неделя</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="month">
                    <div className="flex items-center">
                      <Calendar className="mr-2 h-4 w-4" />
                      <span>Месяц</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="year">
                    <div className="flex items-center">
                      <Calendar className="mr-2 h-4 w-4" />
                      <span>Год</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {renderContent()}
        </>
      ) : (
        <ScheduleImport />
      )}
    </div>
  );
}