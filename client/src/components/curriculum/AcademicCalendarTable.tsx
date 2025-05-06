import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { WeekActivityDialog, WeekInfo } from "./CustomWeekActivityDialog";
import { ActivityType, ACTIVITY_TYPES, ACTIVITY_COLORS, getActivityStyle } from "./ActivityTypes";
import { Tooltip } from 'react-tooltip'; // Возвращаемся к react-tooltip, так как он проще в использовании
import { WeekCell, getFirstWorkdayOfSeptember, buildAcademicWeeks } from "@/utils/calendar";
import { format } from "date-fns";
import { ru } from "date-fns/locale/ru";
import { useAutoSave } from "@/hooks/useAutoSave";
import { SaveButton } from "@/components/ui/save-button";
import CourseRow from "./CourseRow";
import { X } from "lucide-react";
import clsx from "clsx";
import { useCurriculum } from "@/lib/curriculumStore";

// Количество курсов определяется из yearsOfStudy в props

// Тип для всех данных таблицы
type CalendarData = Record<string, ActivityType>;

// Интерфейс для ячейки данных
interface CellInfo {
  courseId: number;
  weekNumber: number;
  monthName: string;
  value: ActivityType;
  startDate: Date; // Дата начала недели
  endDate: Date;   // Дата конца недели
}

// Интерфейс для курса
interface Course {
  id: number;
  name: string;
  startDate: Date;
  weeks: WeekCell[]; // Массив недель, специфичных для этого курса
}

interface AcademicCalendarTableProps {
  weeks: WeekCell[];            // Массив недель для отображения
  yearsOfStudy: number;         // Количество лет обучения
  monthsOfStudy?: number;       // Количество дополнительных месяцев
  effectiveCourseCount?: number; // Эффективное количество курсов (yearsOfStudy + monthsOfStudy > 0 ? 1 : 0)
  courses?: Array<{              // Массив курсов для отображения
    id: string;
    name: string;
    year: number;
    isFullYear?: boolean;
    months?: number;
  }>;
  onChange?: (data: CalendarData) => void;
  initialData?: CalendarData;
  startDates?: Record<string, Date>; // Даты начала для каждого курса
  planId?: string;              // ID учебного плана
  autosavePaused?: boolean;     // Флаг для паузы автосохранения
}

