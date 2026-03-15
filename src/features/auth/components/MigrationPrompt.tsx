import { useState } from "react";
import { migrateAnonymous } from "@/features/auth/api/auth";
import { useAuth } from "@/features/auth/hooks/useAuth";

interface MigrationPromptProps {
  onDone: () => void;
}

export function MigrationPrompt({ onDone }: MigrationPromptProps) {
  const { refresh } = useAuth();
  const [loading, setLoading] = useState(false);

  async function handleMigrate(skip: boolean) {
    setLoading(true);
    try {
      await migrateAnonymous(skip);
      await refresh();
      onDone();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60">
      <div className="bg-surface border border-elevated rounded-xl p-6 max-w-md w-[90vw] shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
        <h2 className="text-lg font-bold text-primary mb-2">Import existing data?</h2>
        <p className="text-[13px] text-secondary mb-5 leading-relaxed">
          There are favorites and hidden items from before you signed in.
          Would you like to import them into your account, or start fresh?
        </p>
        <div className="flex gap-3">
          <button
            className="bg-terracotta text-primary border-none px-4 py-2 rounded-md text-[13px] font-semibold cursor-pointer transition-all hover:opacity-85 disabled:opacity-50"
            disabled={loading}
            onClick={() => handleMigrate(false)}
          >
            Import my data
          </button>
          <button
            className="bg-surface border border-elevated text-secondary px-4 py-2 rounded-md text-[13px] font-semibold cursor-pointer transition-all hover:border-ochre hover:text-ochre disabled:opacity-50"
            disabled={loading}
            onClick={() => handleMigrate(true)}
          >
            Start fresh
          </button>
        </div>
      </div>
    </div>
  );
}
