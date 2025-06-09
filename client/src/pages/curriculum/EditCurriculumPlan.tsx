import React, { useEffect, useState, useRef, useCallback, ReactNode } from "react";

// Объявление типа для глобального объекта window
declare global {
  interface Window {
    _lastPlanData?: string;
  }
}
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Save, ArrowLeft, FileText, CalendarClock, BookOpen, BarChart, Table } from "lucide-react";
import GraphTab, { CalendarData } from "@/components/curriculum/GraphTab";
import { SummaryTable } from "@/components/curriculum/SummaryTable";
import { SummaryTab } from "@/components/curriculum/SummaryTab";
import { CurriculumPlanTable } from "@/components/curriculum/CurriculumPlanTable";
import { buildSummary } from "@/utils/buildSummary";
import { useCurriculum } from "@/lib/curriculumStore";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import type { CurriculumPlan } from "@shared/schema";
import { useI18n } from "@/hooks/use-i18n";

// Расширенная схема формы для титульного листа учебного плана
const curriculumFormSchema = z.object({
  specialtyName: z.string().min(2, "Название специальности должно содержать не менее 2 символов"),
  specialtyCode: z.string().min(5, "Код специальности должен содержать не менее 5 символов"),
  yearsOfStudy: z.number().min(1, "Длительность обучения должна быть не менее 1 года").max(10, "Длительность обучения должна быть не более 10 лет"),
  monthsOfStudy: z.number().min(0, "Количество месяцев не может быть отрицательным").max(11, "Количество месяцев должно быть не более 11").default(0),
  startYear: z.number().min(2000, "Год начала подготовки должен быть не ранее 2000").max(2100, "Год начала подготовки должен быть не позднее 2100").optional(),
  endYear: z.number().min(2000, "Год окончания подготовки должен быть не ранее 2000").max(2100, "Год окончания подготовки должен быть не позднее 2100").optional(),
  educationForm: z.string().optional(),
  educationLevel: z.enum(["СПО", "ВО", "Магистратура", "Аспирантура"], {
    required_error: "Выберите уровень образования",
  }),
  description: z.string().optional(),
  calendarData: z.string().optional(),
  curriculumPlanData: z.string().optional(),
});

// Тип для данных формы
type CurriculumFormValues = z.infer<typeof curriculumFormSchema>;

// Форматирование длительности обучения
function formatStudyDuration(years: number, months: number = 0): string {
  let result = "";

  if (years > 0) {
    result += `${years} ${years === 1 ? 'год' : (years < 5 ? 'года' : 'лет')}`;
  }

  if (months > 0) {
    if (result) result += " и ";
    result += `${months} ${months === 1 ? 'месяц' : (months < 5 ? 'месяца' : 'месяцев')}`;
  }

  return result || "0 лет";
}

// Функция расчета года окончания на основе года начала и длительности обучения
function calcEndYear(startYear: number, years: number, months: number = 0): number {
  // Если начало 1 сентября start_year
  const end = new Date(startYear, 8, 1); // 1 сентября startYear (месяцы с 0)

  // Добавляем годы
  end.setFullYear(end.getFullYear() + years);

  // Добавляем месяцы
  end.setMonth(end.getMonth() + months);

  // Возвращаем год окончания
  return end.getFullYear();
}

