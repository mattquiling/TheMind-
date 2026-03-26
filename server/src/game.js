const MAX_ROUNDS = 12;
const MAX_LIVES = 5;
const MAX_STARS = 3;
const REWARDS = {
  2: { stars: 1 },
  3: { lives: 1 },
  5: { stars: 1 },
  6: { lives: 1 },
  8: { stars: 1 },
  9: { lives: 1 },
};

export function createInitialRoom(roomCode, hostSocketId, hostName) {
  return {
    roomCode,
    hostId: hostSocketId,
    players: [
      {
        id: hostSocketId,
        name: hostName,
        cards: [],
        ready: false,
        agreedStar: false,
      },
    ],
    round: 1,
    lives: MAX_LIVES,
    throwingStars: 0,
    deck: [],
    playedCards: [],
    status: "waiting",
    starSuggestionBy: null,
    revealedMistakeCards: [],
    roundInitialHands: [],
  };
}

export function generateRoomCode(existingCodes) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let i = 0; i < 5000; i += 1) {
    let code = "";
    for (let j = 0; j < 5; j += 1) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    if (!existingCodes.has(code)) {
      return code;
    }
  }
  throw new Error("Unable to generate room code");
}

export function canStartGame(room) {
  return room.players.length >= 2;
}

export function startGame(room) {
  room.round = 1;
  room.lives = MAX_LIVES;
  room.throwingStars = 0;
  room.playedCards = [];
  room.revealedMistakeCards = [];
  room.starSuggestionBy = null;
  room.status = "focus";
  dealRound(room);
  resetReady(room);
}

export function beginNextRound(room) {
  room.round += 1;
  if (room.round > MAX_ROUNDS) {
    room.status = "won";
    return;
  }
  room.playedCards = [];
  room.revealedMistakeCards = [];
  room.starSuggestionBy = null;
  room.status = "focus";
  dealRound(room);
  resetReady(room);
}

export function dealRound(room) {
  const deck = makeShuffledDeck();
  room.deck = deck;
  room.players.forEach((player) => {
    player.cards = deck.splice(0, room.round).sort((a, b) => a - b);
    player.ready = false;
    player.agreedStar = false;
  });
  room.roundInitialHands = room.players.map((player) => ({
    playerId: player.id,
    name: player.name,
    cards: [...player.cards],
  }));
}

export function restartCurrentRoundAfterMistake(room) {
  const previewHands = (room.roundInitialHands || []).map((entry) => ({
    playerId: entry.playerId,
    name: entry.name,
    cards: [...entry.cards],
  }));

  room.playedCards = [];
  room.revealedMistakeCards = [];
  room.starSuggestionBy = null;
  room.status = "focus";
  dealRound(room);
  resetReady(room);

  return previewHands;
}

export function markReady(room, playerId) {
  const player = room.players.find((p) => p.id === playerId);
  if (!player) {
    return false;
  }
  player.ready = true;
  return room.players.every((p) => p.ready);
}

export function pauseToFocus(room) {
  room.status = "focus";
  resetReady(room);
}

export function startPlaying(room) {
  room.status = "playing";
  room.starSuggestionBy = null;
  room.players.forEach((p) => {
    p.agreedStar = false;
  });
}

export function tryPlayCard(room, playerId, value) {
  const player = room.players.find((p) => p.id === playerId);
  if (!player) {
    return { ok: false, reason: "Player not found" };
  }
  if (typeof value !== "number") {
    return { ok: false, reason: "Card value must be a number" };
  }

  const cardIndex = player.cards.indexOf(value);
  if (cardIndex === -1) {
    return { ok: false, reason: "Card not in hand" };
  }

  const playerLowest = player.cards[0];
  if (value !== playerLowest) {
    return { ok: false, reason: "Must play your lowest card first" };
  }

  const globalLowest = getGlobalLowestCard(room);
  player.cards.splice(cardIndex, 1);
  room.playedCards.push(value);

  if (value === globalLowest) {
    room.revealedMistakeCards = [];
    return {
      ok: true,
      correct: true,
      playedValue: value,
      playerId,
    };
  }

  room.lives -= 1;
  const discarded = [];
  room.players.forEach((p) => {
    const lowerCards = p.cards.filter((c) => c < value);
    if (lowerCards.length > 0) {
      discarded.push(
        ...lowerCards.map((card) => ({ playerId: p.id, value: card })),
      );
      p.cards = p.cards.filter((c) => c >= value);
    }
  });

  discarded.sort((a, b) => a.value - b.value);
  room.revealedMistakeCards = discarded.map((c) => c.value);

  return {
    ok: true,
    correct: false,
    playedValue: value,
    playerId,
    discarded: discarded.map((item) => item.value),
    livesRemaining: room.lives,
  };
}

