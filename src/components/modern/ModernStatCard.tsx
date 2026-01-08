import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface ModernStatCardProps {
  title: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
  color?: 'blue' | 'red' | 'green' | 'purple' | 'orange';
  icon?: ReactNode;
  chart?: ReactNode;
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
}: ModernStatCardProps) {
  const colors = colorClasses[color];
  const [gradientClass, iconColorClass, bgClass] = colors.split(' ');

  return (
    <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass}`} />
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-1 sm:pb-2 relative p-4 sm:p-5 lg:p-6">
        <CardTitle className="text-sm font-medium text-gray-600 whitespace-nowrap">{title}</CardTitle>
        {icon && (
          <div className={`h-8 w-8 sm:h-9 sm:w-9 lg:h-10 lg:w-10 flex items-center justify-center ${bgClass} rounded-full flex-shrink-0 ml-2`}>
            <span className="scale-75 sm:scale-90 lg:scale-100">{icon}</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="relative p-4 sm:p-5 lg:p-6 pt-0">
        <div className="text-2xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">{value}</div>
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
