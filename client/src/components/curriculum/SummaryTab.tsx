import React, { useEffect, useMemo, useState } from 'react';
import { buildSummary } from '@/utils/buildSummary';
import { SummaryTable } from './SummaryTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useCurriculum } from '@/lib/curriculumStore';

interface SummaryTabProps {
  calendarData: Record<string, string>;
  yearsOfStudy: number;
  monthsOfStudy?: number;  // Количество дополнительных месяцев обучения
  effectiveCourseCount?: number; // Эффективное количество курсов (полные годы + хвостовой курс)
  updateCounter?: number; // Счетчик для принудительного обновления
}

export const SummaryTab: React.FC<SummaryTabProps> = ({ 
  calendarData, 
  yearsOfStudy,
  monthsOfStudy = 0,
  effectiveCourseCount,
  updateCounter = 0
}) => {
  // Получаем значения из глобального хранилища
  const { 
    yearsOfStudy: storeYearsOfStudy, 
    monthsOfStudy: storeMonthsOfStudy,
    getEffectiveCourseCount 
  } = useCurriculum();
  
  // Приоритет: props > глобальное хранилище > дефолты
  const effectiveYearsOfStudy = yearsOfStudy > 0 ? yearsOfStudy : (storeYearsOfStudy > 0 ? storeYearsOfStudy : 4);
  const effectiveMonthsOfStudy = monthsOfStudy >= 0 ? monthsOfStudy : (storeMonthsOfStudy >= 0 ? storeMonthsOfStudy : 0);
  
  // Определяем реальное количество курсов с учетом хвостового курса
  const actualCourseCount = effectiveCourseCount !== undefined 
    ? effectiveCourseCount 
    : getEffectiveCourseCount();
  
  // Создаем локальную копию данных календаря
  const [localData, setLocalData] = useState<Record<string, string>>({});
  
  // Обновляем локальные данные при изменении calendarData или параметров
  useEffect(() => {
    // Создаем глубокую копию данных
    const dataCopy = JSON.parse(JSON.stringify(calendarData || {}));
    setLocalData(dataCopy);
  }, [calendarData, effectiveYearsOfStudy, effectiveMonthsOfStudy, actualCourseCount, updateCounter]);
  
  // Вычисляем итоговые данные на основе полученных данных
  const summary = useMemo(() => {
    if (Object.keys(localData).length === 0) {
      return [];
    }
    
    // Передаем effectiveCourseCount вместо yearsOfStudy для учета хвостового курса
    return buildSummary(localData, actualCourseCount);
  }, [localData, actualCourseCount]);
  
  // Если данных нет, показываем предупреждение
  if (Object.keys(localData).length === 0) {
    return (
      <Alert className="mb-4 bg-yellow-50 text-yellow-900 border-yellow-200">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Данные отсутствуют</AlertTitle>
        <AlertDescription>
          Нет данных для отображения. Пожалуйста, заполните график реализации.
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Итоговая таблица учебных мероприятий</CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto">
          <SummaryTable summary={summary} courses={actualCourseCount} />
        </CardContent>
      </Card>
    </div>
  );
};