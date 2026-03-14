export function LoadingOverlay() {
  return (
    <div className="fixed inset-0 bg-nav/70 flex items-center justify-center z-[200]">
      <div className="bg-surface border border-elevated rounded-lg px-12 py-8 text-center shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
        <div className="inline-block w-6 h-6 border-3 border-transparent border-t-ochre rounded-full animate-spin"></div>
        <p className="mt-3 text-secondary text-sm">Fetching auction data...</p>
      </div>
    </div>
  );
}
