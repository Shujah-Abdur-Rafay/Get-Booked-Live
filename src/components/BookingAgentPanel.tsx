import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bot, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

type AgentRules = {
  enabled: boolean;
  min_guarantee: number;
  require_travel: boolean;
  require_hotel: boolean;
  min_deposit_pct: number;
  min_venue_capacity: number;
  counter_pct: number;
};

const DEFAULT_RULES: AgentRules = {
  enabled: false,
  min_guarantee: 500,
  require_travel: false,
  require_hotel: false,
  min_deposit_pct: 50,
  min_venue_capacity: 0,
  counter_pct: 20,
};

const STORAGE_KEY = "gb_agent_rules";

export default function BookingAgentPanel() {
  const { user } = useAuth();
  const [rules, setRules] = useState<AgentRules>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_RULES;
  });
  const [evaluating, setEvaluating] = useState(false);

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
    toast.success("Agent rules saved");
  };

  const update = <K extends keyof AgentRules>(key: K, value: AgentRules[K]) => {
    setRules((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="rounded-xl bg-card border border-border p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" />
          <h3 className="font-syne font-semibold text-sm">AI Booking Agent</h3>
          {rules.enabled && (
            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Active</Badge>
          )}
        </div>
        <Switch checked={rules.enabled} onCheckedChange={(v) => update("enabled", v)} />
      </div>

      {rules.enabled && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Min Guarantee ($)</Label>
              <Input
                type="number"
                value={rules.min_guarantee}
                onChange={(e) => update("min_guarantee", Number(e.target.value))}
                className="mt-1 h-9 bg-background border-border"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Auto-counter at +%</Label>
              <Input
                type="number"
                value={rules.counter_pct}
                onChange={(e) => update("counter_pct", Number(e.target.value))}
                className="mt-1 h-9 bg-background border-border"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Min Deposit %</Label>
              <Input
                type="number"
                value={rules.min_deposit_pct}
                onChange={(e) => update("min_deposit_pct", Number(e.target.value))}
                className="mt-1 h-9 bg-background border-border"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Min Venue Capacity</Label>
              <Input
                type="number"
                value={rules.min_venue_capacity}
                onChange={(e) => update("min_venue_capacity", Number(e.target.value))}
                className="mt-1 h-9 bg-background border-border"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Require travel covered</Label>
              <Switch checked={rules.require_travel} onCheckedChange={(v) => update("require_travel", v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Require hotel covered</Label>
              <Switch checked={rules.require_hotel} onCheckedChange={(v) => update("require_hotel", v)} />
            </div>
          </div>

          <Button onClick={save} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] h-9">
            <Save className="w-3.5 h-3.5 mr-1" /> Save Rules
          </Button>

          <p className="text-[10px] text-muted-foreground text-center">
            When enabled, incoming offers are evaluated against these rules automatically.
          </p>
        </div>
      )}
    </div>
  );
}
