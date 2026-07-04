"use client";

/**
 * PAGE 7 — Login (Hospital Admin + System Admin).
 *
 * UI shell with role-detection. Test fixtures:
 *   • sysadmin@niramoy.bd  → System Admin → /admin
 *   • admin@<anything>     → System Admin (heuristic)
 *   • anything else        → Hospital Admin   → /admin/hospital
 *
 * The form also has a register link + forgot-password flow. There is no real
 * backend; the role detection stands in for what would be a JWT role claim.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconEye,
  IconEyeOff,
  IconLoader2,
  IconLock,
  IconMail,
  IconShieldLock,
  IconStethoscope,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { SiteNavbar } from "@/components/home/site-navbar";
import { SiteFooter } from "@/components/home/site-footer";

function detectRole(email: string): "system" | "hospital" {
  const lower = email.toLowerCase();
  if (lower.startsWith("sysadmin") || lower.includes("system") || lower.startsWith("admin"))
    return "system";
  return "hospital";
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Please enter both your email and password.");
      return;
    }

    setLoading(true);
    // Mimic an auth round-trip so the user feels progress; replace with a
    // real API call (POST /api/auth/login) when the backend lands.
    setTimeout(() => {
      const role = detectRole(email);
      router.push(role === "system" ? "/admin" : "/admin/hospital");
    }, 600);
  }

  return (
    <>
      <SiteNavbar />
      <main className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-6 flex flex-col items-center text-center">
            <span className="flex size-12 items-center justify-center rounded-xl bg-niramoy-teal text-white shadow-md">
              <IconStethoscope className="size-6" />
            </span>
            <p className="mt-3 inline-flex items-center gap-1 rounded-full border bg-card px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/70">
              <IconShieldLock className="size-3" />
              Staff Portal
            </p>
            <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Sign in to Niramoy
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Hospital and system administrators only.
            </p>
          </div>

          <Card size="sm">
            <CardContent className="p-5">
              <form onSubmit={handleSubmit} className="space-y-3" noValidate>
                <div className="space-y-1.5">
                  <label
                    htmlFor="email"
                    className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    Username or email
                  </label>
                  <div className="relative">
                    <IconMail className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="you@niramoy.bd"
                      className="h-9 pl-7"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <label
                      htmlFor="password"
                      className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      className="text-[11px] font-medium text-niramoy-teal hover:underline"
                      onClick={() =>
                        setError(
                          "Password reset link sent to your email (demo only).",
                        )
                      }
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <IconLock className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPw ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      placeholder="••••••••"
                      className="h-9 pl-7 pr-9"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      aria-label={showPw ? "Hide password" : "Show password"}
                      className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      {showPw ? (
                        <IconEyeOff className="size-3.5" />
                      ) : (
                        <IconEye className="size-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-400"
                  >
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-9 w-full gap-1 bg-niramoy-teal text-white hover:bg-niramoy-teal/90"
                >
                  {loading ? (
                    <>
                      <IconLoader2 className="size-4 animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Register hint */}
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Is your hospital not listed?{" "}
            <Link
              href="/register-hospital"
              className="font-medium text-niramoy-teal hover:underline"
            >
              Register here →
            </Link>
          </p>

          {/* Demo helper */}
          <div className="mt-4 rounded-lg border border-dashed bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
            <strong className="font-semibold text-foreground">Demo:</strong>{" "}
            use <code className="rounded bg-background px-1">sysadmin@niramoy.bd</code>{" "}
            to sign in as a system admin, or any other email to sign in as a
            hospital admin. Both accept any non-empty password.
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
