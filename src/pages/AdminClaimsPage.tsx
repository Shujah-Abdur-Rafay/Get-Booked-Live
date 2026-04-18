import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle, Clock, Music, ExternalLink, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import SEO from "@/components/SEO";

type Claim = {
  id: string;
  artist_listing_id: string;
  user_id: string;
  manager_name: string | null;
  proof_text: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  listing_name?: string;
  listing_genre?: string;
  listing_url?: string;
  user_email?: string;
};

export default function AdminClaims() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  // Check admin role
  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("artist_claims")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    // Enrich with listing data
    const listingIds = [...new Set((data || []).map((c) => c.artist_listing_id))];
    const { data: listings } = await supabase
      .from("artist_listings")
      .select("id, name, genre, bandsintown_url")
      .in("id", listingIds);

    const listingMap = new Map(
      (listings || []).map((l) => [l.id, l])
    );

    const enriched: Claim[] = (data || []).map((c) => {
      const listing = listingMap.get(c.artist_listing_id);
      return {
        ...c,
        listing_name: listing?.name ?? "Unknown",
        listing_genre: listing?.genre ?? null,
        listing_url: listing?.bandsintown_url ?? null,
      };
    });

    setClaims(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) fetchClaims();
  }, [isAdmin, fetchClaims]);

  const handleAction = async (claimId: string, action: "approve" | "reject") => {
    setActing(claimId);
    try {
      const { data, error } = await supabase.functions.invoke("admin-claim-action", {
        body: { claim_id: claimId, action },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Claim ${action === "approve" ? "approved" : "rejected"}`);
      fetchClaims();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActing(null);
    }
  };

  if (authLoading || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
      <SEO title="Admin Claims | GetBooked.Live" description="Review and manage artist profile claims." />
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const pending = claims.filter((c) => c.status === "pending");
  const resolved = claims.filter((c) => c.status !== "pending");

  return (
    <div className="min-h-screen bg-background pt-20 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">artist claims</h1>
            <p className="text-sm text-muted-foreground font-body">review and manage profile ownership requests</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Pending */}
            <section className="mb-10">
              <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                pending ({pending.length})
              </h2>
              {pending.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-10 text-center text-muted-foreground text-sm font-body">
                    No pending claims right now.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {pending.map((claim) => (
                    <ClaimCard
                      key={claim.id}
                      claim={claim}
                      acting={acting === claim.id}
                      onAction={handleAction}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Resolved */}
            <section>
              <h2 className="font-display text-lg font-semibold mb-4">resolved ({resolved.length})</h2>
              {resolved.length === 0 ? (
                <p className="text-sm text-muted-foreground font-body">No resolved claims yet.</p>
              ) : (
                <div className="space-y-3">
                  {resolved.map((claim) => (
                    <ClaimCard key={claim.id} claim={claim} acting={false} onAction={handleAction} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function ClaimCard({
  claim,
  acting,
  onAction,
}: {
  claim: Claim;
  acting: boolean;
  onAction: (id: string, action: "approve" | "reject") => void;
}) {
  const isPending = claim.status === "pending";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Music className="w-4 h-4 text-primary shrink-0" />
            <CardTitle className="text-base font-display truncate">{claim.listing_name}</CardTitle>
            {claim.listing_genre && (
              <Badge variant="secondary" className="text-[10px] shrink-0">
                {claim.listing_genre}
              </Badge>
            )}
          </div>
          <Badge
            variant={
              claim.status === "approved"
                ? "default"
                : claim.status === "rejected"
                ? "destructive"
                : "secondary"
            }
            className="shrink-0 capitalize"
          >
            {claim.status === "approved" && <CheckCircle2 className="w-3 h-3 mr-1" />}
            {claim.status === "rejected" && <XCircle className="w-3 h-3 mr-1" />}
            {claim.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm font-body">
          <div>
            <span className="text-muted-foreground text-xs uppercase tracking-wider block mb-0.5">claimed by</span>
            <span className="text-foreground">{claim.user_id.slice(0, 8)}…</span>
          </div>
          {claim.manager_name && (
            <div>
              <span className="text-muted-foreground text-xs uppercase tracking-wider block mb-0.5">manager</span>
              <span className="text-foreground">{claim.manager_name}</span>
            </div>
          )}
          <div>
            <span className="text-muted-foreground text-xs uppercase tracking-wider block mb-0.5">submitted</span>
            <span className="text-foreground tabular-nums">
              {new Date(claim.created_at).toLocaleDateString()}
            </span>
          </div>
          {claim.listing_url && (
            <div>
              <span className="text-muted-foreground text-xs uppercase tracking-wider block mb-0.5">bandsintown</span>
              <a
                href={claim.listing_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                view <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {claim.proof_text && (
          <div className="rounded-lg bg-muted/30 border border-border p-3">
            <span className="text-muted-foreground text-xs uppercase tracking-wider block mb-1">proof</span>
            <p className="text-sm text-foreground font-body whitespace-pre-wrap">{claim.proof_text}</p>
          </div>
        )}

        {isPending && (
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              onClick={() => onAction(claim.id, "approve")}
              disabled={acting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.97] transition-transform"
            >
              {acting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
              approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAction(claim.id, "reject")}
              disabled={acting}
              className="border-destructive/30 text-destructive hover:bg-destructive/10 active:scale-[0.97] transition-transform"
            >
              <XCircle className="w-3.5 h-3.5 mr-1" />
              reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
