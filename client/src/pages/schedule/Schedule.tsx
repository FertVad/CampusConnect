import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { format, parseISO } from 'date-fns';
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
import { AlertCircle, Clock, Download, MapPin, Upload, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Subject } from '@shared/schema';
import ScheduleImport from '@/components/schedule/ScheduleImport';
import { isAdmin } from '@/lib/auth';

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

export default function Schedule() {
  const { user } = useAuth();
  const isStudent = user?.role === 'student';
  const isTeacher = user?.role === 'teacher';
  const userIsAdmin = isAdmin(user?.role);
  const [activeTab, setActiveTab] = useState<string>("schedule");
  
  // Fetch schedule data based on user role
  const { data: scheduleItems, isLoading, error } = useQuery({
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
    enabled: !!user, // Only run query if user is authenticated
  });

  // Group schedule items by day of week for easier display
  const scheduleByDay = React.useMemo(() => {
    if (!scheduleItems) return {};
    
    const grouped: Record<string, any[]> = {};
    
    DAYS_OF_WEEK.forEach(day => {
      grouped[day] = [];
    });
    
    scheduleItems.forEach((item: any) => {
      const day = DAYS_OF_WEEK[item.dayOfWeek];
      if (!grouped[day]) {
        grouped[day] = [];
      }
      grouped[day].push(item);
    });
    
    // Sort each day's items by start time
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
  }, [scheduleItems]);

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
    
    return (
      <div className="space-y-6">
        {DAYS_OF_WEEK.map((day, index) => {
          // Skip weekends unless there are classes scheduled
          if ((day === 'Суббота' || day === 'Воскресенье') && 
              (!scheduleByDay[day] || scheduleByDay[day].length === 0)) {
            return null;
          }
          
          return (
            <Card key={day}>
              <CardHeader className="pb-2">
                <CardTitle>{day}</CardTitle>
                <CardDescription>
                  {scheduleByDay[day]?.length 
                    ? `${scheduleByDay[day].length} ${scheduleByDay[day].length > 1 ? 'занятий' : 'занятие'} запланировано`
                    : 'Нет запланированных занятий'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {scheduleByDay[day]?.length ? (
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
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    Нет занятий в {day}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Расписание</h1>
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
      
      {userIsAdmin ? (
        <div>
          {activeTab === "schedule" ? (
            renderContent()
          ) : (
            <ScheduleImport />
          )}
        </div>
      ) : (
        renderContent()
      )}
    </div>
  );
}