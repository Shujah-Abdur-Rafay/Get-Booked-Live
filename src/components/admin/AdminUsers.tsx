import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, CheckCircle, XCircle, Trash2, Shield, Download, Megaphone, ChevronUp, ChevronDown, Filter, X } from "lucide-react";
import { toast } from "sonner";

const ROLE_COLORS: Record<string, string> = {
  artist: "#C8FF3E",
  promoter: "#FF5C8A",
  venue: "#FFB83E",
  production: "#7B5CF0",
  photo_video: "#3EC8FF",
  admin: "#FF5C5C",
};

type SortKey = "created_at" | "display_name" | "subscription_plan";
type SortDir = "asc" | "desc";

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [verifiedFilter, setVerifiedFilter] = useState("all");
  const [suspendedFilter, setSuspendedFilter] = useState("all");
  const [joinFrom, setJoinFrom] = useState("");
  const [joinTo, setJoinTo] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailUser, setDetailUser] = useState<any | null>(null);
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  // Fetch bookings count per user for the detail panel
  const { data: userBookings } = useQuery({
    queryKey: ["admin-user-bookings-count"],
    queryFn: async () => {
      const { data } = await supabase.from("bookings").select("artist_id, promoter_id");
      const counts: Record<string, number> = {};
      data?.forEach(b => {
        counts[b.artist_id] = (counts[b.artist_id] || 0) + 1;
        counts[b.promoter_id] = (counts[b.promoter_id] || 0) + 1;
      });
      return counts;
    },
    staleTime: 60_000,
  });

  // Detail panel: fetch offers & bookings for selected user
  const { data: detailOffers } = useQuery({
    queryKey: ["admin-user-offers", detailUser?.user_id],
    queryFn: async () => {
      if (!detailUser) return [];
      const { data } = await supabase
        .from("offers")
        .select("*")
        .or(`sender_id.eq.${detailUser.user_id},recipient_id.eq.${detailUser.user_id}`)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!detailUser,
    staleTime: 30_000,
  });

  const { data: detailBookings } = useQuery({
    queryKey: ["admin-user-bookings", detailUser?.user_id],
    queryFn: async () => {
      if (!detailUser) return [];
      const { data } = await supabase
        .from("bookings")
        .select("*")
        .or(`artist_id.eq.${detailUser.user_id},promoter_id.eq.${detailUser.user_id}`)
        .order("event_date", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!detailUser,
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    let result = users?.filter(u => {
      if (search && !u.display_name?.toLowerCase().includes(search.toLowerCase()) && !u.user_id?.toLowerCase().includes(search.toLowerCase())) return false;
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (planFilter !== "all" && u.subscription_plan !== planFilter) return false;
      if (verifiedFilter === "verified" && !u.is_verified) return false;
      if (verifiedFilter === "unverified" && u.is_verified) return false;
      if (suspendedFilter === "suspended" && !u.suspended) return false;
      if (suspendedFilter === "active" && u.suspended) return false;
      if (joinFrom && new Date(u.created_at) < new Date(joinFrom)) return false;
      if (joinTo && new Date(u.created_at) > new Date(joinTo + "T23:59:59")) return false;
      return true;
    }) ?? [];

    // Sort
    result.sort((a, b) => {
      let valA: any, valB: any;
      if (sortKey === "created_at") { valA = a.created_at; valB = b.created_at; }
      else if (sortKey === "display_name") { valA = (a.display_name || "").toLowerCase(); valB = (b.display_name || "").toLowerCase(); }
      else if (sortKey === "subscription_plan") { valA = a.subscription_plan; valB = b.subscription_plan; }
      else { valA = a.created_at; valB = b.created_at; }

      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [users, search, roleFilter, planFilter, verifiedFilter, suspendedFilter, joinFrom, joinTo, sortKey, sortDir]);

  const allSelected = filtered.length > 0 && filtered.every(u => selected.has(u.user_id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(u => u.user_id)));
    }
  };

  const toggleSelect = (userId: string) => {
    const next = new Set(selected);
    if (next.has(userId)) next.delete(userId);
    else next.add(userId);
    setSelected(next);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 inline ml-0.5" />;
  };

  // Actions
  const toggleVerify = async (userId: string, current: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_verified: !current }).eq("user_id", userId);
    if (error) { toast.error("Failed to update"); return; }
    toast.success(!current ? "User verified" : "Verification removed");
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const changePlan = async (userId: string, plan: string) => {
    const { error } = await supabase.from("profiles").update({ subscription_plan: plan }).eq("user_id", userId);
    if (error) { toast.error("Failed to update plan"); return; }
    toast.success(`Plan changed to ${plan}`);
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const toggleAdmin = async (userId: string) => {
    const { data: existing } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    const { error } = await supabase.functions.invoke("admin-claim-action", {
      body: { action: existing ? "remove_admin" : "grant_admin", user_id: userId },
    });
    if (error) { toast.error("Failed to update admin role"); return; }
    toast.success(existing ? "Admin role removed" : "Admin role granted");
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const toggleSuspend = async (userId: string, current: boolean) => {
    const { error } = await supabase.from("profiles").update({ suspended: !current } as any).eq("user_id", userId);
    if (error) { toast.error("Failed to update"); return; }
    toast.success(!current ? "User suspended" : "User unsuspended");
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const deleteUser = async (userId: string, displayName: string) => {
    if (!confirm(`Delete ${displayName || "this user"}? This cannot be undone.`)) return;
    const { error } = await supabase.from("profiles").delete().eq("user_id", userId);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("User deleted");
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  };

  // Bulk actions
  const bulkVerify = async () => {
    const ids = Array.from(selected);
    for (const id of ids) {
      await supabase.from("profiles").update({ is_verified: true }).eq("user_id", id);
    }
    toast.success(`${ids.length} users verified`);
    setSelected(new Set());
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const bulkSuspend = async () => {
    if (!confirm(`Suspend ${selected.size} users?`)) return;
    const ids = Array.from(selected);
    for (const id of ids) {
      await supabase.from("profiles").update({ suspended: true } as any).eq("user_id", id);
    }
    toast.success(`${ids.length} users suspended`);
    setSelected(new Set());
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const bulkExportCSV = () => {
    const rows = filtered.filter(u => selected.has(u.user_id));
    const header = "Name,Role,Plan,Verified,City,State,Joined\n";
    const csv = header + rows.map(u =>
      `"${u.display_name || ""}","${u.role || ""}","${u.subscription_plan}","${u.is_verified ? "yes" : "no"}","${u.city || ""}","${u.state || ""}","${new Date(u.created_at).toLocaleDateString()}"`
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users-export.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} users`);
  };

  return (
    <div>
      <h1 className="font-syne font-bold text-xl text-[#F0F2F7] mb-6 lowercase">users</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5A6478]" />
          <Input
            placeholder="search by name or id..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-[#0E1420] border-white/[0.06] text-[#F0F2F7] text-xs h-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-32 bg-[#0E1420] border-white/[0.06] text-xs h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">all roles</SelectItem>
            <SelectItem value="artist">artist</SelectItem>
            <SelectItem value="promoter">promoter</SelectItem>
            <SelectItem value="venue">venue</SelectItem>
            <SelectItem value="production">production</SelectItem>
            <SelectItem value="photo_video">creative</SelectItem>
          </SelectContent>
        </Select>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-28 bg-[#0E1420] border-white/[0.06] text-xs h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">all plans</SelectItem>
            <SelectItem value="free">free</SelectItem>
            <SelectItem value="pro">pro</SelectItem>
            <SelectItem value="agency">agency</SelectItem>
          </SelectContent>
        </Select>
        <Select value={verifiedFilter} onValueChange={setVerifiedFilter}>
          <SelectTrigger className="w-32 bg-[#0E1420] border-white/[0.06] text-xs h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">all status</SelectItem>
            <SelectItem value="verified">verified</SelectItem>
            <SelectItem value="unverified">unverified</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 text-xs text-[#8892A4] hover:text-[#F0F2F7]"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <Filter className="w-3.5 h-3.5 mr-1" />
          {showAdvanced ? "hide" : "more"}
        </Button>
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="flex flex-wrap gap-3 mb-3 p-3 bg-[#0E1420] border border-white/[0.06] rounded-xl">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#5A6478]">joined from</span>
            <Input type="date" value={joinFrom} onChange={e => setJoinFrom(e.target.value)} className="w-36 bg-[#141B28] border-white/[0.06] text-xs h-8" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#5A6478]">to</span>
            <Input type="date" value={joinTo} onChange={e => setJoinTo(e.target.value)} className="w-36 bg-[#141B28] border-white/[0.06] text-xs h-8" />
          </div>
          <Select value={suspendedFilter} onValueChange={setSuspendedFilter}>
            <SelectTrigger className="w-32 bg-[#141B28] border-white/[0.06] text-xs h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">all accounts</SelectItem>
              <SelectItem value="active">active only</SelectItem>
              <SelectItem value="suspended">suspended</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" className="h-8 text-[10px] text-[#5A6478]" onClick={() => { setJoinFrom(""); setJoinTo(""); setSuspendedFilter("all"); }}>
            <X className="w-3 h-3 mr-1" /> clear
          </Button>
        </div>
      )}

      {/* Bulk actions toolbar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 mb-3 p-2.5 bg-[#C8FF3E]/[0.06] border border-[#C8FF3E]/20 rounded-xl">
          <span className="text-xs text-[#C8FF3E] font-syne font-semibold mr-2">{selected.size} selected</span>
          <Button size="sm" variant="ghost" className="h-7 text-[10px] text-[#3EFFBE] hover:text-[#3EFFBE]" onClick={bulkVerify}>
            <CheckCircle className="w-3 h-3 mr-1" /> verify
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-[10px] text-[#FF5C5C] hover:text-[#FF5C5C]" onClick={bulkSuspend}>
            <XCircle className="w-3 h-3 mr-1" /> suspend
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-[10px] text-[#8892A4]" onClick={bulkExportCSV}>
            <Download className="w-3 h-3 mr-1" /> export csv
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-[10px] text-[#FFB83E] hover:text-[#FFB83E]" onClick={() => toast.info("Announcement feature coming soon")}>
            <Megaphone className="w-3 h-3 mr-1" /> announce
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-[10px] text-[#5A6478] ml-auto" onClick={() => setSelected(new Set())}>
            clear
          </Button>
        </div>
      )}

      <p className="text-[11px] text-[#5A6478] mb-3 font-display">{filtered.length} users</p>

      {/* Table */}
      <div className="bg-[#0E1420] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-3 py-3 w-8">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleSelectAll}
                    className="border-white/20 data-[state=checked]:bg-[#C8FF3E] data-[state=checked]:text-[#080C14]"
                  />
                </th>
                <th className="text-left px-4 py-3 text-[#5A6478] font-display font-normal lowercase cursor-pointer select-none" onClick={() => handleSort("display_name")}>
                  user <SortIcon col="display_name" />
                </th>
                <th className="text-left px-4 py-3 text-[#5A6478] font-display font-normal lowercase">role</th>
                <th className="text-left px-4 py-3 text-[#5A6478] font-display font-normal lowercase cursor-pointer select-none" onClick={() => handleSort("subscription_plan")}>
                  plan <SortIcon col="subscription_plan" />
                </th>
                <th className="text-left px-4 py-3 text-[#5A6478] font-display font-normal lowercase">verified</th>
                <th className="text-left px-4 py-3 text-[#5A6478] font-display font-normal lowercase">bookings</th>
                <th className="text-left px-4 py-3 text-[#5A6478] font-display font-normal lowercase cursor-pointer select-none" onClick={() => handleSort("created_at")}>
                  joined <SortIcon col="created_at" />
                </th>
                <th className="text-right px-4 py-3 text-[#5A6478] font-display font-normal lowercase">actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr
                  key={u.id}
                  className={`border-b border-white/[0.04] transition-colors cursor-pointer ${selected.has(u.user_id) ? "bg-[#C8FF3E]/[0.03]" : "hover:bg-white/[0.02]"}`}
                  onClick={() => setDetailUser(u)}
                >
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={selected.has(u.user_id)}
                      onCheckedChange={() => toggleSelect(u.user_id)}
                      className="border-white/20 data-[state=checked]:bg-[#C8FF3E] data-[state=checked]:text-[#080C14]"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} className="w-7 h-7 rounded-full object-cover" alt="" loading="lazy" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-[#1C2535] flex items-center justify-center text-[10px] font-bold text-[#8892A4]">
                          {(u.display_name || "?")[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-[#F0F2F7] font-medium flex items-center gap-1">
                          {u.display_name || "unnamed"}
                          {u.suspended && <Badge variant="destructive" className="text-[8px] px-1 py-0">suspended</Badge>}
                        </p>
                        <p className="text-[10px] text-[#5A6478]">{u.city}{u.state ? `, ${u.state}` : ""}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-[10px] border-white/[0.1]" style={{ color: ROLE_COLORS[u.role ?? ""] ?? "#8892A4" }}>
                      {u.role || "—"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <Select value={u.subscription_plan || "free"} onValueChange={v => changePlan(u.user_id, v)}>
                      <SelectTrigger className="w-20 h-6 text-[10px] bg-transparent border-white/[0.08]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">free</SelectItem>
                        <SelectItem value="pro">pro</SelectItem>
                        <SelectItem value="agency">agency</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <button onClick={() => toggleVerify(u.user_id, !!u.is_verified)} className="transition-colors active:scale-95">
                      {u.is_verified ? <CheckCircle className="w-4 h-4 text-[#3EFFBE]" /> : <XCircle className="w-4 h-4 text-[#5A6478]" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-[#8892A4] tabular-nums">{userBookings?.[u.user_id] ?? 0}</td>
                  <td className="px-4 py-3 text-[#8892A4]">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-[#FFB83E] hover:text-[#FFB83E]" onClick={() => toggleAdmin(u.user_id)} title="Toggle admin role">
                        <Shield className="w-3 h-3 mr-1" />admin
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => toggleSuspend(u.user_id, u.suspended)}>
                        {u.suspended ? "unsuspend" : "suspend"}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-[#FF5C5C] hover:text-[#FF5C5C]" onClick={() => deleteUser(u.user_id, u.display_name || "")}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-[#5A6478]">no users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Detail Slide-over */}
      <Sheet open={!!detailUser} onOpenChange={open => !open && setDetailUser(null)}>
        <SheetContent className="bg-[#0E1420] border-l border-white/[0.06] w-full sm:max-w-lg overflow-y-auto">
          {detailUser && (
            <>
              <SheetHeader className="mb-6">
                <SheetTitle className="text-[#F0F2F7] font-syne lowercase flex items-center gap-3">
                  {detailUser.avatar_url ? (
                    <img src={detailUser.avatar_url} className="w-12 h-12 rounded-full object-cover" alt="" loading="lazy" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#1C2535] flex items-center justify-center text-lg font-bold text-[#8892A4]">
                      {(detailUser.display_name || "?")[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-base">{detailUser.display_name || "unnamed"}</p>
                    <p className="text-[10px] text-[#5A6478] font-normal">{detailUser.user_id}</p>
                  </div>
                </SheetTitle>
              </SheetHeader>

              {/* Profile Info */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["role", detailUser.role || "—"],
                    ["plan", detailUser.subscription_plan],
                    ["verified", detailUser.is_verified ? "yes" : "no"],
                    ["suspended", detailUser.suspended ? "yes" : "no"],
                    ["location", [detailUser.city, detailUser.state].filter(Boolean).join(", ") || "—"],
                    ["genre", detailUser.genre || "—"],
                    ["joined", new Date(detailUser.created_at).toLocaleDateString()],
                    ["fee range", detailUser.rate_min || detailUser.rate_max ? `$${detailUser.rate_min ?? 0}–$${detailUser.rate_max ?? 0}` : "—"],
                  ].map(([label, val]) => (
                    <div key={label as string} className="bg-[#141B28] rounded-lg p-3">
                      <p className="text-[10px] text-[#5A6478] lowercase mb-1">{label}</p>
                      <p className="text-xs text-[#F0F2F7]">{val}</p>
                    </div>
                  ))}
                </div>

                {detailUser.bio && (
                  <div className="bg-[#141B28] rounded-lg p-3">
                    <p className="text-[10px] text-[#5A6478] lowercase mb-1">bio</p>
                    <p className="text-xs text-[#8892A4]">{detailUser.bio}</p>
                  </div>
                )}

                {/* Socials */}
                {(detailUser.instagram || detailUser.spotify || detailUser.website) && (
                  <div className="bg-[#141B28] rounded-lg p-3">
                    <p className="text-[10px] text-[#5A6478] lowercase mb-2">links</p>
                    <div className="flex flex-wrap gap-2">
                      {detailUser.instagram && <Badge variant="outline" className="text-[10px] border-white/[0.1] text-[#8892A4]">IG: {detailUser.instagram}</Badge>}
                      {detailUser.spotify && <Badge variant="outline" className="text-[10px] border-white/[0.1] text-[#8892A4]">Spotify</Badge>}
                      {detailUser.website && <Badge variant="outline" className="text-[10px] border-white/[0.1] text-[#8892A4]">Web</Badge>}
                    </div>
                  </div>
                )}

                {/* Offers */}
                <div>
                  <h3 className="font-syne font-semibold text-sm text-[#F0F2F7] mb-2 lowercase">recent offers ({detailOffers?.length ?? 0})</h3>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {detailOffers?.map(o => (
                      <div key={o.id} className="flex items-center justify-between bg-[#141B28] rounded-lg px-3 py-2">
                        <div>
                          <p className="text-[11px] text-[#F0F2F7]">{o.venue_name}</p>
                          <p className="text-[10px] text-[#5A6478]">{new Date(o.event_date).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] font-syne font-bold text-[#C8FF3E]">${Number(o.guarantee).toLocaleString()}</p>
                          <Badge variant="outline" className="text-[8px] border-white/[0.08]">{o.status}</Badge>
                        </div>
                      </div>
                    ))}
                    {(!detailOffers || detailOffers.length === 0) && <p className="text-[10px] text-[#5A6478] text-center py-3">no offers</p>}
                  </div>
                </div>

                {/* Bookings */}
                <div>
                  <h3 className="font-syne font-semibold text-sm text-[#F0F2F7] mb-2 lowercase">bookings ({detailBookings?.length ?? 0})</h3>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {detailBookings?.map(b => (
                      <div key={b.id} className="flex items-center justify-between bg-[#141B28] rounded-lg px-3 py-2">
                        <div>
                          <p className="text-[11px] text-[#F0F2F7]">{b.venue_name}</p>
                          <p className="text-[10px] text-[#5A6478]">{new Date(b.event_date).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] font-syne font-bold text-[#C8FF3E]">${Number(b.guarantee).toLocaleString()}</p>
                          <Badge variant="outline" className="text-[8px] border-white/[0.08]">{b.status}</Badge>
                        </div>
                      </div>
                    ))}
                    {(!detailBookings || detailBookings.length === 0) && <p className="text-[10px] text-[#5A6478] text-center py-3">no bookings</p>}
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-white/[0.06]">
                  <Button size="sm" variant="ghost" className="h-7 text-[10px] text-[#FFB83E]" onClick={() => { toggleAdmin(detailUser.user_id); }}>
                    <Shield className="w-3 h-3 mr-1" /> toggle admin
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => { toggleVerify(detailUser.user_id, !!detailUser.is_verified); }}>
                    {detailUser.is_verified ? "remove verify" : "verify"}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => { toggleSuspend(detailUser.user_id, detailUser.suspended); }}>
                    {detailUser.suspended ? "unsuspend" : "suspend"}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-[10px] text-[#FF5C5C]" onClick={() => { deleteUser(detailUser.user_id, detailUser.display_name || ""); setDetailUser(null); }}>
                    <Trash2 className="w-3 h-3 mr-1" /> delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
