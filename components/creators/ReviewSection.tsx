"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, Send, Loader2 } from "lucide-react";
import { useReviews } from "@/hooks/useReviews";
import { useSession } from "@/hooks/useSession";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface ReviewSectionProps {
  creatorId: string;
  briefId?: string; // If provided, allow brand to submit review
}

export function ReviewSection({ creatorId, briefId }: ReviewSectionProps) {
  const { session } = useSession();
  const { reviews, loading, getReviewsForCreator, submitReview, calculateAverageRating } = useReviews();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [averageRating, setAverageRating] = useState(0);

  useEffect(() => {
    const loadReviews = async () => {
      const fetchedReviews = await getReviewsForCreator(creatorId);
      if (fetchedReviews.length > 0) {
        const avg = await calculateAverageRating(creatorId);
        setAverageRating(avg);
      }
    };
    loadReviews();
  }, [creatorId, getReviewsForCreator, calculateAverageRating]);

  const handleSubmit = async () => {
    if (!session || session.role !== "brand" || !briefId) {
      toast.error("Only brands who have hired this creator can submit reviews");
      return;
    }

    if (rating < 1 || rating > 5) {
      toast.error("Rating must be between 1 and 5 stars");
      return;
    }

    setSubmitting(true);
    try {
      await submitReview(briefId, creatorId, rating, comment);
      toast.success("Review submitted successfully!");
      setRating(5);
      setComment("");
      // Reload reviews
      await getReviewsForCreator(creatorId);
      const newAvg = await calculateAverageRating(creatorId);
      setAverageRating(newAvg);
    } catch (error: any) {
      toast.error(error.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass rounded-2xl border border-white/5 p-6">
      <h2 className="font-display font-semibold text-xl mb-6">Reviews & Ratings</h2>

      {/* Average Rating */}
      {reviews.length > 0 && (
        <div className="mb-8 text-center pb-8 border-b border-white/10">
          <div className="text-6xl font-bold mb-2 bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            {averageRating.toFixed(1)}
          </div>
          <div className="flex items-center justify-center gap-1 mb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-6 h-6 ${
                  i < Math.floor(averageRating)
                    ? "fill-yellow-400 text-yellow-400"
                    : i < averageRating
                    ? "fill-yellow-400/50 text-yellow-400"
                    : "text-gray-600"
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Based on {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
          </p>
        </div>
      )}

      {/* Submit Review (only for brands who hired this creator) */}
      {session?.role === "brand" && briefId && (
        <div className="mb-8 p-4 bg-violet-500/10 border border-violet-500/20 rounded-xl">
          <h3 className="font-semibold mb-4">Leave a Review</h3>
          
          {/* Star Rating */}
          <div className="flex gap-2 mb-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <button
                key={i}
                onClick={() => setRating(i + 1)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 cursor-pointer ${
                    i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-600"
                  }`}
                />
              </button>
            ))}
            <span className="ml-2 text-sm text-muted-foreground self-center">
              {rating} {rating === 1 ? "star" : "stars"}
            </span>
          </div>

          {/* Comment */}
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience working with this creator..."
            rows={3}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-violet-500/50 placeholder:text-muted-foreground resize-none mb-3"
          />

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-lg hover:from-violet-500 hover:to-violet-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit Review
              </>
            )}
          </button>
        </div>
      )}

      {/* Reviews List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No reviews yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review, i) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-4 bg-white/5 rounded-xl border border-white/5"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-sm">{review.brandName || "Anonymous"}</h4>
                  <div className="flex items-center gap-1 mt-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-600"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</span>
              </div>
              {review.comment && <p className="text-sm text-muted-foreground mt-2">{review.comment}</p>}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
