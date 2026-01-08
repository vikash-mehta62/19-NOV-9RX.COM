import React from 'react';
import { Badge } from '@/components/ui/badge';
import { SearchMatch } from '@/utils/searchHighlight';
import { Search, Tag, Package, Hash } from 'lucide-react';

interface SearchMatchIndicatorProps {
  matches: SearchMatch[];
  searchQuery: string;
  className?: string;
}

const getMatchIcon = (field: string) => {
  if (field.includes('SKU') || field.includes('Code')) return Hash;
  if (field.includes('Size')) return Package;
  if (field.includes('Category')) return Tag;
  return Search;
};

const getMatchColor = (matchType: 'exact' | 'partial') => {
  return matchType === 'exact' 
    ? 'bg-blue-100 text-blue-800 border-blue-200' 
    : 'bg-blue-100 text-blue-800 border-blue-200';
};

export const SearchMatchIndicator: React.FC<SearchMatchIndicatorProps> = ({
  matches,
  searchQuery,
  className = ''
}) => {
  if (!matches.length || !searchQuery.trim()) return null;

  // Show only the most relevant matches (max 3)
  const topMatches = matches
    .sort((a, b) => {
      // Prioritize exact matches
      if (a.matchType === 'exact' && b.matchType === 'partial') return -1;
      if (a.matchType === 'partial' && b.matchType === 'exact') return 1;
      
      // Prioritize product name and SKU matches
      const priorityFields = ['Product Name', 'Product SKU', 'Size'];
      const aPriority = priorityFields.some(field => a.field.includes(field));
      const bPriority = priorityFields.some(field => b.field.includes(field));
      
      if (aPriority && !bPriority) return -1;
      if (!aPriority && bPriority) return 1;
      
      return 0;
    })
    .slice(0, 3);

  return (
    <div className={`flex flex-wrap gap-1 mt-1 ${className}`}>
      {topMatches.map((match, index) => {
        const Icon = getMatchIcon(match.field);
        return (
          <Badge
            key={index}
            variant="outline"
            className={`text-xs px-2 py-0.5 ${getMatchColor(match.matchType)}`}
            title={`Found in ${match.field}: "${match.value}"`}
          >
            <Icon className="w-3 h-3 mr-1" />
            {match.field}
            {match.matchType === 'exact' && (
              <span className="ml-1 text-xs">✓</span>
            )}
          </Badge>
        );
      })}
    </div>
  );
};

export default SearchMatchIndicator;