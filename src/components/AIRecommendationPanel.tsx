import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import AIRecommendationCard from "@/components/AIRecommendationCard";

type Recommendation = {
  artist_id: string;
  artist_name: string;
  artist_genre: string | null;
  artist_city: string | null;
  artist_state: string | null;
  artist_avatar: string | null;
  artist_slug: string | null;
  artist_bookscore: number | null;
  suggested_price: number | null;
  confidence_score: number | null;
  reason: string;
  rank: number;
};

export default function AIRecommendationPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Form state
  const [eventCity, setEventCity] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [genres, setGenres] = useState("");
  const [eventType, setEventType] = useState("");

  const handleSearch = async () => {
    if (!user) {
      toast.error("Please sign in to use AI recommendations");
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const { data, error } = await supabase.functions.invoke("recommend-artists", {
        body: {
          event_city: eventCity || undefined,
          event_date: eventDate || undefined,
          budget_min: budgetMin ? Number(budgetMin) : undefined,
          budget_max: budgetMax ? Number(budgetMax) : undefined,
          genres: genres ? genres.split(",").map((g) => g.trim()) : undefined,
          event_type: eventType || undefined,
        },
      });

      if (error) {
        console.error("AI recommendation error:", error);
        toast.error("Could not get recommendations. Please try again.");
        setRecommendations([]);
        return;
      }

      setRecommendations(data?.recommendations || []);
      if ((data?.recommendations || []).length === 0) {
        toast("No matching artists found. Try adjusting your criteria.");
      }
    } catch (err) {
      console.error("Recommendation request failed:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-[#C8FF3E]/10 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-[#C8FF3E]" />
        </div>
        <div>
          <h2 className="font-syne font-bold text-sm lowercase">ai artist matching</h2>
          <p className="text-[10px] text-muted-foreground">describe your event and get smart recommendations</p>
        </div>
      </div>

      {/* Search Form */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0e1420] p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">city</label>
            <Input
              value={eventCity}
              onChange={(e) => setEventCity(e.target.value)}
              placeholder="e.g. Austin"
              className="h-8 text-xs bg-[#141B28] border-white/[0.06]"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">date</label>
            <Input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="h-8 text-xs bg-[#141B28] border-white/[0.06]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">budget min</label>
            <Input
              type="number"
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value)}
              placeholder="$500"
              className="h-8 text-xs bg-[#141B28] border-white/[0.06]"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">budget max</label>
            <Input
              type="number"
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
              placeholder="$5,000"
              className="h-8 text-xs bg-[#141B28] border-white/[0.06]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">genres</label>
            <Input
              value={genres}
              onChange={(e) => setGenres(e.target.value)}
              placeholder="hip-hop, r&b"
              className="h-8 text-xs bg-[#141B28] border-white/[0.06]"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">event type</label>
            <Input
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              placeholder="festival, club night"
              className="h-8 text-xs bg-[#141B28] border-white/[0.06]"
            />
          </div>
        </div>

        <Button
          onClick={handleSearch}
          disabled={loading}
          className="w-full h-9 text-xs bg-[#C8FF3E] text-[#080C14] hover:bg-[#C8FF3E]/90 active:scale-[0.98] font-semibold lowercase"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> finding matches…
            </>
          ) : (
            <>
              <Search className="w-3.5 h-3.5 mr-1.5" /> find artists
            </>
          )}
        </Button>
      </div>

      {/* Results */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="text-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#C8FF3E] mx-auto" />
            <p className="text-[11px] text-muted-foreground">analyzing your event and matching artists…</p>
          </div>
        </div>
      )}

      {!loading && hasSearched && recommendations.length === 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-[#0e1420] p-6 text-center">
          <p className="text-sm text-muted-foreground">no matching artists found</p>
          <p className="text-[11px] text-muted-foreground/60 mt-1">try adjusting your budget or genres</p>
        </div>
      )}

      {!loading && recommendations.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {recommendations.length} recommendation{recommendations.length !== 1 ? "s" : ""}
          </p>
          {recommendations.map((rec) => (
            <AIRecommendationCard
              key={rec.artist_id}
              recommendation={rec}
              onSendOffer={(artistId) => navigate(`/offer/new/${artistId}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
