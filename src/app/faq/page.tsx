'use client'

import Link from 'next/link'
import { useState } from 'react'

interface FAQItem {
  question: string
  answer: string
}

const faqs: FAQItem[] = [
  {
    question: 'What is Fortuna Casino?',
    answer:
      'Fortuna Casino is a provably fair, play-money casino platform built for entertainment. It offers a premium casino experience with classic and modern games, all using virtual credits instead of real money.',
  },
  {
    question: 'Is this real money gambling?',
    answer:
      'No. Fortuna Casino uses play money (virtual credits) only. There is no real-money wagering, no deposits, and no withdrawals. All credits are free and have zero monetary value.',
  },
  {
    question: 'How does provably fair work?',
    answer:
      'Our provably fair system uses cryptographic hashing to generate game outcomes. Before each round, a server seed and client seed are combined and hashed. After the round, you can verify the seeds yourself to confirm the result was not tampered with. This ensures every outcome is transparent and verifiable.',
  },
  {
    question: 'How do I get more credits?',
    answer:
      'You receive free credits when you sign up. If you run out, you can claim additional credits from your wallet page. Since all credits are virtual and free, there is no limit to how many times you can top up.',
  },
  {
    question: 'What games are available?',
    answer:
      'Fortuna Casino features a variety of games including slots, blackjack, roulette, poker, crash, dice, mines, plinko, and more. New games are added regularly to keep the experience fresh and exciting.',
  },
  {
    question: 'Do I need an account to play?',
    answer:
      'Yes, you need to create a free account to play. This allows us to track your credits, save your game history, and provide a personalized experience. Sign-up is quick and only requires an email address.',
  },
  {
    question: 'Is my data safe?',
    answer:
      'We take data security seriously. Your account information is protected with industry-standard encryption, and we never share your personal data with third parties. Authentication is handled through Supabase with secure session management.',
  },
]

function AccordionItem({ item }: { item: FAQItem }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="bg-[var(--casino-card)] rounded-2xl border border-[var(--casino-border)] overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 text-left cursor-pointer hover:bg-white/5 transition-colors"
      >
        <span className="text-white font-semibold pr-4">{item.question}</span>
        <span
          className={`text-[var(--casino-accent)] text-2xl font-light shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-45' : ''
          }`}
        >
          +
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <p className="px-5 pb-5 text-[var(--casino-text-muted)] leading-relaxed">
          {item.answer}
        </p>
      </div>
    </div>
  )
}

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-[var(--casino-bg)] py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#c9a227] via-[#e6c84a] to-[#c9a227] mb-3 text-center">
          Frequently Asked Questions
        </h1>
        <p className="text-[var(--casino-text-muted)] text-center mb-10">
          Everything you need to know about Fortuna Casino.
        </p>

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} item={faq} />
          ))}
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
