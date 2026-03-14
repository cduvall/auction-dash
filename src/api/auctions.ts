import type { Auction } from "../types";

export async function fetchAuctions(): Promise<Auction[]> {
  const res = await fetch("/api/auctions");
  if (!res.ok) throw new Error("Failed to fetch auctions");
  return res.json();
}

export interface AuctionLookup {
  id: number;
  title: string;
  lotCount: number;
}

export async function lookupAuction(query: string): Promise<AuctionLookup> {
  const res = await fetch(`/api/auctions/lookup?q=${encodeURIComponent(query)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Lookup failed");
  return data;
}

export async function addAuction(id: number, title: string): Promise<Auction[]> {
  const res = await fetch("/api/auctions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, title }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to add auction");
  return data.auctions;
}

export async function updateAuction(id: number, title: string): Promise<Auction[]> {
  const res = await fetch("/api/auctions", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, title }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update auction");
  return data.auctions;
}

export async function removeAuction(id: number): Promise<Auction[]> {
  const res = await fetch("/api/auctions", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to remove auction");
  return data.auctions;
}
