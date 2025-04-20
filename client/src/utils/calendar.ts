import { startOfWeek, addWeeks, isBefore, format } from "date-fns";
import { ru } from "date-fns/locale/ru";

export interface WeekCell {
  startDate: Date;   // понедельник
  endDate: Date;     // воскресенье
  month: string;     // «Сентябрь» и т.д.
  index: number;     // порядковый номер недели с 1
}

export const buildAcademicWeeks = (startYear: number = 2025): WeekCell[] => {
  // Учебный год считается с 1 сентября startYear до 31 августа (startYear+1)
  const sept1 = new Date(startYear, 8, 1);                  // 8 = сентябрь (отсчет с 0)
  let curr = startOfWeek(sept1, { weekStartsOn: 1 });       // ближайший понедельник
  const lastDay = new Date(startYear + 1, 7, 31);           // 31 августа следующего года

  const weeks: WeekCell[] = [];
  let n = 1;
  while (isBefore(curr, addWeeks(lastDay, 1))) {
    const start = curr;
    const end = addWeeks(curr, 1);
    weeks.push({
      startDate: start,
      endDate: new Date(end.getTime() - 1),  // конец - это воскресенье (день до следующего понедельника)
      month: format(start, "LLLL", { locale: ru }),
      index: n++,
    });
    curr = end;
  }
  return weeks;
};