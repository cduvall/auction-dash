import type { Lot } from "../types";

export function LotName({ lot }: { lot: Lot }) {
  return (
    <a href={lot.url} target="_blank" rel="noopener noreferrer" className="text-ochre no-underline hover:underline hover:text-ochre-light">
      {lot.lotNumber} - {lot.name}
    </a>
  );
}
