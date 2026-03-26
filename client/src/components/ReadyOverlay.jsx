export default function ReadyOverlay({ active, players, meId, onReady }) {
  if (!active) return null;

  const me = players.find((p) => p.id === meId);
  const readyCount = players.filter((p) => p.isReady).length;

  return (
    <div className="ready-overlay">
      <div className="ready-card">
        <h3>Focus Phase</h3>
        <p>
          {readyCount} / {players.length} players ready
        </p>
        <ul className="vote-list">
          {players.map((player) => (
            <li key={player.id}>
              {player.name}: {player.isReady ? "READY" : "WAITING"}
            </li>
          ))}
        </ul>
        <button
          className="btn primary"
          onClick={onReady}
          disabled={me?.isReady}
        >
          {me?.isReady ? "Waiting..." : "READY"}
        </button>
      </div>
    </div>
  );
}
