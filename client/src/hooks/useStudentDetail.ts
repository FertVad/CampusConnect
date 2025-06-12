import React, { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Notification } from '@/types/notifications';
import StudentCard, { Student, UpcomingLesson } from '@/components/students/StudentCard';
import { Task } from '@/components/students/StudentTaskItem';

interface UserData {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  createdAt: string;
  phone?: string;
  groupId?: number;
}

interface ScheduleItem {
  id: number;
  subjectId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  roomNumber?: string;
  teacherName?: string;
  subject: {
    name: string;
    shortName?: string;
    color?: string;
  };
}

export function useStudentDetail(id: number | string | undefined) {
  const userId = Number(id);

  const {
    data: userData,
    isLoading: userLoading,
    error: userError,
  } = useQuery({
    queryKey: ['/api/users', userId],
    queryFn: async () => {
      return await apiRequest(`/api/users/${userId}`) as UserData;
    },
    enabled: !!userId && !isNaN(userId),
  });

  const {
    data: notifications = [],
    isLoading: notificationsLoading,
  } = useQuery({
    queryKey: ['/api/users', userId, 'notifications'],
    queryFn: async () => {
      return await apiRequest(`/api/users/${userId}/notifications`) as Notification[];
    },
    enabled: !!userId && !isNaN(userId),
  });

  const {
    data: tasks = [],
    isLoading: tasksLoading,
  } = useQuery({
    queryKey: ['/api/users', userId, 'tasks'],
    queryFn: async () => {
      return await apiRequest(`/api/users/${userId}/tasks`) as Task[];
    },
    enabled: !!userId && !isNaN(userId) && userData?.role === 'student',
  });

  const { data: scheduleItems = [] } = useQuery({
    queryKey: ['/api/schedule'],
    queryFn: async () => {
      return await apiRequest(`/api/schedule`) as ScheduleItem[];
    },
    enabled: !!userData?.groupId,
  });

  const findUpcomingLesson = useCallback((): UpcomingLesson | null => {
    if (!scheduleItems || scheduleItems.length === 0) return null;

    const now = new Date();
    const currentDayOfWeek = now.getDay();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const relevantLessons = scheduleItems.filter(item => {
      const [hours, minutes] = item.startTime.split(':').map(Number);
      const lessonTime = hours * 60 + minutes;

      if (item.dayOfWeek === currentDayOfWeek && lessonTime > currentTime) {
        return true;
      }

      if (currentDayOfWeek === 6 && item.dayOfWeek === 0) {
        return lessonTime < currentTime + (24 - (now.getHours() % 24)) * 60;
      } else if (item.dayOfWeek === (currentDayOfWeek + 1) % 7) {
        return lessonTime + 24 * 60 < currentTime + 36 * 60;
      }

      return false;
    });

    if (relevantLessons.length === 0) return null;

    relevantLessons.sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) {
        const adjustA = a.dayOfWeek < currentDayOfWeek ? a.dayOfWeek + 7 : a.dayOfWeek;
        const adjustB = b.dayOfWeek < currentDayOfWeek ? b.dayOfWeek + 7 : b.dayOfWeek;
        return adjustA - adjustB;
      }

      const [aHours, aMinutes] = a.startTime.split(':').map(Number);
      const [bHours, bMinutes] = b.startTime.split(':').map(Number);
      return aHours * 60 + aMinutes - (bHours * 60 + bMinutes);
    });

    const nextLesson = relevantLessons[0];

    return {
      id: nextLesson.id,
      subjectName: nextLesson.subject.name,
      startTime: nextLesson.startTime,
      endTime: nextLesson.endTime,
      roomNumber: nextLesson.roomNumber || undefined,
      teacherName: nextLesson.teacherName || undefined,
      dayOfWeek: nextLesson.dayOfWeek,
    };
  }, [scheduleItems]);

  const mapToStudentProps = useCallback((): Student | null => {
    if (!userData) return null;

    const unreadCount = notifications.filter(n => !n.isRead).length;
    const openTasks = tasks.filter(t => t.status === 'new' || t.status === 'in_progress').length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const upcomingLesson = findUpcomingLesson();

    return {
      id: userData.id,
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      phone: userData.phone,
      groupId: userData.groupId,
      group: 'ИС-101',
      major: 'Информатика и ВТ',
      course: 3,
      lastLogin: userData.createdAt,
      upcomingLesson,
      tasksOpen: openTasks,
      tasksDone: completedTasks,
      unreadNotifications: unreadCount,
      averageGrade: 85,
      missedClasses: 2,
      note: 'Активный студент, участвует в общественной деятельности.',
    };
  }, [userData, notifications, tasks, findUpcomingLesson]);

  const studentData = useMemo(() => mapToStudentProps(), [mapToStudentProps]);

  const isLoading = userLoading || notificationsLoading || tasksLoading;

  return {
    userData,
    notifications,
    tasks,
    scheduleItems,
    studentData,
    userLoading,
    notificationsLoading,
    tasksLoading,
    error: userError,
    isLoading,
  };
}

export default useStudentDetail;
