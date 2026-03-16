import { KeyboardEvent, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ModernCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function ModernCard({ children, className, onClick }: ModernCardProps) {
  const isInteractive = typeof onClick === 'function';

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!isInteractive) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <Card
      className={cn(
        'p-3 sm:p-4 md:p-6 hover:shadow-lg transition-shadow',
        isInteractive && 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        className
      )}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
    >
      {children}
    </Card>
  );
}
