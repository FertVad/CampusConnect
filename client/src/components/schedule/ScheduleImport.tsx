import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import FileUpload from '@/components/files/FileUpload';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle, XCircle, ShieldAlert, Download } from 'lucide-react';
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
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [, navigate] = useLocation();

  const userIsAdmin = user?.role === 'admin';

  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('csvFile', file);

    const response = await fetch('/api/schedule/import/csv', {
      method: 'POST',
      body: formData
    });

    const result = (await response.json()) as ImportResponse;
    setImportResult(result.result);

    toast({ title: 'Import Completed', description: result.message });

    queryClient.invalidateQueries({ queryKey: ['/api/schedule'] });

    setTimeout(() => {
      navigate('/schedule');
    }, 1500);
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
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <a href="/schedule-template.csv" download className="inline-flex items-center text-blue-600 hover:text-blue-800">
              <Download className="h-4 w-4 mr-1" />
              Скачать шаблон
            </a>
            <a href="/schedule-template-example.csv" download className="inline-flex items-center text-blue-600 hover:text-blue-800">
              <Download className="h-4 w-4 mr-1" />
              С примером
            </a>
          </div>
          <FileUpload onUpload={handleFileUpload} fieldName="csvFile" acceptedFileTypes=".csv" />
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
