import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Edit, Trash2, Book, Clipboard, ClipboardCheck, ArrowUpDown } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import type { CurriculumPlan } from "@shared/schema";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";

// Схема формы для создания/редактирования учебного плана
const curriculumFormSchema = z.object({
  specialtyName: z.string().min(2, "Название специальности должно содержать не менее 2 символов"),
  specialtyCode: z.string().min(5, "Код специальности должен содержать не менее 5 символов"),
  yearsOfStudy: z.number().min(1, "Длительность обучения должна быть не менее 1 года").max(10, "Длительность обучения должна быть не более 10 лет"),
  educationLevel: z.enum(["СПО", "ВО", "Магистратура", "Аспирантура"], {
    required_error: "Выберите уровень образования",
  }),
  description: z.string().optional(),
});

// Тип формы
type CurriculumFormValues = z.infer<typeof curriculumFormSchema>;

export default function CurriculumPlans() {
  const { t } = useI18n();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<CurriculumPlan | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");

  // Получаем данные о учебных планах
  const { data: curriculumPlans = [], isLoading, error } = useQuery<CurriculumPlan[]>({
    queryKey: ['/api/curriculum-plans'],
    refetchOnWindowFocus: false,
  });

  // Фильтрация учебных планов по уровню образования
  const filteredPlans = activeTab === "all"
    ? curriculumPlans
    : curriculumPlans.filter((plan) => plan.educationLevel === activeTab);

  // Мутация для создания нового учебного плана
  const createMutation = useMutation({
    mutationFn: (newPlan: CurriculumFormValues) =>
      apiRequest('/api/curriculum-plans', 'POST', JSON.stringify(newPlan)),
    onSuccess: () => {
      toast({
        title: "Учебный план создан",
        description: "Новый учебный план успешно добавлен",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/curriculum-plans'] });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      console.error("Ошибка при создании учебного плана:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать учебный план. Пожалуйста, попробуйте снова.",
        variant: "destructive",
      });
    },
  });

  // Мутация для обновления учебного плана
  const updateMutation = useMutation({
    mutationFn: (updatedPlan: Partial<CurriculumFormValues> & { id: number }) => {
      const { id, ...planData } = updatedPlan;
      return apiRequest(`/api/curriculum-plans/${id}`, 'PUT', JSON.stringify(planData));
    },
    onSuccess: () => {
      toast({
        title: "Учебный план обновлен",
        description: "Учебный план успешно обновлен",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/curriculum-plans'] });
      setIsEditDialogOpen(false);
      editForm.reset();
    },
    onError: (error) => {
      console.error("Ошибка при обновлении учебного плана:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить учебный план. Пожалуйста, попробуйте снова.",
        variant: "destructive",
      });
    },
  });

  // Мутация для удаления учебного плана
  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/curriculum-plans/${id}`, 'DELETE'),
    onSuccess: () => {
      toast({
        title: "Учебный план удален",
        description: "Учебный план успешно удален",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/curriculum-plans'] });
      setIsDeleteDialogOpen(false);
      setCurrentPlan(null);
    },
    onError: (error) => {
      console.error("Ошибка при удалении учебного плана:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить учебный план. Пожалуйста, попробуйте снова.",
        variant: "destructive",
      });
    },
  });

  // Форма для создания нового учебного плана
  const form = useForm<CurriculumFormValues>({
    resolver: zodResolver(curriculumFormSchema),
    defaultValues: {
      specialtyName: "",
      specialtyCode: "",
      yearsOfStudy: 4,
      educationLevel: "ВО",
      description: "",
    },
  });

  // Форма для редактирования учебного плана
  const editForm = useForm<CurriculumFormValues>({
    resolver: zodResolver(curriculumFormSchema),
    defaultValues: {
      specialtyName: "",
      specialtyCode: "",
      yearsOfStudy: 4,
      educationLevel: "ВО",
      description: "",
    },
  });

  // Открыть диалог редактирования и заполнить форму данными выбранного плана
  const handleEdit = (plan: CurriculumPlan) => {
    setCurrentPlan(plan);
    editForm.reset({
      specialtyName: plan.specialtyName,
      specialtyCode: plan.specialtyCode,
      yearsOfStudy: plan.yearsOfStudy,
      educationLevel: plan.educationLevel,
      description: plan.description || "",
    });
    setIsEditDialogOpen(true);
  };

  // Открыть диалог удаления для выбранного плана
  const handleDeleteClick = (plan: CurriculumPlan) => {
    setCurrentPlan(plan);
    setIsDeleteDialogOpen(true);
  };

  // Функция для определения цвета бейджа уровня образования
  const getEducationLevelColor = (level: string) => {
    switch (level) {
      case "СПО":
        return "bg-blue-500";
      case "ВО":
        return "bg-green-500";
      case "Магистратура":
        return "bg-purple-500";
      case "Аспирантура":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };

  // Обработчик отправки формы создания
  const onSubmit = (data: CurriculumFormValues) => {
    createMutation.mutate(data);
  };

  // Обработчик отправки формы редактирования
  const onEditSubmit = (data: CurriculumFormValues) => {
    if (!currentPlan) return;
    updateMutation.mutate({ ...data, id: currentPlan.id });
  };

  // Обработчик удаления
  const handleConfirmDelete = () => {
    if (!currentPlan) return;
    deleteMutation.mutate(currentPlan.id);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Загрузка учебных планов...</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Ошибка загрузки учебных планов. Пожалуйста, попробуйте обновить страницу.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto py-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Учебные планы</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Новый учебный план
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="all">Все</TabsTrigger>
          <TabsTrigger value="СПО">СПО</TabsTrigger>
          <TabsTrigger value="ВО">ВО</TabsTrigger>
          <TabsTrigger value="Магистратура">Магистратура</TabsTrigger>
          <TabsTrigger value="Аспирантура">Аспирантура</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredPlans.length === 0 ? (
            <div className="text-center py-12 bg-muted/50 rounded-lg">
              <ClipboardCheck className="mx-auto h-12 w-12 mb-4 text-muted-foreground" />
              <h3 className="text-xl font-medium">Нет учебных планов</h3>
              <p className="text-muted-foreground mt-2">
                {activeTab === "all"
                  ? "В системе пока нет учебных планов. Создайте новый план, нажав кнопку выше."
                  : `Нет учебных планов для уровня "${activeTab}". Выберите другой уровень или создайте новый план.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPlans.map((plan: CurriculumPlan) => (
                <Card key={plan.id} className="overflow-hidden relative group hover:shadow-sm transition-shadow duration-150">
                  {/* Кликабельная область карточки, кроме footer с кнопками */}
                  <div
                    className="cursor-pointer group-hover:bg-slate-100 dark:group-hover:bg-white/5 transition-colors duration-150"
                    onClick={() => navigate(`/curriculum-plans/${plan.id}/edit`)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <Badge className={`${getEducationLevelColor(plan.educationLevel)}`}>
                          {plan.educationLevel}
                        </Badge>
                        <span className="text-muted-foreground text-sm">{plan.specialtyCode}</span>
                      </div>
                      <CardTitle className="line-clamp-2 text-lg mt-2">{plan.specialtyName}</CardTitle>
                      <CardDescription className="line-clamp-3">
                        {plan.description || "Нет описания"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Book className="h-4 w-4 mr-1" />
                          <span>{plan.yearsOfStudy} {plan.yearsOfStudy === 1 ? "год" :
                            plan.yearsOfStudy < 5 ? "года" : "лет"}</span>
                        </div>
                        <div>
                          Создан: {plan.createdAt ? new Date(plan.createdAt).toLocaleDateString() : '-'}
                        </div>
                      </div>
                    </CardContent>
                    <Separator />
                  </div>
                  {/* Некликабельный footer с кнопками */}
                  <CardFooter className="pt-4 flex justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation(); // Предотвращаем всплытие события
                        navigate(`/curriculum-plans/${plan.id}/edit`);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Редактировать
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation(); // Предотвращаем всплытие события
                        handleDeleteClick(plan);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Удалить
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Диалог создания нового учебного плана */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Новый учебный план</DialogTitle>
            <DialogDescription>
              Заполните форму для создания нового учебного плана.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="specialtyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название специальности</FormLabel>
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
              <div className="grid grid-cols-2 gap-4">
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
                        className="resize-none h-20"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsCreateDialogOpen(false)}>
                  Отмена
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Создание..." : "Создать план"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Диалог редактирования учебного плана */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Редактирование учебного плана</DialogTitle>
            <DialogDescription>
              Измените данные учебного плана.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="specialtyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название специальности</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="specialtyCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Код специальности</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
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
                  control={editForm.control}
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
              </div>
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Описание</FormLabel>
                    <FormControl>
                      <Textarea
                        className="resize-none h-20"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsEditDialogOpen(false)}>
                  Отмена
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Сохранение..." : "Сохранить изменения"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Диалог подтверждения удаления */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Удаление учебного плана</DialogTitle>
            <DialogDescription>
              Вы действительно хотите удалить учебный план "{currentPlan?.specialtyName}"?
              Это действие нельзя отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Удаление..." : "Удалить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}