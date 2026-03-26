export default function TopBar({ round, lives, stars }) {
  return (
    <header className="top-bar">
      <div className="chip">Round {round}/12</div>
      <div className="chip">Lives {"\u2665".repeat(lives)}</div>
      <div className="chip">Stars {"\u2605".repeat(stars)}</div>
    </header>
  );
}
