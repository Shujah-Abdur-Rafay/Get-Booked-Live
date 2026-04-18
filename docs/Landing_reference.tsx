// src/pages/Landing.tsx
// Redesigned with BookMe.com style reference:
// - Lowercase hero typography (friendly, approachable)
// - Profile showcase marquee (social proof)
// - Bento feature cards with tab navigation
// - Role switcher section
// - Clean minimal nav with sticky blur

import { useState } from 'react'
import { Link } from 'react-router-dom'

const MARQUEE_PROFILES = [
  { initials: 'DJ', name: 'DJ Nexus', role: 'House · Techno', location: 'Miami, FL', color: '#C8FF3E', bookings: 142 },
  { initials: 'LP', name: 'Lena Park', role: 'Photographer', location: 'New York, NY', color: '#3EC8FF', bookings: 310 },
  { initials: 'SF', name: 'SoundForge', role: 'Sound crew', location: 'Nationwide', color: '#7B5CF0', bookings: 89 },
  { initials: 'CS', name: 'Club Space', role: 'Nightclub · 3,200 cap', location: 'Miami, FL', color: '#FFB83E', bookings: 204 },
  { initials: 'MV', name: 'Maya Voss', role: 'Afrobeats · R&B', location: 'Atlanta, GA', color: '#FF5C8A', bookings: 67 },
  { initials: 'RS', name: 'Ray Studios', role: 'Videographer', location: 'Los Angeles, CA', color: '#3EFFBE', bookings: 55 },
  { initials: 'KR', name: 'K-Raze', role: 'Hip-Hop · Trap', location: 'Atlanta, GA', color: '#FFB83E', bookings: 38 },
  { initials: 'NL', name: 'Nova Lighting', role: 'Stage lighting', location: 'Miami & SE', color: '#7B5CF0', bookings: 142 },
  { initials: 'AG', name: 'Avant Gardner', role: 'Venue · 3,000 cap', location: 'Brooklyn, NY', color: '#FFB83E', bookings: 312 },
  { initials: 'VX', name: 'VisionX Media', role: 'Photo + Video', location: 'Chicago, IL', color: '#3EC8FF', bookings: 91 },
]

const FEATURE_TABS = [
  { id: 'booking', label: 'booking & offers' },
  { id: 'profiles', label: 'profiles & EPK' },
  { id: 'payments', label: 'payments' },
  { id: 'tour', label: 'tour management' },
  { id: 'messaging', label: 'messaging' },
]

const FEATURES: Record<string, { title: string; desc: string; items: { name: string; detail: string }[] }> = {
  booking: {
    title: 'structured booking — not DMs',
    desc: 'Promoters send detailed offers. Artists see exactly what they earn before responding.',
    items: [
      { name: '6-step offer form', detail: 'Date, venue, guarantee, set length, logistics all in one structured form' },
      { name: 'live commission calc', detail: 'See offer → platform fee → your net payout update as you type' },
      { name: 'accept / counter / decline', detail: 'One click. Both sides notified instantly via real-time push' },
      { name: 'auto-contract', detail: 'Contract generated the moment an offer is accepted' },
      { name: 'offer expiry', detail: 'Set 48-hour response windows to create urgency' },
      { name: 'counteroffer flow', detail: 'Negotiate in-platform — no email chains, no lost messages' },
    ]
  },
  profiles: {
    title: 'your profile is your booking page',
    desc: 'One shareable link. Everything a promoter needs to say yes.',
    items: [
      { name: 'smart EPK builder', detail: 'Auto-populated from your bookings, ratings, and streaming stats' },
      { name: 'verified badge', detail: 'Platform-verified artists get priority search placement' },
      { name: 'BookScore™', detail: 'Trust score built from booking history and response rate' },
      { name: 'tier system', detail: 'Rising → Established → Headliner based on platform activity' },
      { name: 'availability calendar', detail: 'Flash open dates to drive inbound offers from promoters' },
      { name: 'reviews & ratings', detail: 'Verified post-show reviews from real promoters' },
    ]
  },
  payments: {
    title: 'payments handled automatically',
    desc: 'Deposits, balances, and commissions all split at transaction via Stripe Connect.',
    items: [
      { name: 'stripe connect', detail: 'Commission deducted automatically at payment — no manual splits' },
      { name: 'deposit system', detail: '50% deposit on booking, balance due before show date' },
      { name: 'tiered commissions', detail: 'Free: 20% · Pro: 10% · Agency: 5–7%' },
      { name: 'payment milestones', detail: 'Deal Room tracks deposit, balance, and fully paid status' },
      { name: 'tax export', detail: 'Annual earnings report export for accountants (Pro+)' },
      { name: 'payout speed', detail: 'Stripe direct deposit, standard 2-day payout schedule' },
    ]
  },
  tour: {
    title: 'tour management built in',
    desc: 'Plan multi-city runs, manage crew, and track budget without leaving the platform.',
    items: [
      { name: 'tour itinerary', detail: 'City timeline with venue, hotel, show time per stop' },
      { name: 'crew manifest', detail: 'Assign sound, lighting, photo/video to each date' },
      { name: 'budget tracker', detail: 'Guarantees, travel, crew, hotels — all in one live view' },
      { name: 'task board', detail: 'Pre-tour checklist with assignees and due dates' },
      { name: 'document vault', detail: 'Contracts, riders, hotel confirmations stored per stop' },
      { name: 'routing gap alerts', detail: 'Platform flags open dates between confirmed shows automatically' },
    ]
  },
  messaging: {
    title: 'all conversations in one place',
    desc: 'Every offer has its own message thread. No more lost DMs.',
    items: [
      { name: 'per-offer chat', detail: 'Threaded conversation tied to each specific offer' },
      { name: 'real-time delivery', detail: 'Messages push instantly via Supabase Realtime' },
      { name: 'notification bell', detail: 'Unread count in navbar, updated live without refresh' },
      { name: 'system messages', detail: 'Auto-messages fire when offer status changes' },
      { name: 'deal room chat', detail: 'Separate thread inside each confirmed booking' },
      { name: 'mobile notifications', detail: 'Push alerts coming in Phase 4 mobile apps' },
    ]
  }
}

