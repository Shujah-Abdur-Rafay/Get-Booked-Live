import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import SEO from "@/components/SEO";

const ARTIST_CATEGORIES = [
  { key: "performance", label: "Performance" },
  { key: "communication", label: "Communication" },
  { key: "professionalism", label: "Professionalism" },
];

const PROMOTER_CATEGORIES = [
  { key: "payment_speed", label: "Payment Speed" },
  { key: "organisation", label: "Organisation" },
  { key: "hospitality", label: "Hospitality" },
];

function StarRating({
  value,
  onChange,
  size = "lg",
}: {
  value: number;
  onChange: (v: number) => void;
  size?: "lg" | "sm";
}) {
  const [hover, setHover] = useState(0);
  const starSize = size === "lg" ? "w-10 h-10" : "w-6 h-6";
  return (
    <div className="flex gap-1">
      <SEO title="Leave a Review | GetBooked.Live" description="Share your experience with an artist or promoter on GetBooked.Live." />
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
          className="transition-transform active:scale-90"
        >
          <Star
            className={cn(
              starSize,
              "transition-colors",
              i <= (hover || value)
                ? "text-primary fill-primary"
                : "text-white/10"
            )}
          />
        </button>
      ))}
    </div>
  );
}

export default function ReviewPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [revieweeName, setRevieweeName] = useState("");
  const [revieweeId, setRevieweeId] = useState("");
  const [reviewRole, setReviewRole] = useState<"artist" | "promoter">("artist");
  const [rating, setRating] = useState(0);
  const [categoryRatings, setCategoryRatings] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  useEffect(() => {
    if (!bookingId || !user) return;
    const load = async () => {
      const { data: b, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .single();

      if (error || !b) {
        toast.error("Booking not found");
        setLoading(false);
        return;
      }
      setBooking(b);

      // Determine who we're reviewing
      const isArtist = user.id === b.artist_id;
      const isPromoter = user.id === b.promoter_id;
      if (!isArtist && !isPromoter) {
        toast.error("You don't have access to this booking");
        setLoading(false);
        return;
      }

      const targetId = isArtist ? b.promoter_id : b.artist_id;
      setRevieweeId(targetId);
      setReviewRole(isArtist ? "promoter" : "artist");

      // Check existing review
      const { data: existing } = await supabase
        .from("reviews")
        .select("id")
        .eq("booking_id", bookingId)
        .eq("reviewer_id", user.id)
        .maybeSingle();

      if (existing) {
        setAlreadyReviewed(true);
        setLoading(false);
        return;
      }

      // Get reviewee name
      const { data: profile } = await supabase
        .from("public_profiles")
        .select("display_name")
        .eq("user_id", targetId)
        .single();

      setRevieweeName(profile?.display_name || "User");
      setLoading(false);
    };
    load();
  }, [bookingId, user]);

  const handleSubmit = async () => {
    if (!rating) {
      toast.error("Please select a star rating");
      return;
    }
    if (!user || !bookingId) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("reviews").insert({
        booking_id: bookingId,
        reviewer_id: user.id,
        reviewee_id: revieweeId,
        rating,
        comment: comment.trim() || null,
        category_ratings: Object.keys(categoryRatings).length > 0 ? categoryRatings : null,
      } as any);

      if (error) throw error;

      // Mark review_request notifications as read
      const { error: notifError } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("type", "review_request")
        .ilike("link", `%${bookingId}%`);
      
      if (notifError) console.error("Failed to mark notification read:", notifError);


      // Recalculate BookScore for the reviewee
      await recalculateBookScore(revieweeId);

      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const recalculateBookScore = async (userId: string) => {
    try {
      // Get all reviews for this user
      const { data: allReviews } = await supabase
        .from("reviews")
        .select("rating")
        .eq("reviewee_id", userId);

      const avgRating = allReviews && allReviews.length > 0
        ? allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length
        : 0;

      // Booking count
      const { count: bookingCount } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .or(`artist_id.eq.${userId},promoter_id.eq.${userId}`)
        .eq("status", "confirmed");

      // Offers for acceptance rate
      const { data: offers } = await supabase
        .from("offers")
        .select("status")
        .eq("recipient_id", userId);

      const totalOffers = offers?.length || 0;
      const acceptedOffers = offers?.filter((o) => o.status === "accepted").length || 0;
      const acceptanceRate = totalOffers > 0 ? acceptedOffers / totalOffers : 0;

      // Response rate approximation (using acceptance as proxy)
      const responseRate = totalOffers > 0
        ? offers!.filter((o) => o.status !== "pending").length / totalOffers
        : 0;

      // Booking history score (normalized 0-5, capped at 200 bookings)
      const bookingHistoryScore = Math.min((bookingCount || 0) / 40, 5);

      // Formula: (booking_history * 0.3) + (avg_rating * 0.3) + (response_rate * 0.2) + (acceptance_rate * 0.2)
      // Normalize all to 0-100 scale
      const bookscore = Math.round(
        (bookingHistoryScore / 5) * 100 * 0.3 +
        (avgRating / 5) * 100 * 0.3 +
        responseRate * 100 * 0.2 +
        acceptanceRate * 100 * 0.2
      );

      await supabase
        .from("profiles")
        .update({ bookscore } as any)
        .eq("user_id", userId);
    } catch (err) {
      console.error("Error recalculating BookScore:", err);
    }
  };

  const categories = reviewRole === "promoter" ? PROMOTER_CATEGORIES : ARTIST_CATEGORIES;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-syne text-xl font-bold mb-2">Sign in required</h1>
          <p className="text-muted-foreground text-sm">Please sign in to leave a review.</p>
        </div>
      </div>
    );
  }

  if (alreadyReviewed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <CheckCircle className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="font-syne text-xl font-bold mb-2">Already reviewed</h1>
          <p className="text-muted-foreground text-sm mb-6">
            You've already submitted a review for this booking.
          </p>
          <Button onClick={() => navigate(-1)} variant="outline">Go back</Button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-syne text-2xl font-bold mb-2">Thanks!</h1>
          <p className="text-muted-foreground text-sm mb-6">
            Your review helps the community make better booking decisions.
          </p>
          <Button onClick={() => navigate("/dashboard")} className="bg-primary text-primary-foreground">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-muted-foreground">Booking not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-syne text-2xl font-bold mb-1">
            Review {revieweeName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {booking.venue_name} · {new Date(booking.event_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>

        {/* Overall Rating */}
        <div className="rounded-xl bg-card border border-white/[0.06] p-6 mb-4 text-center">
          <p className="text-sm text-muted-foreground mb-3">Overall rating</p>
          <div className="flex justify-center">
            <StarRating value={rating} onChange={setRating} size="lg" />
          </div>
          {rating > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              {["", "Poor", "Fair", "Good", "Great", "Excellent"][rating]}
            </p>
          )}
        </div>

        {/* Category Ratings */}
        <div className="rounded-xl bg-card border border-white/[0.06] p-6 mb-4">
          <p className="text-sm font-medium mb-4">Category ratings</p>
          <div className="space-y-4">
            {categories.map((cat) => (
              <div key={cat.key} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{cat.label}</span>
                <StarRating
                  value={categoryRatings[cat.key] || 0}
                  onChange={(v) =>
                    setCategoryRatings((prev) => ({ ...prev, [cat.key]: v }))
                  }
                  size="sm"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div className="rounded-xl bg-card border border-white/[0.06] p-6 mb-6">
          <p className="text-sm font-medium mb-3">Tell others about your experience</p>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            placeholder="Optional — share what stood out about this booking..."
            className="bg-secondary/50 border-white/[0.06] min-h-[100px] resize-none"
          />
          <p className="text-[11px] text-muted-foreground mt-1.5 text-right">
            {comment.length}/500
          </p>
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={!rating || submitting}
          className="w-full bg-primary text-primary-foreground h-12 font-semibold text-base active:scale-[0.97] transition-transform"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...
            </>
          ) : (
            "Submit Review"
          )}
        </Button>
      </div>
    </div>
  );
}
