import AppTopBar from "../../components/AppTopBar";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#181a1b] text-white">
      <AppTopBar />
      
      <div className="container mx-auto px-6 py-16 max-w-4xl">
        <div className="prose prose-invert prose-lg max-w-none">
          <h1 className="text-4xl font-bold mb-8">General Terms and Conditions</h1>
          <p className="text-gray-400 italic mb-8">Last updated: 2025-01-15</p>
          
          <hr className="border-gray-700 my-8" />
          
          <h2 className="text-3xl font-bold mb-6">1. Acceptance of Terms</h2>
          <p className="mb-8">By accessing and using Saave.io, you accept and agree to be bound by the terms and provision of this agreement.</p>
          
          <h2 className="text-3xl font-bold mb-6">2. Service Description</h2>
          <p className="mb-8">Saave.io is an intelligent bookmark management service that allows users to save, organize, and search their web bookmarks using AI-powered features including automated tagging, content summarization, and intelligent search.</p>
          
          <h2 className="text-3xl font-bold mb-6">3. User Accounts</h2>
          
          <h3 className="text-2xl font-semibold mb-4">3.1 Account Creation</h3>
          <ul className="list-disc pl-6 mb-6">
            <li>You must provide accurate and complete information when creating an account</li>
            <li>You are responsible for maintaining the confidentiality of your account credentials</li>
            <li>You must notify us immediately of any unauthorized use of your account</li>
          </ul>
          
          <h3 className="text-2xl font-semibold mb-4">3.2 Account Responsibilities</h3>
          <ul className="list-disc pl-6 mb-8">
            <li>You are solely responsible for all activities under your account</li>
            <li>You must not share your account with others</li>
            <li>You must keep your contact information up to date</li>
          </ul>
          
          <h2 className="text-3xl font-bold mb-6">4. Acceptable Use</h2>
          
          <h3 className="text-2xl font-semibold mb-4">4.1 Permitted Uses</h3>
          <p className="mb-4">You may use Saave.io to:</p>
          <ul className="list-disc pl-6 mb-6">
            <li>Save and organize web bookmarks</li>
            <li>Search and manage your saved content</li>
            <li>Use AI features to enhance your bookmark organization</li>
            <li>Export your data in standard formats</li>
            <li>Use our browser extensions and APIs</li>
          </ul>
          
          <h3 className="text-2xl font-semibold mb-4">4.2 Prohibited Uses</h3>
          <p className="mb-4">You may not:</p>
          <ul className="list-disc pl-6 mb-8">
            <li>Use the service for illegal activities</li>
            <li>Attempt to reverse engineer or hack the service</li>
            <li>Share copyrighted content without permission</li>
            <li>Spam or abuse the service</li>
            <li>Violate any applicable laws or regulations</li>
            <li>Attempt to circumvent usage limits or restrictions</li>
          </ul>
          
          <h2 className="text-3xl font-bold mb-6">5. Service Availability</h2>
          <ul className="list-disc pl-6 mb-8">
            <li>Saave.io is provided on a best-effort basis</li>
            <li>We strive for high uptime but do not guarantee 100% availability</li>
            <li>Scheduled maintenance may temporarily interrupt service</li>
            <li>We are not liable for service interruptions beyond our reasonable control</li>
          </ul>
          
          <h2 className="text-3xl font-bold mb-6">6. Data and Privacy</h2>
          <ul className="list-disc pl-6 mb-8">
            <li>Your data privacy is governed by our Privacy Policy</li>
            <li>We reserve the right to remove content that violates our terms</li>
            <li>You retain ownership of your bookmarks and data</li>
            <li>We may use aggregated, anonymized data for service improvement</li>
            <li>You can export your data at any time</li>
          </ul>
          
          <h2 className="text-3xl font-bold mb-6">7. Intellectual Property</h2>
          <ul className="list-disc pl-6 mb-8">
            <li>Saave.io and its features are protected by intellectual property laws</li>
            <li>You may not copy, modify, or distribute our service</li>
            <li>User-generated content remains the property of the user</li>
            <li>You grant us a license to use your content to provide the service</li>
          </ul>
          
          <h2 className="text-3xl font-bold mb-6">8. Limitation of Liability</h2>
          <p className="mb-4">Saave.io is provided "as is" without warranties. We are not liable for:</p>
          <ul className="list-disc pl-6 mb-8">
            <li>Data loss or corruption</li>
            <li>Service interruptions</li>
            <li>Third-party actions</li>
            <li>Indirect or consequential damages</li>
            <li>Loss of profits or business opportunities</li>
          </ul>
          
          <h2 className="text-3xl font-bold mb-6">9. Termination</h2>
          <ul className="list-disc pl-6 mb-8">
            <li>You may terminate your account at any time</li>
            <li>We may suspend or terminate accounts for violations of these terms</li>
            <li>Upon termination, your data may be deleted after a reasonable period</li>
            <li>You can export your data before account termination</li>
          </ul>
          
          <h2 className="text-3xl font-bold mb-6">10. Changes to Terms</h2>
          <ul className="list-disc pl-6 mb-8">
            <li>We reserve the right to modify these terms at any time</li>
            <li>Continued use of the service constitutes acceptance of modified terms</li>
            <li>We will notify users of significant changes via email or service notifications</li>
          </ul>
          
          <h2 className="text-3xl font-bold mb-6">11. Governing Law</h2>
          <p className="mb-8">These terms are governed by the laws of the jurisdiction where Saave.io operates.</p>
          
          <h2 className="text-3xl font-bold mb-6">12. Contact Information</h2>
          <p className="mb-4">For questions about these terms, contact us at:</p>
          <p className="mb-8">📧 <strong>support@saave.io</strong></p>
          
          <hr className="border-gray-700 my-8" />
          
          <p className="text-center text-gray-400">
            © 2025 Saave.io — All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}