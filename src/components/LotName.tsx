import type { Lot } from "../types";

export function LotName({ lot }: { lot: Lot }) {
  return (
    <a href={lot.url} target="_blank" rel="noopener noreferrer">
      {lot.lotNumber} - {lot.name}
    </a>
  );
}
