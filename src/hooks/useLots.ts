import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchLots, fetchLotsCached } from "../api/lots";

export function useLots(auctionId: number | null, refetchInterval: number | false = false) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["lots", auctionId],
    queryFn: async () => {
      if (!auctionId) throw new Error("No auction selected");
      try {
        return await fetchLotsCached(auctionId);
      } catch {
        return await fetchLots(auctionId);
      }
    },
    enabled: auctionId != null,
    refetchInterval,
    staleTime: refetchInterval || Infinity,
  });

  const refresh = async () => {
    if (!auctionId) return;
    const data = await fetchLots(auctionId);
    queryClient.setQueryData(["lots", auctionId], data);
  };

  return { ...query, refresh };
}
