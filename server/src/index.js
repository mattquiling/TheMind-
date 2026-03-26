import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import {
  applyRoundRewards,
  beginNextRound,
  canStartGame,
  confirmStar,
  createInitialRoom,
  generateRoomCode,
  getPlayerGameView,
  getPublicRoom,
  isGameOver,
  markReady,
  pauseToFocus,
  restartCurrentRoundAfterMistake,
  shouldRoundComplete,
  startGame,
  startPlaying,
  startStarSuggestion,
  tryPlayCard,
} from "./game.js";

const app = express();
app.use(cors({ origin: "*" }));
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const rooms = new Map();
const playerToRoom = new Map();

io.on("connection", (socket) => {
  socket.on("createRoom", ({ name }, ack) => {
    try {
      const safeName = normalizeName(name);
      if (!safeName) {
        ack?.({ ok: false, error: "Name is required" });
        return;
      }

      const roomCode = generateRoomCode(rooms);
      const room = createInitialRoom(roomCode, socket.id, safeName);
      rooms.set(roomCode, room);
      playerToRoom.set(socket.id, roomCode);
      socket.join(roomCode);

      io.to(roomCode).emit("roomUpdate", getPublicRoom(room));
      ack?.({ ok: true, roomCode, playerId: socket.id });
    } catch (error) {
      ack?.({ ok: false, error: "Unable to create room" });
    }
  });

  socket.on("joinRoom", ({ roomCode, name }, ack) => {
    const code = `${roomCode || ""}`.trim().toUpperCase();
    const room = rooms.get(code);
    const safeName = normalizeName(name);

    if (!safeName) {
      ack?.({ ok: false, error: "Name is required" });
      return;
    }
    if (!room) {
      ack?.({ ok: false, error: "Room not found" });
      return;
    }
    if (room.players.length >= 10) {
      ack?.({ ok: false, error: "Room is full" });
      return;
    }
    if (room.status !== "waiting") {
      ack?.({ ok: false, error: "Game already started" });
      return;
    }

    room.players.push({
      id: socket.id,
      name: safeName,
      cards: [],
      ready: false,
      agreedStar: false,
    });

    playerToRoom.set(socket.id, code);
    socket.join(code);

    io.to(code).emit("roomUpdate", getPublicRoom(room));
    ack?.({ ok: true, roomCode: code, playerId: socket.id });
  });

  socket.on("startGame", (_payload, ack) => {
    const room = getRoomBySocket(socket.id);
    if (!room) {
      ack?.({ ok: false, error: "Room not found" });
      return;
    }
    if (room.hostId !== socket.id) {
      ack?.({ ok: false, error: "Only host can start" });
      return;
    }
    if (!canStartGame(room)) {
      ack?.({ ok: false, error: "Need at least 2 players" });
      return;
    }

    startGame(room);
    io.to(room.roomCode).emit("gameStart", {
      roomCode: room.roomCode,
      round: room.round,
      lives: room.lives,
      throwingStars: room.throwingStars,
      status: room.status,
    });
    io.to(room.roomCode).emit("focusPhase", {
      active: true,
      reason: "round-start",
    });
    broadcastGameState(room);
    ack?.({ ok: true });
  });

  socket.on("ready", (_payload, ack) => {
    const room = getRoomBySocket(socket.id);
    if (!room) {
      ack?.({ ok: false, error: "Room not found" });
      return;
    }
    if (room.status !== "focus") {
      ack?.({ ok: false, error: "Not in focus phase" });
      return;
    }

    const allReady = markReady(room, socket.id);
    if (allReady) {
      startPlaying(room);
      io.to(room.roomCode).emit("focusPhase", {
        active: false,
        reason: "all-ready",
      });
    }

    broadcastGameState(room);
    ack?.({ ok: true });
  });

  socket.on("stopRound", (_payload, ack) => {
    const room = getRoomBySocket(socket.id);
    if (!room) {
      ack?.({ ok: false, error: "Room not found" });
      return;
    }
    if (room.status !== "playing") {
      ack?.({ ok: false, error: "Round is not currently playing" });
      return;
    }

    pauseToFocus(room);
    io.to(room.roomCode).emit("focusPhase", {
      active: true,
      reason: "manual-stop",
    });
    broadcastGameState(room);
    ack?.({ ok: true });
  });

  socket.on("playCard", ({ value }, ack) => {
    const room = getRoomBySocket(socket.id);
    if (!room) {
      ack?.({ ok: false, error: "Room not found" });
      return;
    }
    if (room.status !== "playing") {
      ack?.({ ok: false, error: "Round is not active" });
      return;
    }

    setTimeout(() => {
      const result = tryPlayCard(room, socket.id, Number(value));
      if (!result.ok) {
        ack?.(result);
        return;
      }

      io.to(room.roomCode).emit("cardPlayed", {
        playerId: result.playerId,
        value: result.playedValue,
        correct: result.correct,
      });

      if (!result.correct) {
        io.to(room.roomCode).emit("lifeLost", {
          playerId: result.playerId,
          playedValue: result.playedValue,
          discarded: result.discarded,
          livesRemaining: room.lives,
        });

        if (room.lives <= 0 || isGameOver(room)) {
          room.status = "lost";
          io.to(room.roomCode).emit("gameEnd", { result: "lost" });
          broadcastGameState(room);
          ack?.({ ok: true, correct: false, gameEnded: true });
          return;
        }

        const previewHands = restartCurrentRoundAfterMistake(room);
        io.to(room.roomCode).emit("roundFailed", {
          playedValue: result.playedValue,
          playerId: result.playerId,
          livesRemaining: room.lives,
          previewHands,
        });
        io.to(room.roomCode).emit("focusPhase", {
          active: true,
          reason: "round-restart",
        });
      }

      if (shouldRoundComplete(room)) {
        const completedRound = room.round;
        const rewards = applyRoundRewards(room, completedRound);
        io.to(room.roomCode).emit("roundComplete", {
          round: completedRound,
          rewards,
        });

        if (completedRound >= 12) {
          room.status = "won";
          io.to(room.roomCode).emit("gameEnd", { result: "won" });
          broadcastGameState(room);
          ack?.({ ok: true, correct: result.correct, gameEnded: true });
          return;
        }

        beginNextRound(room);
        io.to(room.roomCode).emit("focusPhase", {
          active: true,
          reason: "round-start",
        });
      }

      broadcastGameState(room);
      ack?.({ ok: true, correct: result.correct });
    }, 400);
  });

  socket.on("suggestStar", (_payload, ack) => {
    const room = getRoomBySocket(socket.id);
    if (!room) {
      ack?.({ ok: false, error: "Room not found" });
      return;
    }
    if (room.status !== "playing") {
      ack?.({ ok: false, error: "Round is not active" });
      return;
    }

    const result = startStarSuggestion(room, socket.id);
    if (!result.ok) {
      ack?.(result);
      return;
    }

    broadcastGameState(room);
    ack?.({ ok: true });
  });

  socket.on("confirmStar", (_payload, ack) => {
    const room = getRoomBySocket(socket.id);
    if (!room) {
      ack?.({ ok: false, error: "Room not found" });
      return;
    }
    if (room.status !== "playing") {
      ack?.({ ok: false, error: "Round is not active" });
      return;
    }

    const result = confirmStar(room, socket.id);
    if (!result.ok) {
      ack?.(result);
      return;
    }

    if (result.resolved) {
      io.to(room.roomCode).emit("cardPlayed", {
        playerId: "system",
        value: null,
        correct: true,
        revealed: result.revealed,
        viaStar: true,
      });

      if (shouldRoundComplete(room)) {
        const completedRound = room.round;
        const rewards = applyRoundRewards(room, completedRound);
        io.to(room.roomCode).emit("roundComplete", {
          round: completedRound,
          rewards,
        });

        if (completedRound >= 12) {
          room.status = "won";
          io.to(room.roomCode).emit("gameEnd", { result: "won" });
        } else {
          beginNextRound(room);
          io.to(room.roomCode).emit("focusPhase", {
            active: true,
            reason: "round-start",
          });
        }
      }
    }

    broadcastGameState(room);
    ack?.({ ok: true, resolved: result.resolved });
  });

  socket.on("disconnect", () => {
    const code = playerToRoom.get(socket.id);
    if (!code) {
      return;
    }

    const room = rooms.get(code);
    playerToRoom.delete(socket.id);
    if (!room) {
      return;
    }

    room.players = room.players.filter((p) => p.id !== socket.id);
    if (room.players.length === 0) {
      rooms.delete(code);
      return;
    }

    if (room.hostId === socket.id) {
      room.hostId = room.players[0].id;
    }

    if (
      room.status !== "waiting" &&
      room.players.length < 2 &&
      room.status !== "won"
    ) {
      room.status = "lost";
      io.to(code).emit("gameEnd", {
        result: "lost",
        reason: "not-enough-players",
      });
    }

    io.to(code).emit("roomUpdate", getPublicRoom(room));
    broadcastGameState(room);
  });
});

function getRoomBySocket(socketId) {
  const roomCode = playerToRoom.get(socketId);
  return roomCode ? rooms.get(roomCode) : null;
}

function broadcastGameState(room) {
  room.players.forEach((player) => {
    io.to(player.id).emit("gameUpdate", getPlayerGameView(room, player.id));
  });
  io.to(room.roomCode).emit("roomUpdate", getPublicRoom(room));
}

function normalizeName(value) {
  const safe = `${value || ""}`.trim().slice(0, 24);
  return safe;
}

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`The Mind server running on ${PORT}`);
});
