"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NextTopLoader from "nextjs-toploader";

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
      <NextTopLoader
        color="#0e9e8e"
        height={3}
        showSpinner={false}
        speed={200}
        crawlSpeed={200}
        easing="ease"
        shadow="0 0 10px #0e9e8e, 0 0 5px #0e9e8e"
        zIndex={1600}
      />
    </QueryClientProvider>
  );
}
