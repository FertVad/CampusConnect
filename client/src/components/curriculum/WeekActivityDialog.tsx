import React, { useState, useLayoutEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

// Импортируем типы из общего модуля
import { 
  ActivityType, 
  ACTIVITY_TYPES, 
  ACTIVITY_COLORS, 
  weekGradient 
} from "./ActivityTypes";

// Функция weekGradient теперь импортируется из ActivityTypes.ts

// Интерфейс для дня недели
interface WeekDay {
  name: string; // Пн, Вт, и т.д.
  date: number; // Число месяца
  selected: boolean;
  activity: ActivityType;
}

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
  onActivityChange,
}: WeekActivityDialogProps) {
  // Не используем раннее возвращение null, так как это вызывает проблемы с состоянием
  // вместо этого используем условный рендеринг в JSX

  // Дни недели с числами календаря
  const [weekDays, setWeekDays] = useState<WeekDay[]>([]);
  // Выбранная активность
  const [selectedActivity, setSelectedActivity] = useState<ActivityType>(
    currentActivity || "",
  );
  // Отслеживаем клики для определения двойного клика
  const [lastClickTime, setLastClickTime] = useState<number>(0);
  // Отслеживаем, есть ли выбранные дни
  const [hasSelectedDays, setHasSelectedDays] = useState<boolean>(false);

  // Инициализируем дни недели при открытии модального окна
  useLayoutEffect(() => {
    if (weekInfo) {
      // Используем даты начала и конца недели из параметра weekInfo
      // Неделя может начинаться с любого дня недели (не обязательно с понедельника)
      const { startDate, endDate } = weekInfo;
      
      // Создаем массив дней между startDate и endDate (включительно)
      const days: WeekDay[] = [];
      
      // Русское название дней недели
      const daysOfWeekNames = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
      
      // Разбиваем текущую активность на символы для определения активности по дням
      let dailyActivities: ActivityType[] = [];

      // Инициализируем массив пустыми значениями (для 7 дней)
      dailyActivities = Array(7).fill("") as ActivityType[];

      // Определяем активности по дням
      if (currentActivity) {
        if (currentActivity.length === 1) {
          // Если активность установлена и это один символ - применяем его ко всем дням
          dailyActivities = Array(7).fill(currentActivity) as ActivityType[];
        } else {
          // Если активность - строка символов, распределяем их по дням
          // Если символов меньше 7, оставшиеся дни будут пустыми
          // Если символов больше 7, используем только первые 7
          const chars = currentActivity.split("");
          for (let i = 0; i < Math.min(chars.length, 7); i++) {
            if (chars[i] && chars[i].trim() !== "") {
              dailyActivities[i] = chars[i] as ActivityType;
            }
          }
        }
      }

      // Создаем дни недели с календарными датами и активностями
      const currentDate = new Date(startDate);
      
      for (let i = 0; i < 7; i++) {
        // Создаем копию текущей даты
        const date = new Date(currentDate);
        
        // Определяем название дня недели
        const dayOfWeek = date.getDay(); // 0 = воскресенье, 1 = понедельник, ..., 6 = суббота
        const dayName = daysOfWeekNames[dayOfWeek];
        
        days.push({
          name: dayName,
          date: date.getDate(), // число месяца
          // При открытии диалога дни НЕ выбраны
          selected: false,
          // Устанавливаем активность из разобранной строки или пустую
          activity: dailyActivities[i] || "",
        });
        
        // Переходим к следующему дню
        currentDate.setDate(currentDate.getDate() + 1);
      }

      setWeekDays(days);

      // Определяем преобладающую активность для выбора в RadioGroup
      const activityCounts = new Map<ActivityType, number>();
      days.forEach((day) => {
        if (day.activity) {
          activityCounts.set(
            day.activity,
            (activityCounts.get(day.activity) || 0) + 1,
          );
        }
      });

      // Находим активность с максимальным количеством дней
      let predominantActivity: ActivityType = "";
      let maxCount = 0;

      activityCounts.forEach((count, activity) => {
        if (count > maxCount) {
          maxCount = count;
          predominantActivity = activity;
        }
      });

      // Устанавливаем преобладающую активность как выбранную
      setSelectedActivity(predominantActivity);
      // При открытии диалога дни не выбраны
      setHasSelectedDays(false);
    }
  }, [weekInfo, currentActivity]);

  // Удаляем обработчик клика вне области - используем только двойной клик
  // для сброса выделения
  const handleContainerClick = (e: React.MouseEvent) => {
    // Оставляем пустую функцию, чтобы не было ошибок
    // Сброс делаем только по двойному клику
  };

  // Обработчик клика по дню недели
  const handleDayClick = (index: number) => {
    const now = Date.now();
    const timeDiff = now - lastClickTime;

    if (timeDiff < 300) {
      // Двойной клик (300мс)
      // Выбираем или снимаем выбор со всех рабочих дней (Пн-Пт)
      const newDays = [...weekDays];

      // Проверяем, все ли рабочие дни выбраны
      const allWorkdaysSelected = newDays
        .slice(0, 5)
        .every((day) => day.selected);

      // Если все рабочие дни выбраны, снима �м выбор, иначе выбираем все
      for (let i = 0; i < 5; i++) {
        // Пн-Пт (индексы 0-4)
        newDays[i].selected = !allWorkdaysSelected;
      }

      setWeekDays(newDays);
      setHasSelectedDays(newDays.some((day) => day.selected));
    } else {
      // Одинарный клик - инвертируем выбор дня
      const newDays = [...weekDays];

      // Если день уже выбран, снимаем выбор
      if (newDays[index].selected) {
        newDays[index].selected = false;
      } else {
        // Если день не выбран, выбираем его
        newDays[index].selected = true;

        // Если выбрана активность, сразу же применяем её к выбранному дню
        if (selectedActivity) {
          newDays[index].activity = selectedActivity;

          // убираем подсветку // флаг выделения = false        // Radio‑кнопка — в "ничего"
              newDays[index].selected = false;   
              setHasSelectedDays(false);         
              setSelectedActivity("");          
        }
      }

      setWeekDays(newDays);
      setHasSelectedDays(newDays.some((day) => day.selected));
    }

    setLastClickTime(now);
  };

  // Обработчик выбора активности
  // helper — снимает выделение со всех дней
  const clearSelection = (days: WeekDay[]) =>
    days.map((d) => ({ ...d, selected: false }));

  // ===== 1. handleActivitySelect =====
  const handleActivitySelect = (value: string) => {
    const activityValue = value as ActivityType;

    // если нет выделенных дней — просто запоминаем радиокнопку
    if (!hasSelectedDays) {
      setSelectedActivity(activityValue);
      return;
    }

    // применяем активность к выделенным дням + снимаем выделение
    const updatedDays = weekDays.map((day) =>
      day.selected ? { ...day, activity: activityValue, selected: false } : day,
    );

    setWeekDays(updatedDays);
    setHasSelectedDays(false);
    setSelectedActivity(""); // сброс выбранной активности
  };

  // ===== 2. handleSave =====
  const handleSave = () => {
    let finalDays = weekDays;

    // если остались выделенные дни с выбранной активностью — применяем
    if (hasSelectedDays && selectedActivity) {
      finalDays = weekDays.map((day) =>
        day.selected
          ? { ...day, activity: selectedActivity, selected: false }
          : day,
      );
    }

    // конвертируем в строку фиксированной длины 7 (пробел вместо пустого)
    const activitiesString = finalDays.map(d => d.activity || ' ').join('');

    onActivityChange(
      activitiesString.trim() ? (activitiesString as ActivityType) : "",
    );

    // закрываем диалог и сбрасываем вспомогательные состояния
    onOpenChange(false);
    setWeekDays(finalDays);
    setHasSelectedDays(false);
    setSelectedActivity("");
  };

  // Стиль для дня недели в зависимости от активности и выбранности
  const getDayStyle = (day: WeekDay) => {
    console.log('getDayStyle вызван для дня:', day);
    let baseStyle = "";

    // Установка базового стиля для дня
    if (!day.activity && !day.selected) {
      // Если нет активности и день не выбран - стандартный фон
      baseStyle =
        "bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white";
      console.log('Нет активности и не выбран:', baseStyle);
    } else if (day.selected) {
      // Если день выбран - показываем прозрачным цветом активности или предварительный выбор
      if (selectedActivity && selectedActivity in ACTIVITY_COLORS) {
        // Используем цвет выбранной активности для предпросмотра
        console.log('Выбранная активность:', selectedActivity);
        console.log('ACTIVITY_COLORS доступны:', typeof ACTIVITY_COLORS !== 'undefined');
        
        const previewColorStyle =
          ACTIVITY_COLORS[selectedActivity as Exclude<ActivityType, "">];
        console.log('previewColorStyle:', previewColorStyle);
        
        baseStyle = `${previewColorStyle.bg} text-slate-800 ring-2 ring-blue-600 dark:ring-blue-400`;
        console.log('Итоговый стиль:', baseStyle);
      } else {
        // Если активность не выбрана, но день выделен
        baseStyle =
          "bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white ring-2 ring-blue-600 dark:ring-blue-400";
        console.log('Выбран без активности:', baseStyle);
      }
    } else if (day.activity && day.activity in ACTIVITY_COLORS) {
      // Если у дня есть активность и он не выбран
      console.log('День с активностью:', day.activity);
      console.log('ACTIVITY_COLORS доступен:', typeof ACTIVITY_COLORS !== 'undefined');
      
      const colorStyle =
        ACTIVITY_COLORS[day.activity as Exclude<ActivityType, "">];
      console.log('colorStyle:', colorStyle);
      
      baseStyle = `${colorStyle.bg} text-slate-800`;
      console.log('Итоговый стиль для дня с активностью:', baseStyle);
    } else if (day.activity) {
      // Если у дня активность не из предопределенных - используем нейтральный цвет
      baseStyle =
        "bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-white";
      console.log('Неизвестная активность:', day.activity, 'стиль:', baseStyle);
    }

    return baseStyle;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && weekInfo && (
        <DialogContent
          key={`dialog-week-${weekInfo.courseId}-${weekInfo.weekNumber}`}
          className="sm:max-w-md calendar-dialog-content bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-lg"
        >
          <div className="flex justify-between items-center">
            <DialogHeader className="pb-3 mb-4">
              <DialogTitle className="text-lg font-bold">
                Учебная неделя {weekInfo.weekNumber}
              </DialogTitle>
              <DialogDescription className="text-sm font-medium">
                {weekInfo.startDate.toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "long",
                })}
                {" — "}
                {weekInfo.endDate.toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "long",
                })}
                {", курс "}{weekInfo.courseId}
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="h-8 border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Отмена
              </Button>
              <Button
                onClick={handleSave}
                className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={
                  weekDays.every((day) => !day.activity) && !hasSelectedDays
                }
              >
                Сохранить
              </Button>
            </div>
          </div>
          <div className="border-b mb-4"></div>

          <div className="space-y-4" onClick={handleContainerClick}>
            <div
              className="p-4 bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700"
              onDoubleClick={(e) => {
                // Обработка двойного клика по всей области
                e.preventDefault(); // Предотвращаем выделение текста

                // Проверяем наличие выбранных дней
                const hasSelected = weekDays.some((day) => day.selected);

                if (hasSelected) {
                  // Если есть выбранные дни - сбрасываем все выделения
                  const updatedDays = weekDays.map((day) => ({
                    ...day,
                    selected: false,
                  }));
                  setWeekDays(updatedDays);
                  setHasSelectedDays(false);
                } else {
                  // Если выделенных дней нет - проверяем состояние рабочих дней
                  const newDays = [...weekDays];

                  // Проверяем, все ли рабочие дни (Пн-Пт) имеют одинаковую активность
                  const workdays = newDays.slice(0, 5);
                  const firstActivity = workdays[0].activity;
                  const allHaveSameActivity =
                    firstActivity &&
                    workdays.every((day) => day.activity === firstActivity);

                  // Если все рабочие дни имеют одинаковую непустую активность,
                  // то при двойном клике очищаем их активность
                  if (allHaveSameActivity) {
                    for (let i = 0; i < 5; i++) {
                      // Пн-Пт (индексы 0-4)
                      newDays[i].selected = true;
                      newDays[i].activity = ""; // Очищаем активность
                    }
                  } else {
                    // Иначе выбираем все рабочие дни и устанавливаем им текущую активность
                    for (let i = 0; i < 5; i++) {
                      // Пн-Пт (индексы 0-4)
                      newDays[i].selected = true;

                      // Если выбрана активность, применяем её
                      if (selectedActivity) {
                        newDays[i].activity = selectedActivity;
                      }
                    }
                  }

                  setWeekDays(newDays);
                  setHasSelectedDays(true);
                }
              }}
            >
              <div className="grid grid-cols-7 gap-2 week-days-grid">
                {weekDays.map((day, i) => (
                  <div
                    key={i}
                    className={`flex flex-col items-center justify-center p-2 rounded cursor-pointer transition-all ${getDayStyle(day)}`}
                    onClick={(e) => {
                      e.stopPropagation(); // Останавливаем всплытие события
                      handleDayClick(i);
                    }}
                  >
                    <div className="text-xs font-semibold">{day.name}</div>
                    <div className="text-sm font-bold">{day.date}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium mb-1">
                Выберите тип активности:
              </h4>
              <RadioGroup
                value={selectedActivity}
                onValueChange={handleActivitySelect}
                className="grid grid-cols-1 gap-2"
              >
                {Object.entries(ACTIVITY_TYPES).map(([code, description]) => {
                  const colorStyle =
                    ACTIVITY_COLORS[code as Exclude<ActivityType, "">];
                  return (
                    <div
                      key={code}
                      className={`flex items-center space-x-2 p-2 rounded-md ${colorStyle.hoverBg} transition-colors`}
                    >
                      <RadioGroupItem value={code} id={`activity-${code}`} />
                      <Label
                        htmlFor={`activity-${code}`}
                        className="flex items-center cursor-pointer"
                      >
                        <span
                          className={`font-semibold text-sm mr-2 w-8 h-8 flex items-center justify-center rounded ${colorStyle.bg} ${colorStyle.text}`}
                        >
                          {code}
                        </span>
                        <span>{description}</span>
                      </Label>
                    </div>
                  );
                })}
                <div className="flex items-center space-x-2 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <RadioGroupItem value="" id="activity-none" />
                  <Label
                    htmlFor="activity-none"
                    className="flex items-center cursor-pointer"
                  >
                    <span className="font-semibold text-sm mr-2 w-8 h-8 flex items-center justify-center rounded bg-white dark:bg-slate-600 dark:text-white border">
                      —
                    </span>
                    <span>Нет активности</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <div className="pt-4 border-t mt-4">
            <div className="flex justify-center mb-4">
              <Button 
                variant={selectedActivity ? "default" : "secondary"}
                onClick={() => {
                  // Создаем строку из 7 одинаковых символов выбранной активности
                  // или пустой строки, если выбрано "Нет активности"
                  const activityValue = selectedActivity || "";
                  const fullWeekActivity = activityValue.repeat(7);
                  
                  // Сохраняем изменения, но НЕ закрываем диалог
                  onActivityChange(fullWeekActivity as ActivityType);
                }}
                className={`w-full ${
                  selectedActivity 
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground" 
                    : ""
                }`}
              >
                Применить ко всей неделе
              </Button>
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
