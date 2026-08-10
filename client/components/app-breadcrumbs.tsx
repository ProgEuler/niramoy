"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { useNavGroups } from "@/components/app-shell-context";

/** Current page segment shown in the header — pass a nav item or `{ title, icon? }`. */
export type AppBreadcrumbPage = {
	title: string;
	icon?: ReactNode;
};

function findActiveTitle(
	pathname: string | null,
	items: { title: string; path?: string; subItems?: { title: string; path?: string }[] }[],
): string | undefined {
	if (!pathname) return undefined;
	for (const item of items) {
		if (item.path && pathname.startsWith(item.path)) return item.title;
		if (item.subItems) {
			for (const sub of item.subItems) {
				if (sub.path && pathname.startsWith(sub.path)) return sub.title;
			}
		}
	}
	return undefined;
}

export function AppBreadcrumbs({ page }: { page?: AppBreadcrumbPage | null }) {
	const pathname = usePathname();
	const groups = useNavGroups();

	if (page?.title) {
		return (
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbPage className="flex items-center gap-2 [&>svg]:size-3.5">
							{page.icon}
							{page.title}
						</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
		);
	}

	const allItems = groups.flatMap((g) => g.items);
	const title = findActiveTitle(pathname, allItems);

	if (!title) return null;

	return (
		<Breadcrumb>
			<BreadcrumbList>
				<BreadcrumbItem>
					<BreadcrumbPage className="flex items-center gap-2 [&>svg]:size-3.5">
						{title}
					</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	);
}
