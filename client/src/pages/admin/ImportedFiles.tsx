import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Trash2, FileText, FileSpreadsheet, Check, X, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ImportedFile {
  id: number;
  originalName: string;
  storedName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  importType: 'csv' | 'google-sheets';
  status: 'success' | 'partial' | 'failed';
  itemsCount: number;
  successCount: number;
  errorCount: number;
  uploadedBy: number;
  uploadedAt: Date | string;
  errorDetails?: string;
  uploader?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}

// Форматирование размера файла в человекочитаемый вид
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ';
  else if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' ГБ';
};

const ImportedFilesPage: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [fileToDelete, setFileToDelete] = useState<ImportedFile | null>(null);

  // Запрос на получение всех импортированных файлов
  const { data: files, isLoading, error } = useQuery({
    queryKey: ['/api/imported-files'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/imported-files');
      const data = await response.json();
      if (!Array.isArray(data)) {
        return [];
      }
      // Преобразуем строки дат в объекты Date для корректного отображения
      return data.map((file: ImportedFile) => ({
        ...file,
        uploadedAt: new Date(file.uploadedAt)
      }));
    }
  });

  // Мутация для удаления файла
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/imported-files/${id}`);
    },
    onSuccess: () => {
      // Инвалидируем кеш после успешного удаления
      queryClient.invalidateQueries({ queryKey: ['/api/imported-files'] });
      toast({
        title: t('common.success'),
        description: t('admin.importedFiles.deleteSuccess'),
        variant: 'default'
      });
      setFileToDelete(null);
    },
    onError: (error) => {
      console.error('Error deleting file:', error);
      toast({
        title: t('common.error'),
        description: t('admin.importedFiles.deleteError'),
        variant: 'destructive'
      });
    }
  });

  // Обработчик удаления файла
  const handleDeleteFile = () => {
    if (fileToDelete) {
      deleteMutation.mutate(fileToDelete.id);
    }
  };

  // Фильтруем файлы по типу
  const csvFiles = files?.filter((file: ImportedFile) => file.importType === 'csv') || [];
  const googleSheetsFiles = files?.filter((file: ImportedFile) => file.importType === 'google-sheets') || [];

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">{t('admin.importedFiles.title')}</h1>
      
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="all">{t('admin.importedFiles.tabs.all')}</TabsTrigger>
          <TabsTrigger value="csv">CSV</TabsTrigger>
          <TabsTrigger value="google-sheets">Google Sheets</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.importedFiles.allFiles')}</CardTitle>
              <CardDescription>{t('admin.importedFiles.allFilesDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              {renderFilesTable(files || [], handleDeleteFile, setFileToDelete, isLoading, error)}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="csv">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.importedFiles.csvFiles')}</CardTitle>
              <CardDescription>{t('admin.importedFiles.csvFilesDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              {renderFilesTable(csvFiles, handleDeleteFile, setFileToDelete, isLoading, error)}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="google-sheets">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.importedFiles.googleSheetsFiles')}</CardTitle>
              <CardDescription>{t('admin.importedFiles.googleSheetsFilesDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              {renderFilesTable(googleSheetsFiles, handleDeleteFile, setFileToDelete, isLoading, error)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Диалог подтверждения удаления */}
      <AlertDialog open={!!fileToDelete} onOpenChange={(open) => !open && setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.importedFiles.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {fileToDelete && (
                <p>
                  {t('admin.importedFiles.confirmDeleteMessage', {
                    fileName: fileToDelete.originalName
                  })}
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFile}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Функция для рендеринга таблицы файлов
const renderFilesTable = (
  files: ImportedFile[],
  handleDeleteFile: () => void,
  setFileToDelete: (file: ImportedFile) => void,
  isLoading: boolean,
  error: Error | null
) => {
  const { t } = useTranslation();
  
  if (isLoading) {
    return <div className="py-4 text-center">{t('common.loading')}</div>;
  }
  
  if (error) {
    return (
      <div className="py-4 text-center text-destructive">
        {t('common.errorLoading')}: {error.message}
      </div>
    );
  }
  
  if (!files.length) {
    return <div className="py-4 text-center">{t('admin.importedFiles.noFiles')}</div>;
  }
  
  return (
    <Table>
      <TableCaption>{t('admin.importedFiles.tableCaption')}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>{t('admin.importedFiles.fileName')}</TableHead>
          <TableHead>{t('admin.importedFiles.fileType')}</TableHead>
          <TableHead>{t('admin.importedFiles.uploadedBy')}</TableHead>
          <TableHead>{t('admin.importedFiles.dateUploaded')}</TableHead>
          <TableHead>{t('admin.importedFiles.fileSize')}</TableHead>
          <TableHead>{t('admin.importedFiles.status')}</TableHead>
          <TableHead>{t('admin.importedFiles.items')}</TableHead>
          <TableHead className="text-right">{t('common.actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {files.map((file) => (
          <TableRow key={file.id}>
            <TableCell className="font-medium">
              <div className="flex items-center gap-2">
                {file.importType === 'csv' 
                  ? <FileText className="h-4 w-4 text-primary" /> 
                  : <FileSpreadsheet className="h-4 w-4 text-green-600" />
                }
                <span className="truncate max-w-[200px]" title={file.originalName}>
                  {file.originalName}
                </span>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={file.importType === 'csv' ? 'default' : 'outline'}>
                {file.importType === 'csv' ? 'CSV' : 'Google Sheets'}
              </Badge>
            </TableCell>
            <TableCell>
              {file.uploader 
                ? file.uploader.name 
                : t('admin.importedFiles.unknownUser', { id: file.uploadedBy })
              }
            </TableCell>
            <TableCell>
              {typeof file.uploadedAt === 'string' 
                ? file.uploadedAt 
                : format(file.uploadedAt, 'dd.MM.yyyy HH:mm', { locale: ru })
              }
            </TableCell>
            <TableCell>{formatFileSize(file.fileSize)}</TableCell>
            <TableCell>
              <StatusBadge status={file.status} />
            </TableCell>
            <TableCell>
              <div className="flex flex-col gap-1 text-xs">
                <div className="flex items-center gap-1">
                  <span className="font-medium">{t('admin.importedFiles.total')}:</span> {file.itemsCount}
                </div>
                <div className="flex items-center gap-1 text-green-600">
                  <Check className="h-3 w-3" /> {file.successCount}
                </div>
                {file.errorCount > 0 && (
                  <div className="flex items-center gap-1 text-destructive">
                    <X className="h-3 w-3" /> {file.errorCount}
                  </div>
                )}
              </div>
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFileToDelete(file)}
                title={t('common.delete')}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

// Компонент для отображения статуса файла
const StatusBadge: React.FC<{ status: 'success' | 'partial' | 'failed' }> = ({ status }) => {
  const { t } = useTranslation();
  
  let variant: 'default' | 'outline' | 'secondary' | 'destructive' = 'default';
  let statusText = '';
  
  switch (status) {
    case 'success':
      variant = 'default'; // зеленый
      statusText = t('admin.importedFiles.statusSuccess');
      break;
    case 'partial':
      variant = 'secondary'; // желтый
      statusText = t('admin.importedFiles.statusPartial');
      break;
    case 'failed':
      variant = 'destructive'; // красный
      statusText = t('admin.importedFiles.statusFailed');
      break;
  }
  
  return <Badge variant={variant}>{statusText}</Badge>;
};

export default ImportedFilesPage;