import React, { useContext, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserContext } from '@/main';
import MainLayout from '@/components/layouts/MainLayout';
import ClassSchedule from '@/components/schedule/ClassSchedule';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { insertScheduleItemSchema } from '@shared/schema';
import { postData } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Extended schema with validation for forms
const scheduleFormSchema = insertScheduleItemSchema.extend({
  subjectId: z.number().positive("Please select a subject"),
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, "Format: HH:MM:SS"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, "Format: HH:MM:SS"),
  roomNumber: z.string().optional(),
});

const Schedule = () => {
  const userContext = useContext(UserContext);
  const user = userContext?.user;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('view');
  
  // Get schedule based on user role
  const { data: scheduleItems = [], isLoading } = useQuery({
    queryKey: [user?.role === 'student' ? `/api/schedule/student/${user?.id}` : `/api/schedule/teacher/${user?.id}`],
  });
  
  // Get all subjects for admin schedule creation
  const { data: subjects = [] } = useQuery({
    queryKey: ['/api/subjects'],
  });
  
  // Form for creating new schedule items (admin only)
  const form = useForm<z.infer<typeof scheduleFormSchema>>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      subjectId: 0,
      dayOfWeek: 1, // Monday
      startTime: "09:00:00",
      endTime: "10:30:00",
      roomNumber: "",
    },
  });
  
  // Mutation for creating schedule items
  const createScheduleMutation = useMutation({
    mutationFn: (data: z.infer<typeof scheduleFormSchema>) => {
      return postData('/api/schedule', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedule'] });
      toast({
        title: 'Schedule Created',
        description: 'The schedule item has been created successfully.',
      });
      setIsDialogOpen(false);
      form.reset({
        subjectId: 0,
        dayOfWeek: 1,
        startTime: "09:00:00",
        endTime: "10:30:00",
        roomNumber: "",
      });
    },
    onError: (error) => {
      console.error('Error creating schedule item:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to Create Schedule',
        description: 'An error occurred while creating the schedule item.',
      });
    },
  });
  
  const onSubmit = (data: z.infer<typeof scheduleFormSchema>) => {
    createScheduleMutation.mutate(data);
  };
  
  const isAdmin = user?.role === 'admin';
  
  const weekdays = [
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
    { value: 0, label: 'Sunday' },
  ];
  
  return (
    <MainLayout 
      title="Class Schedule"
      subtitle="View your weekly class schedule"
    >
      {isAdmin && (
        <div className="mb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="view">View Schedule</TabsTrigger>
              <TabsTrigger value="manage">Manage Schedule</TabsTrigger>
            </TabsList>
            
            <TabsContent value="view">
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
              ) : (
                <ClassSchedule scheduleItems={scheduleItems} />
              )}
            </TabsContent>
            
            <TabsContent value="manage">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-heading">Manage Schedule</CardTitle>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Schedule Item
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Schedule Item</DialogTitle>
                        <DialogDescription>
                          Create a new class schedule item.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                          <FormField
                            control={form.control}
                            name="subjectId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Subject</FormLabel>
                                <Select
                                  onValueChange={(value) => field.onChange(parseInt(value))}
                                  defaultValue={field.value ? field.value.toString() : undefined}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a subject" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {subjects.map((subject) => (
                                      <SelectItem key={subject.id} value={subject.id.toString()}>
                                        {subject.name}
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
                            name="dayOfWeek"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Day of Week</FormLabel>
                                <Select
                                  onValueChange={(value) => field.onChange(parseInt(value))}
                                  defaultValue={field.value.toString()}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select day" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {weekdays.map((day) => (
                                      <SelectItem key={day.value} value={day.value.toString()}>
                                        {day.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="startTime"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Start Time</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="09:00:00" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="endTime"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>End Time</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="10:30:00" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <FormField
                            control={form.control}
                            name="roomNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Room Number</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Room 101" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="flex justify-end pt-4">
                            <Button 
                              type="submit"
                              disabled={createScheduleMutation.isPending}
                            >
                              {createScheduleMutation.isPending ? 'Creating...' : 'Create Schedule Item'}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {/* Admin schedule management tools would go here */}
                  <p className="text-neutral-500 text-center py-8">
                    Use the "Add Schedule Item" button to create new class schedule items.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
      
      {!isAdmin && (
        <>
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
          ) : (
            <ClassSchedule scheduleItems={scheduleItems} />
          )}
        </>
      )}
    </MainLayout>
  );
};

export default Schedule;
