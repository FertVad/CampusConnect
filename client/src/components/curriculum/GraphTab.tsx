import { useState, useMemo } from "react";
import { StartDatePicker } from "@/components/ui/StartDatePicker";
import { buildAcademicWeeks } from "@/utils/calendar";
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
  // Дата начала по умолчанию - 1 сентября года начала плана
  const defaultStart = new Date(planYear, 8, 1); // 1 сентября (месяцы с 0)
  const [startDate, setStartDate] = useState<Date>(defaultStart);

  // Генерируем недели на основе выбранной даты старта (только на 1 год)
  const weeks = useMemo(() => 
    buildAcademicWeeks(startDate, 1), 
    [startDate]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Дата начала обучения:</span>
        <StartDatePicker value={startDate} onChange={setStartDate} />
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