export function shouldRoundComplete(room) {
  return room.players.every((p) => p.cards.length === 0);
}

export function applyRoundRewards(room, completedRound) {
  const reward = REWARDS[completedRound];
  if (!reward) {
    return { livesGained: 0, starsGained: 0 };
  }

  const beforeLives = room.lives;
  const beforeStars = room.throwingStars;

  if (reward.lives) {
    room.lives = Math.min(MAX_LIVES, room.lives + reward.lives);
  }
  if (reward.stars) {
    room.throwingStars = Math.min(MAX_STARS, room.throwingStars + reward.stars);
  }

  return {
    livesGained: room.lives - beforeLives,
    starsGained: room.throwingStars - beforeStars,
  };
}

export function startStarSuggestion(room, playerId) {
  if (room.throwingStars <= 0) {
    return { ok: false, reason: "No throwing stars remaining" };
  }
  if (room.starSuggestionBy) {
    return { ok: false, reason: "A star vote is already active" };
  }

  room.starSuggestionBy = playerId;
  room.players.forEach((p) => {
    p.agreedStar = p.id === playerId;
  });

  return { ok: true };
}

export function confirmStar(room, playerId) {
  if (!room.starSuggestionBy) {
    return { ok: false, reason: "No active star vote" };
  }

  const player = room.players.find((p) => p.id === playerId);
  if (!player) {
    return { ok: false, reason: "Player not found" };
  }

  player.agreedStar = true;
  const allAgreed = room.players.every((p) => p.agreedStar);
  if (!allAgreed) {
    return { ok: true, resolved: false };
  }

  room.throwingStars -= 1;
  const revealed = [];
  room.players.forEach((p) => {
    if (p.cards.length > 0) {
      const discarded = p.cards.shift();
      revealed.push({ playerId: p.id, value: discarded });
    }
    p.agreedStar = false;
  });
  room.starSuggestionBy = null;
  room.revealedMistakeCards = revealed
    .map((r) => r.value)
    .sort((a, b) => a - b);

  return {
    ok: true,
    resolved: true,
    revealed: revealed.map((r) => r.value).sort((a, b) => a - b),
  };
}

export function getPublicRoom(room) {
  return {
    roomCode: room.roomCode,
    hostId: room.hostId,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      cardCount: p.cards.length,
    })),
    status: room.status,
  };
}

export function getPlayerGameView(room, playerId) {
  return {
    roomCode: room.roomCode,
    round: room.round,
    lives: room.lives,
    throwingStars: room.throwingStars,
    status: room.status,
    playedCards: [...room.playedCards],
    revealedMistakeCards: [...room.revealedMistakeCards],
    starSuggestionBy: room.starSuggestionBy,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      cardCount: p.cards.length,
      isHost: p.id === room.hostId,
      isReady: p.ready,
      agreedStar: p.agreedStar,
      cards: p.id === playerId ? [...p.cards] : undefined,
    })),
  };
}

export function getGlobalLowestCard(room) {
  let min = Infinity;
  room.players.forEach((p) => {
    if (p.cards.length > 0 && p.cards[0] < min) {
      min = p.cards[0];
    }
  });
  return min;
}

export function resetReady(room) {
  room.players.forEach((p) => {
    p.ready = false;
  });
}

export function isGameOver(room) {
  return room.lives <= 0 || room.status === "won";
}

function makeShuffledDeck() {
  const deck = Array.from({ length: 100 }, (_, i) => i + 1);
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
