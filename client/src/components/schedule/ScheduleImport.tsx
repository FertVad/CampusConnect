import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, AlertCircle, FileUp, CheckCircle, XCircle, ShieldAlert } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { isAdmin } from '@/lib/auth';

interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    error: string;
  }>;
}

interface ImportResponse {
  message: string;
  result: ImportResult;
}

interface GoogleSheetsImportFormData {
  credentials: string;
  spreadsheetId: string;
  range: string;
}

export default function ScheduleImport() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'google-sheets' | 'csv'>('google-sheets');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Проверка роли пользователя
  const userIsAdmin = isAdmin(user?.role);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<GoogleSheetsImportFormData>({
    defaultValues: {
      credentials: '',
      spreadsheetId: '',
      range: 'Sheet1!A1:E'
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleGoogleSheetsImport = async (data: GoogleSheetsImportFormData) => {
    try {
      setImporting(true);
      setImportResult(null);

      const rawResponse = await apiRequest(
        'POST',
        '/api/schedule/import/google-sheets',
        {
          credentials: JSON.parse(data.credentials),
          spreadsheetId: data.spreadsheetId,
          range: data.range
        }
      );
      
      // Convert raw response to ImportResponse type
      const response = rawResponse as unknown as ImportResponse;

      setImportResult(response.result);
      toast({
        title: 'Import Completed',
        description: response.message,
        variant: 'default'
      });

      // Invalidate schedule queries to reflect the new data
      queryClient.invalidateQueries({ queryKey: ['/api/schedule'] });
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

      const response = await fetch('/api/schedule/import/csv', {
        method: 'POST',
        body: formData,
        credentials: 'include'
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

      // Reset file input
      setSelectedFile(null);
      const fileInput = document.getElementById('csvFile') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Invalidate schedule queries to reflect the new data
      queryClient.invalidateQueries({ queryKey: ['/api/schedule'] });
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

  // Проверка, был ли выполнен вход
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
  
  // Проверка роли пользователя - только администраторы имеют доступ
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
                Импорт расписания доступен только для пользователей с правами администратора.
                Ваша текущая роль: {user.role}.
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
          <CardDescription>
            Загрузите расписание из Google Sheets или CSV файла
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            defaultValue={activeTab}
            onValueChange={(value) => setActiveTab(value as 'google-sheets' | 'csv')}
          >
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="google-sheets">
                Google Таблицы (API)
              </TabsTrigger>
              <TabsTrigger value="csv">
                Загрузка CSV
              </TabsTrigger>
            </TabsList>

            <TabsContent value="google-sheets">
              <form onSubmit={handleSubmit(handleGoogleSheetsImport)}>
                <div className="space-y-4">
                  <Alert className="mb-4">
                    <AlertTitle>Руководство по импорту из Google Таблиц</AlertTitle>
                    <AlertDescription>
                      <p className="mb-2">Для импорта расписания из Google Таблиц необходимо:</p>
                      <ol className="list-decimal pl-5 space-y-1 mb-3">
                        <li>Создать сервисный аккаунт в Google Cloud Console</li>
                        <li>Загрузить JSON-ключ доступа для сервисного аккаунта</li>
                        <li>Предоставить доступ к таблице для этого сервисного аккаунта</li>
                        <li>Вставить содержимое JSON-файла в поле "Учетные данные API"</li>
                      </ol>
                      <p className="text-sm text-gray-600 mb-2">
                        В таблице должны содержаться те же колонки, что и в CSV формате:
                        <strong>subjectId, dayOfWeek, startTime, endTime, roomNumber</strong>
                      </p>
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-2">
                    <Label htmlFor="credentials">Учетные данные API Google (JSON)</Label>
                    <Textarea
                      id="credentials"
                      placeholder='{"type": "service_account", ...}'
                      className="h-32"
                      {...register('credentials', {
                        required: 'Необходимо указать учетные данные Google API',
                        validate: (value) => {
                          try {
                            JSON.parse(value);
                            return true;
                          } catch (e) {
                            return 'Неверный формат JSON';
                          }
                        }
                      })}
                    />
                    {errors.credentials && (
                      <p className="text-sm text-red-500">{errors.credentials.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="spreadsheetId">ID Google Таблицы</Label>
                    <Input
                      id="spreadsheetId"
                      placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                      {...register('spreadsheetId', {
                        required: 'Необходимо указать ID таблицы'
                      })}
                    />
                    {errors.spreadsheetId && (
                      <p className="text-sm text-red-500">{errors.spreadsheetId.message}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      ID таблицы можно найти в URL между /d/ и /edit
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="range">
                      Диапазон ячеек <span className="text-gray-500">(Опционально)</span>
                    </Label>
                    <Input
                      id="range"
                      placeholder="Sheet1!A1:E"
                      {...register('range')}
                    />
                    <p className="text-xs text-gray-500">
                      Формат: ИмяЛиста!НачальнаяЯчейка:КонечныйСтолбец (например, Sheet1!A1:E)
                    </p>
                  </div>

                  <div className="pt-2">
                    <Button type="submit" disabled={importing} className="w-full">
                      {importing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Импортирование...
                        </>
                      ) : (
                        'Импортировать из Google Таблиц'
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="csv">
              <div className="space-y-4">
                <Alert className="mb-4">
                  <AlertTitle>Важная информация по формату CSV файла</AlertTitle>
                  <AlertDescription>
                    <p className="mb-2">CSV файл должен содержать следующие колонки в указанном порядке:</p>
                    <ul className="list-disc pl-5 space-y-1 mb-3">
                      <li><strong>subjectId</strong> - ID предмета (целое число, должно соответствовать существующему предмету в системе)</li>
                      <li><strong>dayOfWeek</strong> - День недели (число от 0 до 6, где 0 = Воскресенье, 1 = Понедельник, 6 = Суббота)</li>
                      <li><strong>startTime</strong> - Время начала занятия (формат: ЧЧ:ММ или ЧЧ:ММ:СС)</li>
                      <li><strong>endTime</strong> - Время окончания занятия (формат: ЧЧ:ММ или ЧЧ:ММ:СС)</li>
                      <li><strong>roomNumber</strong> - Номер аудитории (опционально)</li>
                    </ul>
                    <p className="mb-2">Пример правильного формата CSV файла:</p>
                    <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto mb-3">
                      subjectId,dayOfWeek,startTime,endTime,roomNumber<br/>
                      1,1,09:00,10:30,A101<br/>
                      2,1,11:00,12:30,B202<br/>
                      3,2,14:00,15:30,C303
                    </pre>
                    <p className="text-sm text-gray-600">
                      Первая строка - заголовки колонок. Все последующие строки - данные занятий.
                      Расписание может быть на любой период (семестр, месяц, учебный год) без ограничений.
                    </p>
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <Label htmlFor="csvFile">Загрузить CSV файл</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
                    <Input
                      id="csvFile"
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="csvFile"
                      className="cursor-pointer flex flex-col items-center justify-center"
                    >
                      <FileUp className="h-8 w-8 text-gray-500 mb-2" />
                      <span className="text-sm font-medium">
                        {selectedFile ? selectedFile.name : 'Нажмите для выбора CSV файла'}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        Файл должен соответствовать описанному выше формату
                      </p>
                    </label>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={handleCsvImport}
                    disabled={importing || !selectedFile}
                    className="w-full"
                  >
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Import Results */}
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