import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRight, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const FREE_OFFER_LIMIT = 5;

export default function FreeOfferBanner({ mode }: { mode: "sent" | "received" }) {
  const { user, profile } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user || profile?.subscription_plan !== "free") return;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const col = mode === "sent" ? "sender_id" : "recipient_id";

    Promise.all([
      supabase.from("offers").select("id", { count: "exact", head: true }).eq(col, user.id).gte("created_at", monthStart),
      mode === "sent"
        ? supabase.from("venue_booking_requests" as any).select("id", { count: "exact", head: true }).eq("artist_id", user.id).gte("created_at", monthStart)
        : Promise.resolve({ count: 0 }),
    ]).then(([offersRes, reqRes]) => {
      setCount((offersRes.count ?? 0) + ((reqRes as any).count ?? 0));
    });
  }, [user, profile, mode]);

  if (!profile || profile.subscription_plan !== "free") return null;

  const pct = Math.min((count / FREE_OFFER_LIMIT) * 100, 100);

  return (
    <div className="rounded-xl border border-[hsl(var(--role-venue))]/20 bg-[hsl(var(--role-venue))]/5 px-4 py-3 mb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-[hsl(var(--role-venue))]" />
          <span className="text-xs font-medium text-[hsl(var(--role-venue))]">
            free plan — {count} of {FREE_OFFER_LIMIT} offers used this month
          </span>
        </div>
        <Link to="/pricing" className="text-[11px] font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1 lowercase">
          upgrade to pro <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <Progress value={pct} className="h-1.5 bg-secondary [&>div]:bg-[hsl(var(--role-venue))]" />
    </div>
  );
}
