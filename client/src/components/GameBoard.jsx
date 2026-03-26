export default function GameBoard({
  playedCards,
  revealedMistakeCards,
  onPlayCard,
  canDrop,
}) {
  const latest = playedCards[playedCards.length - 1];

  function handleDrop(event) {
    event.preventDefault();
    if (!canDrop) return;
    const raw = event.dataTransfer.getData("text/card-value");
    const value = Number(raw);
    if (!Number.isNaN(value)) {
      onPlayCard(value);
    }
  }

  return (
    <section className="board">
      <div
        className={`drop-zone ${canDrop ? "active" : "disabled"}`}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <p className="zone-label">Drop Card Here</p>
        <p className="zone-value">{latest || "-"}</p>
      </div>

      {playedCards.length > 0 ? (
        <p className="pile">Pile: {playedCards.slice(-12).join(" , ")}</p>
      ) : (
        <p className="pile">Pile is empty</p>
      )}

      {revealedMistakeCards.length > 0 ? (
        <div className="mistake-reveal">
          Burned cards: {revealedMistakeCards.join(" , ")}
        </div>
      ) : null}
    </section>
  );
}
