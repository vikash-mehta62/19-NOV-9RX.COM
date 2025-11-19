import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StatusFilterProps {
  value: string;
  type?: string;
  onValueChange: (value: string) => void;
}

export const StatusFilter = ({ value, onValueChange,type }: StatusFilterProps) => {
 console.log(type)
 
 return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Filter by status" />
      </SelectTrigger>
  { type == "status" &&    <SelectContent>
        <SelectItem value="all">All Orders</SelectItem>
        <SelectItem value="paid">Paid</SelectItem>
        <SelectItem value="unpaid">Pending</SelectItem>
        {/* <SelectItem value="shipped">Shipped</SelectItem> */}
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