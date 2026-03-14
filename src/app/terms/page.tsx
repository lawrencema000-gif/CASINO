import { Metadata } from 'next'
import { Scale } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Terms of Service | FORTUNA CASINO',
  description: 'Terms of Service for Fortuna Casino. Read our terms and conditions before using our platform.',
}

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[var(--casino-bg)] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <Scale className="w-8 h-8 text-[var(--casino-accent)]" />
            <h1 className="text-3xl font-bold text-white">Terms of Service</h1>
          </div>
          <p className="text-[var(--casino-text-muted)] text-sm">
            Last updated: March 2026
          </p>
        </div>

        <div className="space-y-8 text-[var(--casino-text-muted)] leading-relaxed">
          {/* Introduction */}
          <section>
            <p>
              Welcome to Fortuna Casino. These Terms of Service (&quot;Terms&quot;) govern your
              access to and use of the Fortuna Casino platform, including all associated
              websites, applications, and services (collectively, the &quot;Service&quot;). By
              accessing or using the Service, you agree to be bound by these Terms. If you
              do not agree to these Terms, you must not use the Service.
            </p>
          </section>

          {/* 1. Eligibility */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Eligibility</h2>
            <p className="mb-3">
              You must be at least eighteen (18) years of age, or the minimum legal age
              for gambling in your jurisdiction (whichever is greater), to create an
              account and use the Service. By using the Service, you represent and warrant
              that:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>You meet the minimum age requirement.</li>
              <li>You have the legal capacity to enter into a binding agreement.</li>
              <li>
                You are not located in a jurisdiction where online gambling or the use of
                this Service is prohibited by law.
              </li>
              <li>
                You have not previously been suspended or removed from the Service.
              </li>
            </ul>
            <p className="mt-3">
              Fortuna Casino reserves the right to request proof of age at any time and to
              suspend or terminate accounts that fail to meet this requirement.
            </p>
          </section>

          {/* 2. Account Registration */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              2. Account Registration and Security
            </h2>
            <p className="mb-3">
              To access certain features of the Service, you must register for an account.
              When registering, you agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                Provide accurate, current, and complete information during the
                registration process.
              </li>
              <li>
                Maintain and promptly update your account information to keep it accurate
                and complete.
              </li>
              <li>
                Maintain the security and confidentiality of your login credentials.
              </li>
              <li>
                Accept responsibility for all activities that occur under your account.
              </li>
              <li>
                Notify us immediately of any unauthorized use of your account or any other
                breach of security.
              </li>
            </ul>
            <p className="mt-3">
              Each individual may maintain only one (1) account. The creation of multiple
              accounts by a single individual is strictly prohibited and may result in the
              termination of all associated accounts.
            </p>
          </section>

          {/* 3. Virtual Currency */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              3. Virtual Currency and In-Platform Balances
            </h2>
            <div className="rounded-xl border border-[var(--casino-accent)]/30 bg-[var(--casino-accent)]/5 p-4 mb-4">
              <p className="text-[var(--casino-accent)] font-semibold">
                Important: Fortuna Casino operates using virtual currency only. No real
                money is wagered, won, or lost on this platform.
              </p>
            </div>
            <p className="mb-3">
              All credits, coins, tokens, or balances displayed within the Service are
              virtual currency with no real-world monetary value. Virtual currency:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Cannot be exchanged for real money, goods, or services.</li>
              <li>Cannot be transferred between accounts or to third parties.</li>
              <li>Has no cash value and does not constitute personal property.</li>
              <li>
                May be modified, adjusted, or reset at our sole discretion.
              </li>
            </ul>
            <p className="mt-3">
              Any purchases of virtual currency are final and non-refundable, except where
              required by applicable law.
            </p>
          </section>

          {/* 4. Fair Play */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Fair Play</h2>
            <p className="mb-3">
              Fortuna Casino is committed to providing a fair and transparent gaming
              experience. Our games utilize a provably fair system based on cryptographic
              hashing (HMAC-SHA256) that allows players to independently verify the
              fairness of each game outcome. Details of our provably fair system are
              available on our{' '}
              <a
                href="/provably-fair"
                className="text-[var(--casino-accent)] hover:underline"
              >
                Provably Fair
              </a>{' '}
              page.
            </p>
            <p>
              By using the Service, you acknowledge that game outcomes are determined by
              cryptographic algorithms and random number generation, and that Fortuna
              Casino does not manipulate individual game results.
            </p>
          </section>

          {/* 5. Prohibited Activities */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              5. Prohibited Activities
            </h2>
            <p className="mb-3">
              You agree not to engage in any of the following prohibited activities:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                Using the Service for any unlawful purpose or in violation of any
                applicable local, state, national, or international law.
              </li>
              <li>
                Exploiting bugs, glitches, or vulnerabilities in the software to gain an
                unfair advantage.
              </li>
              <li>
                Using automated scripts, bots, or other software to interact with the
                Service.
              </li>
              <li>Colluding with other players to manipulate game outcomes.</li>
              <li>
                Engaging in fraudulent activity, including the use of stolen payment
                methods or identity fraud.
              </li>
              <li>
                Attempting to gain unauthorized access to other users&apos; accounts,
                computer systems, or networks connected to the Service.
              </li>
              <li>
                Harassing, abusing, or threatening other users through any communication
                channel provided by the Service.
              </li>
              <li>
                Reverse engineering, decompiling, or disassembling any portion of the
                Service.
              </li>
              <li>
                Creating multiple accounts to circumvent restrictions or exploit
                promotional offers.
              </li>
            </ul>
          </section>

          {/* 6. Account Suspension and Termination */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              6. Account Suspension and Termination
            </h2>
            <p className="mb-3">
              Fortuna Casino reserves the right to suspend, restrict, or terminate your
              account at any time, with or without notice, for any reason, including but
              not limited to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Violation of these Terms or any applicable policies.</li>
              <li>Suspected fraudulent, abusive, or illegal activity.</li>
              <li>At the request of law enforcement or other government agencies.</li>
              <li>
                Extended periods of inactivity, as defined by our internal policies.
              </li>
              <li>
                Unexpected technical or security issues requiring account action.
              </li>
            </ul>
            <p className="mt-3">
              Upon termination, your right to use the Service will immediately cease. Any
              virtual currency balances remaining in your account at the time of
              termination will be forfeited, as virtual currency holds no real-world value.
            </p>
          </section>

          {/* 7. Intellectual Property */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              7. Intellectual Property
            </h2>
            <p>
              All content, software, graphics, designs, logos, trademarks, and other
              intellectual property associated with the Service are owned by or licensed to
              Fortuna Casino and are protected by applicable intellectual property laws.
              You are granted a limited, non-exclusive, non-transferable, revocable license
              to access and use the Service for personal, non-commercial purposes. You may
              not copy, modify, distribute, sell, or lease any part of the Service without
              our prior written consent.
            </p>
          </section>

          {/* 8. Limitation of Liability */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              8. Limitation of Liability
            </h2>
            <p className="mb-3">
              To the maximum extent permitted by applicable law:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                The Service is provided on an &quot;AS IS&quot; and &quot;AS
                AVAILABLE&quot; basis without warranties of any kind, whether express or
                implied.
              </li>
              <li>
                Fortuna Casino shall not be liable for any indirect, incidental, special,
                consequential, or punitive damages arising out of or related to your use
                of or inability to use the Service.
              </li>
              <li>
                Fortuna Casino does not guarantee that the Service will be uninterrupted,
                error-free, or free of viruses or other harmful components.
              </li>
              <li>
                In no event shall Fortuna Casino&apos;s total liability exceed the amount
                paid by you, if any, to Fortuna Casino during the six (6) months
                preceding the claim.
              </li>
            </ul>
          </section>

          {/* 9. Indemnification */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              9. Indemnification
            </h2>
            <p>
              You agree to indemnify, defend, and hold harmless Fortuna Casino, its
              affiliates, officers, directors, employees, agents, and licensors from and
              against any and all claims, damages, losses, liabilities, costs, and expenses
              (including reasonable attorneys&apos; fees) arising from or related to your
              use of the Service, your violation of these Terms, or your violation of any
              rights of a third party.
            </p>
          </section>

          {/* 10. Modifications */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              10. Modifications to Terms
            </h2>
            <p>
              Fortuna Casino reserves the right to modify these Terms at any time. Changes
              will be effective immediately upon posting the revised Terms on the Service.
              Your continued use of the Service after any changes constitutes your
              acceptance of the revised Terms. We encourage you to review these Terms
              periodically for updates.
            </p>
          </section>

          {/* 11. Governing Law */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              11. Governing Law and Dispute Resolution
            </h2>
            <p className="mb-3">
              These Terms shall be governed by and construed in accordance with the laws of
              the jurisdiction in which Fortuna Casino operates, without regard to its
              conflict of law provisions.
            </p>
            <p>
              Any disputes arising out of or relating to these Terms or the Service shall
              be resolved through binding arbitration in accordance with the rules of the
              applicable arbitration association. You agree to waive any right to a jury
              trial or to participate in a class action.
            </p>
          </section>

          {/* 12. Responsible Gambling */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              12. Responsible Gambling
            </h2>
            <p>
              Fortuna Casino is committed to promoting responsible gambling. We provide
              tools including session timers, loss limits, deposit limits, and
              self-exclusion options. If you believe you have a gambling problem, please
              visit our{' '}
              <a
                href="/responsible-gambling"
                className="text-[var(--casino-accent)] hover:underline"
              >
                Responsible Gambling
              </a>{' '}
              page or contact a professional support organization. Gambling should be
              entertainment, not a source of income or a way to recover losses.
            </p>
          </section>

          {/* 13. Contact */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              13. Contact Information
            </h2>
            <p>
              If you have any questions or concerns regarding these Terms of Service,
              please contact us at{' '}
              <a
                href="mailto:support@fortunacasino.com"
                className="text-[var(--casino-accent)] hover:underline"
              >
                support@fortunacasino.com
              </a>
              .
            </p>
          </section>

          {/* Footer */}
          <div className="border-t border-[var(--casino-border)] pt-6 mt-10">
            <p className="text-xs text-[var(--casino-text-muted)]">
              &copy; 2026 Fortuna Casino. All rights reserved. By using our Service, you
              acknowledge that you have read, understood, and agree to be bound by these
              Terms of Service.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
