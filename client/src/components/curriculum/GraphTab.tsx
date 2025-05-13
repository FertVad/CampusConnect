import { useState, useMemo, useEffect, useRef } from "react";
import { StartDatePicker } from "@/components/ui/StartDatePicker";
import { buildAcademicWeeks, getFirstWorkdayOfSeptember, buildWeeksWithMonths } from "@/utils/calendar";
import { AcademicCalendarTable } from "@/components/curriculum/AcademicCalendarTable";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useCurriculum } from "@/lib/curriculumStore";

// Тип для данных календаря
export type CalendarData = Record<string, string>;

// Интерфейс пропсов компонента
interface GraphTabProps {
  planYear: number;       // Год начала обучения (по умолчанию)
  yearsOfStudy: number;   // Количество лет обучения
  monthsOfStudy?: number; // Количество дополнительных месяцев
  initialData?: CalendarData; // Начальные данные календаря
  onChange?: (data: CalendarData) => void; // Колбэк для сохранения изменений
  planId?: string;        // ID учебного плана (передается от родительского компонента)
  autosavePaused?: boolean; // Флаг для паузы автосохранения
}

export default function GraphTab({ 
  planYear = 2025, 
  yearsOfStudy = 4, // По умолчанию, будет заменено значением из глобального хранилища
  monthsOfStudy = 0, // По умолчанию, 0 месяцев
  initialData = {},
  onChange,
  planId,
  autosavePaused = false
}: GraphTabProps) {
  // Получаем количество лет и месяцев обучения из глобального хранилища
  const { 
    yearsOfStudy: storeYearsOfStudy, 
    monthsOfStudy: storeMonthsOfStudy,
    getEffectiveCourseCount 
  } = useCurriculum();
  
  // Используем значения из хранилища, но если они 0, то используем переданные в пропсах
  const effectiveYearsOfStudy = storeYearsOfStudy > 0 ? storeYearsOfStudy : yearsOfStudy;
  const effectiveMonthsOfStudy = storeMonthsOfStudy >= 0 ? storeMonthsOfStudy : monthsOfStudy;
  
  // Получаем эффективное количество курсов (с учетом дополнительных месяцев)
  const effectiveCourseCount = getEffectiveCourseCount();
  // Получаем planId из пропсов, если передано, иначе из URL для обратной совместимости
  const urlParams = new URLSearchParams(window.location.search);
  const urlPlanId = urlParams.get('id') || '';
  // Используем planId из пропсов или fallback к URL
  const effectivePlanId = planId || urlPlanId;
  
  // Используем значение initialDataHash для сравнения изменений,
  // а не пересоздаем объект при каждом рендере
  const initialDataHash = useMemo(() => JSON.stringify(initialData), [initialData]);
  
  // Используем ссылку для хранения предыдущего хеша данных
  const lastInitialDataHashRef = useRef<string>(initialDataHash);
  
  // Используем ссылку для хранения актуальных данных календаря
  const calendarDataRef = useRef<Record<string, string>>(initialData);
  
  // Используем useMemo вместо useState для создания стабильной ссылки на calendarData
  // Пересоздаем только при фактическом изменении данных (не при каждом рендере)
  const calendarData = useMemo(() => {
    // Если хеш данных не изменился, возвращаем ту же ссылку из ref
    if (lastInitialDataHashRef.current === initialDataHash) {
      return calendarDataRef.current;
    }
    
    // Обновляем хеш для последующих сравнений
    lastInitialDataHashRef.current = initialDataHash;
    
    // Создаем новый объект только при реальном изменении данных
    const newData = JSON.parse(JSON.stringify(initialData));
    
    // Обновляем ссылку для использования в других местах
    calendarDataRef.current = newData;
    
    return newData;
  }, [initialDataHash]);
  
  // Отслеживаем изменения лет обучения
  useEffect(() => {
    // Реагируем на изменение лет обучения
  }, [effectiveYearsOfStudy]);
  
  // Создаем массив курсов в зависимости от effectiveCourseCount (годы + хвостовой курс, если есть месяцы)
  const courses = useMemo(() => {
    const result = [];
    
    // Добавляем полные курсы по годам
    for (let i = 1; i <= effectiveYearsOfStudy; i++) {
      result.push({
        id: i.toString(),
        name: `Курс ${i}`,
        year: planYear + (i - 1),
        isFullYear: true
      });
    }
    
    // Если есть дополнительные месяцы, добавляем хвостовой курс
    if (effectiveMonthsOfStudy > 0) {
      const tailCourseId = effectiveYearsOfStudy + 1;
      result.push({
        id: tailCourseId.toString(),
        name: `Курс ${tailCourseId} (${effectiveMonthsOfStudy} мес)`,
        year: planYear + effectiveYearsOfStudy,
        isFullYear: false,
        months: effectiveMonthsOfStudy
      });
    }
    
    return result;
  }, [planYear, effectiveYearsOfStudy, effectiveMonthsOfStudy, effectiveCourseCount]);
  
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
    try {
      // Проверяем, действительно ли изменились данные (для предотвращения циклов)
      const dataStr = JSON.stringify(data);
      const currentDataStr = JSON.stringify(calendarDataRef.current);
      
      if (dataStr === currentDataStr) {
        // Данные календаря не изменились, пропускаем обновление
        return;
      }
      
      // Создаем глубокую копию объекта для предотвращения мутаций
      const newData = JSON.parse(JSON.stringify(data));
      
      // Обновляем ссылку, чтобы данные были всегда актуальны
      calendarDataRef.current = newData;
      
      // Сохраняем хеш обновленных данных для предотвращения лишних обновлений
      lastInitialDataHashRef.current = dataStr;
      
      // Вызываем колбэк onChange, если он предоставлен
      if (onChange) {
        onChange(newData);
      }
    } catch (error) {
      // Обработка ошибок при обновлении данных календаря
    }
  };
  
  // Возвращает текущие данные календаря из ref - только для внутреннего использования
  const getCalendarData = (): CalendarData => {
    return calendarDataRef.current;
  };

  // Генерируем недели на основе даты старта первого курса с учетом месяцев
  const weeks = useMemo(() => 
    buildWeeksWithMonths(startDates["1"], effectiveYearsOfStudy, effectiveMonthsOfStudy), 
    [startDates, effectiveYearsOfStudy, effectiveMonthsOfStudy]
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
      
      {/* Убрали желтую плашку с информацией о сроке обучения по запросу пользователя */}
      
      <AcademicCalendarTable 
        weeks={weeks} 
        yearsOfStudy={effectiveYearsOfStudy}
        monthsOfStudy={effectiveMonthsOfStudy}
        effectiveCourseCount={effectiveCourseCount}
        courses={courses}
        initialData={calendarData}
        onChange={handleCalendarChange}
        startDates={startDates}
        planId={effectivePlanId}
        autosavePaused={autosavePaused}
      />
    </div>
  );
}