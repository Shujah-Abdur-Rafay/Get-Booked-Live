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

function buildWelcomeHtml(displayName: string, role: string): string {
  const firstName = escapeHtml(displayName?.split(" ")[0] || "there");
  const roleTips: Record<string, string> = {
    artist: "Complete your profile, set your fee range, and mark your available dates so promoters can find and book you.",
    promoter: "Browse verified artists in the directory, send your first offer, and start building your event roster.",
    venue: "List your space with photos and capacity info, set your availability, and let talent come to you.",
    production: "Set up your crew profile, list your services, and connect with tours that need your expertise.",
    photo_video: "Upload your best work to your reel, set your rates, and get discovered by artists and promoters.",
  };
  const tip = roleTips[role] || roleTips.artist;

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
    h1 { font-size: 22px; font-weight: 700; margin: 0 0 16px; color: #F0F2F7; }
    .accent { color: #C8FF3E; }
    p { font-size: 14px; line-height: 1.7; color: #8892A4; margin: 0 0 16px; }
    .tip { background-color: #141B28; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 3px solid #C8FF3E; }
    .tip p { margin: 0; font-size: 13px; color: #8892A4; }
    .btn { display: inline-block; background-color: #C8FF3E; color: #080C14; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 24px; }
    .footer { text-align: center; margin-top: 32px; font-size: 11px; color: #5A6478; }
    .steps { margin: 20px 0; }
    .step { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
    .step-num { width: 24px; height: 24px; border-radius: 50%; background-color: rgba(200,255,62,0.15); color: #C8FF3E; font-size: 12px; font-weight: 600; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .step-text { font-size: 13px; color: #F0F2F7; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo"><span>GetBooked.Live</span></div>
    <div class="card">
      <h1>You're live, <span class="accent">${firstName}</span> 🎉</h1>
      <p>Your account is ready. Here's how to make the most of GetBooked.Live in your first few minutes:</p>
      
      <div class="tip">
        <p><strong>Quick tip:</strong> ${tip}</p>
      </div>

      <div class="steps">
        <div class="step">
          <div class="step-num">1</div>
          <div class="step-text">Complete your profile — add a photo, bio, and links so people can find you.</div>
        </div>
        <div class="step">
          <div class="step-num">2</div>
          <div class="step-text">Explore the directory to see who else is on the platform.</div>
        </div>
        <div class="step">
          <div class="step-num">3</div>
          <div class="step-text">Share your profile link to start getting noticed.</div>
        </div>
      </div>

      <center>
        <a href="${APP_URL}/profile-setup" class="btn">Complete your profile →</a>
      </center>
    </div>
    <div class="footer">
      <p>You're receiving this because you signed up for GetBooked.Live.</p>
    </div>
  </div>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find users who signed up ~30 minutes ago and haven't received welcome email
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const thirtyFiveMinAgo = new Date(Date.now() - 35 * 60 * 1000).toISOString();

    // Get profiles created in the 30-35 minute window
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, display_name, role, created_at")
      .gte("created_at", thirtyFiveMinAgo)
      .lte("created_at", thirtyMinAgo)
      .limit(50);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return new Response(
        JSON.stringify({ error: profilesError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: "No new users in window" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sentCount = 0;

    for (const p of profiles) {
      try {
        // Get email from auth
        const { data: authUser } = await supabase.auth.admin.getUserById(p.user_id);
        if (!authUser?.user?.email) continue;

        const email = authUser.user.email;
        const html = buildWelcomeHtml(p.display_name || email, p.role || "artist");

        // Send via send-email function
        await supabase.functions.invoke("send-email", {
          body: {
            to: email,
            subject: "You're live on GetBooked.Live 🎉",
            html,
          },
        });

        sentCount++;
        console.log(`Welcome email sent to ${email}`);
      } catch (err) {
        console.error(`Failed to send welcome email to ${p.user_id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({ sent: sentCount, checked: profiles.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-welcome-email error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
