import { AppShell } from "@/components/app-shell";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";

export default function DemoPage() {
	return (
		<AppShell>
			<DashboardSkeleton />
		</AppShell>
	);
}
