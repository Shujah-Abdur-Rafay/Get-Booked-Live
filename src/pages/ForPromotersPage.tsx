import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import PageTransition from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Users, Target, FileText, TrendingUp, Sparkles, CreditCard } from "lucide-react";

const BENEFITS = [
  { icon: <Users className="w-5 h-5" />, title: "Browse verified talent", desc: "Search artists by genre, city, fee range, and streaming stats. Filter by availability." },
  { icon: <Target className="w-5 h-5" />, title: "AI-powered recommendations", desc: "Our matching engine suggests artists that fit your event, budget, and audience." },
  { icon: <FileText className="w-5 h-5" />, title: "Structured offers", desc: "Send professional offers with guarantee, door split, hospitality, and backline details." },
  { icon: <TrendingUp className="w-5 h-5" />, title: "Pipeline management", desc: "Track every offer from sent → negotiating → accepted → confirmed in one dashboard." },
  { icon: <Sparkles className="w-5 h-5" />, title: "Auto-contracts", desc: "Contracts are generated automatically when an offer is accepted. E-signatures built in." },
  { icon: <CreditCard className="w-5 h-5" />, title: "Flexible payments", desc: "Pay artists securely through the platform. Financing options available for larger bookings." },
];

export default function ForPromotersPage() {
  return (
    <PageTransition>
      <SEO
        title="For Promoters | GetBooked.Live"
        description="Book artists faster with GetBooked.Live. Browse verified talent, send structured offers, and manage your events in one platform."
      />
      <div className="min-h-screen bg-background pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Hero */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-pink-500/10 text-pink-400 text-xs font-semibold mb-6">
              <Target className="w-3.5 h-3.5" /> For Promoters
            </div>
            <h1 className="font-syne text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
              Book the right talent,<br />every time
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
              GetBooked.Live gives promoters and event organizers the tools to discover, book, and manage artist relationships — all in one place.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button asChild size="lg" className="bg-primary text-primary-foreground font-semibold rounded-full px-8">
                <Link to="/auth?tab=signup">Get started free</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full border-white/10">
                <Link to="/browse">Browse artists</Link>
              </Button>
            </div>
          </div>

          {/* Benefits grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
            {BENEFITS.map((b) => (
              <div key={b.title} className="rounded-xl bg-card border border-white/[0.06] p-6">
                <div className="w-10 h-10 rounded-lg bg-pink-500/10 text-pink-400 flex items-center justify-center mb-4">
                  {b.icon}
                </div>
                <h3 className="font-syne font-semibold text-foreground mb-1">{b.title}</h3>
                <p className="text-sm text-muted-foreground">{b.desc}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center rounded-2xl bg-card border border-white/[0.06] p-10">
            <h2 className="font-syne text-2xl font-bold text-foreground mb-3">Start booking smarter</h2>
            <p className="text-muted-foreground mb-6">Join GetBooked.Live and streamline your talent booking workflow.</p>
            <Button asChild size="lg" className="bg-primary text-primary-foreground font-semibold rounded-full px-8">
              <Link to="/auth?tab=signup">Create your free account</Link>
            </Button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
