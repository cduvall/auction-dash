import type { Lot } from "@/shared/types";
import { useAuth } from "@/features/auth/hooks/useAuth";

interface LotActionsProps {
  lot: Lot;
  onToggleHide: (lotNumber: string) => void;
  onToggleFavorite: (lotNumber: string) => void;
}

export function LotActions({ lot, onToggleHide, onToggleFavorite }: LotActionsProps) {
  const { user } = useAuth();

  function handleClick(action: () => void) {
    if (!user) {
      window.location.href = "/api/auth/login";
      return;
    }
    action();
  }

  return (
    <>
      <button
        className={`bg-transparent border-none cursor-pointer p-2 sm:p-0.5 leading-none inline-flex items-center justify-center transition-all ${
          lot.favorited ? "opacity-70 text-ochre hover:opacity-100 hover:text-ochre-light" : "opacity-30 text-secondary hover:opacity-100 hover:text-ochre"
        }`}
        onClick={() => handleClick(() => onToggleFavorite(lot.lotNumber))}
        title={user ? (lot.favorited ? "Unfavorite" : "Favorite") : "Sign in to favorite"}
      >
        <svg className="w-5 h-5 sm:w-3 sm:h-3" viewBox="0 0 14 14">
          <polygon
            points="7 1 8.8 5.2 13 5.7 9.9 8.4 10.8 13 7 10.7 3.2 13 4.1 8.4 1 5.7 5.2 5.2"
            fill={lot.favorited ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={lot.favorited ? "1" : "1.5"}
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <button
        className={`bg-transparent border-none cursor-pointer p-2 sm:p-0.5 leading-none inline-flex items-center justify-center transition-all ${
          lot.hidden ? "opacity-25 text-secondary hover:opacity-80 hover:text-olive" : "opacity-30 text-secondary hover:opacity-100 hover:text-ochre"
        }`}
        onClick={() => handleClick(() => onToggleHide(lot.lotNumber))}
        title={user ? (lot.hidden ? "Show" : "Hide") : "Sign in to hide"}
      >
        <svg className="w-5 h-5 sm:w-3 sm:h-3" viewBox="0 0 14 14">
          <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          {lot.hidden ? (
            <line x1="3" y1="3" x2="11" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          ) : (
            <circle cx="7" cy="7" r="2" fill="currentColor" />
          )}
        </svg>
      </button>
    </>
  );
}
