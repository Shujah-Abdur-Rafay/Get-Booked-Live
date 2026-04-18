import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Ticket, Download, ExternalLink, Copy, Users } from "lucide-react";

const ACCENT = "#C8FF3E";

type Props = {
  bookingId: string;
  isArtist: boolean;
  isPro?: boolean;
};

export default function PresaleSection({ bookingId, isArtist, isPro }: Props) {
  const { user } = useAuth();
  const [presaleOpen, setPresaleOpen] = useState(false);
  const [ticketUrl, setTicketUrl] = useState("");
  const [signupCount, setSignupCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: b } = await supabase
        .from("bookings")
        .select("presale_open, presale_ticket_url")
        .eq("id", bookingId)
        .single();
      if (b) {
        setPresaleOpen((b as any).presale_open ?? false);
        setTicketUrl((b as any).presale_ticket_url ?? "");
      }
      const { count } = await supabase
        .from("presale_signups")
        .select("id", { count: "exact", head: true })
        .eq("booking_id", bookingId);
      setSignupCount(count ?? 0);
      setLoading(false);
    };
    fetch();
  }, [bookingId]);

  const togglePresale = async (open: boolean) => {
    setPresaleOpen(open);
    await supabase
      .from("bookings")
      .update({ presale_open: open } as any)
      .eq("id", bookingId);
    toast.success(open ? "Presale opened" : "Presale closed");
  };

  const saveTicketUrl = async () => {
    await supabase
      .from("bookings")
      .update({ presale_ticket_url: ticketUrl } as any)
      .eq("id", bookingId);
    toast.success("Ticket URL saved");
  };

  const copyPresaleLink = () => {
    const url = `${window.location.origin}/presale/${bookingId}`;
    navigator.clipboard.writeText(url);
    toast.success("Presale link copied!");
  };

  const exportCSV = async () => {
    const { data } = await supabase
      .from("presale_signups")
      .select("name, email, city, created_at")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false });
    if (!data || data.length === 0) { toast.error("No signups to export"); return; }
    const header = "Name,Email,City,Signed Up\n";
    const csv = header + data.map((s: any) => `"${s.name}","${s.email}","${s.city}","${new Date(s.created_at).toLocaleDateString()}"`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `presale-signups-${bookingId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return null;

  return (
    <div className="rounded-lg border border-white/[0.06] bg-[#0e1420] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ticket className="w-4 h-4" style={{ color: ACCENT }} />
          <h3 className="font-display text-sm font-semibold text-foreground lowercase">presale</h3>
          <Badge variant="outline" className="text-[10px] tabular-nums" style={{ color: ACCENT, borderColor: `${ACCENT}40` }}>
            {signupCount} signups
          </Badge>
        </div>
        {isArtist && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">{presaleOpen ? "open" : "closed"}</span>
            <Switch checked={presaleOpen} onCheckedChange={togglePresale} />
          </div>
        )}
      </div>

      {/* Presale link */}
      <div className="flex items-center gap-2">
        <button
          onClick={copyPresaleLink}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <Copy className="w-3 h-3" />
          copy presale link
        </button>
        <a
          href={`/presale/${bookingId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          preview
        </a>
      </div>

      {/* Ticket URL */}
      {isArtist && (
        <div className="flex items-center gap-2">
          <Input
            value={ticketUrl}
            onChange={(e) => setTicketUrl(e.target.value)}
            placeholder="Ticket purchase URL..."
            className="h-8 text-[11px] flex-1"
          />
          <Button size="sm" onClick={saveTicketUrl} className="h-8 text-[11px] active:scale-[0.97]" style={{ backgroundColor: ACCENT, color: "#080C14" }}>
            save
          </Button>
        </div>
      )}

      {/* Export CSV (Pro artists only) */}
      {isArtist && isPro && signupCount > 0 && (
        <Button size="sm" variant="ghost" onClick={exportCSV} className="h-7 text-[11px] text-muted-foreground hover:text-foreground active:scale-[0.97]">
          <Download className="w-3 h-3 mr-1" /> export fan emails (csv)
        </Button>
      )}
    </div>
  );
}
