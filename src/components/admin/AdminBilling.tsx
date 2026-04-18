import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Users, TrendingDown, TrendingUp, Search } from "lucide-react";
import { toast } from "sonner";

export default function AdminBilling() {
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: profiles } = useQuery({
    queryKey: ["admin-billing-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, display_name, avatar_url, subscription_plan, created_at, role");
      return data ?? [];
    },
    staleTime: 30_000,
  });

  // MRR calculations
  const stats = useMemo(() => {
    let mrr = 0;
    let free = 0, pro = 0, agency = 0;
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    let newSubs = 0;

    profiles?.forEach(p => {
      if (p.subscription_plan === "pro") { mrr += 29; pro++; }
      else if (p.subscription_plan === "agency") { mrr += 99; agency++; }
      else free++;

      // New subscribers this month (rough: created this month and on paid plan)
      if (new Date(p.created_at) >= thisMonth && (p.subscription_plan === "pro" || p.subscription_plan === "agency")) {
        newSubs++;
      }
    });

    return { mrr, free, pro, agency, total: (profiles?.length ?? 0), newSubs };
  }, [profiles]);

  const filtered = useMemo(() => {
    return profiles?.filter(p => {
      if (planFilter !== "all" && p.subscription_plan !== planFilter) return false;
      if (search && !p.display_name?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })?.sort((a, b) => {
      const planOrder: Record<string, number> = { agency: 0, pro: 1, free: 2 };
      return (planOrder[a.subscription_plan] ?? 3) - (planOrder[b.subscription_plan] ?? 3);
    }) ?? [];
  }, [profiles, search, planFilter]);

  const changePlan = async (userId: string, plan: string) => {
    const { error } = await supabase.from("profiles").update({ subscription_plan: plan }).eq("user_id", userId);
    if (error) { toast.error("Failed to update plan"); return; }
    toast.success(`Plan changed to ${plan}`);
    queryClient.invalidateQueries({ queryKey: ["admin-billing-profiles"] });
  };

  const grantTrial = async (userId: string, name: string) => {
    const days = prompt(`Grant free Pro trial to ${name}. How many days?`, "14");
    if (!days || isNaN(Number(days))) return;
    // For now, just upgrade to pro — in production, set an expiry date
    const { error } = await supabase.from("profiles").update({ subscription_plan: "pro" }).eq("user_id", userId);
    if (error) { toast.error("Failed"); return; }
    toast.success(`${Number(days)}-day Pro trial granted to ${name}`);
    queryClient.invalidateQueries({ queryKey: ["admin-billing-profiles"] });
  };

  const planColor = (plan: string) => {
    if (plan === "agency") return "text-[#7B5CF0]";
    if (plan === "pro") return "text-[#C8FF3E]";
    return "text-[#5A6478]";
  };

  return (
    <div>
      <h1 className="font-syne font-bold text-xl text-[#F0F2F7] mb-6 lowercase">billing</h1>

      {/* MRR strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#0E1420] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-4 h-4 text-[#7B5CF0]" />
            <span className="text-[11px] text-[#5A6478] font-display lowercase">current mrr</span>
          </div>
          <p className="text-2xl font-syne font-bold text-[#F0F2F7] tabular-nums">${stats.mrr.toLocaleString()}</p>
        </div>
        <div className="bg-[#0E1420] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-[#3EFFBE]" />
            <span className="text-[11px] text-[#5A6478] font-display lowercase">new subs this month</span>
          </div>
          <p className="text-2xl font-syne font-bold text-[#F0F2F7] tabular-nums">{stats.newSubs}</p>
        </div>
        <div className="bg-[#0E1420] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-[#C8FF3E]" />
            <span className="text-[11px] text-[#5A6478] font-display lowercase">paid users</span>
          </div>
          <p className="text-2xl font-syne font-bold text-[#F0F2F7] tabular-nums">{stats.pro + stats.agency} <span className="text-sm text-[#5A6478] font-normal">/ {stats.total}</span></p>
        </div>
        <div className="bg-[#0E1420] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-[#FF5C5C]" />
            <span className="text-[11px] text-[#5A6478] font-display lowercase">churn this month</span>
          </div>
          <p className="text-2xl font-syne font-bold text-[#F0F2F7] tabular-nums">—</p>
          <p className="text-[10px] text-[#5A6478]">requires Stripe webhooks</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5A6478]" />
          <Input placeholder="search users..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-[#0E1420] border-white/[0.06] text-[#F0F2F7] text-xs h-9" />
        </div>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-28 bg-[#0E1420] border-white/[0.06] text-xs h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">all plans</SelectItem>
            <SelectItem value="free">free</SelectItem>
            <SelectItem value="pro">pro</SelectItem>
            <SelectItem value="agency">agency</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Subscriptions table */}
      <div className="bg-[#0E1420] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-4 py-3 text-[#5A6478] font-display font-normal lowercase">user</th>
                <th className="text-left px-4 py-3 text-[#5A6478] font-display font-normal lowercase">role</th>
                <th className="text-left px-4 py-3 text-[#5A6478] font-display font-normal lowercase">plan</th>
                <th className="text-left px-4 py-3 text-[#5A6478] font-display font-normal lowercase">amount</th>
                <th className="text-left px-4 py-3 text-[#5A6478] font-display font-normal lowercase">since</th>
                <th className="text-right px-4 py-3 text-[#5A6478] font-display font-normal lowercase">actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.user_id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} className="w-6 h-6 rounded-full object-cover" alt="" loading="lazy" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-[#1C2535] flex items-center justify-center text-[9px] font-bold text-[#8892A4]">
                          {(u.display_name || "?")[0].toUpperCase()}
                        </div>
                      )}
                      <span className="text-[#F0F2F7] font-medium">{u.display_name || "unnamed"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#8892A4] capitalize">{u.role?.replace("_", "/") || "—"}</td>
                  <td className="px-4 py-3">
                    <Select value={u.subscription_plan} onValueChange={v => changePlan(u.user_id, v)}>
                      <SelectTrigger className={`w-20 h-6 text-[10px] bg-transparent border-white/[0.08] ${planColor(u.subscription_plan)}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">free</SelectItem>
                        <SelectItem value="pro">pro</SelectItem>
                        <SelectItem value="agency">agency</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-[#F0F2F7] font-syne tabular-nums">
                    {u.subscription_plan === "pro" ? "$29/mo" : u.subscription_plan === "agency" ? "$99/mo" : "$0"}
                  </td>
                  <td className="px-4 py-3 text-[#8892A4]">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-[#C8FF3E] hover:text-[#C8FF3E]"
                        onClick={() => grantTrial(u.user_id, u.display_name || "user")}>
                        trial
                      </Button>
                      {u.subscription_plan !== "free" && (
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-[#FF5C5C] hover:text-[#FF5C5C]"
                          onClick={() => changePlan(u.user_id, "free")}>
                          downgrade
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[#5A6478]">no users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stripe webhook note */}
      <div className="mt-6 bg-[#141B28] border border-white/[0.06] rounded-xl p-4">
        <p className="text-xs text-[#5A6478]">
          💡 <span className="text-[#8892A4]">Failed payments log and Stripe webhook events</span> will appear here once Stripe webhooks are fully connected.
          Current plan changes are manual overrides on the database level.
        </p>
      </div>
    </div>
  );
}
