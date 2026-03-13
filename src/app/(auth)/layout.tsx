export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 px-4">
      {/* Ambient glow effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-amber-500/5 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-purple-500/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Casino branding */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white">
            <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
              CASINO
            </span>
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Provably fair gaming platform
          </p>
        </div>

        {/* Card container */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 shadow-2xl shadow-black/50 backdrop-blur-sm">
          {children}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-zinc-600">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
