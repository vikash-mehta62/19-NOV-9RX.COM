"use client"

import type { OrderFormValues } from "../schemas/orderSchema"
import { OrderConfirmAction } from "./actions/OrderConfirmAction"
import { OrderProcessAction } from "./actions/OrderProcessAction"
import { OrderShipAction } from "./actions/OrderShipAction"
import { Button } from "@/components/ui/button"
import { Loader2, Trash2 } from "lucide-react"
import { useState } from "react"
import { ConfirmationDialog } from "./actions/ConfirmationDialog"
import { canDeleteOrder } from "../utils/orderUtils"
import { useToast } from "@/hooks/use-toast"

interface OrderActionsProps {
  order: OrderFormValues
  onProcessOrder?: (orderId: string) => void
  onShipOrder?: (orderId: string) => void
  onConfirmOrder?: (orderId: string) => void
  onDeleteOrder?: (orderId: string, reason?: string) => Promise<void>
}

export const OrderActions = ({
  order,
  onProcessOrder,
  onShipOrder,
  onConfirmOrder,
  onDeleteOrder,
}: OrderActionsProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isCancleDialogOpen, setIsCancleDialogOpen] = useState(false)
  const { toast } = useToast()
  const status = order.status?.toLowerCase() || ""

  const handleDelete = async (reason?: string) => {
    if (!onDeleteOrder || !order.id) return

    try {
      setIsLoading(true)
      await onDeleteOrder(order.id, reason)
      toast({
        title: "Order deleted",
        description: `Order ${order.id} has been deleted successfully.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete the order. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsDeleteDialogOpen(false)
    }
  }

  const renderDeleteButton = () => {
    if (order.void) {
      return (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDeleteDialogOpen(true)}
            disabled={isLoading || !order.id}
            className="text-xs font-semibold text-amber-600 border-amber-600 hover:bg-amber-50"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "VOID"}
          </Button>

          {<ConfirmationDialog
            isOpen={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
            title="Void Reason"
            description={order.voidReason || "No reason provided"}
            onConfirm={() => setIsDeleteDialogOpen(false)}
            isLoading={isLoading}
            requireReason={false}
          />}
        </>
      )
    }

    if (!order.void && status !== "cancelled") {
      return (
        <>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsDeleteDialogOpen(true)}
            disabled={isLoading || !order.id}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>

          <ConfirmationDialog
            isOpen={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
            title="Delete Order"
            description="Are you sure you want to delete this order? This action cannot be undone."
            onConfirm={handleDelete}
            isLoading={isLoading}
            requireReason={true}
            reasonLabel="Reason for deletion"
          />
        </>
      )
    }

  }




  const renderCalnceButton = () => {
    if (status === "cancelled") {
      return (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCancleDialogOpen(true)}
            disabled={isLoading || !order.id}
            className="text-xs font-semibold text-amber-600 border-amber-600 hover:bg-amber-50"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancled Reason"}
          </Button>

          {<ConfirmationDialog
            isOpen={isCancleDialogOpen}
            onOpenChange={setIsCancleDialogOpen}
            title="Cancle Reason"
            description={order.cancelReason || "No reason provided"}
            onConfirm={() => setIsCancleDialogOpen(false)}
            isLoading={isLoading}
            requireReason={false}
          />}
        </>
      )
    }

   

  }




  if (status === "new" && !order.void) {
    return (
      <div className="flex gap-2">
        <OrderConfirmAction order={order} onConfirmOrder={onConfirmOrder} />
        {canDeleteOrder(order) && renderDeleteButton()}
      </div>
    )
  }

  if (status === "pending" && !order.void) {
    return (
      <div className="flex gap-2">
        <OrderProcessAction order={order} onProcessOrder={onProcessOrder} />
        {canDeleteOrder(order) && renderDeleteButton()}
      </div>
    )
  }
  if (!order.void && status === "cancelled") {
    return (
      <div className="flex gap-2">

        {canDeleteOrder(order) && renderCalnceButton()}
      </div>
    )
  }

  if (status === "processing" && !order.void) {
    return (
      <div className="flex gap-2">
        <OrderShipAction order={order} onShipOrder={onShipOrder} />
        {canDeleteOrder(order) && renderDeleteButton()}
      </div>
    )
  }

  if (canDeleteOrder(order)) {
    return renderDeleteButton()
  }

  return null
}
