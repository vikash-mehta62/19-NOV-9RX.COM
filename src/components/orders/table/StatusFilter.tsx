import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown } from "lucide-react";

interface StatusFilterProps {
  value: string | string[];
  type?: string;
  multiSelect?: boolean;
  onValueChange: (value: string | string[]) => void;
}

const orderStatusOptions = [
  { value: "new", label: "New" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "cancelled", label: "Cancelled" },
  { value: "voided", label: "Voided" },
];

export const StatusFilter = ({ value, onValueChange, type, multiSelect = false }: StatusFilterProps) => {
  const selectedValues = Array.isArray(value) ? value : value === "all" ? [] : [value];

  if (!type && multiSelect) {
    const triggerLabel =
      selectedValues.length === 0
        ? "All Status"
        : selectedValues.length === 1
          ? orderStatusOptions.find((option) => option.value === selectedValues[0])?.label || "Status"
          : `${selectedValues.length} selected`;

    const toggleValue = (nextValue: string) => {
      const nextSelected = selectedValues.includes(nextValue)
        ? selectedValues.filter((item) => item !== nextValue)
        : [...selectedValues, nextValue];

      onValueChange(nextSelected.length === 0 ? "all" : nextSelected);
    };

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-[180px] justify-between font-normal">
            <span className="truncate">{triggerLabel}</span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[220px]">
          <DropdownMenuLabel>Filter Status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={selectedValues.length === 0}
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={() => onValueChange("all")}
          >
            All Status
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          {orderStatusOptions.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={selectedValues.includes(option.value)}
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={() => toggleValue(option.value)}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

 return (
    <Select value={Array.isArray(value) ? "all" : value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Filter by status" />
      </SelectTrigger>
{ type == "status" &&    <SelectContent>
        <SelectItem value="all">All Payment</SelectItem>
        <SelectItem value="paid">Paid</SelectItem>
        <SelectItem value="unpaid">Unpaid</SelectItem>
        <SelectItem value="pending">Pending</SelectItem>
        <SelectItem value="partial">Partial</SelectItem>
      </SelectContent>}


{ !type  &&
        <SelectContent>
        <SelectItem value="all">All Status</SelectItem>
        <SelectItem value="new">New</SelectItem>
        <SelectItem value="shipped">Shipped</SelectItem>
        <SelectItem value="processing">Processing</SelectItem>
        {/* <SelectItem value="shipped">Shipped</SelectItem> */}
      </SelectContent>}
    </Select>
  );
};
