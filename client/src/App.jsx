import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import HomeScreen from "./components/HomeScreen";
import LobbyScreen from "./components/LobbyScreen";
import GameScreen from "./components/GameScreen";
import EndScreen from "./components/EndScreen";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";

export default function App() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [view, setView] = useState("home");
  const [identity, setIdentity] = useState({
    name: "",
    roomCode: "",
    playerId: "",
  });
  const [room, setRoom] = useState(null);
  const [game, setGame] = useState(null);
  const [banner, setBanner] = useState("");
  const [error, setError] = useState("");
  const [ending, setEnding] = useState({ result: "", reason: "" });
  const [roundFailedState, setRoundFailedState] = useState(null);

  useEffect(() => {
    const socket = io(SERVER_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => {
      setConnected(false);
      setBanner("Disconnected from server. Trying to reconnect...");
    });

    socket.on("roomUpdate", (payload) => {
      setRoom(payload);
      if (payload.status === "waiting") {
        setView("lobby");
      }
    });

    socket.on("gameStart", () => {
      setView("game");
      setBanner("Round started. Focus...");
    });

    socket.on("focusPhase", ({ active, reason }) => {
      if (active) {
        if (reason === "mistake") setBanner("Mistake detected. Refocus phase.");
        if (reason === "round-restart") {
          setBanner("Round failed. Cards revealed. Ready up to restart.");
        }
        if (reason === "manual-stop")
          setBanner("Stop called. Regroup and ready up.");
        if (reason === "round-start")
          setBanner("New round. Everyone tap READY.");
      } else {
        setRoundFailedState(null);
        setBanner("Play in silence. Trust your timing.");
      }
    });

    socket.on("gameUpdate", (payload) => {
      setGame(payload);
      if (payload.status === "won" || payload.status === "lost") {
        setEnding({ result: payload.status, reason: "" });
        setView("end");
      } else {
        setView("game");
      }
    });

    socket.on("lifeLost", ({ livesRemaining, discarded }) => {
      setBanner(
        `Life lost. ${livesRemaining} lives left. Burned cards: ${discarded.join(", ") || "none"}`,
      );
    });

    socket.on("roundFailed", (payload) => {
      setRoundFailedState(payload);
    });

    socket.on("roundComplete", ({ round, rewards }) => {
      const gainParts = [];
      if (rewards.livesGained) gainParts.push(`+${rewards.livesGained} life`);
      if (rewards.starsGained) gainParts.push(`+${rewards.starsGained} star`);
      const rewardText = gainParts.length
        ? ` Reward: ${gainParts.join(" and ")}.`
        : "";
      setBanner(`Round ${round} completed.${rewardText}`);
    });

    socket.on("gameEnd", ({ result, reason }) => {
      setEnding({ result, reason: reason || "" });
      setView("end");
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const myPlayer = useMemo(() => {
    if (!game) return null;
    return game.players.find((p) => p.id === identity.playerId) || null;
  }, [game, identity.playerId]);

  async function emitWithAck(event, payload) {
    return new Promise((resolve) => {
      socketRef.current.emit(event, payload, (response) => {
        resolve(response || { ok: false, error: "No response" });
      });
    });
  }

  async function createRoom(name) {
    setError("");
    const response = await emitWithAck("createRoom", { name });
    if (!response.ok) {
      setError(response.error || "Unable to create room");
      return;
    }
    setIdentity({
      name,
      roomCode: response.roomCode,
      playerId: response.playerId,
    });
    setView("lobby");
  }

  async function joinRoom(name, roomCode) {
    setError("");
    const response = await emitWithAck("joinRoom", { name, roomCode });
    if (!response.ok) {
      setError(response.error || "Unable to join room");
      return;
    }
    setIdentity({
      name,
      roomCode: response.roomCode,
      playerId: response.playerId,
    });
    setView("lobby");
  }

  async function startGame() {
    const response = await emitWithAck("startGame", {});
    if (!response.ok) {
      setError(response.error || "Unable to start game");
    }
  }

  async function ready() {
    const response = await emitWithAck("ready", {});
    if (!response.ok) {
      setError(response.error || "Unable to set ready");
    }
  }

  async function stopRound() {
    const response = await emitWithAck("stopRound", {});
    if (!response.ok) {
      setError(response.error || "Unable to pause");
    }
  }

  async function playCard(value) {
    const response = await emitWithAck("playCard", { value });
    if (!response.ok) {
      setError(response.reason || response.error || "Card play rejected");
    }
  }

  async function suggestStar() {
    const response = await emitWithAck("suggestStar", {});
    if (!response.ok) {
      setError(response.reason || response.error || "Could not suggest star");
    }
  }

  async function confirmStar() {
    const response = await emitWithAck("confirmStar", {});
    if (!response.ok) {
      setError(response.reason || response.error || "Could not confirm star");
    }
  }

  if (view === "home") {
    return (
      <HomeScreen
        connected={connected}
        error={error}
        onCreate={createRoom}
        onJoin={joinRoom}
      />
    );
  }

  if (view === "lobby") {
    return (
      <LobbyScreen
        room={room}
        meId={identity.playerId}
        roomCode={identity.roomCode}
        error={error}
        onStart={startGame}
      />
    );
  }

  if (view === "game") {
    return (
      <GameScreen
        game={game}
        meId={identity.playerId}
        me={myPlayer}
        banner={banner}
        error={error}
        onReady={ready}
        onStop={stopRound}
        onPlayCard={playCard}
        onSuggestStar={suggestStar}
        onConfirmStar={confirmStar}
        roundFailedState={roundFailedState}
        onDismissRoundFailed={() => setRoundFailedState(null)}
      />
    );
  }

  return <EndScreen ending={ending} roomCode={identity.roomCode} />;
}
