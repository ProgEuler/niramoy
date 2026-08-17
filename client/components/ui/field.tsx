"use client";

/**
 * Lightweight `<Field>` primitives — replaces a hand-rolled `<Field>` helper
 * that lived inside `app/admin/hospitals/page.tsx`. Pure functional
 * components (no Radix dep needed).
 *
 * Use as:
 *   <Field>
 *     <FieldLabel required>Hospital name</FieldLabel>
 *     <FieldContent>
 *       <Input ... />
 *       <FieldDescription>Hint text</FieldDescription>
 *       <FieldError>Name is required</FieldError>
 *     </FieldContent>
 *   </Field>
 */

import * as React from "react";
import { cn } from "@/lib/utils";

interface FieldProps extends React.ComponentProps<"div"> {
  orientation?: "vertical" | "horizontal";
}

function Field({
  className,
  orientation = "vertical",
  ...props
}: FieldProps) {
  return (
    <div
      data-slot="field"
      data-orientation={orientation}
      className={cn(
        "flex gap-2",
        orientation === "vertical" ? "flex-col" : "flex-row items-center",
        className,
      )}
      {...props}
    />
  );
}

function FieldLabel({
  className,
  children,
  ...props
}: React.ComponentProps<"label"> & { required?: boolean }) {
  return (
    <label
      data-slot="field-label"
      className={cn(
        "text-[10px] font-medium uppercase tracking-wider text-muted-foreground",
        className,
      )}
      {...props}
    >
      {children}
      {props.required && (
        <span className="ml-0.5 text-destructive" aria-hidden>
          *
        </span>
      )}
    </label>
  );
}

function FieldContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-content"
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    />
  );
}

function FieldDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-description"
      className={cn("text-[11px] text-muted-foreground", className)}
      {...props}
    />
  );
}

function FieldError({
  className,
  children,
  ...props
}: React.ComponentProps<"p">) {
  if (!children) return null;
  return (
    <p
      data-slot="field-error"
      className={cn("text-[11px] text-destructive", className)}
      {...props}
    >
      {children}
    </p>
  );
}

function FieldSeparator({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-separator"
      className={cn("-mx-6 h-px bg-border", className)}
      {...props}
    />
  );
}

export {
  Field,
  FieldLabel,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldSeparator,
};
