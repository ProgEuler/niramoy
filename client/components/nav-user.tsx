"use client";

import { useRouter } from "next/navigation";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  IconUser,
  IconSettings,
  IconChevronLeft,
} from "@tabler/icons-react";

import { useAuth } from "@/lib/auth/use-auth";
import { ROUTES } from "@/lib/auth/guards";

export function NavUser() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const name = user?.username ?? "Guest";
  const email = user?.email ?? "";
  const initials = name.charAt(0).toUpperCase();

  function handleSignOut() {
    signOut();
    router.replace(ROUTES.login);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="size-8 cursor-pointer">
          <AvatarImage src="" />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex items-center gap-3">
          <Avatar className="size-10">
            <AvatarImage src="" />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <span className="font-medium text-foreground">{name}</span>{" "}
            <br />
            <div className="max-w-full overflow-hidden overflow-ellipsis whitespace-nowrap text-muted-foreground text-xs">
              {email}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <IconUser />
            Account
          </DropdownMenuItem>
          <DropdownMenuItem>
            <IconSettings />
            Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="w-full cursor-pointer"
            variant="destructive"
            onSelect={(e) => {
              e.preventDefault();
              handleSignOut();
            }}
          >
            <IconChevronLeft />
            Log out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
