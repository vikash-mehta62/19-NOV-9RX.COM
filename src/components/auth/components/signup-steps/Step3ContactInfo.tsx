import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignupFormData } from "../../types/signup.types";
import { FileText, Upload, X, Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useRef } from "react";

interface Step3Props {
  formData: SignupFormData;
  onChange: (field: keyof SignupFormData, value: any) => void;
  isLoading: boolean;
}

export const Step3ContactInfo = ({ formData, onChange, isLoading }: Step3Props) => {
  const [dragActive, setDragActive] = useState(false);
  const [taxDragActive, setTaxDragActive] = useState(false);
  const businessLicenseRef = useRef<HTMLInputElement>(null);
  const taxCertificateRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent, setActive: (v: boolean) => void) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setActive(true);
    } else if (e.type === "dragleave") {
      setActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent, type: 'business' | 'tax') => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setTaxDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      const currentFiles = formData.documents || [];
      onChange("documents", [...currentFiles, ...newFiles]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      const currentFiles = formData.documents || [];
      onChange("documents", [...currentFiles, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    const currentFiles = formData.documents || [];
    const newFiles = currentFiles.filter((_, i) => i !== index);
    onChange("documents", newFiles);
  };

  return (
    <div className="space-y-5">
      {/* Section Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
          <FileText className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Business Documents</h3>
          <p className="text-sm text-gray-500">Legal information for your account</p>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800">Why we need this information:</p>
            <ul className="text-xs text-blue-700 mt-1 space-y-0.5 list-disc list-inside">
              <li>To verify your business is legally registered</li>
              <li>For tax compliance and invoicing purposes</li>
              <li>To establish credit terms for your account</li>
              <li>Required for wholesale product transactions</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Legal Business Name */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-gray-700">Legal Business Name</Label>
        <div className="relative">
          <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="As registered with the state"
            value={formData.pharmacyLicense}
            onChange={(e) => onChange("pharmacyLicense", e.target.value)}
            disabled={isLoading}
            className="pl-10 h-12 rounded-lg border-gray-200 focus:border-blue-500"
          />
        </div>
        <p className="text-xs text-gray-400">Leave blank if same as store name</p>
      </div>

      {/* Business Type */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-gray-700">Business Type</Label>
        <Select
          value={formData.department || ""}
          onValueChange={(value) => onChange("department", value)}
          disabled={isLoading}
        >
          <SelectTrigger className="h-12 rounded-lg border-gray-200 focus:border-blue-500">
            <SelectValue placeholder="Select business type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sole_proprietorship">Sole Proprietorship</SelectItem>
            <SelectItem value="partnership">Partnership</SelectItem>
            <SelectItem value="llc">LLC</SelectItem>
            <SelectItem value="corporation">Corporation</SelectItem>
            <SelectItem value="non_profit">Non-Profit</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tax ID / EIN */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-gray-700">Tax ID / EIN</Label>
        <div className="relative">
          <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="XX-XXXXXXX"
            value={formData.taxId || ""}
            onChange={(e) => onChange("taxId", e.target.value)}
            disabled={isLoading}
            className="pl-10 h-12 rounded-lg border-gray-200 focus:border-blue-500"
          />
        </div>
        <p className="text-xs text-gray-400">Federal Employer Identification Number</p>
      </div>

      {/* Document Uploads Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4 text-gray-600" />
          <Label className="text-sm font-medium text-gray-700">
            Document Uploads <span className="text-gray-400 font-normal">(Optional - can be added later)</span>
          </Label>
        </div>

        {/* Business License Upload */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-600">Business License</Label>
          <div
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 ${
              dragActive ? "border-blue-500 bg-blue-50" : "border-gray-200"
            }`}
            onDragEnter={(e) => handleDrag(e, setDragActive)}
            onDragLeave={(e) => handleDrag(e, setDragActive)}
            onDragOver={(e) => handleDrag(e, setDragActive)}
            onDrop={(e) => handleDrop(e, 'business')}
            onClick={() => businessLicenseRef.current?.click()}
          >
            <input
              ref={businessLicenseRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isLoading}
            />
            <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">Click to upload business license</p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG or PDF (max 5MB)</p>
          </div>
        </div>

        {/* Tax Certificate Upload */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-600">Tax Certificate / Resale Permit</Label>
          <div
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 ${
              taxDragActive ? "border-blue-500 bg-blue-50" : "border-gray-200"
            }`}
            onDragEnter={(e) => handleDrag(e, setTaxDragActive)}
            onDragLeave={(e) => handleDrag(e, setTaxDragActive)}
            onDragOver={(e) => handleDrag(e, setTaxDragActive)}
            onDrop={(e) => handleDrop(e, 'tax')}
            onClick={() => taxCertificateRef.current?.click()}
          >
            <input
              ref={taxCertificateRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isLoading}
            />
            <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">Click to upload tax certificate</p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG or PDF (max 5MB)</p>
          </div>
        </div>

        {/* Uploaded Files List */}
        {formData.documents && formData.documents.length > 0 && (
          <div className="space-y-2 mt-3">
            {formData.documents.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-100"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-gray-700 truncate max-w-[200px]">
                    {file.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  disabled={isLoading}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Note */}
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mt-3">
          <p className="text-xs text-amber-700">
            <span className="font-medium">Note:</span> Additional documents (W-9, ID verification, etc.) may be requested after registration to complete your account setup and establish credit terms.
          </p>
        </div>
      </div>
    </div>
  );
};
