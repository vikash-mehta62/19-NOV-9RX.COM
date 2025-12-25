import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ModernCardProps {
  children: ReactNode;
  className?: string;
}

export function ModernCard({ children, className }: ModernCardProps) {
  return (
    <Card className={cn('p-3 sm:p-4 md:p-6 hover:shadow-lg transition-shadow', className)}>
      {children}
    </Card>
  );
}
