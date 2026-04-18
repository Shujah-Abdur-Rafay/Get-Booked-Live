import { Check, X } from "lucide-react";

const ROWS = [
  { old: "WhatsApp & DM negotiations", new: "Structured offer system" },
  { old: "No contract protection", new: "Auto-generated contracts" },
  { old: "Manually coordinating crew", new: "Full crew manifest & tour hub" },
  { old: "Hidden fees, no transparency", new: "Live commission calculator" },
  { old: "No payment protection", new: "Stripe-powered secure payments" },
  { old: "Generic booking tools", new: "Built specifically for live music" },
];

export default function ComparisonSection() {
  return (
    <section className="fade-in-section py-16 sm:py-32 px-4">
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-14">
          <span className="section-label">why getbooked?</span>
          <h2 className="section-heading">there's a smarter way to book shows</h2>
        </div>

        <div className="max-w-[700px] mx-auto rounded-2xl overflow-hidden border border-white/[0.06]">
          {/* Headers */}
          <div className="grid grid-cols-2">
            <div className="px-3 sm:px-5 py-3 sm:py-3.5 bg-white/[0.02] border-b border-white/[0.06]">
              <span className="text-[10px] sm:text-xs font-display font-bold text-muted-foreground uppercase tracking-wider">the old way</span>
            </div>
            <div className="px-3 sm:px-5 py-3 sm:py-3.5 bg-primary/[0.03] border-b border-primary/[0.15] border-l border-white/[0.06]">
              <span className="text-[10px] sm:text-xs font-display font-bold text-primary uppercase tracking-wider">GetBooked.Live</span>
            </div>
          </div>

          {/* Rows */}
          {ROWS.map((row, i) => (
            <div key={i} className="grid grid-cols-2 border-b border-white/[0.04] last:border-b-0">
              <div className="px-3 sm:px-5 py-3 sm:py-3.5 flex items-start gap-2 sm:gap-2.5 bg-white/[0.02]">
                <X className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                <span className="text-[11px] sm:text-xs text-muted-foreground font-body leading-relaxed">{row.old}</span>
              </div>
              <div className="px-3 sm:px-5 py-3 sm:py-3.5 flex items-start gap-2 sm:gap-2.5 bg-primary/[0.03] border-l border-white/[0.06]">
                <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <span className="text-[11px] sm:text-xs text-foreground font-body leading-relaxed">{row.new}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
