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

  for (let c = 1; c <= courses; c++) {
    for (let w = 1; w <= 52; w++) {
      const key = `course${c}_week${w}` as const;
      const act = (data[key] ?? "-") as ActivityType;
      const row = rows[act];
      const sem = w <= 26 ? "sem1" : "sem2";

      row.perCourse[c] ??= { sem1: 0, sem2: 0, total: 0 };
      row.perCourse[c][sem]++;
      row.perCourse[c].total++;
      row.grandTotal++;
    }
  }
  return acts.map(a => rows[a]);
};