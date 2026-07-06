"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/context/ThemeContext";
import { TargetsProvider } from "@/context/TargetsContext";
import { FiltersProvider } from "@/context/FiltersContext";

/** Client-side app shell: query cache, theme, and target selection state. */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TargetsProvider>
          <FiltersProvider>{children}</FiltersProvider>
        </TargetsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
