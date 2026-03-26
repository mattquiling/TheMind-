export default function RoundFailedOverlay({ data, onDismiss }) {
  if (!data) return null;

  return (
    <div className="failed-overlay">
      <div className="failed-card">
        <h3>Round Failed</h3>
        <p className="status warn">
          Wrong card {data.playedValue} was played. Lives left:{" "}
          {data.livesRemaining}
        </p>

        <div className="failed-hands-grid">
          {(data.previewHands || []).map((entry) => (
            <article className="failed-hand" key={entry.playerId}>
              <p className="failed-name">{entry.name}</p>
              <p className="failed-cards">
                {(entry.cards || []).join(" , ") || "No cards"}
              </p>
            </article>
          ))}
        </div>

        <button className="btn primary" onClick={onDismiss}>
          Continue
        </button>
      </div>
    </div>
  );
}
