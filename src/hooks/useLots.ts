import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchLots, fetchLotsCached } from "../api/lots";

const REFETCH_INTERVAL = 5 * 60 * 1000;

export function useLots(auctionId: number | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["lots", auctionId],
    queryFn: async () => {
      if (!auctionId) throw new Error("No auction selected");
      // Try cached first
      try {
        return await fetchLotsCached(auctionId);
      } catch {
        return await fetchLots(auctionId);
      }
    },
    enabled: auctionId != null,
    refetchInterval: REFETCH_INTERVAL,
    staleTime: REFETCH_INTERVAL,
  });

  const refresh = async () => {
    if (!auctionId) return;
    const data = await fetchLots(auctionId);
    queryClient.setQueryData(["lots", auctionId], data);
  };

  return { ...query, refresh };
}
