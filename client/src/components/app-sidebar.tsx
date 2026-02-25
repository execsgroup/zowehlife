import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useApiBasePath } from "@/hooks/use-api-base-path";
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
  FileEdit,
  GraduationCap,
} from "lucide-react";
import { useTutorialSafe } from "./interactive-tutorial";
import zowehLogoPath from "@assets/ChatGPT_Image_Feb_24,_2026,_10_13_39_PM_1771989231984.png";

interface ChurchData {
  id: string;
  name: string;
  logoUrl: string | null;
}

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const tutorial = useTutorialSafe();

  const adminNavItems = [
    { title: t('sidebar.dashboard'), url: "/admin/dashboard", icon: LayoutDashboard },
    { title: t('sidebar.ministries'), url: "/admin/churches", icon: Church },
    { title: t('sidebar.leaders'), url: "/admin/leaders", icon: Users },
    { title: t('sidebar.allConverts'), url: "/admin/converts", icon: UserPlus },
    { title: t('sidebar.prayerRequests'), url: "/admin/prayer-requests", icon: HandHeart },
    { title: t('sidebar.ministryRequests'), url: "/admin/ministry-requests", icon: Building2 },
    { title: t('sidebar.deletedAccounts'), url: "/admin/deleted-accounts", icon: Archive },
  ];

  const ministryAdminNavGroups = [
    {
      label: null,
      items: [
        { title: t('sidebar.dashboard'), url: "/ministry-admin/dashboard", icon: LayoutDashboard },
      ],
    },
    {
      label: t('sidebar.people'),
      items: [
        { title: t('sidebar.converts'), url: "/ministry-admin/converts", icon: UserPlus },
        { title: t('sidebar.newMembersGuests'), url: "/ministry-admin/new-members", icon: Users },
        { title: t('sidebar.members'), url: "/ministry-admin/members", icon: Church },
      ],
    },
    {
      label: t('sidebar.engagement'),
      items: [
        { title: t('sidebar.followUps'), url: "/ministry-admin/followups", icon: CalendarClock },
        { title: t('sidebar.massFollowUp'), url: "/ministry-admin/mass-followup", icon: UsersRound },
        { title: t('sidebar.announcements'), url: "/ministry-admin/announcements", icon: Megaphone },
      ],
    },
    {
      label: t('sidebar.management'),
      items: [
        { title: t('sidebar.prayerRequests'), url: "/ministry-admin/prayer-requests", icon: HandHeart },
        { title: t('sidebar.contactRequests'), url: "/ministry-admin/contact-requests", icon: MessageSquare },
        { title: t('sidebar.manageLeaders'), url: "/ministry-admin/leaders", icon: ClipboardList },
        { title: t('sidebar.memberAccounts'), url: "/ministry-admin/member-accounts", icon: UserCog },
      ],
    },
    {
      label: t('sidebar.configuration'),
      items: [
        { title: t('sidebar.formSettings'), url: "/ministry-admin/form-settings", icon: FileEdit },
        { title: t('sidebar.settings'), url: "/ministry-admin/settings", icon: Settings },
        { title: t('sidebar.billing'), url: "/ministry-admin/billing", icon: CreditCard },
      ],
    },
  ];

  const leaderNavGroups = [
    {
      label: null,
      items: [
        { title: t('sidebar.dashboard'), url: "/leader/dashboard", icon: LayoutDashboard },
      ],
    },
    {
      label: t('sidebar.people'),
      items: [
        { title: t('sidebar.converts'), url: "/leader/converts", icon: UserPlus },
        { title: t('sidebar.newMembersGuests'), url: "/leader/new-members", icon: Users },
        { title: t('sidebar.members'), url: "/leader/members", icon: Church },
      ],
    },
    {
      label: t('sidebar.engagement'),
      items: [
        { title: t('sidebar.followUps'), url: "/leader/followups", icon: CalendarClock },
        { title: t('sidebar.massFollowUp'), url: "/leader/mass-followup", icon: UsersRound },
        { title: t('sidebar.announcements'), url: "/leader/announcements", icon: Megaphone },
      ],
    },
    {
      label: t('sidebar.management'),
      items: [
        { title: t('sidebar.prayerRequests'), url: "/leader/prayer-requests", icon: HandHeart },
        { title: t('sidebar.contactRequests'), url: "/leader/contact-requests", icon: MessageSquare },
      ],
    },
  ];

  const apiBasePath = useApiBasePath();

  const { data: church } = useQuery<ChurchData>({
    queryKey: [`${apiBasePath}/church`],
    enabled: user?.role === "LEADER" || user?.role === "MINISTRY_ADMIN",
  });

  const getNavGroups = () => {
    if (user?.role === "ADMIN") return [{ label: null, items: adminNavItems }];
    if (user?.role === "MINISTRY_ADMIN") return ministryAdminNavGroups;
    return leaderNavGroups;
  };
  const navGroups = getNavGroups();
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || "U";

  const currentChurch = (user?.role === "LEADER" || user?.role === "MINISTRY_ADMIN") ? church : null;
  const showChurchLogo = currentChurch?.logoUrl;

  const getRoleLabel = () => {
    if (user?.role === "ADMIN") return t('roles.platformAdmin');
    if (user?.role === "MINISTRY_ADMIN") return t('roles.ministryAdmin');
    return t('roles.leader');
  };

  return (
    <Sidebar>
      <SidebarHeader className="px-3 py-3 border-b">
        <Link href="/" className="flex items-center gap-2.5">
          {showChurchLogo ? (
            <>
              <Avatar className="h-7 w-7 rounded-md">
                <AvatarImage src={currentChurch.logoUrl!} alt={currentChurch.name} className="object-cover" />
                <AvatarFallback className="rounded-md text-xs">
                  <img src={zowehLogoPath} alt="Zoweh Life" className="h-6 object-contain dark:invert dark:brightness-200 transition-[filter] duration-300" />
                </AvatarFallback>
              </Avatar>
              <span className="font-semibold text-sm truncate">
                {currentChurch.name}
              </span>
            </>
          ) : (
            <img src={zowehLogoPath} alt="Zoweh Life" className="h-6 object-contain dark:invert dark:brightness-200 transition-[filter] duration-300" />
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group, groupIndex) => (
          <SidebarGroup key={groupIndex}>
            {group.label && (
              <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{group.label}</SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
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
        ))}

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{t('nav.quickLinks')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/">
                    <Home className="h-4 w-4" />
                    <span className="text-sm">{t('nav.publicSite')}</span>
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
            {tutorial && (
              <DropdownMenuItem
                onClick={() => tutorial!.startTutorial()}
                data-testid="button-start-tutorial"
              >
                <GraduationCap className="mr-2 h-4 w-4" />
                {t('tutorial.startTutorial')}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => logout()}
              className="text-destructive focus:text-destructive"
              data-testid="button-logout"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t('auth.signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
