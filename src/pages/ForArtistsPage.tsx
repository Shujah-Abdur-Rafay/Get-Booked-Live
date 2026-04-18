import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import PageTransition from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Check, Music, DollarSign, BarChart3, Shield, Zap, Calendar } from "lucide-react";

const BENEFITS = [
  { icon: <DollarSign className="w-5 h-5" />, title: "Set your own rates", desc: "Define your fee range and let promoters come to you with offers that match your value." },
  { icon: <Calendar className="w-5 h-5" />, title: "Manage availability", desc: "Mark your open dates. Enable Flash Bids so promoters can bid on last-minute openings." },
  { icon: <BarChart3 className="w-5 h-5" />, title: "Track your career", desc: "Analytics dashboard with BookScore, streaming stats, booking history, and earnings." },
  { icon: <Shield className="w-5 h-5" />, title: "Contracts & payments", desc: "Auto-generated contracts, e-signatures, and secure payment processing via Stripe." },
  { icon: <Zap className="w-5 h-5" />, title: "AI-powered matching", desc: "Our AI recommends you to the right promoters based on genre, draw, and market fit." },
  { icon: <Music className="w-5 h-5" />, title: "Tour management", desc: "Plan multi-city tours with itineraries, crew, budgets, and logistics in one place." },
];

export default function ForArtistsPage() {
  return (
    <PageTransition>
      <SEO
        title="For Artists | GetBooked.Live"
        description="Join GetBooked.Live as an artist. Set your rates, manage availability, get booked by promoters, and grow your live career."
      />
      <div className="min-h-screen bg-background pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Hero */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-6">
              <Music className="w-3.5 h-3.5" /> For Artists
            </div>
            <h1 className="font-syne text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
              Get booked on<br />your own terms
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
              GetBooked.Live is the platform built for working musicians. Set your rates, showcase your EPK, and let the right promoters find you.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button asChild size="lg" className="bg-primary text-primary-foreground font-semibold rounded-full px-8">
                <Link to="/auth?tab=signup">Get started free</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full border-white/10">
                <Link to="/browse">Browse the platform</Link>
              </Button>
            </div>
          </div>

          {/* Benefits grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
            {BENEFITS.map((b) => (
              <div key={b.title} className="rounded-xl bg-card border border-white/[0.06] p-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                  {b.icon}
                </div>
                <h3 className="font-syne font-semibold text-foreground mb-1">{b.title}</h3>
                <p className="text-sm text-muted-foreground">{b.desc}</p>
              </div>
            ))}
          </div>

          {/* How it works */}
          <div className="text-center mb-12">
            <h2 className="font-syne text-2xl font-bold text-foreground mb-8">How it works</h2>
            <div className="grid sm:grid-cols-3 gap-6">
              {[
                { step: "1", title: "Create your profile", desc: "Upload your EPK, set your fee range, and mark available dates." },
                { step: "2", title: "Receive offers", desc: "Promoters send structured offers with all deal terms upfront." },
                { step: "3", title: "Accept & perform", desc: "Auto-contracts, milestone tracking, and get paid securely." },
              ].map((s) => (
                <div key={s.step} className="text-center">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center mx-auto mb-3">
                    {s.step}
                  </div>
                  <h3 className="font-syne font-semibold text-foreground mb-1">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center rounded-2xl bg-card border border-white/[0.06] p-10">
            <h2 className="font-syne text-2xl font-bold text-foreground mb-3">Ready to get booked?</h2>
            <p className="text-muted-foreground mb-6">Join hundreds of artists already using GetBooked.Live.</p>
            <Button asChild size="lg" className="bg-primary text-primary-foreground font-semibold rounded-full px-8">
              <Link to="/auth?tab=signup">Create your free account</Link>
            </Button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
