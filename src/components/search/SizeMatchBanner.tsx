import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Package, Search } from 'lucide-react';

interface SizeMatchBannerProps {
  searchQuery: string;
  matchingCount: number;
  className?: string;
}

export const SizeMatchBanner: React.FC<SizeMatchBannerProps> = ({
  searchQuery,
  matchingCount,
  className = ''
}) => {
  if (!searchQuery.trim() || matchingCount === 0) return null;

  return (
    <div className={`bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4 ${className}`}>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Search className="w-4 h-4 text-emerald-600" />
          <Package className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-emerald-800">
            <span className="font-medium">Size Match Found!</span> 
            {' '}Found <span className="font-semibold">{matchingCount}</span> product{matchingCount > 1 ? 's' : ''} with size "{searchQuery}"
          </p>
          <p className="text-xs text-emerald-600 mt-1">
            💡 Matching sizes are highlighted and expanded automatically
          </p>
        </div>
        <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-emerald-300">
          Size Search
        </Badge>
      </div>
    </div>
  );
};

export default SizeMatchBanner;