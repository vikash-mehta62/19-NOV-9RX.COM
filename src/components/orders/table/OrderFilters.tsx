import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon, Download } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface OrderFiltersProps {
  onSearch: (value: string) => void;
  onDateChange: (dates: { from: Date | undefined; to: Date | undefined }) => void;
  onExport: () => void;
}

export function OrderFilters({ onSearch, onDateChange, onExport }: OrderFiltersProps) {
  const [date, setDate] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
      <div className="flex gap-2 w-full sm:w-auto">
        <Input
          placeholder="Search orders..."
          onChange={(e) => onSearch(e.target.value)}
          className="w-full sm:w-[300px]"
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, "LLL dd, y")} -{" "}
                    {format(date.to, "LLL dd, y")}
                  </>
                ) : (
                  format(date.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={(selectedDate: any) => {
                setDate(selectedDate);
                onDateChange(selectedDate);
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>
      {/* <Button onClick={onExport} variant="outline">
        <Download className="mr-2 h-4 w-4" />
        Export Orders
      </Button> */}
    </div>
  );
}