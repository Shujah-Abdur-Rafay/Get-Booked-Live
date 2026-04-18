import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Car, Star, MapPin, DollarSign, Loader2 } from "lucide-react";
import { toast } from "sonner";

type TransportListing = {
  id: string;
  provider_id: string;
  vehicle_type: string;
  vehicle_capacity: number;
  rate_per_hour: number | null;
  rate_per_trip: number | null;
  cities_served: string[];
  description: string | null;
  rating: number;
  review_count: number;
};

type TourStop = {
  id: string;
  venue_name: string;
  city: string | null;
  state: string | null;
  date: string;
};

type Props = {
  stops: TourStop[];
  tourId: string;
};

const VEHICLE_ICONS: Record<string, string> = {
  SUV: "🚙",
  Van: "🚐",
  Sprinter: "🚌",
  Bus: "🚌",
  Sedan: "🚗",
};

export default function TransportSection({ stops, tourId }: Props) {
  const { user } = useAuth();
  const [listings, setListings] = useState<TransportListing[]>([]);
  const [existingBookings, setExistingBookings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [bookingStop, setBookingStop] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      // Get all cities from tour stops
      const cities = [...new Set(stops.map((s) => s.city).filter(Boolean))] as string[];

      const { data: tl } = await supabase
        .from("transport_listings" as any)
        .select("*")
        .eq("is_active", true)
        .limit(50);
      setListings((tl as any[]) ?? []);

      // Get existing transport bookings for these stops
      const stopIds = stops.map((s) => s.id);
      if (stopIds.length > 0) {
        const { data: tb } = await supabase
          .from("transport_bookings" as any)
          .select("*")
          .in("tour_stop_id", stopIds);
        const bookMap: Record<string, any> = {};
        (tb ?? []).forEach((b: any) => { bookMap[b.tour_stop_id] = b; });
        setExistingBookings(bookMap);
      }
      setLoading(false);
    };
    load();
  }, [stops]);

  const bookTransport = async (stopId: string, listing: TransportListing) => {
    if (!user) return;
    setBookingStop(stopId);
    const stop = stops.find((s) => s.id === stopId);
    const { data, error } = await supabase.from("transport_bookings" as any).insert({
      listing_id: listing.id,
      tour_stop_id: stopId,
      booked_by: user.id,
      provider_id: listing.provider_id,
      total_cost: listing.rate_per_trip ?? (listing.rate_per_hour ?? 0) * 3,
      pickup_location: stop?.city ?? "",
      dropoff_location: stop?.venue_name ?? "",
      status: "pending",
    }).select().single();

    if (error) toast.error(error.message);
    else {
      toast.success("Transport booked!");
      setExistingBookings({ ...existingBookings, [stopId]: data });
    }
    setBookingStop(null);
  };

  const getListingsForCity = (city: string | null) => {
    if (!city) return listings.slice(0, 3);
    return listings.filter((l) =>
      l.cities_served.some((c) => c.toLowerCase().includes(city.toLowerCase()))
    );
  };

  if (loading) return <div className="h-32 rounded-xl bg-card animate-pulse" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Car className="w-4 h-4 text-primary" />
        <h3 className="font-syne font-semibold text-sm">Ground Transport</h3>
      </div>

      {stops.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Add tour stops to book transport.</p>
      ) : (
        <div className="space-y-3">
          {stops.map((stop) => {
            const existing = existingBookings[stop.id];
            const available = getListingsForCity(stop.city);

            return (
              <div key={stop.id} className="rounded-xl bg-card border border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium">{stop.venue_name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {[stop.city, stop.state].filter(Boolean).join(", ")} · {new Date(stop.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  {existing && (
                    <Badge className={existing.status === "confirmed" ? "bg-[#3EFFBE]/10 text-[#3EFFBE] border-[#3EFFBE]/20" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"}>
                      {existing.status}
                    </Badge>
                  )}
                </div>

                {existing ? (
                  <div className="text-xs text-muted-foreground">
                    <p>Booked · ${Number(existing.total_cost).toLocaleString()} · {existing.pickup_location} → {existing.dropoff_location}</p>
                  </div>
                ) : available.length > 0 ? (
                  <div className="space-y-2">
                    {available.slice(0, 2).map((listing) => (
                      <div key={listing.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{VEHICLE_ICONS[listing.vehicle_type] ?? "🚗"}</span>
                          <div>
                            <p className="text-xs font-medium">{listing.vehicle_type} · {listing.vehicle_capacity} seats</p>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              {listing.rate_per_trip && <span className="flex items-center gap-0.5"><DollarSign className="w-2.5 h-2.5" />{listing.rate_per_trip}/trip</span>}
                              {listing.rating > 0 && <span className="flex items-center gap-0.5"><Star className="w-2.5 h-2.5 text-[#FFB83E]" />{listing.rating.toFixed(1)}</span>}
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          disabled={bookingStop === stop.id}
                          onClick={() => bookTransport(stop.id, listing)}
                          className="bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-transform text-xs h-7"
                        >
                          {bookingStop === stop.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Book"}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No transport providers available in this area yet.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
