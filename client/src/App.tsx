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
import MinistryAdminDashboard from "@/pages/ministry-admin/dashboard";
import MinistryAdminAccountRequests from "@/pages/ministry-admin/account-requests";
import LeaderDashboard from "@/pages/leader/dashboard";
import LeaderConverts from "@/pages/leader/converts";
import LeaderFollowups from "@/pages/leader/followups";
import LeaderPrayerRequests from "@/pages/leader/prayer-requests";
import LeaderContactRequests from "@/pages/leader/contact-requests";
import LeaderSettings from "@/pages/leader/settings";
import ConvertDetail from "@/pages/leader/convert-detail";
import NewConvert from "@/pages/new-convert";
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
      <Route path="/connect/:token" component={NewConvert} />
      
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
      
      {/* Ministry Admin routes */}
      <Route path="/ministry-admin">
        <ProtectedRoute component={MinistryAdminDashboard} allowedRoles={["MINISTRY_ADMIN"]} />
      </Route>
      <Route path="/ministry-admin/dashboard">
        <ProtectedRoute component={MinistryAdminDashboard} allowedRoles={["MINISTRY_ADMIN"]} />
      </Route>
      <Route path="/ministry-admin/account-requests">
        <ProtectedRoute component={MinistryAdminAccountRequests} allowedRoles={["MINISTRY_ADMIN"]} />
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
