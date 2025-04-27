import { useState, useMemo, useEffect } from "react";
import { StartDatePicker } from "@/components/ui/StartDatePicker";
import { buildAcademicWeeks, getFirstWorkdayOfSeptember } from "@/utils/calendar";
import { AcademicCalendarTable } from "@/components/curriculum/AcademicCalendarTable";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

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
  
  // Выбранный курс (по умолчанию 1)
  const [selectedCourse, setSelectedCourse] = useState<string>("1");
  
  // Обновляем дату начала при изменении planYear
  useEffect(() => {
    setStartDate(getFirstWorkdayOfSeptember(planYear));
  }, [planYear]);
  
  // Обработчик смены курса
  const handleCourseChange = (value: string) => {
    setSelectedCourse(value);
    const courseIndex = parseInt(value) - 1;
    // Устанавливаем дату начала для выбранного курса
    const courseYear = planYear + courseIndex;
    setStartDate(getFirstWorkdayOfSeptember(courseYear));
  };

  // Генерируем недели на основе выбранной даты старта
  const weeks = useMemo(() => 
    buildAcademicWeeks(startDate, yearsOfStudy), 
    [startDate, yearsOfStudy]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Курс:</span>
          <Select value={selectedCourse} onValueChange={handleCourseChange}>
            <SelectTrigger className="w-24">
              <SelectValue placeholder="Выберите курс" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Курс 1</SelectItem>
              <SelectItem value="2">Курс 2</SelectItem>
              <SelectItem value="3">Курс 3</SelectItem>
              <SelectItem value="4">Курс 4</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Дата начала:</span>
          <StartDatePicker value={startDate} onChange={setStartDate} />
        </div>
        
        <div className="text-xs text-slate-500">
          (По умолчанию - первый рабочий день сентября {planYear + parseInt(selectedCourse) - 1} года)
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