import SEO from "@/components/SEO";
import PageTransition from "@/components/PageTransition";

export default function PrivacyPage() {
  return (
    <PageTransition>
      <SEO
        title="Privacy Policy | GetBooked.Live"
        description="Read the GetBooked.Live privacy policy. Learn how we collect, use, and protect your data."
      />
      <div className="min-h-screen bg-background pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-3xl prose prose-invert prose-sm">
          <h1 className="font-syne text-3xl font-bold text-foreground mb-8">Privacy Policy</h1>
          <p className="text-muted-foreground text-sm mb-6">Last updated: March 25, 2026</p>

          <h2 className="font-syne text-xl font-semibold text-foreground mt-8 mb-3">1. Information We Collect</h2>
          <p className="text-muted-foreground">We collect information you provide directly, including your name, email address, profile information (genre, city, bio), and payment details when you use our booking services. We also automatically collect usage data such as IP address, browser type, and pages visited.</p>

          <h2 className="font-syne text-xl font-semibold text-foreground mt-8 mb-3">2. How We Use Your Information</h2>
          <p className="text-muted-foreground">We use your information to provide and improve GetBooked.Live services, process bookings and payments, send notifications about offers and bookings, personalize your experience with AI-powered recommendations, and communicate updates about the platform.</p>

          <h2 className="font-syne text-xl font-semibold text-foreground mt-8 mb-3">3. Information Sharing</h2>
          <p className="text-muted-foreground">We share your public profile information (name, genre, city, bio) with other platform users to facilitate discovery and booking. We share payment information with our payment processor (Stripe) to process transactions. We do not sell your personal information to third parties.</p>

          <h2 className="font-syne text-xl font-semibold text-foreground mt-8 mb-3">4. Data Security</h2>
          <p className="text-muted-foreground">We implement industry-standard security measures including encryption in transit (TLS), encrypted storage, and row-level security policies to protect your data. Access to personal information is restricted to authorized personnel only.</p>

          <h2 className="font-syne text-xl font-semibold text-foreground mt-8 mb-3">5. Your Rights</h2>
          <p className="text-muted-foreground">You have the right to access, update, or delete your personal information at any time through your account settings. You can also request a copy of your data or ask us to stop processing your information by contacting us.</p>

          <h2 className="font-syne text-xl font-semibold text-foreground mt-8 mb-3">6. Cookies</h2>
          <p className="text-muted-foreground">We use essential cookies for authentication and session management. We do not use third-party advertising cookies. Analytics cookies are used to understand platform usage and improve our services.</p>

          <h2 className="font-syne text-xl font-semibold text-foreground mt-8 mb-3">7. Third-Party Services</h2>
          <p className="text-muted-foreground">GetBooked.Live integrates with third-party services including Stripe (payments), Spotify (streaming stats), and cloud infrastructure providers. Each service has its own privacy policy governing data handling.</p>

          <h2 className="font-syne text-xl font-semibold text-foreground mt-8 mb-3">8. Changes to This Policy</h2>
          <p className="text-muted-foreground">We may update this privacy policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date.</p>

          <h2 className="font-syne text-xl font-semibold text-foreground mt-8 mb-3">9. Contact Us</h2>
          <p className="text-muted-foreground">If you have questions about this privacy policy or your data, please contact us at <a href="mailto:getbookedlive@gmail.com" className="text-primary hover:underline">getbookedlive@gmail.com</a> or visit our <a href="/contact" className="text-primary hover:underline">Contact page</a>.</p>
        </div>
      </div>
    </PageTransition>
  );
}
