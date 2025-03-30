import React, { useContext, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserContext } from '@/main';
import MainLayout from '@/components/layouts/MainLayout';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { insertDocumentSchema } from '@shared/schema';
import { uploadFile } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Award, DownloadCloud, FilePlus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatDate } from '@/lib/utils';

// Extended schema with validation for forms
const documentFormSchema = insertDocumentSchema.extend({
  title: z.string().min(3, "Title must be at least 3 characters"),
  type: z.string().min(1, "Document type is required"),
  userId: z.number().positive("Please select a user"),
});

const Certificates = () => {
  const userContext = useContext(UserContext);
  const user = userContext?.user;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get documents based on user role
  const { data: documents = [], isLoading } = useQuery({
    queryKey: [user?.role === 'admin' ? '/api/documents' : `/api/documents/user/${user?.id}/type/certificate`],
  });
  
  // Get all users for admin document creation
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    enabled: user?.role === 'admin',
  });
  
  // Form for creating new documents (admin only)
  const form = useForm<z.infer<typeof documentFormSchema>>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: {
      title: '',
      type: 'certificate',
      userId: 0,
    },
  });
  
  // Mutation for creating documents
  const createDocumentMutation = useMutation({
    mutationFn: (formData: FormData) => {
      return uploadFile('/api/documents', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({
        title: 'Certificate Created',
        description: 'The certificate has been created successfully.',
      });
      setIsDialogOpen(false);
      form.reset({
        title: '',
        type: 'certificate',
        userId: 0,
      });
    },
    onError: (error) => {
      console.error('Error creating certificate:', error);
      setError('Failed to create certificate. Please try again.');
    },
  });
  
  const onSubmit = (data: z.infer<typeof documentFormSchema>) => {
    setError(null);
    
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('type', data.type);
    formData.append('userId', data.userId.toString());
    
    // In a real application, you would include the file upload here
    // formData.append('file', file);
    
    createDocumentMutation.mutate(formData);
  };
  
  const isAdmin = user?.role === 'admin';
  
  return (
    <MainLayout 
      title="Certificates"
      subtitle="View and manage academic certificates"
    >
      <div className="space-y-6">
        {isAdmin && (
          <div className="flex justify-end">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <FilePlus className="h-4 w-4 mr-2" />
                  Create Certificate
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Certificate</DialogTitle>
                  <DialogDescription>
                    Create a new certificate for a student.
                  </DialogDescription>
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
                            <Input placeholder="Certificate title" {...field} />
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
                          <Select
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            defaultValue={field.value ? field.value.toString() : undefined}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a student" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {users
                                .filter(u => u.role === 'student')
                                .map((student) => (
                                  <SelectItem key={student.id} value={student.id.toString()}>
                                    {student.firstName} {student.lastName}
                                  </SelectItem>
                                ))
                              }
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
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            disabled
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="certificate">Certificate</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* File upload would go here in a real application */}
                    <div className="border-2 border-dashed border-neutral-200 rounded-lg p-8 text-center">
                      <Award className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                      <p className="text-neutral-700 font-medium mb-1">
                        Upload Certificate Document
                      </p>
                      <p className="text-neutral-500 text-sm">
                        Upload a PDF file (max 5MB)
                      </p>
                      <Button className="mt-4" variant="outline">
                        <DownloadCloud className="h-4 w-4 mr-2" />
                        Select File
                      </Button>
                    </div>
                    
                    <div className="flex justify-end pt-4">
                      <Button 
                        type="submit"
                        disabled={createDocumentMutation.isPending}
                      >
                        {createDocumentMutation.isPending ? 'Creating...' : 'Create Certificate'}
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
              <Award className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
              <p className="text-neutral-500">No certificates found</p>
              {isAdmin && (
                <p className="text-sm text-neutral-400 mt-2">
                  Click the "Create Certificate" button to get started.
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents
              .filter(doc => doc.type === 'certificate')
              .map((document) => (
                <Card key={document.id}>
                  <CardHeader>
                    <CardTitle className="text-lg font-heading flex items-center">
                      <Award className="h-5 w-5 mr-2 text-primary" />
                      {document.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-neutral-500">
                      Issued: {formatDate(document.createdAt)}
                    </p>
                    {isAdmin && (
                      <p className="text-sm text-neutral-500">
                        For: {users.find(u => u.id === document.userId)?.firstName} {users.find(u => u.id === document.userId)?.lastName}
                      </p>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button variant="outline" size="sm" asChild>
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
};

export default Certificates;
