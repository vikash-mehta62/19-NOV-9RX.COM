
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface ImagePreviewProps {
  src: string;
  index: number;
  onRemove: (index: number) => void;
}

export const ImagePreview = ({ src, index, onRemove }: ImagePreviewProps) => {
  return (
    <div className="relative aspect-square border rounded-lg overflow-hidden">
      <img
        src={src}
        alt={`Product preview ${index + 1}`}
        className="w-full h-full object-contain"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.src = '/placeholder.svg';
        }}
      />
      <Button
        type="button"
        variant="destructive"
        size="icon"
        className="absolute top-2 right-2"
        onClick={() => onRemove(index)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
