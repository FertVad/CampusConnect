import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Check, File, UploadCloud, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { formatFileSize } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FileUploadProps {
  onUpload: (formData: FormData) => Promise<any>;
  fieldName?: string;
  acceptedFileTypes?: string;
  maxFileSizeMB?: number;
  multiple?: boolean;
  className?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ 
  onUpload, 
  fieldName = 'file',
  acceptedFileTypes = '*',
  maxFileSizeMB = 5,
  multiple = false,
  className 
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024;
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(false);
    
    if (e.target.files) {
      const fileList = Array.from(e.target.files);
      
      // Check file size
      const oversizedFiles = fileList.filter(file => file.size > maxFileSizeBytes);
      if (oversizedFiles.length > 0) {
        setError(`Some files exceed the maximum size of ${maxFileSizeMB}MB`);
        return;
      }
      
      setFiles(multiple ? fileList : [fileList[0]]);
    }
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    setSuccess(false);
    
    if (e.dataTransfer.files) {
      const fileList = Array.from(e.dataTransfer.files);
      
      // Check file size
      const oversizedFiles = fileList.filter(file => file.size > maxFileSizeBytes);
      if (oversizedFiles.length > 0) {
        setError(`Some files exceed the maximum size of ${maxFileSizeMB}MB`);
        return;
      }
      
      setFiles(multiple ? fileList : [fileList[0]]);
    }
  };
  
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  
  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };
  
  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    setProgress(0);
    setError(null);
    
    try {
      const formData = new FormData();
      
      files.forEach((file) => {
        formData.append(fieldName, file);
      });
      
      // Simulate progress
      const interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + 5;
          if (newProgress >= 90) {
            clearInterval(interval);
            return 90;
          }
          return newProgress;
        });
      }, 100);
      
      await onUpload(formData);
      
      clearInterval(interval);
      setProgress(100);
      setSuccess(true);
      setFiles([]);
      
      // Reset progress after a delay
      setTimeout(() => {
        setProgress(0);
        setUploading(false);
      }, 1000);
    } catch (err) {
      console.error('Upload error:', err);
      setError('Upload failed. Please try again.');
      setUploading(false);
      setProgress(0);
    }
  };
  
  return (
    <div className={className}>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
        accept={acceptedFileTypes}
        multiple={multiple}
      />
      
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Drag & Drop Area */}
      {files.length === 0 && (
        <div
          className="border-2 border-dashed border-neutral-200 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={triggerFileInput}
        >
          <UploadCloud className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
          <p className="text-neutral-700 font-medium mb-1">
            Drag and drop files here, or click to browse
          </p>
          <p className="text-neutral-500 text-sm">
            {multiple ? 'Upload multiple files' : 'Upload a file'} up to {maxFileSizeMB}MB
          </p>
        </div>
      )}
      
      {/* File List */}
      {files.length > 0 && (
        <div className="mt-4 mb-4">
          <div className="space-y-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center bg-neutral-50 p-3 rounded-lg">
                <File className="h-5 w-5 text-neutral-500 mr-3" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-700 truncate">{file.name}</p>
                  <p className="text-xs text-neutral-500">{formatFileSize(file.size)}</p>
                </div>
                <button
                  className="text-neutral-400 hover:text-neutral-600 ml-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          
          {uploading && (
            <div className="mt-4">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-center mt-1 text-neutral-500">
                Uploading... {progress}%
              </p>
            </div>
          )}
          
          {success && (
            <div className="flex items-center text-success mt-2">
              <Check className="h-4 w-4 mr-1" />
              <span className="text-sm">Files uploaded successfully!</span>
            </div>
          )}
          
          <div className="flex mt-4">
            <Button
              onClick={handleUpload}
              disabled={uploading || files.length === 0}
              className="mr-2"
            >
              {uploading ? 'Uploading...' : 'Upload Files'}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setFiles([])}
              disabled={uploading}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
