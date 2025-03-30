import React, { useState } from 'react';
import { insertRequestSchema } from '@shared/schema';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Extended schema with validation rules for forms
const requestFormSchema = insertRequestSchema.extend({
  type: z.string().min(3, "Request type is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
});

interface RequestFormProps {
  onSubmit: (data: z.infer<typeof requestFormSchema>) => Promise<void>;
}

const RequestForm: React.FC<RequestFormProps> = ({ onSubmit }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<z.infer<typeof requestFormSchema>>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: {
      type: '',
      description: '',
    },
  });
  
  const requestTypes = [
    { value: 'payment_deferral', label: 'Payment Deferral' },
    { value: 'absence_excuse', label: 'Absence Excuse' },
    { value: 'course_change', label: 'Course Change' },
    { value: 'certificate_request', label: 'Certificate Request' },
    { value: 'other', label: 'Other' },
  ];
  
  const handleSubmit = async (data: z.infer<typeof requestFormSchema>) => {
    try {
      setIsSubmitting(true);
      await onSubmit(data);
      form.reset();
    } catch (error) {
      console.error('Error submitting request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-heading">Submit a New Request</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Request Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select request type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {requestTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {form.watch('type') === 'other' && (
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specify Request Type</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter request type" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Please describe your request in detail..." 
                      rows={5}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default RequestForm;
