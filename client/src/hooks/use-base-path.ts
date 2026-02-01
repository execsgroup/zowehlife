import { useAuth } from "@/lib/auth";

export function useBasePath(): string {
  const { user } = useAuth();
  
  if (!user) {
    return "/leader";
  }
  
  switch (user.role) {
    case "ADMIN":
      return "/admin";
    case "MINISTRY_ADMIN":
      return "/ministry-admin";
    case "LEADER":
    default:
      return "/leader";
  }
}
