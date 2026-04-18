import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-migration-secret",
};

// All 370 slug updates
const ALL_SLUG_UPDATES: Array<{ id: string; slug: string }> = [
  { id: "8cefec3d-8f29-4b3f-bce7-d9c469523380", slug: "ken-y" },
  { id: "d9094887-f5f5-4612-8947-b0bf015996ad", slug: "mach-and-daddy" },
  { id: "f4701978-34bf-4d82-b394-a7adddd40437", slug: "demphra" },
  { id: "69028a65-3129-4f99-b4f5-63df993b8384", slug: "elefante" },
  { id: "b27a12d8-8810-438a-9375-096ad5a182bc", slug: "makano" },
  { id: "c3e9f4a2-1b5d-4e8c-9f2a-7d3e6b1c4a8f", slug: "wisin-and-yandel" },
  { id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", slug: "don-omar" },
  { id: "11111111-1111-1111-1111-111111111111", slug: "daddy-yankee" },
  { id: "22222222-2222-2222-2222-222222222222", slug: "j-balvin" },
  { id: "33333333-3333-3333-3333-333333333333", slug: "bad-bunny" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Security: require a migration secret header
  const migrationSecret = req.headers.get("x-migration-secret");
  if (migrationSecret !== "getbooked-migrate-2026") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  const results: Record<string, unknown> = {};

  // ─── Check social columns ─────────────────────────────────────────────────
  const { error: checkError } = await supabase
    .from("directory_listings")
    .select("instagram")
    .limit(1);

  results["social_columns_exist"] = !checkError;
  if (checkError) {
    results["social_columns_error"] = checkError.message;
    results["action_needed"] = "Run getbooked_sql_fix.sql in Supabase SQL Editor";
  }

  // ─── Populate slugs ───────────────────────────────────────────────────────
  // Fetch all listings without slugs
  const { data: listings, error: listError } = await supabase
    .from("directory_listings")
    .select("id, name, slug")
    .is("slug", null);

  results["listings_without_slugs"] = listings?.length ?? 0;

  if (listings && listings.length > 0) {
    let updated = 0;
    let failed = 0;

    for (const listing of listings) {
      // Generate slug from name
      const slug = listing.name
        .toLowerCase()
        .replace(/[&]/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      const { error: updateError } = await supabase
        .from("directory_listings")
        .update({ slug })
        .eq("id", listing.id);

      if (updateError) {
        failed++;
      } else {
        updated++;
      }
    }

    results["slugs_updated"] = updated;
    results["slugs_failed"] = failed;
  } else {
    results["slugs_status"] = "All slugs already populated";
  }

  // ─── Verify results ───────────────────────────────────────────────────────
  const { data: sample } = await supabase
    .from("directory_listings")
    .select("id, name, slug")
    .limit(5);

  results["sample_after_update"] = sample;

  return new Response(JSON.stringify(results, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
