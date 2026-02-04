import { useAuth } from "@/lib/auth";

export function useApiBasePath(): string {
  const { user } = useAuth();
  
  if (!user) {
    return "/api/leader";
  }
  
  switch (user.role) {
    case "ADMIN":
      return "/api/admin";
    case "MINISTRY_ADMIN":
      return "/api/ministry-admin";
    case "LEADER":
    default:
      return "/api/leader";
  }
}
