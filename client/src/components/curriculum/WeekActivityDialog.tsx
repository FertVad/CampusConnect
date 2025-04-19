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
          <div className="p-3 bg-muted/30 rounded-md">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Начало: {formatDate(weekInfo.startDate)}</span>
              <span>Конец: {formatDate(weekInfo.endDate)}</span>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {weekdays.map((day, i) => (
                <div 
                  key={i} 
                  className="flex flex-col items-center justify-center h-8 text-xs bg-muted rounded"
                >
                  {day}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium">Выберите тип активности:</h4>
            <RadioGroup 
              value={currentActivity} 
              onValueChange={handleActivitySelect}
              className="grid grid-cols-1 gap-2"
            >
              {Object.entries(ACTIVITY_TYPES).map(([code, description]) => (
                <div 
                  key={code} 
                  className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50"
                >
                  <RadioGroupItem value={code} id={`activity-${code}`} />
                  <Label htmlFor={`activity-${code}`} className="flex items-center">
                    <span className="font-semibold text-lg mr-2">{code}</span>
                    <span>{description}</span>
                  </Label>
                </div>
              ))}
              <div 
                className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50"
              >
                <RadioGroupItem value="" id="activity-none" />
                <Label htmlFor="activity-none" className="flex items-center">
                  <span className="font-semibold text-lg mr-2">—</span>
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
          <Button onClick={() => onOpenChange(false)}>
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}