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

function wrapEmail(subject: string, bodyContent: string): string {
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
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .detail-label { font-size: 12px; color: #5A6478; text-transform: uppercase; letter-spacing: 0.5px; }
    .detail-value { font-size: 14px; color: #F0F2F7; font-weight: 500; }
    .amount { font-size: 24px; font-weight: 700; color: #C8FF3E; }
    .btn { display: inline-block; background-color: #C8FF3E; color: #080C14; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 24px; }
    .btn:hover { opacity: 0.9; }
    .footer { text-align: center; margin-top: 32px; font-size: 11px; color: #5A6478; }
    .message-preview { background-color: #141B28; border-radius: 10px; padding: 16px; margin: 16px 0; font-style: italic; color: #8892A4; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo"><span>GetBooked.Live</span></div>
    <div class="card">
      ${bodyContent}
    </div>
    <div class="footer">
      <p>You're receiving this because you have an account on GetBooked.Live</p>
      <p>Manage your email preferences in your account settings.</p>
    </div>
  </div>
</body>
</html>`;
}

interface NotificationMeta {
  event_name?: string;
  event_date?: string;
  city?: string;
  amount?: number;
  artist_name?: string;
  sender_name?: string;
  message_preview?: string;
  offer_id?: string;
  booking_id?: string;
  deal_room_id?: string;
}

function buildOfferReceivedEmail(meta: NotificationMeta) {
  const eventName = escapeHtml(meta.event_name || "New Event");
  const eventDate = escapeHtml(meta.event_date || "TBD");
  const city = escapeHtml(meta.city || "—");
  const subject = `New booking offer — ${meta.event_name || "New Event"}`;
  const html = wrapEmail(subject, `
    <h1>You've received a new offer 🎉</h1>
    <div style="margin: 20px 0;">
      <div class="detail-row">
        <span class="detail-label">Event</span>
        <span class="detail-value">${eventName}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Date</span>
        <span class="detail-value">${eventDate}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">City</span>
        <span class="detail-value">${city}</span>
      </div>
      <div class="detail-row" style="border-bottom:none;">
        <span class="detail-label">Offer Amount</span>
        <span class="amount">$${(meta.amount || 0).toLocaleString()}</span>
      </div>
    </div>
    <a href="${APP_URL}/dashboard" class="btn">View Offer →</a>
  `);
  return { subject, html };
}

function buildOfferAcceptedEmail(meta: NotificationMeta) {
  const artistName = escapeHtml(meta.artist_name || "The artist");
  const eventName = escapeHtml(meta.event_name || "—");
  const eventDate = escapeHtml(meta.event_date || "TBD");
  const subject = "Your offer was accepted!";
  const html = wrapEmail(subject, `
    <h1>Great news — your offer was accepted! ✅</h1>
    <p>${artistName} has accepted your booking offer.</p>
    <div style="margin: 20px 0;">
      <div class="detail-row">
        <span class="detail-label">Artist</span>
        <span class="detail-value">${artistName}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Event</span>
        <span class="detail-value">${eventName}</span>
      </div>
      <div class="detail-row" style="border-bottom:none;">
        <span class="detail-label">Date</span>
        <span class="detail-value">${eventDate}</span>
      </div>
    </div>
    <a href="${APP_URL}/dashboard" class="btn">Open Deal Room →</a>
  `);
  return { subject, html };
}

function buildOfferDeclinedEmail(meta: NotificationMeta) {
  const eventName = escapeHtml(meta.event_name || "this event");
  const subject = `Offer update — ${meta.event_name || "Your Event"}`;
  const html = wrapEmail(subject, `
    <h1>Offer update</h1>
    <p>Unfortunately, the artist has decided not to move forward with your offer for <strong>${eventName}</strong>.</p>
    <p>This happens — artists receive many offers and can't accept them all. We encourage you to explore other talented artists on the platform.</p>
    <a href="${APP_URL}/directory" class="btn">Browse Artists →</a>
  `);
  return { subject, html };
}

function buildBookingConfirmedEmail(meta: NotificationMeta) {
  const eventName = escapeHtml(meta.event_name || "—");
  const eventDate = escapeHtml(meta.event_date || "TBD");
  const city = escapeHtml(meta.city || "—");
  const subject = `Booking confirmed — ${meta.event_name || "Your Event"}`;
  const html = wrapEmail(subject, `
    <h1>Booking confirmed! 🎤</h1>
    <p>Everything is locked in. Here's your booking summary:</p>
    <div style="margin: 20px 0;">
      <div class="detail-row">
        <span class="detail-label">Event</span>
        <span class="detail-value">${eventName}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Date</span>
        <span class="detail-value">${eventDate}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">City</span>
        <span class="detail-value">${city}</span>
      </div>
      <div class="detail-row" style="border-bottom:none;">
        <span class="detail-label">Guarantee</span>
        <span class="amount">$${(meta.amount || 0).toLocaleString()}</span>
      </div>
    </div>
    <a href="${APP_URL}/dashboard" class="btn">View Deal Room →</a>
  `);
  return { subject, html };
}

function buildNewMessageEmail(meta: NotificationMeta) {
  const senderName = escapeHtml(meta.sender_name || "Someone");
  const subject = `New message from ${meta.sender_name || "someone"}`;
  const rawPreview = meta.message_preview
    ? meta.message_preview.slice(0, 100) + (meta.message_preview.length > 100 ? "…" : "")
    : "You have a new message.";
  const preview = escapeHtml(rawPreview);
  const html = wrapEmail(subject, `
    <h1>New message 💬</h1>
    <p><strong>${senderName}</strong> sent you a message:</p>
    <div class="message-preview">"${preview}"</div>
    <a href="${APP_URL}/dashboard" class="btn">Reply →</a>
  `);
  return { subject, html };
}

// Map notification type to email preference key
const PREF_MAP: Record<string, string> = {
  offer_received: "offer_received",
  offer_accepted: "offer_accepted",
  offer_declined: "offer_declined",
  booking_confirmed: "booking_confirmed",
  new_message: "new_message",
  review_request: "offer_received", // always send review requests
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const record = payload.record || payload;

    const userId = record.user_id;
    const notifType = record.type;
    const notifMessage = record.message || "";
    const notifTitle = record.title || "";
    const notifLink = record.link || "";

    if (!userId || !notifType) {
      return new Response(
        JSON.stringify({ error: "Missing user_id or type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch user profile + email
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("display_name, email_preferences, user_id")
      .eq("user_id", userId)
      .single();

    if (profileError || !profileData) {
      console.error("Profile fetch error:", profileError);
      return new Response(
        JSON.stringify({ error: "Could not find user profile" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user email from auth
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
    if (authError || !authUser?.user?.email) {
      console.error("Auth user fetch error:", authError);
      return new Response(
        JSON.stringify({ error: "Could not find user email" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const email = authUser.user.email;

    // Check email preferences
    const prefs = (profileData.email_preferences as Record<string, boolean>) || {};
    const prefKey = PREF_MAP[notifType];
    if (prefKey && prefs[prefKey] === false) {
      console.log(`Email suppressed for ${notifType} — user preference is off`);
      return new Response(
        JSON.stringify({ skipped: true, reason: "user_preference_off" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse metadata from notification message/title
    // The caller should pass metadata in the notification record or we parse from title/message
    const meta: NotificationMeta = {};
    try {
      // If there's a JSON metadata string in the link or message, try parsing
      if (record.metadata) {
        Object.assign(meta, typeof record.metadata === "string" ? JSON.parse(record.metadata) : record.metadata);
      }
    } catch {
      // ignore parse errors
    }

    // Fallbacks from notification fields
    if (!meta.event_name) meta.event_name = notifTitle;
    if (!meta.sender_name) meta.sender_name = notifTitle;
    if (!meta.message_preview) meta.message_preview = notifMessage;

    // Build email based on type
    let emailContent: { subject: string; html: string } | null = null;

    switch (notifType) {
      case "offer_received":
        emailContent = buildOfferReceivedEmail(meta);
        break;
      case "offer_accepted":
        emailContent = buildOfferAcceptedEmail(meta);
        break;
      case "offer_declined":
        emailContent = buildOfferDeclinedEmail(meta);
        break;
      case "booking_confirmed":
        emailContent = buildBookingConfirmedEmail(meta);
        break;
      case "new_message":
        emailContent = buildNewMessageEmail(meta);
        break;
      default:
        console.log(`No email template for notification type: ${notifType}`);
        return new Response(
          JSON.stringify({ skipped: true, reason: "no_template" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Call send-email function
    const { data: sendData, error: sendError } = await supabase.functions.invoke("send-email", {
      body: { to: email, subject: emailContent.subject, html: emailContent.html },
    });

    if (sendError) {
      console.error("send-email invocation error:", sendError);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: sendError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Email sent for ${notifType} to ${email}`);
    return new Response(
      JSON.stringify({ success: true, type: notifType, email }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("on-notification-created error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
