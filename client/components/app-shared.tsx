import type { ReactNode } from "react";
import type { Route } from "next";
import {
	IconActivity,
	IconBuildingHospital,
	IconChartBar,
	IconClipboardCheck,
	IconCoin,
	IconDashboard,
	IconDatabase,
	IconHistory,
	IconLayoutGrid,
	IconShieldCheck,
	IconStethoscope,
	IconUsers,
} from "@tabler/icons-react";

import type { UserRole } from "@/lib/api/auth";

export type SidebarNavItem = {
	title: string;
	path?: Route;
	icon?: ReactNode;
	isActive?: boolean;
	subItems?: SidebarNavItem[];
};

export type SidebarNavGroup = {
	label?: string;
	items: SidebarNavItem[];
};

/**
 * Role-keyed nav configs.
 *
 * Each role gets its own set of sidebar groups. `default` is the
 * unauthenticated / patient browser landing in `/app` — it just mirrors
 * the Find Care experience so the AppShell can be reused everywhere.
 */
export const navConfigByRole: Record<UserRole | "default", SidebarNavGroup[]> = {
	default: [
		{
			label: "Browse",
			items: [
				{
					title: "Find Care",
					path: "/app/find-care",
					icon: <IconStethoscope />,
				},
				{
					title: "Hospitals",
					path: "/hospitals",
					icon: <IconBuildingHospital />,
				},
				{
					title: "Ambulances",
					path: "/ambulances",
					icon: <IconActivity />,
				},
			],
		},
	],
	system_admin: [
		{
			label: "Overview",
			items: [
				{
					title: "Overview",
					path: "/admin",
					icon: <IconLayoutGrid />,
				},
				{
					title: "Hospitals",
					path: "/admin/hospitals",
					icon: <IconBuildingHospital />,
				},
				{
					title: "Pending registrations",
					path: "/admin/pending",
					icon: <IconShieldCheck />,
				},
				{
					title: "Moderation queue",
					path: "/admin/updates",
					icon: <IconClipboardCheck />,
				},
			],
		},
		{
			label: "Platform",
			items: [
				{
					title: "Users",
					path: "/admin/users",
					icon: <IconUsers />,
				},
				{
					title: "Reports",
					path: "/admin/reports",
					icon: <IconChartBar />,
				},
				{
					title: "Reference data",
					path: "/admin/reference",
					icon: <IconDatabase />,
				},
			],
		},
	],
	hospital_admin: [
		{
			label: "Hospital",
			items: [
				{
					title: "Dashboard",
					path: "/management",
					icon: <IconDashboard />,
				},
				{
					title: "Update bed counts",
					path: "/management/bed-counts",
					icon: <IconActivity />,
				},
				{
					title: "Update pricing",
					path: "/management/pricing",
					icon: <IconCoin />,
				},
				{
					title: "Update profile",
					path: "/management/profile",
					icon: <IconBuildingHospital />,
				},
			],
		},
		{
			label: "Activity",
			items: [
				{
					title: "Update history",
					path: "/management/history",
					icon: <IconHistory />,
				},
			],
		},
	],
	patient: [
		{
			label: "Browse",
			items: [
				{
					title: "Find Care",
					path: "/app/find-care",
					icon: <IconStethoscope />,
				},
				{
					title: "Hospitals",
					path: "/hospitals",
					icon: <IconBuildingHospital />,
				},
				{
					title: "Ambulances",
					path: "/ambulances",
					icon: <IconActivity />,
				},
			],
		},
	],
};

export function getNavGroupsForRole(role: UserRole | null | undefined): SidebarNavGroup[] {
	const key = (role ?? "default") as UserRole | "default";
	return navConfigByRole[key] ?? navConfigByRole.default;
}
