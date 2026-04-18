import { useState, useEffect, lazy } from "react";
import { Link } from "react-router-dom";
import EmptyState from "@/components/EmptyState";
import { SkeletonCard } from "@/components/SkeletonCard";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Users, DollarSign, FileText, Plus, Trash2, ArrowLeft, MapPin, Clock, Sparkles, Loader2 as SpinnerIcon, Car, ArrowRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import toast from "react-hot-toast";
import EditStopDialog from "@/components/EditStopDialog";
import TransportSection from "@/components/TransportSection";
import SEO from "@/components/SEO";

type Tour = { id: string; name: string; description: string | null; start_date: string | null; end_date: string | null; status: string };
type TourStop = { id: string; tour_id: string; venue_name: string; city: string | null; state: string | null; date: string; load_in_time: string | null; sound_check_time: string | null; doors_time: string | null; show_time: string | null; guarantee: number | null; notes: string | null; sort_order: number };
type CrewMember = { id: string; tour_id: string; name: string; role: string; email: string | null; phone: string | null; day_rate: number | null; notes: string | null };
type BudgetItem = { id: string; tour_id: string; category: string; description: string; estimated_cost: number; actual_cost: number | null; notes: string | null };
type TourDoc = { id: string; tour_id: string; file_name: string; file_path: string; file_size: number | null; mime_type: string | null; created_at: string };

const BUDGET_CATEGORIES = ["travel", "lodging", "food", "gear", "crew", "marketing", "misc"];

