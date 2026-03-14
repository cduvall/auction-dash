import { useState, useEffect } from "react";
import type { Auction } from "../types";
import { lookupAuction, addAuction, updateAuction, removeAuction } from "../api/auctions";

interface Props {
  auctions: Auction[];
  currentAuctionId: number | null;
  onUpdate: (auctions: Auction[]) => void;
  onClose: () => void;
}

export function AuctionManager({ auctions, currentAuctionId, onUpdate, onClose }: Props) {
  const [input, setInput] = useState("");
  const [lookup, setLookup] = useState<{ id: number; title: string; lotCount: number } | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function handleLookup() {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    setLookup(null);
    try {
      const result = await lookupAuction(input.trim());
      setLookup(result);
      setTitle(result.title);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!lookup || !title.trim()) return;
    setLoading(true);
    setError("");
    try {
      const updated = await addAuction(lookup.id, title.trim());
      onUpdate(updated);
      setInput("");
      setLookup(null);
      setTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(id: number) {
    setError("");
    try {
      const updated = await removeAuction(id);
      onUpdate(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove");
    }
  }

  async function handleSaveEdit(id: number) {
    if (!editTitle.trim()) return;
    setError("");
    try {
      const updated = await updateAuction(id, editTitle.trim());
      onUpdate(updated);
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-surface border border-elevated rounded-lg w-full max-w-lg mx-4 shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-elevated">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary">Manage Auctions</h2>
          <button
            className="text-secondary hover:text-primary cursor-pointer transition-colors p-1"
            onClick={onClose}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Add auction */}
        <div className="px-5 py-4 border-b border-elevated">
          <div className="text-[11px] uppercase tracking-wider text-secondary font-medium mb-2">Add Auction</div>
          <div className="flex gap-2 mb-2">
            <input
              className="flex-1 bg-elevated border border-elevated text-primary rounded-md px-3 py-1.5 text-sm outline-none focus:border-ochre transition-colors"
              placeholder="Auction ID or HiBid URL..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
            />
            <button
              className="bg-ochre/15 border border-ochre/50 text-ochre px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors hover:bg-ochre/25 disabled:opacity-50"
              onClick={handleLookup}
              disabled={loading || !input.trim()}
            >
              {loading && !lookup ? "Looking up..." : "Lookup"}
            </button>
          </div>
          {lookup && (
            <div className="bg-elevated/50 rounded-md p-3 mt-2">
              <div className="text-[11px] text-secondary mb-1">
                Found: ID {lookup.id} ({lookup.lotCount} lots)
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-surface border border-elevated text-primary rounded-md px-3 py-1.5 text-sm outline-none focus:border-ochre transition-colors"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  placeholder="Auction title..."
                />
                <button
                  className="bg-olive/15 border border-olive/50 text-olive-light px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors hover:bg-olive/25 disabled:opacity-50"
                  onClick={handleAdd}
                  disabled={loading || !title.trim()}
                >
                  Add
                </button>
              </div>
            </div>
          )}
          {error && <div className="text-terracotta text-xs mt-2">{error}</div>}
        </div>

        {/* Existing auctions */}
        <div className="px-5 py-4 max-h-64 overflow-y-auto">
          <div className="text-[11px] uppercase tracking-wider text-secondary font-medium mb-2">Current Auctions</div>
          {auctions.length === 0 ? (
            <div className="text-secondary text-sm py-4 text-center">No auctions configured</div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {auctions.map((a) => (
                <div key={a.id} className="flex items-center gap-2 bg-elevated/40 rounded-md px-3 py-2">
                  {editingId === a.id ? (
                    <>
                      <input
                        className="flex-1 bg-surface border border-elevated text-primary rounded-md px-2 py-1 text-sm outline-none focus:border-ochre transition-colors"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit(a.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        autoFocus
                      />
                      <button
                        className="text-olive-light hover:text-olive cursor-pointer transition-colors p-1"
                        onClick={() => handleSaveEdit(a.id)}
                        title="Save"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </button>
                      <button
                        className="text-secondary hover:text-primary cursor-pointer transition-colors p-1"
                        onClick={() => setEditingId(null)}
                        title="Cancel"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-primary truncate">{a.title}</div>
                        <div className="text-[10px] text-secondary">ID: {a.id}</div>
                      </div>
                      {a.id === currentAuctionId && (
                        <span className="text-[9px] bg-ochre/15 text-ochre px-1.5 py-0.5 rounded-full font-medium shrink-0">Active</span>
                      )}
                      <button
                        className="text-secondary hover:text-ochre cursor-pointer transition-colors p-1"
                        onClick={() => { setEditingId(a.id); setEditTitle(a.title); }}
                        title="Rename"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        className="text-secondary hover:text-terracotta cursor-pointer transition-colors p-1"
                        onClick={() => handleRemove(a.id)}
                        title="Remove"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
