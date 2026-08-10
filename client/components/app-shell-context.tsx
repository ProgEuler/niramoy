"use client";

import { createContext, useContext } from "react";
import type { SidebarNavGroup } from "@/components/app-shared";

/**
 * Shared context used by the AppShell chrome (sidebar + breadcrumbs) so
 * children — like the breadcrumbs — can read the currently-rendered nav
 * groups to auto-highlight the active page.
 */
export const AppShellContext = createContext<{
	role: string | null;
	navGroups: SidebarNavGroup[];
}>({
	role: null,
	navGroups: [],
});

export function useAppShell() {
	return useContext(AppShellContext);
}

export function useNavGroups() {
	return useContext(AppShellContext).navGroups;
}

export function useAppShellRole() {
	return useContext(AppShellContext).role;
}