// Компонент редактирования учебного плана
function EditCurriculumPlanContent(): React.ReactNode {
  const { id } = useParams();
  const planId = id ? parseInt(id) : NaN;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const { setPlan } = useCurriculum();
  const [activeTab, setActiveTab] = useState("title");
  const [calendarData, setCalendarData] = useState<Record<string, string>>({});
  // Счетчик обновлений для принудительного обновления SummaryTable
  const [calendarUpdateCount, setCalendarUpdateCount] = useState<number>(0);
  // Флаг для отслеживания изменений в форме титульного листа
  const [isDirty, setIsDirty] = useState<boolean>(false);
  // Единый объект planForm для всех вкладок
  const [planForm, setPlanForm] = useState<CurriculumFormValues | null>(null);
  // Используем глобальное хранилище для yearsOfStudy и monthsOfStudy
  const {
    yearsOfStudy: planYearsOfStudy,
    setYearsOfStudy: setPlanYearsOfStudy,
    monthsOfStudy: planMonthsOfStudy,
    setMonthsOfStudy: setPlanMonthsOfStudy
  } = useCurriculum();
  // Ссылка на текущие данные календаря
  const calendarDataRef = useRef<Record<string, string>>({});
  // Таймеры для автосохранения и debounce
  const saveTimeoutRef = useRef<number | null>(null);
  // Флаг для паузы автосохранения во время ручного сохранения
  const [autosavePaused, setAutosavePaused] = useState<boolean>(false);

  // Состояние для отслеживания изменений в разных вкладках
  const [formIsDirty, setFormIsDirty] = useState<{
    info: boolean;
    plan: boolean;
    calendar: boolean;
    graph: boolean;
    summary: boolean;
  }>({
    info: false,
    plan: false,
    calendar: false,
    graph: false,
    summary: false
  });

  // Получаем данные о учебном плане
  const { data: plan, isLoading, error } = useQuery<CurriculumPlan>({
    queryKey: [`/api/curriculum-plans/${planId}`],
    enabled: !isNaN(planId),
    refetchOnWindowFocus: false,
  });

  // Мутация для обновления учебного плана (унифицированная версия)
  const updateMutation = useMutation({
    mutationFn: (updatedPlan: Partial<CurriculumFormValues> & {
      id: number,
      calendarData?: string,
      curriculumPlanData?: string,
      // Новые поля для унифицированного сохранения
      calendarJson?: string,
      planJson?: string
    }) => {
      const { id, ...planData } = updatedPlan;

      // Сохраняем текущие данные yearsOfStudy для синхронизации между компонентами
      if (planData.yearsOfStudy && planData.yearsOfStudy !== planYearsOfStudy) {
        console.log(`[updateMutation] Обновляем planYearsOfStudy: ${planYearsOfStudy} -> ${planData.yearsOfStudy}`);
        // Обновляем в следующем цикле рендеринга, чтобы избежать состояния гонки
        setTimeout(() => {
          setPlanYearsOfStudy(planData.yearsOfStudy as number);
        }, 0);
      }

      // Также обновляем месяцы обучения в глобальном хранилище
      if (planData.monthsOfStudy !== undefined && planData.monthsOfStudy !== planMonthsOfStudy) {
        console.log(`[updateMutation] Обновляем planMonthsOfStudy: ${planMonthsOfStudy} -> ${planData.monthsOfStudy}`);
        // Обновляем в следующем цикле рендеринга
        setTimeout(() => {
          setPlanMonthsOfStudy(planData.monthsOfStudy as number);
        }, 0);
      }

      // Явно убедимся, что образовательные параметры включены
      // Это критично для правильного сохранения и отображения после повторного открытия плана
      if (!planData.educationLevel && plan?.educationLevel) {
        planData.educationLevel = plan.educationLevel;
      }

      if (!planData.educationForm && plan?.educationForm) {
        planData.educationForm = plan.educationForm;
      }

      // Проверка и логирование унифицированного запроса
      if (planData.calendarJson || planData.planJson) {
        console.log('[updateMutation] Отправка унифицированных данных:', {
          formFieldsCount: Object.keys(planData).length,
          hasCalendarJson: !!planData.calendarJson,
          hasPlanJson: !!planData.planJson,
        });

        // Преобразуем новые поля в стандартные для бэкенда если они есть
        if (planData.calendarJson) {
          planData.calendarData = planData.calendarJson;
          delete planData.calendarJson;
        }

        if (planData.planJson) {
          planData.curriculumPlanData = planData.planJson;
          delete planData.planJson;
        }
      } else {
        // Стандартная обработка - включаем текущие данные календаря, если они есть
        if (!planData.calendarData && Object.keys(calendarDataRef.current).length > 0) {
          planData.calendarData = JSON.stringify(calendarDataRef.current);
        }

        console.log('[updateMutation] Отправка стандартных данных:', planData);
      }

      // Используем PATCH метод для унифицированного сохранения
      return apiRequest(`/api/curriculum-plans/${id}`, 'PATCH', JSON.stringify(planData));
    },
    onSuccess: (data) => {
      toast({
        title: "Учебный план обновлен",
        description: "Изменения успешно сохранены",
      });

      // Принудительно обновляем данные в кэше
      try {
        // Получаем текущие данные из кэша
        const currentData = queryClient.getQueryData<CurriculumPlan>([`/api/curriculum-plans/${planId}`]);

        // Если есть текущие данные и ответ от сервера, обновляем кэш вручную
        if (currentData && data) {
          // Объединяем полученные данные с существующими в кэше,
          // сохраняя при этом последнее состояние calendarData, curriculumPlanData и yearsOfStudy
          const updatedCache = {
            ...currentData,
            ...data,
            // Сохраняем актуальные данные календаря из памяти, если они есть
            calendarData: Object.keys(calendarDataRef.current).length > 0
              ? JSON.stringify(calendarDataRef.current)
              : data.calendarData || currentData.calendarData,
            // Если были обновлены данные учебного плана, используем их
            curriculumPlanData: data.curriculumPlanData || currentData.curriculumPlanData,
            // Используем актуальное значение лет обучения и месяцев
            yearsOfStudy: planYearsOfStudy,
            monthsOfStudy: planMonthsOfStudy
          };

          // Обновляем кэш напрямую, чтобы избежать дополнительных запросов
          queryClient.setQueryData([`/api/curriculum-plans/${planId}`], updatedCache);
          console.log('[updateMutation] Обновлен кэш с новыми данными:', updatedCache);
        } else {
          // Если нет данных в кэше, делаем полную перезагрузку
          queryClient.invalidateQueries({ queryKey: [`/api/curriculum-plans/${planId}`] });
        }
      } catch (e) {
        console.error('Ошибка при обновлении кэша:', e);
        // В случае ошибки, делаем полную перезагрузку данных
        queryClient.invalidateQueries({ queryKey: [`/api/curriculum-plans/${planId}`] });
      }

      // Также инвалидируем список планов
      queryClient.invalidateQueries({ queryKey: ['/api/curriculum-plans'] });

      // Обновляем счетчик для принудительного обновления всех компонентов
      setCalendarUpdateCount(prev => prev + 1);
    },
    onError: (error) => {
      console.error("Ошибка при обновлении учебного плана:", error);
      toast({
        title: "Ошибка сохранения",
        description: "Не удалось обновить учебный план. Пожалуйста, попробуйте снова.",
        variant: "destructive",
      });
    },
  });

  // Форма для редактирования учебного плана
  const form = useForm<CurriculumFormValues>({
    resolver: zodResolver(curriculumFormSchema),
    defaultValues: {
      specialtyName: "",
      specialtyCode: "",
      yearsOfStudy: 4,
      monthsOfStudy: 0,
      startYear: new Date().getFullYear(),
      endYear: new Date().getFullYear() + 4,
      educationForm: "Очная",
      educationLevel: "ВО",
      description: "",
    },
  });

  // Обновляем значения формы при получении данных о плане
  // Функция для объединенного сохранения всех данных учебного плана (форма + календарь + учебный план)
  const saveCurriculum = async () => {
    try {
      // Приостанавливаем автосохранение на время ручного сохранения
      setAutosavePaused(true);
      console.log("[saveCurriculum] Начало сохранения учебного плана");

      // Принудительно вызываем валидацию формы для обновления isDirty и ошибок
      await form.trigger();

      // Проверяем на ошибки валидации
      if (Object.keys(form.formState.errors).length > 0) {
        console.error("[saveCurriculum] Form has validation errors, cannot save:", form.formState.errors);
        toast({
          title: "Ошибка сохранения",
          description: "Пожалуйста, исправьте ошибки в форме перед сохранением",
          variant: "destructive",
        });
        return false;
      }

      const formData = form.getValues();

      // Сохраняем данные формы в общем объекте planForm
      setPlanForm(formData);

      // Получаем данные учебного плана из самых актуальных источников
      // 1. Сначала проверяем, есть ли данные в глобальной переменной (наиболее свежие)
      // 2. Затем смотрим кэш queryClient
      // 3. В крайнем случае берем из текущего плана

      let planDataStr: string = "";

      // Проверяем сначала глобальную переменную, затем кэш, затем текущие данные
      if (window._lastPlanData) {
        planDataStr = window._lastPlanData;
        console.log("[saveCurriculum] Using plan data from global variable:", planDataStr.length, "bytes");
      } else {
        // Получаем данные из кэша
        const currentPlan = queryClient.getQueryData<CurriculumPlan>([`/api/curriculum-plans/${planId}`]);

        if (currentPlan?.curriculumPlanData) {
          planDataStr = currentPlan.curriculumPlanData;
          console.log("[saveCurriculum] Using plan data from queryClient cache:", planDataStr.length, "bytes");
        } else if (plan?.curriculumPlanData) {
          planDataStr = plan.curriculumPlanData;
          console.log("[saveCurriculum] Using plan data from component state:", planDataStr.length, "bytes");
        } else {
          console.warn("[saveCurriculum] No plan data found in any source");
        }
      }

      // КРИТИЧЕСКИ ВАЖНО: Проверяем, что план не пустой и имеет корректную структуру
      if (planDataStr) {
        try {
          const parsedPlan = JSON.parse(planDataStr);
          console.log("[saveCurriculum] Plan data validation:", {
            hasSchemaVersion: !!parsedPlan.schemaVersion,
            hasPlanData: !!parsedPlan.planData,
            planDataLength: parsedPlan.planData?.length || 0
          });
        } catch (e) {
          console.error("[saveCurriculum] Error parsing plan data:", e);
        }
      }

      // Выводим в лог информацию о сохраняемых данных плана
      console.log(`[saveCurriculum] Curriculum plan data found: ${planDataStr.length} bytes`);

      // Подготавливаем данные календаря
      const calendarDataJson = JSON.stringify(calendarDataRef.current);

      // Подготавливаем данные для сохранения
      const dataToSave = {
        ...formData,
        id: planId,
        // Объединяем все данные в один PATCH запрос
        calendarJson: calendarDataJson,
        planJson: planDataStr,
        // Явно передаем curriculumPlanData как есть для обработки на сервере
        curriculumPlanData: planDataStr
      };

      console.log("[saveCurriculum] Sending data in unified PATCH request:", {
        formFields: Object.keys(formData).length,
        calendarFields: Object.keys(calendarDataRef.current).length,
        planDataLength: planDataStr.length
      });

      // Сохраняем все данные формы через единый PATCH запрос
      await updateMutation.mutateAsync(dataToSave);
      console.log("[saveCurriculum] Request to server completed successfully");

      // После успешного сохранения сбрасываем флаги dirty
      setIsDirty(false);
      setFormIsDirty({
        info: false,
        plan: false,
        calendar: false,
        graph: false,
        summary: false
      });

      // Возобновляем автосохранение с небольшой задержкой
      setTimeout(() => {
        setAutosavePaused(false);
        console.log("[saveCurriculum] Autosave re-enabled after manual save");
      }, 500);

      return true;
    } catch (error) {
      console.error("[saveCurriculum] Error while saving curriculum plan:", error);

      // Показываем toast с ошибкой
      toast({
        title: "Ошибка сохранения",
        description: "Не удалось сохранить учебный план. Пожалуйста, попробуйте снова.",
        variant: "destructive",
      });

      // Возобновляем автосохранение
      setTimeout(() => {
        setAutosavePaused(false);
        console.log("[saveCurriculum] Autosave re-enabled after error");
      }, 500);

      return false;
    }
  };

  // Функция для сохранения данных формы титульного листа (обертка над saveCurriculum)
  const savePlan = async () => {
    return await saveCurriculum();
  };

  // Эффект для отслеживания изменений в форме
  useEffect(() => {
    // Отслеживаем реальные изменения в форме по сравнению с исходными данными
    const subscription = form.watch(() => {
      // Проверяем, действительно ли форма изменилась по сравнению с исходными данными
      if (plan) {
        const currentValues = form.getValues();
        const hasRealChanges =
          currentValues.specialtyName !== plan.specialtyName ||
          currentValues.specialtyCode !== plan.specialtyCode ||
          currentValues.yearsOfStudy !== plan.yearsOfStudy ||
          currentValues.monthsOfStudy !== (plan.monthsOfStudy || 0) ||
          currentValues.startYear !== plan.startYear ||
          currentValues.educationForm !== plan.educationForm ||
          currentValues.educationLevel !== plan.educationLevel ||
          currentValues.description !== (plan.description || "");

        console.log("[EditCurriculumPlan] Form change detected, real changes:", hasRealChanges);
        setIsDirty(hasRealChanges);
      } else {
        // Если нет данных плана для сравнения, просто устанавливаем флаг
        setIsDirty(form.formState.isDirty);
      }
    });

    // Очищаем подписку при размонтировании
    return () => subscription.unsubscribe();
  }, [form, plan]);

  // Эффект для автоматического расчета года окончания
  useEffect(() => {
    // Получаем текущие значения из формы
    const startYear = form.watch('startYear');
    const years = form.watch('yearsOfStudy');
    const months = form.watch('monthsOfStudy');

    // Если есть год начала, рассчитываем год окончания
    if (startYear) {
      const result = calcEndYear(startYear, years, months);
      console.log(`[EndYearCalc] startYear=${startYear}, years=${years}, months=${months} => endYear=${result}`);
      form.setValue('endYear', result);
    }
  }, [form.watch('startYear'), form.watch('yearsOfStudy'), form.watch('monthsOfStudy')]);

  useEffect(() => {
    if (plan) {
      console.log("[EditCurriculumPlan] Обновление данных плана из API:", plan);

      // Обновляем значения формы
      form.reset({
        specialtyName: plan.specialtyName,
        specialtyCode: plan.specialtyCode,
        yearsOfStudy: plan.yearsOfStudy,
        monthsOfStudy: plan.monthsOfStudy || 0,
        startYear: plan.startYear || undefined,
        endYear: plan.endYear || undefined,
        educationForm: plan.educationForm || undefined,
        educationLevel: plan.educationLevel,
        description: plan.description || "",
        // Не включаем curriculumPlanData, т.к. это поле не нужно в форме
      });

      // Инициализируем данные календаря из плана, если они есть
      if (plan.calendarData) {
        try {
          const parsedData = JSON.parse(plan.calendarData as string);
          console.log("[EditCurriculumPlan] Обновление данных календаря:", parsedData);
          setCalendarData(parsedData);
          calendarDataRef.current = parsedData;

          // Форсируем обновление дочерних компонентов
          setCalendarUpdateCount(prev => prev + 1);
        } catch (e) {
          console.error("Ошибка при парсинге данных календаря:", e);
          setCalendarData({});
          calendarDataRef.current = {};
        }
      }

      // Инициализируем данные учебного плана из плана, если они есть
      if (plan.curriculumPlanData) {
        try {
          console.log("[EditCurriculumPlan] Данные учебного плана доступны:", plan.curriculumPlanData);
        } catch (e) {
          console.error("Ошибка при обработке данных учебного плана:", e);
        }
      }

      // Важно: проверяем, изменились ли даты при обновлении количества лет обучения
      if (plan.yearsOfStudy !== planYearsOfStudy) {
        console.log(`[EditCurriculumPlan] Количество лет обучения изменилось: ${planYearsOfStudy} -> ${plan.yearsOfStudy}`);

        // Устанавливаем новое значение
        setPlanYearsOfStudy(plan.yearsOfStudy);

        // Форсируем обновление дочерних компонентов
        setCalendarUpdateCount(prev => prev + 1);
      }

      // Аналогично для месяцев
      const planMonths = plan.monthsOfStudy || 0;
      if (planMonths !== planMonthsOfStudy) {
        console.log(`[EditCurriculumPlan] Количество месяцев изменилось: ${planMonthsOfStudy} -> ${planMonths}`);

        // Устанавливаем новое значение
        setPlanMonthsOfStudy(planMonths);

        // Форсируем обновление дочерних компонентов, если еще не форсировали
        if (plan.yearsOfStudy === planYearsOfStudy) {
          setCalendarUpdateCount(prev => prev + 1);
        }
      }
    }
  }, [plan, form, planYearsOfStudy]);

  // Функция сохранения данных календаря - теперь использует общую функцию saveCurriculum
  const saveCalendarData = async () => {
    if (Object.keys(calendarDataRef.current).length === 0) {
      console.log("[EditCurriculumPlan] No calendar data to save");
      return false;
    }

    try {
      console.log("[EditCurriculumPlan] Calendar data changed, saving through unified save function");

      // Устанавливаем флаг dirty для календаря
      setFormIsDirty(prev => ({
        ...prev,
        calendar: true
      }));

      // Используем общую функцию для сохранения всех данных
      const result = await saveCurriculum();

      if (result) {
        // Увеличиваем счетчик обновлений, чтобы принудительно обновить SummaryTable
        setCalendarUpdateCount(prev => prev + 1);

        toast({
          title: "График обновлен",
          description: "Данные графика успешно сохранены",
        });
      }

      return result;
    } catch (error) {
      console.error("Ошибка при сохранении графика:", error);
      toast({
        title: "Ошибка сохранения",
        description: "Не удалось сохранить график. Пожалуйста, попробуйте снова.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Функция для обновления таблицы итогов
  const updateSummaryTable = useCallback(() => {
    console.log("[EditCurriculumPlan] Updating summary table with data:", calendarDataRef.current);
    // Увеличиваем счетчик для принудительного обновления SummaryTable
    setCalendarUpdateCount(prev => prev + 1);
  }, []);

  // Эффект для обновления данных календаря при изменении плана
  useEffect(() => {
    if (plan && plan.calendarData) {
      try {
        // Пытаемся распарсить данные календаря из плана
        const parsedData = JSON.parse(plan.calendarData);
        console.log("[EditCurriculumPlan] Parsed calendar data from plan:", parsedData);

        // Обновляем данные в ссылке
        calendarDataRef.current = parsedData;

        // Форсируем обновление
        setCalendarUpdateCount(prev => prev + 1);
      } catch (e) {
        console.error("Ошибка при парсинге данных календаря:", e);
      }
    }
  }, [plan]);

  // Добавляем ref для отслеживания первого рендера и предыдущих значений
  const isFirstRenderRef = useRef(true);
  const prevYearsOfStudyRef = useRef<number | null>(null);
  const prevMonthsOfStudyRef = useRef<number | null>(null);

  // Создаем ref для таблицы учебного плана, чтобы иметь прямой доступ к её методам
  const curriculumTableRef = useRef<{ forceUpdate: () => void }>(null);

  // Эффект для сохранения данных при изменении yearsOfStudy
  useEffect(() => {
    // Пропускаем первый рендер
    if (isFirstRenderRef.current) {
      console.log("[EditCurriculumPlan] First render, initializing refs");
      isFirstRenderRef.current = false;
      if (plan) {
        prevYearsOfStudyRef.current = plan.yearsOfStudy;
        prevMonthsOfStudyRef.current = plan.monthsOfStudy || 0;
      }
      return;
    }

    // Проверяем, действительно ли изменилось значение по сравнению с предыдущим
    if (prevYearsOfStudyRef.current !== planYearsOfStudy && plan) {
      console.log(`[EditCurriculumPlan] yearsOfStudy changed: ${prevYearsOfStudyRef.current} -> ${planYearsOfStudy}`);

      // Обновляем данные формы
      form.setValue('yearsOfStudy', planYearsOfStudy);

      // Обновляем предыдущее значение
      prevYearsOfStudyRef.current = planYearsOfStudy;

      // Если есть данные календаря, сохраняем их с новым planYearsOfStudy
      if (Object.keys(calendarDataRef.current).length > 0) {
        console.log("[EditCurriculumPlan] Auto-saving calendar data after yearsOfStudy change");

        // Используем debounce вместо setTimeout для предотвращения множественных вызовов
        const timeoutId = setTimeout(() => {
          saveCalendarData();
        }, 500);

        // Очищаем таймаут при размонтировании компонента
        return () => clearTimeout(timeoutId);
      }
    }
  }, [planYearsOfStudy, plan, form]);

  // Аналогичный эффект для monthsOfStudy
  useEffect(() => {
    // Пропускаем первый рендер
    if (isFirstRenderRef.current) {
      return; // Уже инициализировали в предыдущем эффекте
    }

    // Проверяем, действительно ли изменилось значение по сравнению с предыдущим
    if (prevMonthsOfStudyRef.current !== planMonthsOfStudy && plan) {
      console.log(`[EditCurriculumPlan] monthsOfStudy changed: ${prevMonthsOfStudyRef.current} -> ${planMonthsOfStudy}`);

      // Обновляем данные формы
      form.setValue('monthsOfStudy', planMonthsOfStudy);

      // Обновляем предыдущее значение
      prevMonthsOfStudyRef.current = planMonthsOfStudy;

      // Если есть данные календаря, сохраняем их с новым planMonthsOfStudy
      if (Object.keys(calendarDataRef.current).length > 0) {
        console.log("[EditCurriculumPlan] Auto-saving calendar data after monthsOfStudy change");

        // Используем debounce вместо setTimeout для предотвращения множественных вызовов
        const timeoutId = setTimeout(() => {
          saveCalendarData();
        }, 500);

        // Очищаем таймаут при размонтировании компонента
        return () => clearTimeout(timeoutId);
      }
    }
  }, [planMonthsOfStudy, plan, form]);

  // Обработчик смены вкладок
  const handleTabChange = async (value: string) => {
    console.log(`[EditCurriculumPlan] Tab change: ${activeTab} -> ${value}`);

    // Предотвращаем бесполезные переключения на ту же вкладку
    if (activeTab === value) {
      console.log("[EditCurriculumPlan] Already on this tab, skipping...");
      return;
    }

    try {
      // Если мы уходим с вкладки "title", проверяем, есть ли несохраненные изменения
      if (activeTab === "title" && value !== "title") {
        console.log("[EditCurriculumPlan] Leaving title tab, checking for unsaved changes...");

        // Принудительно вызываем валидацию формы для обновления isDirty и ошибок
        await form.trigger();

        // Проверяем на ошибки валидации
        if (Object.keys(form.formState.errors).length > 0) {
          console.error("[EditCurriculumPlan] Form has validation errors, cannot save:", form.formState.errors);
          toast({
            title: "Ошибка сохранения",
            description: "Пожалуйста, исправьте ошибки в форме перед переключением вкладок",
            variant: "destructive",
          });
          return; // Не позволяем переключить вкладку, если есть ошибки
        }

        // Проверяем еще раз, есть ли несохраненные изменения по состоянию isDirty
        if (isDirty) {
          // Дополнительно проверяем, действительно ли есть реальные изменения
          const currentValues = form.getValues();
          const hasRealChanges = plan && (
            currentValues.specialtyName !== plan.specialtyName ||
            currentValues.specialtyCode !== plan.specialtyCode ||
            currentValues.yearsOfStudy !== plan.yearsOfStudy ||
            currentValues.monthsOfStudy !== (plan.monthsOfStudy || 0) ||
            currentValues.startYear !== plan.startYear ||
            currentValues.educationForm !== plan.educationForm ||
            currentValues.educationLevel !== plan.educationLevel ||
            currentValues.description !== (plan.description || "")
          );

          // Показываем диалог только если есть реальные изменения
          if (hasRealChanges) {
            const shouldSave = window.confirm("Сохранить изменения титульного листа?");

            if (shouldSave) {
              // Пользователь подтвердил сохранение
              console.log("[EditCurriculumPlan] User confirmed saving changes");
              const saveResult = await savePlan();
              if (!saveResult) {
                console.error("[EditCurriculumPlan] Failed to save form data");
                return; // Не переключаем вкладку, если сохранение не удалось
              }
            } else {
              // Пользователь отказался от сохранения, откатываем изменения в форме
              console.log("[EditCurriculumPlan] User declined saving changes, reverting form data");
              if (plan) {
                form.reset({
                  specialtyName: plan.specialtyName,
                  specialtyCode: plan.specialtyCode,
                  yearsOfStudy: plan.yearsOfStudy,
                  monthsOfStudy: plan.monthsOfStudy || 0,
                  startYear: plan.startYear || undefined,
                  endYear: plan.endYear || undefined,
                  educationForm: plan.educationForm || undefined,
                  educationLevel: plan.educationLevel,
                  description: plan.description || "",
                });

                // Сбрасываем флаг isDirty, так как мы отменили изменения
                setIsDirty(false);
              }
            }
          } else {
            // Хотя isDirty=true, но реальных изменений нет, сбрасываем флаг
            console.log("[EditCurriculumPlan] No real changes detected despite isDirty flag");
            setIsDirty(false);
          }
        }
      }

      // Если мы уходим с вкладки "schedule", сохраняем данные календаря
      if (activeTab === "schedule" && value !== activeTab) {
        console.log("[EditCurriculumPlan] Leaving schedule tab, saving calendar data...");
        // Дожидаемся завершения сохранения
        const saveResult = await saveCalendarData();
        console.log("[EditCurriculumPlan] Calendar save result:", saveResult);

        if (saveResult) {
          // После сохранения, перезагружаем данные плана с сервера
          console.log("[EditCurriculumPlan] Invalidating cache to refresh data...");
          await queryClient.invalidateQueries({ queryKey: [`/api/curriculum-plans/${planId}`] });
        }
      }

      // Если мы уходим с вкладки "plan", сохраняем данные учебного плана
      if (activeTab === "plan" && value !== activeTab) {
        console.log("[EditCurriculumPlan] Leaving plan tab, checking if plan data needs saving...", {
          formIsDirty,
          activeTab,
          newTab: value
        });

        // ВАЖНО: Перед проверкой на unsaved changes, отменяем любой отложенный таймер сохранения
        if (saveTimeoutRef.current) {
          console.log("[EditCurriculumPlan] Canceling pending save timer before tab change");
          clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = null;
        }

        // Проверяем, есть ли несохраненные изменения в учебном плане
        const planIsDirty = formIsDirty.plan;
        console.log("[EditCurriculumPlan] Plan dirty state:", planIsDirty);

        // КРИТИЧЕСКИ ВАЖНО: Проверяем наличие глобальных данных, которые могли быть созданы в CurriculumPlanTable
        if (typeof window !== 'undefined' && window._lastPlanData) {
          console.log("[EditCurriculumPlan] Found global plan data when leaving tab, length:", window._lastPlanData.length);
        } else {
          console.log("[EditCurriculumPlan] No global plan data found when leaving tab!");
        }

        // ВСЕГДА получаем и проверяем текущий план
        const currentPlan = queryClient.getQueryData<CurriculumPlan>([`/api/curriculum-plans/${planId}`]);
        console.log("[EditCurriculumPlan] Current plan data length:", currentPlan?.curriculumPlanData?.length || 0);

        // Принудительно сохраняем данные при переключении вкладки
        try {
          console.log("[EditCurriculumPlan] Plan data being saved FORCEFULLY when leaving tab");

          // ОЧЕНЬ ВАЖНО: Форсируем событие изменения плана из CurriculumPlanTable
          // Это гарантирует, что самые последние изменения будут сохранены
          if (curriculumTableRef.current && typeof curriculumTableRef.current.forceUpdate === "function") {
            console.log("[EditCurriculumPlan] Forcing update on curriculum table before saving");
            curriculumTableRef.current.forceUpdate();

            // Даем время на обновление данных
            await new Promise(resolve => setTimeout(resolve, 300));
          }

          // Сохраняем данные через унифицированную функцию
          const saveResult = await saveCurriculum();
          console.log("[EditCurriculumPlan] Plan data save result:", saveResult);

          if (!saveResult) {
            console.warn("[EditCurriculumPlan] Failed to save plan data when leaving tab");

            // Спрашиваем пользователя, хочет ли он продолжить без сохранения
            const shouldProceed = window.confirm(
              "Не удалось сохранить изменения в учебном плане. Хотите продолжить без сохранения?"
            );

            if (!shouldProceed) {
              return; // Не переключаем вкладку, если пользователь отказался продолжать
            }
          }
        } catch (error) {
          console.error("[EditCurriculumPlan] ERROR saving data when leaving tab:", error);

          const shouldProceed = window.confirm(
            "Произошла ошибка при сохранении данных учебного плана. Хотите продолжить без сохранения?"
          );

          if (!shouldProceed) {
            return; // Не переключаем вкладку при отказе
          }
        }
      }

      // Перезагружаем данные из сервера перед переключением на любую вкладку
      // Это гарантирует, что у нас всегда свежие данные
      await queryClient.invalidateQueries({ queryKey: [`/api/curriculum-plans/${planId}`] });

      // Специфичная обработка для каждой вкладки при переходе на неё
      if (value === "schedule") {
        console.log("[EditCurriculumPlan] Switching to schedule tab...");

        // Обновляем календарные данные из плана
        if (plan && plan.calendarData) {
          try {
            // Пытаемся распарсить данные календаря из плана
            const parsedData = JSON.parse(plan.calendarData);
            console.log("[EditCurriculumPlan] Loaded calendar data:", parsedData);

            // Создаем глубокую копию данных
            const newData = JSON.parse(JSON.stringify(parsedData));

            // Обновляем данные в ссылке и состоянии
            calendarDataRef.current = newData;
            setCalendarData(newData);

            // Устанавливаем паузу автосохранения при переключении на вкладку графика
            // чтобы избежать немедленного тригера автосохранения при загрузке данных
            setAutosavePaused(true);

            // Форсируем обновление дочерних компонентов
            setCalendarUpdateCount(prev => prev + 1);

            // Снимаем паузу через 3 секунды, чтобы компоненты успели отрендериться
            setTimeout(() => {
              setAutosavePaused(false);
              console.log("[EditCurriculumPlan] Auto-save re-enabled after schedule tab switch");
            }, 3000);
          } catch (e) {
            console.error("Ошибка при парсинге данных календаря:", e);
          }
        }
      } else if (value === "summary") {
        console.log("[EditCurriculumPlan] Switching to summary tab, refreshing data...");

        // Проверяем, есть ли актуальные данные и соответствует ли количество лет обучения текущему значению
        const planMonths = plan?.monthsOfStudy || 0;
        if (plan && (plan.yearsOfStudy !== planYearsOfStudy || planMonths !== planMonthsOfStudy)) {
          console.log(`[EditCurriculumPlan] Study duration mismatch before summary tab: plan=[${plan.yearsOfStudy}y, ${planMonths}m], current=[${planYearsOfStudy}y, ${planMonthsOfStudy}m]`);

          // Сначала пробуем сохранить актуальные данные
          if (Object.keys(calendarDataRef.current).length > 0) {
            console.log("[EditCurriculumPlan] Auto-saving before switching to summary tab");
            await saveCalendarData();
          }
        }

        // Обновляем счетчик для обновления таблицы итогов
        setCalendarUpdateCount(prev => prev + 1);
      }

      // После выполнения всей логики переключения, меняем активную вкладку
      setActiveTab(value);
    } catch (error) {
      console.error("[EditCurriculumPlan] Error during tab change:", error);
      toast({
        title: "Ошибка",
        description: "Произошла ошибка при переключении вкладок. Пожалуйста, попробуйте снова.",
        variant: "destructive",
      });
    }
  };

  // Обработчик отправки формы титульного листа
  const onSubmit = async (data: CurriculumFormValues) => {
    console.log('[EditCurriculumPlan] Submitting form data:', data);

    try {
      // Приостанавливаем автосохранение на время ручного сохранения
      setAutosavePaused(true);
      console.log("[EditCurriculumPlan] Auto-save paused for manual form save");

      // ВАЖНО: Форсируем обновление данных из таблицы перед сохранением
      // Это обеспечивает синхронизацию последних изменений в CurriculumPlanTable
      if (curriculumTableRef.current && typeof curriculumTableRef.current.forceUpdate === "function") {
        console.log("[EditCurriculumPlan] Forcing update on curriculum table before saving");
        curriculumTableRef.current.forceUpdate();

        // Даем время на обновление данных
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Если количество лет обучения изменилось, обновляем локальное состояние
      if (data.yearsOfStudy !== planYearsOfStudy) {
        console.log(`[EditCurriculumPlan] yearsOfStudy changed in form submit: ${planYearsOfStudy} -> ${data.yearsOfStudy}`);
        // Обновляем локальное состояние
        setPlanYearsOfStudy(data.yearsOfStudy);
      }

      // Аналогично для количества месяцев обучения
      if (data.monthsOfStudy !== planMonthsOfStudy) {
        console.log(`[EditCurriculumPlan] monthsOfStudy changed in form submit: ${planMonthsOfStudy} -> ${data.monthsOfStudy}`);
        // Обновляем локальное состояние
        setPlanMonthsOfStudy(data.monthsOfStudy);
      }

      // Важно: убедимся, что educationLevel и educationForm явно включены 
      // в данные, отправляемые на сервер
      const formDataToSave = {
        ...data,
        id: planId,
        // Явно включаем образовательные параметры, чтобы гарантировать их отправку
        educationLevel: data.educationLevel,
        educationForm: data.educationForm,
        // Включаем текущие данные календаря, если они есть
        calendarData: Object.keys(calendarDataRef.current).length > 0
          ? JSON.stringify(calendarDataRef.current)
          : undefined
      };

      console.log('[EditCurriculumPlan] Sending data to update mutation:', formDataToSave);

      // Отправляем запрос на сохранение и ждем результата
      const result = await updateMutation.mutateAsync(formDataToSave);

      // Обновляем данные во всех кэшах для синхронизации между компонентами
      await queryClient.invalidateQueries({ queryKey: [`/api/curriculum-plans/${planId}`] });
      await queryClient.invalidateQueries({ queryKey: ['/api/curriculum-plans'] });

      // Обновляем кэш напрямую с новыми данными
      if (plan) {
        const updatedPlan = {
          ...plan,
          ...data,
          // Явно включаем образовательные параметры в обновленный план
          educationLevel: data.educationLevel,
          educationForm: data.educationForm,
          calendarData: Object.keys(calendarDataRef.current).length > 0
            ? JSON.stringify(calendarDataRef.current)
            : plan.calendarData,
          yearsOfStudy: data.yearsOfStudy,
          monthsOfStudy: data.monthsOfStudy
        };

        queryClient.setQueryData([`/api/curriculum-plans/${planId}`], updatedPlan);
        console.log('[EditCurriculumPlan] Updated plan cache after manual save:', updatedPlan);

        // Обновляем данные в общем кэше планов
        const plansCache = queryClient.getQueryData<CurriculumPlan[]>(['/api/curriculum-plans']);
        if (plansCache) {
          const updatedPlans = plansCache.map(p => p.id === planId ? updatedPlan : p);
          queryClient.setQueryData(['/api/curriculum-plans'], updatedPlans);
          console.log("[EditCurriculumPlan] Updated plans list cache with new data");
        }
      }

      // Сбрасываем состояние "грязной" формы, указывая что изменения сохранены
      form.reset(data);

      // Увеличиваем счетчик для принудительного обновления всех компонентов
      setCalendarUpdateCount(prev => prev + 1);

      // Сообщаем об успехе, если сообщение не было показано внутри мутации
      if (!updateMutation.isSuccess) {
        toast({
          title: "Сохранено",
          description: "Данные формы успешно сохранены",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('[EditCurriculumPlan] Error saving form data:', error);
      // Ошибка обрабатывается внутри мутации, дополнительно ничего не делаем
    } finally {
      // Возобновляем автосохранение после завершения ручного сохранения с увеличенной задержкой
      setTimeout(() => {
        setAutosavePaused(false);
        console.log("[EditCurriculumPlan] Auto-save resumed after manual form save");
      }, 3000); // Увеличенная задержка (3 секунды) для предотвращения немедленного возобновления автосохранения
    }
  };

  // Возвращаемся к списку учебных планов
  const handleCancel = () => {
    navigate("/curriculum-plans");
  };

  if (isNaN(planId)) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Ошибка</AlertTitle>
        <AlertDescription>
          Неверный идентификатор учебного плана. Пожалуйста, вернитесь к списку планов.
        </AlertDescription>
        <Button onClick={() => navigate("/curriculum-plans")} variant="outline" className="mt-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Вернуться к списку
        </Button>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Ошибка загрузки</AlertTitle>
        <AlertDescription>
          Не удалось загрузить данные учебного плана. Пожалуйста, попробуйте снова.
        </AlertDescription>
        <Button onClick={() => navigate("/curriculum-plans")} variant="outline" className="mt-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Вернуться к списку
        </Button>
      </Alert>
    );
  }

  if (!plan) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>План не найден</AlertTitle>
        <AlertDescription>
          Учебный план с указанным идентификатором не найден. Проверьте правильность URL.
        </AlertDescription>
        <Button onClick={() => navigate("/curriculum-plans")} variant="outline" className="mt-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Вернуться к списку
        </Button>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto py-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button variant="outline" size="icon" onClick={handleCancel} className="mr-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Редактирование учебного плана</h1>
        </div>
        <Button
          onClick={form.handleSubmit(onSubmit)}
          disabled={updateMutation.isPending}
        >
          <Save className="mr-2 h-4 w-4" />
          Сохранить изменения
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{plan.specialtyName}</CardTitle>
          <CardDescription>
            {plan.specialtyCode} • {plan.educationLevel} •
            {formatStudyDuration(plan.yearsOfStudy, plan.monthsOfStudy || 0)}
            {plan.educationForm && ` • ${plan.educationForm}`}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="mb-4 grid w-full grid-cols-3">
              <TabsTrigger value="title" className="flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Титульный лист
              </TabsTrigger>
              <TabsTrigger value="schedule" className="flex items-center">
                <CalendarClock className="h-4 w-4 mr-2" />
                График реализации
              </TabsTrigger>
              <TabsTrigger value="plan" className="flex items-center">
                <BookOpen className="h-4 w-4 mr-2" />
                Учебный план
              </TabsTrigger>
            </TabsList>

            <TabsContent value="title">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="specialtyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Название учебного плана / специальности</FormLabel>
                          <FormControl>
                            <Input placeholder="Например: Информатика и вычислительная техника" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="specialtyCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Код специальности</FormLabel>
                          <FormControl>
                            <Input placeholder="Например: 09.03.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="educationLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Уровень образования</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите уровень" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="СПО">СПО</SelectItem>
                              <SelectItem value="ВО">ВО</SelectItem>
                              <SelectItem value="Магистратура">Магистратура</SelectItem>
                              <SelectItem value="Аспирантура">Аспирантура</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="educationForm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Форма обучения</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите форму обучения" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Очная">Очная</SelectItem>
                              <SelectItem value="Заочная">Заочная</SelectItem>
                              <SelectItem value="Очно-заочная">Очно-заочная</SelectItem>
                              <SelectItem value="Дистанционная">Дистанционная</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <FormField
                      control={form.control}
                      name="yearsOfStudy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Срок обучения (лет)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={10}
                              {...field}
                              onChange={(e) => {
                                // Применяем значение к полю формы
                                const value = parseInt(e.target.value) || 1; // Гарантируем минимум 1 год
                                field.onChange(value);

                                // ВАЖНО: Не обновляем planYearsOfStudy здесь напрямую
                                // Это будет обрабатываться в обработчике submit формы или handleTabChange
                                console.log(`[EditCurriculumPlan] yearsOfStudy input changed to: ${value}, but not updating planYearsOfStudy yet`);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="monthsOfStudy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Срок обучения (месяцев)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              max={11}
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormDescription>
                            Дополнительно к годам
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="startYear"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Год начала подготовки</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={2000}
                              max={2100}
                              placeholder="ГГГГ"
                              {...field}
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endYear"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Год окончания</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={2000}
                              max={2100}
                              placeholder="ГГГГ"
                              {...field}
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              readOnly={true} // Делаем поле только для чтения
                              className="bg-slate-50 dark:bg-slate-900 cursor-not-allowed" // Стили для Read-only поля
                            />
                          </FormControl>
                          <FormDescription>
                            Рассчитывается автоматически на основе года начала и срока обучения
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Описание</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Краткое описание учебного плана"
                            className="resize-none h-32"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="outline" type="button" onClick={handleCancel}>
                      Отмена
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? "Сохранение..." : "Сохранить"}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="schedule">
              <div className="space-y-6">
                {/* Вложенные табы для раздела "График учебного процесса" */}
                <Tabs defaultValue="chart" className="w-full" onValueChange={(value) => {
                  // Если переключаемся на вкладку "Итоги", сначала сохраняем данные графика, затем обновляем итоги
                  if (value === "summary") {
                    // Принудительно сохраняем
                    saveCalendarData();
                    // Обновляем таблицу итогов
                    setTimeout(() => {
                      updateSummaryTable();
                    }, 100);
                  }
                }}>
                  <div className="border-b mb-4">
                    <TabsList className="w-full justify-start h-10 bg-transparent p-0">
                      <TabsTrigger
                        value="chart"
                        className="data-[state=active]:bg-background rounded-none border-b-2 border-b-transparent data-[state=active]:border-b-primary py-2 px-4"
                      >
                        <Table className="h-4 w-4 mr-2" />
                        График
                      </TabsTrigger>
                      <TabsTrigger
                        value="summary"
                        className="data-[state=active]:bg-background rounded-none border-b-2 border-b-transparent data-[state=active]:border-b-primary py-2 px-4"
                      >
                        <BarChart className="h-4 w-4 mr-2" />
                        Итоги
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="chart" className="mt-4">
                    <div className="bg-muted/20 p-6 rounded-lg">
                      <h3 className="text-lg font-medium mb-4">График учебного процесса по неделям</h3>
                      <div className="bg-card rounded-md p-4">
                        <GraphTab
                          planYear={plan.startYear || new Date().getFullYear()}
                          yearsOfStudy={planYearsOfStudy} // Используем локальное состояние вместо значения из плана
                          initialData={plan.calendarData ? JSON.parse(plan.calendarData as string) : {}}
                          planId={planId.toString()} // Явно указываем planId из родительского компонента
                          autosavePaused={autosavePaused} // Передаем флаг паузы автосохранения
                          onChange={(data) => {
                            console.log("[EditCurriculumPlan] Calendar data updated:", data);

                            // Создаем глубокую копию данных для защиты от мутаций
                            const dataCopy = JSON.parse(JSON.stringify(data));

                            // Обновляем локальное состояние
                            setCalendarData(dataCopy);

                            // Обновляем ссылку для отслеживания актуальных данных
                            calendarDataRef.current = dataCopy;

                            // Обновляем счетчик для принудительного обновления SummaryTable
                            setCalendarUpdateCount(prev => prev + 1);

                            // Устанавливаем паузу для автосохранения перед запуском ручного сохранения
                            setAutosavePaused(true);

                            // Выполняем сохранение с небольшой задержкой, чтобы состояние успело обновиться
                            setTimeout(async () => {
                              try {
                                // Сохраняем данные
                                await saveCalendarData();

                                // После успешного сохранения - обновляем данные во всех компонентах
                                if (plan) {
                                  const updatedPlanData = {
                                    ...plan,
                                    calendarData: JSON.stringify(dataCopy),
                                    yearsOfStudy: planYearsOfStudy
                                  };

                                  // Обновляем кэши для всех компонентов
                                  queryClient.setQueryData([`/api/curriculum-plans/${planId}`], updatedPlanData);

                                  // Обновляем список планов
                                  const plansCache = queryClient.getQueryData<CurriculumPlan[]>(['/api/curriculum-plans']);
                                  if (plansCache) {
                                    const updatedPlans = plansCache.map(p =>
                                      p.id === planId ? updatedPlanData : p);
                                    queryClient.setQueryData(['/api/curriculum-plans'], updatedPlans);
                                  }
                                }
                              } finally {
                                // Возобновляем автосохранение после завершения ручного
                                setTimeout(() => {
                                  setAutosavePaused(false);
                                }, 500);
                              }
                            }, 100);
                          }}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="summary" className="mt-4">
                    <div className="bg-muted/20 p-6 rounded-lg">
                      <h3 className="text-lg font-medium mb-4">Сводная таблица нагрузки</h3>
                      <div className="border p-4 rounded-md bg-card overflow-x-auto">
                        <SummaryTab
                          calendarData={calendarDataRef.current}
                          yearsOfStudy={planYearsOfStudy} // Используем локальное состояние для синхронизации между компонентами
                          updateCounter={calendarUpdateCount}
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </TabsContent>

            <TabsContent value="plan">
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-medium">Учебный план</h3>
                </div>

                <CurriculumPlanTable
                  ref={curriculumTableRef}
                  courses={planYearsOfStudy}
                  extraMonths={planMonthsOfStudy}
                  initialData={plan?.curriculumPlanData ? JSON.parse(plan.curriculumPlanData) : undefined}
                  onPlanChange={(planData) => {
                    // Сохраняем данные через единую функцию saveCurriculum
                    if (planId && !isNaN(planId)) {
                      console.log("[EditCurriculumPlan] Plan data changed, setting dirty state", {
                        nodesCount: planData.length,
                        firstNode: planData[0]?.title || 'unknown'
                      });

                      // Создаем четкую, структурированную копию данных для JSON
                      const dataForSaving = {
                        schemaVersion: 1,
                        planData: planData,
                        timestamp: Date.now() // Добавляем временную метку для трассировки версий
                      };

                      // Сериализуем данные в JSON
                      const planDataJson = JSON.stringify(dataForSaving);
                      setPlan(planDataJson);

                      console.log(`[EditCurriculumPlan] Serialized plan data: ${planDataJson.length} bytes`);

                      // Обновляем план с новыми данными через queryClient
                      if (plan) {
                        // Создаем новый объект плана с обновленными данными
                        const updatedPlan = {
                          ...plan,
                          curriculumPlanData: planDataJson
                        };

                        // ОЧЕНЬ ВАЖНО: сохраняем эти данные в глобальном контексте
                        if (window._lastPlanData !== planDataJson) {
                          window._lastPlanData = planDataJson;
                          console.log("[EditCurriculumPlan] Updated global reference to plan data");
                        }

                        // Обновляем кэш queryClient напрямую - это гарантирует реактивность
                        queryClient.setQueryData([`/api/curriculum-plans/${planId}`], updatedPlan);
                        console.log("[EditCurriculumPlan] Updated plan data in queryClient cache");

                        // Также обновляем общий кэш со списком планов для согласованности
                        const plansCache = queryClient.getQueryData<CurriculumPlan[]>(['/api/curriculum-plans']);
                        if (plansCache) {
                          const updatedPlans = plansCache.map(p => p.id === planId ? updatedPlan : p);
                          queryClient.setQueryData(['/api/curriculum-plans'], updatedPlans);
                          console.log("[EditCurriculumPlan] Updated plans list cache");
                        }
                      }

                      // Устанавливаем флаг dirty для плана
                      setFormIsDirty(prev => ({
                        ...prev,
                        plan: true
                      }));

                      // Отменяем предыдущий таймер, если он есть
                      if (saveTimeoutRef.current) {
                        clearTimeout(saveTimeoutRef.current);
                        saveTimeoutRef.current = null;
                        console.log("[EditCurriculumPlan] Cleared previous save timer");
                      }

                      // Используем debounce для вызова saveCurriculum и сохраняем ID таймера
                      saveTimeoutRef.current = window.setTimeout(async () => {
                        console.log("[EditCurriculumPlan] Timer elapsed, saving plan data to server");
                        const saveSuccessful = await saveCurriculum();
                        console.log("[EditCurriculumPlan] Plan data save result:", saveSuccessful);
                        saveTimeoutRef.current = null;
                      }, 1000);
                    }
                  }}
                  onDirtyChange={(isDirty) => {
                    // Устанавливаем состояние наличия изменений для родительского компонента
                    setFormIsDirty(prevState => ({
                      ...prevState,
                      plan: isDirty
                    }));
                  }}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// Экспортируем непосредственно компонент, так как маршрутизация уже защищена через ProtectedRoute
export default function EditCurriculumPlan() {
  // Используем JSX для возврата содержимого компонента
  return <EditCurriculumPlanContent />;
}