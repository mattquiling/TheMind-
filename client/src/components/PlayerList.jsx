export default function PlayerList({ players, hostId, showCards = true }) {
  return (
    <ul className="player-list">
      {players.map((player) => (
        <li className="player-item" key={player.id}>
          <span className="name">
            {player.name} {player.id === hostId ? "(Host)" : ""}
          </span>
          {showCards ? (
            <span className="count">Cards: {player.cardCount}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
