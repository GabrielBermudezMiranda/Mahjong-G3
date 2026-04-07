import { GameState, Player, ScoreSnapshot, Tile } from "./types";

interface SelectTileResult {
  newState: GameState;
  event: string | null;
}

function shuffleInPlace<T>(items: T[]): void {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

function buildScoreSnapshot(players: Player[], timestamp: number): ScoreSnapshot {
  const scores: Record<string, number> = {};
  for (const player of players) {
    scores[player.id] = player.score;
  }
  return { timestamp, scores };
}

function getPlayerSelectedTiles(state: GameState, playerId: string): Tile[] {
  return state.tiles.filter(
    (tile) =>
      tile.lockedBy === playerId && !tile.isMatched && tile.isFlipped,
  );
}

export function createGame(pairCount: number, requiredPlayers = 5): GameState {
  const safePairCount = Math.max(1, pairCount);
  const safeRequiredPlayers = Math.max(2, Math.min(8, requiredPlayers));
  const tiles: Tile[] = [];

  for (let pairIndex = 0; pairIndex < safePairCount; pairIndex += 1) {
    const symbol = `S${pairIndex + 1}`;
    tiles.push({
      id: `tile-${pairIndex * 2 + 1}`,
      symbol,
      isFlipped: false,
      isMatched: false,
      lockedBy: null,
    });
    tiles.push({
      id: `tile-${pairIndex * 2 + 2}`,
      symbol,
      isFlipped: false,
      isMatched: false,
      lockedBy: null,
    });
  }

  shuffleInPlace(tiles);

  return {
    tiles,
    players: [],
    scoreHistory: [],
    isGameOver: false,
    startTime: null,
    requiredPlayers: safeRequiredPlayers,
    hasStarted: false,
  };
}

export function addPlayer(
  state: GameState,
  playerId: string,
  name: string,
): GameState {
  const trimmedName = name.trim();
  const playerName = trimmedName.length > 0 ? trimmedName : "Player";

  const existingPlayerIndex = state.players.findIndex((p) => p.id === playerId);
  const now = Date.now();

  if (existingPlayerIndex !== -1) {
    const players = [...state.players];
    players[existingPlayerIndex] = {
      ...players[existingPlayerIndex],
      name: playerName,
      isConnected: true,
    };

    const connectedPlayers = players.filter((player) => player.isConnected).length;
    const hasStarted = state.hasStarted || connectedPlayers >= state.requiredPlayers;

    return {
      ...state,
      players,
      hasStarted,
      startTime: hasStarted ? state.startTime ?? now : state.startTime,
    };
  }

  if (state.players.length >= state.requiredPlayers) {
    return state;
  }

  const players = [
    ...state.players,
    {
      id: playerId,
      name: playerName,
      score: 0,
      isConnected: true,
    },
  ];

  const connectedPlayers = players.filter((player) => player.isConnected).length;
  const hasStarted = state.hasStarted || connectedPlayers >= state.requiredPlayers;

  return {
    ...state,
    players,
    scoreHistory: [...state.scoreHistory, buildScoreSnapshot(players, now)],
    hasStarted,
    startTime: hasStarted ? state.startTime ?? now : state.startTime,
  };
}

export function removePlayer(state: GameState, playerId: string): GameState {
  const players = state.players.map((player) =>
    player.id === playerId ? { ...player, isConnected: false } : player,
  );

  const tiles = state.tiles.map((tile) => {
    if (tile.lockedBy !== playerId) return tile;
    if (tile.isMatched) return { ...tile, lockedBy: null };
    return { ...tile, lockedBy: null, isFlipped: false };
  });

  return {
    ...state,
    players,
    tiles,
  };
}

export function selectTile(
  state: GameState,
  tileId: string,
  playerId: string,
): SelectTileResult {
  const hasPlayer = state.players.some((player) => player.id === playerId);
  if (!hasPlayer) return { newState: state, event: null };
  if (!state.hasStarted) return { newState: state, event: null };
  if (state.isGameOver) return { newState: state, event: null };

  const tileIndex = state.tiles.findIndex((tile) => tile.id === tileId);
  if (tileIndex === -1) return { newState: state, event: null };

  const targetTile = state.tiles[tileIndex];
  if (targetTile.isMatched) return { newState: state, event: null };
  if (targetTile.lockedBy !== null && targetTile.lockedBy !== playerId) {
    return { newState: state, event: null };
  }
  if (targetTile.lockedBy === playerId && targetTile.isFlipped) {
    return { newState: state, event: null };
  }

  const selectedBefore = getPlayerSelectedTiles(state, playerId);
  if (selectedBefore.length >= 2) {
    return { newState: state, event: null };
  }

  const tiles = [...state.tiles];
  tiles[tileIndex] = {
    ...targetTile,
    lockedBy: playerId,
    isFlipped: true,
  };

  let newState: GameState = {
    ...state,
    tiles,
  };

  const selectedAfter = getPlayerSelectedTiles(newState, playerId);
  if (selectedAfter.length === 2) {
    const [t1, t2] = selectedAfter;
    const result = checkMatch(newState, t1.id, t2.id, playerId);
    newState = result.newState;
    return {
      newState,
      event: result.isMatch ? "tiles:match" : "tiles:mismatch",
    };
  }

  return {
    newState,
    event: "tile:selected",
  };
}

export function checkMatch(
  state: GameState,
  t1: string,
  t2: string,
  playerId: string,
): { newState: GameState; isMatch: boolean } {
  if (t1 === t2) return { newState: state, isMatch: false };

  const idx1 = state.tiles.findIndex((tile) => tile.id === t1);
  const idx2 = state.tiles.findIndex((tile) => tile.id === t2);
  if (idx1 === -1 || idx2 === -1) return { newState: state, isMatch: false };

  const tile1 = state.tiles[idx1];
  const tile2 = state.tiles[idx2];
  if (tile1.isMatched || tile2.isMatched) return { newState: state, isMatch: false };
  if (tile1.lockedBy !== playerId || tile2.lockedBy !== playerId) {
    return { newState: state, isMatch: false };
  }

  const isMatch = tile1.symbol === tile2.symbol;
  const tiles = [...state.tiles];
  const now = Date.now();

  if (isMatch) {
    tiles[idx1] = { ...tile1, isMatched: true, lockedBy: null, isFlipped: true };
    tiles[idx2] = { ...tile2, isMatched: true, lockedBy: null, isFlipped: true };

    const players = state.players.map((player) =>
      player.id === playerId ? { ...player, score: player.score + 1 } : player,
    );

    const isGameOver = tiles.every((tile) => tile.isMatched);
    return {
      newState: {
        ...state,
        tiles,
        players,
        scoreHistory: [...state.scoreHistory, buildScoreSnapshot(players, now)],
        isGameOver,
      },
      isMatch: true,
    };
  }

  tiles[idx1] = { ...tile1, isFlipped: false, lockedBy: null };
  tiles[idx2] = { ...tile2, isFlipped: false, lockedBy: null };

  return {
    newState: {
      ...state,
      tiles,
    },
    isMatch: false,
  };
}
