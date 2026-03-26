import { useState } from "react";

export default function HomeScreen({ connected, error, onCreate, onJoin }) {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");

  return (
    <main className="screen home-screen">
      <div className="atmosphere" aria-hidden="true" />
      <section className="panel pulse-in">
        <h1 className="title">THE MIND</h1>
        <p className="subtitle">Realtime cooperative silence game</p>

        <label className="field-label" htmlFor="name-input">
          Your Name
        </label>
        <input
          id="name-input"
          className="input"
          maxLength={24}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Player name"
        />

        <div className="actions-row">
          <button
            className="btn primary"
            onClick={() => onCreate(name)}
            disabled={!connected || !name.trim()}
          >
            Create Lobby
          </button>
        </div>

        <div className="join-block">
          <label className="field-label" htmlFor="room-code-input">
            Room Code
          </label>
          <input
            id="room-code-input"
            className="input code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            maxLength={5}
            placeholder="ABCDE"
          />
          <button
            className="btn ghost"
            onClick={() => onJoin(name, roomCode)}
            disabled={!connected || !name.trim() || !roomCode.trim()}
          >
            Join Lobby
          </button>
        </div>

        {!connected ? (
          <p className="status warn">Connecting to server...</p>
        ) : null}
        {error ? <p className="status error">{error}</p> : null}
      </section>
    </main>
  );
}
