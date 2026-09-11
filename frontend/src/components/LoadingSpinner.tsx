import { cn } from '../utils/cn';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function LoadingSpinner({ 
  size = 'md', 
  className = '' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-8 w-8 border-4',
    xl: 'h-12 w-12 border-4',
  };

  return (
    <div 
      className={cn(
        'animate-spin rounded-full border-primary-200 border-t-primary-600',
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function FullPageSpinner() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-md">
      <LoadingSpinner size="xl" />
    </div>
  );
}

export function TableLoading() {
  return (
    <tr>
      <td colSpan={100} className="py-12 text-center">
        <LoadingSpinner size="lg" />
      </td>
    </tr>
  );
}

export function CardLoading() {
  return (
    <div className="flex items-center justify-center py-12">
      <LoadingSpinner size="lg" />
    </div>
  );
}
