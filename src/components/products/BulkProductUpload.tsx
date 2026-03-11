import { useMemo, useState } from "react";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ProductFormValues } from "@/components/products/schemas/productSchema";
import {
  buildSampleImportCsv,
  parseBulkImportFile,
  ParsedBulkImport,
} from "@/components/products/utils/bulkImport";

interface BulkProductUploadProps {
  onUploadComplete: (products: ProductFormValues[]) => Promise<void>;
}

export const BulkProductUpload = ({ onUploadComplete }: BulkProductUploadProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedBulkImport | null>(null);
  const [fileName, setFileName] = useState("");

  const previewProducts = useMemo(
    () => parsedData?.products.slice(0, 6) ?? [],
    [parsedData]
  );

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsParsing(true);
      const parsed = await parseBulkImportFile(file);
      setParsedData(parsed);
      setFileName(file.name);

      toast({
        title: "File ready",
        description: `${parsed.products.length} products prepared for import.`,
      });
    } catch (error) {
      setParsedData(null);
      setFileName("");
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unable to parse file.",
        variant: "destructive",
      });
    } finally {
      setIsParsing(false);
      event.target.value = "";
    }
  };

  const handleImport = async () => {
    if (!parsedData?.products.length) return;

    try {
      setIsImporting(true);
      await onUploadComplete(parsedData.products);
      setOpen(false);
      setParsedData(null);
      setFileName("");
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const content = buildSampleImportCsv();
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "product-import-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Import Products
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl p-0 overflow-hidden">
        <DialogHeader className="border-b bg-slate-50 px-6 py-5">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            Bulk Product Import
          </DialogTitle>
          <DialogDescription>
            Upload `.csv` or `.json`, review the mapped products, then import them into the catalog.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-0 lg:grid-cols-[320px_1fr]">
          <div className="border-r bg-white px-6 py-5">
            <div className="rounded-2xl border border-dashed border-blue-300 bg-blue-50/60 p-5">
              <p className="text-sm font-semibold text-slate-900">Upload file</p>
              <p className="mt-1 text-sm text-slate-600">
                Supports common supplier exports, including fields like `PRODUCT`, `CATEGORY`, `SIZE`, `RATE_CS`, and `QTY_CASE`.
              </p>

              <input
                id="bulk-product-upload"
                type="file"
                accept=".csv,.json"
                className="hidden"
                onChange={handleFileUpload}
              />

              <label htmlFor="bulk-product-upload" className="mt-4 block">
                <Button
                  type="button"
                  asChild
                  className="w-full cursor-pointer bg-blue-600 hover:bg-blue-700"
                  disabled={isParsing || isImporting}
                >
                  <span>{isParsing ? "Parsing file..." : "Choose file"}</span>
                </Button>
              </label>

              <Button
                type="button"
                variant="ghost"
                className="mt-3 w-full justify-start"
                onClick={handleDownloadTemplate}
              >
                <Download className="mr-2 h-4 w-4" />
                Download sample CSV
              </Button>
            </div>

            <div className="mt-5 space-y-3">
              <p className="text-sm font-semibold text-slate-900">Import rules</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">CSV</Badge>
                <Badge variant="secondary">JSON</Badge>
                <Badge variant="secondary">Grouped by SKU/name</Badge>
                <Badge variant="secondary">Size rows supported</Badge>
              </div>
              <p className="text-sm text-slate-600">
                Missing descriptions, stock settings, and default size details are filled automatically so the products can be created cleanly.
              </p>
            </div>
          </div>

          <div className="bg-white">
            <div className="px-6 py-5">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Preview</p>
                  <p className="text-sm text-slate-500">
                    {fileName ? `Loaded from ${fileName}` : "No file selected yet"}
                  </p>
                </div>
                {parsedData && (
                  <>
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                      {parsedData.products.length} products
                    </Badge>
                    <Badge variant="outline">{parsedData.sourceRowCount} source rows</Badge>
                    <Badge variant="outline">{parsedData.format.toUpperCase()}</Badge>
                  </>
                )}
              </div>
            </div>

            <Separator />

            {!parsedData ? (
              <div className="flex min-h-[360px] items-center justify-center px-6 py-10 text-center">
                <div className="max-w-md">
                  <FileSpreadsheet className="mx-auto h-12 w-12 text-slate-300" />
                  <p className="mt-4 text-base font-medium text-slate-900">Upload a supplier file to start</p>
                  <p className="mt-2 text-sm text-slate-500">
                    You will see product counts, detected columns, row-level issues, and a product preview before anything is inserted.
                  </p>
                </div>
              </div>
            ) : (
              <ScrollArea className="h-[420px]">
                <div className="space-y-5 px-6 py-5">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl border bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Detected columns</p>
                      <p className="mt-1 text-2xl font-semibold text-slate-900">{parsedData.columns.length}</p>
                    </div>
                    <div className="rounded-xl border bg-emerald-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-emerald-600">Valid products</p>
                      <p className="mt-1 text-2xl font-semibold text-emerald-700">{parsedData.products.length}</p>
                    </div>
                    <div className="rounded-xl border bg-amber-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-amber-600">Issues</p>
                      <p className="mt-1 text-2xl font-semibold text-amber-700">{parsedData.issues.length}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-900">Mapped columns</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {parsedData.columns.slice(0, 20).map((column) => (
                        <Badge key={column} variant="outline">
                          {column}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-900">Product preview</p>
                    <div className="mt-3 grid gap-3">
                      {previewProducts.map((product) => (
                        <div key={`${product.sku}-${product.name}`} className="rounded-xl border p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-900">{product.name}</p>
                              <p className="text-sm text-slate-500">
                                {product.category}
                                {product.subcategory ? ` / ${product.subcategory}` : ""}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-slate-900">${product.base_price.toFixed(2)}</p>
                              <p className="text-xs text-slate-500">{product.sizes.length} size rows</p>
                            </div>
                          </div>
                          <p className="mt-2 line-clamp-2 text-sm text-slate-600">{product.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {parsedData.issues.length > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <p className="text-sm font-semibold text-amber-800">Rows skipped during import prep</p>
                      </div>
                      <div className="mt-3 space-y-2">
                        {parsedData.issues.slice(0, 8).map((issue) => (
                          <p key={`${issue.row}-${issue.message}`} className="text-sm text-amber-700">
                            Row {issue.row}: {issue.message}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {parsedData.issues.length === 0 && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <p className="text-sm font-semibold text-emerald-800">
                          No blocking issues detected in the uploaded file.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <DialogFooter className="border-t bg-slate-50 px-6 py-4">
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false);
              setParsedData(null);
              setFileName("");
            }}
            disabled={isImporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!parsedData?.products.length || isImporting || isParsing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isImporting ? "Importing..." : `Import ${parsedData?.products.length ?? 0} Products`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
