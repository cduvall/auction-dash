import { useState, useRef, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";

export function UserMenu() {
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (loading) return null;

  if (!user) {
    return (
      <a
        href="/api/auth/login"
        className="text-[13px] font-medium text-secondary hover:text-ochre transition-colors no-underline whitespace-nowrap"
      >
        Sign in
      </a>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer p-0"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="text-[13px] text-secondary">{user.username}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-surface border border-elevated rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.6)] py-1 min-w-[120px] z-50">
          <button
            className="block w-full text-left px-4 py-2 text-[13px] font-medium text-secondary hover:text-primary hover:bg-elevated/50 bg-transparent border-none cursor-pointer"
            onClick={() => {
              setOpen(false);
              logout();
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
