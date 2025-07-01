import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { authFetch } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, FileUp, CheckCircle, XCircle, ShieldAlert, Download } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';

interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

interface ImportResponse {
  message: string;
  result: ImportResult;
}

export default function ScheduleImport() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [, navigate] = useLocation();

  const userIsAdmin = user?.role === 'admin';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleCsvImport = async () => {
    if (!selectedFile) {
      toast({
        title: 'No File Selected',
        description: 'Please select a CSV file to import',
        variant: 'destructive'
      });
      return;
    }

    try {
      setImporting(true);
      setImportResult(null);

      const formData = new FormData();
      formData.append('csvFile', selectedFile);

      const response = await authFetch('/api/schedule/import/csv', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to import from CSV');
      }

      const result = await response.json() as ImportResponse;
      setImportResult(result.result);

      toast({
        title: 'Import Completed',
        description: result.message,
        variant: 'default'
      });

      setSelectedFile(null);
      const fileInput = document.getElementById('csvFile') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      queryClient.invalidateQueries({ queryKey: ['/api/schedule'] });

      setTimeout(() => {
        navigate('/schedule');
      }, 1500);
    } catch (error: any) {
      toast({
        title: 'Import Failed',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setImporting(false);
    }
  };

  if (!user) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Доступ запрещен</CardTitle>
            <CardDescription>
              Пожалуйста, войдите в систему для доступа к этой функции
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Ошибка авторизации</AlertTitle>
              <AlertDescription>
                Для доступа к этой странице необходимо войти в систему.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!userIsAdmin) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Доступ запрещен</CardTitle>
            <CardDescription>
              У вас недостаточно прав для доступа к функции импорта расписания
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Ограниченный доступ</AlertTitle>
              <AlertDescription>
                Импорт расписания доступен только для пользователей с правами администратора. Ваша текущая роль: {user.role}.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Импорт расписания</CardTitle>
          <CardDescription>Загрузите расписание из CSV файла</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert className="mb-4">
              <AlertTitle>Важная информация по формату CSV файла</AlertTitle>
              <AlertDescription>
                <div className="mb-2">CSV файл должен содержать следующие обязательные колонки:</div>
                <ul className="list-disc pl-5 space-y-1 mb-3">
                  <li><strong>Предмет</strong> (Subject) - название предмета</li>
                  <li><strong>День</strong> (Day) - день недели на русском или английском языке</li>
                  <li><strong>Время начала</strong> (Start Time) - время начала занятия (ЧЧ:ММ, ЧЧ.ММ или ЧЧММ)</li>
                  <li><strong>Время конца</strong> (End Time) - время окончания занятия (ЧЧ:ММ, ЧЧ.ММ или ЧЧММ)</li>
                  <li><strong>Кабинет</strong> (Room) - номер кабинета (опционально)</li>
                  <li><strong>Преподаватель</strong> (Teacher) - ФИО преподавателя (опционально)</li>
                </ul>

                <div className="mb-2">Дополнительные поля, которые могут присутствовать в файле:</div>
                <ul className="list-disc pl-5 space-y-1 mb-3">
                  <li><strong>Курс</strong> - номер курса обучения</li>
                  <li><strong>Специальность</strong> - название специальности</li>
                  <li><strong>Группа</strong> - название группы учащихся</li>
                </ul>

                <p className="text-sm text-gray-600 mb-2">
                  Первая строка должна содержать названия колонок. Все последующие строки - данные занятий. Система автоматически создаст недостающие предметы и назначит их в расписание. Дополнительные поля будут сохранены в виде метаданных.
                </p>

                <div className="text-sm text-gray-600">
                  <strong>Поддерживаемые форматы:</strong>
                  <ul className="list-disc pl-5 space-y-1 mt-1 mb-2">
                    <li>Названия колонок могут быть на русском языке: Предмет, День, Время начала, Время конца, Кабинет, Преподаватель</li>
                    <li>Дни недели можно указывать полностью или сокращённо на русском или английском</li>
                    <li>Поддерживаются разделители: запятая (,), точка с запятой (;) и табуляция</li>
                    <li>Автоматически определяется кодировка файла (UTF-8, UTF-8-BOM и др.)</li>
                  </ul>
                </div>

                <div className="mt-3 space-y-2">
                  <div>
                    <a href="/schedule-template-comma.csv" download className="inline-flex items-center text-blue-600 hover:text-blue-800">
                      <Download className="h-4 w-4 mr-1" />
                      Скачать простой шаблон (с запятыми)
                    </a>
                  </div>
                  <div>
                    <a href="/schedule-template-semicolon.csv" download className="inline-flex items-center text-blue-600 hover:text-blue-800">
                      <Download className="h-4 w-4 mr-1" />
                      Скачать расширенный шаблон (с точками с запятой)
                    </a>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Выберите шаблон в зависимости от того, планируете ли вы включать дополнительные поля (Курс, Специальность, Группа) в ваш файл CSV.
                  </p>
                </div>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="csvFile">Загрузить CSV файл</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
                <Input id="csvFile" type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
                <label htmlFor="csvFile" className="cursor-pointer flex flex-col items-center justify-center">
                  <FileUp className="h-8 w-8 text-gray-500 mb-2" />
                  <span className="text-sm font-medium">
                    {selectedFile ? selectedFile.name : 'Нажмите для выбора CSV файла'}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">Файл должен соответствовать описанному выше формату</p>
                </label>
              </div>
            </div>

            <div className="pt-2">
              <Button type="button" onClick={handleCsvImport} disabled={importing || !selectedFile} className="w-full">
                {importing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Импортирование...
                  </>
                ) : (
                  'Импортировать из CSV'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle>Результаты импорта</CardTitle>
            <CardDescription>
              Успешно импортировано {importResult.success} из {importResult.total} элементов расписания
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 mb-4 bg-gray-50 rounded-md">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <span className="font-medium">Успешно: {importResult.success}</span>
              </div>
              <div className="flex items-center">
                <XCircle className="h-5 w-5 text-red-500 mr-2" />
                <span className="font-medium">Ошибки: {importResult.failed}</span>
              </div>
              <div className="flex items-center">
                <span className="font-medium">Всего: {importResult.total}</span>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-red-600">Ошибки</h3>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {importResult.errors.map((error, index) => (
                    <Alert variant="destructive" key={index}>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Строка {error.row}</AlertTitle>
                      <AlertDescription>{error.error}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => setImportResult(null)}>
              Закрыть результаты
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
