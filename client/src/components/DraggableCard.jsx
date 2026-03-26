export default function DraggableCard({ value, onPlay, disabled }) {
  function handleDragStart(event) {
    event.dataTransfer.setData("text/card-value", String(value));
    event.dataTransfer.effectAllowed = "move";
  }

  return (
    <button
      className="mind-card"
      draggable={!disabled}
      onDragStart={handleDragStart}
      onClick={() => onPlay(value)}
      disabled={disabled}
      aria-label={`Play card ${value}`}
    >
      {value}
    </button>
  );
}
