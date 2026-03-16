import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--casino-bg)] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#c9a227] via-[#e6c84a] to-[#c9a227] mb-4">404</div>
        <h2 className="text-2xl font-bold text-white mb-2">Page Not Found</h2>
        <p className="text-[var(--casino-text-muted)] mb-6">
          This table doesn&apos;t exist. Head back to the lobby.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--casino-accent)] to-[#e6c84a] text-black font-bold hover:opacity-90 transition-opacity"
        >
          Back to Lobby
        </Link>
      </div>
    </div>
  )
}
