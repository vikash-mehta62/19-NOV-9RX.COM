import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

interface BulkActionsProps {
  selectedOrders: string[];
  canProcessBulk: boolean;
  canShipBulk: boolean;
  onBulkAction: (action: 'process' | 'ship') => void;
  isBulkActionDialogOpen: boolean;
  setIsBulkActionDialogOpen: (open: boolean) => void;
  bulkAction: 'process' | 'ship' | null;
}

export const BulkActions = ({
  selectedOrders,
  canProcessBulk,
  canShipBulk,
  onBulkAction,
  isBulkActionDialogOpen,
  setIsBulkActionDialogOpen,
  bulkAction
}: BulkActionsProps) => {
  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={!canProcessBulk}
          onClick={() => onBulkAction('process')}
        >
          Process Selected
        </Button>
        <Button
          variant="outline"
          disabled={!canShipBulk}
          onClick={() => onBulkAction('ship')}
        >
          Ship Selected
        </Button>
      </div>

      <AlertDialog open={isBulkActionDialogOpen} onOpenChange={setIsBulkActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Action</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {bulkAction} {selectedOrders.length} orders?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (bulkAction) onBulkAction(bulkAction);
            }}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};