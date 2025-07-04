import { addWeeks, isBefore, format, addDays, addYears, getDay, setDate, addMonths, eachWeekOfInterval, startOfWeek } from "date-fns";
import { ru } from "date-fns/locale/ru";
import { getWeeksInYear } from "./getWeeksInYear";

export interface WeekCell {
  startDate: Date;        // фактический день-старта недели
  endDate: Date;          // +6 дней
  month: string;          // «Сентябрь» и т.д.
  index: number;          // 1…N по порядку
}

/**
 * Определяет первый рабочий день (понедельник-пятница) сентября в указанном году
 * @param year Год для которого нужно определить первый рабочий день сентября
 * @returns Дата первого рабочего дня сентября
 */
export const getFirstWorkdayOfSeptember = (year: number): Date => {
  // Создаем дату 1 сентября указанного года
  const september1st = new Date(year, 8, 1); // Месяцы начинаются с 0, поэтому сентябрь - 8
  
  // Получаем день недели (0 - воскресенье, 1 - понедельник, ..., 6 - суббота)
  const dayOfWeek = getDay(september1st);
  
  // Если 1 сентября выпадает на субботу (6) или воскресенье (0), 
  // то первый рабочий день - следующий понедельник
  if (dayOfWeek === 0) { // Воскресенье
    return addDays(september1st, 1); // Понедельник
  } else if (dayOfWeek === 6) { // Суббота
    return addDays(september1st, 2); // Понедельник
  }
  
  // Если 1 сентября - рабочий день (пн-пт), возвращаем эту дату
  return september1st;
};

/**
 * Строит массив недель учебного года.
 * Неделя начинается с выбранного дня недели (день недели startDate).
 * Например, если startDate - это пятница, то каждая неделя будет с пятницы по четверг.
 * 
 * @param startDate Дата начала обучения (первый рабочий день сентября)
 * @param totalYears Длительность обучения в годах (не используется более для генерации всех недель)
 * @returns Массив объектов WeekCell, представляющих недели учебного периода (только один год)
 */
export const buildAcademicWeeks = (
  startDate: Date,
  totalYears = 4, // параметр сохранен для совместимости
  totalMonths = 0 // дополнительные месяцы (для хвостового курса)
): WeekCell[] => {
  const weeks: WeekCell[] = [];
  let curr = new Date(startDate);          // неделя №1: старт ≡ выбранная дата (первый рабочий день сентября)
  
  // Определяем день недели, с которого начинается первая неделя
  const startDayOfWeek = getDay(curr); // 0 = воскресенье, 1 = понедельник, ..., 6 = суббота
  
  // Получаем количество недель в текущем учебном году
  // Учебный год охватывает два календарных года, поэтому берем максимум из обоих
  const startYear = startDate.getFullYear();
  const endYear = startYear + 1;
  const startYearWeeks = getWeeksInYear(startYear);
  const endYearWeeks = getWeeksInYear(endYear);
  const maxWeeksInYear = Math.max(startYearWeeks, endYearWeeks);
  
  console.log(`[buildAcademicWeeks] Количество недель в году ${startYear}: ${startYearWeeks}`);
  console.log(`[buildAcademicWeeks] Количество недель в году ${endYear}: ${endYearWeeks}`);
  console.log(`[buildAcademicWeeks] Максимальное количество недель: ${maxWeeksInYear}`);
  
  // Теперь генерируем недели для одного учебного года
  // Учебный год: с 1 сентября по 31 августа следующего года
  // Увеличим дату окончания на 6 дней, чтобы гарантировать отображение всех недель августа
  const studyYearEnd = new Date(startDate.getFullYear() + 1, 7, 31); // 31 августа следующего года
  
  let n = 1;

  // Генерация всех недель учебного года, включая последнюю неделю августа
  // Обрабатываем текущее количество недель в году
  while (isBefore(curr, addDays(studyYearEnd, 7)) && n <= maxWeeksInYear) {
    // Вычисляем конец недели - 7 дней от начала, сохраняя день недели
    // Например, если первая неделя начинается в пятницу, то заканчивается в четверг
    const end = addDays(curr, 6);
    
    weeks.push({
      startDate: new Date(curr),
      endDate: new Date(end),
      month: format(curr, "LLLL", { locale: ru }),
      index: n++,
    });
    
    // Переходим к началу следующей недели (7 дней от текущего начала)
    curr = addDays(curr, 7);
  }
  
  return weeks;
};

/**
 * Строит массив недель для всех курсов, включая частичный (хвостовой) курс при наличии дополнительных месяцев
 * @param startDate Дата начала первого курса
 * @param years Количество полных лет обучения
 * @param months Количество дополнительных месяцев для частичного курса
 * @returns Массив объектов WeekCell для всех курсов
 */
export const buildWeeksWithMonths = (
  startDate: Date,
  years: number,
  months: number
): WeekCell[] => {
  const allWeeks: WeekCell[] = [];
  let weekIndex = 1;
  
  // Генерируем недели для полных курсов (по годам)
  for (let yearIndex = 0; yearIndex < years; yearIndex++) {
    // Дата начала текущего курса
    const courseStartDate = yearIndex === 0 
      ? startDate 
      : getFirstWorkdayOfSeptember(startDate.getFullYear() + yearIndex);
    
    // Дата окончания - 31 августа следующего года
    const courseEndDate = new Date(courseStartDate.getFullYear() + 1, 7, 31);
    
    // Получаем все недели для этого курса
    const weeksInCourse = eachWeekOfInterval(
      { start: courseStartDate, end: courseEndDate },
      { weekStartsOn: 1 } // Начинаем недели с понедельника
    );
    
    // Преобразуем в формат WeekCell
    for (const weekStart of weeksInCourse) {
      const weekEnd = addDays(weekStart, 6);
      allWeeks.push({
        startDate: weekStart,
        endDate: weekEnd,
        month: format(weekStart, "LLLL", { locale: ru }),
        index: weekIndex++
      });
    }
  }
  
  // Если есть дополнительные месяцы, добавляем недели для хвостового курса
  if (months > 0) {
    // Дата начала хвостового курса
    const tailStartDate = getFirstWorkdayOfSeptember(startDate.getFullYear() + years);
    
    // Дата окончания хвостового курса - через указанное количество месяцев
    const tailEndDate = addMonths(tailStartDate, months);
    
    console.log(`[buildWeeksWithMonths] Хвостовой курс: ${format(tailStartDate, 'yyyy-MM-dd')} - ${format(tailEndDate, 'yyyy-MM-dd')}`);
    
    // Получаем все недели для хвостового курса
    const weeksInTailCourse = eachWeekOfInterval(
      { start: tailStartDate, end: tailEndDate },
      { weekStartsOn: 1 } // Начинаем недели с понедельника
    );
    
    // Преобразуем в формат WeekCell
    for (const weekStart of weeksInTailCourse) {
      const weekEnd = addDays(weekStart, 6);
      allWeeks.push({
        startDate: weekStart,
        endDate: weekEnd,
        month: format(weekStart, "LLLL", { locale: ru }),
        index: weekIndex++
      });
    }
  }
  
  return allWeeks;
};