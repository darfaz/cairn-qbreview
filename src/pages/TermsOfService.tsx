import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";

const TermsOfService = () => {
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
          <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">
            Last Updated: [Last Updated Date]
          </p>

          <section className="mb-8">
            <p className="text-lg">
              Please read these Terms of Service ("Terms") carefully before using the Execture 
              application ("Service") that integrates with QuickBooks Online. These Terms govern 
              your access to and use of our Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            
            <h3 className="text-xl font-medium mb-3">1.1 Agreement to Terms</h3>
            <p>
              By accessing or using our Service, you agree to be bound by these Terms and our 
              <Link to="/privacy-policy" className="text-primary hover:underline mx-1">
                Privacy Policy
              </Link>. 
              If you do not agree to these Terms, you may not use the Service.
            </p>

            <h3 className="text-xl font-medium mb-3">1.2 Age Requirements</h3>
            <p>
              You must be at least 18 years old to use this Service. By using the Service, you 
              represent and warrant that you are 18 years of age or older and have the legal 
              capacity to enter into these Terms.
            </p>

            <h3 className="text-xl font-medium mb-3">1.3 Business Use</h3>
            <p>
              This Service is intended for business and professional use. You represent that you 
              are using the Service on behalf of a business entity or in a professional capacity.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Service Description</h2>
            
            <h3 className="text-xl font-medium mb-3">2.1 What the App Does</h3>
            <p>
              Our Service provides tools and functionality to help you manage and analyze your 
              QuickBooks Online financial data, including:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Automated reconciliation of financial transactions</li>
              <li>Financial report generation and analysis</li>
              <li>Data synchronization with QuickBooks Online</li>
              <li>Dashboard and visualization tools</li>
              <li>Historical data tracking and review</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">2.2 QuickBooks Integration Features</h3>
            <p>The Service integrates with QuickBooks Online to:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Read transaction data, invoices, bills, and payments</li>
              <li>Access financial reports and account balances</li>
              <li>Retrieve customer and vendor information</li>
              <li>Monitor account reconciliation status</li>
              <li>Generate custom financial summaries</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">2.3 Service Availability</h3>
            <p>
              We strive to provide reliable service, but we do not guarantee uninterrupted access. 
              The Service may be temporarily unavailable due to maintenance, updates, or circumstances 
              beyond our control. We will provide advance notice of planned maintenance when possible.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. User Responsibilities</h2>
            
            <h3 className="text-xl font-medium mb-3">3.1 Accurate Information Requirement</h3>
            <p>You agree to:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Provide accurate, current, and complete information during registration</li>
              <li>Maintain and promptly update your account information</li>
              <li>Ensure the accuracy of data you provide to the Service</li>
              <li>Keep your contact information current for important notifications</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">3.2 Proper Use of QuickBooks Credentials</h3>
            <p>You are responsible for:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Maintaining the confidentiality of your QuickBooks account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized access</li>
              <li>Ensuring you have proper authorization to connect QuickBooks accounts</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">3.3 Prohibited Activities</h3>
            <p>You agree NOT to:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Use the Service for any illegal purpose or in violation of any laws</li>
              <li>Attempt to gain unauthorized access to the Service or other users' accounts</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
              <li>Use automated systems (bots, scrapers) without written permission</li>
              <li>Share your account access with unauthorized parties</li>
              <li>Transmit viruses, malware, or malicious code</li>
              <li>Use the Service to compete with us or develop competing products</li>
              <li>Violate Intuit's or QuickBooks' terms of service</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">3.4 Compliance with QuickBooks Terms</h3>
            <p>
              You must comply with QuickBooks Online's terms of service and acceptable use policies. 
              You can review QuickBooks' terms at{" "}
              <a 
                href="https://www.intuit.com/legal/terms/en-us/quickbooks/online/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Intuit Terms of Service
              </a>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. QuickBooks Integration</h2>
            
            <h3 className="text-xl font-medium mb-3">4.1 OAuth Connection Requirements</h3>
            <p>
              To use the Service, you must authorize our application to access your QuickBooks 
              account using OAuth 2.0 authentication. You explicitly authorize us to:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Read your QuickBooks company information</li>
              <li>Access transaction data, reports, and financial records</li>
              <li>Maintain a secure connection through access and refresh tokens</li>
              <li>Store connection credentials securely in encrypted form</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">4.2 Data Sync Frequency</h3>
            <p>
              The Service synchronizes data with QuickBooks Online based on your usage and 
              configuration settings. You can trigger manual syncs or schedule automated 
              reconciliation runs. Sync frequency may be subject to QuickBooks API rate limits.
            </p>

            <h3 className="text-xl font-medium mb-3">4.3 Disconnection Process</h3>
            <p>You may disconnect your QuickBooks integration at any time by:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Using the disconnect option in your account settings</li>
              <li>Revoking access through your QuickBooks account settings</li>
              <li>Contacting our support team at contact@execture.com</li>
            </ul>
            <p>
              Disconnection will immediately stop all data synchronization. We will retain 
              historical data according to our data retention policies unless you request deletion.
            </p>

            <h3 className="text-xl font-medium mb-3">4.4 QuickBooks API Usage Limitations</h3>
            <p>
              The Service operates within QuickBooks API rate limits and usage restrictions set 
              by Intuit. We cannot guarantee unlimited API calls or real-time data updates if 
              usage exceeds these limits. Heavy usage may result in temporary delays or throttling.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Account Management</h2>
            
            <h3 className="text-xl font-medium mb-3">5.1 Account Creation and Termination</h3>
            <p>
              You may create an account by registering with valid information. You may terminate 
              your account at any time by contacting us at contact@execture.com. We may terminate or 
              suspend your account if you violate these Terms.
            </p>

            <h3 className="text-xl font-medium mb-3">5.2 Suspension for Violations</h3>
            <p>We reserve the right to suspend or terminate your access if:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>You violate these Terms or our Privacy Policy</li>
              <li>You engage in prohibited activities</li>
              <li>Your account poses a security risk</li>
              <li>We are required to do so by law</li>
              <li>Your payment fails or your account becomes delinquent</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">5.3 Data Handling Upon Account Closure</h3>
            <p>
              When you close your account or disconnect QuickBooks:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Your access to the Service will be terminated</li>
              <li>We will delete or anonymize your data within 30 days</li>
              <li>Some data may be retained for legal or regulatory requirements</li>
              <li>You can request expedited deletion by contacting us</li>
              <li>Deleted data cannot be recovered</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Intellectual Property</h2>
            
            <h3 className="text-xl font-medium mb-3">6.1 Our Ownership of the App</h3>
            <p>
              The Service, including all software, designs, text, graphics, logos, and other 
              materials (excluding your data), is owned by Execture and protected by 
              copyright, trademark, and other intellectual property laws. You may not copy, 
              modify, distribute, or create derivative works without our written permission.
            </p>

            <h3 className="text-xl font-medium mb-3">6.2 Your Ownership of Your Data</h3>
            <p>
              You retain all rights to your business data, financial records, and information 
              stored in QuickBooks. We do not claim ownership of your data. You grant us a 
              limited license to access, process, and store your data solely to provide the Service.
            </p>

            <h3 className="text-xl font-medium mb-3">6.3 QuickBooks Trademarks</h3>
            <p>
              "QuickBooks," "QuickBooks Online," "Intuit," and related trademarks are the 
              property of Intuit Inc. We are not affiliated with, endorsed by, or sponsored 
              by Intuit. Our use of these marks is solely to indicate integration capability.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Limitations of Liability</h2>
            
            <h3 className="text-xl font-medium mb-3">7.1 Service Provided "As Is"</h3>
            <p>
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, 
              EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, 
              FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE 
              SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
            </p>

            <h3 className="text-xl font-medium mb-3">7.2 No Guarantee of Error-Free Operation</h3>
            <p>
              While we strive for accuracy, we do not guarantee that:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>The Service will be free from errors, bugs, or defects</li>
              <li>Data synchronization will be instantaneous or 100% accurate</li>
              <li>Reports and analyses will be error-free or complete</li>
              <li>The Service will meet all your specific requirements</li>
            </ul>
            <p>
              You are responsible for verifying all financial data and reports generated by the Service.
            </p>

            <h3 className="text-xl font-medium mb-3">7.3 Limitation of Damages</h3>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, EXECTURE SHALL NOT BE LIABLE FOR ANY 
              INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF 
              PROFITS, REVENUE, DATA, OR USE, ARISING FROM OR RELATED TO YOUR USE OF THE SERVICE, 
              EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
            </p>
            <p className="mt-4">
              IN NO EVENT SHALL OUR TOTAL LIABILITY EXCEED THE AMOUNT YOU PAID TO US IN THE 
              TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO LIABILITY, OR ONE HUNDRED 
              DOLLARS ($100), WHICHEVER IS GREATER.
            </p>

            <h3 className="text-xl font-medium mb-3">7.4 Indemnification</h3>
            <p>
              You agree to indemnify, defend, and hold harmless Execture, its officers, 
              directors, employees, and agents from any claims, liabilities, damages, losses, 
              costs, or expenses (including reasonable attorneys' fees) arising from:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Your use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any third-party rights</li>
              <li>Your violation of applicable laws or regulations</li>
              <li>Any inaccurate or misleading information you provide</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Changes to Service</h2>
            
            <h3 className="text-xl font-medium mb-3">8.1 Right to Modify or Discontinue</h3>
            <p>
              We reserve the right to modify, suspend, or discontinue the Service (or any part 
              thereof) at any time, with or without notice. We may also impose limits on certain 
              features or restrict access to parts of the Service without liability.
            </p>

            <h3 className="text-xl font-medium mb-3">8.2 Notification of Material Changes</h3>
            <p>
              For material changes that significantly affect functionality or your rights, we will:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Provide at least 30 days' advance notice via email</li>
              <li>Post a prominent notice in the Service interface</li>
              <li>Update the "Last Updated" date on these Terms</li>
            </ul>
            <p>
              Continued use of the Service after changes take effect constitutes acceptance of 
              the modified Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Fees and Payment</h2>
            <p>
              [If applicable - customize based on your pricing model:]
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Subscription fees and billing terms will be clearly communicated during signup</li>
              <li>All fees are non-refundable unless otherwise stated</li>
              <li>We reserve the right to change fees with 30 days' notice</li>
              <li>Failure to pay may result in service suspension</li>
              <li>You are responsible for all taxes associated with your subscription</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Dispute Resolution</h2>
            
            <h3 className="text-xl font-medium mb-3">10.1 Governing Law</h3>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of 
              [State/Country], without regard to its conflict of law provisions.
            </p>

            <h3 className="text-xl font-medium mb-3">10.2 Arbitration</h3>
            <p>
              Any dispute arising from these Terms or the Service shall be resolved through 
              binding arbitration in accordance with [Arbitration Rules/Organization], rather 
              than in court, except that you may assert claims in small claims court if your 
              claims qualify.
            </p>

            <h3 className="text-xl font-medium mb-3">10.3 Jurisdiction</h3>
            <p>
              Any legal action or proceeding related to these Terms shall be brought exclusively 
              in the courts located in [Jurisdiction], and you consent to the personal jurisdiction 
              of such courts.
            </p>

            <h3 className="text-xl font-medium mb-3">10.4 Class Action Waiver</h3>
            <p>
              You agree to resolve disputes with us only on an individual basis and not as part 
              of any class, consolidated, or representative action.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Miscellaneous</h2>
            
            <h3 className="text-xl font-medium mb-3">11.1 Entire Agreement</h3>
            <p>
              These Terms, together with our Privacy Policy, constitute the entire agreement 
              between you and Execture regarding the Service and supersede all prior 
              agreements and understandings.
            </p>

            <h3 className="text-xl font-medium mb-3">11.2 Severability</h3>
            <p>
              If any provision of these Terms is found to be invalid or unenforceable, the 
              remaining provisions will continue in full force and effect.
            </p>

            <h3 className="text-xl font-medium mb-3">11.3 Waiver</h3>
            <p>
              Our failure to enforce any right or provision of these Terms will not be deemed 
              a waiver of such right or provision.
            </p>

            <h3 className="text-xl font-medium mb-3">11.4 Assignment</h3>
            <p>
              You may not assign or transfer these Terms or your rights hereunder without our 
              prior written consent. We may assign these Terms without restriction.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">12. Contact Information</h2>
            <p>
              If you have questions about these Terms, please contact us:
            </p>
            <div className="bg-muted p-6 rounded-lg mt-4">
              <p className="mb-2"><strong>Support:</strong> contact@execture.com</p>
              <p className="mb-2"><strong>Company:</strong> Execture</p>
              <p><strong>Address:</strong> 10000 Washington Blvd, Culver City, CA 90232</p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">13. Additional Resources</h2>
            <ul className="list-disc pl-6">
              <li>
                <Link to="/privacy-policy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <a 
                  href="https://www.intuit.com/legal/terms/en-us/quickbooks/online/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  QuickBooks Terms of Service
                </a>
              </li>
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
            </ul>
          </section>

          <section className="mb-8 p-6 bg-muted rounded-lg">
            <p className="text-sm">
              <strong>IMPORTANT NOTICE:</strong> By using this Service, you acknowledge that you 
              have read, understood, and agree to be bound by these Terms of Service and our 
              Privacy Policy. You also acknowledge that you have reviewed QuickBooks' terms and 
              Intuit's privacy policies, and that your use of QuickBooks through our Service is 
              subject to those terms as well.
            </p>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default TermsOfService;
