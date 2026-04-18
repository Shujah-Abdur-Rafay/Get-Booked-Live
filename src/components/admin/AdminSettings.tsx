import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Settings, Send, Percent } from "lucide-react";

export default function AdminSettings() {
  const { user } = useAuth();
  const [freeRate, setFreeRate] = useState("20");
  const [proRate, setProRate] = useState("10");
  const [agencyRate, setAgencyRate] = useState("6");
  const [announcement, setAnnouncement] = useState("");
  const [sending, setSending] = useState(false);

  const sendAnnouncement = async () => {
    if (!announcement.trim() || !user) return;
    setSending(true);
    try {
      // Get all user IDs
      const { data: profiles } = await supabase.from("profiles").select("user_id");
      if (!profiles || profiles.length === 0) { toast.error("No users found"); return; }

      // Insert notifications for all users
      const notifications = profiles.map(p => ({
        user_id: p.user_id,
        title: "platform announcement",
        message: announcement.trim(),
        type: "announcement",
      }));

      // Batch insert in chunks of 100
      for (let i = 0; i < notifications.length; i += 100) {
        const chunk = notifications.slice(i, i + 100);
        const { error } = await supabase.from("notifications").insert(chunk);
        if (error) throw error;
      }

      toast.success(`Announcement sent to ${profiles.length} users`);
      setAnnouncement("");
    } catch (err: any) {
      toast.error(err.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <h1 className="font-syne font-bold text-xl text-[#F0F2F7] mb-6 lowercase">settings</h1>

      {/* Commission rates */}
      <div className="bg-[#0E1420] border border-white/[0.06] rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Percent className="w-4 h-4 text-[#C8FF3E]" />
          <h2 className="font-syne font-semibold text-sm text-[#F0F2F7] lowercase">commission rates</h2>
        </div>
        <p className="text-[11px] text-[#5A6478] mb-4">
          Commission rates are enforced server-side via database triggers. Changing these values here is for reference — update the <code className="text-[#C8FF3E]">set_offer_commission</code> function to apply changes.
        </p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-[11px] text-[#8892A4] font-display lowercase mb-1 block">free tier</label>
            <div className="relative">
              <Input value={freeRate} onChange={e => setFreeRate(e.target.value)} className="bg-[#141B28] border-white/[0.06] text-[#F0F2F7] text-sm pr-8" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#5A6478]">%</span>
            </div>
          </div>
          <div>
            <label className="text-[11px] text-[#8892A4] font-display lowercase mb-1 block">pro tier</label>
            <div className="relative">
              <Input value={proRate} onChange={e => setProRate(e.target.value)} className="bg-[#141B28] border-white/[0.06] text-[#F0F2F7] text-sm pr-8" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#5A6478]">%</span>
            </div>
          </div>
          <div>
            <label className="text-[11px] text-[#8892A4] font-display lowercase mb-1 block">agency tier</label>
            <div className="relative">
              <Input value={agencyRate} onChange={e => setAgencyRate(e.target.value)} className="bg-[#141B28] border-white/[0.06] text-[#F0F2F7] text-sm pr-8" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#5A6478]">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Platform announcement */}
      <div className="bg-[#0E1420] border border-white/[0.06] rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Send className="w-4 h-4 text-[#FF5C8A]" />
          <h2 className="font-syne font-semibold text-sm text-[#F0F2F7] lowercase">platform announcement</h2>
        </div>
        <Textarea
          placeholder="write your announcement..."
          value={announcement}
          onChange={e => setAnnouncement(e.target.value)}
          className="bg-[#141B28] border-white/[0.06] text-[#F0F2F7] text-xs mb-3 min-h-[80px]"
        />
        <Button
          onClick={sendAnnouncement}
          disabled={!announcement.trim() || sending}
          className="bg-[#C8FF3E] text-[#080C14] hover:bg-[#C8FF3E]/90 text-xs font-display lowercase"
        >
          {sending ? "sending..." : "send to all users"}
        </Button>
      </div>

      {/* Maintenance mode info */}
      <div className="bg-[#0E1420] border border-white/[0.06] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-4 h-4 text-[#FFB83E]" />
          <h2 className="font-syne font-semibold text-sm text-[#F0F2F7] lowercase">maintenance mode</h2>
        </div>
        <p className="text-[11px] text-[#5A6478]">
          Maintenance mode can be toggled via environment configuration. When enabled, all non-admin users will see a maintenance page.
        </p>
      </div>
    </div>
  );
}
