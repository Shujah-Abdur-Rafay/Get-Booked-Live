// IMPROVEMENT 8: Activation nudge Edge Function.
// Intended to be called via a Supabase scheduled cron job (every hour).
// Finds users who:
//   1. Signed up between 23h and 25h ago (i.e., roughly 24h since signup)
//   2. Have profile_complete = false
//   3. Have not already received a nudge (nudge_sent_at IS NULL)
// Sends a personalised email via the send-email function and marks nudge_sent_at.
//
// Setup: In Supabase Dashboard → Edge Functions → Schedule, run this every hour:
//   0 * * * *  →  POST https://<project>.supabase.co/functions/v1/activation-nudge
//
// Required migration (already included in 20260330210000_add_accepting_bookings.sql or add separately):
//   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nudge_sent_at timestamptz;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const APP_URL = "https://getbooked.live";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildNudgeHtml(displayName: string, role: string): string {
  const firstName = escapeHtml(displayName?.split(" ")[0] || "there");
  const roleAction: Record<string, { step: string; cta: string; href: string }> = {
    artist: {
      step: "Add your genre, fee range, and a short bio so promoters can find and book you.",
      cta: "Complete my artist profile",
      href: `${APP_URL}/profile-setup`,
    },
    promoter: {
      step: "Browse verified artists in your city and send your first booking offer in minutes.",
      cta: "Browse artists",
      href: `${APP_URL}/directory`,
    },
    venue: {
      step: "Add your capacity, photos, and availability so talent can find your space.",
      cta: "Complete my venue profile",
      href: `${APP_URL}/profile-setup`,
    },
    production: {
      step: "List your services and rates so artists and promoters can hire your crew.",
      cta: "Complete my profile",
      href: `${APP_URL}/profile-setup`,
    },
    photo_video: {
      step: "Upload your best work and set your rates to get discovered by artists and promoters.",
      cta: "Complete my profile",
      href: `${APP_URL}/profile-setup`,
    },
  };
  const action = roleAction[role] ?? roleAction.artist;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background-color: #080C14; font-family: Arial, sans-serif; color: #F0F2F7; }
    .container { max-width: 560px; margin: 0 auto; padding: 40px 24px; }
    .logo { text-align: center; margin-bottom: 32px; font-size: 20px; font-weight: 700; color: #C8FF3E; letter-spacing: -0.5px; }
    .card { background-color: #0E1420; border-radius: 16px; padding: 32px 28px; border: 1px solid rgba(255,255,255,0.06); }
    h1 { font-size: 20px; font-weight: 700; margin: 0 0 12px; color: #F0F2F7; }
    p { font-size: 14px; line-height: 1.7; color: #8892A4; margin: 0 0 16px; }
    .tip { background-color: #141B28; border-radius: 12px; padding: 18px 20px; margin: 20px 0; border-left: 3px solid #C8FF3E; }
    .tip p { margin: 0; font-size: 13px; }
    .btn { display: inline-block; background-color: #C8FF3E; color: #080C14; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 14px; margin-top: 24px; }
    .footer { text-align: center; margin-top: 32px; font-size: 11px; color: #5A6478; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">GetBooked.Live</div>
    <div class="card">
      <h1>Hey ${firstName} — your profile is almost ready</h1>
      <p>You signed up yesterday but haven't finished setting up your profile yet. It only takes 2 minutes and it's the difference between being found and being invisible.</p>
      <div class="tip">
        <p>${escapeHtml(action.step)}</p>
      </div>
      <p>Once your profile is live, you'll start appearing in search results and receiving booking activity.</p>
      <a href="${action.href}" class="btn">${escapeHtml(action.cta)} →</a>
    </div>
    <div class="footer">
      You're receiving this because you signed up at GetBooked.Live.<br>
      <a href="${APP_URL}/settings" style="color: #5A6478;">Manage email preferences</a>
    </div>
  </div>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Find users who signed up 23–25h ago, haven't completed profile, and haven't been nudged
    const now = new Date();
    const windowStart = new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString();
    const windowEnd = new Date(now.getTime() - 23 * 60 * 60 * 1000).toISOString();

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("user_id, display_name, role, created_at")
      .eq("profile_complete", false)
      .is("nudge_sent_at", null)
      .gte("created_at", windowStart)
      .lte("created_at", windowEnd);

    if (error) throw error;
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No eligible users" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    const errors: string[] = [];

    for (const p of profiles) {
      try {
        // Get user email from auth.users via admin API
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(p.user_id);
        if (userError || !userData?.user?.email) continue;

        const email = userData.user.email;
        const html = buildNudgeHtml(p.display_name ?? "", p.role ?? "artist");

        // Send via the shared send-email function
        const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            to: email,
            subject: `${p.display_name?.split(" ")[0] ?? "Hey"}, your GetBooked profile is almost ready`,
            html,
          }),
        });

        if (res.ok) {
          // Mark nudge as sent
          await supabase
            .from("profiles")
            .update({ nudge_sent_at: now.toISOString() } as any)
            .eq("user_id", p.user_id);
          sent++;
        } else {
          const errBody = await res.text();
          errors.push(`${p.user_id}: ${errBody}`);
        }
      } catch (err: any) {
        errors.push(`${p.user_id}: ${err.message}`);
      }
    }

    console.log(`activation-nudge: sent ${sent}/${profiles.length}, errors: ${errors.length}`);

    return new Response(
      JSON.stringify({ sent, total: profiles.length, errors }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("activation-nudge error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
