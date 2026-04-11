import { io, Socket } from 'socket.io-client';

export interface GameTile {
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

export interface GameStateData {
  tiles: GameTile[];
  players: { id: string; name: string; score: number; isConnected: boolean }[];
  hasStarted: boolean;
  isGameOver: boolean;
}

export interface RoomSummary {
  id: string;
  name: string;
  currentPlayers: number;
  requiredPlayers: number;
  hasStarted: boolean;
}

class SocketService {
  private socket: Socket | null = null;
  private isEnabled = false;

  constructor() {
    const socketUrl = (import.meta as any).env.VITE_SOCKET_URL || 
                      'https://mahjong-g3-production.up.railway.app';
    
    this.socket = io(socketUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.isEnabled = true;
    });

    this.socket.on('connect_error', (error) => {
      console.warn('Connection error:', error);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.isEnabled = false;
    });
  }

  isConnected(): boolean {
    return this.isEnabled && this.socket?.connected === true;
  }

  on(event: string, callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (data: any) => void): void {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    }
  }

  emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  createRoom(name: string, requiredPlayers: number, playerName?: string): void {
    this.emit('room:create', {
      name,
      requiredPlayers,
      playerName: playerName || 'Host',
    });
  }

  joinRoom(roomId: string, playerName: string): void {
    this.emit('room:join', {
      roomId,
      name: playerName,
    });
  }

  submitTileMatch(tileIds: number[]): void {
    if (tileIds.length === 2) {
      this.emit('tile:select', { tileIds });
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

export const socketService = new SocketService();
