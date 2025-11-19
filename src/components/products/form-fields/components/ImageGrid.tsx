
import { ImagePreview } from "./ImagePreview";
import { ImageUploadButton } from "./ImageUploadButton";

interface ImageGridProps {
  previews: string[];
  uploading: boolean;
  onRemove: (index: number) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ImageGrid = ({ previews, uploading, onRemove, onUpload }: ImageGridProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {previews.map((preview, index) => (
        <ImagePreview
          key={index}
          src={preview}
          index={index}
          onRemove={onRemove}
        />
      ))}
      <ImageUploadButton
        uploading={uploading}
        hasExistingImages={previews.length > 0}
        onUpload={onUpload}
      />
    </div>
  );
};
