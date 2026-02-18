import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/lib/auth";

import Home from "@/pages/home";
import Salvation from "@/pages/salvation";
import Journey from "@/pages/journey";
import Contact from "@/pages/contact";
import ContactUs from "@/pages/contact-us";
import Login from "@/pages/login";
import Setup from "@/pages/setup";
import AdminReset from "@/pages/admin-reset";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminChurches from "@/pages/admin/churches";
import AdminLeaders from "@/pages/admin/leaders";
import AdminConverts from "@/pages/admin/converts";
import AdminConvertDetail from "@/pages/admin/convert-detail";
import AdminPrayerRequests from "@/pages/admin/prayer-requests";
import AdminAccountRequests from "@/pages/admin/account-requests";
import AdminMinistryRequests from "@/pages/admin/ministry-requests";
import AdminMinistryProfile from "@/pages/admin/ministry-profile";
import AdminDeletedAccounts from "@/pages/admin/deleted-accounts";
import MinistryAdminDashboard from "@/pages/ministry-admin/dashboard";
import MinistryAdminLeaders from "@/pages/ministry-admin/leaders";
import MinistryAdminBilling from "@/pages/ministry-admin/billing";
import MinistryAdminSettings from "@/pages/ministry-admin/settings";
import LeaderDashboard from "@/pages/leader/dashboard";
import LeaderConverts from "@/pages/leader/converts";
import LeaderFollowups from "@/pages/leader/followups";
import LeaderPrayerRequests from "@/pages/leader/prayer-requests";
import LeaderContactRequests from "@/pages/leader/contact-requests";
import LeaderSettings from "@/pages/leader/settings";
import LeaderNewMembers from "@/pages/leader/new-members";
import LeaderMembers from "@/pages/leader/members";
import LeaderGuests from "@/pages/leader/guests";
import LeaderMemberAccounts from "@/pages/leader/member-accounts";
import MassFollowUp from "@/pages/leader/mass-followup";
import ConvertDetail from "@/pages/leader/convert-detail";
import NewMemberDetail from "@/pages/leader/new-member-detail";
import MemberDetail from "@/pages/leader/member-detail";
import RegisterMinistry from "@/pages/register-ministry";
import RegisterMinistrySuccess from "@/pages/register-ministry-success";
import RegisterMinistryCancel from "@/pages/register-ministry-cancel";
import RegisterMinistryFreeSuccess from "@/pages/register-ministry-free-success";
import NewConvert from "@/pages/new-convert";
import NewMemberForm from "@/pages/new-member-form";
import MemberForm from "@/pages/member-form";
import MemberPortalLogin from "@/pages/member-portal/login";
import MemberPortalClaim from "@/pages/member-portal/claim";
import MemberPortalDashboard from "@/pages/member-portal/dashboard";
import MemberPortalPrayerRequests from "@/pages/member-portal/prayer-requests";
import MemberPortalJourney from "@/pages/member-portal/journey";
import MemberPortalJournal from "@/pages/member-portal/journal";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";

function ProtectedRoute({
  component: Component,
  allowedRoles,
}: {
  component: React.ComponentType;
  allowedRoles: string[];
}) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (!allowedRoles.includes(user.role)) {
    let redirectPath = "/leader/dashboard";
    if (user.role === "ADMIN") {
      redirectPath = "/admin/dashboard";
    } else if (user.role === "MINISTRY_ADMIN") {
      redirectPath = "/ministry-admin/dashboard";
    }
    return <Redirect to={redirectPath} />;
  }

  return <Component />;
}

function AuthRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    let redirectPath = "/leader/dashboard";
    if (user.role === "ADMIN") {
      redirectPath = "/admin/dashboard";
    } else if (user.role === "MINISTRY_ADMIN") {
      redirectPath = "/ministry-admin/dashboard";
    }
    return <Redirect to={redirectPath} />;
  }

  return <Login />;
}

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Home} />
      <Route path="/salvation" component={Salvation} />
      <Route path="/journey" component={Journey} />
      <Route path="/contact" component={Contact} />
      <Route path="/contact-us" component={ContactUs} />
      <Route path="/register-ministry" component={RegisterMinistry} />
      <Route path="/register-ministry/success" component={RegisterMinistrySuccess} />
      <Route path="/register-ministry/cancel" component={RegisterMinistryCancel} />
      <Route path="/register-ministry/free-success" component={RegisterMinistryFreeSuccess} />
      <Route path="/connect/:token" component={NewConvert} />
      <Route path="/new-member/:token" component={NewMemberForm} />
      <Route path="/member/:token" component={MemberForm} />
      
      {/* Auth routes */}
      <Route path="/login" component={AuthRedirect} />
      <Route path="/setup" component={Setup} />
      <Route path="/admin-reset" component={AdminReset} />
      
      {/* Admin routes */}
      <Route path="/admin">
        <ProtectedRoute component={AdminDashboard} allowedRoles={["ADMIN"]} />
      </Route>
      <Route path="/admin/dashboard">
        <ProtectedRoute component={AdminDashboard} allowedRoles={["ADMIN"]} />
      </Route>
      <Route path="/admin/churches">
        <ProtectedRoute component={AdminChurches} allowedRoles={["ADMIN"]} />
      </Route>
      <Route path="/admin/leaders">
        <ProtectedRoute component={AdminLeaders} allowedRoles={["ADMIN"]} />
      </Route>
      <Route path="/admin/converts">
        <ProtectedRoute component={AdminConverts} allowedRoles={["ADMIN"]} />
      </Route>
      <Route path="/admin/converts/:id">
        <ProtectedRoute component={AdminConvertDetail} allowedRoles={["ADMIN"]} />
      </Route>
      <Route path="/admin/prayer-requests">
        <ProtectedRoute component={AdminPrayerRequests} allowedRoles={["ADMIN"]} />
      </Route>
      <Route path="/admin/account-requests">
        <ProtectedRoute component={AdminAccountRequests} allowedRoles={["ADMIN"]} />
      </Route>
      <Route path="/admin/ministry-requests">
        <ProtectedRoute component={AdminMinistryRequests} allowedRoles={["ADMIN"]} />
      </Route>
      <Route path="/admin/ministry/:id">
        <ProtectedRoute component={AdminMinistryProfile} allowedRoles={["ADMIN"]} />
      </Route>
      <Route path="/admin/deleted-accounts">
        <ProtectedRoute component={AdminDeletedAccounts} allowedRoles={["ADMIN"]} />
      </Route>
      
      {/* Ministry Admin routes */}
      <Route path="/ministry-admin">
        <ProtectedRoute component={MinistryAdminDashboard} allowedRoles={["MINISTRY_ADMIN"]} />
      </Route>
      <Route path="/ministry-admin/dashboard">
        <ProtectedRoute component={MinistryAdminDashboard} allowedRoles={["MINISTRY_ADMIN"]} />
      </Route>
      <Route path="/ministry-admin/leaders">
        <ProtectedRoute component={MinistryAdminLeaders} allowedRoles={["MINISTRY_ADMIN"]} />
      </Route>
      <Route path="/ministry-admin/billing">
        <ProtectedRoute component={MinistryAdminBilling} allowedRoles={["MINISTRY_ADMIN"]} />
      </Route>
      <Route path="/ministry-admin/settings">
        <ProtectedRoute component={MinistryAdminSettings} allowedRoles={["MINISTRY_ADMIN"]} />
      </Route>
      <Route path="/ministry-admin/converts">
        <ProtectedRoute component={LeaderConverts} allowedRoles={["MINISTRY_ADMIN"]} />
      </Route>
      <Route path="/ministry-admin/converts/:id">
        <ProtectedRoute component={ConvertDetail} allowedRoles={["MINISTRY_ADMIN"]} />
      </Route>
      <Route path="/ministry-admin/followups">
        <ProtectedRoute component={LeaderFollowups} allowedRoles={["MINISTRY_ADMIN"]} />
      </Route>
      <Route path="/ministry-admin/new-members">
        <ProtectedRoute component={LeaderNewMembers} allowedRoles={["MINISTRY_ADMIN"]} />
      </Route>
      <Route path="/ministry-admin/new-members/:id">
        <ProtectedRoute component={NewMemberDetail} allowedRoles={["MINISTRY_ADMIN"]} />
      </Route>
      <Route path="/ministry-admin/members">
        <ProtectedRoute component={LeaderMembers} allowedRoles={["MINISTRY_ADMIN"]} />
      </Route>
      <Route path="/ministry-admin/members/:id">
        <ProtectedRoute component={MemberDetail} allowedRoles={["MINISTRY_ADMIN"]} />
      </Route>
      <Route path="/ministry-admin/member-accounts">
        <ProtectedRoute component={LeaderMemberAccounts} allowedRoles={["MINISTRY_ADMIN"]} />
      </Route>
      <Route path="/ministry-admin/guests">
        <ProtectedRoute component={LeaderGuests} allowedRoles={["MINISTRY_ADMIN"]} />
      </Route>
      <Route path="/ministry-admin/mass-followup">
        <ProtectedRoute component={MassFollowUp} allowedRoles={["MINISTRY_ADMIN"]} />
      </Route>
      <Route path="/ministry-admin/prayer-requests">
        <ProtectedRoute component={LeaderPrayerRequests} allowedRoles={["MINISTRY_ADMIN"]} />
      </Route>
      <Route path="/ministry-admin/contact-requests">
        <ProtectedRoute component={LeaderContactRequests} allowedRoles={["MINISTRY_ADMIN"]} />
      </Route>
      
      {/* Leader routes */}
      <Route path="/leader">
        <ProtectedRoute component={LeaderDashboard} allowedRoles={["LEADER"]} />
      </Route>
      <Route path="/leader/dashboard">
        <ProtectedRoute component={LeaderDashboard} allowedRoles={["LEADER"]} />
      </Route>
      <Route path="/leader/converts">
        <ProtectedRoute component={LeaderConverts} allowedRoles={["LEADER"]} />
      </Route>
      <Route path="/leader/converts/:id">
        <ProtectedRoute component={ConvertDetail} allowedRoles={["LEADER"]} />
      </Route>
      <Route path="/leader/followups">
        <ProtectedRoute component={LeaderFollowups} allowedRoles={["LEADER"]} />
      </Route>
      <Route path="/leader/prayer-requests">
        <ProtectedRoute component={LeaderPrayerRequests} allowedRoles={["LEADER"]} />
      </Route>
      <Route path="/leader/contact-requests">
        <ProtectedRoute component={LeaderContactRequests} allowedRoles={["LEADER"]} />
      </Route>
      <Route path="/leader/settings">
        <ProtectedRoute component={LeaderSettings} allowedRoles={["LEADER"]} />
      </Route>
      <Route path="/leader/new-members">
        <ProtectedRoute component={LeaderNewMembers} allowedRoles={["LEADER"]} />
      </Route>
      <Route path="/leader/new-members/:id">
        <ProtectedRoute component={NewMemberDetail} allowedRoles={["LEADER"]} />
      </Route>
      <Route path="/leader/members">
        <ProtectedRoute component={LeaderMembers} allowedRoles={["LEADER"]} />
      </Route>
      <Route path="/leader/members/:id">
        <ProtectedRoute component={MemberDetail} allowedRoles={["LEADER"]} />
      </Route>
      <Route path="/leader/member-accounts">
        <ProtectedRoute component={LeaderMemberAccounts} allowedRoles={["LEADER"]} />
      </Route>
      <Route path="/leader/guests">
        <ProtectedRoute component={LeaderGuests} allowedRoles={["LEADER"]} />
      </Route>
      <Route path="/leader/mass-followup">
        <ProtectedRoute component={MassFollowUp} allowedRoles={["LEADER"]} />
      </Route>
      
      {/* Member Portal routes */}
      <Route path="/member-portal/login" component={MemberPortalLogin} />
      <Route path="/member-portal/claim" component={MemberPortalClaim} />
      <Route path="/member-portal" component={MemberPortalDashboard} />
      <Route path="/member-portal/prayer-requests" component={MemberPortalPrayerRequests} />
      <Route path="/member-portal/journey" component={MemberPortalJourney} />
      <Route path="/member-portal/journal" component={MemberPortalJournal} />
      
      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <Router />
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
