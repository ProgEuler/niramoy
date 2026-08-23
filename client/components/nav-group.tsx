import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import type { SidebarNavGroup } from "@/components/app-shared";
import { IconChevronRight } from "@tabler/icons-react";
import Link from "next/link";

export function NavGroup({ label, items }: SidebarNavGroup) {
	return (
		<SidebarGroup>
			{label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
			<SidebarMenu>
				{items.map((item) => (
					<Collapsible
						asChild
						className="group/collapsible"
						defaultOpen={
							!!item.isActive ||
							item.subItems?.some((i) => !!i.isActive)
						}
						key={item.title}
					>
						<SidebarMenuItem>
							{item.subItems?.length ? (
								<>
									<CollapsibleTrigger asChild>
										<SidebarMenuButton isActive={item.isActive}>
											{item.icon}
											<span>{item.title}</span>
											<IconChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
										</SidebarMenuButton>
									</CollapsibleTrigger>
									<CollapsibleContent>
										<SidebarMenuSub>
											{item.subItems?.map((subItem) => (
												<SidebarMenuSubItem key={subItem.title}>
													<SidebarMenuSubButton
														asChild
														isActive={subItem.isActive}
													>
														{subItem.path ? (
															<Link href={subItem.path}>
																{subItem.icon}
																<span>{subItem.title}</span>
															</Link>
														) : (
															<>
																{subItem.icon}
																<span>{subItem.title}</span>
															</>
														)}
													</SidebarMenuSubButton>
												</SidebarMenuSubItem>
											))}
										</SidebarMenuSub>
									</CollapsibleContent>
								</>
							) : item.path ? (
								<SidebarMenuButton asChild isActive={item.isActive}>
									<Link href={item.path}>
										{item.icon}
										<span>{item.title}</span>
									</Link>
								</SidebarMenuButton>
							) : (
								<SidebarMenuButton isActive={item.isActive}>
									{item.icon}
									<span>{item.title}</span>
								</SidebarMenuButton>
							)}
						</SidebarMenuItem>
					</Collapsible>
				))}
			</SidebarMenu>
		</SidebarGroup>
	);
}
