import { parseAuctionIdFromInput, lookupAuctionTitle } from "../../_shared/hibid";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const input = url.searchParams.get("q") || "";
  const id = parseAuctionIdFromInput(input);

  if (!id) {
    return Response.json({ error: "Could not parse auction ID from input" }, { status: 400 });
  }

  try {
    const info = await lookupAuctionTitle(id);
    return Response.json({ id, ...info });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 400 });
  }
};
