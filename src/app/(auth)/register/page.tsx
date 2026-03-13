"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validations
    if (username.length < 3 || username.length > 20) {
      setError("Username must be between 3 and 20 characters.");
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError("Username can only contain letters, numbers, and underscores.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!agreeTerms) {
      setError("You must agree to the Terms of Service.");
      return;
    }

    setLoading(true);

    const supabase = createClient();

    // Check if username is taken
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .single();

    if (existingUser) {
      setError("Username is already taken.");
      setLoading(false);
      return;
    }

    // Create auth account
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // Create profile with 10,000 starting credits
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        username,
        balance: 10000,
        total_wagered: 0,
        total_won: 0,
        level: 1,
        exp: 0,
        vip_tier: "bronze",
      });

      if (profileError) {
        setError(
          "Account created but profile setup failed. Please contact support."
        );
        setLoading(false);
        return;
      }

      // Record the signup bonus transaction
      await supabase.from("transactions").insert({
        player_id: data.user.id,
        type: "bonus",
        amount: 10000,
        balance_after: 10000,
        description: "Welcome bonus - 10,000 free credits",
      });
    }

    router.push("/");
    router.refresh();
  };

  return (
    <>
      <h2 className="mb-6 text-center text-2xl font-semibold text-white">
        Create Account
      </h2>

      <div className="mb-5 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-center text-sm text-amber-400">
        Get <span className="font-bold">10,000 free credits</span> when you
        sign up!
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username */}
        <div>
          <label
            htmlFor="username"
            className="mb-1.5 block text-sm font-medium text-zinc-400"
          >
            Username
          </label>
          <input
            id="username"
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Choose a username"
            minLength={3}
            maxLength={20}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white placeholder-zinc-500 outline-none transition-colors focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/25"
          />
        </div>

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
            placeholder="Min. 8 characters"
            minLength={8}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white placeholder-zinc-500 outline-none transition-colors focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/25"
          />
        </div>

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-1.5 block text-sm font-medium text-zinc-400"
          >
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white placeholder-zinc-500 outline-none transition-colors focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/25"
          />
        </div>

        {/* Terms */}
        <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-400">
          <input
            type="checkbox"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500/25"
          />
          <span>
            I agree to the{" "}
            <span className="text-amber-400 hover:text-amber-300 cursor-pointer">
              Terms of Service
            </span>{" "}
            and{" "}
            <span className="text-amber-400 hover:text-amber-300 cursor-pointer">
              Privacy Policy
            </span>
          </span>
        </label>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !agreeTerms}
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
              Creating account...
            </span>
          ) : (
            "Create Account"
          )}
        </button>
      </form>

      {/* Login link */}
      <p className="mt-6 text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-amber-400 hover:text-amber-300 transition-colors"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
