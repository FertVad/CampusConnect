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

// Тип для данных календаря
export type CalendarData = Record<string, string>;

// Интерфейс пропсов компонента
interface GraphTabProps {
  planYear: number;       // Год начала обучения (по умолчанию)
  yearsOfStudy: number;   // Количество лет обучения
  initialData?: CalendarData; // Начальные данные календаря
  onChange?: (data: CalendarData) => void; // Колбэк для сохранения изменений
  planId?: string;        // ID учебного плана (передается от родительского компонента)
}

export default function GraphTab({ 
  planYear = 2025, 
  yearsOfStudy = 4,
  initialData = {},
  onChange,
  planId
}: GraphTabProps) {
  // Получаем planId из пропсов, если передано, иначе из URL для обратной совместимости
  const urlParams = new URLSearchParams(window.location.search);
  const urlPlanId = urlParams.get('id') || '';
  // Используем planId из пропсов или fallback к URL
  const effectivePlanId = planId || urlPlanId;
  console.log('[GraphTab] Plan ID from props:', planId, 'from URL:', urlPlanId, 'effective:', effectivePlanId);
  // Локальное состояние для хранения данных календаря
  const [calendarData, setCalendarData] = useState<Record<string, string>>(initialData);
  
  // Обновляем локальное состояние при изменении initialData
  useEffect(() => {
    console.log('[GraphTab] initialData изменилось:', initialData);
    // Копируем initialData, чтобы избежать проблем с мутацией объекта
    setCalendarData({...initialData});
  }, [initialData]);
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
    return Object.fromEntries(
      courses.map((course, idx) => [
        course.id,
        getFirstWorkdayOfSeptember(planYear + idx) // +idx год
      ])
    );
  }, [courses, planYear]);
  
  // Стейт для хранения дат старта каждого курса
  const [startDates, setStartDates] = useState<Record<string, Date>>(defaultStartDates);
  
  // Выбранный курс (по умолчанию "1")
  const [selectedCourseId, setSelectedCourseId] = useState<string>("1");
  
  // Обновляем даты при изменении planYear
  useEffect(() => {
    const newDates = Object.fromEntries(
      courses.map((course, idx) => [
        course.id,
        getFirstWorkdayOfSeptember(planYear + idx) // +idx год
      ])
    );
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
  
  // Обработчик изменения данных календаря
  const handleCalendarChange = (data: CalendarData) => {
    console.log('Изменение данных календаря:', data);
    // Создаем копию объекта, чтобы избежать проблем с мутацией
    const newData = {...data};
    setCalendarData(newData);
    if (onChange) {
      // Убеждаемся, что родительский компонент получает актуальные данные
      onChange(newData);
    }
  };
  
  // Возвращает текущие данные календаря - только для внутреннего использования
  const getCalendarData = (): CalendarData => {
    return calendarData;
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
        initialData={calendarData}
        onChange={handleCalendarChange}
        startDates={startDates}
        planId={effectivePlanId}
      />
    </div>
  );
}