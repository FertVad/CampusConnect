import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { submitAssignmentSchema } from './useAssignments';
import * as z from 'zod';
import type { Assignment } from '@shared/schema';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selected: Assignment | null;
  submitAssignment: (data: z.infer<typeof submitAssignmentSchema> & { assignmentId: string }) => void;
  loading: boolean;
}

export default function SubmitAssignmentDialog({ open, onOpenChange, selected, submitAssignment, loading }: Props) {
  const form = useForm<z.infer<typeof submitAssignmentSchema>>({
    resolver: zodResolver(submitAssignmentSchema),
    defaultValues: { content: '', status: 'completed' },
  });

  const onSubmit = (data: z.infer<typeof submitAssignmentSchema>) => {
    if (!selected) return;
    submitAssignment({ ...data, assignmentId: selected.id });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Submit Assignment</DialogTitle>
          <DialogDescription>{selected?.title}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Submission</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter your assignment submission" className="min-h-[150px]" {...field} />
                  </FormControl>
                  <FormDescription>You can also attach files or links to your work.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Assignment'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
