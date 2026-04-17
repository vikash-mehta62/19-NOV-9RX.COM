import { KeyboardEvent, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModernStatCardProps {
  title: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
  color?: 'blue' | 'red' | 'green' | 'purple' | 'orange';
  icon?: ReactNode;
  chart?: ReactNode;
  onClick?: () => void;
  actionLabel?: string;
}

const colorClasses = {
  blue: 'from-blue-50/50 to-transparent text-blue-600 bg-blue-100',
  red: 'from-red-50/50 to-transparent text-red-600 bg-red-100',
  green: 'from-green-50/50 to-transparent text-green-600 bg-green-100',
  purple: 'from-purple-50/50 to-transparent text-purple-600 bg-purple-100',
  orange: 'from-orange-50/50 to-transparent text-orange-600 bg-orange-100',
};

export function ModernStatCard({
  title,
  value,
  change,
  trend = 'neutral',
  subtitle,
  color = 'blue',
  icon,
  chart,
  onClick,
  actionLabel,
}: ModernStatCardProps) {
  const colors = colorClasses[color];
  const [gradientClass, iconColorClass, bgClass] = colors.split(' ');
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
        'relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1',
        isInteractive && 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2'
      )}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={actionLabel || title}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass}`} />
      <CardHeader className="relative space-y-3 pb-1 p-4 sm:flex sm:flex-row sm:items-start sm:justify-between sm:space-y-0 sm:pb-2 sm:p-5 lg:p-6">
        <CardTitle className="pr-2 text-sm font-medium leading-snug text-gray-600 whitespace-normal break-words">{title}</CardTitle>
        {icon && (
          <div className={`h-8 w-8 sm:h-9 sm:w-9 lg:h-10 lg:w-10 flex items-center justify-center ${bgClass} rounded-full flex-shrink-0 self-start sm:ml-2`}>
            <span className="scale-75 sm:scale-90 lg:scale-100">{icon}</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="relative p-4 sm:p-5 lg:p-6 pt-0">
        <div className="mb-1 break-words text-2xl font-bold leading-tight text-gray-900 sm:mb-2 sm:text-2xl lg:text-3xl">{value}</div>
        {(change || subtitle) && (
          <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm flex-wrap">
            {change && trend !== 'neutral' && (
              <span className={`flex items-center gap-0.5 sm:gap-1 font-medium ${
                trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend === 'up' ? (
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                ) : (
                  <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4" />
                )}
                {change}
              </span>
            )}
            {subtitle && <span className="text-gray-500">{subtitle}</span>}
          </div>
        )}
        {chart && <div className="mt-2 sm:mt-4">{chart}</div>}
      </CardContent>
    </Card>
  );
}