const ROLES = [
  { id: 'artists', label: 'artists', icon: '🎵', desc: 'Receive structured offers, manage your availability, track earnings, and run your entire touring operation from one dashboard.', color: '#C8FF3E' },
  { id: 'promoters', label: 'promoters', icon: '📣', desc: 'Find and book verified talent in minutes. Send structured offers, negotiate in-platform, and auto-generate contracts.', color: '#FF5C8A' },
  { id: 'venues', label: 'venues', icon: '🏛', desc: 'List your space, manage availability, and get discovered by promoters actively booking shows in your market.', color: '#FFB83E' },
  { id: 'production', label: 'production', icon: '🎚', desc: 'Get hired for sound, lighting, and stage management gigs. Build your touring résumé and BookScore™.', color: '#7B5CF0' },
  { id: 'photo & video', label: 'photo & video', icon: '📷', desc: 'Book concert photography and videography work. Tour with artists, build your portfolio, grow your rates.', color: '#3EC8FF' },
]

const STATS = [
  { value: '2,400+', label: 'artists listed' },
  { value: '840+', label: 'venues onboarded' },
  { value: '12,000+', label: 'shows booked' },
  { value: '$4.2M', label: 'paid out to artists' },
]

export default function Landing() {
  const [activeTab, setActiveTab] = useState('booking')
  const [activeRole, setActiveRole] = useState('artists')
  const doubled = [...MARQUEE_PROFILES, ...MARQUEE_PROFILES]

  return (
    <div className="min-h-screen bg-[#080C14] text-[#F0F2F7] overflow-x-hidden">

      {/* NAV */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] sticky top-0 bg-[#080C14]/90 backdrop-blur-sm z-50">
        <div className="font-syne font-black text-xl tracking-tight">
          Get<span className="text-[#C8FF3E]">Booked</span>.Live
        </div>
        <div className="hidden md:flex items-center gap-1">
          <Link to="/directory" className="px-3 py-2 text-sm text-[#8892A4] hover:text-white rounded-lg hover:bg-white/5 transition-all">browse</Link>
          <Link to="/pricing" className="px-3 py-2 text-sm text-[#8892A4] hover:text-white rounded-lg hover:bg-white/5 transition-all">pricing</Link>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/auth?mode=login" className="text-sm text-[#8892A4] hover:text-white transition-colors px-3 py-2">sign in</Link>
          <Link to="/auth?mode=signup" className="px-4 py-2 bg-[#C8FF3E] text-[#080C14] rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">start free</Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#C8FF3E]/8 border border-[#C8FF3E]/20 rounded-full text-xs text-[#C8FF3E] font-medium mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C8FF3E] animate-pulse inline-block" />
          live booking marketplace for the music industry
        </div>

        <h1 className="font-syne font-black text-5xl md:text-6xl leading-[1.05] tracking-tight mb-6">
          the all-in-one booking platform<br />
          for <span className="text-[#C8FF3E]">live music</span>
        </h1>

        <p className="text-[#8892A4] text-lg max-w-xl mx-auto mb-10 leading-relaxed">
          artists, promoters, venues, production crews, and photographers — all in one place. get booked, manage tours, and handle payments without the WhatsApp chaos.
        </p>

        <div className="flex items-center justify-center gap-3 flex-wrap mb-16">
          <Link to="/auth?mode=signup" className="px-8 py-4 bg-[#C8FF3E] text-[#080C14] rounded-2xl text-base font-bold hover:opacity-90 transition-opacity">
            get started free →
          </Link>
          <Link to="/directory" className="px-8 py-4 bg-[#0E1420] border border-white/10 rounded-2xl text-base font-medium hover:bg-white/5 transition-colors">
            browse artists
          </Link>
        </div>

        <div className="flex items-center justify-center gap-10 flex-wrap">
          {STATS.map(s => (
            <div key={s.label} className="text-center">
              <div className="font-syne font-black text-2xl text-[#C8FF3E]">{s.value}</div>
              <div className="text-xs text-[#8892A4] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PROFILE MARQUEE */}
      <section className="py-12 overflow-hidden">
        <p className="text-center text-xs text-[#5A6478] uppercase tracking-wider font-medium mb-6">
          this could be your profile
        </p>
        <div className="flex gap-4" style={{ animation: 'marquee 35s linear infinite', width: 'max-content' }}>
          {doubled.map((p, i) => (
            <div key={i} className="flex-shrink-0 w-52 bg-[#0E1420] border border-white/[0.06] rounded-2xl p-4 hover:border-white/15 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-syne font-black text-sm flex-shrink-0"
                  style={{ background: `${p.color}18`, color: p.color }}>
                  {p.initials}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-semibold truncate">{p.name}</p>
                  <p className="text-xs text-[#8892A4] truncate">{p.role}</p>
                </div>
              </div>
              <p className="text-xs text-[#5A6478] mb-2">{p.location}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#8892A4]">{p.bookings} bookings</span>
                <div className="w-2 h-2 rounded-full bg-[#3EFFBE]" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <style>{`@keyframes marquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }`}</style>

      {/* ROLE TABS */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <p className="text-center text-xs text-[#5A6478] uppercase tracking-wider font-medium mb-3">built for everyone in the room</p>
        <h2 className="font-syne font-black text-3xl text-center mb-10">customizable for any role</h2>
        <div className="flex gap-2 justify-center flex-wrap mb-8">
          {ROLES.map(r => (
            <button key={r.id} onClick={() => setActiveRole(r.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                activeRole === r.id ? 'text-[#080C14] border-transparent' : 'border-white/10 text-[#8892A4] hover:text-white bg-transparent'
              }`}
              style={activeRole === r.id ? { background: r.color } : {}}>
              {r.icon} {r.label}
            </button>
          ))}
        </div>
        {ROLES.filter(r => r.id === activeRole).map(r => (
          <div key={r.id} className="bg-[#0E1420] border border-white/[0.06] rounded-2xl p-8 text-center max-w-xl mx-auto">
            <div className="text-4xl mb-4">{r.icon}</div>
            <h3 className="font-syne font-bold text-xl mb-3" style={{ color: r.color }}>{r.label}</h3>
            <p className="text-[#8892A4] text-sm leading-relaxed mb-6">{r.desc}</p>
            <Link to="/auth?mode=signup"
              className="inline-block px-6 py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
              style={{ background: r.color, color: '#080C14' }}>
              join as {r.label} →
            </Link>
          </div>
        ))}
      </section>

      {/* BENTO FEATURES */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <p className="text-center text-xs text-[#5A6478] uppercase tracking-wider font-medium mb-3">everything in one place</p>
        <h2 className="font-syne font-black text-3xl text-center mb-10">no more WhatsApp chains</h2>
        <div className="flex gap-2 flex-wrap justify-center mb-8">
          {FEATURE_TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                activeTab === t.id ? 'bg-[#C8FF3E] text-[#080C14] border-transparent' : 'border-white/10 text-[#8892A4] hover:text-white bg-transparent'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        {Object.entries(FEATURES).filter(([k]) => k === activeTab).map(([k, f]) => (
          <div key={k}>
            <div className="text-center mb-8">
              <h3 className="font-syne font-black text-2xl mb-2">{f.title}</h3>
              <p className="text-[#8892A4] text-sm">{f.desc}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {f.items.map((item, i) => (
                <div key={i} className="bg-[#0E1420] border border-white/[0.06] rounded-2xl p-5 hover:border-white/10 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-[#C8FF3E]/10 flex items-center justify-center mb-3">
                    <div className="w-2 h-2 rounded-full bg-[#C8FF3E]" />
                  </div>
                  <h4 className="font-syne font-bold text-sm mb-2">{item.name}</h4>
                  <p className="text-xs text-[#8892A4] leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <p className="text-center text-xs text-[#5A6478] uppercase tracking-wider font-medium mb-3">see how it works</p>
        <h2 className="font-syne font-black text-3xl text-center mb-12">from offer to show in minutes</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { step: '01', title: 'find talent', desc: 'Browse verified artists, production crews, photographers, and venues. Filter by genre, city, and budget.', color: '#C8FF3E' },
            { step: '02', title: 'send an offer', desc: 'Fill out a structured 6-step offer form. The artist sees exactly what they\'ll earn after the platform fee.', color: '#3EFFBE' },
            { step: '03', title: 'manage the show', desc: 'Contract auto-generates on acceptance. Deal Room opens with milestones, messaging, and document storage.', color: '#7B5CF0' },
          ].map(s => (
            <div key={s.step} className="bg-[#0E1420] border border-white/[0.06] rounded-2xl p-6 relative overflow-hidden">
              <div className="font-syne font-black text-6xl opacity-5 absolute top-3 right-4" style={{ color: s.color }}>{s.step}</div>
              <div className="font-syne font-black text-xs mb-4" style={{ color: s.color }}>{s.step}</div>
              <h3 className="font-syne font-bold text-lg mb-3">{s.title}</h3>
              <p className="text-sm text-[#8892A4] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING TEASER */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <div className="bg-[#0E1420] border border-white/[0.06] rounded-3xl p-10 text-center">
          <p className="text-xs text-[#5A6478] uppercase tracking-wider font-medium mb-3">pricing</p>
          <h2 className="font-syne font-black text-3xl mb-3">free to join. pro pays for itself.</h2>
          <p className="text-[#8892A4] text-sm mb-8 max-w-md mx-auto">
            free plan: 20% commission. pro at $29/month drops it to 10%. one booking a month covers the cost.
          </p>
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { name: 'free', price: '$0', commission: '20% fee' },
              { name: 'pro artist', price: '$29/mo', commission: '10% fee', highlight: true },
              { name: 'agency', price: '$99/mo', commission: '5–7% fee' },
            ].map(p => (
              <div key={p.name} className={`rounded-2xl p-4 border ${(p as any).highlight ? 'border-[#C8FF3E]/40 bg-[#C8FF3E]/[0.04]' : 'border-white/[0.06] bg-[#141B28]'}`}>
                <p className="text-xs text-[#8892A4] mb-1">{p.name}</p>
                <p className="font-syne font-black text-lg mb-1" style={{ color: (p as any).highlight ? '#C8FF3E' : '#F0F2F7' }}>{p.price}</p>
                <p className="text-xs text-[#8892A4]">{p.commission}</p>
              </div>
            ))}
          </div>
          <Link to="/pricing" className="text-sm text-[#C8FF3E] hover:opacity-80 transition-opacity">see full pricing breakdown →</Link>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="font-syne font-black text-4xl mb-4">ready to get booked?</h2>
        <p className="text-[#8892A4] mb-8 text-sm">free to join. first booking takes minutes.</p>
        <Link to="/auth?mode=signup" className="inline-block px-10 py-4 bg-[#C8FF3E] text-[#080C14] rounded-2xl text-base font-bold hover:opacity-90 transition-opacity">
          create free account →
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.06] py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="font-syne font-black text-lg">Get<span className="text-[#C8FF3E]">Booked</span>.Live</div>
          <div className="flex gap-6 text-xs text-[#5A6478]">
            <Link to="/directory" className="hover:text-white transition-colors">browse</Link>
            <Link to="/pricing" className="hover:text-white transition-colors">pricing</Link>
            <Link to="/auth" className="hover:text-white transition-colors">sign in</Link>
          </div>
          <p className="text-xs text-[#5A6478]">© 2026 GetBooked.Live</p>
        </div>
      </footer>
    </div>
  )
}
