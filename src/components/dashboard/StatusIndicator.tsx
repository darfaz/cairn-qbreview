import { cn } from '@/lib/utils';

interface StatusIndicatorProps {
  status: 'green' | 'yellow' | 'red';
  count?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusIndicator({ status, count, size = 'md' }: StatusIndicatorProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const statusClasses = {
    green: 'bg-status-green',
    yellow: 'bg-status-yellow',
    red: 'bg-status-red',
  };

  const statusText = {
    green: count === 0 ? 'Clean' : `${count} items`,
    yellow: `${count} items`,
    red: `${count} items`,
  };

  return (
    <div className="flex items-center space-x-2">
      <div className={cn(
        'rounded-full flex-shrink-0',
        sizeClasses[size],
        statusClasses[status]
      )} />
      {count !== undefined && (
        <span className="text-sm font-medium">
          {statusText[status]}
        </span>
      )}
    </div>
  );
}