import { keepPreviousData, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getDashboard } from "@/lib/server/keep";
import { monthKey, type DashboardPayload } from "@/lib/keep";
import { readKeepCache, writeKeepCache } from "@/lib/keep-cache";

export function keepQueryKey(userId: string | undefined) {
  return ["keep-dashboard", userId ?? "anon"] as const;
}

export function applyDashboard(qc: QueryClient, userId: string | undefined, payload: DashboardPayload) {
  writeKeepCache(userId, payload);
  qc.setQueryData(keepQueryKey(userId), payload);
}

export function useKeep(month?: string) {
  const key = month ?? monthKey();
  const { user, isPending } = useCurrentUserState();
  const userId = user?.id;
  const qc = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    const cached = readKeepCache(userId, key);
    if (cached && qc.getQueryData(keepQueryKey(userId)) == null) {
      qc.setQueryData(keepQueryKey(userId), cached);
      void qc.invalidateQueries({ queryKey: keepQueryKey(userId) });
    }
  }, [userId, key, qc]);

  return useQuery({
    queryKey: keepQueryKey(userId),
    queryFn: async () => {
      const data = await getDashboard({ data: { month: key } });
      writeKeepCache(userId, data);
      return data;
    },
    staleTime: 5 * 60_000,
    gcTime: 24 * 60 * 60_000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: 2,
    enabled: Boolean(user) && !isPending,
    placeholderData: keepPreviousData,
  });
}
