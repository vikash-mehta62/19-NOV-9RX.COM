import React, { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { OrderStatementDateSelectorProps } from '@/types/orderStatement';

/**
 * OrderStatementDateSelector Component
 * Provides date range selection interface for order statement generation
 * Requirements: 1.2, 1.3, 1.4, 1.5, 5.2
 */
export const OrderStatementDateSelector: React.FC<OrderStatementDateSelectorProps> = ({
  onDateRangeChange,
  onDownload,
  isGenerating,
  maxDateRange = 365, // Default to 1 year max
  className
}) => {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [dateError, setDateError] = useState<string>('');

  /**
   * Validate date range according to requirements 1.3, 1.4, 1.5
   */
  const validateDateRange = (start: Date, end?: Date): string => {
    if (!start) {
      return 'Start date is required';
    }

    const now = new Date();
    const actualEnd = end || now;

    // Requirement 1.3: Start date must be before end date
    if (start >= actualEnd) {
      return 'Start date must be before end date';
    }

    // Check maximum date range
    const daysDifference = Math.ceil((actualEnd.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDifference > maxDateRange) {
      return `Date range cannot exceed ${maxDateRange} days`;
    }

    // Prevent future dates
    if (start > now) {
      return 'Start date cannot be in the future';
    }

    if (end && end > now) {
      return 'End date cannot be in the future';
    }

    return '';
  };

  /**
   * Handle start date selection
   */
  const handleStartDateSelect = (date: Date | undefined) => {
    if (date) {
      setStartDate(date);
      const error = validateDateRange(date, endDate);
      setDateError(error);
      
      if (!error) {
        onDateRangeChange(date, endDate);
      }
    }
    setStartDateOpen(false);
  };

  /**
   * Handle end date selection
   */
  const handleEndDateSelect = (date: Date | undefined) => {
    setEndDate(date);
    
    if (startDate) {
      const error = validateDateRange(startDate, date);
      setDateError(error);
      
      if (!error) {
        onDateRangeChange(startDate, date);
      }
    }
    setEndDateOpen(false);
  };

  /**
   * Handle download button click
   */
  const handleDownload = () => {
    if (startDate && !dateError) {
      onDownload(startDate, endDate);
    }
  };

  /**
   * Clear date selection
   */
  const handleClear = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setDateError('');
  };

  return (
    <div className={cn("space-y-4 p-4 border rounded-lg bg-white", className)}>
      <div className="flex flex-col space-y-2">
        <h3 className="text-lg font-semibold">Download Order Statement</h3>
        <p className="text-sm text-gray-600">
          Select a date range to generate your order statement
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Start Date Picker */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Start Date *</label>
          <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP") : "Select start date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={handleStartDateSelect}
                disabled={(date) => date > new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* End Date Picker */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            End Date 
            <span className="text-xs text-gray-500 ml-1">(optional, defaults to today)</span>
          </label>
          <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP") : "Select end date (optional)"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={handleEndDateSelect}
                disabled={(date) => date > new Date() || (startDate && date <= startDate)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Error Display */}
      {dateError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{dateError}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={handleClear}
          disabled={!startDate && !endDate}
        >
          Clear
        </Button>

        <Button
          onClick={handleDownload}
          disabled={!startDate || !!dateError || isGenerating}
          className="flex items-center space-x-2"
        >
          <Download className="h-4 w-4" />
          <span>
            {isGenerating ? 'Generating...' : 'Download Statement'}
          </span>
        </Button>
      </div>

      {/* Date Range Summary */}
      {startDate && !dateError && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-700">
            Statement period: {format(startDate, "PPP")} to {endDate ? format(endDate, "PPP") : "Today"}
          </p>
        </div>
      )}
    </div>
  );
};