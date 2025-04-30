import React, { useEffect, useState, useRef, useCallback } from "react";
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
import { buildSummary } from "@/utils/buildSummary";

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

// Компонент редактирования учебного плана
function EditCurriculumPlanContent() {
  const { id } = useParams();
  const planId = id ? parseInt(id) : NaN;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState("title");
  const [calendarData, setCalendarData] = useState<Record<string, string>>({});
  // Счетчик обновлений для принудительного обновления SummaryTable
  const [calendarUpdateCount, setCalendarUpdateCount] = useState<number>(0);
  const calendarDataRef = useRef<Record<string, string>>({});
  
  // Получаем данные о учебном плане
  const { data: plan, isLoading, error } = useQuery<CurriculumPlan>({
    queryKey: [`/api/curriculum-plans/${planId}`],
    enabled: !isNaN(planId),
    refetchOnWindowFocus: false,
  });
  
  // Мутация для обновления учебного плана
  const updateMutation = useMutation({
    mutationFn: (updatedPlan: Partial<CurriculumFormValues> & { id: number, calendarData?: string }) => {
      const { id, ...planData } = updatedPlan;
      return apiRequest(`/api/curriculum-plans/${id}`, 'PUT', JSON.stringify(planData));
    },
    onSuccess: () => {
      toast({
        title: "Учебный план обновлен",
        description: "Изменения успешно сохранены",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/curriculum-plans/${planId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/curriculum-plans'] });
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
  useEffect(() => {
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
      
      // Инициализируем данные календаря из плана, если они есть
      if (plan.calendarData) {
        try {
          const parsedData = JSON.parse(plan.calendarData as string);
          setCalendarData(parsedData);
          calendarDataRef.current = parsedData;
        } catch (e) {
          console.error("Ошибка при парсинге данных календаря:", e);
          setCalendarData({});
          calendarDataRef.current = {};
        }
      }
    }
  }, [plan, form]);
  
  // Функция сохранения данных календаря
  const saveCalendarData = async () => {
    if (Object.keys(calendarDataRef.current).length === 0) {
      console.log("[EditCurriculumPlan] No calendar data to save");
      return false;
    }
    
    try {
      console.log("[EditCurriculumPlan] Saving calendar data:", calendarDataRef.current);
      
      // Создаем глубокую копию объекта перед преобразованием в строку
      const calendarDataCopy = JSON.parse(JSON.stringify(calendarDataRef.current));
      const calendarDataString = JSON.stringify(calendarDataCopy);
      
      // Используем POST-запрос к /api/curriculum/weeks, который, как мы видели, работает
      const response = await apiRequest(`/api/curriculum/weeks`, 'POST', JSON.stringify({
        planId: planId.toString(),
        calendarData: calendarDataCopy
      }));
      
      console.log("[EditCurriculumPlan] Save response:", response);
      
      if (response && response.success) {
        toast({
          title: "График обновлен",
          description: "Данные графика успешно сохранены",
        });
        
        // Обновляем кэш, чтобы получить актуальные данные при следующем запросе
        await queryClient.invalidateQueries({ queryKey: [`/api/curriculum-plans/${planId}`] });
        
        // Если у нас есть план, обновляем его кэш принудительно
        if (plan) {
          // Создаем обновленный план
          const updatedPlan = { 
            ...plan, 
            calendarData: calendarDataString 
          };
          
          // Обновляем данные в кэше
          queryClient.setQueryData([`/api/curriculum-plans/${planId}`], updatedPlan);
          
          console.log("[EditCurriculumPlan] Updated plan cache with new data:", updatedPlan);
        }
        
        // Увеличиваем счетчик обновлений, чтобы принудительно обновить SummaryTable
        setCalendarUpdateCount(prev => prev + 1);
        
        return true;
      } else {
        throw new Error("Save operation failed");
      }
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

  // Обработчик смены вкладок
  const handleTabChange = async (value: string) => {
    // Если мы уходим с вкладки "schedule", сохраняем данные календаря
    if (activeTab === "schedule" && value !== "schedule") {
      // Дожидаемся завершения сохранения
      await saveCalendarData();
      
      // После сохранения, перезагружаем данные плана с сервера
      await queryClient.invalidateQueries({ queryKey: [`/api/curriculum-plans/${planId}`] });
    }
    
    // Если мы переходим на вкладку графика, обновляем данные календаря
    if (value === "schedule") {
      if (plan && plan.calendarData) {
        try {
          // Пытаемся распарсить данные календаря из плана
          const parsedData = JSON.parse(plan.calendarData);
          console.log("[EditCurriculumPlan] Loading calendar data for schedule tab:", parsedData);
          
          // Обновляем данные в ссылке
          calendarDataRef.current = parsedData;
        } catch (e) {
          console.error("Ошибка при парсинге данных календаря:", e);
        }
      }
      
      // Обновляем таблицу после небольшой задержки
      setTimeout(() => {
        updateSummaryTable();
      }, 100);
    }
    
    setActiveTab(value);
  };
  
  // Обработчик отправки формы титульного листа
  const onSubmit = (data: CurriculumFormValues) => {
    updateMutation.mutate({ ...data, id: planId });
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
          disabled={updateMutation.isPending || !form.formState.isDirty}
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
                            defaultValue={field.value}
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
                            defaultValue={field.value}
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
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
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
                            />
                          </FormControl>
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
                      disabled={updateMutation.isPending || !form.formState.isDirty}
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
                          yearsOfStudy={plan.yearsOfStudy}
                          initialData={plan.calendarData ? JSON.parse(plan.calendarData as string) : {}}
                          planId={planId.toString()} // Явно указываем planId из родительского компонента
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
                            
                            // Немедленно выполняем сохранение, чтобы убедиться, что данные не потеряются
                            saveCalendarData();
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
                          yearsOfStudy={plan.yearsOfStudy}
                          updateCounter={calendarUpdateCount}
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </TabsContent>
            
            <TabsContent value="plan">
              <div className="bg-muted/30 rounded-lg p-8 text-center">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-medium mb-2">Учебный план</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-4">
                  Здесь будет располагаться интерактивная таблица дисциплин учебного плана с часами по семестрам.
                </p>
                <p className="text-sm text-muted-foreground">
                  Функционал в разработке
                </p>
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
  return <EditCurriculumPlanContent />;
}