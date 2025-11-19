
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

interface ImageUploadButtonProps {
  uploading: boolean;
  hasExistingImages: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ImageUploadButton = ({ uploading, hasExistingImages, onUpload }: ImageUploadButtonProps) => {
  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-primary/50 transition-colors">
      <div className="flex flex-col items-center space-y-4">
        <div className="p-3 bg-primary/10 rounded-full">
          <Upload className="h-6 w-6 text-primary" />
        </div>
        <div className="text-center">
          <Button
            type="button"
            variant="outline"
            className="relative"
            disabled={uploading}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = (e) => onUpload(e as any);
              input.click();
            }}
          >
            {uploading ? "Uploading..." : hasExistingImages ? "Add Another Image" : "Upload Image"}
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            PNG, JPG or GIF (max. 5MB)
          </p>
        </div>
      </div>
    </div>
  );
};
