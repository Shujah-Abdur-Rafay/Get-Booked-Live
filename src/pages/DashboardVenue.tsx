import { useEffect, useState, useRef } from "react";
import DashboardOnboarding from "@/components/DashboardOnboarding";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { MapPin, Save, Upload, Trash2, CalendarIcon, Plus, Image as ImageIcon, Building2, Clock, CheckCircle, UserCog } from "lucide-react";
import EditProfilePanel from "@/components/EditProfilePanel";
import GettingStartedChecklist from "@/components/GettingStartedChecklist";
import TrialBanner from "@/components/TrialBanner";
import VenueBookingRequestsInbox from "@/components/VenueBookingRequestsInbox";
import { toast } from "sonner";
import { format } from "date-fns";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import DashboardSidebar, { type NavItem } from "@/components/DashboardSidebar";
import SEO from "@/components/SEO";

type VenueView = "overview" | "requests" | "details" | "photos" | "availability" | "profile";
type VenueListing = { id: string; name: string; city: string | null; state: string | null; address: string | null; phone: string | null; email: string | null; website: string | null; description: string | null; capacity: number | null; amenities: string[] | null; claim_status: string };
type VenuePhoto = { id: string; file_path: string; caption: string | null; sort_order: number };
type AvailableDate = { id: string; available_date: string; notes: string | null };

const ACCENT = "#FFB83E";
const AMENITY_OPTIONS = ["Sound System", "Lighting Rig", "Stage", "Green Room", "Bar", "Kitchen", "Parking", "Loading Dock", "WiFi", "A/C", "Outdoor Space", "VIP Area", "Coat Check", "ADA Accessible"];

const navItems: NavItem<VenueView>[] = [
  { title: "overview", value: "overview", icon: Building2 },
  { title: "requests", value: "requests", icon: Clock },
  { title: "details", value: "details", icon: MapPin },
  { title: "photos", value: "photos", icon: ImageIcon },
  { title: "availability", value: "availability", icon: CalendarIcon },
  { title: "edit profile", value: "profile", icon: UserCog },
];

