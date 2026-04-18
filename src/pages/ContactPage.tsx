import { useState } from "react";
import SEO from "@/components/SEO";
import PageTransition from "@/components/PageTransition";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mail, MapPin, Send, Check } from "lucide-react";
import toast from "react-hot-toast";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !message) {
      toast.error("Please fill in all fields.");
      return;
    }
    setLoading(true);
    // For now, just show success — can wire to an edge function later
    await new Promise((r) => setTimeout(r, 800));
    setSent(true);
    setLoading(false);
    toast.success("Message sent!");
  }

  return (
    <PageTransition>
      <SEO
        title="Contact Us | GetBooked.Live"
        description="Get in touch with the GetBooked.Live team. We'd love to hear from you."
      />
      <div className="min-h-screen bg-background pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-2xl">
          <h1 className="font-syne text-3xl md:text-4xl font-bold text-foreground mb-2">Contact Us</h1>
          <p className="text-muted-foreground mb-10">Have a question or want to partner with us? We'd love to hear from you.</p>

          <div className="grid md:grid-cols-2 gap-10">
            {/* Form */}
            <div>
              {sent ? (
                <div className="rounded-xl bg-card border border-white/[0.06] p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center mx-auto mb-4">
                    <Check className="w-6 h-6" />
                  </div>
                  <h3 className="font-syne font-semibold text-foreground text-lg mb-1">Message sent!</h3>
                  <p className="text-sm text-muted-foreground">We'll get back to you as soon as possible.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Name</label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="bg-card border-white/[0.06]"
                      autoComplete="name"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Email</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="bg-card border-white/[0.06]"
                      autoComplete="email"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Message</label>
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Tell us what's on your mind…"
                      className="bg-card border-white/[0.06] min-h-[120px]"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary text-primary-foreground font-semibold rounded-lg"
                  >
                    {loading ? "Sending…" : <><Send className="w-4 h-4 mr-2" /> Send message</>}
                  </Button>
                </form>
              )}
            </div>

            {/* Contact info */}
            <div className="space-y-6">
              <div className="rounded-xl bg-card border border-white/[0.06] p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Mail className="w-5 h-5 text-primary" />
                  <h3 className="font-syne font-semibold text-foreground">Email</h3>
                </div>
                <a href="mailto:getbookedlive@gmail.com" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  getbookedlive@gmail.com
                </a>
              </div>
              <div className="rounded-xl bg-card border border-white/[0.06] p-6">
                <div className="flex items-center gap-3 mb-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  <h3 className="font-syne font-semibold text-foreground">Location</h3>
                </div>
                <p className="text-sm text-muted-foreground">United States</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
