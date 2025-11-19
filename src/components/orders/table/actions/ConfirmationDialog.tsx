"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { useState } from "react"

interface ConfirmationDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: (reason?: string) => void
  isLoading?: boolean
  requireReason?: boolean
  reasonLabel?: string
}

export const ConfirmationDialog = ({
  isOpen,
  onOpenChange,
  title,
  description,
  onConfirm,
  isLoading = false,
  requireReason = false,
  reasonLabel = "Reason",
}: ConfirmationDialogProps) => {
  const [reason, setReason] = useState("")

  const handleConfirm = () => {
    onConfirm(reason)
    if (!isLoading) {
      setReason("")
    }
  }

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open)
    if (!open) {
      setReason("")
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {requireReason && (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reason">{reasonLabel}</Label>
              <Textarea
                id="reason"
                placeholder="Please provide a reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="resize-none"
                rows={3}
              />
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading || (requireReason && !reason.trim())}
            className="relative"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin absolute left-4" />}
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
