import SEO from "@/components/SEO";
import PageTransition from "@/components/PageTransition";

export default function TermsPage() {
  return (
    <PageTransition>
      <SEO
        title="Terms of Service | GetBooked.Live"
        description="Read the GetBooked.Live Terms of Service. By using our platform you agree to these terms governing bookings, payments, and conduct."
      />
      <div className="min-h-screen bg-background pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-3xl prose prose-invert prose-sm">
          <h1 className="font-syne text-3xl font-bold text-foreground mb-8">Terms of Service</h1>
          <p className="text-muted-foreground text-sm mb-6">Last updated: March 30, 2026</p>

          <h2 className="font-syne text-xl font-semibold text-foreground mt-8 mb-3">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground">By accessing or using GetBooked.Live ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Platform. These terms apply to all users including artists, promoters, venues, production crews, and creatives.</p>

          <h2 className="font-syne text-xl font-semibold text-foreground mt-8 mb-3">2. Description of Service</h2>
          <p className="text-muted-foreground">GetBooked.Live is a booking marketplace that connects artists, promoters, venues, and creative professionals in the live music and events industry. The Platform facilitates the creation, negotiation, and management of booking agreements. GetBooked.Live is not a party to any booking agreement between users.</p>

          <h2 className="font-syne text-xl font-semibold text-foreground mt-8 mb-3">3. User Accounts</h2>
          <p className="text-muted-foreground">You must create an account to use most features of the Platform. You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must provide accurate and complete information when creating your account. You must be at least 18 years old to use the Platform.</p>

          <h2 className="font-syne text-xl font-semibold text-foreground mt-8 mb-3">4. Booking Agreements</h2>
          <p className="text-muted-foreground">Booking offers sent through the Platform constitute legally binding proposals when accepted by the receiving party. Both parties are responsible for fulfilling the terms of any booking agreement they enter into. GetBooked.Live provides the infrastructure for these agreements but is not liable for any failure by either party to fulfil their obligations.</p>

          <h2 className="font-syne text-xl font-semibold text-foreground mt-8 mb-3">5. Payments</h2>
          <p className="text-muted-foreground">Payment processing is handled by Stripe. By using payment features you agree to Stripe's Terms of Service. GetBooked.Live charges a platform commission on completed bookings as disclosed at the time of offer creation. Deposits are non-refundable unless otherwise agreed in writing between the parties. Final payments are released to artists upon completion of the engagement.</p>

          <h2 className="font-syne text-xl font-semibold text-foreground mt-8 mb-3">6. Prohibited Conduct</h2>
          <p className="text-muted-foreground">You agree not to: use the Platform for any unlawful purpose; post false or misleading information; harass, threaten, or abuse other users; attempt to circumvent the Platform's payment system by arranging off-platform transactions; scrape, crawl, or extract data from the Platform without permission; or impersonate any person or entity.</p>

          <h2 className="font-syne text-xl font-semibold text-foreground mt-8 mb-3">7. Content and Intellectual Property</h2>
          <p className="text-muted-foreground">You retain ownership of content you post on the Platform (profile information, photos, music samples). By posting content, you grant GetBooked.Live a non-exclusive, worldwide, royalty-free licence to display and distribute that content in connection with operating the Platform. You are responsible for ensuring you have the right to post any content you upload.</p>

          <h2 className="font-syne text-xl font-semibold text-foreground mt-8 mb-3">8. Disputes Between Users</h2>
          <p className="text-muted-foreground">GetBooked.Live provides a dispute resolution process for booking-related disagreements. We reserve the right to make final decisions on disputes at our discretion. For payment disputes, we may hold funds in escrow pending resolution. Users agree to engage in good faith in the dispute resolution process before pursuing external legal action.</p>

          <h2 className="font-syne text-xl font-semibold text-foreground mt-8 mb-3">9. Limitation of Liability</h2>
          <p className="text-muted-foreground">GetBooked.Live is provided "as is" without warranties of any kind. To the maximum extent permitted by law, GetBooked.Live shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Platform, including but not limited to lost revenue from cancelled bookings, loss of data, or reputational harm.</p>

          <h2 className="font-syne text-xl font-semibold text-foreground mt-8 mb-3">10. Termination</h2>
          <p className="text-muted-foreground">We reserve the right to suspend or terminate your account at any time for violation of these terms, fraudulent activity, or behaviour that harms the Platform or its users. You may delete your account at any time through your account settings. Upon termination, your right to use the Platform ceases immediately.</p>

          <h2 className="font-syne text-xl font-semibold text-foreground mt-8 mb-3">11. Changes to Terms</h2>
          <p className="text-muted-foreground">We may update these Terms of Service from time to time. We will notify you of significant changes by email or through the Platform. Continued use of the Platform after changes take effect constitutes acceptance of the updated terms.</p>

          <h2 className="font-syne text-xl font-semibold text-foreground mt-8 mb-3">12. Governing Law</h2>
          <p className="text-muted-foreground">These Terms are governed by the laws of the jurisdiction in which GetBooked.Live is incorporated. Any disputes arising from these Terms shall be resolved through binding arbitration, except where prohibited by applicable law.</p>

          <h2 className="font-syne text-xl font-semibold text-foreground mt-8 mb-3">13. Contact</h2>
          <p className="text-muted-foreground">If you have questions about these Terms, please contact us at <a href="mailto:hello@getbooked.live" className="text-primary hover:underline">hello@getbooked.live</a> or visit our <a href="/contact" className="text-primary hover:underline">Contact page</a>.</p>
        </div>
      </div>
    </PageTransition>
  );
}
