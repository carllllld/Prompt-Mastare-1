import { useQuery } from "@tanstack/react-query";
import { type UserStatus } from "@shared/schema";

export function useUserStatus() {
  return useQuery<UserStatus>({
    queryKey: ["/api/user/status"],
    refetchInterval: 30000,
  });
}
