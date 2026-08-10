"use client";

/**
 * Step 1 of hospital-admin registration.
 *
 * User enters username + email + password. On success they are immediately
 * signed in (token pair returned) and redirected to /register-hospital to
 * complete their hospital profile.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconEye,
  IconEyeOff,
  IconLoader2,
  IconLock,
  IconMail,
  IconUser,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { SiteNavbar } from "@/components/home/site-navbar";
import { SiteFooter } from "@/components/home/site-footer";
import { useRegisterUser } from "@/lib/auth/hooks";
import { useAuth } from "@/lib/auth/use-auth";
import { ApiError } from "@/lib/api/client";

interface FormState {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const INITIAL: FormState = {
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<FormErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);

  const { isAuthed, hydrated } = useAuth();
  const registerUser = useRegisterUser();

  // Already logged in — send to the right place.
  useEffect(() => {
    if (!hydrated) return;
    if (isAuthed) {
      router.replace("/register-hospital");
    }
  }, [hydrated, isAuthed, router]);

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate(): boolean {
    const next: FormErrors = {};
    if (!form.username.trim() || form.username.trim().length < 3) {
      next.username = "Username must be at least 3 characters";
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
      next.email = "Enter a valid email address";
    }
    if (form.password.length < 8) {
      next.password = "Password must be at least 8 characters";
    }
    if (form.password !== form.confirmPassword) {
      next.confirmPassword = "Passwords do not match";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBanner(null);
    if (!validate()) return;

    registerUser.mutate(
      {
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
      },
      {
        onSuccess: () => {
          // Token written to store by the hook; redirect to hospital form.
          router.replace("/register-hospital");
        },
        onError: (err) => {
          setErrors({});
          if (err instanceof ApiError) {
            if (err.fieldErrors.length > 0) {
              const next: FormErrors = {};
              for (const fe of err.fieldErrors) {
                if (fe.field === "email" || fe.field === "username") {
                  next[fe.field] = fe.message;
                }
              }
              setErrors(next);
              return;
            }
            if (err.field === "email" || err.field === "username") {
              setErrors({ [err.field]: err.detail });
              return;
            }
            setBanner(err.detail || "Registration failed. Please try again.");
            return;
          }
          setBanner("Network error. Please try again.");
        },
      },
    );
  }

  const busy = registerUser.isPending;

  return (
    <>
      <SiteNavbar />
      <main className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 flex flex-col items-center text-center">
            <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Create your account
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Step 1 of 2 — account setup. Next you'll add your hospital details.
            </p>
          </div>

          {/* Step indicator */}
          <div className="mb-5 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-niramoy-teal text-[11px] font-bold text-white">
              1
            </div>
            <span className="text-xs font-medium text-foreground">Account</span>
            <div className="mx-1 h-px flex-1 bg-border" />
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
              2
            </div>
            <span className="text-xs text-muted-foreground">Hospital profile</span>
          </div>

          <Card size="sm">
            <CardContent className="p-5">
              {banner && (
                <div
                  role="alert"
                  className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[11px] text-destructive"
                >
                  {banner}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-3" noValidate>
                {/* Username */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="username"
                    className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    Username
                  </label>
                  <div className="relative">
                    <IconUser className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="username"
                      type="text"
                      autoComplete="username"
                      required
                      placeholder="yourname"
                      className="h-9 pl-7"
                      value={form.username}
                      onChange={(e) => update("username", e.target.value)}
                      aria-invalid={Boolean(errors.username)}
                      disabled={busy}
                    />
                  </div>
                  {errors.username && (
                    <p className="text-[11px] text-destructive">{errors.username}</p>
                  )}
                </div>

                {/* Email */}
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
                      placeholder="you@hospital.bd"
                      className="h-9 pl-7"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      aria-invalid={Boolean(errors.email)}
                      disabled={busy}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-[11px] text-destructive">{errors.email}</p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="password"
                    className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <IconLock className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPw ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      placeholder="At least 8 characters"
                      className="h-9 pl-7 pr-9"
                      value={form.password}
                      onChange={(e) => update("password", e.target.value)}
                      aria-invalid={Boolean(errors.password)}
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
                  {errors.password && (
                    <p className="text-[11px] text-destructive">{errors.password}</p>
                  )}
                </div>

                {/* Confirm password */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="confirmPassword"
                    className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    Confirm password
                  </label>
                  <div className="relative">
                    <IconLock className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showPw ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      placeholder="Repeat your password"
                      className="h-9 pl-7"
                      value={form.confirmPassword}
                      onChange={(e) => update("confirmPassword", e.target.value)}
                      aria-invalid={Boolean(errors.confirmPassword)}
                      disabled={busy}
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-[11px] text-destructive">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={busy}
                  className="h-9 w-full gap-1 bg-niramoy-teal text-white hover:bg-niramoy-teal/90"
                >
                  {busy ? (
                    <>
                      <IconLoader2 className="size-4 animate-spin" />
                      Creating account…
                    </>
                  ) : (
                    "Create account & continue"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-niramoy-teal hover:underline"
            >
              Sign in →
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
