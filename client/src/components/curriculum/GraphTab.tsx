import { useState, useMemo, useEffect } from "react";
import { StartDatePicker } from "@/components/ui/StartDatePicker";
import { buildAcademicWeeks, getFirstWorkdayOfSeptember } from "@/utils/calendar";
import { AcademicCalendarTable } from "@/components/curriculum/AcademicCalendarTable";

interface GraphTabProps {
  planYear: number;       // Год начала обучения (по умолчанию)
  yearsOfStudy: number;   // Количество лет обучения
  initialData?: Record<string, string>; // Начальные данные календаря
  onChange?: (data: Record<string, string>) => void; // Колбэк для сохранения изменений
}

export default function GraphTab({ 
  planYear = 2025, 
  yearsOfStudy = 4,
  initialData = {},
  onChange
}: GraphTabProps) {
  // Получаем первый рабочий день сентября в году начала обучения
  const firstWorkdayInSeptember = useMemo(() => 
    getFirstWorkdayOfSeptember(planYear),
    [planYear]
  );
  
  // Используем этот день как дату начала по умолчанию
  const [startDate, setStartDate] = useState<Date>(firstWorkdayInSeptember);
  
  // Обновляем дату начала при изменении planYear
  useEffect(() => {
    setStartDate(getFirstWorkdayOfSeptember(planYear));
  }, [planYear]);

  // Генерируем недели на основе выбранной даты старта
  const weeks = useMemo(() => 
    buildAcademicWeeks(startDate, yearsOfStudy), 
    [startDate, yearsOfStudy]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Дата начала обучения:</span>
        <StartDatePicker value={startDate} onChange={setStartDate} />
        <div className="text-xs text-slate-500 ml-2">
          (По умолчанию - первый рабочий день сентября {planYear} года)
        </div>
      </div>

      <AcademicCalendarTable 
        weeks={weeks} 
        yearsOfStudy={yearsOfStudy}
        initialData={initialData}
        onChange={onChange}
      />
    </div>
  );
}