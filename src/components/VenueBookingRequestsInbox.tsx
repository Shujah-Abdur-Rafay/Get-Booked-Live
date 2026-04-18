import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock, CalendarDays, Users, Music, MessageSquare } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

type BookingRequest = {
  id: string;
  artist_id: string;
  venue_id: string;
  proposed_date: string;
  event_type: string;
  expected_attendance: number | null;
  message: string | null;
  status: string;
  created_at: string;
  artist_name?: string;
};

interface Props {
  venueId: string;
}

export default function VenueBookingRequestsInbox({ venueId }: Props) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRequests = async () => {
    const { data } = await supabase
      .from("venue_booking_requests" as any)
      .select("*")
      .eq("venue_id", venueId)
      .order("created_at", { ascending: false });

    const reqs = (data as unknown as BookingRequest[]) ?? [];

    // Fetch artist names
    const artistIds = [...new Set(reqs.map((r) => r.artist_id))];
    if (artistIds.length > 0) {
      const { data: profiles } = await supabase
        .from("public_profiles" as any)
        .select("user_id, display_name")
        .in("user_id", artistIds);

      const nameMap: Record<string, string> = {};
      (profiles ?? []).forEach((p: any) => { nameMap[p.user_id] = p.display_name; });
      reqs.forEach((r) => { r.artist_name = nameMap[r.artist_id] || "Unknown Artist"; });
    }

    setRequests(reqs);
    setLoading(false);
  };

  useEffect(() => { loadRequests(); }, [venueId]);

  const respond = async (id: string, status: "accepted" | "declined") => {
    const { error } = await supabase
      .from("venue_booking_requests" as any)
      .update({ status, responded_at: new Date().toISOString() } as any)
      .eq("id", id);

    if (error) { toast.error("Failed to respond"); return; }
    toast.success(`Request ${status}`);
    loadRequests();
  };

  if (loading) return <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-24 rounded-xl bg-card animate-pulse" />)}</div>;

  if (requests.length === 0) {
    return (
      <div className="rounded-xl bg-card border border-border p-8 text-center">
        <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground font-body">no booking requests yet</p>
        <p className="text-xs text-muted-foreground/60 font-body mt-1">artists can find your venue in the directory and send requests</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => (
        <div key={req.id} className="rounded-xl bg-card border border-border p-4 hover:border-role-venue/20 transition-colors">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h4 className="font-syne font-semibold text-sm">{req.artist_name}</h4>
              <p className="text-[11px] text-muted-foreground font-body">{format(parseISO(req.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
            </div>
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold font-body ${
              req.status === "accepted" ? "bg-green-500/10 text-green-400" :
              req.status === "declined" ? "bg-red-500/10 text-red-400" :
              "bg-role-venue/10 text-role-venue"
            }`}>
              {req.status === "accepted" ? <CheckCircle className="w-3 h-3" /> :
               req.status === "declined" ? <XCircle className="w-3 h-3" /> :
               <Clock className="w-3 h-3" />}
              {req.status}
            </span>
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground font-body mb-2">
            <span className="inline-flex items-center gap-1"><CalendarDays className="w-3 h-3 text-role-venue" /> {format(parseISO(req.proposed_date), "MMM d, yyyy")}</span>
            <span className="inline-flex items-center gap-1"><Music className="w-3 h-3 text-role-venue" /> {req.event_type}</span>
            {req.expected_attendance && <span className="inline-flex items-center gap-1"><Users className="w-3 h-3 text-role-venue" /> {req.expected_attendance} expected</span>}
          </div>

          {req.message && <p className="text-xs text-muted-foreground/80 font-body mb-3 line-clamp-3">{req.message}</p>}

          {req.status === "pending" && (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => respond(req.id, "accepted")} className="bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 h-9 text-xs font-body flex-1">
                <CheckCircle className="w-3 h-3 mr-1" /> accept
              </Button>
              <Button size="sm" onClick={() => respond(req.id, "declined")} variant="outline" className="text-red-400 hover:bg-red-500/10 border-red-500/20 h-9 text-xs font-body flex-1">
                <XCircle className="w-3 h-3 mr-1" /> decline
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
