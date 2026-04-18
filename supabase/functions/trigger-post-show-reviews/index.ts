import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const APP_URL = "https://getbookedlive.lovable.app";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify cron secret
  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Also allow service role
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseKey || authHeader !== `Bearer ${supabaseKey}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    // Bookings from yesterday that are confirmed
    const { data: bookings, error: bookingsErr } = await supabase
      .from("bookings")
      .select("id, artist_id, promoter_id, venue_name, event_date, guarantee")
      .eq("event_date", yesterdayStr)
      .eq("status", "confirmed");

    if (bookingsErr) {
      console.error("Error fetching bookings:", bookingsErr);
      return new Response(JSON.stringify({ error: bookingsErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!bookings || bookings.length === 0) {
      return new Response(JSON.stringify({ processed: 0, message: "No qualifying bookings" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bookingIds = bookings.map((b) => b.id);

    // Find bookings that already have reviews
    const { data: existingReviews } = await supabase
      .from("reviews")
      .select("booking_id, reviewer_id")
      .in("booking_id", bookingIds);

    const reviewedSet = new Set(
      (existingReviews || []).map((r) => `${r.booking_id}:${r.reviewer_id}`)
    );

    // Get profile names for artist/promoter
    const userIds = [...new Set(bookings.flatMap((b) => [b.artist_id, b.promoter_id]))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", userIds);

    const nameMap = new Map((profiles || []).map((p) => [p.user_id, p.display_name || "User"]));

    const notifications: any[] = [];

    for (const booking of bookings) {
      const artistName = nameMap.get(booking.artist_id) || "Artist";
      const promoterName = nameMap.get(booking.promoter_id) || "Promoter";

      // Notification for artist (to review promoter)
      if (!reviewedSet.has(`${booking.id}:${booking.artist_id}`)) {
        notifications.push({
          user_id: booking.artist_id,
          type: "review_request",
          title: "How was your show?",
          message: `Rate your experience with ${promoterName} at ${booking.venue_name}`,
          link: `${APP_URL}/review/${booking.id}`,
        });
      }

      // Notification for promoter (to review artist)
      if (!reviewedSet.has(`${booking.id}:${booking.promoter_id}`)) {
        notifications.push({
          user_id: booking.promoter_id,
          type: "review_request",
          title: "How was the show?",
          message: `Rate your experience with ${artistName} at ${booking.venue_name}`,
          link: `${APP_URL}/review/${booking.id}`,
        });
      }
    }

    if (notifications.length > 0) {
      const { error: insertErr } = await supabase.from("notifications").insert(notifications);
      if (insertErr) {
        console.error("Error inserting notifications:", insertErr);
      }
    }

    // Send review request emails (24h after show = now, since cron runs next day)
    for (const notif of notifications) {
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(notif.user_id);
        if (authUser?.user?.email) {
          await supabase.functions.invoke("send-email", {
            body: {
              to: authUser.user.email,
              subject: "How was your show? Leave a review",
              html: buildReviewRequestEmail(notif.message, notif.link),
            },
          });
        }
      } catch (e) {
        console.error("Error sending review email:", e);
      }
    }

    console.log(`Created ${notifications.length} review request notifications`);
    return new Response(
      JSON.stringify({ processed: notifications.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("trigger-post-show-reviews error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildReviewRequestEmail(message: string, link: string): string {
  const safeMessage = escapeHtml(message);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { margin: 0; padding: 0; background-color: #080C14; font-family: 'Poppins', Arial, sans-serif; color: #F0F2F7; }
    .container { max-width: 560px; margin: 0 auto; padding: 40px 24px; }
    .logo { text-align: center; margin-bottom: 32px; }
    .logo span { font-size: 20px; font-weight: 700; color: #C8FF3E; letter-spacing: -0.5px; }
    .card { background-color: #0E1420; border-radius: 16px; padding: 32px 28px; border: 1px solid rgba(255,255,255,0.06); }
    h1 { font-size: 20px; font-weight: 600; margin: 0 0 16px; color: #F0F2F7; }
    p { font-size: 14px; line-height: 1.6; color: #8892A4; margin: 0 0 12px; }
    .btn { display: inline-block; background-color: #C8FF3E; color: #080C14; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 24px; }
    .footer { text-align: center; margin-top: 32px; font-size: 11px; color: #5A6478; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo"><span>GetBooked.Live</span></div>
    <div class="card">
      <h1>How was your show? ⭐</h1>
      <p>${safeMessage}</p>
      <p>Your review helps other artists and promoters make better booking decisions.</p>
      <a href="${link}" class="btn">Leave a Review →</a>
    </div>
    <div class="footer">
      <p>You're receiving this because you had a booking on GetBooked.Live</p>
    </div>
  </div>
</body>
</html>`;
}
