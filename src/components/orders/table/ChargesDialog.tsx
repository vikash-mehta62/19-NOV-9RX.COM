import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function ChargesDialog({ open, onOpenChange, onSubmit }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (handling: number, fred: number) => void;
}) {
  const [handling, setHandling] = useState("");
  const [fred, setFred] = useState("");

  const handleSubmit = () => {
    const h = parseFloat(handling);
    const f = parseFloat(fred);
    if (!isNaN(h) && !isNaN(f)) {
      onSubmit(h, f);
      onOpenChange(false);
    } else {
      alert("Please enter valid numbers");
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-[99998]" />
        <Dialog.Content className="fixed z-[99999] top-1/2 left-1/2 w-[90vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg space-y-4">
          <div className="flex justify-between items-center">
            <Dialog.Title className="text-lg font-semibold">Enter Charges</Dialog.Title>
            <Dialog.Close>
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>
          <div className="space-y-2">
            <input
              type="number"
              placeholder="Handling Shipping Charges"
              className="w-full border rounded p-2"
              value={handling}
              onChange={(e) => setHandling(e.target.value)}
            />
            <input
              type="number"
// Freight Charges
              placeholder="Tax"
              className="w-full border rounded p-2"
              value={fred}
              onChange={(e) => setFred(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Submit
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
