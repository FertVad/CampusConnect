import { useState, useMemo, useEffect } from "react";
import { StartDatePicker } from "@/components/ui/StartDatePicker";
import { buildAcademicWeeks, getFirstWorkdayOfSeptember } from "@/utils/calendar";
import { AcademicCalendarTable } from "@/components/curriculum/AcademicCalendarTable";
import { SummaryTable } from "@/components/curriculum/SummaryTable";
import { buildSummary } from "@/utils/buildSummary";
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
  // Состояние для текущей активной вкладки (график или итоги)
  const [activeTab, setActiveTab] = useState<'grafik' | 'summary'>('grafik');
  
  // Локальное состояние для хранения данных календаря
  const [calendarData, setCalendarData] = useState<Record<string, string>>(initialData);
  
  // Обновляем локальное состояние при изменении initialData
  useEffect(() => {
    setCalendarData(initialData);
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
  const handleCalendarChange = (data: Record<string, string>) => {
    console.log('Изменение данных календаря:', data);
    setCalendarData(data);
    if (onChange) {
      onChange(data);
    }
  };

  // Генерируем недели на основе даты старта первого курса (для заголовков)
  const weeks = useMemo(() => 
    buildAcademicWeeks(startDates["1"], yearsOfStudy), 
    [startDates, yearsOfStudy]
  );

  return (
    <div className="space-y-4">
      {/* Переключатель вкладок "График" и "Итоги" */}
      <div className="flex gap-6 text-sm border-b mb-4">
        <button 
          onClick={() => setActiveTab('grafik')} 
          className={activeTab === 'grafik' ? 'border-b-2 border-primary pb-2 font-medium' : 'text-muted-foreground pb-2'}
        >
          График
        </button>
        <button 
          onClick={() => setActiveTab('summary')} 
          className={activeTab === 'summary' ? 'border-b-2 border-primary pb-2 font-medium' : 'text-muted-foreground pb-2'}
        >
          Итоги
        </button>
      </div>
      
      {/* Показываем управление календарем только во вкладке "График" */}
      {activeTab === 'grafik' && (
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
      )}

      {/* Отображаем AcademicCalendarTable или SummaryTable в зависимости от активной вкладки */}
      {activeTab === 'grafik' ? (
        <AcademicCalendarTable 
          weeks={weeks} 
          yearsOfStudy={yearsOfStudy}
          initialData={calendarData}
          onChange={handleCalendarChange}
          startDates={startDates}
        />
      ) : (
        <SummaryTable 
          summary={buildSummary(calendarData, yearsOfStudy)} 
          courses={yearsOfStudy} 
        />
      )}
    </div>
  );
}