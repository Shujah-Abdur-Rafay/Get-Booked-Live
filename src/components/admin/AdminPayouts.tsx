import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";

export default function AdminPayouts() {
  const [failures, setFailures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const fetchFailures = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("payout_failures")
        .select(`
          *,
          booking: bookings ( id, event_date, venue_name ),
          artist: profiles!payout_failures_artist_id_fkey ( display_name )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        toast.error("Failed to fetch payout failures");
      } else {
        setFailures((data as any[]) || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFailures();
  }, []);

  const handleRetry = async (failureId: string, bookingId: string) => {
    setRetryingId(failureId);
    try {
      // In a real scenario you would interact with a cloud function to retry Stripe integration.
      // Here we simulate the process or update the database state depending on your architecture.
      const res = await supabase.functions.invoke("retry-payout", {
        body: { failure_id: failureId, booking_id: bookingId }
      });
      if (res.error) throw res.error;
      
      toast.success("Retry initiated successfully.");
      await fetchFailures();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to retry payout");
    } finally {
      setRetryingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[300px] flex-col items-center justify-center text-[#8892A4]">
        <Loader2 className="h-6 w-6 animate-spin mb-4" />
        <p className="text-sm">loading failures...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-syne font-bold text-[#F0F2F7]">Payout Failures</h2>
          <p className="text-xs text-[#8892A4] mt-1">Review and retry failed financial transactions.</p>
        </div>
        <button
          onClick={fetchFailures}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/[0.04] text-[#F0F2F7] hover:bg-white/10 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {failures.length === 0 ? (
        <div className="p-8 border border-white/[0.06] bg-[#0E1420] rounded-xl text-center">
          <CheckCircle className="w-8 h-8 text-[#C8FF3E] mx-auto mb-3 opacity-50" />
          <h3 className="text-sm font-semibold text-[#F0F2F7]">No active failures</h3>
          <p className="text-xs text-[#8892A4] mt-1">All payouts are processing smoothly.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {failures.map((f) => (
            <div key={f.id} className="p-4 border border-red-500/20 bg-red-500/5 rounded-xl flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#F0F2F7]">{f.artist?.display_name || "Unknown Artist"}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-300">
                      {f.status}
                    </span>
                  </div>
                  <div className="text-xs text-[#8892A4] mt-1">
                    Booking ID: <span className="font-mono">{f.booking_id}</span>
                  </div>
                  <div className="text-xs text-red-300 mt-2 font-mono whitespace-pre-wrap">
                    {f.stripe_error_message || "Unknown error occurred"}
                  </div>
                  <div className="text-[10px] text-[#8892A4] mt-2">
                    Failed on: {new Date(f.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => handleRetry(f.id, f.booking_id)}
                disabled={retryingId === f.id || f.status === "resolved"}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 flex items-center gap-2 ${
                  f.status === "resolved" 
                    ? "bg-white/[0.04] text-[#8892A4] cursor-not-allowed" 
                    : "bg-[#C8FF3E] text-black hover:bg-[#C8FF3E]/90"
                }`}
              >
                {retryingId === f.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {f.status === "resolved" ? "Resolved" : "Retry Payout"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
