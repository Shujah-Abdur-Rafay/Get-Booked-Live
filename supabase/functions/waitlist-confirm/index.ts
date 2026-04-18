import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name } = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const greeting = name ? name : "there";

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#080C14;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080C14;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#0E1420;border-radius:16px;border:1px solid rgba(255,255,255,0.06);padding:48px 40px;">
        <tr><td align="center" style="padding-bottom:32px;">
          <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663474163600/CNVjdejEzeGWRZMX.webp" alt="GetBooked" height="28" style="height:28px;" />
        </td></tr>
        <tr><td align="center" style="padding-bottom:16px;">
          <h1 style="margin:0;font-size:28px;font-weight:700;color:#F0F2F7;font-family:'Syne','DM Sans',Arial,sans-serif;">
            You're on the list! 🎵
          </h1>
        </td></tr>
        <tr><td align="center" style="padding-bottom:32px;">
          <p style="margin:0;font-size:16px;line-height:1.6;color:#8892A4;">
            Hey ${greeting}, thanks for joining the GetBooked.Live waitlist. We're building the future of live music booking — and you'll be among the first to experience it.
          </p>
        </td></tr>
        <tr><td align="center" style="padding-bottom:32px;">
          <p style="margin:0;font-size:14px;color:#8892A4;">
            We'll reach out when it's your turn. In the meantime, follow us for updates:
          </p>
        </td></tr>
        <tr><td align="center" style="padding-bottom:16px;">
          <a href="https://www.instagram.com/getbooked.live" style="display:inline-block;padding:12px 28px;background:#C8FF3E;color:#080C14;font-weight:700;font-size:14px;border-radius:8px;text-decoration:none;font-family:'DM Sans',Arial,sans-serif;">
            Follow on Instagram
          </a>
        </td></tr>
        <tr><td align="center" style="padding-top:32px;border-top:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0;font-size:12px;color:#5A6478;">
            © ${new Date().getFullYear()} GetBooked.Live — All rights reserved.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "GetBooked.Live <onboarding@resend.dev>",
        to: [email],
        subject: "You're on the GetBooked.Live waitlist 🎵",
        html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend error:", data);
      return new Response(
        JSON.stringify({ error: "Failed to send email" }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("waitlist-confirm error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
