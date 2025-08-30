import AppTopBar from "../../components/AppTopBar";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#181a1b] text-white">
      <AppTopBar />
      
      <div className="container mx-auto px-6 py-16 max-w-4xl">
        <div className="prose prose-invert max-w-none">
          <h1 className="text-4xl font-bold mb-8">Terms of Service & Privacy Policy</h1>
          <p className="text-gray-400 italic mb-8">Last updated: 2025-01-15</p>
          
          <hr className="border-gray-700 my-8" />
          
          <h2 className="text-3xl font-bold mb-6">Terms of Service</h2>
          
          <h3 className="text-2xl font-semibold mb-4">1. Subscription & Pricing</h3>
          <p className="mb-4">Saave.io offers a subscription-based service:</p>
          <ul className="list-disc pl-6 mb-6">
            <li><strong>$9/month</strong>, billed monthly</li>
            <li><strong>$5/month</strong>, billed annually ($60/year)</li>
          </ul>
          <p className="mb-6">You can cancel at any time via the Stripe billing portal. Your subscription will automatically renew unless canceled before the renewal date.</p>
          
          <h3 className="text-2xl font-semibold mb-4">2. Refund Policy</h3>
          <p className="mb-6">We offer a <strong>7-day unconditional refund</strong>.<br />
          If you've saved over 100 bookmarks in that period, we reserve the right to deny the refund in cases of clear abuse.</p>
          
          <h3 className="text-2xl font-semibold mb-4">3. Payment Processor</h3>
          <p className="mb-6">All payments are securely handled via <strong>Stripe</strong>.</p>
          
          <h3 className="text-2xl font-semibold mb-4">4. Target Audience</h3>
          <p className="mb-6">Saave.io is designed for developers, creators, and tech-savvy individuals who regularly consume and organize content online.</p>
          
          <h3 className="text-2xl font-semibold mb-4">5. Availability</h3>
          <p className="mb-8">The service is provided on a best-effort basis. While we strive for 24/7 uptime, we do not provide a formal SLA.</p>
          
          <hr className="border-gray-700 my-8" />
          
          <h2 className="text-3xl font-bold mb-6">Privacy Policy</h2>
          
          <h3 className="text-2xl font-semibold mb-4">1. Who we are</h3>
          <p className="mb-6">Saave.io is operated by <strong>Saave Technologies</strong>, committed to protecting your privacy and data.</p>
          
          <h3 className="text-2xl font-semibold mb-4">2. What we collect</h3>
          <p className="mb-4">We collect and store:</p>
          <ul className="list-disc pl-6 mb-6">
            <li>Your <strong>email address</strong></li>
            <li>Your <strong>name</strong> (if provided)</li>
            <li>Your <strong>bookmarks and associated metadata</strong></li>
            <li>Usage analytics to improve our service</li>
          </ul>
          <p className="mb-6">We do <strong>not</strong> sell your data to third parties.</p>
          
          <h3 className="text-2xl font-semibold mb-4">3. Third-party services</h3>
          <p className="mb-4">We use the following services:</p>
          <ul className="list-disc pl-6 mb-6">
            <li><strong>Stripe</strong> for payment processing</li>
            <li><strong>Vercel</strong> for hosting and deployment</li>
            <li><strong>Supabase</strong> for database and authentication</li>
            <li><strong>Analytics services</strong> for product improvement</li>
          </ul>
          <p className="mb-6">These services may receive limited user data strictly to provide their functionality.</p>
          
          <h3 className="text-2xl font-semibold mb-4">4. Data Deletion</h3>
          <p className="mb-4">You can request to delete your data at any time by:</p>
          <ul className="list-disc pl-6 mb-6">
            <li>Using the account deletion feature in your settings</li>
            <li>Contacting us directly via email</li>
          </ul>
          <p className="mb-6">📧 <strong>support@saave.io</strong></p>
          
          <h3 className="text-2xl font-semibold mb-4">5. European Users (GDPR)</h3>
          <p className="mb-6">Saave.io is committed to GDPR compliance for our European users. You have the right to access, rectify, erase, restrict processing, and data portability of your personal data.</p>
          
          <h3 className="text-2xl font-semibold mb-4">6. Data Security</h3>
          <p className="mb-6">We implement industry-standard security measures to protect your data, including encryption in transit and at rest, secure authentication, and regular security audits.</p>
          
          <h3 className="text-2xl font-semibold mb-4">7. Changes to Privacy Policy</h3>
          <p className="mb-8">We may update this privacy policy from time to time. We will notify users of significant changes via email or through the service.</p>
          
          <hr className="border-gray-700 my-8" />
          
          <p className="text-center text-gray-400">
            © 2025 Saave.io — All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}