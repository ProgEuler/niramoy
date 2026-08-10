import { cn } from "@/lib/utils";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { AppShellContext } from "@/components/app-shell-context";
import { getNavGroupsForRole } from "@/components/app-shared";
import type { UserRole } from "@/lib/api/auth";

export interface AppShellProps {
	children: React.ReactNode;
	/**
	 * Role whose nav groups should be rendered in the sidebar.
	 * Falls back to the unauthenticated/default config when omitted.
	 */
	role?: UserRole | null;
}

/**
 * AppShell — dashboard chrome used by every authenticated area of the app.
 *
 * Renders a role-aware sidebar, the sticky header, and the page content.
 * The underlying `SidebarProvider` makes the sidebar collapsible on
 * desktop (`⌘B`) and collapses to a sheet on mobile, so consumers don't
 * need their own mobile menus.
 */
export function AppShell({ children, role }: AppShellProps) {
	const resolvedRole = role ?? null;
	const navGroups = getNavGroupsForRole(resolvedRole);

	return (
		<AppShellContext.Provider value={{ role: resolvedRole, navGroups }}>
			<SidebarProvider className={cn("[--app-wrapper-max-width:80rem]")}>
				<AppSidebar role={resolvedRole} />
				<SidebarInset>
					<AppHeader />
					<div
						className={cn(
							"flex flex-1 flex-col p-4 md:p-0",
							// "mx-auto w-full max-w-(--app-wrapper-max-width)"
						)}
					>
						{children}
					</div>
				</SidebarInset>
			</SidebarProvider>
		</AppShellContext.Provider>
	);
}