import type { ReactNode } from "react";
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
	path?: string;
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
					title: "Platform overview",
					path: "/admin",
					icon: <IconLayoutGrid />,
				},
				{
					title: "Pending approval",
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
			label: "Network",
			items: [
				{
					title: "Hospitals",
					path: "/admin/hospitals",
					icon: <IconBuildingHospital />,
				},
				{
					title: "Reports",
					path: "/admin/reports",
					icon: <IconChartBar />,
				},
				{
					title: "Reviews",
					path: "/admin/reviews",
					icon: <IconDatabase />,
				},
			],
		},
		{
			label: "Administration",
			items: [
				{
					title: "Users",
					path: "/admin/users",
					icon: <IconUsers />,
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
				{
					title: "Public preview",
					path: "/management/preview",
					icon: <IconStethoscope />,
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
