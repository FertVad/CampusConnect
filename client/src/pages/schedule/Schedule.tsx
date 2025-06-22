import React, { useState } from 'react';
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
  FileText,
  MapPin,
  Upload,
  User,
  Calendar,
  CalendarDays,
  CalendarIcon,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ScheduleImport from '@/components/schedule/ScheduleImport';
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
import { useFilteredSchedule } from '@/hooks/useFilteredSchedule';
import { formatTime } from '@/lib/utils';

export default function Schedule() {
  const [activeTab, setActiveTab] = useState('schedule');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const {
    scheduleByDay,
    formattedDate,
    viewPeriod,
    selectedDate,
    handleDateChange,
    handlePeriodChange,
    navigatePeriod,
    isLoading,
    error,
    userIsAdmin,
  } = useFilteredSchedule();

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

    const daysWithClasses = Object.keys(scheduleByDay).filter(
      (day) => scheduleByDay[day].length > 0,
    );

    if (daysWithClasses.length === 0) {
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
                          {item.teacherName ||
                            (item.subject?.teacher?.firstName
                              ? `${item.subject.teacher.firstName} ${item.subject.teacher.lastName}`
                              : 'Не назначен')}
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

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Расписание</h1>
        <div className="flex gap-2">
          {userIsAdmin && (
            <>
              <Button
                variant="outline"
                onClick={() => (window.location.href = '/admin/imported-files')}
                aria-label="Перейти к менеджеру файлов"
              >
                <FileText className="mr-2 h-4 w-4" />
                Менеджер файлов
              </Button>
              <Button
                variant={activeTab === 'import' ? 'default' : 'outline'}
                onClick={() => setActiveTab(activeTab === 'schedule' ? 'import' : 'schedule')}
              >
                {activeTab === 'schedule' ? (
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
            </>
          )}
        </div>
      </div>

      {activeTab === 'schedule' ? (
        <>
          <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => navigatePeriod('prev')}
                disabled={viewPeriod === 'all'}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="min-w-[240px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formattedDate}
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
                onClick={() => navigatePeriod('next')}
                disabled={viewPeriod === 'all'}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Select value={viewPeriod} onValueChange={handlePeriodChange}>
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
