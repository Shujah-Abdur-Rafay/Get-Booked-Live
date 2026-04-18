import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/xml; charset=utf-8",
};

const SITE_URL = "https://getbookedlive.lovable.app";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: profiles } = await supabase
    .from("profiles")
    .select("slug, updated_at")
    .eq("profile_complete", true)
    .not("slug", "is", null)
    .order("updated_at", { ascending: false });

  const staticPages = [
    { loc: "/", priority: "1.0", changefreq: "daily" },
    { loc: "/directory", priority: "0.8", changefreq: "daily" },
    { loc: "/venues", priority: "0.7", changefreq: "daily" },
    { loc: "/pricing", priority: "0.6", changefreq: "monthly" },
    { loc: "/auth", priority: "0.5", changefreq: "monthly" },
  ];

  const urls = staticPages.map(
    (p) => `  <url>
    <loc>${SITE_URL}${p.loc}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
  );

  if (profiles) {
    for (const p of profiles) {
      urls.push(`  <url>
    <loc>${SITE_URL}/p/${p.slug}</loc>
    <lastmod>${new Date(p.updated_at).toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  return new Response(xml, { headers: corsHeaders });
});
