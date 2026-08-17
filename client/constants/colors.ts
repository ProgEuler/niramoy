/**
 * Theme color tokens consumed by `themeQuartz.withParams({...})` in
 * `client/components/ag-grid/ag-table.tsx`.
 *
 * Values mirror the `--*` CSS variables in `client/app/globals.css :root`
 * so the ag-grid table matches the rest of the app without per-cell CSS
 * overrides. Keep in sync when retheming — these are not auto-derived.
 */

export const colors = {
  background: "oklch(1 0 0)",
  foreground: "oklch(0.148 0.004 228.8)",
  card: "oklch(1 0 0)",
  cardForeground: "oklch(0.148 0.004 228.8)",
  border: "oklch(0.925 0.005 214.3)",
  input: "oklch(0.925 0.005 214.3)",
  ring: "oklch(0.723 0.014 214.4)",
  muted: "oklch(0.963 0.002 197.1)",
  mutedForeground: "oklch(0.56 0.021 213.5)",
  primary: "oklch(0.508 0.118 165.612)",
  primaryForeground: "oklch(0.979 0.021 166.113)",
  secondary: "oklch(0.967 0.001 286.375)",
  destructive: "oklch(0.577 0.245 27.325)",
  accent: "oklch(0.963 0.002 197.1)",
  niramoyTeal: "#0E9E8E",
  headerText: "oklch(0.56 0.021 213.5)",
  headerBackground: "oklch(0.963 0.002 197.1)",
  oddRowBackground: "oklch(1 0 0)",
  headerColumnResizeHandle: "oklch(0.723 0.014 214.4)",
} as const;

export type ColorToken = keyof typeof colors;