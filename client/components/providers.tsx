"use client";

/**
 * Global providers — TanStack Query's QueryClient lives here. Mounted once
 * at the root of the app.
 */

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AppProgressBar as ProgressBar } from 'next-nprogress-bar';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount, error) => {
              // Don't retry auth errors — they're deterministic.
              const status =
                typeof error === "object" && error && "status" in error
                  ? (error as { status?: number }).status
                  : undefined;
              if (status === 401 || status === 403 || status === 404) return false;
              return failureCount < 1;
            },
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ProgressBar
        height="4px"
        color="#0066FF" // adjust color as needed to match the theme
        options={{ showSpinner: false }}
        shallowRouting
      />
    </QueryClientProvider>
  );
}