// FIX 3: Replaced fake hardcoded ticker items (DJ Koda, The Velvet Union, etc.)
// with a real Supabase profiles query. Falls back to honest static items if no data yet.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Music2 } from "lucide-react";

interface TickerItem {
  text: string;
}

const FALLBACK_ITEMS: TickerItem[] = [
  { text: "GetBooked.Live is now live" },
  { text: "Join as an artist — it's free" },
  { text: "Book your first show today" },
];

export default function ActivityTicker() {
  const [items, setItems] = useState<TickerItem[]>(FALLBACK_ITEMS);

  useEffect(() => {
    async function fetchRecent() {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, role, location")
        .order("created_at", { ascending: false })
        .limit(8);

      if (error || !data || data.length === 0) return;

      const mapped = data.map((p: any) => ({
        text: `${p.display_name} joined from ${p.location || "the US"} as a ${p.role}`,
      }));
      // Duplicate for seamless loop
      setItems([...mapped, ...mapped]);
    }
    fetchRecent();
  }, []);

  // Double items for seamless loop (applies to fallback items too)
  const doubled = [...items, ...items];

  return (
    <section className="py-6 overflow-hidden border-y border-border">
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10" />
        <div
          className="flex animate-marquee hover:[animation-play-state:paused]"
          style={{ width: "max-content" }}
        >
          {doubled.map((item, i) => (
            <div
              key={i}
              className="flex-shrink-0 mx-6 flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Music2 className="w-3.5 h-3.5 text-primary/60" />
              <span className="whitespace-nowrap font-body">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
