import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "https://esm.sh/jspdf@2.5.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch profile
    const { data: profile } = await adminClient
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch recent bookings
    const { data: bookings } = await adminClient
      .from("bookings")
      .select("venue_name, event_date, guarantee, status")
      .eq("artist_id", userId)
      .order("event_date", { ascending: false })
      .limit(10);

    // Fetch offers for acceptance rate
    const { data: allOffers } = await adminClient
      .from("offers")
      .select("status")
      .eq("recipient_id", userId);

    const totalOffers = allOffers?.length ?? 0;
    const acceptedOffers = allOffers?.filter(o => o.status === "accepted").length ?? 0;
    const acceptanceRate = totalOffers > 0 ? Math.round((acceptedOffers / totalOffers) * 100) : 0;

    // Fetch reviews for BookScore
    const { data: reviews } = await adminClient
      .from("reviews")
      .select("rating")
      .eq("reviewee_id", userId);
    const avgRating = reviews && reviews.length > 0
      ? (reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length).toFixed(1)
      : null;

    const stats = profile.streaming_stats || {};

    // Generate PDF
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const W = doc.internal.pageSize.getWidth();
    let y = 50;

    // ── Header ──
    doc.setFontSize(32);
    doc.setFont("helvetica", "bold");
    doc.text(profile.display_name || "Artist", 50, y);
    y += 36;

    // Subtitle line
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    const subtitle = [
      profile.genre,
      profile.city && profile.state ? `${profile.city}, ${profile.state}` : profile.city,
    ].filter(Boolean).join(" · ");
    if (subtitle) { doc.text(subtitle, 50, y); y += 22; }

    // Divider
    doc.setDrawColor(200);
    doc.line(50, y, W - 50, y);
    y += 20;

    // ── Stats Row ──
    doc.setTextColor(40);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    const statsItems: string[] = [];
    if (stats.monthly_listeners) statsItems.push(`${stats.monthly_listeners.toLocaleString()} monthly listeners`);
    if (stats.followers) statsItems.push(`${stats.followers.toLocaleString()} Spotify followers`);
    if (avgRating) statsItems.push(`BookScore: ${avgRating}/5`);
    if (acceptanceRate > 0) statsItems.push(`${acceptanceRate}% acceptance rate`);
    if (profile.rate_min || profile.rate_max) {
      statsItems.push(`Fee: $${(profile.rate_min || 0).toLocaleString()} – $${(profile.rate_max || 0).toLocaleString()}`);
    }
    if (statsItems.length) {
      doc.text(statsItems.join("  ·  "), 50, y);
      y += 22;
    }

    // ── Top Tracks ──
    if (stats.top_tracks?.length) {
      y += 8;
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30);
      doc.text("Top Tracks", 50, y);
      y += 20;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(60);
      stats.top_tracks.slice(0, 5).forEach((t: any, i: number) => {
        doc.text(`${i + 1}. ${t.name}`, 60, y);
        doc.setTextColor(120);
        doc.text(`${t.album}`, 300, y);
        doc.setTextColor(60);
        y += 16;
      });
    }

    // ── Bio ──
    if (profile.bio) {
      y += 12;
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30);
      doc.text("About", 50, y);
      y += 20;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(60);
      const lines = doc.splitTextToSize(profile.bio, W - 100);
      doc.text(lines, 50, y);
      y += lines.length * 14;
    }

    // ── Past Shows ──
    const confirmedBookings = bookings?.filter(b => b.status === "confirmed" || b.status === "completed") ?? [];
    if (confirmedBookings.length > 0) {
      y += 12;
      if (y > 620) { doc.addPage(); y = 50; }
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30);
      doc.text("Recent Shows", 50, y);
      y += 20;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(60);
      confirmedBookings.forEach((b: any) => {
        if (y > 700) { doc.addPage(); y = 50; }
        const dateStr = new Date(b.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        doc.text(`${b.venue_name}`, 60, y);
        doc.text(dateStr, 300, y);
        doc.text(`$${Number(b.guarantee).toLocaleString()}`, W - 100, y, { align: "right" });
        y += 16;
      });
    }

    // ── Footer CTA ──
    y = Math.max(y + 30, 660);
    if (y > 700) { doc.addPage(); y = 50; }
    doc.setDrawColor(200);
    doc.line(50, y, W - 50, y);
    y += 24;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("Book via GetBooked.Live", 50, y);
    y += 18;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80);
    const profileUrl = `https://getbookedlive.lovable.app/p/${profile.slug || profile.user_id}`;
    doc.text(profileUrl, 50, y);
    y += 14;
    doc.setFontSize(9);
    doc.setTextColor(140);
    doc.text("Generated by GetBooked.Live — The Music Booking Marketplace", 50, y);

    // Convert to buffer and upload
    const pdfBuffer = doc.output("arraybuffer");
    const fileName = `${userId}/pitch-card.pdf`;

    await adminClient.storage.from("contracts").upload(fileName, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

    // Use signed URL instead of public URL to keep the contracts bucket private
    const { data: signedData } = await adminClient.storage
      .from("contracts")
      .createSignedUrl(fileName, 3600);
    const pdfUrl = signedData?.signedUrl ?? fileName;

    // Save file path (not URL) to profile for future signed URL generation
    await adminClient
      .from("profiles")
      .update({ pitch_card_url: fileName })
      .eq("user_id", userId);

    return new Response(JSON.stringify({ success: true, url: pdfUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-pitch-card error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
