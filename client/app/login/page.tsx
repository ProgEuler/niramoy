"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconEye,
  IconEyeOff,
  IconLoader2,
  IconLock,
  IconMail,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { SiteNavbar } from "@/components/home/site-navbar";
import { SiteFooter } from "@/components/home/site-footer";
import { useAuth } from "@/lib/auth/use-auth";
import { useForgotPassword, useLogin } from "@/lib/auth/hooks";
import { homeRouteFor } from "@/lib/auth/guards";
import { ApiError } from "@/lib/api/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetNotice, setResetNotice] = useState<string | null>(null);

  const { isAuthed, hydrated, role, hospitalId, hospitalIsVerified } = useAuth();
  const login = useLogin();
  const forgot = useForgotPassword();

  // If already signed in, send them to their home immediately.
  useEffect(() => {
    if (!hydrated) return;
    if (isAuthed && role) {
      router.replace(
        homeRouteFor(role, {
          hasHospital: hospitalId != null,
          hospitalIsVerified,
        }),
      );
    }
  }, [hydrated, isAuthed, role, hospitalId, hospitalIsVerified, router]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResetNotice(null);
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    login.mutate(
      { email: email.trim(), password },
      {
        onSuccess: (tokens) => {
          // At login time we only have the token pair; hospital_is_verified
          // is fetched async via /me. For hospital_admins we route based on
          // hospital_id from the token; the /me query will then redirect if
          // needed via the useEffect above on next render.
          router.replace(
            homeRouteFor(tokens.role, {
              hasHospital: tokens.hospital_id != null,
              // We don't have is_verified at login time — fall back to
              // management. The pending-approval page handles the check.
              hospitalIsVerified: tokens.hospital_id != null ? undefined : false,
            }),
          );
        },
        onError: (err) => {
          if (err instanceof ApiError && err.status === 401) {
            setError("Incorrect email or password.");
          } else if (err instanceof ApiError) {
            setError(err.detail || "Sign in failed. Please try again.");
          } else {
            setError("Network error. Please try again.");
          }
        },
      },
    );
  }

  function handleForgot() {
    if (!email.trim()) {
      setError("Enter your email above first, then tap forgot password.");
      return;
    }
    setError(null);
    setResetNotice(null);
    forgot.mutate(
      { email: email.trim() },
      {
        onSuccess: () => {
          setResetNotice(
            "If an account exists for that email, a reset link has been sent.",
          );
        },
        onError: () => {
          setResetNotice(
            "If an account exists for that email, a reset link has been sent.",
          );
        },
      },
    );
  }

  const busy = login.isPending;

  return (
    <>
      <SiteNavbar />
      <main className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 flex flex-col items-center text-center">
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
                    Email
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
                      disabled={busy}
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
                      className="text-[11px] font-medium text-niramoy-teal hover:underline disabled:opacity-50"
                      onClick={handleForgot}
                      disabled={forgot.isPending}
                    >
                      {forgot.isPending ? "Sending…" : "Forgot password?"}
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
                      disabled={busy}
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
                {resetNotice && !error && (
                  <div
                    role="status"
                    className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-700 dark:text-emerald-400"
                  >
                    {resetNotice}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={busy}
                  className="h-9 w-full gap-1 bg-niramoy-teal text-white hover:bg-niramoy-teal/90"
                >
                  {busy ? (
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

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Is your hospital not listed?{" "}
            <Link
              href="/register"
              className="font-medium text-niramoy-teal hover:underline"
            >
              Register here →
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
