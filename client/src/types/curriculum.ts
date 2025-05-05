// Типы для учебного плана

// Базовый тип для узла в учебном плане
export interface PlanNodeBase {
  id: string;          // UUID в string формате
  title: string;
  parentId: string | null;
  type: 'section' | 'group' | 'subject';
  orderIndex?: number; // Индекс для сортировки
  isCollapsed?: boolean; // Флаг для свернутого состояния (для разделов и групп)
}

// Структура для часов по типу активности в семестре
export interface ActivityHours {
  lectures: number;    // Лекции
  practice: number;    // Практические
  laboratory: number;  // Лабораторные
  selfStudy: number;   // Самостоятельная подготовка
  courseProject: number; // Курсовое проектирование 
  consultation: number;  // Консультации
  total: number;       // Итого часов
}

// Дисциплина с часами по семестрам и типам занятий
export interface Subject extends PlanNodeBase {
  type: 'subject';
  hours: number[];     // одно число на семестр (обратная совместимость)
  activityHours?: ActivityHours[]; // Массив структур для каждого семестра с детализацией
  controlType?: ('exam' | 'credit' | 'differentiated_credit' | 'coursework')[]; // Формы контроля для каждого семестра
  totalHours?: number; // Общее количество часов
  creditUnits?: number; // Зачетные единицы
}

// Обобщенный тип для узла учебного плана
export type PlanNode = Subject | PlanNodeBase;

// Тип для всего учебного плана
export type CurriculumPlan = PlanNode[]; // плоский список-дерево

// Информация о плане
export interface CurriculumPlanInfo {
  id: string;
  schemaVersion?: number; // Версия схемы данных
  planData: CurriculumPlan;
}

// Для добавления к типу CurriculumPlan в shared/schema.ts
export type CurriculumPlanExtension = {
  curriculumPlanData?: string; // JSON строка с данными учебного плана
};