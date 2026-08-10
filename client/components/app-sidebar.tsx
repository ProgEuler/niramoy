"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { LogoIcon } from "@/components/logo";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NavGroup } from "@/components/nav-group";
import { getNavGroupsForRole } from "@/components/app-shared";
import { useAuth } from "@/lib/auth/use-auth";
import type { UserRole } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { IconLogout } from "@tabler/icons-react";
import Link from "next/link";

export interface AppSidebarProps {
	role: UserRole | null;
}

export function AppSidebar({ role }: AppSidebarProps) {
	const groups = getNavGroupsForRole(role);
	const { signOut } = useAuth();
	const router = useRouter();

	function handleLogout() {
		signOut();
		router.replace("/login");
	}

	return (
		<Sidebar
			className={cn(
				"*:data-[slot=sidebar-inner]:bg-background",
				"*:data-[slot=sidebar-inner]:dark:bg-[radial-gradient(60%_18%_at_10%_0%,--theme(--color-foreground/.08),transparent)]",
				"**:data-[slot=sidebar-menu-button]:[&>span]:text-foreground/75"
			)}
			collapsible="icon"
			variant="sidebar"
		>
			<SidebarHeader className="h-14 justify-center border-b px-2">
				<SidebarMenuButton asChild>
					<Link href="/">
						{/* <LogoIcon /> */}
						<span className="font-medium text-foreground!">Niramoy</span>
					</Link>
				</SidebarMenuButton>
			</SidebarHeader>
			<SidebarContent>
				{groups.map((group, index) => (
					<NavGroup key={`sidebar-group-${index}`} {...group} />
				))}
			</SidebarContent>
			<SidebarFooter className="gap-0 p-0">
				<SidebarMenu className="border-t p-2">
					<SidebarMenuItem>
						<Button
							variant="ghost"
							size="sm"
							className="w-full justify-start gap-2 text-muted-foreground"
							onClick={handleLogout}
						>
							<IconLogout className="size-3.5" />
							Log out
						</Button>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
