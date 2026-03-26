export default function EndScreen({ ending, roomCode }) {
  const won = ending.result === "won";

  return (
    <main className="screen end-screen">
      <section className="panel fade-in">
        <h1>{won ? "Team Victory" : "Game Over"}</h1>
        <p className="subtitle">Room: {roomCode}</p>
        <p className="status">
          {won
            ? "All 12 rounds completed."
            : "Lives reached zero or match ended."}
        </p>
        {ending.reason ? (
          <p className="status warn">Reason: {ending.reason}</p>
        ) : null}
        <p className="status">Refresh to host a new lobby.</p>
      </section>
    </main>
  );
}
