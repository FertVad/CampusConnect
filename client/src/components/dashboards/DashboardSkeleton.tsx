import { Loader2 } from 'lucide-react';

export default function DashboardSkeleton() {
  return (
    <div className="flex items-center justify-center py-10">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
