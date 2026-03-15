import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchBiddersCached, refreshBidders } from "@/features/dashboard/api/bidders";

export function useBidders(auctionId: number | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["bidders", auctionId],
    queryFn: () => {
      if (!auctionId) throw new Error("No auction selected");
      return fetchBiddersCached(auctionId);
    },
    enabled: auctionId != null,
  });

  const refresh = async () => {
    if (!auctionId) return;
    const data = await refreshBidders(auctionId);
    queryClient.setQueryData(["bidders", auctionId], data);
  };

  return { ...query, refresh };
}
