export function LoadingOverlay() {
  return (
    <div className="loading-overlay">
      <div className="loading-box">
        <div className="spinner"></div>
        <p>Fetching auction data...</p>
      </div>
    </div>
  );
}
