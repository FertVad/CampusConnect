import React from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

// Тип активности
export type ActivityType = "У" | "К" | "П" | "Э" | "Д" | "";

// Типы активностей с описаниями
export const ACTIVITY_TYPES: { [key in Exclude<ActivityType, "">]: string } = {
  "У": "Учебный процесс",
  "К": "Каникулы",
  "П": "Практика",
  "Э": "Экзаменационная сессия",
  "Д": "Дипломное проектирование"
};

// Цвета для активностей
const ACTIVITY_COLORS: { [key in Exclude<ActivityType, "">]: { bg: string, text: string, hoverBg: string } } = {
  "У": { bg: "bg-blue-200", text: "text-blue-800", hoverBg: "hover:bg-blue-300" },
  "К": { bg: "bg-gray-200", text: "text-gray-800", hoverBg: "hover:bg-gray-300" },
  "П": { bg: "bg-yellow-200", text: "text-yellow-800", hoverBg: "hover:bg-yellow-300" },
  "Э": { bg: "bg-red-200", text: "text-red-800", hoverBg: "hover:bg-red-300" },
  "Д": { bg: "bg-purple-200", text: "text-purple-800", hoverBg: "hover:bg-purple-300" },
};

export interface WeekInfo {
  courseId: number;
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  monthName: string;
}

interface WeekActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekInfo: WeekInfo | null;
  currentActivity: ActivityType;
  onActivityChange: (activity: ActivityType) => void;
}

export function WeekActivityDialog({
  open,
  onOpenChange,
  weekInfo,
  currentActivity,
  onActivityChange
}: WeekActivityDialogProps) {
  if (!weekInfo) return null;

  // Форматирование даты
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Дни недели
  const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  // Обработчик выбора активности
  const handleActivitySelect = (value: string) => {
    onActivityChange(value as ActivityType);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Активность для недели {weekInfo.weekNumber}</DialogTitle>
          <DialogDescription>
            {weekInfo.monthName}, курс {weekInfo.courseId}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-md">
            <div className="flex justify-between text-sm mb-3">
              <span className="font-medium">Начало: <span className="text-slate-700 dark:text-slate-300">{formatDate(weekInfo.startDate)}</span></span>
              <span className="font-medium">Конец: <span className="text-slate-700 dark:text-slate-300">{formatDate(weekInfo.endDate)}</span></span>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {weekdays.map((day, i) => (
                <div 
                  key={i} 
                  className="flex flex-col items-center justify-center h-8 text-xs font-semibold bg-slate-200 dark:bg-slate-700 rounded"
                >
                  {day}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium mb-1">Выберите тип активности:</h4>
            <RadioGroup 
              value={currentActivity} 
              onValueChange={handleActivitySelect}
              className="grid grid-cols-1 gap-2"
            >
              {Object.entries(ACTIVITY_TYPES).map(([code, description]) => {
                const colorStyle = ACTIVITY_COLORS[code as Exclude<ActivityType, "">];
                return (
                  <div 
                    key={code} 
                    className={`flex items-center space-x-2 p-2 rounded-md ${colorStyle.hoverBg} transition-colors`}
                  >
                    <RadioGroupItem value={code} id={`activity-${code}`} />
                    <Label htmlFor={`activity-${code}`} className="flex items-center cursor-pointer">
                      <span className={`font-semibold text-lg mr-2 w-8 h-8 flex items-center justify-center rounded ${colorStyle.bg} ${colorStyle.text}`}>
                        {code}
                      </span>
                      <span>{description}</span>
                    </Label>
                  </div>
                );
              })}
              <div 
                className="flex items-center space-x-2 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <RadioGroupItem value="" id="activity-none" />
                <Label htmlFor="activity-none" className="flex items-center cursor-pointer">
                  <span className="font-semibold text-lg mr-2 w-8 h-8 flex items-center justify-center rounded bg-white dark:bg-slate-950 border">
                    —
                  </span>
                  <span>Нет активности</span>
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={() => onOpenChange(false)} className="bg-blue-600 hover:bg-blue-700">
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}