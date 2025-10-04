import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Footer from "@/components/Footer";

const EULA = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          
          <h1 className="text-4xl font-bold mb-2">End-User License Agreement (EULA)</h1>
          <p className="text-muted-foreground mb-8">Last Updated: January 2025</p>
          
          <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
            <section>
              <p className="font-semibold text-lg">
                PLEASE READ THIS END-USER LICENSE AGREEMENT CAREFULLY BEFORE USING THE BESCORED SERVICE.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">1. AGREEMENT TO TERMS</h2>
              <p>
                This End-User License Agreement ("Agreement") is a legal agreement between you (either an individual or a single entity, "You" or "User") and Execture ("Company," "We," "Us," or "Our") for the use of the BeScored software application and related services (collectively, the "Service").
              </p>
              <div className="my-4">
                <p className="font-semibold mb-2">Company Information:</p>
                <ul className="list-none space-y-1">
                  <li>Company Name: Execture</li>
                  <li>Website: BeScored.com</li>
                  <li>Email: contact@execture.com</li>
                  <li>Address: 10000 Washington Blvd, Culver City, CA 90232</li>
                </ul>
              </div>
              <p>
                By accessing or using the Service, you agree to be bound by this Agreement. If you do not agree to these terms, do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. LICENSE GRANT</h2>
              <h3 className="text-xl font-semibold mb-3">2.1 Limited License</h3>
              <p>
                Subject to your compliance with this Agreement, we grant you a limited, non-exclusive, non-transferable, revocable license to access and use the Service for your internal business purposes.
              </p>
              
              <h3 className="text-xl font-semibold mb-3 mt-4">2.2 License Restrictions</h3>
              <p className="mb-2">You agree NOT to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Copy, modify, or create derivative works of the Service</li>
                <li>Reverse engineer, decompile, or disassemble the Service</li>
                <li>Rent, lease, lend, sell, sublicense, or transfer the Service</li>
                <li>Remove or alter any proprietary notices on the Service</li>
                <li>Use the Service for any illegal purpose or in violation of any laws</li>
                <li>Access the Service to build a competitive product or service</li>
                <li>Use automated systems or software to extract data from the Service</li>
                <li>Attempt to gain unauthorized access to any portion of the Service</li>
                <li>Interfere with or disrupt the integrity or performance of the Service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. QUICKBOOKS INTEGRATION</h2>
              <h3 className="text-xl font-semibold mb-3">3.1 QuickBooks Connection</h3>
              <p className="mb-2">The Service integrates with QuickBooks Online via Intuit's API. By connecting your QuickBooks account:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>You authorize the Service to access your QuickBooks data as described in our Privacy Policy</li>
                <li>You grant the Service permission to read, write, and modify QuickBooks data as necessary to provide functionality</li>
                <li>You acknowledge that you have the authority to grant such access</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-4">3.2 QuickBooks Terms</h3>
              <p className="mb-2">Your use of QuickBooks in connection with the Service is also governed by:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  <a 
                    href="https://www.intuit.com/legal/terms/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Intuit's Terms of Service
                  </a>
                </li>
                <li>
                  <a 
                    href="https://www.intuit.com/privacy/statement/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Intuit's Privacy Statement
                  </a>
                </li>
                <li>QuickBooks API Developer Terms</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-4">3.3 Data Synchronization</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>The Service syncs data with QuickBooks Online according to the frequency you configure</li>
                <li>You are responsible for the accuracy and completeness of data you provide</li>
                <li>We are not responsible for data loss or corruption in QuickBooks caused by your misuse of the Service</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-4">3.4 Disconnection</h3>
              <p className="mb-2">You may disconnect your QuickBooks account at any time through:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>The Service's settings interface</li>
                <li>Your QuickBooks App Store settings</li>
                <li>By contacting us at contact@execture.com</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. USER ACCOUNTS AND SECURITY</h2>
              <h3 className="text-xl font-semibold mb-3">4.1 Account Creation</h3>
              <p className="mb-2">To use the Service, you must:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Be at least 18 years of age</li>
                <li>Provide accurate and complete information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Be responsible for all activities under your account</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-4">4.2 Account Security</h3>
              <p className="mb-2">You agree to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Maintain strong, unique passwords</li>
                <li>Not share your account credentials with others</li>
                <li>Notify us immediately of any unauthorized access</li>
                <li>Accept responsibility for all activities that occur under your account</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. DATA AND PRIVACY</h2>
              <h3 className="text-xl font-semibold mb-3">5.1 Your Data</h3>
              <p>You retain all ownership rights to your data. We do not claim ownership of any data you submit to the Service.</p>

              <h3 className="text-xl font-semibold mb-3 mt-4">5.2 Data Usage</h3>
              <p>
                Our collection, use, and protection of your data is governed by our Privacy Policy, available at BeScored.com/privacy-policy, which is incorporated into this Agreement by reference.
              </p>

              <h3 className="text-xl font-semibold mb-3 mt-4">5.3 Data Security</h3>
              <p className="mb-2">We implement reasonable security measures to protect your data, including:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Encryption of data in transit and at rest</li>
                <li>Secure authentication mechanisms</li>
                <li>Regular security audits</li>
                <li>Access controls and monitoring</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-4">5.4 Data Retention</h3>
              <p className="mb-2">Upon termination of your account, we will:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Retain your data for 30 days to allow for account recovery</li>
                <li>Permanently delete your data after 30 days unless legally required to retain it</li>
                <li>Provide you with the ability to export your data before deletion</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. FEES AND PAYMENT</h2>
              <h3 className="text-xl font-semibold mb-3">6.1 Subscription Fees</h3>
              <p className="mb-2">If applicable, you agree to pay all fees associated with your chosen subscription plan. Fees are:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Billed in advance on a recurring basis (monthly or annually)</li>
                <li>Non-refundable except as required by law</li>
                <li>Subject to change with 30 days' notice</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-4">6.2 Free Trial</h3>
              <p className="mb-2">If we offer a free trial:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>The trial period lasts for the specified duration</li>
                <li>You will be charged upon trial expiration unless you cancel</li>
                <li>We may limit free trial eligibility</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-4">6.3 Taxes</h3>
              <p>You are responsible for all applicable taxes, and we may collect such taxes in addition to the subscription fees.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. INTELLECTUAL PROPERTY RIGHTS</h2>
              <h3 className="text-xl font-semibold mb-3">7.1 Service Ownership</h3>
              <p className="mb-2">The Service, including all software, text, graphics, logos, and other content, is owned by Execture and is protected by:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>United States copyright laws</li>
                <li>International copyright treaties</li>
                <li>Other intellectual property laws</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-4">7.2 Trademarks</h3>
              <p>"BeScored" and our logos are trademarks of Execture. You may not use these marks without our prior written permission.</p>

              <h3 className="text-xl font-semibold mb-3 mt-4">7.3 QuickBooks Trademarks</h3>
              <p>"QuickBooks," "Intuit," and related marks are trademarks of Intuit Inc. We use these marks with permission to indicate our integration with QuickBooks.</p>

              <h3 className="text-xl font-semibold mb-3 mt-4">7.4 Feedback</h3>
              <p>If you provide us with feedback or suggestions, we may use such feedback without any obligation to you.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. WARRANTIES AND DISCLAIMERS</h2>
              <h3 className="text-xl font-semibold mb-3">8.1 Service "As Is"</h3>
              <p className="mb-2">THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>WARRANTIES OF MERCHANTABILITY</li>
                <li>FITNESS FOR A PARTICULAR PURPOSE</li>
                <li>NON-INFRINGEMENT</li>
                <li>UNINTERRUPTED OR ERROR-FREE OPERATION</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-4">8.2 No Guarantee</h3>
              <p className="mb-2">We do not guarantee that:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>The Service will meet your specific requirements</li>
                <li>The Service will be available at all times</li>
                <li>Results obtained from the Service will be accurate or reliable</li>
                <li>Any errors in the Service will be corrected</li>
                <li>The Service will be compatible with all QuickBooks versions</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-4">8.3 Professional Advice Disclaimer</h3>
              <p>The Service does not provide accounting, tax, financial, or legal advice. You should consult with appropriate professionals for such advice.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. LIMITATION OF LIABILITY</h2>
              <h3 className="text-xl font-semibold mb-3">9.1 Maximum Liability</h3>
              <p className="mb-2">TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL EXECTURE, ITS OFFICERS, DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES</li>
                <li>LOSS OF PROFITS, REVENUE, DATA, OR USE</li>
                <li>DAMAGES RESULTING FROM SERVICE INTERRUPTIONS</li>
                <li>DAMAGES ARISING FROM YOUR USE OR INABILITY TO USE THE SERVICE</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-4">9.2 Cap on Liability</h3>
              <p className="mb-2">OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING FROM OR RELATED TO THE SERVICE SHALL NOT EXCEED THE GREATER OF:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>The amount you paid us in the 12 months preceding the claim, or</li>
                <li>$100.00 USD</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-4">9.3 Basis of the Bargain</h3>
              <p>You acknowledge that we have set our prices and entered into this Agreement in reliance upon these limitations of liability, which allocate the risk between us and form a basis of the bargain.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. INDEMNIFICATION</h2>
              <p className="mb-2">You agree to indemnify, defend, and hold harmless Execture and its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including reasonable attorneys' fees) arising from:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Your use or misuse of the Service</li>
                <li>Your violation of this Agreement</li>
                <li>Your violation of any third-party rights</li>
                <li>Your data or content submitted to the Service</li>
                <li>Your QuickBooks account or data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. TERM AND TERMINATION</h2>
              <h3 className="text-xl font-semibold mb-3">11.1 Term</h3>
              <p>This Agreement begins when you first access the Service and continues until terminated.</p>

              <h3 className="text-xl font-semibold mb-3 mt-4">11.2 Termination by You</h3>
              <p className="mb-2">You may terminate this Agreement at any time by:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Discontinuing use of the Service</li>
                <li>Deleting your account</li>
                <li>Contacting us at contact@execture.com</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-4">11.3 Termination by Us</h3>
              <p className="mb-2">We may suspend or terminate your access immediately, without notice, if:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>You breach this Agreement</li>
                <li>You engage in fraudulent or illegal activities</li>
                <li>Your account has been inactive for over 12 months</li>
                <li>We discontinue the Service</li>
                <li>Required by law or court order</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-4">11.4 Effect of Termination</h3>
              <p className="mb-2">Upon termination:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Your license to use the Service immediately ends</li>
                <li>We may delete your account and data after 30 days</li>
                <li>You remain liable for any fees incurred before termination</li>
                <li>Sections that by their nature should survive will remain in effect</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">12. CHANGES TO THE SERVICE</h2>
              <h3 className="text-xl font-semibold mb-3">12.1 Modifications</h3>
              <p className="mb-2">We reserve the right to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Modify or discontinue any feature of the Service</li>
                <li>Change pricing with 30 days' notice</li>
                <li>Update this Agreement from time to time</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-4">12.2 Notice of Changes</h3>
              <p className="mb-2">We will notify you of material changes via:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Email to your registered email address</li>
                <li>Notice within the Service</li>
                <li>Posting on our website</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-4">12.3 Continued Use</h3>
              <p>Your continued use of the Service after changes constitutes acceptance of the modified terms.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">13. GENERAL PROVISIONS</h2>
              <h3 className="text-xl font-semibold mb-3">13.1 Entire Agreement</h3>
              <p>This Agreement, together with our Privacy Policy and Terms of Service, constitutes the entire agreement between you and Execture regarding the Service.</p>

              <h3 className="text-xl font-semibold mb-3 mt-4">13.2 Governing Law</h3>
              <p>This Agreement is governed by the laws of the State of California, United States, without regard to its conflict of law provisions.</p>

              <h3 className="text-xl font-semibold mb-3 mt-4">13.3 Dispute Resolution</h3>
              <p className="mb-2">Any disputes arising from this Agreement shall be resolved through:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Good faith negotiation first</li>
                <li>Binding arbitration in Los Angeles County, California</li>
                <li>Under the rules of the American Arbitration Association</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-4">13.4 Venue</h3>
              <p>If arbitration is not applicable, you agree that any legal action shall be brought exclusively in the state or federal courts located in Los Angeles County, California.</p>

              <h3 className="text-xl font-semibold mb-3 mt-4">13.5 Severability</h3>
              <p>If any provision of this Agreement is found to be unenforceable, the remaining provisions will remain in full force and effect.</p>

              <h3 className="text-xl font-semibold mb-3 mt-4">13.6 Waiver</h3>
              <p>Our failure to enforce any right or provision of this Agreement will not constitute a waiver of such right or provision.</p>

              <h3 className="text-xl font-semibold mb-3 mt-4">13.7 Assignment</h3>
              <p>You may not assign this Agreement without our prior written consent. We may assign this Agreement without restriction.</p>

              <h3 className="text-xl font-semibold mb-3 mt-4">13.8 Force Majeure</h3>
              <p>We are not liable for any failure to perform due to circumstances beyond our reasonable control, including acts of God, natural disasters, war, terrorism, or labor disputes.</p>

              <h3 className="text-xl font-semibold mb-3 mt-4">13.9 Export Compliance</h3>
              <p>You agree to comply with all applicable export and import control laws and regulations.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">14. CONTACT INFORMATION</h2>
              <p className="mb-2">If you have questions about this Agreement, please contact us:</p>
              <div className="space-y-1">
                <p>Execture</p>
                <p>10000 Washington Blvd</p>
                <p>Culver City, CA 90232</p>
                <p>Email: contact@execture.com</p>
                <p>Website: BeScored.com</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">15. ACKNOWLEDGMENT</h2>
              <p className="font-semibold">
                BY USING THE SERVICE, YOU ACKNOWLEDGE THAT YOU HAVE READ THIS AGREEMENT, UNDERSTAND IT, AND AGREE TO BE BOUND BY ITS TERMS AND CONDITIONS.
              </p>
            </section>

            <section className="mt-12 pt-8 border-t border-border">
              <h2 className="text-xl font-semibold mb-4">Related Documents</h2>
              <ul className="space-y-2">
                <li>
                  <Link to="/privacy-policy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms-of-service" className="text-primary hover:underline">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default EULA;
