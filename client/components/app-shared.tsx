import type { ReactNode } from "react";
import { IconLayoutGrid, IconChartBar, IconBriefcase, IconUsers, IconPlug, IconKey, IconSettings, IconCreditCard, IconHelpCircle, IconBook } from "@tabler/icons-react";

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

export const navGroups: SidebarNavGroup[] = [
	{
		label: "Product",
		items: [
			{
				title: "Dashboard",
				path: "#/dashboard",
				icon: (
					<IconLayoutGrid
					/>
				),
				isActive: true,
			},
			{
				title: "Analytics",
				path: "#/analytics",
				icon: (
					<IconChartBar
					/>
				),
			},
			{
				title: "Projects",
				path: "#/projects",
				icon: (
					<IconBriefcase
					/>
				),
			},
		],
	},
	{
		label: "Workspace",
		items: [
			{
				title: "Team",
				path: "#/team",
				icon: (
					<IconUsers
					/>
				),
			},
			{
				title: "Integrations",
				path: "#/integrations",
				icon: (
					<IconPlug
					/>
				),
			},
			{
				title: "API Keys",
				path: "#/api-keys",
				icon: (
					<IconKey
					/>
				),
			},
		],
	},
	{
		label: "Administration",
		items: [
			{
				title: "Settings",
				path: "#/settings",
				icon: (
					<IconSettings
					/>
				),
			},
			{
				title: "Billing",
				path: "#/billing",
				icon: (
					<IconCreditCard
					/>
				),
			},
		],
	},
];

export const footerNavLinks: SidebarNavItem[] = [
	{
		title: "Help Center",
		path: "#/help",
		icon: (
			<IconHelpCircle
			/>
		),
	},
	{
		title: "Documentation",
		path: "#/documentation",
		icon: (
			<IconBook
			/>
		),
	},
];

export const navLinks: SidebarNavItem[] = [
	...navGroups.flatMap((group) =>
		group.items.flatMap((item) =>
			item.subItems?.length ? [item, ...item.subItems] : [item]
		)
	),
	...footerNavLinks,
];
