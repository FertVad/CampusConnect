import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatusCardProps {
  title: string;
  value: string | number;
  change?: {
    value: string;
    type: 'increase' | 'decrease' | 'neutral';
  };
  icon: ReactNode;
  iconBgColor?: string;
  iconColor?: string;
}

const StatusCard = ({
  title,
  value,
  change,
  icon,
  iconBgColor = 'bg-primary bg-opacity-10',
  iconColor = 'text-primary',
}: StatusCardProps) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-5 border border-neutral-100">
      <div className="flex justify-between">
        <div>
          <p className="text-sm text-neutral-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold font-heading text-neutral-700">{value}</h3>
          {change && (
            <p className={cn(
              "text-xs flex items-center mt-1",
              change.type === 'increase' && "text-success",
              change.type === 'decrease' && "text-error",
              change.type === 'neutral' && "text-warning"
            )}>
              {change.type === 'increase' && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                </svg>
              )}
              {change.type === 'decrease' && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd" />
                </svg>
              )}
              {change.type === 'neutral' && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
              )}
              {change.value}
            </p>
          )}
        </div>
        <div className={cn("h-12 w-12 rounded-lg flex items-center justify-center", iconBgColor)}>
          <div className={iconColor}>{icon}</div>
        </div>
      </div>
    </div>
  );
};

export default StatusCard;
