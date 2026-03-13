"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  };

  return (
    <>
      <h2 className="mb-6 text-center text-2xl font-semibold text-white">
        Welcome Back
      </h2>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-zinc-400"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white placeholder-zinc-500 outline-none transition-colors focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/25"
          />
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium text-zinc-400"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white placeholder-zinc-500 outline-none transition-colors focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/25"
          />
        </div>

        {/* Remember me */}
        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-400">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500/25"
            />
            Remember me
          </label>
          <button
            type="button"
            className="text-sm text-amber-400 hover:text-amber-300 transition-colors"
          >
            Forgot password?
          </button>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-2.5 font-semibold text-black transition-all hover:from-amber-400 hover:to-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Signing in...
            </span>
          ) : (
            "Sign In"
          )}
        </button>
      </form>

      {/* Register link */}
      <p className="mt-6 text-center text-sm text-zinc-500">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-amber-400 hover:text-amber-300 transition-colors"
        >
          Create one
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-zinc-400">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
