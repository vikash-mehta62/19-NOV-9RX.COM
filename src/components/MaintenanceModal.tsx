import { AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const MaintenanceModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Show modal after a short delay
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-amber-100 rounded-full">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <DialogTitle className="text-xl">Website Maintenance Notice</DialogTitle>
          </div>
          <div className="text-base space-y-3 pt-2">
            <p className="font-semibold text-gray-900">
              🚧 We are currently upgrading our website
            </p>
            <p>
              Our team is working to improve your experience. During this time, you may encounter:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-2">
              <li>Temporary service interruptions</li>
              <li>Slower response times</li>
              <li>Some features may be unavailable</li>
            </ul>
            <p className="text-sm text-gray-600 mt-3">
              We appreciate your patience and understanding. Thank you for being with us!
            </p>
          </div>
        </DialogHeader>
        <div className="flex justify-end gap-3 mt-4">
          <Button
            onClick={handleClose}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            I Understand
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MaintenanceModal;
