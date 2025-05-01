import React, { useEffect, useMemo, useState } from 'react';
import { buildSummary } from '@/utils/buildSummary';
import { SummaryTable } from './SummaryTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface SummaryTabProps {
  calendarData: Record<string, string>;
  yearsOfStudy: number;
  updateCounter?: number; // Счетчик для принудительного обновления
}

export const SummaryTab: React.FC<SummaryTabProps> = ({ 
  calendarData, 
  yearsOfStudy,
  updateCounter = 0
}) => {
  console.log('[SummaryTab] Render with data:', calendarData, 'updateCounter:', updateCounter);
  
  // Создаем локальную копию данных календаря
  const [localData, setLocalData] = useState<Record<string, string>>({});
  
  // Обновляем локальные данные при изменении calendarData или yearsOfStudy
  useEffect(() => {
    console.log('[SummaryTab] Data changed:', { calendarData, yearsOfStudy, updateCounter });
    // Создаем глубокую копию данных
    const dataCopy = JSON.parse(JSON.stringify(calendarData || {}));
    setLocalData(dataCopy);
  }, [calendarData, yearsOfStudy, updateCounter]);
  
  // Вычисляем итоговые данные на основе полученных данных
  const summary = useMemo(() => {
    console.log('[SummaryTab] Building summary with data:', localData);
    if (Object.keys(localData).length === 0) {
      console.log('[SummaryTab] No data for summary');
      return [];
    }
    
    return buildSummary(localData, yearsOfStudy);
  }, [localData, yearsOfStudy]);
  
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
          <SummaryTable summary={summary} courses={yearsOfStudy} />
        </CardContent>
      </Card>
    </div>
  );
};