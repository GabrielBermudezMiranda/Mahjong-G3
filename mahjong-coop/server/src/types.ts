export interface Tile {
  id: string;
  symbol: string;
  isFlipped: boolean;
  isMatched: boolean;
  lockedBy: string | null;
}

export interface Player {
  id: string;
  name: string;
  score: number;
  isConnected: boolean;
}

export interface ScoreSnapshot {
  timestamp: number;
  scores: Record<string, number>;
}

export interface GameState {
  tiles: Tile[];
  players: Player[];
  scoreHistory: ScoreSnapshot[];
  isGameOver: boolean;
  startTime: number | null;
  requiredPlayers: number;
  hasStarted: boolean;
}

export interface RoomSummary {
  id: string;
  name: string;
  currentPlayers: number;
  requiredPlayers: number;
  hasStarted: boolean;
}
