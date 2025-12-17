import * as React from "react";
import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Download, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface StatementDateRangeSelectorProps {
  onDateRangeChange: (startDate: Date, endDate: Date) => void;
  onDownload: (startDate: Date, endDate: Date) => void;
  isGenerating: boolean;
  maxDateRange?: number; // days
  className?: string;
}

export function StatementDateRangeSelector({
  onDateRangeChange,
  onDownload,
  isGenerating,
  maxDateRange = 365, // Default to 1 year max range
  className,
}: StatementDateRangeSelectorProps) {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [validationError, setValidationError] = useState<string>("");

  // Validate date range
  const validateDateRange = (start?: Date, end?: Date): string => {
    if (!start || !end) {
      return "Please select both start and end dates";
    }

    if (start >= end) {
      return "Start date must be before end date";
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    if (start > today) {
      return "Start date cannot be in the future";
    }

    if (end > today) {
      return "End date cannot be in the future";
    }

    const daysDifference = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDifference > maxDateRange) {
      return `Date range cannot exceed ${maxDateRange} days`;
    }

    return "";
  };

  // Handle start date change
  const handleStartDateChange = (date?: Date) => {
    setStartDate(date);
    setStartDateOpen(false);
    
    if (date && endDate) {
      const error = validateDateRange(date, endDate);
      setValidationError(error);
      if (!error) {
        onDateRangeChange(date, endDate);
      }
    } else {
      setValidationError("");
    }
  };

  // Handle end date change
  const handleEndDateChange = (date?: Date) => {
    setEndDate(date);
    setEndDateOpen(false);
    
    if (startDate && date) {
      const error = validateDateRange(startDate, date);
      setValidationError(error);
      if (!error) {
        onDateRangeChange(startDate, date);
      }
    } else {
      setValidationError("");
    }
  };

  // Handle download button click
  const handleDownload = () => {
    if (startDate && endDate && !validationError) {
      onDownload(startDate, endDate);
    }
  };

  // Check if download should be enabled
  const isDownloadEnabled = startDate && endDate && !validationError && !isGenerating;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Date Range Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Start Date Picker */}
        <div className="space-y-2">
          <Label htmlFor="start-date">Start Date</Label>
          <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
            <PopoverTrigger asChild>
              <Button
                id="start-date"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !startDate && "text-muted-foreground",
                  validationError && startDate && "border-red-500"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP") : <span>Select start date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={handleStartDateChange}
                disabled={(date) => date > new Date() || (endDate && date >= endDate)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* End Date Picker */}
        <div className="space-y-2">
          <Label htmlFor="end-date">End Date</Label>
          <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
            <PopoverTrigger asChild>
              <Button
                id="end-date"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !endDate && "text-muted-foreground",
                  validationError && endDate && "border-red-500"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP") : <span>Select end date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={handleEndDateChange}
                disabled={(date) => date > new Date() || (startDate && date <= startDate)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Validation Error Display */}
      {validationError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      {/* Download Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleDownload}
          disabled={!isDownloadEnabled}
          className="min-w-[200px]"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Generating Statement...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Download Statement
            </>
          )}
        </Button>
      </div>

      {/* Helper Text */}
      <div className="text-sm text-muted-foreground">
        <p>Select a date range to generate your account statement.</p>
        <p>Maximum date range: {maxDateRange} days</p>
      </div>
    </div>
  );
}