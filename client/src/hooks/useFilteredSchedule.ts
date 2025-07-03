import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { useAuth } from '@/hooks/use-auth';
import { isAdmin } from '@/lib/auth';
import { authFetch } from '@/lib/queryClient';

const DAYS_OF_WEEK = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

export type ViewPeriod = 'day' | 'week' | 'month' | 'year' | 'all';

export function useFilteredSchedule() {
  const { user } = useAuth();
  const userIsAdmin = isAdmin(user?.role);

  const [viewPeriod, setViewPeriod] = useState<ViewPeriod>('all');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const scheduleQuery = useQuery({
    queryKey: ['/api/schedule', user?.role],
    queryFn: async () => {
      const response = await authFetch('/api/schedule');
      if (!response.ok) {
        throw new Error('Не удалось загрузить расписание');
      }
      return response.json();
    },
    enabled: !!user,
  });

  const scheduleItems = scheduleQuery.data;
  const isLoading = scheduleQuery.isLoading;
  const error = scheduleQuery.error;

  const filteredItems = useMemo(() => {
    if (!scheduleItems) return [];

    if (viewPeriod === 'all') {
      const today = new Date();
      const isCustomDate =
        selectedDate.getDate() !== today.getDate() ||
        selectedDate.getMonth() !== today.getMonth() ||
        selectedDate.getFullYear() !== today.getFullYear();

      if (isCustomDate) {
        const dayOfWeek = selectedDate.getDay();
        return scheduleItems.filter((item: any) => item.dayOfWeek === dayOfWeek);
      }
      return scheduleItems;
    }

    let startDate: Date;
    let endDate: Date;

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

    const daysInRange = eachDayOfInterval({ start: startDate, end: endDate });
    const weekdaysInRange = daysInRange.map(date => date.getDay());
    const uniqueWeekdaysInRange = Array.from(new Set(weekdaysInRange));

    return scheduleItems.filter((item: any) => uniqueWeekdaysInRange.includes(item.dayOfWeek));
  }, [scheduleItems, viewPeriod, selectedDate]);

  const scheduleByDay = useMemo(() => {
    if (!filteredItems || filteredItems.length === 0) return {} as Record<string, any[]>;

    const grouped: Record<string, any[]> = {};
    DAYS_OF_WEEK.forEach(day => {
      grouped[day] = [];
    });

    filteredItems.forEach((item: any) => {
      const day = DAYS_OF_WEEK[item.dayOfWeek];
      if (!grouped[day]) {
        grouped[day] = [];
      }
      grouped[day].push(item);
    });

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
  }, [filteredItems]);

  const navigatePeriod = (direction: 'prev' | 'next') => {
    const today = new Date(selectedDate);
    let newDate: Date;

    switch (viewPeriod) {
      case 'day':
        newDate = direction === 'prev' ? new Date(today.getTime() - 86400000) : new Date(today.getTime() + 86400000);
        break;
      case 'week':
        newDate = direction === 'prev' ? new Date(today.getTime() - 7 * 86400000) : new Date(today.getTime() + 7 * 86400000);
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

  const formattedDate = format(selectedDate, 'dd MMMM yyyy', { locale: ru });

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handlePeriodChange = (value: string) => {
    setViewPeriod(value as ViewPeriod);
  };

  const hasImportedData = Array.isArray(scheduleItems) && scheduleItems.length > 0;

  return {
    scheduleByDay,
    filteredItems,
    formattedDate,
    viewPeriod,
    selectedDate,
    userIsAdmin,
    setViewPeriod,
    setSelectedDate,
    handleDateChange,
    handlePeriodChange,
    navigatePeriod,
    isLoading,
    error,
    hasImportedData,
  };
}
