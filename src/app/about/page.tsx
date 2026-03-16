import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About | Fortuna Casino',
  description: 'Learn about Fortuna Casino - a provably fair, play-money casino experience.',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[var(--casino-bg)] py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#c9a227] via-[#e6c84a] to-[#c9a227] mb-8 text-center">
          About Fortuna Casino
        </h1>

        <div className="space-y-8">
          <section className="bg-[var(--casino-card)] rounded-2xl p-6 border border-[var(--casino-border)]">
            <h2 className="text-xl font-bold text-white mb-3">What is Fortuna Casino?</h2>
            <p className="text-[var(--casino-text-muted)] leading-relaxed">
              Fortuna Casino is a provably fair, demo casino built for entertainment purposes only.
              All gameplay uses play money (virtual credits) with absolutely no real-money wagering.
              Our goal is to deliver a premium casino experience where players can enjoy classic
              and modern games without any financial risk.
            </p>
          </section>

          <section className="bg-[var(--casino-card)] rounded-2xl p-6 border border-[var(--casino-border)]">
            <h2 className="text-xl font-bold text-white mb-3">Provably Fair</h2>
            <p className="text-[var(--casino-text-muted)] leading-relaxed">
              Every game outcome on Fortuna Casino is verifiably random and tamper-proof.
              Our provably fair system uses cryptographic hashing so you can independently
              verify that no result was manipulated after your bet was placed.
            </p>
          </section>

          <section className="bg-[var(--casino-card)] rounded-2xl p-6 border border-[var(--casino-border)]">
            <h2 className="text-xl font-bold text-white mb-3">Technology Stack</h2>
            <p className="text-[var(--casino-text-muted)] leading-relaxed">
              Fortuna Casino is built with modern web technologies including Next.js, React,
              TypeScript, Tailwind CSS, and Supabase for authentication and real-time data.
              The platform is deployed on Vercel for fast, globally distributed performance.
            </p>
          </section>

          <section className="bg-[var(--casino-card)] rounded-2xl p-6 border border-[var(--casino-border)]">
            <h2 className="text-xl font-bold text-white mb-3">Play Money Only</h2>
            <p className="text-[var(--casino-text-muted)] leading-relaxed">
              Fortuna Casino does not involve real money, real cryptocurrency, or any form of
              actual gambling. All credits are virtual and have no monetary value. This platform
              is designed purely for entertainment and demonstration purposes.
            </p>
          </section>

          <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-2xl p-6 text-center">
            <p className="text-yellow-300 font-bold text-lg mb-1">18+ Only</p>
            <p className="text-yellow-200/70 text-sm">
              This platform is intended for users aged 18 and older. Even though no real money
              is involved, we encourage responsible gaming habits.
            </p>
          </div>
        </div>

        <div className="text-center mt-10">
          <Link
            href="/"
            className="inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--casino-accent)] to-[#e6c84a] text-black font-bold hover:opacity-90 transition-opacity"
          >
            Back to Lobby
          </Link>
        </div>
      </div>
    </div>
  )
}
