import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload } from "lucide-react";
import { useState } from "react";

interface Document {
  id: string;
  name: string;
  uploadedBy: string;
  uploadDate: Date;
  size: string;
}

export function DocumentSharing({ groupId }: { groupId: string }) {
  const { toast } = useToast();
  const [documents] = useState<Document[]>([]); // In a real app, this would use React Query

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // In a real app, this would make an API call
    // console.log("Uploading file:", { groupId, file });

    toast({
      title: "Document Uploaded",
      description: `${file.name} has been uploaded successfully.`,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Shared Documents</h3>
        <div className="flex items-center gap-2">
          <Input
            type="file"
            className="hidden"
            id="file-upload"
            onChange={handleFileUpload}
          />
          <Button asChild>
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </label>
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Uploaded By</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell>{doc.name}</TableCell>
              <TableCell>{doc.uploadedBy}</TableCell>
              <TableCell>{doc.uploadDate.toLocaleDateString()}</TableCell>
              <TableCell>{doc.size}</TableCell>
              <TableCell>
                <Button variant="ghost" size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}