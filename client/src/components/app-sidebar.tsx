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
  Archive,
  UserCog,
  UsersRound,
  CreditCard,
  Megaphone,
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
  { title: "Deleted Accounts", url: "/admin/deleted-accounts", icon: Archive },
];

const ministryAdminNavItems = [
  { title: "Dashboard", url: "/ministry-admin/dashboard", icon: LayoutDashboard },
  { title: "Converts", url: "/ministry-admin/converts", icon: UserPlus },
  { title: "New Members & Guests", url: "/ministry-admin/new-members", icon: Users },
  { title: "Members", url: "/ministry-admin/members", icon: Church },
  { title: "Follow-ups", url: "/ministry-admin/followups", icon: CalendarClock },
  { title: "Mass Follow-Up", url: "/ministry-admin/mass-followup", icon: UsersRound },
  { title: "Member Accounts", url: "/ministry-admin/member-accounts", icon: UserCog },
  { title: "Prayer Requests", url: "/ministry-admin/prayer-requests", icon: HandHeart },
  { title: "Announcements", url: "/ministry-admin/announcements", icon: Megaphone },
  { title: "Contact Requests", url: "/ministry-admin/contact-requests", icon: MessageSquare },
  { title: "Manage Leaders", url: "/ministry-admin/leaders", icon: ClipboardList },
  { title: "Billing", url: "/ministry-admin/billing", icon: CreditCard },
  { title: "Settings", url: "/ministry-admin/settings", icon: Settings },
];

const leaderNavItems = [
  { title: "Dashboard", url: "/leader/dashboard", icon: LayoutDashboard },
  { title: "My Converts", url: "/leader/converts", icon: UserPlus },
  { title: "New Members & Guests", url: "/leader/new-members", icon: Users },
  { title: "Members", url: "/leader/members", icon: Church },
  { title: "Follow-ups", url: "/leader/followups", icon: CalendarClock },
  { title: "Mass Follow-Up", url: "/leader/mass-followup", icon: UsersRound },
  { title: "Member Accounts", url: "/leader/member-accounts", icon: UserCog },
  { title: "Prayer Requests", url: "/leader/prayer-requests", icon: HandHeart },
  { title: "Announcements", url: "/leader/announcements", icon: Megaphone },
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
    if (user?.role === "ADMIN") return "Platform Admin";
    if (user?.role === "MINISTRY_ADMIN") return "Ministry Admin";
    return "Leader";
  };

  return (
    <Sidebar>
      <SidebarHeader className="px-3 py-3 border-b">
        <Link href="/" className="flex items-center gap-2.5">
          {showChurchLogo ? (
            <Avatar className="h-7 w-7 rounded-md">
              <AvatarImage src={currentChurch.logoUrl!} alt={currentChurch.name} className="object-cover" />
              <AvatarFallback className="bg-primary text-primary-foreground rounded-md text-xs">
                <Heart className="h-3.5 w-3.5" />
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <Heart className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
          )}
          <span className="font-semibold text-sm truncate">
            {getSidebarTitle()}
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url || (item.url !== "/admin/dashboard" && item.url !== "/ministry-admin/dashboard" && item.url !== "/leader/dashboard" && location.startsWith(item.url))}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span className="text-sm">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Quick Links</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/">
                    <Home className="h-4 w-4" />
                    <span className="text-sm">Public Site</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2 border-t">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2.5 h-auto py-2 px-2.5"
              data-testid="button-user-menu"
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start text-left flex-1 min-w-0">
                <span className="text-sm font-medium truncate w-full">{user?.firstName} {user?.lastName}</span>
                <span className="text-xs text-muted-foreground truncate w-full">
                  {getRoleLabel()}
                </span>
              </div>
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
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
