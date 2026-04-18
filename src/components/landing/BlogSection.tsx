import { ArrowRight } from "lucide-react";

const POSTS = [
  {
    color: "bg-primary",
    category: "Pricing",
    title: "How to price your DJ sets in 2026",
    excerpt: "Market rates are shifting. Here's how to set guarantees that reflect your real draw.",
  },
  {
    color: "bg-role-production",
    category: "Booking Tips",
    title: "What promoters look for when booking artists",
    excerpt: "We surveyed 200 promoters. These are the factors that matter most.",
  },
  {
    color: "bg-role-photo",
    category: "Tour Planning",
    title: "The complete guide to tour budgeting",
    excerpt: "From gas money to crew day-rates — a breakdown of every cost on the road.",
  },
  {
    color: "bg-role-venue",
    category: "Growth",
    title: "Building your BookScore from zero",
    excerpt: "Five steps to a 90+ BookScore and what it unlocks on the platform.",
  },
];

export default function BlogSection() {
  return (
    <section className="fade-in-section py-24 sm:py-32 px-4">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-14">
          <span className="section-label">resources</span>
          <h2 className="section-heading">from the getbooked blog</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {POSTS.map((post) => (
            <div
              key={post.title}
              className="rounded-[14px] overflow-hidden border border-white/[0.06] bg-card/80 cursor-pointer group hover:border-white/[0.12] transition-all duration-300 hover:-translate-y-0.5"
            >
              {/* Colored banner */}
              <div className={`h-20 ${post.color}/20 flex items-end px-4 pb-3`}>
                <span className="text-[10px] font-display font-bold uppercase tracking-wider text-foreground/90">
                  {post.category}
                </span>
              </div>
              {/* Content */}
              <div className="p-4">
                <h3 className="text-sm font-display font-bold text-foreground leading-[1.4] mb-2 line-clamp-2">
                  {post.title}
                </h3>
                <p className="text-xs text-muted-foreground font-body leading-relaxed line-clamp-2 mb-3">
                  {post.excerpt}
                </p>
                <span className="text-xs text-primary font-display font-bold inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                  Read more <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <span className="text-sm text-primary font-display font-bold cursor-pointer hover:underline inline-flex items-center gap-1.5">
            View all posts <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </section>
  );
}
