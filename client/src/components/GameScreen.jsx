import { useEffect, useState } from "react";
import TopBar from "./TopBar";
import CardHand from "./CardHand";
import GameBoard from "./GameBoard";
import ReadyOverlay from "./ReadyOverlay";
import StarVoteUI from "./StarVoteUI";
import RoundFailedOverlay from "./RoundFailedOverlay";

export default function GameScreen({
  game,
  meId,
  me,
  banner,
  error,
  onReady,
  onStop,
  onPlayCard,
  onSuggestStar,
  onConfirmStar,
  roundFailedState,
  onDismissRoundFailed,
}) {
  const [isMobileLayout, setIsMobileLayout] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 700 : false,
  );

  useEffect(() => {
    function handleResize() {
      setIsMobileLayout(window.innerWidth <= 700);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!game || !me) {
    return <main className="screen">Loading game...</main>;
  }

  const isFocus = game.status === "focus";
  const otherPlayers = game.players.filter((player) => player.id !== meId);

  function getSeatStyle(index, total) {
    if (isMobileLayout) {
      const columns = Math.min(3, total || 1);
      const row = Math.floor(index / columns);
      const col = index % columns;
      const x = ((col + 1) * 100) / (columns + 1);
      const y = 14 + row * 17;
      return {
        left: `${x}%`,
        top: `${y}%`,
      };
    }

    const angle = (Math.PI * 2 * index) / Math.max(1, total);
    const x = 50 + Math.cos(angle - Math.PI / 2) * 38;
    const y = 50 + Math.sin(angle - Math.PI / 2) * 30;
    return {
      left: `${x}%`,
      top: `${y}%`,
    };
  }

  return (
    <main className="screen game-screen">
      <TopBar
        round={game.round}
        lives={game.lives}
        stars={game.throwingStars}
      />

      <section className="table-shell">
        <div className="table-arena">
          {otherPlayers.map((player, index) => (
            <div
              className="opponent-seat"
              key={player.id}
              style={getSeatStyle(index, otherPlayers.length)}
            >
              <p className="opponent-name">{player.name}</p>
              <div className="opponent-cards" aria-hidden="true">
                {Array.from({
                  length: Math.max(1, Math.min(player.cardCount, 6)),
                }).map((_, i) => (
                  <span
                    className="opponent-card-back"
                    key={`${player.id}-${i}`}
                  />
                ))}
              </div>
              <p className="opponent-count">{player.cardCount} cards</p>
            </div>
          ))}

          <div className="table-center">
            <GameBoard
              playedCards={game.playedCards}
              revealedMistakeCards={game.revealedMistakeCards}
              onPlayCard={onPlayCard}
              canDrop={game.status === "playing"}
            />
          </div>
        </div>

        <section className="action-row">
          <button
            className="btn ghost"
            onClick={onStop}
            disabled={game.status !== "playing"}
          >
            STOP
          </button>

          <StarVoteUI
            game={game}
            meId={meId}
            onSuggestStar={onSuggestStar}
            onConfirmStar={onConfirmStar}
          />
        </section>

        <section className="status-row">
          {banner ? <p className="status">{banner}</p> : null}
          {error ? <p className="status error">{error}</p> : null}
        </section>
      </section>

      <CardHand
        cards={me.cards || []}
        onPlay={onPlayCard}
        disabled={game.status !== "playing"}
      />

      <ReadyOverlay
        active={isFocus}
        players={game.players}
        onReady={onReady}
        meId={meId}
      />

      <RoundFailedOverlay
        data={roundFailedState}
        onDismiss={onDismissRoundFailed}
      />
    </main>
  );
}
