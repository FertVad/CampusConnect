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

// Дисциплина с часами по семестрам
export interface Subject extends PlanNodeBase {
  type: 'subject';
  hours: number[];     // one number per semester
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