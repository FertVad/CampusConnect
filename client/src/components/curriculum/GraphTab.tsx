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
  // Создаем массив курсов - нам нужно 4 курса
  const courses = useMemo(() => {
    const result = [];
    for (let i = 1; i <= yearsOfStudy; i++) {
      result.push({
        id: i.toString(),
        name: `Курс ${i}`,
        year: planYear + (i - 1)
      });
    }
    return result;
  }, [planYear, yearsOfStudy]);
  
  // Создаем дефолтный объект с датами старта для каждого курса
  const defaultStartDates = useMemo(() => {
    const dates: Record<string, Date> = {};
    courses.forEach(course => {
      dates[course.id] = getFirstWorkdayOfSeptember(planYear + (parseInt(course.id) - 1));
    });
    return dates;
  }, [courses, planYear]);
  
  // Стейт для хранения дат старта каждого курса
  const [startDates, setStartDates] = useState<Record<string, Date>>(defaultStartDates);
  
  // Выбранный курс (по умолчанию "1")
  const [selectedCourseId, setSelectedCourseId] = useState<string>("1");
  
  // Обновляем даты при изменении planYear
  useEffect(() => {
    const newDates: Record<string, Date> = {};
    courses.forEach(course => {
      newDates[course.id] = getFirstWorkdayOfSeptember(planYear + (parseInt(course.id) - 1));
    });
    setStartDates(newDates);
  }, [planYear, courses]);
  
  // Обработчик смены курса
  const handleCourseChange = (value: string) => {
    setSelectedCourseId(value);
  };
  
  // Обработчик изменения даты для выбранного курса
  const handleDateChange = (date: Date) => {
    setStartDates({
      ...startDates,
      [selectedCourseId]: date
    });
  };

  // Генерируем недели на основе даты старта первого курса (для заголовков)
  const weeks = useMemo(() => 
    buildAcademicWeeks(startDates["1"], yearsOfStudy), 
    [startDates, yearsOfStudy]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Курс:</span>
          <Select value={selectedCourseId} onValueChange={handleCourseChange}>
            <SelectTrigger className="w-24">
              <SelectValue placeholder="Выберите курс" />
            </SelectTrigger>
            <SelectContent>
              {courses.map(course => (
                <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Дата начала:</span>
          <StartDatePicker 
            value={startDates[selectedCourseId]} 
            onChange={handleDateChange}
          />
        </div>
        
        <div className="text-xs text-slate-500">
          (По умолчанию - первый рабочий день сентября {planYear + parseInt(selectedCourseId) - 1} года)
        </div>
      </div>

      <AcademicCalendarTable 
        weeks={weeks} 
        yearsOfStudy={yearsOfStudy}
        initialData={initialData}
        onChange={onChange}
        startDates={startDates}
      />
    </div>
  );
}