import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Trash2, XCircle, Pencil } from "lucide-react";
import { GroupPricing } from "../types/groupPricing.types";

interface GroupPricingActionsProps {
  pricing: GroupPricing;
  onEdit: (pricing: GroupPricing) => void;
  onDeactivate: (id: string) => void;
  onDelete: (id: string) => void;
}

export function GroupPricingActions({ 
  pricing, 
  onEdit, 
  onDeactivate, 
  onDelete 
}: GroupPricingActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-white">
        <DropdownMenuItem
          onClick={() => onEdit(pricing)}
          className="text-blue-600 hover:bg-blue-50"
        >
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        {pricing.status === "active" && (
          <DropdownMenuItem
            onClick={() => onDeactivate(pricing.id)}
            className="text-yellow-600 hover:bg-yellow-50"
          >
            <XCircle className="mr-2 h-4 w-4" />
            Deactivate
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() => onDelete(pricing.id)}
          className="text-red-600 hover:bg-red-50"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}