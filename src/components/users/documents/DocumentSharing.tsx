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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, FileText } from "lucide-react";
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
    <TooltipProvider>
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild>
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </label>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Upload a document to share with the group</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground mt-2 font-medium">No documents shared yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Upload documents to share with all locations in this group
            </p>
            <Button asChild className="mt-4">
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                Upload First Document
              </label>
            </Button>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Uploaded By</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead className="hidden sm:table-cell">Size</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.name}</TableCell>
                    <TableCell className="hidden sm:table-cell">{doc.uploadedBy}</TableCell>
                    <TableCell className="hidden md:table-cell">{doc.uploadDate.toLocaleDateString()}</TableCell>
                    <TableCell className="hidden sm:table-cell">{doc.size}</TableCell>
                    <TableCell className="text-right">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Download document</TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}