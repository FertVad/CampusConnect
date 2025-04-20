import { startOfWeek, addWeeks, isBefore, format, addDays } from "date-fns";
import { ru } from "date-fns/locale/ru";

export interface WeekCell {
  startDate: Date;   // понедельник
  endDate: Date;     // воскресенье
  month: string;     // «Сентябрь» и т.д.
  index: number;     // порядковый номер недели с 1
}

/**
 * Строит массив недель учебного года.
 * @param year       Год начала обучения (например, 2025)
 * @returns Массив объектов WeekCell, представляющих недели учебного года
 */
export const buildAcademicWeeks = (year = 2025): WeekCell[] => {
  const sept1 = new Date(year, 8, 1);                      // 1 сентября (месяцы с 0)
  let curr = startOfWeek(sept1, { weekStartsOn: 1 });      // ближайший понедельник
  const lastDay = new Date(year + 1, 7, 31);               // 31 августа следующего года
  
  const weeks: WeekCell[] = [];
  let n = 1;
  while (isBefore(curr, addWeeks(lastDay, 1))) {
    const start = curr;
    const end = addDays(curr, 6);                         // воскресенье (старт + 6 дней)
    weeks.push({
      startDate: start,
      endDate: end,
      month: format(start, "LLLL", { locale: ru }),
      index: n++,
    });
    curr = addWeeks(curr, 1);                             // следующий понедельник
  }
  return weeks;
};