import { Button } from "@/components/ui/button"
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { User } from "../UsersTable"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { format } from "date-fns"

interface PendingUserReviewProps {
  user: User
  onClose: () => void
  onStatusUpdate: () => void
}

export function PendingUserReview({
  user,
  onClose,
  onStatusUpdate,
}: PendingUserReviewProps) {
  const [feedback, setFeedback] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleApprove = async () => {
    setIsSubmitting(true)
    try {
      // In a real app, this would make an API call
      // console.log("Approving user:", user);
      
      // Update user status in session storage (mock)
      const userKey = `user_${user.id}`;
      const userData = {
        ...user,
        status: 'active',
        approvedAt: new Date().toISOString()
      };
      sessionStorage.setItem(userKey, JSON.stringify(userData));

      toast({
        title: "User Approved",
        description: `${user.name} has been approved. A welcome email has been sent with login credentials.`,
      })
      onStatusUpdate()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve user. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!feedback.trim()) {
      toast({
        title: "Feedback Required",
        description: "Please provide feedback explaining why the user was rejected.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      // In a real app, this would make an API call
      // console.log("Rejecting user:", user, "Feedback:", feedback);
      
      // Update user status in session storage (mock)
      const userKey = `user_${user.id}`;
      const userData = {
        ...user,
        status: 'rejected',
        rejectionReason: feedback,
        rejectedAt: new Date().toISOString()
      };
      sessionStorage.setItem(userKey, JSON.stringify(userData));

      toast({
        title: "User Rejected",
        description: `${user.name} has been rejected. A notification email with feedback has been sent.`,
      })
      onStatusUpdate()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject user. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRequestInfo = async () => {
    if (!feedback.trim()) {
      toast({
        title: "Information Required",
        description: "Please specify what additional information is needed.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      // In a real app, this would make an API call
      // console.log("Requesting info from user:", user, "Request:", feedback);
      
      // Update user status in session storage (mock)
      const userKey = `user_${user.id}`;
      const userData = {
        ...user,
        status: 'info_requested',
        infoRequest: feedback,
        requestedAt: new Date().toISOString()
      };
      sessionStorage.setItem(userKey, JSON.stringify(userData));

      toast({
        title: "Information Requested",
        description: `An email has been sent to ${user.name} requesting additional information.`,
      })
      onStatusUpdate()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to request information. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DialogContent className="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle>Review New User Registration</DialogTitle>
        <DialogDescription>
          Review the registration request submitted on {format(new Date(user.lastActive), "PPP")}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-6 py-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Personal Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Full Name:</span>
                <p className="font-medium">{user.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Email:</span>
                <p className="font-medium">{user.email}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Phone:</span>
                <p className="font-medium">{user.phone || "Not provided"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Registration Date:</span>
                <p className="font-medium">{format(new Date(user.lastActive), "PP")}</p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="font-medium">Account Details</h4>
            <div className="flex flex-wrap gap-4">
              <Badge variant="outline">
                Role: {user.role}
              </Badge>
              <Badge variant="outline">
                Type: {user.type}
              </Badge>
              <Badge variant="outline" className="bg-yellow-50">
                Status: {user.status}
              </Badge>
              {user.locations && (
                <Badge variant="outline">
                  Locations: {user.locations}
                </Badge>
              )}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="font-medium">Admin Feedback</h4>
            <Textarea
              placeholder="Enter your feedback, additional requirements, or reason for rejection..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="min-h-[100px]"
              disabled={isSubmitting}
            />
          </div>
        </div>
      </div>

      <DialogFooter className="flex-col sm:flex-row gap-2">
        <Button 
          variant="outline" 
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <div className="flex gap-2">
          <Button 
            variant="destructive" 
            onClick={handleReject}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Rejecting..." : "Reject"}
          </Button>
          <Button 
            variant="secondary"
            onClick={handleRequestInfo}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Requesting..." : "Request Info"}
          </Button>
          <Button 
            onClick={handleApprove}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Approving..." : "Approve"}
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  )
}