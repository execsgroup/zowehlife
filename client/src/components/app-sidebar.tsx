import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Heart,
  LayoutDashboard,
  Church,
  Users,
  UserPlus,
  HandHeart,
  ClipboardList,
  Building2,
  LogOut,
  ChevronUp,
  Home,
  CalendarClock,
  Settings,
  MessageSquare,
} from "lucide-react";

interface ChurchData {
  id: string;
  name: string;
  logoUrl: string | null;
}

const adminNavItems = [
  { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Ministries", url: "/admin/churches", icon: Church },
  { title: "Leaders", url: "/admin/leaders", icon: Users },
  { title: "All Converts", url: "/admin/converts", icon: UserPlus },
  { title: "Prayer Requests", url: "/admin/prayer-requests", icon: HandHeart },
  { title: "Ministry Requests", url: "/admin/ministry-requests", icon: Building2 },
  { title: "Leader Requests", url: "/admin/account-requests", icon: ClipboardList },
];

const ministryAdminNavItems = [
  { title: "Dashboard", url: "/ministry-admin/dashboard", icon: LayoutDashboard },
  { title: "Leader Requests", url: "/ministry-admin/account-requests", icon: ClipboardList },
];

const leaderNavItems = [
  { title: "Dashboard", url: "/leader/dashboard", icon: LayoutDashboard },
  { title: "My Converts", url: "/leader/converts", icon: UserPlus },
  { title: "New Members", url: "/leader/new-members", icon: Users },
  { title: "Members", url: "/leader/members", icon: Church },
  { title: "Follow-ups", url: "/leader/followups", icon: CalendarClock },
  { title: "Prayer Requests", url: "/leader/prayer-requests", icon: HandHeart },
  { title: "Contact Requests", url: "/leader/contact-requests", icon: MessageSquare },
  { title: "Ministry Settings", url: "/leader/settings", icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const { data: church } = useQuery<ChurchData>({
    queryKey: ["/api/leader/church"],
    enabled: user?.role === "LEADER",
  });

  const { data: ministryAdminChurch } = useQuery<ChurchData>({
    queryKey: ["/api/ministry-admin/church"],
    enabled: user?.role === "MINISTRY_ADMIN",
  });

  const getNavItems = () => {
    if (user?.role === "ADMIN") return adminNavItems;
    if (user?.role === "MINISTRY_ADMIN") return ministryAdminNavItems;
    return leaderNavItems;
  };
  const navItems = getNavItems();
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || "U";

  const currentChurch = user?.role === "LEADER" ? church : user?.role === "MINISTRY_ADMIN" ? ministryAdminChurch : null;
  const showChurchLogo = currentChurch?.logoUrl;

  const getSidebarTitle = () => {
    if (user?.role === "LEADER" && church?.name) return church.name;
    if (user?.role === "MINISTRY_ADMIN" && ministryAdminChurch?.name) return ministryAdminChurch.name;
    return "Zoweh Life";
  };

  const getRoleLabel = () => {
    if (user?.role === "ADMIN") return "Platform Administrator";
    if (user?.role === "MINISTRY_ADMIN") return "Ministry Administrator";
    return "Ministry Leader";
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-3">
          {showChurchLogo ? (
            <Avatar className="h-9 w-9 rounded-full">
              <AvatarImage src={currentChurch.logoUrl!} alt={currentChurch.name} className="object-cover" />
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
                <Heart className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sidebar-primary">
              <Heart className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
          )}
          <div className="flex flex-col">
            <span className="font-semibold text-sm">
              {getSidebarTitle()}
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
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
          <SidebarGroupLabel>Quick Links</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/">
                    <Home className="h-4 w-4" />
                    <span>Public Site</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-auto py-2 px-3"
              data-testid="button-user-menu"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-sidebar-accent text-sidebar-accent-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start text-left flex-1 min-w-0">
                <span className="text-sm font-medium truncate w-full">{user?.firstName} {user?.lastName}</span>
                <span className="text-xs text-sidebar-foreground/70 truncate w-full">
                  {getRoleLabel()}
                </span>
              </div>
              <ChevronUp className="h-4 w-4 text-sidebar-foreground/70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => logout()}
              className="text-destructive focus:text-destructive"
              data-testid="button-logout"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
