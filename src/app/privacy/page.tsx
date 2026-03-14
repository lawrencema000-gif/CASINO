import { Metadata } from 'next'
import { Shield } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Privacy Policy | FORTUNA CASINO',
  description: 'Privacy Policy for Fortuna Casino. Learn how we collect, use, and protect your personal data.',
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[var(--casino-bg)] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="w-8 h-8 text-[var(--casino-accent)]" />
            <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
          </div>
          <p className="text-[var(--casino-text-muted)] text-sm">
            Last updated: March 2026
          </p>
        </div>

        <div className="space-y-8 text-[var(--casino-text-muted)] leading-relaxed">
          {/* Introduction */}
          <section>
            <p>
              Fortuna Casino (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is
              committed to protecting your privacy. This Privacy Policy explains how we
              collect, use, disclose, and safeguard your information when you use our
              platform, including all associated websites, applications, and services
              (collectively, the &quot;Service&quot;). Please read this policy carefully.
              By using the Service, you consent to the practices described herein.
            </p>
          </section>

          {/* 1. Information We Collect */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              1. Information We Collect
            </h2>

            <h3 className="text-lg font-medium text-white mt-4 mb-2">
              1.1 Information You Provide
            </h3>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <span className="text-white font-medium">Account Data:</span> When you
                register, we collect your email address, username, and password (stored in
                hashed form).
              </li>
              <li>
                <span className="text-white font-medium">Profile Information:</span> Any
                additional information you choose to provide, such as a display name or
                avatar.
              </li>
              <li>
                <span className="text-white font-medium">Communications:</span> Messages
                or correspondence you send to us, including support requests and feedback.
              </li>
            </ul>

            <h3 className="text-lg font-medium text-white mt-4 mb-2">
              1.2 Information Collected Automatically
            </h3>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <span className="text-white font-medium">Usage Data:</span> Pages visited,
                games played, session duration, interaction patterns, and feature usage.
              </li>
              <li>
                <span className="text-white font-medium">Device Information:</span>{' '}
                Browser type, operating system, device type, screen resolution, and
                language preferences.
              </li>
              <li>
                <span className="text-white font-medium">Log Data:</span> IP address,
                access times, referring URLs, and error logs.
              </li>
              <li>
                <span className="text-white font-medium">Game Data:</span> Bet amounts,
                game outcomes, seeds used for provably fair verification, and transaction
                history within the platform.
              </li>
            </ul>
          </section>

          {/* 2. How We Use Your Information */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              2. How We Use Your Information
            </h2>
            <p className="mb-3">
              We use the information we collect for the following purposes:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <span className="text-white font-medium">Service Operation:</span> To
                create and manage your account, authenticate your identity, and provide the
                Service.
              </li>
              <li>
                <span className="text-white font-medium">Game Integrity:</span> To
                maintain our provably fair system and ensure the integrity of game
                outcomes.
              </li>
              <li>
                <span className="text-white font-medium">Security:</span> To detect,
                prevent, and respond to fraud, abuse, security incidents, and other harmful
                activity.
              </li>
              <li>
                <span className="text-white font-medium">Improvement:</span> To analyze
                usage patterns, diagnose technical issues, and improve the Service.
              </li>
              <li>
                <span className="text-white font-medium">Communication:</span> To send
                service-related notices, respond to inquiries, and provide customer
                support.
              </li>
              <li>
                <span className="text-white font-medium">Legal Compliance:</span> To
                comply with applicable laws, regulations, and legal processes.
              </li>
            </ul>
          </section>

          {/* 3. Cookies and Tracking */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              3. Cookies and Tracking Technologies
            </h2>
            <p className="mb-3">
              We use cookies and similar tracking technologies to enhance your experience.
              These include:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[var(--casino-border)]">
                    <th className="text-left py-3 pr-4 text-white font-medium">Type</th>
                    <th className="text-left py-3 pr-4 text-white font-medium">Purpose</th>
                    <th className="text-left py-3 text-white font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--casino-border)]">
                  <tr>
                    <td className="py-3 pr-4 text-white">Essential</td>
                    <td className="py-3 pr-4">Authentication, session management, security</td>
                    <td className="py-3">Session / 30 days</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 text-white">Functional</td>
                    <td className="py-3 pr-4">User preferences, game settings, theme</td>
                    <td className="py-3">1 year</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 text-white">Analytics</td>
                    <td className="py-3 pr-4">Usage statistics, performance monitoring</td>
                    <td className="py-3">1 year</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3">
              You can control cookies through your browser settings. Disabling essential
              cookies may impair the functionality of the Service.
            </p>
          </section>

          {/* 4. Third-Party Services */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              4. Third-Party Services
            </h2>
            <p className="mb-3">
              We use the following third-party services that may process your data:
            </p>
            <div className="space-y-4">
              <div className="rounded-xl border border-[var(--casino-border)] bg-[var(--casino-surface)] p-4">
                <h4 className="text-white font-medium mb-1">Supabase</h4>
                <p className="text-sm">
                  Database and authentication provider. Stores account data, game records,
                  and authentication tokens. Data is hosted on secure, SOC 2 compliant
                  infrastructure. See{' '}
                  <a
                    href="https://supabase.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--casino-accent)] hover:underline"
                  >
                    Supabase Privacy Policy
                  </a>
                  .
                </p>
              </div>
              <div className="rounded-xl border border-[var(--casino-border)] bg-[var(--casino-surface)] p-4">
                <h4 className="text-white font-medium mb-1">Vercel</h4>
                <p className="text-sm">
                  Hosting and deployment platform. Processes request data including IP
                  addresses, request headers, and page views for content delivery and
                  performance optimization. See{' '}
                  <a
                    href="https://vercel.com/legal/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--casino-accent)] hover:underline"
                  >
                    Vercel Privacy Policy
                  </a>
                  .
                </p>
              </div>
            </div>
            <p className="mt-3">
              We do not sell your personal information to third parties. Third-party
              services are contractually obligated to protect your data in accordance with
              their respective privacy policies and applicable data protection laws.
            </p>
          </section>

          {/* 5. Data Retention */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Data Retention</h2>
            <p className="mb-3">
              We retain your personal data for as long as necessary to fulfill the purposes
              outlined in this Privacy Policy, unless a longer retention period is required
              or permitted by law. Specifically:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <span className="text-white font-medium">Account Data:</span> Retained for
                the duration of your account and up to 30 days after account deletion.
              </li>
              <li>
                <span className="text-white font-medium">Game Records:</span> Retained for
                up to 12 months for provably fair verification and dispute resolution.
              </li>
              <li>
                <span className="text-white font-medium">Log Data:</span> Retained for up
                to 90 days for security and debugging purposes.
              </li>
              <li>
                <span className="text-white font-medium">Analytics Data:</span>{' '}
                Aggregated and anonymized data may be retained indefinitely.
              </li>
            </ul>
          </section>

          {/* 6. Your Rights (GDPR) */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              6. Your Rights
            </h2>
            <p className="mb-3">
              Depending on your jurisdiction, you may have the following rights regarding
              your personal data:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  right: 'Right of Access',
                  desc: 'Request a copy of the personal data we hold about you.',
                },
                {
                  right: 'Right to Rectification',
                  desc: 'Request correction of inaccurate or incomplete data.',
                },
                {
                  right: 'Right to Erasure',
                  desc: 'Request deletion of your personal data ("right to be forgotten").',
                },
                {
                  right: 'Right to Restrict Processing',
                  desc: 'Request limitation of how we process your data.',
                },
                {
                  right: 'Right to Data Portability',
                  desc: 'Receive your data in a structured, machine-readable format.',
                },
                {
                  right: 'Right to Object',
                  desc: 'Object to processing of your data for certain purposes.',
                },
                {
                  right: 'Right to Withdraw Consent',
                  desc: 'Withdraw consent at any time where processing is based on consent.',
                },
                {
                  right: 'Right to Lodge a Complaint',
                  desc: 'File a complaint with a supervisory authority in your jurisdiction.',
                },
              ].map((item) => (
                <div
                  key={item.right}
                  className="rounded-xl border border-[var(--casino-border)] bg-[var(--casino-surface)] p-4"
                >
                  <h4 className="text-white font-medium text-sm mb-1">{item.right}</h4>
                  <p className="text-xs">{item.desc}</p>
                </div>
              ))}
            </div>
            <p className="mt-4">
              To exercise any of these rights, please contact us at{' '}
              <a
                href="mailto:privacy@fortunacasino.com"
                className="text-[var(--casino-accent)] hover:underline"
              >
                privacy@fortunacasino.com
              </a>
              . We will respond to your request within 30 days.
            </p>
          </section>

          {/* 7. Data Security */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect
              your personal data against unauthorized access, alteration, disclosure, or
              destruction. These measures include encryption of data in transit (TLS/SSL)
              and at rest, access controls, regular security audits, and secure coding
              practices. However, no method of transmission over the Internet or method of
              electronic storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          {/* 8. International Data Transfers */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              8. International Data Transfers
            </h2>
            <p>
              Your information may be transferred to, stored, and processed in countries
              other than your country of residence. These countries may have data protection
              laws that differ from those of your jurisdiction. When we transfer data
              internationally, we ensure appropriate safeguards are in place, such as
              standard contractual clauses approved by relevant data protection authorities.
            </p>
          </section>

          {/* 9. Children's Privacy */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              9. Children&apos;s Privacy
            </h2>
            <p>
              The Service is not intended for individuals under the age of 18. We do not
              knowingly collect personal data from children. If we become aware that we have
              collected personal data from a child without parental consent, we will take
              steps to delete that information promptly. If you believe a child has provided
              us with personal data, please contact us immediately.
            </p>
          </section>

          {/* 10. Legal Basis for Processing (GDPR) */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              10. Legal Basis for Processing
            </h2>
            <p className="mb-3">
              If you are located in the European Economic Area (EEA), we process your
              personal data on the following legal bases:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <span className="text-white font-medium">Contractual Necessity:</span>{' '}
                Processing necessary to perform our contract with you (providing the
                Service).
              </li>
              <li>
                <span className="text-white font-medium">Legitimate Interests:</span>{' '}
                Processing necessary for our legitimate interests, such as fraud
                prevention, security, and service improvement, provided these interests
                are not overridden by your rights.
              </li>
              <li>
                <span className="text-white font-medium">Consent:</span> Where you have
                given explicit consent for specific processing activities.
              </li>
              <li>
                <span className="text-white font-medium">Legal Obligation:</span>{' '}
                Processing necessary to comply with a legal obligation to which we are
                subject.
              </li>
            </ul>
          </section>

          {/* 11. Changes to This Policy */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              11. Changes to This Privacy Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. Changes will be posted
              on this page with an updated &quot;Last updated&quot; date. We encourage you
              to review this policy periodically. Your continued use of the Service after
              any modifications constitutes your acceptance of the updated Privacy Policy.
              For material changes, we will provide notice through the Service or via
              email.
            </p>
          </section>

          {/* 12. Contact */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              12. Contact Information
            </h2>
            <p className="mb-3">
              If you have questions, concerns, or requests regarding this Privacy Policy or
              our data practices, please contact us:
            </p>
            <div className="rounded-xl border border-[var(--casino-border)] bg-[var(--casino-surface)] p-4">
              <p className="text-white font-medium">Fortuna Casino - Privacy Team</p>
              <p className="text-sm mt-1">
                Email:{' '}
                <a
                  href="mailto:privacy@fortunacasino.com"
                  className="text-[var(--casino-accent)] hover:underline"
                >
                  privacy@fortunacasino.com
                </a>
              </p>
              <p className="text-sm">
                General Inquiries:{' '}
                <a
                  href="mailto:support@fortunacasino.com"
                  className="text-[var(--casino-accent)] hover:underline"
                >
                  support@fortunacasino.com
                </a>
              </p>
            </div>
          </section>

          {/* Footer */}
          <div className="border-t border-[var(--casino-border)] pt-6 mt-10">
            <p className="text-xs text-[var(--casino-text-muted)]">
              &copy; 2026 Fortuna Casino. All rights reserved. This Privacy Policy is
              effective as of March 2026 and applies to all information collected through
              our Service.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
