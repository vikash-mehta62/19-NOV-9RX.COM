import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Search, Filter, X, Calendar } from "lucide-react";
import { useState } from "react";
import { CSVLink } from "react-csv";
import { Badge } from "@/components/ui/badge";

interface FilterValues {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  search?: string;
}

interface InvoiceFiltersProps {
  onFilterChange: (filters: FilterValues) => void;
  exportInvoicesToCSV?: () => any[];
}

export function InvoiceFilters({ onFilterChange, exportInvoicesToCSV }: InvoiceFiltersProps) {
  const [filters, setFilters] = useState<FilterValues>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleFilterChange = (key: keyof FilterValues, value: string | number | undefined) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    setFilters({});
    onFilterChange({});
  };

  const activeFilterCount = Object.values(filters).filter(v => v && v !== "all").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by invoice number, customer, PO..."
            value={filters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="pl-10 pr-4 h-10 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
          />
          {filters.search && (
            <button
              onClick={() => handleFilterChange('search', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <Select
          value={filters.status || "all"}
          onValueChange={(value) => handleFilterChange('status', value)}
        >
          <SelectTrigger className="w-[160px] h-10 bg-white border-gray-200">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <SelectValue placeholder="All Status" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="paid">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                Paid
              </div>
            </SelectItem>
            <SelectItem value="unpaid">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                Unpaid
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Advanced Filters Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`h-10 gap-2 ${showAdvanced ? 'bg-blue-50 border-blue-200 text-blue-600' : ''}`}
        >
          <Calendar className="w-4 h-4" />
          Date Range
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 bg-blue-100 text-blue-700 text-xs px-1.5">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        {/* Clear Filters */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-10 text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}

        {/* Export Button */}
        {exportInvoicesToCSV && (
          <CSVLink 
            data={exportInvoicesToCSV()} 
            filename={`invoices_${new Date().toISOString().split('T')[0]}.csv`}
          >
            <Button variant="outline" className="h-10 gap-2 bg-white">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </CSVLink>
        )}
      </div>

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div className="flex flex-wrap items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 font-medium">From:</span>
            <Input
              type="date"
              value={filters.dateFrom || ''}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="w-[160px] h-9 bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 font-medium">To:</span>
            <Input
              type="date"
              value={filters.dateTo || ''}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="w-[160px] h-9 bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 font-medium">Amount:</span>
            <Input
              type="number"
              placeholder="Min"
              value={filters.amountMin || ''}
              onChange={(e) => handleFilterChange('amountMin', e.target.value ? Number(e.target.value) : undefined)}
              className="w-[100px] h-9 bg-white"
            />
            <span className="text-gray-400">-</span>
            <Input
              type="number"
              placeholder="Max"
              value={filters.amountMax || ''}
              onChange={(e) => handleFilterChange('amountMax', e.target.value ? Number(e.target.value) : undefined)}
              className="w-[100px] h-9 bg-white"
            />
          </div>
        </div>
      )}
    </div>
  );
}
