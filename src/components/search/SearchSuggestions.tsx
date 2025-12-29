import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Search, Package, Hash, Tag } from 'lucide-react';

interface SearchSuggestionsProps {
  searchQuery: string;
  onSuggestionClick: (suggestion: string) => void;
  className?: string;
}

const getSearchSuggestions = (query: string): Array<{text: string, type: 'size' | 'code' | 'category' | 'unit'}> => {
  const suggestions: Array<{text: string, type: 'size' | 'code' | 'category' | 'unit'}> = [];
  const q = query.toLowerCase().trim();
  
  // Size-based suggestions
  if (q.match(/^\d+/)) {
    const num = q.match(/^\d+/)?.[0];
    suggestions.push(
      { text: `${num}ml`, type: 'size' },
      { text: `${num}mg`, type: 'size' },
      { text: `${num}oz`, type: 'size' }
    );
  }
  
  // Unit suggestions
  const units = ['ml', 'mg', 'oz', 'lb', 'kg', 'g', 'tablet', 'capsule'];
  units.forEach(unit => {
    if (unit.includes(q) && unit !== q) {
      suggestions.push({ text: unit, type: 'unit' });
    }
  });
  
  // Container suggestions
  const containers = ['vial', 'bottle', 'box', 'case', 'pack'];
  containers.forEach(container => {
    if (container.includes(q) && container !== q) {
      suggestions.push({ text: container, type: 'category' });
    }
  });
  
  // Common pharmacy terms
  const terms = ['sterile', 'disposable', 'syringe', 'needle', 'label'];
  terms.forEach(term => {
    if (term.includes(q) && term !== q) {
      suggestions.push({ text: term, type: 'category' });
    }
  });
  
  return suggestions.slice(0, 6);
};

const getSuggestionIcon = (type: string) => {
  switch (type) {
    case 'size': return Package;
    case 'code': return Hash;
    case 'category': return Tag;
    case 'unit': return Package;
    default: return Search;
  }
};

const getSuggestionColor = (type: string) => {
  switch (type) {
    case 'size': return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200';
    case 'code': return 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200';
    case 'category': return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200';
    case 'unit': return 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200';
  }
};

export const SearchSuggestions: React.FC<SearchSuggestionsProps> = ({
  searchQuery,
  onSuggestionClick,
  className = ''
}) => {
  if (!searchQuery.trim() || searchQuery.length < 2) return null;
  
  const suggestions = getSearchSuggestions(searchQuery);
  
  if (suggestions.length === 0) return null;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-lg p-3 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <Search className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-600 font-medium">Search suggestions</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => {
          const Icon = getSuggestionIcon(suggestion.type);
          return (
            <Badge
              key={index}
              variant="outline"
              className={`cursor-pointer transition-colors ${getSuggestionColor(suggestion.type)}`}
              onClick={() => onSuggestionClick(suggestion.text)}
            >
              <Icon className="w-3 h-3 mr-1" />
              {suggestion.text}
            </Badge>
          );
        })}
      </div>
      
      <div className="mt-2 pt-2 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          💡 You can search by: Product name, SKU, size values, NDC/UPC codes, categories
        </p>
      </div>
    </div>
  );
};

export default SearchSuggestions;