export default function StarVoteUI({
  game,
  meId,
  onSuggestStar,
  onConfirmStar,
}) {
  const voteOpen = Boolean(game.starSuggestionBy);
  const allVoters = game.players;
  const me = allVoters.find((p) => p.id === meId);

  return (
    <section className="star-vote">
      <h3>Throwing Star</h3>
      <p>Remaining: {game.throwingStars}</p>

      {!voteOpen ? (
        <button
          className="btn ghost"
          onClick={onSuggestStar}
          disabled={game.throwingStars <= 0 || game.status !== "playing"}
        >
          Suggest Star
        </button>
      ) : (
        <>
          <p>Vote active. All players must agree.</p>
          <ul className="vote-list">
            {allVoters.map((player) => (
              <li key={player.id}>
                {player.name}: {player.agreedStar ? "YES" : "PENDING"}
              </li>
            ))}
          </ul>
          <button
            className="btn primary"
            onClick={onConfirmStar}
            disabled={me?.agreedStar}
          >
            {me?.agreedStar ? "Confirmed" : "Confirm Star"}
          </button>
        </>
      )}
    </section>
  );
}
