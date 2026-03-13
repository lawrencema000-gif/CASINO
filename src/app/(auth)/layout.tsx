export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] px-4">
      {/* Animated background pattern */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-[#FFD700]/5 blur-[100px] animate-pulse" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-[#8B5CF6]/5 blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-[#00FF88]/3 blur-[80px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card container */}
        <div className="rounded-2xl border border-[#1a1a25] bg-[#1a1a25]/80 p-8 shadow-2xl shadow-black/50 backdrop-blur-sm">
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
