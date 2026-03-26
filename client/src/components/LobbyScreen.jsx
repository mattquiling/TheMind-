import PlayerList from "./PlayerList";

export default function LobbyScreen({ room, meId, roomCode, onStart, error }) {
  if (!room) {
    return <main className="screen">Waiting for room...</main>;
  }

  const isHost = room.hostId === meId;

  return (
    <main className="screen lobby-screen">
      <section className="panel fade-in">
        <h2>Lobby {roomCode}</h2>
        <p className="status">Players: {room.players.length}/10</p>
        <p className="status">
          Host:{" "}
          {room.players.find((p) => p.id === room.hostId)?.name || "Unknown"}
        </p>

        <PlayerList
          players={room.players}
          hostId={room.hostId}
          showCards={false}
        />

        {isHost ? (
          <button
            className="btn primary"
            onClick={onStart}
            disabled={room.players.length < 2}
          >
            Start Game
          </button>
        ) : (
          <p className="status">Waiting for host to start the game.</p>
        )}

        {error ? <p className="status error">{error}</p> : null}
      </section>
    </main>
  );
}
