import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { year } = await req.json();
    if (!year) throw new Error("year is required");

    // Fetch confirmed bookings for this user/year
    const { data: bookings, error: bErr } = await userClient
      .from("bookings")
      .select("id, event_date, venue_name, guarantee, offer_id")
      .eq("artist_id", user.id)
      .eq("status", "confirmed")
      .gte("event_date", `${year}-01-01`)
      .lte("event_date", `${year}-12-31`)
      .order("event_date", { ascending: true });

    if (bErr) throw bErr;

    // Fetch offer commission data
    const offerIds = (bookings || []).map((b: any) => b.offer_id).filter(Boolean);
    let offerMap: Record<string, { commission_rate: number; commission_amount: number | null }> = {};

    if (offerIds.length > 0) {
      const { data: offers } = await userClient
        .from("offers")
        .select("id, commission_rate, commission_amount")
        .in("id", offerIds);

      for (const o of (offers || []) as any[]) {
        offerMap[o.id] = { commission_rate: Number(o.commission_rate), commission_amount: o.commission_amount ? Number(o.commission_amount) : null };
      }
    }

    // Fetch profile
    const { data: profile } = await userClient
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .single();

    // Build monthly data
    const months: Record<number, { gross: number; fees: number; net: number; count: number }> = {};
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    let totalGross = 0;
    let totalFees = 0;
    let totalNet = 0;
    const bookingRows: Array<{ date: string; venue: string; gross: number; fee: number; net: number }> = [];

    for (const b of (bookings || []) as any[]) {
      const guarantee = Number(b.guarantee);
      const offer = offerMap[b.offer_id];
      const fee = offer?.commission_amount ?? Math.round(guarantee * (offer?.commission_rate ?? 0.20));
      const net = guarantee - fee;
      const month = new Date(b.event_date + "T00:00:00").getMonth();

      if (!months[month]) months[month] = { gross: 0, fees: 0, net: 0, count: 0 };
      months[month].gross += guarantee;
      months[month].fees += fee;
      months[month].net += net;
      months[month].count++;

      totalGross += guarantee;
      totalFees += fee;
      totalNet += net;

      bookingRows.push({
        date: b.event_date,
        venue: b.venue_name,
        gross: guarantee,
        fee,
        net,
      });
    }

    // Build a simple text-based PDF using a basic approach
    // We'll generate a structured text document that the frontend can render
    const artistName = (profile as any)?.display_name || "Artist";

    // Build quarterly totals
    const quarters: Record<number, { gross: number; fees: number; net: number }> = {};
    for (const [mStr, data] of Object.entries(months)) {
      const m = Number(mStr);
      const q = Math.floor(m / 3) + 1;
      if (!quarters[q]) quarters[q] = { gross: 0, fees: 0, net: 0 };
      quarters[q].gross += data.gross;
      quarters[q].fees += data.fees;
      quarters[q].net += data.net;
    }

    // Generate a simple PDF using raw PDF commands
    const lines: string[] = [];
    const addLine = (text: string) => lines.push(text);

    addLine(`GETBOOKED.LIVE — TAX SUMMARY`);
    addLine(`Tax Year: ${year}`);
    addLine(`Prepared for: ${artistName}`);
    addLine(`Generated: ${new Date().toISOString().split("T")[0]}`);
    addLine(``);
    addLine(`═══════════════════════════════════════`);
    addLine(`ANNUAL SUMMARY`);
    addLine(`───────────────────────────────────────`);
    addLine(`Total Gross Income:      $${totalGross.toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
    addLine(`Total Platform Fees:     $${totalFees.toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
    addLine(`  (Platform fees are deductible as a business expense)`);
    addLine(`Total Net Income:        $${totalNet.toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
    addLine(`Total Confirmed Shows:   ${bookingRows.length}`);
    addLine(``);

    addLine(`═══════════════════════════════════════`);
    addLine(`QUARTERLY BREAKDOWN`);
    addLine(`───────────────────────────────────────`);
    for (let q = 1; q <= 4; q++) {
      const qd = quarters[q];
      if (qd) {
        addLine(`Q${q} ${year}: Gross $${qd.gross.toLocaleString("en-US", { minimumFractionDigits: 2 })} | Fees $${qd.fees.toLocaleString("en-US", { minimumFractionDigits: 2 })} | Net $${qd.net.toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
      }
    }
    addLine(``);

    addLine(`═══════════════════════════════════════`);
    addLine(`MONTHLY DETAIL`);
    addLine(`───────────────────────────────────────`);
    for (let m = 0; m < 12; m++) {
      const md = months[m];
      if (md) {
        addLine(`${monthNames[m]}: ${md.count} shows | Gross $${md.gross.toLocaleString("en-US", { minimumFractionDigits: 2 })} | Fees $${md.fees.toLocaleString("en-US", { minimumFractionDigits: 2 })} | Net $${md.net.toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
      }
    }
    addLine(``);

    addLine(`═══════════════════════════════════════`);
    addLine(`INDIVIDUAL BOOKINGS`);
    addLine(`───────────────────────────────────────`);
    for (const row of bookingRows) {
      addLine(`${row.date} | ${row.venue.padEnd(25).slice(0, 25)} | Gross $${row.gross.toLocaleString("en-US", { minimumFractionDigits: 2 }).padStart(10)} | Fee $${row.fee.toLocaleString("en-US", { minimumFractionDigits: 2 }).padStart(8)} | Net $${row.net.toLocaleString("en-US", { minimumFractionDigits: 2 }).padStart(10)}`);
    }
    addLine(``);
    addLine(`───────────────────────────────────────`);
    addLine(`This document is provided for informational purposes.`);
    addLine(`Consult a tax professional for filing guidance.`);
    addLine(`Generated by GetBooked.Live`);

    const textContent = lines.join("\n");

    // Encode as a simple PDF
    const pdf = generateSimplePDF(textContent, artistName, year);
    const pdfBase64 = btoa(String.fromCharCode(...pdf));

    return new Response(JSON.stringify({ pdf: pdfBase64 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("tax-report error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateSimplePDF(text: string, _name: string, _year: number): Uint8Array {
  // Minimal valid PDF with text content
  const lines = text.split("\n");
  const pageHeight = 792; // Letter
  const pageWidth = 612;
  const margin = 50;
  const lineHeight = 12;
  const linesPerPage = Math.floor((pageHeight - margin * 2) / lineHeight);

  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += linesPerPage) {
    pages.push(lines.slice(i, i + linesPerPage));
  }

  const objects: string[] = [];
  let objCount = 0;
  const addObj = (content: string) => {
    objCount++;
    objects.push(content);
    return objCount;
  };

  // Catalog
  const catalogId = addObj(""); // placeholder
  // Pages
  const pagesId = addObj(""); // placeholder

  // Font
  const fontId = addObj(`${objCount + 1} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj`);

  const pageIds: number[] = [];
  const streamIds: number[] = [];

  for (const pageLines of pages) {
    // Build page content stream
    let stream = `BT\n/F1 9 Tf\n`;
    let y = pageHeight - margin;
    for (const line of pageLines) {
      const escaped = line.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
      stream += `1 0 0 1 ${margin} ${y} Tm\n(${escaped}) Tj\n`;
      y -= lineHeight;
    }
    stream += `ET\n`;

    const streamId = addObj(`${objCount + 1} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}endstream\nendobj`);
    streamIds.push(streamId);

    const pageId = addObj(`${objCount + 1} 0 obj\n<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${streamId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>\nendobj`);
    pageIds.push(pageId);
  }

  // Now fill in catalog and pages
  objects[0] = `1 0 obj\n<< /Type /Catalog /Pages ${pagesId} 0 R >>\nendobj`;
  objects[1] = `2 0 obj\n<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>\nendobj`;

  // Build PDF
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];

  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdf.length);
    if (i < 2) {
      pdf += objects[i] + "\n";
    } else {
      pdf += objects[i] + "\n";
    }
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objCount + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += String(offset).padStart(10, "0") + " 00000 n \n";
  }
  pdf += `trailer\n<< /Size ${objCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}
