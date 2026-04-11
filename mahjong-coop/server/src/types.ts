export interface Tile {
  id: number;
  x: number;
  y: number;
  z: number;
  symbol: string;
  category: string;
  value: number;
  isMatched: boolean;
  isSelected: boolean;
  isHinted: boolean;
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
