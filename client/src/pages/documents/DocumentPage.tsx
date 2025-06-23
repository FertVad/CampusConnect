import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LucideIcon, AlertCircle, FilePlus, DownloadCloud } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { uploadFile } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { insertDocumentSchema, Document, User } from '@shared/schema';

import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DocumentPageProps {
  documentType: string;
  title: string;
  icon: LucideIcon;
}

const documentFormSchema = insertDocumentSchema.extend({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  type: z.string().min(1, 'Document type is required'),
  userId: z.string().min(1, 'Please select a user'),
});

export default function DocumentPage({ documentType, title, icon: Icon }: DocumentPageProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: [user?.role === 'admin' ? '/api/documents' : `/api/documents/user/${user?.id}/type/${documentType}`],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: user?.role === 'admin',
  });

  const form = useForm<z.infer<typeof documentFormSchema>>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: { title: '', type: documentType, userId: '' },
  });

  const createDocumentMutation = useMutation({
    mutationFn: (formData: FormData) => uploadFile('/api/documents', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      const capitalized = documentType.charAt(0).toUpperCase() + documentType.slice(1);
      toast({
        title: `${capitalized} Created`,
        description: `The ${documentType} has been created successfully.`,
      });
      setIsDialogOpen(false);
      form.reset({ title: '', type: documentType, userId: '' });
    },
    onError: () => {
      setError(`Failed to create ${documentType}. Please try again.`);
    },
  });

  const onSubmit = (data: z.infer<typeof documentFormSchema>) => {
    setError(null);
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('type', data.type);
    formData.append('userId', data.userId);
    createDocumentMutation.mutate(formData);
  };

  const isAdmin = user?.role === 'admin';
  const subtitle = `View and manage ${documentType}s`;

  return (
    <MainLayout title={title} subtitle={subtitle}>
      <div className="space-y-6">
        {isAdmin && (
          <div className="flex justify-end">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <FilePlus className="h-4 w-4 mr-2" />
                  {`Create ${documentType.charAt(0).toUpperCase()}${documentType.slice(1)}`}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{`Create New ${documentType.charAt(0).toUpperCase()}${documentType.slice(1)}`}</DialogTitle>
                  <DialogDescription>{`Create a new ${documentType} for a student.`}</DialogDescription>
                </DialogHeader>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input placeholder={`${documentType.charAt(0).toUpperCase()}${documentType.slice(1)} title`} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="userId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Student</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a student" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {users
                                .filter(u => u.role === 'student')
                                .map(student => (
                                  <SelectItem key={student.id} value={student.id.toString()}>
                                    {student.firstName} {student.lastName}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} disabled>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value={documentType}>{documentType.charAt(0).toUpperCase() + documentType.slice(1)}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="border-2 border-dashed border-neutral-200 rounded-lg p-8 text-center">
                      <Icon className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                      <p className="text-neutral-700 font-medium mb-1">Upload {documentType.charAt(0).toUpperCase() + documentType.slice(1)} Document</p>
                      <p className="text-neutral-500 text-sm">Upload a PDF file (max 5MB)</p>
                      <Button className="mt-4" variant="outline">
                        <DownloadCloud className="h-4 w-4 mr-2" />
                        Select File
                      </Button>
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button type="submit" disabled={createDocumentMutation.isPending}>
                        {createDocumentMutation.isPending ? 'Creating...' : `Create ${documentType.charAt(0).toUpperCase() + documentType.slice(1)}`}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-pulse flex flex-col items-center">
                <div className="h-8 w-8 bg-neutral-200 rounded-full mb-4"></div>
                <div className="h-4 bg-neutral-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-neutral-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ) : documents.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Icon className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
              <p className="text-neutral-500">No {documentType}s found</p>
              {isAdmin && (
                <p className="text-sm text-neutral-400 mt-2">Click the \"Create {documentType.charAt(0).toUpperCase() + documentType.slice(1)}\" button to get started.</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents
              .filter(doc => doc.type === documentType)
              .map(document => (
                <Card key={document.id}>
                  <CardHeader>
                    <CardTitle className="text-lg font-heading flex items-center">
                      <Icon className="h-5 w-5 mr-2 text-primary" />
                      {document.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-neutral-500">{documentType === 'invoice' ? 'Created' : 'Issued'}: {formatDate(document.createdAt)}</p>
                    {isAdmin && (
                      <p className="text-sm text-neutral-500">For: {users.find(u => u.authUserId === document.userId)?.firstName} {users.find(u => u.authUserId === document.userId)?.lastName}</p>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button variant="outline" asChild>
                      <a href={document.fileUrl || '#'} target="_blank" rel="noopener noreferrer">
                        <DownloadCloud className="h-4 w-4 mr-2" />
                        Download
                      </a>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

