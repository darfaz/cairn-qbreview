import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <article className="prose prose-slate dark:prose-invert max-w-none">
          <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">
            Last Updated: [Last Updated Date]
          </p>

          <section className="mb-8">
            <p className="text-lg">
              Execture ("we," "us," or "our") is committed to protecting your privacy.
              This Privacy Policy explains how we collect, use, disclose, and safeguard your 
              information when you use our application that integrates with QuickBooks Online.
            </p>
            <p className="text-lg mt-4">
              By using our service, you agree to the collection and use of information in 
              accordance with this policy. Please also review{" "}
              <a 
                href="https://www.intuit.com/privacy/statement/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Intuit's Privacy Statement
              </a>{" "}
              and QuickBooks' privacy policies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
            
            <h3 className="text-xl font-medium mb-3">1.1 QuickBooks Account Information</h3>
            <p>When you connect your QuickBooks Online account, we collect:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Company name and QuickBooks Company ID (Realm ID)</li>
              <li>OAuth access tokens and refresh tokens</li>
              <li>Account connection status and permissions</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">1.2 Financial Data from QuickBooks</h3>
            <p>Through the QuickBooks API, we access and process:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Transaction data (invoices, bills, payments, expenses)</li>
              <li>Financial reports and reconciliation data</li>
              <li>Customer and vendor information</li>
              <li>Chart of accounts and account balances</li>
              <li>Other financial data necessary for app functionality</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">1.3 User Contact Information</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Email address</li>
              <li>Name (first and last)</li>
              <li>Company or firm information</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">1.4 Usage Data and Analytics</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Log data (IP address, browser type, pages visited)</li>
              <li>Device information</li>
              <li>Usage patterns and feature interactions</li>
              <li>Performance data and error reports</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
            <p>We use the collected information for the following purposes:</p>
            
            <h3 className="text-xl font-medium mb-3">2.1 To Provide App Functionality</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Sync and process QuickBooks financial data</li>
              <li>Generate reports and reconciliation summaries</li>
              <li>Maintain OAuth connection with QuickBooks</li>
              <li>Store and retrieve your data securely</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">2.2 To Improve Our Services</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Analyze usage patterns to enhance features</li>
              <li>Identify and fix technical issues</li>
              <li>Develop new functionality</li>
              <li>Optimize performance and user experience</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">2.3 For Customer Support</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Respond to your inquiries and support requests</li>
              <li>Troubleshoot technical problems</li>
              <li>Provide updates about service changes</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">2.4 For Security and Fraud Prevention</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Protect against unauthorized access</li>
              <li>Detect and prevent security threats</li>
              <li>Comply with legal obligations</li>
              <li>Enforce our Terms of Service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Data Storage and Security</h2>
            
            <h3 className="text-xl font-medium mb-3">3.1 Where Data is Stored</h3>
            <p>
              Your data is stored securely using [Cloud Provider - e.g., Supabase/AWS/Google Cloud]. 
              We use industry-standard cloud infrastructure with multiple redundancy and backup systems.
            </p>

            <h3 className="text-xl font-medium mb-3">3.2 Encryption Methods</h3>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Data in Transit:</strong> All data transmitted between your browser and our servers is encrypted using TLS/SSL protocols</li>
              <li><strong>Data at Rest:</strong> QuickBooks OAuth tokens are encrypted using AES-256 encryption before storage</li>
              <li><strong>Access Tokens:</strong> OAuth access and refresh tokens are encrypted with session-based keys and random initialization vectors</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">3.3 Security Measures</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Row-level security (RLS) policies restrict data access</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>Automated token refresh to maintain secure connections</li>
              <li>Audit logging of all token access attempts</li>
              <li>Secure OAuth 2.0 implementation following Intuit's best practices</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">3.4 Data Retention</h3>
            <p>
              We retain your data for as long as your account is active or as needed to provide 
              services. When you disconnect your QuickBooks integration or delete your account, 
              we will delete or anonymize your data within 30 days, except where we are required 
              to retain it for legal or regulatory purposes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Third-Party Services</h2>
            
            <h3 className="text-xl font-medium mb-3">4.1 QuickBooks Online Integration</h3>
            <p>
              Our app integrates with QuickBooks Online through Intuit's official API. 
              Your QuickBooks data is subject to{" "}
              <a 
                href="https://www.intuit.com/privacy/statement/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Intuit's Privacy Policy
              </a>. 
              We only access data that you explicitly authorize through OAuth consent.
            </p>

            <h3 className="text-xl font-medium mb-3">4.2 Analytics Services</h3>
            <p>
              We may use third-party analytics services to understand how users interact with 
              our app. These services may collect information about your usage patterns.
            </p>

            <h3 className="text-xl font-medium mb-3">4.3 Hosting Providers</h3>
            <p>
              Our application is hosted on [Hosting Provider]. These providers have access to 
              your data only to perform services on our behalf and are obligated not to disclose 
              or use it for other purposes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Your Rights</h2>
            <p>You have the following rights regarding your personal data:</p>

            <h3 className="text-xl font-medium mb-3">5.1 Right to Access</h3>
            <p>
              You can request a copy of the personal data we hold about you. Contact us at 
              contact@execture.com to request your data.
            </p>

            <h3 className="text-xl font-medium mb-3">5.2 Right to Request Data Deletion</h3>
            <p>
              You can request deletion of your personal data at any time. We will delete your 
              data within 30 days, subject to legal retention requirements.
            </p>

            <h3 className="text-xl font-medium mb-3">5.3 Right to Disconnect QuickBooks Integration</h3>
            <p>
              You can disconnect your QuickBooks integration at any time through your account 
              settings or by revoking access in your QuickBooks account. This will stop all 
              data synchronization immediately.
            </p>

            <h3 className="text-xl font-medium mb-3">5.4 How to Exercise Your Rights</h3>
            <p>
              To exercise any of these rights, please contact us at contact@execture.com. We will 
              respond to your request within 30 days.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Compliance</h2>

            <h3 className="text-xl font-medium mb-3">6.1 GDPR Compliance (for EU Users)</h3>
            <p>
              If you are located in the European Economic Area (EEA), you have additional rights 
              under the General Data Protection Regulation (GDPR):
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Right to data portability</li>
              <li>Right to object to processing</li>
              <li>Right to restrict processing</li>
              <li>Right to lodge a complaint with a supervisory authority</li>
            </ul>
            <p>
              Our legal basis for processing your data is your consent when you connect your 
              QuickBooks account and accept our Terms of Service.
            </p>

            <h3 className="text-xl font-medium mb-3">6.2 CCPA Compliance (for California Residents)</h3>
            <p>
              If you are a California resident, you have rights under the California Consumer 
              Privacy Act (CCPA):
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Right to know what personal information is collected</li>
              <li>Right to know if personal information is sold or disclosed</li>
              <li>Right to opt-out of the sale of personal information (we do not sell your data)</li>
              <li>Right to deletion of personal information</li>
              <li>Right to non-discrimination for exercising your rights</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">6.3 Intuit Data Handling Requirements</h3>
            <p>
              We comply with Intuit's API Terms of Service and data handling requirements, including:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Secure storage of OAuth tokens</li>
              <li>Proper encryption of sensitive data</li>
              <li>Limited data retention policies</li>
              <li>Transparent privacy practices</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Children's Privacy</h2>
            <p>
              Our service is not intended for children under 18 years of age. We do not knowingly 
              collect personal information from children. If you believe we have collected 
              information from a child, please contact us immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your 
              country of residence. These countries may have different data protection laws. 
              We ensure appropriate safeguards are in place to protect your data in accordance 
              with this Privacy Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Updates to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our 
              practices or for legal, operational, or regulatory reasons.
            </p>
            <p className="mt-4">
              <strong>How You Will Be Notified:</strong>
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>We will post the updated policy on this page with a new "Last Updated" date</li>
              <li>For material changes, we will send an email notification to your registered email address</li>
              <li>Continued use of the service after changes constitutes acceptance of the updated policy</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Contact Information</h2>
            <p>
              If you have questions, concerns, or requests regarding this Privacy Policy or 
              our data practices, please contact us:
            </p>
            <div className="bg-muted p-6 rounded-lg mt-4">
              <p className="mb-2"><strong>Email:</strong> contact@execture.com</p>
              <p className="mb-2"><strong>Company:</strong> Execture</p>
              <p><strong>Address:</strong> 10000 Washington Blvd, Culver City, CA 90232</p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Additional Resources</h2>
            <ul className="list-disc pl-6">
              <li>
                <a 
                  href="https://www.intuit.com/privacy/statement/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Intuit Privacy Statement
                </a>
              </li>
              <li>
                <a 
                  href="https://quickbooks.intuit.com/learn-support/en-us/help-article/security-privacy/privacy-policy/L9Mb1jcJJ_US_en_US" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  QuickBooks Privacy Policy
                </a>
              </li>
              <li>
                <Link to="/terms-of-service" className="text-primary hover:underline">
                  Our Terms of Service
                </Link>
              </li>
            </ul>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
