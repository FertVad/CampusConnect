import { addWeeks, isBefore, format, addDays } from "date-fns";
import { ru } from "date-fns/locale/ru";

export interface WeekCell {
  startDate: Date;        // фактический день-старта недели
  endDate: Date;          // +6 дней
  month: string;          // «Сентябрь» и т.д.
  index: number;          // 1…N по порядку
}

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
      startDate: curr,
      endDate: end,
      month: format(curr, "LLLL", { locale: ru }),
      index: n++,
    });
    curr = addWeeks(curr, 1);
  }
  return weeks;
};