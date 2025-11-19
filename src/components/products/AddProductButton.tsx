
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface AddProductButtonProps {
  onClick: () => void;
}

export const AddProductButton = ({ onClick }: AddProductButtonProps) => {
  return (
    <Button onClick={onClick} className="flex items-center gap-2">
      <Plus className="h-4 w-4" />
      Add Product
    </Button>
  );
};
