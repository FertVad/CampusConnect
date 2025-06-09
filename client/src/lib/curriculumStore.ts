import { create } from 'zustand';

/**
 * Интерфейс состояния учебного плана
 */
interface CurriculumState {
  // Количество лет обучения
  yearsOfStudy: number;
  // Функция для установки количества лет обучения
  setYearsOfStudy: (years: number) => void;
  // Количество месяцев (дополнительно к годам)
  monthsOfStudy: number;
  // Функция для установки количества месяцев обучения
  setMonthsOfStudy: (months: number) => void;
  // Текущие данные календаря
  calendarData: Record<string, string>;
  // Функция для установки данных календаря
  setCalendarData: (data: Record<string, string>) => void;
  // Получить эффективное количество курсов (годы + 1 при наличии месяцев)
  plan: string | null;
  setPlan: (plan: string) => void;
  getEffectiveCourseCount: () => number;
}

/**
 * Хранилище состояния учебного плана
 */
export const useCurriculum = create<CurriculumState>((set, get) => ({
  // Начальное количество лет обучения
  yearsOfStudy: 4,
  // Функция для установки количества лет обучения
  setYearsOfStudy: (years: number) => set({ yearsOfStudy: years }),
  // Начальное количество месяцев обучения
  monthsOfStudy: 0,
  // Функция для установки количества месяцев обучения
  setMonthsOfStudy: (months: number) => set({ monthsOfStudy: months }),
  // Начальные данные календаря (пустой объект)
  calendarData: {},
  // Функция для установки данных календаря
  setCalendarData: (data: Record<string, string>) => set({ calendarData: data }),
  // Получить эффективное количество курсов с учетом дополнительных месяцев
  // NEW: единый учебный план (объект или строка-JSON)
  plan: null as string | null,            // ← поле-хранилище
  setPlan: (plan: string) => set({ plan }), // ← setter
  getEffectiveCourseCount: () => {
    const state = get();
    return state.yearsOfStudy + (state.monthsOfStudy > 0 ? 1 : 0);
  }
}));