export default function TourManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tours, setTours] = useState<Tour[]>([]);
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTourName, setNewTourName] = useState("");
  const [newTourDesc, setNewTourDesc] = useState("");
  const [loading, setLoading] = useState(true);

  // Sub-data
  const [stops, setStops] = useState<TourStop[]>([]);
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [budget, setBudget] = useState<BudgetItem[]>([]);
  const [docs, setDocs] = useState<TourDoc[]>([]);
  const [editingStop, setEditingStop] = useState<TourStop | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [optimization, setOptimization] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("tours").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => { setTours((data as Tour[]) ?? []); setLoading(false); });
  }, [user]);

  const loadTourData = async (tourId: string) => {
    const [s, c, b, d] = await Promise.all([
      supabase.from("tour_stops").select("*").eq("tour_id", tourId).order("date"),
      supabase.from("crew_members").select("*").eq("tour_id", tourId).order("created_at"),
      supabase.from("tour_budget_items").select("*").eq("tour_id", tourId).order("created_at"),
      supabase.from("tour_documents").select("*").eq("tour_id", tourId).order("created_at"),
    ]);
    setStops((s.data as TourStop[]) ?? []);
    setCrew((c.data as CrewMember[]) ?? []);
    setBudget((b.data as BudgetItem[]) ?? []);
    setDocs((d.data as TourDoc[]) ?? []);
  };

  const selectTour = (tour: Tour) => {
    setSelectedTour(tour);
    loadTourData(tour.id);
  };

  const createTour = async () => {
    if (!user || !newTourName.trim()) return;
    const { data, error } = await supabase.from("tours").insert({ user_id: user.id, name: newTourName.trim(), description: newTourDesc.trim() || null }).select().single();
    if (error) { toast.error(error.message); return; }
    const tour = data as Tour;
    setTours([tour, ...tours]);
    selectTour(tour);
    setShowCreate(false);
    setNewTourName("");
    setNewTourDesc("");
    toast.success("Tour created!");
  };

  const deleteTour = async (id: string) => {
    const { error } = await supabase.from("tours").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setTours(tours.filter((t) => t.id !== id));
    if (selectedTour?.id === id) { setSelectedTour(null); setStops([]); setCrew([]); setBudget([]); setDocs([]); }
    toast.success("Tour deleted");
  };

  // --- STOP CRUD ---
  const addStop = async () => {
    if (!selectedTour) return;
    const { data, error } = await supabase.from("tour_stops").insert({ tour_id: selectedTour.id, venue_name: "New Venue", date: new Date().toISOString().split("T")[0], sort_order: stops.length }).select().single();
    if (error) { toast.error(error.message); return; }
    setStops([...stops, data as TourStop]);
    toast.success("Stop added.");
  };

  const updateStop = async (id: string, updates: Partial<TourStop>) => {
    const { error } = await supabase.from("tour_stops").update(updates).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setStops(stops.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    toast.success("Stop updated.");
  };

  const deleteStop = async (id: string) => {
    const { error } = await supabase.from("tour_stops").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setStops(stops.filter((s) => s.id !== id));
    toast.success("Stop removed.");
  };

  // --- CREW CRUD ---
  const addCrew = async () => {
    if (!selectedTour) return;
    const { data, error } = await supabase.from("crew_members").insert({ tour_id: selectedTour.id, name: "", role: "" }).select().single();
    if (error) { toast.error(error.message); return; }
    setCrew([...crew, data as CrewMember]);
    toast.success("Crew member added.");
  };

  const updateCrew = async (id: string, updates: Partial<CrewMember>) => {
    const { error } = await supabase.from("crew_members").update(updates).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setCrew(crew.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const deleteCrew = async (id: string) => {
    const { error } = await supabase.from("crew_members").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setCrew(crew.filter((c) => c.id !== id));
    toast.success("Crew member removed.");
  };

  // --- BUDGET CRUD ---
  const addBudget = async () => {
    if (!selectedTour) return;
    const { data, error } = await supabase.from("tour_budget_items").insert({ tour_id: selectedTour.id, category: "misc" as any, description: "", estimated_cost: 0 }).select().single();
    if (error) { toast.error(error.message); return; }
    setBudget([...budget, data as BudgetItem]);
  };

  const updateBudget = async (id: string, updates: Partial<BudgetItem>) => {
    const { error } = await supabase.from("tour_budget_items").update(updates).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setBudget(budget.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };

  const deleteBudget = async (id: string) => {
    const { error } = await supabase.from("tour_budget_items").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setBudget(budget.filter((b) => b.id !== id));
    toast.success("Item removed.");
  };

  // --- DOCUMENT UPLOAD ---
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !selectedTour || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    const filePath = `${user.id}/${selectedTour.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from("tour-documents").upload(filePath, file);
    if (uploadError) { toast.error(uploadError.message); return; }
    const { data, error } = await supabase.from("tour_documents").insert({
      tour_id: selectedTour.id,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: user.id,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setDocs([...docs, data as TourDoc]);
    toast.success("Document uploaded!");
    e.target.value = "";
  };

  const deleteDoc = async (doc: TourDoc) => {
    await supabase.storage.from("tour-documents").remove([doc.file_path]);
    await supabase.from("tour_documents").delete().eq("id", doc.id);
    setDocs(docs.filter((d) => d.id !== doc.id));
    toast.success("Document deleted");
  };

  const downloadDoc = async (doc: TourDoc) => {
    const { data } = await supabase.storage.from("tour-documents").createSignedUrl(doc.file_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  // Budget totals
  const totalEstimated = budget.reduce((s, b) => s + (b.estimated_cost || 0), 0);
  const totalActual = budget.reduce((s, b) => s + (b.actual_cost || 0), 0);
  const totalGuarantees = stops.reduce((s, st) => s + (st.guarantee || 0), 0);

  if (!selectedTour) {
    return (
      <div className="min-h-screen pt-20 px-4 sm:px-6 md:px-8 pb-12">
      <SEO title="Tour Management | GetBooked.Live" description="Plan and manage your tours, stops, crew, and budget in one place." />
        <div className="container mx-auto max-w-3xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="section-label">tours</span>
              <h1 className="section-heading">tour management</h1>
              <p className="section-subtext">Plan and manage your multi-city runs.</p>
            </div>
            <Button id="create-tour-btn" onClick={() => setShowCreate(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-transform">
              <Plus className="w-4 h-4 mr-1" /> New Tour
            </Button>
          </div>

          {showCreate && (
            <div className="rounded-xl bg-card border border-border p-5 mb-6">
              <h2 className="font-display font-semibold mb-3">Create a tour</h2>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm">Tour name</Label>
                  <Input value={newTourName} onChange={(e) => setNewTourName(e.target.value)} placeholder="Summer 2026 Run" className="mt-1 bg-background border-border" maxLength={100} />
                </div>
                <div>
                  <Label className="text-sm">Description (optional)</Label>
                  <Textarea value={newTourDesc} onChange={(e) => setNewTourDesc(e.target.value)} placeholder="Southeast club tour..." className="mt-1 bg-background border-border" rows={2} maxLength={500} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={createTour} disabled={!newTourName.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90">Create</Button>
                  <Button variant="outline" onClick={() => setShowCreate(false)} className="border-border">Cancel</Button>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse rounded-xl bg-white/[0.05] h-24" />
              ))}
            </div>
          ) : tours.length === 0 ? (
            <EmptyState
              emoji="📍"
              title="Plan your first tour"
              description="Add your shows, crew, and budget all in one place."
              actionLabel="Create your first tour →"
              onAction={() => document.getElementById('create-tour-btn')?.click()}
            />
          ) : (
            <div className="space-y-3">
              {tours.map((tour) => (
                <div key={tour.id} className="rounded-xl bg-card border border-border p-5 flex items-center justify-between hover:border-primary/20 transition-all cursor-pointer" onClick={() => selectTour(tour)}>
                  <div>
                    <h3 className="font-display font-semibold">{tour.name}</h3>
                    {tour.description && <p className="text-sm text-muted-foreground line-clamp-1">{tour.description}</p>}
                    <span className="text-xs text-muted-foreground mt-1 inline-block capitalize">{tour.status}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); deleteTour(tour.id); }} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 px-4 sm:px-6 md:px-8 pb-12">
      <div className="container mx-auto max-w-5xl">
        <button onClick={() => setSelectedTour(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> All Tours
        </button>
        <h1 className="font-display text-2xl font-bold mb-1">{selectedTour.name}</h1>
        {selectedTour.description && <p className="text-muted-foreground text-sm mb-6">{selectedTour.description}</p>}

        <Tabs defaultValue="itinerary" className="mt-4">
          <div className="overflow-x-auto -mx-4 px-4 pb-2 scrollbar-hide">
            <TabsList className="bg-transparent border-b border-border rounded-none mb-6 inline-flex w-max whitespace-nowrap h-auto p-0 gap-0">
              {[
                { value: "itinerary", icon: MapPin, label: "Itinerary" },
                { value: "crew", icon: Users, label: "Crew" },
                { value: "budget", icon: DollarSign, label: "Budget" },
                { value: "documents", icon: FileText, label: "Docs" },
                { value: "transport", icon: Car, label: "Transport" },
              ].map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-none border-b-2 border-transparent text-muted-foreground text-xs px-3 py-2.5 transition-all duration-150 data-[state=active]:border-b-primary data-[state=active]:bg-primary/[0.12] data-[state=active]:text-primary data-[state=active]:shadow-none"
                >
                  <tab.icon className="w-3.5 h-3.5 mr-1 shrink-0" />
                  <span className="whitespace-nowrap">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* ITINERARY */}
          <TabsContent value="itinerary">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-display font-semibold">Itinerary</h2>
                <p className="text-xs text-muted-foreground">{stops.length} stop{stops.length !== 1 ? "s" : ""} · ${totalGuarantees.toLocaleString()} total guarantees</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {stops.length >= 2 && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={optimizing}
                    onClick={async () => {
                      setOptimizing(true);
                      try {
                        const { data, error } = await supabase.functions.invoke("optimize-tour", {
                          body: { stops: stops.map((s) => ({ venue_name: s.venue_name, city: s.city, state: s.state, date: s.date })) },
                        });
                        if (error) throw error;
                        setOptimization(data);
                        toast.success("Tour optimization complete!");
                      } catch (err: any) {
                        toast.error(err.message || "Optimization failed");
                      } finally {
                        setOptimizing(false);
                      }
                    }}
                    className="border-primary/30 text-primary hover:bg-primary/10 active:scale-[0.97] transition-transform text-xs"
                  >
                    {optimizing ? <SpinnerIcon className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
                    Optimise
                  </Button>
                )}
                <Button size="sm" onClick={addStop} className="bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-transform text-xs"><Plus className="w-3.5 h-3.5 mr-1" /> Add Stop</Button>
              </div>
            </div>

            {/* Optimization Results */}
            {optimization && (
              <div className="rounded-xl bg-card border border-primary/20 p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-syne font-semibold text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Route Optimization</h3>
                  <button onClick={() => setOptimization(null)} className="text-xs text-muted-foreground hover:text-foreground">Dismiss</button>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{optimization.summary}</p>
                {optimization.savings_pct > 0 && (
                  <p className="text-xs text-primary font-medium mb-2">
                    Estimated {optimization.savings_pct}% travel savings ({optimization.total_current_miles?.toLocaleString()} → {optimization.total_optimized_miles?.toLocaleString()} miles)
                  </p>
                )}
                {optimization.optimized_order && (
                  <div className="space-y-1.5 mb-3">
                    {optimization.optimized_order.map((stop: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                        <span className="text-foreground">{stop.venue_name}</span>
                        <span className="text-muted-foreground">· {stop.city}, {stop.state}</span>
                        <span className={cn("text-[10px] px-1.5 py-0 rounded", stop.travel_mode === "fly" ? "bg-blue-500/10 text-blue-400" : "bg-green-500/10 text-green-400")}>
                          {stop.travel_mode} · {stop.distance_miles}mi
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {optimization.gap_opportunities?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Gap Opportunities</p>
                    {optimization.gap_opportunities.map((gap: any, i: number) => (
                      <p key={i} className="text-xs text-muted-foreground">{gap.suggestion}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
            {stops.length === 0 ? (
              <div className="rounded-xl bg-card border border-border p-8 text-center">
                <MapPin className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-3">No stops added yet.</p>
                <Link to="/directory?role=venue">
                  <Button size="sm" variant="outline" className="text-xs h-8">
                    Browse venues in directory <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                {stops.length >= 2 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {[...new Set(stops.filter((s) => s.city).map((s) => s.city!))].map((city) => (
                      <Link key={city} to={`/directory?role=venue&city=${encodeURIComponent(city)}`}>
                        <Button size="sm" variant="ghost" className="text-[11px] h-7 text-muted-foreground hover:text-foreground">
                          Browse venues in {city} <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </Link>
                    ))}
                  </div>
                )}
              <div className="space-y-3">
                {stops.map((stop, i) => (
                  <div key={stop.id} className="rounded-xl bg-card border border-border p-4 cursor-pointer hover:border-primary/20 transition-all" onClick={() => setEditingStop(stop)}>
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3 mb-3">
                      <div className="flex items-center gap-3 sm:block">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      </div>
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">Venue</Label>
                          <Input value={stop.venue_name} onChange={(e) => updateStop(stop.id, { venue_name: e.target.value })} className="mt-0.5 h-11 sm:h-8 text-sm bg-background border-border" maxLength={200} />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">City, State</Label>
                          <div className="flex gap-1 mt-0.5">
                            <Input value={stop.city ?? ""} onChange={(e) => updateStop(stop.id, { city: e.target.value })} placeholder="City" className="h-11 sm:h-8 text-sm bg-background border-border" maxLength={100} />
                            <Input value={stop.state ?? ""} onChange={(e) => updateStop(stop.id, { state: e.target.value })} placeholder="ST" className="h-11 sm:h-8 text-sm bg-background border-border w-20 sm:w-16" maxLength={2} />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Date</Label>
                          <Input type="date" value={stop.date} onChange={(e) => updateStop(stop.id, { date: e.target.value })} className="mt-0.5 h-11 sm:h-8 text-sm bg-background border-border" />
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => deleteStop(stop.id)} className="text-muted-foreground hover:text-destructive shrink-0 self-start"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 ml-0 sm:ml-9 mt-2 sm:mt-0">
                      <div><Label className="text-xs text-muted-foreground">Load-in</Label><Input type="time" value={stop.load_in_time ?? ""} onChange={(e) => updateStop(stop.id, { load_in_time: e.target.value || null })} className="mt-0.5 h-11 sm:h-7 text-xs bg-background border-border" /></div>
                      <div><Label className="text-xs text-muted-foreground">Soundcheck</Label><Input type="time" value={stop.sound_check_time ?? ""} onChange={(e) => updateStop(stop.id, { sound_check_time: e.target.value || null })} className="mt-0.5 h-11 sm:h-7 text-xs bg-background border-border" /></div>
                      <div><Label className="text-xs text-muted-foreground">Doors</Label><Input type="time" value={stop.doors_time ?? ""} onChange={(e) => updateStop(stop.id, { doors_time: e.target.value || null })} className="mt-0.5 h-11 sm:h-7 text-xs bg-background border-border" /></div>
                      <div><Label className="text-xs text-muted-foreground">Show</Label><Input type="time" value={stop.show_time ?? ""} onChange={(e) => updateStop(stop.id, { show_time: e.target.value || null })} className="mt-0.5 h-11 sm:h-7 text-xs bg-background border-border" /></div>
                      <div><Label className="text-xs text-muted-foreground">Guarantee</Label><Input type="number" min="0" value={stop.guarantee ?? ""} onChange={(e) => updateStop(stop.id, { guarantee: parseFloat(e.target.value) || 0 })} className="mt-0.5 h-11 sm:h-7 text-xs bg-background border-border" /></div>
                    </div>
                  </div>
                ))}
              </div>
              </>
            )}
          </TabsContent>

          {/* CREW */}
          <TabsContent value="crew">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold">Crew Manifest</h2>
              <div className="flex gap-2">
                <Link to="/directory?role=production">
                  <Button size="sm" variant="outline" className="border-border text-xs active:scale-[0.97]">
                    Find in directory →
                  </Button>
                </Link>
                <Button size="sm" onClick={addCrew} className="bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-transform"><Plus className="w-3.5 h-3.5 mr-1" /> Add Member</Button>
              </div>
            </div>
            {crew.length === 0 ? (
              <div className="rounded-xl bg-card border border-border p-8 text-center">
                <Users className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-3">No crew members added yet.</p>
                <Link to="/directory?role=production">
                  <Button size="sm" variant="outline" className="text-xs h-8">
                    Browse production in directory <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {crew.map((member) => (
                  <div key={member.id} className="rounded-xl bg-card border border-border p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div><Label className="text-xs text-muted-foreground">Name</Label><Input value={member.name} onChange={(e) => updateCrew(member.id, { name: e.target.value })} placeholder="Name" className="mt-0.5 h-8 text-sm bg-background border-border" maxLength={100} /></div>
                      <div><Label className="text-xs text-muted-foreground">Role</Label><Input value={member.role} onChange={(e) => updateCrew(member.id, { role: e.target.value })} placeholder="FOH Engineer" className="mt-0.5 h-8 text-sm bg-background border-border" maxLength={100} /></div>
                      <div><Label className="text-xs text-muted-foreground">Email</Label><Input type="email" value={member.email ?? ""} onChange={(e) => updateCrew(member.id, { email: e.target.value || null })} placeholder="email@example.com" className="mt-0.5 h-8 text-sm bg-background border-border" maxLength={255} /></div>
                      <div className="flex gap-2">
                        <div className="flex-1"><Label className="text-xs text-muted-foreground">Day Rate</Label><Input type="number" min="0" value={member.day_rate ?? ""} onChange={(e) => updateCrew(member.id, { day_rate: parseFloat(e.target.value) || null })} placeholder="$" className="mt-0.5 h-8 text-sm bg-background border-border" /></div>
                        <Button variant="ghost" size="sm" onClick={() => deleteCrew(member.id)} className="text-muted-foreground hover:text-destructive self-end"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* BUDGET */}
          <TabsContent value="budget">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display font-semibold">Budget Tracker</h2>
                <p className="text-xs text-muted-foreground">
                  Estimated: ${totalEstimated.toLocaleString()} · Actual: ${totalActual.toLocaleString()} · 
                  Net: <span className={totalGuarantees - totalActual >= 0 ? "text-primary" : "text-destructive"}>${(totalGuarantees - totalActual).toLocaleString()}</span>
                </p>
              </div>
              <Button size="sm" onClick={addBudget} className="bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-transform"><Plus className="w-3.5 h-3.5 mr-1" /> Add Item</Button>
            </div>
            {budget.length === 0 ? (
              <div className="rounded-xl bg-card border border-border p-8 text-center text-muted-foreground text-sm">No budget items yet.</div>
            ) : (
              <div className="space-y-3">
                {budget.map((item) => (
                  <div key={item.id} className="rounded-xl bg-card border border-border p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Category</Label>
                        <select value={item.category} onChange={(e) => updateBudget(item.id, { category: e.target.value })} className="mt-0.5 h-8 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground">
                          {BUDGET_CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                        </select>
                      </div>
                      <div className="sm:col-span-2"><Label className="text-xs text-muted-foreground">Description</Label><Input value={item.description} onChange={(e) => updateBudget(item.id, { description: e.target.value })} placeholder="Item..." className="mt-0.5 h-8 text-sm bg-background border-border" maxLength={200} /></div>
                      <div><Label className="text-xs text-muted-foreground">Estimated</Label><Input type="number" min="0" value={item.estimated_cost} onChange={(e) => updateBudget(item.id, { estimated_cost: parseFloat(e.target.value) || 0 })} className="mt-0.5 h-8 text-sm bg-background border-border" /></div>
                      <div className="flex gap-2">
                        <div className="flex-1"><Label className="text-xs text-muted-foreground">Actual</Label><Input type="number" min="0" value={item.actual_cost ?? ""} onChange={(e) => updateBudget(item.id, { actual_cost: parseFloat(e.target.value) || null })} className="mt-0.5 h-8 text-sm bg-background border-border" /></div>
                        <Button variant="ghost" size="sm" onClick={() => deleteBudget(item.id)} className="text-muted-foreground hover:text-destructive self-end"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* DOCUMENTS */}
          <TabsContent value="documents">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold">Documents</h2>
              <label className="cursor-pointer">
                <input type="file" className="hidden" onChange={handleDocUpload} accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg" />
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-transform pointer-events-none"><Plus className="w-3.5 h-3.5 mr-1" /> Upload</Button>
              </label>
            </div>
            {docs.length === 0 ? (
              <div className="rounded-xl bg-card border border-border p-8 text-center text-muted-foreground text-sm">No documents uploaded yet.</div>
            ) : (
              <div className="space-y-2">
                {docs.map((doc) => (
                  <div key={doc.id} className="rounded-xl bg-card border border-border p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{doc.file_name}</p>
                        <p className="text-xs text-muted-foreground">{doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : ""} · {new Date(doc.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => downloadDoc(doc)} className="text-primary text-xs">Download</Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteDoc(doc)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TRANSPORT */}
          <TabsContent value="transport">
            <TransportSection stops={stops} tourId={selectedTour.id} />
          </TabsContent>
        </Tabs>
      </div>

      {editingStop && (
        <EditStopDialog
          stop={editingStop}
          open={!!editingStop}
          onOpenChange={(open) => { if (!open) setEditingStop(null); }}
          onSaved={(updates) => {
            setStops(stops.map((s) => (s.id === editingStop.id ? { ...s, ...updates } : s)));
            setEditingStop(null);
          }}
          onDeleted={(id) => {
            setStops(stops.filter((s) => s.id !== id));
            setEditingStop(null);
          }}
        />
      )}
    </div>
  );
}
