import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Star, Loader2, Gift } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { submitReview } from "@/services/reviewService"

interface ProductReviewFormProps {
  userId: string
  productId: string
  productName: string
  sizeId?: string
  orderId?: string
  reviewBonus: number
  onSuccess?: () => void
  onCancel?: () => void
}

export const ProductReviewForm = ({
  userId,
  productId,
  productName,
  sizeId,
  orderId,
  reviewBonus,
  onSuccess,
  onCancel
}: ProductReviewFormProps) => {
  const { toast } = useToast()
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [title, setTitle] = useState("")
  const [reviewText, setReviewText] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "Rating Required",
        description: "Please select a star rating",
        variant: "destructive"
      })
      return
    }

    setSubmitting(true)
    try {
      const result = await submitReview(
        userId,
        productId,
        rating,
        title || undefined,
        reviewText || undefined,
        sizeId,
        orderId
      )

      if (result.success) {
        toast({
          title: "Review Submitted! ⭐",
          description: result.pointsEarned 
            ? `${result.message} You earned ${result.pointsEarned} bonus points!`
            : result.message
        })
        if (onSuccess) onSuccess()
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit review",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Write a Review</CardTitle>
        <p className="text-sm text-gray-500">for {productName}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bonus Points Banner */}
        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg text-blue-700">
          <Gift className="w-5 h-5" />
          <span className="text-sm font-medium">
            Earn {reviewBonus} bonus points for your review!
          </span>
        </div>

        {/* Star Rating */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Your Rating *
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 ${
                    star <= (hoverRating || rating)
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {rating === 1 && "Poor"}
            {rating === 2 && "Fair"}
            {rating === 3 && "Good"}
            {rating === 4 && "Very Good"}
            {rating === 5 && "Excellent"}
          </p>
        </div>

        {/* Review Title */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Review Title (optional)
          </label>
          <Input
            placeholder="Summarize your experience"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
          />
        </div>

        {/* Review Text */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Your Review (optional)
          </label>
          <Textarea
            placeholder="Tell others about your experience with this product..."
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            rows={4}
            maxLength={1000}
          />
          <p className="text-xs text-gray-400 mt-1 text-right">
            {reviewText.length}/1000
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Star className="w-4 h-4 mr-2" />
            )}
            Submit Review
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default ProductReviewForm
