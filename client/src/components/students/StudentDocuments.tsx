import React from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Download, 
  Upload,
  AlertCircle
} from 'lucide-react';

// Интерфейс для данных документа
export interface Document {
  id: number;
  userId: string;
  title: string;
  type: string;
  fileUrl?: string;
  createdAt: string;
  createdBy?: string;
}

interface StudentDocumentsProps {
  userId: string;
  documents: Document[];
  isLoading: boolean;
}

const StudentDocuments: React.FC<StudentDocumentsProps> = ({ userId, documents, isLoading }) => {
  const { t } = useTranslation();

  // Форматирование даты
  const formatDateString = (dateString: string) => {
    try {
      return format(new Date(dateString), 'PPP', { locale: ru });
    } catch (e) {
      return dateString;
    }
  };

  // Получение иконки в зависимости от типа документа
  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'contract':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'certificate':
        return <FileText className="h-5 w-5 text-green-500" />;
      case 'application':
        return <FileText className="h-5 w-5 text-amber-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  // Состояние загрузки
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-muted-foreground">{t('common.loading', 'Загрузка...')}</p>
      </div>
    );
  }

  // Компонент без документов
  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center">
        <AlertCircle className="h-10 w-10 text-muted-foreground mb-3 opacity-50" />
        <p className="text-muted-foreground">
          {t('documents.empty', 'Нет загруженных документов')}
        </p>
        {/* Заглушка для будущей функциональности загрузки */}
        {/*
        <Button variant="outline" className="mt-4">
          <Upload className="mr-2 h-4 w-4" />
          {t('documents.upload', 'Загрузить файл')}
        </Button>
        */}
      </div>
    );
  }

  // Компонент со списком документов
  return (
    <ul className="space-y-3">
      {documents.map((doc) => (
        <li key={doc.id} className="p-3 rounded-md bg-secondary/30 flex items-center justify-between">
          <div className="flex items-center">
            {getDocumentIcon(doc.type)}
            <div className="ml-3">
              <h4 className="font-medium">{doc.title}</h4>
              <p className="text-xs text-muted-foreground">
                {formatDateString(doc.createdAt)}
              </p>
            </div>
          </div>
          
          {doc.fileUrl && (
            <Button variant="ghost" asChild>
              <a href={doc.fileUrl} download target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4" />
              </a>
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
};

export default StudentDocuments;