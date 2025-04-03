import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { 
  FileText, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiRequest } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface ImportedFile {
  id: number;
  originalName: string;
  uploadedAt: string;
  status: 'success' | 'error' | 'partial' | 'failed';
  itemsCount: number;
  successCount: number;
  errorCount: number;
  importType: 'csv' | 'google-sheets';
  uploadedBy: number;
  uploadedByUser?: {
    firstName: string;
    lastName: string;
  };
  errorDetails?: string;
}

const ImportedFiles = () => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'csv' | 'google-sheets'>('all');
  const [isProcessing, setIsProcessing] = useState<Record<number, boolean>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Загружаем список файлов
  const { data: files = [], isLoading, refetch } = useQuery<ImportedFile[]>({
    queryKey: ['/api/imported-files'],
  });

  const handleDeleteFile = async (id: number) => {
    if (window.confirm('Вы уверены, что хотите удалить этот файл?')) {
      setIsProcessing(prev => ({ ...prev, [id]: true }));
      
      try {
        await apiRequest('DELETE', `/api/imported-files/${id}`, {});
        toast({
          title: 'Файл удален',
          description: 'Файл был успешно удален из системы',
        });
        
        // Обновляем список файлов
        queryClient.invalidateQueries({ queryKey: ['/api/imported-files'] });
      } catch (error) {
        toast({
          title: 'Ошибка удаления',
          description: 'Не удалось удалить файл',
          variant: 'destructive',
        });
      } finally {
        setIsProcessing(prev => ({ ...prev, [id]: false }));
      }
    }
  };

  const handleReimportFile = async (id: number) => {
    // Здесь будет логика для повторного импорта файла
    toast({
      title: 'Повторный импорт',
      description: 'Эта функция будет доступна в следующей версии',
      variant: 'default',
    });
  };

  const getStatusBadge = (status: ImportedFile['status']) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" /> Успешно</Badge>;
      case 'partial':
        return <Badge className="bg-amber-500"><AlertTriangle className="h-3 w-3 mr-1" /> Частично</Badge>;
      case 'failed':
        return <Badge className="bg-red-600"><XCircle className="h-3 w-3 mr-1" /> Ошибка</Badge>;
      case 'error':
        return <Badge className="bg-red-600"><XCircle className="h-3 w-3 mr-1" /> Ошибка</Badge>;
      default:
        return <Badge className="bg-slate-400"><Clock className="h-3 w-3 mr-1" /> Не определен</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true, locale: ru });
    } catch (e) {
      return 'Неизвестно';
    }
  };

  const getImportTypeLabel = (type: ImportedFile['importType']) => {
    return type === 'csv' ? 'CSV файл' : 'Google Sheets';
  };

  const filteredFiles = activeFilter === 'all' 
    ? files 
    : files.filter(file => file.importType === activeFilter);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Управление загруженными файлами</h1>
      
      <Tabs defaultValue="all" onValueChange={(value) => setActiveFilter(value as any)}>
        <div className="mb-4">
          <TabsList>
            <TabsTrigger value="all">Все файлы</TabsTrigger>
            <TabsTrigger value="csv">CSV файлы</TabsTrigger>
            <TabsTrigger value="google-sheets">Google Sheets</TabsTrigger>
          </TabsList>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Импортированные файлы расписания</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="text-center py-8 text-neutral-500">
                Нет загруженных файлов
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Файл</TableHead>
                    <TableHead>Загружен</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="text-center">Строк</TableHead>
                    <TableHead className="text-center">Ошибок</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFiles.map(file => (
                    <TableRow key={file.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 mr-2 text-primary" />
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="truncate max-w-[200px] inline-block">{file.originalName}</span>
                              </TooltipTrigger>
                              <TooltipContent>{file.originalName}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(file.uploadedAt)}</TableCell>
                      <TableCell>{getImportTypeLabel(file.importType)}</TableCell>
                      <TableCell>{getStatusBadge(file.status)}</TableCell>
                      <TableCell className="text-center">{file.itemsCount}</TableCell>
                      <TableCell className="text-center">
                        {file.errorCount > 0 ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-red-500">{file.errorCount}</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {file.errorDetails || 'Подробности ошибок не доступны'}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span>0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            disabled={isProcessing[file.id]}
                            onClick={() => handleReimportFile(file.id)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="danger" 
                            size="icon"
                            disabled={isProcessing[file.id]}
                            onClick={() => handleDeleteFile(file.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
};

export default ImportedFiles;