import { addWeeks, isBefore, format, addDays, addYears, getDay, setDate } from "date-fns";
import { ru } from "date-fns/locale/ru";

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
 * @param startDate Дата начала обучения (без автосдвига на понедельник)
 * @param totalYears Длительность обучения в годах
 * @returns Массив объектов WeekCell, представляющих недели учебного периода
 */
export const buildAcademicWeeks = (
  startDate: Date,
  totalYears = 4
): WeekCell[] => {
  const weeks: WeekCell[] = [];
  let curr = new Date(startDate);          // неделя №1: старт ≡ выбранная дата
  const studyEnd = new Date(startDate.getFullYear() + totalYears, 7, 31); // 31 августа через N лет
  let n = 1;

  while (isBefore(curr, addDays(studyEnd, 1))) {
    const end = addDays(curr, 6);
    weeks.push({
      startDate: new Date(curr),
      endDate: new Date(end),
      month: format(curr, "LLLL", { locale: ru }),
      index: n++,
    });
    curr = addWeeks(curr, 1);
  }
  return weeks;
};