import { create } from 'zustand';

/**
 * Интерфейс состояния учебного плана
 */
interface CurriculumState {
  // Количество лет обучения
  yearsOfStudy: number;
  // Функция для установки количества лет обучения
  setYearsOfStudy: (years: number) => void;
  // Текущие данные календаря
  calendarData: Record<string, string>;
  // Функция для установки данных календаря
  setCalendarData: (data: Record<string, string>) => void;
}

/**
 * Хранилище состояния учебного плана
 */
export const useCurriculum = create<CurriculumState>((set) => ({
  // Начальное количество лет обучения
  yearsOfStudy: 4,
  // Функция для установки количества лет обучения
  setYearsOfStudy: (years: number) => set({ yearsOfStudy: years }),
  // Начальные данные календаря (пустой объект)
  calendarData: {},
  // Функция для установки данных календаря
  setCalendarData: (data: Record<string, string>) => set({ calendarData: data }),
}));