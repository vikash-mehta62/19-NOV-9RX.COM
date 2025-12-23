import * as React from "react";
import { useState } from "react";
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear } from "date-fns";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StatementDateRangeSelectorProps {
  onDateRangeChange: (startDate: Date, endDate: Date) => void;
  onDownload: (startDate: Date, endDate: Date) => void;
  isGenerating: boolean;
  maxDateRange?: number; // days
  className?: string;
}

// Date preset options
const datePresets = [
  { label: "Last 7 days", value: "7days" },
  { label: "Last 30 days", value: "30days" },
  { label: "Last 60 days", value: "60days" },
  { label: "Last 90 days", value: "90days" },
  { label: "This Month", value: "thisMonth" },
  { label: "Last Month", value: "lastMonth" },
  { label: "Last 3 Months", value: "3months" },
  { label: "Last 6 Months", value: "6months" },
  { label: "Year to Date", value: "ytd" },
  { label: "Last Year", value: "lastYear" },
  { label: "Custom Range", value: "custom" },
];

export function StatementDateRangeSelector({
  onDateRangeChange,
  onDownload,
  isGenerating,
  maxDateRange = 365,
  className,
}: StatementDateRangeSelectorProps) {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [validationError, setValidationError] = useState<string>("");
  const [selectedPreset, setSelectedPreset] = useState<string>("");

  // Calculate dates based on preset
  const applyPreset = (preset: string) => {
    setSelectedPreset(preset);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    let start: Date | undefined;
    let end: Date = today;

    switch (preset) {
      case "7days":
        start = subDays(today, 7);
        break;
      case "30days":
        start = subDays(today, 30);
        break;
      case "60days":
        start = subDays(today, 60);
        break;
      case "90days":
        start = subDays(today, 90);
        break;
      case "thisMonth":
        start = startOfMonth(today);
        end = today;
        break;
      case "lastMonth":
        const lastMonth = subMonths(today, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      case "3months":
        start = subMonths(today, 3);
        break;
      case "6months":
        start = subMonths(today, 6);
        break;
      case "ytd":
        start = startOfYear(today);
        break;
      case "lastYear":
        const lastYear = new Date(today.getFullYear() - 1, 0, 1);
        start = lastYear;
        end = new Date(today.getFullYear() - 1, 11, 31);
        break;
      case "custom":
        // Don't change dates, let user select manually
        return;
      default:
        return;
    }

    if (start) {
      setStartDate(start);
      setEndDate(end);
      const error = validateDateRange(start, end);
      setValidationError(error);
      if (!error) {
        onDateRangeChange(start, end);
      }
    }
  };

  // Validate date range
  const validateDateRange = (start?: Date, end?: Date): string => {
    if (!start || !end) {
      return "Please select both start and end dates";
    }

    if (start >= end) {
      return "Start date must be before end date";
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    if (start > today) {
      return "Start date cannot be in the future";
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
    setSelectedPreset("custom");
    
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
    setSelectedPreset("custom");
    
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
      {/* Quick Date Presets */}
      <div className="space-y-2">
        <Label>Quick Select</Label>
        <Select value={selectedPreset} onValueChange={applyPreset}>
          <SelectTrigger className="w-full md:w-[250px]">
            <SelectValue placeholder="Select date range..." />
          </SelectTrigger>
          <SelectContent>
            {datePresets.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
            <PopoverContent className="w-auto p-0" align="start" side="bottom" sideOffset={4}>
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
            <PopoverContent className="w-auto p-0" align="start" side="bottom" sideOffset={4}>
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

      {/* Selected Range Display */}
      {startDate && endDate && !validationError && (
        <div className="p-3 bg-muted rounded-lg text-sm">
          <span className="font-medium">Selected Range: </span>
          {format(startDate, "MMM d, yyyy")} - {format(endDate, "MMM d, yyyy")}
          <span className="text-muted-foreground ml-2">
            ({Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} days)
          </span>
        </div>
      )}

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
