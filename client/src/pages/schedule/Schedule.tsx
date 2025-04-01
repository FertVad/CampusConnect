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
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

// Convert 24-hour time format to 12-hour format with AM/PM
function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
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
        throw new Error('Failed to fetch schedule');
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
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load your schedule. Please try again later.
          </AlertDescription>
        </Alert>
      );
    }
    
    return (
      <div className="space-y-6">
        {DAYS_OF_WEEK.map((day, index) => {
          // Skip weekends unless there are classes scheduled
          if ((day === 'Saturday' || day === 'Sunday') && 
              (!scheduleByDay[day] || scheduleByDay[day].length === 0)) {
            return null;
          }
          
          return (
            <Card key={day}>
              <CardHeader className="pb-2">
                <CardTitle>{day}</CardTitle>
                <CardDescription>
                  {scheduleByDay[day]?.length 
                    ? `${scheduleByDay[day].length} class${scheduleByDay[day].length > 1 ? 'es' : ''} scheduled`
                    : 'No classes scheduled'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {scheduleByDay[day]?.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Room</TableHead>
                        <TableHead>Teacher</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scheduleByDay[day].map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.subject?.name || 'Unknown Subject'}
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
                              {item.roomNumber || 'TBA'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4 text-muted-foreground" />
                              {item.subject?.teacher?.firstName 
                                ? `${item.subject.teacher.firstName} ${item.subject.teacher.lastName}` 
                                : 'Not Assigned'}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No classes scheduled for {day}
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
        <h1 className="text-3xl font-bold">Weekly Schedule</h1>
        {userIsAdmin && (
          <Button 
            variant={activeTab === "import" ? "default" : "outline"}
            onClick={() => setActiveTab(activeTab === "schedule" ? "import" : "schedule")}
          >
            {activeTab === "schedule" ? (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Import Schedule
              </>
            ) : (
              <>
                <Clock className="mr-2 h-4 w-4" />
                View Schedule
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