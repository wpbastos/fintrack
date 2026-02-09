"use client";

import { useState } from "react";
import {
  Home,
  Upload,
  List,
  FileStack,
  Wallet,
  History,
  Store,
  Tags,
  CreditCard,
  FileCode2,
  ChevronDown,
  Settings,
  Cog,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navigation = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
  },
  {
    title: "Import",
    url: "/import",
    icon: Upload,
  },
  {
    title: "Staging",
    url: "/staging",
    icon: FileStack,
  },
  {
    title: "Transactions",
    url: "/transactions",
    icon: List,
  },
  {
    title: "Import Log",
    url: "/log",
    icon: History,
  },
];

const setup = [
  {
    title: "Accounts",
    url: "/accounts",
    icon: CreditCard,
  },
  {
    title: "Categories",
    url: "/categories",
    icon: Tags,
  },
  {
    title: "Merchants",
    url: "/merchants",
    icon: Store,
  },
  {
    title: "Income",
    url: "/income",
    icon: Wallet,
  },
  {
    title: "Schemas",
    url: "/schemas",
    icon: FileCode2,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [setupExpanded, setSetupExpanded] = useState(false);

  // Auto-expand if current path is a setup page
  const isSetupPage = setup.some((item) => pathname === item.url || pathname.startsWith(item.url + "/"));

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Wallet className="h-6 w-6" />
          <span className="font-semibold text-lg">FinTrack</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <button
            onClick={() => setSetupExpanded(!setupExpanded)}
            className="flex w-full items-center justify-between px-2 py-1.5 text-xs font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
          >
            <span className="flex items-center gap-2">
              <Settings className="h-3.5 w-3.5" />
              Setup
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${
                setupExpanded || isSetupPage ? "rotate-0" : "-rotate-90"
              }`}
            />
          </button>
          <SidebarGroupContent
            className={`overflow-hidden transition-all duration-200 ${
              setupExpanded || isSetupPage ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <SidebarMenu>
              {setup.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/settings"}>
                  <Link href="/settings">
                    <Cog className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
