/**
 * Draft Recovery Dialog
 * Shows when user has unsaved drafts and offers to restore them
 */
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Clock,
  ShoppingCart,
  User,
  Trash2,
  RefreshCw,
  Plus,
} from "lucide-react";
import {
  getDraftsList,
  getDraft,
  deleteDraft,
  formatDraftDate,
  OrderDraft,
  DraftListItem,
} from "@/services/orderDraftService";

interface DraftRecoveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestoreDraft: (draft: OrderDraft) => void;
  onStartNew: () => void;
}

export function DraftRecoveryDialog({
  open,
  onOpenChange,
  onRestoreDraft,
  onStartNew,
}: DraftRecoveryDialogProps) {
  const [drafts, setDrafts] = useState<DraftListItem[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Load drafts when dialog opens
  useEffect(() => {
    if (open) {
      const list = getDraftsList();
      setDrafts(list);
      if (list.length > 0) {
        setSelectedDraftId(list[0].id);
      }
    }
  }, [open]);

  const handleRestore = () => {
    if (!selectedDraftId) return;
    
    const draft = getDraft(selectedDraftId);
    if (draft) {
      onRestoreDraft(draft);
      onOpenChange(false);
    }
  };

  const handleDelete = async (draftId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(draftId);
    
    // Small delay for UX
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    deleteDraft(draftId);
    setDrafts((prev) => prev.filter((d) => d.id !== draftId));
    
    if (selectedDraftId === draftId) {
      const remaining = drafts.filter((d) => d.id !== draftId);
      setSelectedDraftId(remaining.length > 0 ? remaining[0].id : null);
    }
    
    setIsDeleting(null);
  };

  const handleStartNew = () => {
    onStartNew();
    onOpenChange(false);
  };

  if (drafts.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            Restore Saved Draft?
          </DialogTitle>
          <DialogDescription>
            You have unsaved order drafts. Would you like to continue where you left off?
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[300px] pr-4">
          <div className="space-y-2">
            {drafts.map((draft) => (
              <Card
                key={draft.id}
                className={`cursor-pointer transition-all ${
                  selectedDraftId === draft.id
                    ? "border-emerald-500 ring-2 ring-emerald-100 bg-emerald-50/50"
                    : "hover:border-gray-300"
                } ${isDeleting === draft.id ? "opacity-50" : ""}`}
                onClick={() => setSelectedDraftId(draft.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 truncate">
                          {draft.name}
                        </span>
                        {selectedDraftId === draft.id && (
                          <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                            Selected
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDraftDate(draft.updatedAt)}
                        </span>
                        
                        {draft.customerName && (
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            {draft.customerName}
                          </span>
                        )}
                        
                        <span className="flex items-center gap-1">
                          <ShoppingCart className="w-3.5 h-3.5" />
                          {draft.itemCount} item{draft.itemCount !== 1 ? "s" : ""}
                        </span>
                        
                        {draft.total > 0 && (
                          <span className="font-medium text-gray-700">
                            ${draft.total.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-red-500 hover:bg-red-50 h-8 w-8 p-0 flex-shrink-0"
                      onClick={(e) => handleDelete(draft.id, e)}
                      disabled={isDeleting === draft.id}
                      aria-label="Delete draft"
                    >
                      {isDeleting === draft.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleStartNew}
            className="w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Start New Order
          </Button>
          <Button
            onClick={handleRestore}
            disabled={!selectedDraftId}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Restore Draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Save Draft Button Component
 * Shows in the wizard header to manually save drafts
 */
interface SaveDraftButtonProps {
  onSave: () => void;
  lastSaved?: string;
  isSaving?: boolean;
}

export function SaveDraftButton({
  onSave,
  lastSaved,
  isSaving = false,
}: SaveDraftButtonProps) {
  return (
    <div className="flex items-center gap-2">
      {lastSaved && (
        <span className="text-xs text-gray-500">
          Saved {formatDraftDate(lastSaved)}
        </span>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={onSave}
        disabled={isSaving}
        className="h-9"
      >
        {isSaving ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <FileText className="w-4 h-4 mr-2" />
            Save Draft
          </>
        )}
      </Button>
    </div>
  );
}