export default function VenueManage() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeView, setActiveView] = useState<VenueView>("overview");
  const [venues, setVenues] = useState<VenueListing[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<VenueListing | null>(null);
  const [photos, setPhotos] = useState<VenuePhoto[]>([]);
  const [availability, setAvailability] = useState<AvailableDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [dateNote, setDateNote] = useState("");
  const [form, setForm] = useState({ name: "", address: "", phone: "", email: "", website: "", description: "", capacity: "", amenities: [] as string[] });

  useEffect(() => { if (authLoading) return; if (!user) { navigate("/auth"); return; } loadVenues(); }, [user, authLoading]);

  const loadVenues = async () => {
    if (!user) return;
    const { data } = await supabase.from("venue_listings").select("*").eq("claimed_by", user.id).eq("claim_status", "approved");
    const venueData = (data as VenueListing[]) ?? [];
    setVenues(venueData);
    if (venueData.length > 0 && !selectedVenue) selectVenue(venueData[0]);
    setLoading(false);
  };

  const selectVenue = async (v: VenueListing) => {
    setSelectedVenue(v);
    setForm({ name: v.name || "", address: v.address || "", phone: v.phone || "", email: v.email || "", website: v.website || "", description: v.description || "", capacity: v.capacity?.toString() || "", amenities: v.amenities || [] });
    const [photosRes, availRes] = await Promise.all([
      supabase.from("venue_photos").select("*").eq("venue_id", v.id).order("sort_order"),
      supabase.from("venue_availability").select("*").eq("venue_id", v.id).order("available_date"),
    ]);
    setPhotos((photosRes.data as VenuePhoto[]) ?? []);
    setAvailability((availRes.data as AvailableDate[]) ?? []);
  };

  const handleSave = async () => {
    if (!selectedVenue) return;
    setSaving(true);
    const { error } = await supabase.from("venue_listings").update({ name: form.name, address: form.address, phone: form.phone || null, email: form.email || null, website: form.website || null, description: form.description || null, capacity: form.capacity ? parseInt(form.capacity) : null, amenities: form.amenities.length > 0 ? form.amenities : null } as any).eq("id", selectedVenue.id);
    if (error) toast.error(error.message); else toast.success("Venue updated!");
    setSaving(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedVenue || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${selectedVenue.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("venue-photos").upload(path, file);
    if (uploadError) { toast.error(uploadError.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("venue-photos").getPublicUrl(path);
    const { error: insertError } = await supabase.from("venue_photos").insert({ venue_id: selectedVenue.id, file_path: urlData.publicUrl, uploaded_by: user.id, sort_order: photos.length } as any);
    if (insertError) toast.error(insertError.message);
    else { toast.success("Photo uploaded!"); const { data } = await supabase.from("venue_photos").select("*").eq("venue_id", selectedVenue.id).order("sort_order"); setPhotos((data as VenuePhoto[]) ?? []); }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeletePhoto = async (photo: VenuePhoto) => {
    const { error } = await supabase.from("venue_photos").delete().eq("id", photo.id);
    if (error) toast.error(error.message); else { setPhotos(photos.filter((p) => p.id !== photo.id)); toast.success("Photo removed"); }
  };

  const handleAddDate = async () => {
    if (!selectedDate || !selectedVenue) return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const { error } = await supabase.from("venue_availability").insert({ venue_id: selectedVenue.id, available_date: dateStr, notes: dateNote || null } as any);
    if (error) { if (error.code === "23505") toast.error("Date already added"); else toast.error(error.message); }
    else { toast.success("Date added!"); setSelectedDate(undefined); setDateNote(""); const { data } = await supabase.from("venue_availability").select("*").eq("venue_id", selectedVenue.id).order("available_date"); setAvailability((data as AvailableDate[]) ?? []); }
  };

  const handleRemoveDate = async (id: string) => { const { error } = await supabase.from("venue_availability").delete().eq("id", id); if (error) toast.error(error.message); else { setAvailability(availability.filter((a) => a.id !== id)); toast.success("Date removed"); } };
  const toggleAmenity = (a: string) => { setForm((f) => ({ ...f, amenities: f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a] })); };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#080C14]"><div className="w-6 h-6 border-2 border-[#FFB83E] border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (venues.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080C14] px-4">
        <SEO title="Venue Dashboard | GetBooked.Live" description="Manage your venue bookings and events on GetBooked.Live." />
        <div className="text-center max-w-sm">
          <Building2 className="w-8 h-8 mx-auto mb-3" style={{ color: ACCENT }} />
          <h1 className="font-display text-lg font-bold mb-1 lowercase">no claimed venues yet</h1>
          <p className="text-xs text-muted-foreground mb-4">once your venue claim is approved, you'll manage it here.</p>
          <Button onClick={() => navigate("/venues")} size="sm" className="h-7 text-[11px] lowercase active:scale-[0.97]" style={{ backgroundColor: ACCENT, color: "#080C14" }}>browse venues</Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <SEO title="Venue Dashboard | GetBooked.Live" description="Manage your venue bookings and events on GetBooked.Live." />
      <div className="min-h-screen flex w-full bg-[#080C14]">
        <DashboardSidebar items={navItems} activeView={activeView} onViewChange={setActiveView as (v: string) => void} accentColor={ACCENT} roleLabel="venue" roleIcon={Building2} displayName={selectedVenue?.name ?? undefined} />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center gap-3 border-b border-white/[0.06] px-4 sm:px-6 pt-14">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <span className="text-[11px] text-muted-foreground lowercase">{activeView === "overview" ? "dashboard" : activeView}</span>
          </header>

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto space-y-5">

              <DashboardOnboarding />
              {venues.length > 1 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {venues.map((v) => (
                    <button key={v.id} onClick={() => selectVenue(v)} className={`px-3 py-1.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-all active:scale-[0.97] ${selectedVenue?.id === v.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`} style={selectedVenue?.id === v.id ? { backgroundColor: `${ACCENT}15`, color: ACCENT } : undefined}>
                      {v.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Overview */}
              {activeView === "overview" && selectedVenue && (
                <>
                  <TrialBanner />
                  <GettingStartedChecklist variant="venue" />
                  <div className="rounded-lg border border-white/[0.06] bg-[#0e1420] grid grid-cols-2 lg:grid-cols-4 divide-y divide-white/[0.06] lg:divide-y-0 lg:divide-x lg:divide-white/[0.06]">
                    {[
                      { label: "capacity", value: selectedVenue.capacity ?? "—", color: ACCENT },
                      { label: "dates", value: availability.length, color: "#4ADE80" },
                      { label: "photos", value: photos.length, color: "#3EC8FF" },
                      { label: "amenities", value: form.amenities.length, color: "#7B5CF0" },
                    ].map((stat) => (
                      <div key={stat.label} className="px-4 py-3.5 sm:py-4">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{stat.label}</p>
                        <p className="font-display text-base sm:text-lg font-bold tabular-nums" style={{ color: stat.color }}>{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-lg border border-white/[0.06] bg-[#0e1420] p-4">
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">venue info</h3>
                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                      <div><span className="text-[10px] text-muted-foreground uppercase tracking-wider">location</span><p className="text-sm font-medium">{selectedVenue.city && selectedVenue.state ? `${selectedVenue.city}, ${selectedVenue.state}` : selectedVenue.address || "—"}</p></div>
                      <div><span className="text-[10px] text-muted-foreground uppercase tracking-wider">website</span><p className="text-sm font-medium truncate">{selectedVenue.website || "—"}</p></div>
                    </div>
                  </div>
                </>
              )}

              {/* Details */}
              {activeView === "details" && selectedVenue && (
                <>
                  <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">venue details</h2>
                  <div className="rounded-lg border border-white/[0.06] bg-[#0e1420] p-4 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-3">
                      {[
                        { label: "venue name", value: form.name, key: "name" },
                        { label: "address", value: form.address, key: "address" },
                        { label: "phone", value: form.phone, key: "phone" },
                        { label: "email", value: form.email, key: "email" },
                        { label: "website", value: form.website, key: "website" },
                        { label: "capacity", value: form.capacity, key: "capacity", type: "number" },
                      ].map((f) => (
                        <div key={f.key}>
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">{f.label}</Label>
                          <Input type={f.type || "text"} value={f.value} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="mt-1 h-8 text-xs bg-[#080C14] border-white/[0.06]" />
                        </div>
                      ))}
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">description</Label>
                      <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 text-xs bg-[#080C14] border-white/[0.06] min-h-[60px]" maxLength={1000} />
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/[0.06] bg-[#0e1420] p-4">
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">amenities</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {AMENITY_OPTIONS.map((a) => (
                        <button key={a} onClick={() => toggleAmenity(a)} className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all active:scale-[0.97] ${form.amenities.includes(a) ? "" : "bg-white/[0.03] text-muted-foreground hover:text-foreground"}`} style={form.amenities.includes(a) ? { backgroundColor: `${ACCENT}15`, color: ACCENT } : undefined}>
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button onClick={handleSave} disabled={saving} size="sm" className="w-full h-8 text-[11px] lowercase active:scale-[0.97]" style={{ backgroundColor: ACCENT, color: "#080C14" }}>
                    <Save className="w-3 h-3 mr-1" /> {saving ? "saving..." : "save changes"}
                  </Button>
                </>
              )}

              {/* Booking Requests */}
              {activeView === "requests" && selectedVenue && (
                <>
                  <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">booking requests</h2>
                  <VenueBookingRequestsInbox venueId={selectedVenue.id} />
                </>
              )}

              {activeView === "photos" && selectedVenue && (
                <>
                  <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">photos</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {photos.map((p) => (
                      <div key={p.id} className="relative group rounded-lg overflow-hidden aspect-video bg-[#0e1420]">
                        <img src={p.file_path} alt="" className="w-full h-full object-cover" loading="lazy" />
                        <button onClick={() => handleDeletePhoto(p)} className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="aspect-video rounded-lg border border-dashed border-white/[0.1] hover:border-white/[0.2] flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                      {uploading ? <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${ACCENT} transparent transparent transparent` }} /> : <><Upload className="w-4 h-4" /><span className="text-[10px]">add photo</span></>}
                    </button>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </>
              )}

              {/* Availability */}
              {activeView === "availability" && selectedVenue && (
                <>
                  <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">available dates</h2>
                  <div className="rounded-lg border border-white/[0.06] bg-[#0e1420] p-4">
                    <div className="flex flex-col sm:flex-row gap-2 mb-4">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className={cn("h-7 text-[11px] justify-start border border-white/[0.06]", !selectedDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-1.5 h-3 w-3" />
                            {selectedDate ? format(selectedDate, "PPP") : "pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} disabled={(d) => d < new Date()} initialFocus className={cn("p-3 pointer-events-auto")} />
                        </PopoverContent>
                      </Popover>
                      <Input value={dateNote} onChange={(e) => setDateNote(e.target.value)} placeholder="optional note" className="h-7 text-[11px] bg-[#080C14] border-white/[0.06] flex-1" maxLength={200} />
                      <Button onClick={handleAddDate} disabled={!selectedDate} size="sm" className="h-7 text-[11px] active:scale-[0.97]" style={{ backgroundColor: ACCENT, color: "#080C14" }}>
                        <Plus className="w-3 h-3 mr-1" /> add
                      </Button>
                    </div>
                    {availability.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground">no available dates set yet.</p>
                    ) : (
                      <div className="space-y-1">
                        {availability.map((a) => (
                          <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded-md bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ACCENT }} />
                              <span className="text-[11px] font-medium">{format(new Date(a.available_date + "T12:00:00"), "MMM d, yyyy")}</span>
                              {a.notes && <span className="text-[11px] text-muted-foreground">— {a.notes}</span>}
                            </div>
                            <button onClick={() => handleRemoveDate(a.id)} className="text-muted-foreground hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {activeView === "profile" && <EditProfilePanel />}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
