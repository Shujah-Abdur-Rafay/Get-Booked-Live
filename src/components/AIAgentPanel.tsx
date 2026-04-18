import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bot, Save, Loader2, XCircle, CheckCircle, ArrowRightLeft, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

type AgentSettings = {
  enabled: boolean;
  min_guarantee: number;
  auto_accept_above: number;
  require_travel: boolean;
  require_hotel: boolean;
  min_deposit_pct: number;
  response_tone: "professional" | "friendly" | "direct";
};

const DEFAULT_SETTINGS: AgentSettings = {
  enabled: false,
  min_guarantee: 500,
  auto_accept_above: 5000,
  require_travel: false,
  require_hotel: false,
  min_deposit_pct: 50,
  response_tone: "professional",
};

const STORAGE_KEY = "gb_agent_settings";

// Mock activity log data
const MOCK_ACTIVITY = [
  { id: "1", timestamp: "2026-03-22T14:30:00Z", action: "Auto-declined offer from Marquee Events — $800 below minimum", type: "declined" as const },
  { id: "2", timestamp: "2026-03-21T09:15:00Z", action: "Auto-accepted offer from Sunset Festival — $6,200 above threshold", type: "accepted" as const },
  { id: "3", timestamp: "2026-03-20T16:45:00Z", action: "Countered offer from Blue Note — raised from $1,200 to $1,800", type: "countered" as const },
  { id: "4", timestamp: "2026-03-19T11:00:00Z", action: "Flagged offer from Underground Club — missing hotel requirement", type: "flagged" as const },
  { id: "5", timestamp: "2026-03-18T20:30:00Z", action: "Auto-declined offer from Private Event Co — $400 below minimum", type: "declined" as const },
];

const ACTION_COLORS = {
  declined: { bg: "bg-red-500/10", text: "text-red-400", icon: XCircle },
  accepted: { bg: "bg-green-500/10", text: "text-green-400", icon: CheckCircle },
  countered: { bg: "bg-amber-500/10", text: "text-amber-400", icon: ArrowRightLeft },
  flagged: { bg: "bg-[#3EC8FF]/10", text: "text-[#3EC8FF]", icon: AlertCircle },
};

export default function AIAgentPanel() {
  const [settings, setSettings] = useState<AgentSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });
  const [saving, setSaving] = useState(false);

  const save = () => {
    setSaving(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setTimeout(() => {
      setSaving(false);
      toast.success("Agent settings saved");
    }, 300);
  };

  const update = <K extends keyof AgentSettings>(key: K, value: AgentSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-5">
      {/* Section A — Agent Settings */}
      <div className="rounded-xl bg-[#0e1420] border border-white/[0.06] p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" />
            <h3 className="font-display font-semibold text-sm">AI Booking Agent</h3>
            {settings.enabled && (
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Active</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">Let AI handle incoming offers</span>
            <Switch checked={settings.enabled} onCheckedChange={(v) => update("enabled", v)} />
          </div>
        </div>

        {settings.enabled && (
          <div className="space-y-4 mt-4 pt-4 border-t border-white/[0.06]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] text-muted-foreground">Auto-decline offers below ($)</Label>
                <Input
                  type="number"
                  value={settings.min_guarantee}
                  onChange={(e) => update("min_guarantee", Number(e.target.value))}
                  placeholder="500"
                  className="mt-1 h-9 text-xs bg-background border-white/[0.06]"
                />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">Auto-accept if above ($)</Label>
                <Input
                  type="number"
                  value={settings.auto_accept_above}
                  onChange={(e) => update("auto_accept_above", Number(e.target.value))}
                  placeholder="5000"
                  className="mt-1 h-9 text-xs bg-background border-white/[0.06]"
                />
              </div>
            </div>

            <div>
              <Label className="text-[11px] text-muted-foreground mb-2 block">Required inclusions</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.require_travel}
                    onChange={(e) => update("require_travel", e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-white/20 bg-background accent-primary"
                  />
                  <span className="text-xs text-foreground">Travel must be covered</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.require_hotel}
                    onChange={(e) => update("require_hotel", e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-white/20 bg-background accent-primary"
                  />
                  <span className="text-xs text-foreground">Hotel must be covered</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-foreground">Minimum deposit</span>
                  <Input
                    type="number"
                    value={settings.min_deposit_pct}
                    onChange={(e) => update("min_deposit_pct", Number(e.target.value))}
                    className="w-20 h-7 text-xs bg-background border-white/[0.06]"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-[11px] text-muted-foreground">Response tone</Label>
              <select
                value={settings.response_tone}
                onChange={(e) => update("response_tone", e.target.value as AgentSettings["response_tone"])}
                className="mt-1 w-full h-9 rounded-lg border border-white/[0.06] bg-background px-3 text-xs text-foreground"
              >
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="direct">Direct</option>
              </select>
            </div>

            <Button
              onClick={save}
              disabled={saving}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] h-9 text-xs"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
              Save settings
            </Button>
          </div>
        )}
      </div>

      {/* Section B — Activity Log */}
      <div className="rounded-xl bg-[#0e1420] border border-white/[0.06] p-5">
        <h3 className="font-display font-semibold text-sm mb-4">Agent activity</h3>
        {!settings.enabled ? (
          <p className="text-xs text-muted-foreground text-center py-6">Enable the agent to see activity here.</p>
        ) : (
          <div className="space-y-1">
            {MOCK_ACTIVITY.map((entry) => {
              const style = ACTION_COLORS[entry.type];
              const Icon = style.icon;
              return (
                <div key={entry.id} className="flex items-start gap-2.5 py-2.5 border-b border-white/[0.04] last:border-0">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${style.bg}`}>
                    <Icon className={`w-3.5 h-3.5 ${style.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground leading-relaxed">{entry.action}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                      {new Date(entry.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {new Date(entry.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function AgentActiveBanner() {
  const settings: AgentSettings = (() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch { return DEFAULT_SETTINGS; }
  })();

  if (!settings.enabled) return null;

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 flex items-center gap-2.5">
      <Bot className="w-4 h-4 text-primary shrink-0" />
      <p className="text-xs text-foreground">
        <span className="mr-1">🤖</span>
        AI Agent is active — managing offers based on your rules. You'll be notified for anything that needs your attention.
      </p>
    </div>
  );
}