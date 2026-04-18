// FIX 1: Removed fake testimonials (DJ Nexus, Marcus T., etc.)
// Replaced with honest founding member message — no fake social proof.
export default function TestimonialsSection() {
  return (
    <section className="fade-in-section py-16 sm:py-28 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center py-12">
          <p className="text-[#C8FF3E] text-sm font-medium uppercase tracking-widest mb-3">Early access</p>
          <h2 className="font-syne font-black text-3xl mb-4">Be one of our founding members</h2>
          <p className="text-[#8892A4] text-base max-w-lg mx-auto">
            We're new — and we're building GetBooked.Live with our first artists, promoters, and venues.
            Join now and help shape the platform.
          </p>
        </div>
      </div>
    </section>
  );
}
