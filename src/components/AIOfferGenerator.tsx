import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Loader2, Sparkles, DollarSign, Calendar, MapPin } from "lucide-react";
import toast from "react-hot-toast";

type OfferSuggestion = {
  guarantee: number;
  door_split: number;
  merch_split: number;
  notes: string;
  reasoning: string;
  confidence?: number;
};

type Props = {
  artistId: string;
  artistName: string;
  onApply?: (suggestion: OfferSuggestion) => void;
};

export default function AIOfferGenerator({ artistId, artistName, onApply }: Props) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<OfferSuggestion | null>(null);
  const [venueName, setVenueName] = useState("");
  const [eventCity, setEventCity] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventType, setEventType] = useState("");
  const [notes, setNotes] = useState("");

  const generate = async () => {
    setLoading(true);
    setSuggestion(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-offer", {
        body: { artist_id: artistId, venue_name: venueName, event_city: eventCity, event_date: eventDate, event_type: eventType, notes },
      });
      if (error) throw error;
      setSuggestion(data as OfferSuggestion);
      toast.success("AI suggestion ready");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate offer suggestion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/[0.06] bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Bot className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="font-syne font-bold text-sm text-foreground">ai offer generator</h3>
          <p className="text-[11px] text-muted-foreground">get AI-suggested terms for {artistName}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">venue name</Label>
          <Input value={venueName} onChange={(e) => setVenueName(e.target.value)} placeholder="e.g. The Fillmore" className="h-8 text-xs bg-background border-white/[0.06]" />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">city</Label>
          <Input value={eventCity} onChange={(e) => setEventCity(e.target.value)} placeholder="e.g. San Francisco" className="h-8 text-xs bg-background border-white/[0.06]" />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">event date</Label>
          <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="h-8 text-xs bg-background border-white/[0.06]" />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">event type</Label>
          <Input value={eventType} onChange={(e) => setEventType(e.target.value)} placeholder="e.g. Festival, Club Night" className="h-8 text-xs bg-background border-white/[0.06]" />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">additional notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special requirements..." rows={2} className="text-xs bg-background border-white/[0.06] resize-none" />
      </div>

      <Button onClick={generate} disabled={loading} className="w-full h-9 text-xs font-syne font-semibold bg-primary text-primary-foreground hover:bg-primary/90">
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
        {loading ? "generating..." : "generate ai offer"}
      </Button>

      {suggestion && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
          <p className="text-[11px] font-syne font-bold text-primary uppercase tracking-wider">ai suggestion</p>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-background/50 p-2.5 text-center">
              <DollarSign className="w-3.5 h-3.5 text-primary mx-auto mb-1" />
              <p className="font-syne font-bold text-sm text-foreground">${suggestion.guarantee?.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">guarantee</p>
            </div>
            <div className="rounded-lg bg-background/50 p-2.5 text-center">
              <p className="font-syne font-bold text-sm text-foreground">{suggestion.door_split}%</p>
              <p className="text-[10px] text-muted-foreground">door split</p>
            </div>
            <div className="rounded-lg bg-background/50 p-2.5 text-center">
              <p className="font-syne font-bold text-sm text-foreground">{suggestion.merch_split}%</p>
              <p className="text-[10px] text-muted-foreground">merch kept</p>
            </div>
          </div>

          {suggestion.reasoning && (
            <p className="text-[11px] text-muted-foreground leading-relaxed border-t border-white/[0.06] pt-2">
              {suggestion.reasoning}
            </p>
          )}

          {onApply && (
            <Button onClick={() => onApply(suggestion)} className="w-full h-8 text-xs font-syne bg-primary text-primary-foreground">
              apply these terms
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