export function AcademicCalendarTable({ 
  weeks,
  yearsOfStudy = 4, // Оставляем для обратной совместимости, но будет перезаписано из глобального хранилища
  monthsOfStudy = 0, // Дополнительные месяцы
  effectiveCourseCount,
  courses = [],
  onChange,
  initialData = {},
  startDates = {},
  planId = '',
  autosavePaused = false
}: AcademicCalendarTableProps) {
  // Получаем количество лет и месяцев обучения из глобального хранилища
  const { 
    yearsOfStudy: storeYearsOfStudy, 
    monthsOfStudy: storeMonthsOfStudy,
    getEffectiveCourseCount 
  } = useCurriculum();
  
  // Используем значения из глобального хранилища, но если там 0, используем из пропсов для безопасности
  const effectiveYearsOfStudy = storeYearsOfStudy > 0 ? storeYearsOfStudy : yearsOfStudy;
  const effectiveMonthsOfStudy = storeMonthsOfStudy >= 0 ? storeMonthsOfStudy : monthsOfStudy;
  
  // Рассчитываем эффективное количество курсов с учетом месяцев, если не передано явно
  const actualCourseCount = effectiveCourseCount !== undefined 
    ? effectiveCourseCount 
    : getEffectiveCourseCount();
  
  console.log('[AcademicCalendarTable] Годы:', effectiveYearsOfStudy, 'Месяцы:', effectiveMonthsOfStudy, 'Курсов:', actualCourseCount);
  
  // Создаем ref для отслеживания предыдущего значения yearsOfStudy
  const prevYearsRef = useRef<number>(effectiveYearsOfStudy);
  
  // Эффект для очистки неиспользуемых данных курсов при уменьшении yearsOfStudy
  useEffect(() => {
    console.log(`[AcademicCalendarTable] Используем ${effectiveYearsOfStudy} лет обучения из глобального хранилища`);
    
    // Если количество лет уменьшилось, удаляем данные для лишних курсов
    if (prevYearsRef.current > effectiveYearsOfStudy && Object.keys(tableDataRef.current).length > 0) {
      console.log(`[AcademicCalendarTable] Очистка данных для неиспользуемых курсов (${prevYearsRef.current} -> ${effectiveYearsOfStudy})`);
      
      // Копируем данные
      const newData = JSON.parse(JSON.stringify(tableDataRef.current));
      let keysRemoved = 0;
      
      // Удаляем записи для курсов, которые больше не используются
      for (const key of Object.keys(newData)) {
        // Проверяем формат ключа: courseX_weekY
        const courseMatch = key.match(/^course(\d+)_week\d+$/);
        if (courseMatch) {
          const courseId = parseInt(courseMatch[1]);
          
          // Если ID курса больше текущего количества лет, удаляем запись
          if (courseId > effectiveYearsOfStudy) {
            delete newData[key];
            keysRemoved++;
          }
        }
      }
      
      if (keysRemoved > 0) {
        console.log(`[AcademicCalendarTable] Удалено ${keysRemoved} записей для неиспользуемых курсов`);
        // Обновляем данные и принудительно сохраняем
        updateTableData(newData);
        setTimeout(() => forceSave(), 100);
      }
    }
    
    // Обновляем ref для будущих сравнений
    prevYearsRef.current = effectiveYearsOfStudy;
  }, [effectiveYearsOfStudy]);
  // Используем useMemo для хранения и стабилизации tableData 
  // вместо useState для предотвращения лишних рендеров
  const lastInitialDataHashRef = useRef<string>("");
  const initialDataHash = useMemo(() => JSON.stringify(initialData), [initialData]);
  
  // Стабильная ссылка на tableData
  const tableDataRef = useRef<CalendarData>({...initialData});
  
  // Используем useMemo для создания стабильной ссылки на tableData
  const tableData = useMemo(() => {
    // Проверяем, изменились ли данные с помощью хеша
    if (lastInitialDataHashRef.current !== initialDataHash) {
      console.log('[AcademicCalendarTable] initialData hash changed, creating new tableData');
      
      // Сохраняем новый хеш
      lastInitialDataHashRef.current = initialDataHash;
      
      // Создаем новую версию объекта
      const newData = JSON.parse(JSON.stringify(initialData));
      tableDataRef.current = newData;
      return newData;
    }
    
    // Возвращаем текущую ссылку, если хеш не изменился
    console.log('[AcademicCalendarTable] initialData hash unchanged, reusing tableData');
    return tableDataRef.current;
  }, [initialDataHash]);
  
  // Используем planId из props или извлекаем из URL если он не был передан
  const urlParams = new URLSearchParams(window.location.search);
  const urlPlanId = urlParams.get('id');
  // Убедимся, что у нас есть числовой ID для плана
  const effectivePlanId = planId || urlPlanId || '';
  
  // Добавим развернутое логирование для отслеживания планов
  console.log('[AcademicCalendarTable] Effective Plan ID:', effectivePlanId);
  
  // Блокируем автосохранение, если нет действительного planId
  const isValidPlanId = !!effectivePlanId && effectivePlanId !== '' && !isNaN(parseInt(effectivePlanId));
  console.log('[AcademicCalendarTable] Is Valid Plan ID:', isValidPlanId);
  
  // Создаем объект с именованным ключом planId
  const dataToSave = { 
    planId: effectivePlanId, 
    calendarData: tableData 
  };
  
  // Используем хук автосохранения с добавлением planId, только если он валидный
  const { isSaving, forceSave } = useAutoSave(dataToSave, {
    url: '/api/curriculum/weeks',
    debounceMs: 1000,
    // Только запускаем автосохранение если planId валидный и не активирована пауза
    enabled: isValidPlanId,
    // Используем флаг паузы из пропсов для приостановки автосохранения
    paused: autosavePaused,
    onSuccess: (data) => {
      console.log('[AcademicCalendarTable] Данные автоматически сохранены', data);
    },
    onError: (error) => {
      console.error('[AcademicCalendarTable] Ошибка автосохранения:', error.message);
    }
  });
  
  // Группируем недели только по месяцам (без учета года)
  const monthGroups = useMemo(() => {
    // Порядок месяцев учебного года, начиная с сентября
    const academicMonthOrder = [
      "сентябрь", "октябрь", "ноябрь", "декабрь", 
      "январь", "февраль", "март", "апрель", 
      "май", "июнь", "июль", "август"
    ];
    
    // Сначала группируем по месяцам обычным способом
    const grouped = weeks.reduce((acc, w) => {
      // Используем только название месяца без года
      const key = format(w.startDate, "LLLL", { locale: ru }); // «сентябрь»
      (acc[key] ||= []).push(w);
      return acc;
    }, {} as Record<string, WeekCell[]>);
    
    // Затем создаем новый отсортированный объект
    const sortedGroups = {} as Record<string, WeekCell[]>;
    
    // Добавляем месяцы в правильном порядке (начиная с сентября)
    academicMonthOrder.forEach(month => {
      if (grouped[month]) {
        sortedGroups[month] = grouped[month];
      }
    });
    
    return sortedGroups;
  }, [weeks]);
  
  // Состояние для модального окна и выбранной ячейки
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<WeekInfo | null>(null);
  const [selectedCellKey, setSelectedCellKey] = useState<string | null>(null);
  
  // Состояние для множественного выделения ячеек
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  
  // Состояние для отслеживания последней выбранной ячейки (для Shift+клик)
  const [lastSelectedCell, setLastSelectedCell] = useState<string | null>(null);
  
  // Кеш для уже созданных ключей ячеек
  const cellKeysCacheRef = useRef<Record<string, string>>({});

  // Функция для генерации ключа ячейки с кешированием
  const getCellKey = (courseId: number, weekNumber: number): string => {
    const cacheKey = `${courseId}:${weekNumber}`; // Меньше памяти чем полный ключ
    
    // Если ключ уже есть в кеше, возвращаем его
    if (cellKeysCacheRef.current[cacheKey]) {
      return cellKeysCacheRef.current[cacheKey];
    }
    
    // Иначе создаем новый и сохраняем в кеше
    const newKey = `course${courseId}_week${weekNumber}`;
    cellKeysCacheRef.current[cacheKey] = newKey;
    return newKey;
  };
  
  // Функция парсинга ключа ячейки в компоненты (для Shift+клик)
  const parseCellKey = (key: string): { courseId: number, weekNumber: number } | null => {
    const match = key.match(/course([0-9]+)_week([0-9]+)/);
    if (!match) return null;
    
    return {
      courseId: parseInt(match[1]),
      weekNumber: parseInt(match[2])
    };
  };
  
  // Очистка выделения
  const clearSelection = useCallback(() => {
    setSelectedCells(new Set());
    setLastSelectedCell(null);
  }, []);
  
  // Обработчик нажатия клавиш для выделения (Del, Backspace)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // При нажатии Delete или Backspace снимаем выделение
        clearSelection();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearSelection]);
  
  // Функция для обновления tableData
  const updateTableData = (newData: CalendarData) => {
    // Обновляем ref для хранения последней версии данных
    tableDataRef.current = newData;
    
    // Обновляем хеш для последующего сравнения
    lastInitialDataHashRef.current = JSON.stringify(newData);
    
    // Вызываем колбэк
    if (onChange) {
      onChange({...newData});
    }
    
    return newData;
  };
  
  // Обработчик изменения значения ячейки или группы ячеек
  const handleCellChange = (activity: ActivityType, applyToSelection: boolean = false) => {
    // Создаем глубокую копию объекта для полной защиты от мутаций
    const newData = JSON.parse(JSON.stringify(tableDataRef.current));
    
    // Если применяем к выделению и есть выделенные ячейки
    if (applyToSelection && selectedCells.size > 0) {
      // Применяем значение ко всем выделенным ячейкам
      Array.from(selectedCells).forEach(cellKey => {
        newData[cellKey] = activity;
      });
      
      // Очищаем выделение после изменения группы ячеек
      clearSelection();
    } 
    // Если просто меняем одну ячейку из диалога
    else if (selectedWeek) {
      const cellKey = getCellKey(selectedWeek.courseId, selectedWeek.weekNumber);
      newData[cellKey] = activity;
    }
    
    console.log('Обновляем данные таблицы:', newData);
    
    // Обновляем данные через нашу новую функцию
    updateTableData(newData);
    
    // Принудительное сохранение после изменений
    forceSave();
  };
  
  // Обработчик клика по ячейке с поддержкой множественного выделения
  const handleCellClick = (info: CellInfo, event: React.MouseEvent) => {
    const cellKey = getCellKey(info.courseId, info.weekNumber);
    
    // Если это двойной клик - открываем диалог для редактирования одной недели
    if (event.detail === 2) {
      setSelectedCellKey(cellKey);
      
      // Создаем объект с информацией о выбранной неделе
      setSelectedWeek({
        courseId: info.courseId,
        weekNumber: info.weekNumber,
        startDate: info.startDate,
        endDate: info.endDate,
        monthName: info.monthName
      });
      
      setDialogOpen(true);
      return;
    }
    
    // Если Shift+клик и у нас есть последний выбранный элемент,
    // добавляем все элементы в диапазоне
    if (event.shiftKey && lastSelectedCell) {
      const lastCell = parseCellKey(lastSelectedCell);
      const currentCell = { courseId: info.courseId, weekNumber: info.weekNumber };
      
      if (lastCell && lastCell.courseId === currentCell.courseId) {
        // Определяем диапазон недель для выделения
        const minWeek = Math.min(lastCell.weekNumber, currentCell.weekNumber);
        const maxWeek = Math.max(lastCell.weekNumber, currentCell.weekNumber);
        
        const newSelectedCells = new Set(selectedCells);
        
        // Добавляем все ячейки в диапазоне
        for (let week = minWeek; week <= maxWeek; week++) {
          const key = getCellKey(currentCell.courseId, week);
          newSelectedCells.add(key);
        }
        
        setSelectedCells(newSelectedCells);
      }
    } 
    // Одиночный клик - добавляем/удаляем ячейку из выделения
    else {
      const newSelectedCells = new Set(selectedCells);
      
      if (newSelectedCells.has(cellKey)) {
        newSelectedCells.delete(cellKey);
      } else {
        newSelectedCells.add(cellKey);
      }
      
      setSelectedCells(newSelectedCells);
      setLastSelectedCell(cellKey);
    }
  };
  
  // Обработчик изменения активности в диалоге (для одной ячейки)
  const handleActivityChange = (activity: ActivityType) => {
    // Просто делегируем в основной обработчик, указывая что это НЕ множественное изменение
    handleCellChange(activity, false);
  };
  
  // Refs для таблицы и скролл-контейнера
  const tableRef = useRef<HTMLTableElement>(null);
  const headerRef = useRef<HTMLTableSectionElement>(null);
  const scrollWrapperRef = useRef<HTMLDivElement>(null);
  
  // Получение границ прямоугольника выделения
  const getSelectionRect = (selectedCells: Set<string>): { top: number, left: number, width: number, height: number } => {
    if (selectedCells.size === 0) {
      return { top: 0, left: 0, width: 0, height: 0 };
    }
    
    let minLeft = Infinity;
    let minTop = Infinity;
    let maxRight = -Infinity;
    let maxBottom = -Infinity;
    
    // Проходим по всем выделенным ячейкам и находим границы
    Array.from(selectedCells).forEach(cellKey => {
      const cell = document.querySelector(`[data-cell-key="${cellKey}"]`) as HTMLElement;
      if (cell) {
        const rect = cell.getBoundingClientRect();
        minLeft = Math.min(minLeft, rect.left);
        minTop = Math.min(minTop, rect.top);
        maxRight = Math.max(maxRight, rect.right);
        maxBottom = Math.max(maxBottom, rect.bottom);
      }
    });
    
    // Возвращаем прямоугольник, охватывающий все выделенные ячейки
    return {
      top: minTop,
      left: minLeft,
      width: maxRight - minLeft,
      height: maxBottom - minTop
    };
  };
  
  // Использем новый компонент FloatingActionBar вместо встроенного ActionBar
  // Состояние и эффекты для позиционирования больше не нужны
  
  // Примечание: стили для тултипов и выделенных ячеек 
  // теперь находятся в файле index.css
  
  // Функция getActivityStyle импортируется из модуля ActivityTypes
  // Это позволяет избежать дублирования кода и проблем с импортами
  
  // Проверка на последний день месяца (для границы месяцев)
  const isLastDayOfMonth = (date: Date): boolean => {
    // Создаем новую дату, прибавляем 1 день и проверяем, изменился ли месяц
    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);
    return nextDay.getMonth() !== date.getMonth();
  };
  
  // Создание заголовков таблицы с трехуровневой структурой
  const renderHeaders = () => {
    const headers = [];
    
    // Создаем объединенный массив всех недель из первого курса для заголовков
    const firstCourseWeeks = buildAcademicWeeks(weeks[0].startDate);
    console.log(`[AcademicCalendarTable] Сгенерировано ${firstCourseWeeks.length} недель для отображения`);
    
    // Группируем недели только по месяцам и сортируем, чтобы начинать с сентября
    const monthGroups = useMemo(() => {
      // Порядок месяцев учебного года, начиная с сентября
      const academicMonthOrder = [
        "сентябрь", "октябрь", "ноябрь", "декабрь", 
        "январь", "февраль", "март", "апрель", 
        "май", "июнь", "июль", "август"
      ];
      
      // Сначала группируем по месяцам как обычно
      const grouped = firstCourseWeeks.reduce((acc, w) => {
        // Используем только название месяца без года
        const key = format(w.startDate, "LLLL", { locale: ru }); // «сентябрь»
        (acc[key] ||= []).push(w);
        return acc;
      }, {} as Record<string, WeekCell[]>);
      
      // Затем создаем новый отсортированный объект
      const sortedGroups = {} as Record<string, WeekCell[]>;
      
      // Добавляем месяцы в правильном порядке (начиная с сентября)
      academicMonthOrder.forEach(month => {
        if (grouped[month]) {
          sortedGroups[month] = grouped[month];
        }
      });
      
      console.log('[AcademicCalendarTable] Отсортированные месяцы:', Object.keys(sortedGroups));
      return sortedGroups;
    }, [firstCourseWeeks]);
    
    // Создаем заголовки таблицы, адаптированные под темную тему
    
    // 1. Уровень: Курсы
    // В этом ряду показываем курсы (Курс 1, Курс 2, Курс 3, Курс 4, Курс 5)
    // Разделяем каждый курс на 2 семестра по ~18 недель
    
    const courseColGroups = [];
    // Сначала делаем группировку по курсам (если у нас есть данные о курсах)
    if (courses && courses.length > 0) {
      // Делим колонки недель по курсам
      for (let i = 0; i < courses.length; i++) {
        const weeksPerCourse = i === 0 ? 52 : Math.ceil(52 / courses.length);
        const startIdx = i * weeksPerCourse; 
        const endIdx = Math.min((i + 1) * weeksPerCourse, firstCourseWeeks.length);
        const colSpan = endIdx - startIdx;
        
        courseColGroups.push({
          id: courses[i].id,
          name: courses[i].name,
          colSpan: colSpan
        });
      }
    } else {
      // Если нет данных о курсах, делаем группировку по 52 недели (1 год)
      for (let i = 0; i < Math.ceil(firstCourseWeeks.length / 52); i++) {
        const startIdx = i * 52;
        const endIdx = Math.min((i + 1) * 52, firstCourseWeeks.length);
        const colSpan = endIdx - startIdx;
        
        courseColGroups.push({
          id: (i + 1).toString(),
          name: `Курс ${i + 1}`,
          colSpan: colSpan
        });
      }
    }
    
    // Первый ряд: Курсы
    headers.push(
      <tr key="course-level" className="bg-slate-900 text-white border-b border-slate-600">
        <th 
          rowSpan={3}
          className="sticky left-0 bg-slate-900 text-white px-4 py-2 z-30 whitespace-nowrap overflow-hidden text-ellipsis shadow-[2px_0_4px_-2px_rgba(0,0,0,0.4)]"
        >
          Дисциплины
        </th>
        {courseColGroups.map((course, idx) => (
          <th 
            key={`course-${course.id}`} 
            colSpan={course.colSpan}
            className="px-2 py-2 text-center border-r border-slate-600 font-semibold"
          >
            Курс {idx + 1}
          </th>
        ))}
      </tr>
    );
    
    // 2. Уровень: Семестры (по 2 на курс)
    headers.push(
      <tr key="semester-level" className="bg-slate-800 text-white border-b border-slate-600">
        {courseColGroups.map((course, courseIdx) => {
          // Делим на 2 семестра (по половине недель каждого курса)
          const semesterWeeks = Math.ceil(course.colSpan / 2);
          
          return (
            <React.Fragment key={`course-semesters-${course.id}`}>
              <th 
                colSpan={semesterWeeks}
                className="px-2 py-1 text-center border-r border-slate-700 font-semibold"
              >
                Сем 1 ({semesterWeeks})
              </th>
              <th 
                colSpan={course.colSpan - semesterWeeks}
                className="px-2 py-1 text-center border-r border-slate-700 font-semibold"
              >
                Сем 2 ({course.colSpan - semesterWeeks})
              </th>
            </React.Fragment>
          );
        })}
      </tr>
    );
    
    // 3. Уровень: Недели (просто номера недель)
    headers.push(
      <tr key="week-level" className="bg-slate-700 text-white">
        {firstCourseWeeks.map((week, idx) => (
          <th 
            key={`week-${idx}`}
            className="py-1 text-center font-medium text-xs border-r border-slate-600"
          >
            {week.index}
          </th>
        ))}
      </tr>
    );
    
    return headers;
  };
  
  // Создание строк для курсов с учетом дат из startDates
  const renderCourseRows = () => {
    // Если предоставлены курсы через props, используем их
    if (courses && courses.length > 0) {
      console.log(`[AcademicCalendarTable] Использование ${courses.length} предопределенных курсов из props`);
      
      // Преобразуем курсы из props в формат Course
      const mappedCourses: Course[] = courses.map(course => {
        const courseId = parseInt(course.id);
        const courseIdStr = course.id;
        
        // Используем дату из startDates или дефолтную дату
        const courseStartDate = startDates[courseIdStr] || 
          (courseId === 1 ? weeks[0].startDate : getFirstWorkdayOfSeptember(weeks[0].startDate.getFullYear() + courseId - 1));
        
        // Генерируем недели в зависимости от того, полный это курс или хвостовой
        let courseWeeks;
        if (course.isFullYear !== false) {
          // Для полных курсов генерируем все недели года
          courseWeeks = buildAcademicWeeks(courseStartDate);
        } else {
          // Для хвостового курса с месяцами используем специальную функцию
          const months = course.months || effectiveMonthsOfStudy;
          courseWeeks = buildAcademicWeeks(
            courseStartDate,
            1,  // Один год
            months // Количество месяцев для хвостового курса
          );
          // Ограничиваем количество недель для хвостового курса в зависимости от месяцев
          const weeksInMonths = Math.ceil(months * 4.35); // примерное количество недель в месяцах
          courseWeeks = courseWeeks.slice(0, weeksInMonths);
        }
        
        console.log(`[AcademicCalendarTable] Курс ${courseId} (${course.name}): сгенерировано ${courseWeeks.length} недель`);
        
        return {
          id: courseId,
          name: course.name,
          startDate: courseStartDate,
          weeks: courseWeeks, // Сохраняем недели, специфичные для этого курса
        };
      });
      
      // Рендерим компонент CourseRow для каждого курса
      return mappedCourses.map(course => (
        <CourseRow
          key={`course-row-${course.id}`}
          course={course}
          weeks={weeks} // Передаем базовые недели для заголовков (используемые для отображения)
          courseWeeks={course.weeks} // Передаем недели специфичные для этого курса (для расчета смещения)
          tableData={tableData}
          selectedCellKey={selectedCellKey}
          selectedCells={selectedCells}
          onCellClick={handleCellClick}
          isLastDayOfMonth={isLastDayOfMonth}
          startDate={startDates && startDates[course.id] ? startDates[course.id] : course.startDate}
        />
      ));
    }
    
    // Если не предоставлены курсы через props, создаем их на основе effectiveYearsOfStudy и effectiveMonthsOfStudy
    const generatedCourses: Course[] = [];
    
    // Логируем количество курсов для отладки
    console.log(`[AcademicCalendarTable] Создание курсов: ${effectiveYearsOfStudy} лет + ${effectiveMonthsOfStudy > 0 ? effectiveMonthsOfStudy + ' мес' : ''}`);
    
    // Создаем полные курсы (по годам)
    for (let courseIdx = 0; courseIdx < effectiveYearsOfStudy; courseIdx++) {
      const courseId = courseIdx + 1;
      const courseIdStr = courseId.toString();
      
      // Используем дату из startDates или дефолтную дату
      const courseStartDate = startDates[courseIdStr] || 
        (courseIdx === 0 ? weeks[0].startDate : getFirstWorkdayOfSeptember(weeks[0].startDate.getFullYear() + courseIdx));
      
      // Генерируем массив недель для этого курса, начиная с его даты начала
      const courseWeeks = buildAcademicWeeks(courseStartDate);
      console.log(`[AcademicCalendarTable] Курс ${courseId}: сгенерировано ${courseWeeks.length} недель`);
      
      generatedCourses.push({
        id: courseId,
        name: `Курс ${courseId}`,
        startDate: courseStartDate,
        weeks: courseWeeks, // Сохраняем недели, специфичные для этого курса
      });
    }
    
    // Добавляем хвостовой курс, если есть месяцы
    if (effectiveMonthsOfStudy > 0) {
      const tailCourseId = effectiveYearsOfStudy + 1;
      const tailCourseIdStr = tailCourseId.toString();
      
      // Дата начала хвостового курса
      const tailStartDate = startDates[tailCourseIdStr] || 
        getFirstWorkdayOfSeptember(weeks[0].startDate.getFullYear() + effectiveYearsOfStudy);
      
      // Генерируем недели только на указанное количество месяцев
      // Ограничиваем количество недель для хвостового курса в зависимости от месяцев
      const weeksInMonths = Math.ceil(effectiveMonthsOfStudy * 4.35); // примерное количество недель в месяцах
      
      // Генерируем все недели года и берем только нужное количество
      const tailWeeks = buildAcademicWeeks(tailStartDate).slice(0, weeksInMonths);
      
      console.log(`[AcademicCalendarTable] Хвостовой курс ${tailCourseId}: ${effectiveMonthsOfStudy} мес., ${tailWeeks.length} недель`);
      
      generatedCourses.push({
        id: tailCourseId,
        name: `Курс ${tailCourseId} (${effectiveMonthsOfStudy} мес)`,
        startDate: tailStartDate,
        weeks: tailWeeks,
      });
    }
    
    // Рендерим компонент CourseRow для каждого курса
    return generatedCourses.map(course => (
      <CourseRow
        key={`course-row-${course.id}`}
        course={course}
        weeks={weeks} // Передаем базовые недели для заголовков (используемые для отображения)
        courseWeeks={course.weeks} // Передаем недели специфичные для этого курса (для расчета смещения)
        tableData={tableData}
        selectedCellKey={selectedCellKey}
        selectedCells={selectedCells}
        onCellClick={handleCellClick}
        isLastDayOfMonth={isLastDayOfMonth}
        startDate={startDates && startDates[course.id] ? startDates[course.id] : course.startDate}
      />
    ));
  };
  
  // Проверяем, есть ли выделение для dock-bar
  const hasSelection = selectedCells.size > 0;
  
  // Рассчитываем высоту шапки таблицы для правильного позиционирования бара
  const [headerHeight, setHeaderHeight] = useState(0);
  const dockBarRef = useRef<HTMLDivElement>(null);
  
  // Упрощенный код, без отслеживания высоты заголовка
  useEffect(() => {
    // Ничего не делаем, у нас фиксированное позиционирование
  }, []);

  return (
    <div className="w-full">
      {/* Управляющая панель - встроенная, не фиксированная */}
      <div 
        ref={dockBarRef}
        className={`sticky top-0 left-0 z-40 w-full
          flex items-center gap-2 px-3 py-2 mt-2 mb-2
          bg-slate-900 text-white rounded-md shadow-lg
          ${hasSelection ? 'opacity-100' : 'opacity-0 pointer-events-none'}
          transition-all duration-200`}
      >
        <span className="mr-2 text-sm">Выбрано {selectedCells.size}:</span>
        
        {/* Кнопки активностей */}
        {Object.entries(ACTIVITY_TYPES).map(([code, description]) => {
          const { bg } = getActivityStyle(code as ActivityType);
          return (
            <button
              key={code}
              className={`${bg} w-6 h-6 rounded font-semibold hover:ring-1 hover:ring-white/70 transition-all`}
              onClick={() => handleCellChange(code as ActivityType, true)}
              title={description}
            >
              {code}
            </button>
          );
        })}
        
        {/* Кнопка очистки */}
        <button
          className="bg-slate-200/20 hover:bg-slate-200/30 px-2 rounded text-sm"
          onClick={() => handleCellChange("", true)}
        >
          Очистить
        </button>
        
        {/* Кнопка закрытия (снимает выделение) */}
        <button
          className="ml-1 hover:bg-slate-700/50 rounded-full p-1 transition-colors"
          onClick={clearSelection}
          title="Снять выделение"
        >
          <X size={14} />
        </button>
      </div>

      <div className="rounded-md overflow-hidden border shadow-sm dark:border-slate-700">
        <div className="overflow-x-auto max-h-[700px] plan-wrapper" ref={scrollWrapperRef}>
          <div className="min-w-max relative">
            <table className="table-fixed border-collapse w-full" ref={tableRef}>
              <colgroup>
                <col className="w-[200px]" /> {/* Дисциплины */}
                {weeks.map((_, i) => (
                  <col key={i} className="w-[40px]" /> 
                ))}
              </colgroup>
              <thead className="sticky top-0 z-20" ref={headerRef}>
                {renderHeaders()}
              </thead>
              <tbody className="bg-slate-950">
                {renderCourseRows()}
              </tbody>
              <tfoot className="sticky bottom-0 bg-slate-900 text-white">
                <tr>
                  <td className="sticky left-0 bg-slate-900 px-4 py-2 font-semibold z-10">Итого</td>
                  {weeks.map((_, idx) => (
                    <td key={idx} className="text-center p-1 border-r border-slate-700"></td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
      
      <div className="mt-4 flex justify-between items-center">
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Обозначения:</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(ACTIVITY_TYPES).map(([code, description]) => {
              const { bg, text } = getActivityStyle(code as ActivityType);
              return (
                <div key={code} className="text-xs bg-muted px-2 py-1 rounded-md flex items-center">
                  <span className={`mr-1 ${bg} ${text} w-6 h-6 flex items-center justify-center rounded font-semibold`}>
                    {code}
                  </span> 
                  — {description}
                </div>
              );
            })}
          </div>
          
          <div className="text-xs text-slate-500 mt-1">
            * Курсы начинаются с первого рабочего дня сентября (+N лет от начала обучения)
          </div>
          
          <div className="text-xs text-slate-500 mt-1">
            * Одинарный клик — выделить ячейку, Shift+клик — выделить диапазон, двойной клик — редактировать
          </div>
        </div>
        
        <div>
          <SaveButton 
            onClick={forceSave}
            isSaving={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          />
        </div>
      </div>
      
      <WeekActivityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        weekInfo={selectedWeek}
        currentActivity={selectedWeek ? tableData[getCellKey(selectedWeek.courseId, selectedWeek.weekNumber)] || "" : ""}
        onActivityChange={handleActivityChange}
      />
      
      {/* Простой тултип с фиксированным z-index */}
      <Tooltip 
        id="calendar-tooltip" 
        className="academic-tooltip" 
        place="top-start"
        clickable={true}
        delayHide={0}
        delayShow={600}
        positionStrategy="fixed"
      />
    </div>
  );
}