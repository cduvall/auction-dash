import { useQuery } from "@tanstack/react-query";
import { fetchAuctions } from "../api/auctions";

export function useAuctions() {
  return useQuery({
    queryKey: ["auctions"],
    queryFn: fetchAuctions,
    staleTime: Infinity,
  });
}
