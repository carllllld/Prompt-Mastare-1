import { useQuery } from "@tanstack/react-query";
import { type UserStatus } from "@shared/schema";

export function useUserStatus() {
  // Get user's timezone offset in minutes
  const tzOffset = new Date().getTimezoneOffset();
  
  return useQuery<UserStatus>({
    queryKey: ["/api/user/status", tzOffset],
    queryFn: async () => {
      const res = await fetch(`/api/user/status?tz=${tzOffset}`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to fetch user status");
      }
      return res.json();
    },
    refetchInterval: 30000,
  });
}
