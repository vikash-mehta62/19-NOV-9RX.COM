import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";

interface DateRangePickerProps {
  dateRange: { from: Date; to: Date };
  onDateRangeChange: (range: { from: Date; to: Date }) => void;
}

export function DateRangePicker({ dateRange, onDateRangeChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [tempRange, setTempRange] = useState(dateRange);

  const handleFromSelect = (date: Date | undefined) => {
    if (date) {
      setTempRange({ from: date, to: tempRange.to });
    }
  };

  const handleToSelect = (date: Date | undefined) => {
    if (date) {
      setTempRange({ from: tempRange.from, to: date });
    }
  };

  const handleApply = () => {
    onDateRangeChange(tempRange);
    setOpen(false);
  };

  const handleCancel = () => {
    setTempRange(dateRange);
    setOpen(false);
  };

  const presets = [
    { label: "Last 7 days", days: 7 },
    { label: "Last 30 days", days: 30 },
    { label: "Last 90 days", days: 90 },
    { label: "This Year", days: new Date().getDayOfYear() }
  ];

  const handlePreset = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    setTempRange({ from, to });
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (isOpen) {
          setTempRange(dateRange);
        }
      }}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="justify-start text-left font-normal">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {format(dateRange.from, "MMM dd, yyyy")} - {format(dateRange.to, "MMM dd, yyyy")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto max-w-[95vw] p-0" align="end" side="bottom" sideOffset={8}>
          <div className="p-3 border-b">
            <div className="grid grid-cols-2 gap-2">
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreset(preset.days)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 p-3 lg:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium text-center">Start Date</p>
              <Calendar
                mode="single"
                selected={tempRange.from}
                onSelect={handleFromSelect}
                initialFocus
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-center">End Date</p>
              <Calendar
                mode="single"
                selected={tempRange.to}
                onSelect={handleToSelect}
                disabled={(date) => date < tempRange.from}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 border-t p-3">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleApply}>
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Helper extension
declare global {
  interface Date {
    getDayOfYear(): number;
  }
}

Date.prototype.getDayOfYear = function() {
  const start = new Date(this.getFullYear(), 0, 0);
  const diff = this.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
};
