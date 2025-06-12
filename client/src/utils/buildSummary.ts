import { ActivityType } from "@/components/curriculum/ActivityTypes";

type CalendarData = Record<string, ActivityType>;

export interface SummaryRow {
  activity: ActivityType; // "У" | "К" | …
  perCourse: {
    [course: number]: { sem1: number; sem2: number; total: number }
  };
  grandTotal: number;
}

export const buildSummary = (
  data: CalendarData,
  courses = 4,
): SummaryRow[] => {
  
  const rows: Record<ActivityType, SummaryRow> = {} as any;
  const acts: ActivityType[] = ["У","К","П","Э","Д","-"]; // порядок вывода

  acts.forEach(a => rows[a] = {
    activity: a,
    perCourse: {},
    grandTotal: 0,
  });

  // Убедимся, что data - это объект
  if (!data || typeof data !== 'object') {
    return acts.map(a => rows[a]); // Возвращаем пустые строки
  }

  // Получаем все ключи календарных данных
  const keys = Object.keys(data);
  // Определяем максимальное количество недель, анализируя ключи
  let maxWeeks = 0;
  
  // Анализируем ключи для определения максимального номера недели
  keys.forEach(key => {
    const match = key.match(/week(\d+)/);
    if (match) {
      const weekNum = parseInt(match[1], 10);
      if (weekNum > maxWeeks) {
        maxWeeks = weekNum;
      }
    }
  });
  
  
  for (let c = 1; c <= courses; c++) {
    for (let w = 1; w <= maxWeeks; w++) {
      const key = `course${c}_week${w}` as const;
      const act = (data[key] ?? "-") as ActivityType;
      
      // Проверка на наличие значения
      if (!act) {
        continue;
      }
      
      const row = rows[act];
      if (!row) {
        continue;
      }
      
      const sem = w <= 26 ? "sem1" : "sem2";

      row.perCourse[c] ??= { sem1: 0, sem2: 0, total: 0 };
      row.perCourse[c][sem]++;
      row.perCourse[c].total++;
      row.grandTotal++;
    }
  }
  
  const result = acts.map(a => rows[a]);
  return result;
};