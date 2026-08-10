"use client";

import { useState } from "react";
import { IconLoader2, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CreateAdminUserPayload } from "@/lib/api/admin";

interface CreateAdminUserDialogProps {
  onCancel: () => void;
  onConfirm: (payload: CreateAdminUserPayload) => void;
  loading?: boolean;
  error?: string;
}

const EMPTY = { username: "", email: "", password: "" };

export function CreateAdminUserDialog({
  onCancel,
  onConfirm,
  loading,
  error,
}: CreateAdminUserDialogProps) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Partial<typeof EMPTY>>({});

  function update(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  }

  function validate(): boolean {
    const next: Partial<typeof EMPTY> = {};
    if (form.username.trim().length < 3)
      next.username = "At least 3 characters";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email))
      next.email = "Enter a valid email";
    if (form.password.length < 8)
      next.password = "At least 8 characters";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onConfirm({
      username: form.username.trim(),
      email: form.email.trim(),
      password: form.password,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md space-y-3 rounded-t-lg border bg-card p-5 shadow-xl sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-heading text-sm font-semibold text-foreground">
              Create system admin
            </h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              New account with full platform access.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
            aria-label="Close"
          >
            <IconX className="size-3.5" />
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[11px] text-destructive"
          >
            {error}
          </div>
        )}

        <div className="space-y-3">
          <Field label="Username" error={errors.username}>
            <Input
              className="h-9"
              placeholder="admin_username"
              value={form.username}
              onChange={(e) => update("username", e.target.value)}
              disabled={loading}
              autoComplete="off"
            />
          </Field>
          <Field label="Email" error={errors.email}>
            <Input
              type="email"
              className="h-9"
              placeholder="admin@niramoy.bd"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              disabled={loading}
              autoComplete="off"
            />
          </Field>
          <Field label="Password" error={errors.password}>
            <Input
              type="password"
              className="h-9"
              placeholder="At least 8 characters"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              disabled={loading}
              autoComplete="new-password"
            />
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={loading}
            onClick={handleSubmit}
            className="h-8 bg-niramoy-teal text-white hover:bg-niramoy-teal/90"
          >
            {loading && <IconLoader2 className="size-3.5 animate-spin" />}
            Create admin
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
