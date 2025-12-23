import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, ThumbsUp, CheckCircle, MessageSquare, Loader2 } from "lucide-react"
import { getProductReviews, getProductReviewStats, markReviewHelpful, ProductReview, ReviewStats } from "@/services/reviewService"

interface ProductReviewsProps {
  productId: string
  userId?: string
}

export const ProductReviews = ({ productId, userId }: ProductReviewsProps) => {
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [helpfulLoading, setHelpfulLoading] = useState<string | null>(null)

  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true)
      try {
        const [reviewsData, statsData] = await Promise.all([
          getProductReviews(productId),
          getProductReviewStats(productId)
        ])
        setReviews(reviewsData)
        setStats(statsData)
      } catch (error) {
        console.error("Error fetching reviews:", error)
      } finally {
        setLoading(false)
      }
    }

    if (productId) fetchReviews()
  }, [productId])

  const handleHelpful = async (reviewId: string) => {
    if (!userId) return
    
    setHelpfulLoading(reviewId)
    try {
      const result = await markReviewHelpful(reviewId, userId)
      if (result.success) {
        setReviews(prev => prev.map(r => 
          r.id === reviewId ? { ...r, helpful_count: result.newCount } : r
        ))
      }
    } catch (error) {
      console.error("Error marking helpful:", error)
    } finally {
      setHelpfulLoading(null)
    }
  }

  const renderStars = (rating: number, size: "sm" | "md" = "sm") => {
    const sizeClass = size === "sm" ? "w-4 h-4" : "w-5 h-5"
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClass} ${
              star <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    )
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          Customer Reviews
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Summary */}
        {stats && stats.totalReviews > 0 && (
          <div className="flex flex-col sm:flex-row gap-6 p-4 bg-gray-50 rounded-lg">
            {/* Average Rating */}
            <div className="text-center sm:text-left">
              <div className="text-4xl font-bold text-gray-900">{stats.averageRating}</div>
              <div className="mt-1">{renderStars(Math.round(stats.averageRating), "md")}</div>
              <p className="text-sm text-gray-500 mt-1">{stats.totalReviews} reviews</p>
            </div>

            {/* Rating Distribution */}
            <div className="flex-1 space-y-1">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = stats.ratingDistribution[rating] || 0
                const percentage = stats.totalReviews > 0 
                  ? (count / stats.totalReviews) * 100 
                  : 0
                return (
                  <div key={rating} className="flex items-center gap-2 text-sm">
                    <span className="w-3 text-gray-600">{rating}</span>
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-yellow-400 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-8 text-gray-500 text-xs">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Reviews List */}
        {reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Rating & Verified Badge */}
                    <div className="flex items-center gap-2 mb-1">
                      {renderStars(review.rating)}
                      {review.is_verified_purchase && (
                        <Badge variant="secondary" className="text-[10px] bg-green-50 text-green-700">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verified Purchase
                        </Badge>
                      )}
                    </div>

                    {/* Title */}
                    {review.title && (
                      <h4 className="font-semibold text-gray-900">{review.title}</h4>
                    )}

                    {/* Review Text */}
                    {review.review_text && (
                      <p className="text-sm text-gray-600 mt-1">{review.review_text}</p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>
                        By {review.user?.first_name || review.user?.company_name || "Customer"}
                      </span>
                      <span>{formatDate(review.created_at)}</span>
                    </div>
                  </div>

                  {/* Helpful Button */}
                  {userId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleHelpful(review.id)}
                      disabled={helpfulLoading === review.id}
                      className="text-gray-500 hover:text-blue-600"
                    >
                      {helpfulLoading === review.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <ThumbsUp className="w-4 h-4 mr-1" />
                          {review.helpful_count > 0 && review.helpful_count}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No reviews yet. Be the first to review this product!</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ProductReviews
