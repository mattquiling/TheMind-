import DraggableCard from "./DraggableCard";

export default function CardHand({ cards, onPlay, disabled }) {
  return (
    <section className="hand">
      <h3>Your Hand</h3>
      <div className="card-row">
        {cards.map((value) => (
          <DraggableCard
            key={value}
            value={value}
            onPlay={onPlay}
            disabled={disabled}
          />
        ))}
      </div>
    </section>
  );
}
