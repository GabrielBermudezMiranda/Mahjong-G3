/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RotateCcw, 
  Undo2, 
  Lightbulb, 
  Shuffle, 
  Maximize2, 
  Minimize2,
  Trophy,
  AlertCircle,
  Play,
  LogOut,
  Palette,
  Sun,
  Moon,
  Users,
  Plus,
  ArrowRight,
  Copy,
  Check,
  Loader2,
  TrendingUp,
  BookOpen,
  Layers,
  Zap,
  Target
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

// --- Tipos y Constantes ---

type TableTheme = {
  id: string;
  name: string;
  url: string;
  color: string;
};

const TABLE_THEMES: TableTheme[] = [
  { 
    id: 'green', 
    name: 'Verde', 
    url: 'https://tuieldonbxswmopvyryx.supabase.co/storage/v1/object/public/mahjong/verde_mesa.jpg',
    color: '#065f46'
  },
  { 
    id: 'blue', 
    name: 'Azul', 
    url: 'https://tuieldonbxswmopvyryx.supabase.co/storage/v1/object/public/mahjong/azul_mesa.jpg',
    color: '#1e3a8a'
  },
  { 
    id: 'red', 
    name: 'Rojo', 
    url: 'https://tuieldonbxswmopvyryx.supabase.co/storage/v1/object/public/mahjong/rojo_mesa.jpg',
    color: '#7f1d1d'
  },
];

type TileType = {
  id: number;
  x: number;
  y: number;
  z: number;
  symbol: string;
  category: string; // 'dots', 'bamboo', 'chars', 'winds', 'dragons', 'seasons', 'flowers'
  value: number;
  isMatched: boolean;
  isSelected: boolean;
  isHinted: boolean;
};

const TILE_WIDTH = 48;
const TILE_HEIGHT = 68;
const DEPTH_OFFSET = 5;

const SYMBOLS = {
  dots: ['🀙', '🀚', '🀛', '🀜', '🀝', '🀞', '🀟', '🀠', '🀡'],
  bamboo: ['🀐', '🀑', '🀒', '🀓', '🀔', '🀕', '🀖', '🀗', '🀘'],
  chars: ['🀇', '🀈', '🀉', '🀊', '🀋', '🀌', '🀍', '🀎', '🀏'],
  winds: ['🀀', '🀁', '🀂', '🀃'],
  dragons: ['🀄', '🀅', '🀆'],
  seasons: ['🀦', '🀧', '🀨', '🀩'],
  flowers: ['🀢', '🀣', '🀤', '🀥'],
};

// --- Generación del Tablero ---

const generateTurtleLayout = () => {
  const positions: { x: number; y: number; z: number }[] = [];

  // Capa 0 (Base - 82 fichas)
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 12; c++) {
      // Omitir esquinas para dar forma redondeada
      if ((r === 0 || r === 7) && (c < 1 || c > 10)) continue;
      if ((r === 1 || r === 6) && (c < 2 || c > 9)) continue;
      positions.push({ x: c + 1, y: r + 1, z: 0 });
    }
  }
  // Extensiones laterales (Alas)
  positions.push({ x: 0, y: 4.5, z: 0 });
  positions.push({ x: 13, y: 4.5, z: 0 });
  positions.push({ x: 14, y: 4.5, z: 0 });

  // Capa 1 (38 fichas)
  for (let r = 2; r < 8; r++) {
    for (let c = 3; c < 9; c++) {
      positions.push({ x: c + 0.5, y: r + 0.5, z: 1 });
    }
  }
  // Ajuste para llegar a 144 (actualmente 82+36=118)
  // Vamos a usar una formación más fiel a la tortuga clásica de 144
  return getClassicTurtlePositions();
};

function getClassicTurtlePositions() {
  const pos: { x: number; y: number; z: number }[] = [];
  
  // Capa 0: 87 fichas
  // Bloque central 12x6
  for (let y = 1; y <= 6; y++) {
    for (let x = 2; x <= 13; x++) {
      pos.push({ x, y, z: 0 });
    }
  }
  // Filas superior e inferior (6 cada una)
  for (let x = 4; x <= 9; x++) {
    pos.push({ x, y: 0, z: 0 });
    pos.push({ x, y: 7, z: 0 });
  }
  // Alas laterales
  pos.push({ x: 1, y: 3.5, z: 0 });
  pos.push({ x: 14, y: 3.5, z: 0 });
  pos.push({ x: 15, y: 3.5, z: 0 });
  
  // Capa 1: 6x6 = 36 fichas
  for (let y = 1; y <= 6; y++) {
    for (let x = 4; x <= 9; x++) {
      pos.push({ x: x + 0.5, y: y + 0.5, z: 1 });
    }
  }
  
  // Capa 2: 4x4 = 16 fichas
  for (let y = 2; y <= 5; y++) {
    for (let x = 5; x <= 8; x++) {
      pos.push({ x: x + 1, y: y + 1, z: 2 });
    }
  }
  
  // Capa 3: 2x2 = 4 fichas
  for (let y = 3; y <= 4; y++) {
    for (let x = 6; x <= 7; x++) {
      pos.push({ x: x + 1.5, y: y + 1.5, z: 3 });
    }
  }
  
  // Capa 4: 1 ficha (Cima)
  pos.push({ x: 8, y: 4.5, z: 4 });

  return pos.slice(0, 144);
}

const createTiles = (positions: { x: number; y: number; z: number }[]): TileType[] => {
  const types: { symbol: string; category: string; value: number }[] = [];
  
  // 3 suits * 9 numbers * 4 each = 108
  ['dots', 'bamboo', 'chars'].forEach(cat => {
    SYMBOLS[cat as keyof typeof SYMBOLS].forEach((sym, i) => {
      for (let k = 0; k < 4; k++) types.push({ symbol: sym, category: cat, value: i });
    });
  });
  // 4 winds * 4 each = 16
  SYMBOLS.winds.forEach((sym, i) => {
    for (let k = 0; k < 4; k++) types.push({ symbol: sym, category: 'winds', value: i });
  });
  // 3 dragons * 4 each = 12
  SYMBOLS.dragons.forEach((sym, i) => {
    for (let k = 0; k < 4; k++) types.push({ symbol: sym, category: 'dragons', value: i });
  });
  // 4 seasons * 1 each = 4
  SYMBOLS.seasons.forEach((sym, i) => {
    types.push({ symbol: sym, category: 'seasons', value: i });
  });
  // 4 flowers * 1 each = 4
  SYMBOLS.flowers.forEach((sym, i) => {
    types.push({ symbol: sym, category: 'flowers', value: i });
  });

  // Mezclar tipos
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }

  return positions.map((pos, i) => ({
    id: i,
    ...pos,
    ...types[i],
    isMatched: false,
    isSelected: false,
    isHinted: false,
  }));
};

// --- Componente Principal ---

type GameState = 'welcome' | 'menu' | 'matchmaking' | 'lobby' | 'loading' | 'playing';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('welcome');
  const [playerName, setPlayerName] = useState('');
  const [tempName, setTempName] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [playerCount, setPlayerCount] = useState(1);
  const [roomName, setRoomName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [matchmakingMode, setMatchmakingMode] = useState<'create' | 'join'>('create');
  const [currentPlayers, setCurrentPlayers] = useState(1);
  const [isCopied, setIsCopied] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [tiles, setTiles] = useState<TileType[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [history, setHistory] = useState<TileType[][]>([]);
  const [gameOver, setGameOver] = useState<'win' | 'lose' | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tableTheme, setTableTheme] = useState<TableTheme>(TABLE_THEMES[0]);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [scoreHistory, setScoreHistory] = useState<{ time: number; [key: string]: number }[]>([]);
  const [opponents, setOpponents] = useState<{ name: string; score: number; color: string }[]>([]);
  const [combo, setCombo] = useState(0);
  const [stats, setStats] = useState({ matches: 0, clicks: 0 });

  // Encontrar parejas disponibles
  const getAvailablePairsCount = useCallback(() => {
    const activeTiles = tiles.filter(t => !t.isMatched && isSelectable(t, tiles));
    let pairs = 0;
    const seen = new Set<number>();

    for (let i = 0; i < activeTiles.length; i++) {
      if (seen.has(activeTiles[i].id)) continue;
      for (let j = i + 1; j < activeTiles.length; j++) {
        if (seen.has(activeTiles[j].id)) continue;
        if (areMatching(activeTiles[i], activeTiles[j])) {
          pairs++;
          seen.add(activeTiles[i].id);
          seen.add(activeTiles[j].id);
          break;
        }
      }
    }
    return pairs;
  }, [tiles]);

  // Inicializar juego
  const initGame = useCallback(() => {
    const positions = getClassicTurtlePositions();
    const newTiles = createTiles(positions);
    setTiles(newTiles);
    setSelectedId(null);
    setScore(0);
    setTime(0);
    setIsActive(true);
    setHistory([]);
    setGameOver(null);
    setScoreHistory([{ time: 0, [playerName || 'Tú']: 0 }]);
    setCombo(0);
    setStats({ matches: 0, clicks: 0 });
    
    // Generar oponentes si es multijugador
    if (playerCount > 1) {
      const names = ['Sun Tzu', 'Zhuge Liang', 'Laozi', 'Confucio'];
      const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444'];
      const newOpponents = names.slice(0, playerCount - 1).map((name, i) => ({
        name,
        score: 0,
        color: colors[i]
      }));
      setOpponents(newOpponents);
      
      // Añadir oponentes al historial inicial
      setScoreHistory(prev => [{
        ...prev[0],
        ...newOpponents.reduce((acc, op) => ({ ...acc, [op.name]: 0 }), {})
      }]);
    } else {
      setOpponents([]);
    }
  }, [playerName, playerCount]);

  const generateCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateRoom = () => {
    if (!roomName.trim()) return;
    const code = generateCode();
    setRoomCode(code);
    setCurrentPlayers(1);
    setGameState('lobby');
  };

  const handleJoinRoom = () => {
    if (inputCode.length !== 6) return;
    setRoomCode(inputCode.toUpperCase());
    setRoomName("SALA DE JUEGO");
    setCurrentPlayers(Math.floor(Math.random() * (playerCount - 1)) + 1);
    setGameState('lobby');
  };

  const startMatch = () => {
    setGameState('loading');
    setLoadingProgress(0);
    
    // Simular carga
    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setGameState('playing');
            initGame();
          }, 500);
          return 100;
        }
        return prev + 5;
      });
    }, 100);
  };

  // Simular llegada de jugadores en el lobby
  useEffect(() => {
    if (gameState === 'lobby' && currentPlayers < playerCount) {
      const timer = setTimeout(() => {
        setCurrentPlayers(prev => prev + 1);
      }, 2000 + Math.random() * 3000);
      return () => clearTimeout(timer);
    }
  }, [gameState, currentPlayers, playerCount]);

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const backToMenu = () => {
    setGameState('menu');
    setIsActive(false);
  };

  useEffect(() => {
    if (gameState === 'playing' && tiles.length === 0) {
      initGame();
    }
  }, [gameState, initGame, tiles.length]);

  // Cronómetro
  useEffect(() => {
    let interval: any = null;
    if (isActive && !gameOver && gameState === 'playing') {
      interval = setInterval(() => {
        setTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, gameOver, gameState]);

  // Lógica de selección
  const isSelectable = (tile: TileType, allTiles: TileType[]) => {
    if (tile.isMatched) return false;

    const activeTiles = allTiles.filter(t => !t.isMatched);
    
    // 1. Verificar si hay algo encima
    // Una ficha está encima si z' > z y hay solapamiento significativo
    const hasTop = activeTiles.some(t => 
      t.z > tile.z && 
      Math.abs(t.x - tile.x) < 1 && 
      Math.abs(t.y - tile.y) < 1
    );
    if (hasTop) return false;

    // 2. Verificar si tiene lados libres (Izquierda O Derecha)
    // Se considera bloqueada si tiene fichas a la izquierda Y a la derecha en su mismo nivel
    const hasLeft = activeTiles.some(t => 
      t.z === tile.z && 
      t.x <= tile.x - 1 && t.x > tile.x - 2 &&
      Math.abs(t.y - tile.y) < 1
    );
    const hasRight = activeTiles.some(t => 
      t.z === tile.z && 
      t.x >= tile.x + 1 && t.x < tile.x + 2 &&
      Math.abs(t.y - tile.y) < 1
    );

    return !hasLeft || !hasRight;
  };

  const areMatching = (t1: TileType, t2: TileType) => {
    if (t1.category === 'seasons' && t2.category === 'seasons') return true;
    if (t1.category === 'flowers' && t2.category === 'flowers') return true;
    return t1.symbol === t2.symbol;
  };

  // Simular progreso de oponentes
  useEffect(() => {
    if (gameState === 'playing' && playerCount > 1 && isActive && !gameOver) {
      const interval = setInterval(() => {
        setOpponents(prev => prev.map(op => ({
          ...op,
          score: op.score + Math.floor(Math.random() * 30)
        })));
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [gameState, playerCount, isActive, gameOver]);

  // Actualizar historial de puntuación cada 2 segundos
  useEffect(() => {
    if (gameState === 'playing' && isActive && !gameOver && time % 2 === 0) {
      const newEntry = {
        time: time,
        [playerName || 'Tú']: score,
        ...opponents.reduce((acc, op) => ({ ...acc, [op.name]: op.score }), {})
      };
      setScoreHistory(prev => {
        // Evitar duplicados para el mismo tiempo
        if (prev.length > 0 && prev[prev.length - 1].time === time) return prev;
        return [...prev.slice(-29), newEntry];
      });
    }
  }, [time, gameState, isActive, gameOver, score, opponents, playerName]);

  const handleTileClick = (id: number) => {
    const tile = tiles.find(t => t.id === id);
    
    // Si no es seleccionable o el juego terminó, solo limpiamos pistas
    if (!tile || !isSelectable(tile, tiles) || gameOver) {
      setTiles(prev => prev.map(t => ({ ...t, isHinted: false })));
      return;
    }

    if (selectedId === null) {
      setStats(prev => ({ ...prev, clicks: prev.clicks + 1 }));
      setTiles(prev => prev.map(t => 
        t.id === id 
        ? { ...t, isSelected: true, isHinted: false } 
        : { ...t, isSelected: false, isHinted: false }
      ));
      setSelectedId(id);
    } else if (selectedId === id) {
      setTiles(prev => prev.map(t => ({ ...t, isSelected: false, isHinted: false })));
      setSelectedId(null);
    } else {
      setStats(prev => ({ ...prev, clicks: prev.clicks + 1 }));
      const firstTile = tiles.find(t => t.id === selectedId)!;
      if (areMatching(firstTile, tile)) {
        // Match!
        setStats(prev => ({ ...prev, matches: prev.matches + 1 }));
        setCombo(prev => prev + 1);
        setHistory(prev => [[...tiles], ...prev.slice(0, 19)]);
        setTiles(prev => prev.map(t => 
          (t.id === id || t.id === selectedId) 
          ? { ...t, isMatched: true, isSelected: false, isHinted: false } 
          : { ...t, isHinted: false }
        ));
        setScore(prev => prev + 100 + (combo * 20));
        setSelectedId(null);
      } else {
        // No match
        setCombo(0);
        setTiles(prev => prev.map(t => 
          t.id === id 
          ? { ...t, isSelected: true, isHinted: false } 
          : { ...t, isSelected: false, isHinted: false }
        ));
        setSelectedId(id);
      }
    }
  };

  // Funciones de control
  const undo = () => {
    if (history.length > 0) {
      setTiles(history[0]);
      setHistory(prev => prev.slice(1));
      setSelectedId(null);
      setScore(prev => Math.max(0, prev - 50));
    }
  };

  const shuffle = () => {
    const activeTiles = tiles.filter(t => !t.isMatched);
    const symbols = activeTiles.map(t => ({ symbol: t.symbol, category: t.category, value: t.value }));
    
    // Mezclar símbolos
    for (let i = symbols.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [symbols[i], symbols[j]] = [symbols[j], symbols[i]];
    }

    setTiles(prev => {
      let symIdx = 0;
      return prev.map(t => {
        if (t.isMatched) return t;
        const newSym = symbols[symIdx++];
        return { ...t, ...newSym, isSelected: false, isHinted: false };
      });
    });
    setSelectedId(null);
  };

  const getHint = () => {
    const selectable = tiles.filter(t => isSelectable(t, tiles));
    for (let i = 0; i < selectable.length; i++) {
      for (let j = i + 1; j < selectable.length; j++) {
        if (areMatching(selectable[i], selectable[j])) {
          setTiles(prev => prev.map(t => 
            (t.id === selectable[i].id || t.id === selectable[j].id) 
            ? { ...t, isHinted: true } 
            : { ...t, isHinted: false }
          ));
          return;
        }
      }
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Detección de fin de juego
  useEffect(() => {
    if (tiles.length === 0 || gameState !== 'playing') return;
    const remaining = tiles.filter(t => !t.isMatched);
    if (remaining.length === 0) {
      setGameOver('win');
      setIsActive(false);
      return;
    }

    const selectable = remaining.filter(t => isSelectable(t, tiles));
    let possibleMatch = false;
    for (let i = 0; i < selectable.length; i++) {
      for (let j = i + 1; j < selectable.length; j++) {
        if (areMatching(selectable[i], selectable[j])) {
          possibleMatch = true;
          break;
        }
      }
      if (possibleMatch) break;
    }

    if (!possibleMatch && remaining.length > 0) {
      setGameOver('lose');
      setIsActive(false);
    }
  }, [tiles, gameState]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const remainingTilesCount = useMemo(() => tiles.filter(t => !t.isMatched).length, [tiles]);

  if (gameState === 'welcome') {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 transition-colors duration-500 ${isDarkMode ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-900'}`}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`max-w-md w-full p-10 rounded-[40px] border-2 ${isDarkMode ? 'bg-stone-900/80 border-emerald-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)]' : 'bg-white border-stone-200 shadow-2xl'} backdrop-blur-xl text-center space-y-8`}
        >
          <div className="space-y-4">
            <div className="w-20 h-20 bg-stone-100 rounded-2xl mx-auto flex items-center justify-center text-5xl shadow-xl">🀄</div>
            <h2 className="text-3xl font-black tracking-tighter">¡BIENVENIDO!</h2>
            <p className={`text-sm font-medium ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>Ingresa tu nombre para comenzar la partida</p>
          </div>

          <div className="space-y-4">
            <input 
              type="text" 
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="Tu nombre..."
              className={`w-full px-6 py-4 rounded-2xl border-2 outline-none transition-all font-bold text-lg ${
                isDarkMode 
                ? 'bg-stone-800 border-stone-700 text-white focus:border-emerald-500/50' 
                : 'bg-stone-50 border-stone-200 text-stone-900 focus:border-emerald-500'
              }`}
              onKeyDown={(e) => e.key === 'Enter' && tempName.trim() && (setPlayerName(tempName), setGameState('menu'))}
            />
            <button 
              disabled={!tempName.trim()}
              onClick={() => {
                setPlayerName(tempName);
                setGameState('menu');
              }}
              className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500 text-emerald-950 font-black text-xl rounded-2xl transition-all shadow-lg active:scale-95"
            >
              CONTINUAR
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (gameState === 'menu') {
    return (
      <div className="min-h-screen bg-stone-950 text-white flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
        {/* Background Accents for Menu */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-emerald-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-emerald-900/20 blur-[120px] rounded-full" />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl w-full text-center space-y-12 relative z-10"
        >
          <div className="space-y-4">
            <motion.div 
              animate={{ rotateY: [0, 360] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="w-24 h-24 bg-stone-100 rounded-xl mx-auto flex items-center justify-center text-6xl text-black shadow-[4px_4px_0_#065f46] mb-8"
            >
              🀄
            </motion.div>
            <h1 className="text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-emerald-400 to-emerald-600">
              MAHJONG SOLITAIRE
            </h1>
            <p className="text-emerald-500 text-lg tracking-widest uppercase font-bold">
              Formación Tortuga • Clásico 144
            </p>
            {playerName && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-full border border-emerald-500/20"
              >
                <span className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">
                  Hola, {playerName}
                </span>
              </motion.div>
            )}
          </div>

          <div className="bg-stone-900/80 backdrop-blur-xl border border-emerald-500/20 p-8 rounded-3xl space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={() => {
                  setPlayerCount(1);
                  startMatch();
                }}
                className="group relative overflow-hidden py-8 rounded-2xl bg-emerald-500 text-emerald-950 font-black text-xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg"
              >
                <div className="relative z-10 flex flex-col items-center gap-2">
                  <Play size={32} fill="currentColor" />
                  <span>UN JUGADOR</span>
                </div>
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </button>

              <button 
                onClick={() => {
                  setMatchmakingMode('create');
                  setGameState('matchmaking');
                }}
                className="group relative overflow-hidden py-8 rounded-2xl bg-stone-800 border-2 border-stone-700 text-white font-black text-xl transition-all hover:border-emerald-500/50 hover:scale-[1.02] active:scale-95 shadow-lg"
              >
                <div className="relative z-10 flex flex-col items-center gap-2">
                  <Plus size={32} />
                  <span>CREAR PARTIDA</span>
                </div>
                <div className="absolute inset-0 bg-emerald-500/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </button>
            </div>

            <button 
              onClick={() => {
                setMatchmakingMode('join');
                setGameState('matchmaking');
              }}
              className="w-full py-6 rounded-2xl bg-stone-800/50 border-2 border-stone-700/50 text-stone-400 font-black text-lg transition-all hover:border-emerald-500/30 hover:text-emerald-400 flex items-center justify-center gap-3"
            >
              <Users size={24} />
              UNIRSE A PARTIDA EXISTENTE
            </button>
          </div>

          <p className="text-stone-500 text-xs font-medium">
            © 2026 Mahjong Solitario • Recreación Profesional
          </p>
        </motion.div>
      </div>
    );
  }

  if (gameState === 'matchmaking') {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 transition-colors duration-500 ${isDarkMode ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-900'}`}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`max-w-lg w-full p-10 rounded-[40px] border-2 ${isDarkMode ? 'bg-stone-900/80 border-emerald-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)]' : 'bg-white border-stone-200 shadow-2xl'} backdrop-blur-xl space-y-8`}
        >
          <div className="flex items-center justify-between">
            <button onClick={() => setGameState('menu')} className="p-2 hover:bg-stone-500/10 rounded-full transition-colors">
              <LogOut size={20} className="rotate-180" />
            </button>
            <h2 className="text-2xl font-black tracking-tighter uppercase">
              {matchmakingMode === 'create' ? 'Configurar Sala' : 'Unirse a Sala'}
            </h2>
            <div className="w-10" />
          </div>

          {matchmakingMode === 'create' ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500 ml-2">Nombre de la Sala</label>
                <input 
                  type="text" 
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Ej: Partida de Amigos"
                  className={`w-full px-6 py-4 rounded-2xl border-2 outline-none transition-all font-bold ${
                    isDarkMode ? 'bg-stone-800 border-stone-700 text-white focus:border-emerald-500/50' : 'bg-stone-50 border-stone-200 text-stone-900 focus:border-emerald-500'
                  }`}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500 ml-2">Cantidad de Jugadores</label>
                <div className="grid grid-cols-4 gap-2">
                  {[2, 3, 4, 5].map(num => (
                    <button
                      key={num}
                      onClick={() => setPlayerCount(num)}
                      className={`py-4 rounded-xl text-lg font-black transition-all border-2 ${
                        playerCount === num 
                        ? 'bg-emerald-500 border-emerald-400 text-emerald-950' 
                        : isDarkMode ? 'bg-stone-800 border-stone-700 text-stone-500' : 'bg-stone-50 border-stone-200 text-stone-400'
                      }`}
                    >
                      {num}P
                    </button>
                  ))}
                </div>
              </div>

              <button 
                disabled={!roomName.trim()}
                onClick={handleCreateRoom}
                className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-emerald-950 font-black text-xl rounded-2xl transition-all shadow-lg flex items-center justify-center gap-3"
              >
                CREAR SALA
                <ArrowRight size={24} />
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2 text-center">
                <p className={`text-sm ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>Ingresa el código de 6 dígitos que te compartieron</p>
                <div className="flex justify-center gap-2">
                  <input 
                    type="text" 
                    maxLength={6}
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    placeholder="CÓDIGO"
                    className={`w-full max-w-[240px] px-6 py-5 rounded-2xl border-2 outline-none transition-all font-black text-3xl text-center tracking-[0.5em] ${
                      isDarkMode ? 'bg-stone-800 border-stone-700 text-white focus:border-emerald-500/50' : 'bg-stone-50 border-stone-200 text-stone-900 focus:border-emerald-500'
                    }`}
                  />
                </div>
              </div>

              <button 
                disabled={inputCode.length !== 6}
                onClick={handleJoinRoom}
                className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-emerald-950 font-black text-xl rounded-2xl transition-all shadow-lg flex items-center justify-center gap-3"
              >
                INGRESAR A LA SALA
                <ArrowRight size={24} />
              </button>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  if (gameState === 'lobby') {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 transition-colors duration-500 ${isDarkMode ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-900'}`}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`max-w-lg w-full p-10 rounded-[40px] border-2 ${isDarkMode ? 'bg-stone-900/80 border-emerald-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)]' : 'bg-white border-stone-200 shadow-2xl'} backdrop-blur-xl space-y-10 text-center`}
        >
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 mb-4">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Sala de Espera</span>
            </div>
            <h2 className="text-4xl font-black tracking-tighter uppercase">{roomName}</h2>
            <div className="flex items-center justify-center gap-3">
              <span className={`text-sm font-mono ${isDarkMode ? 'text-stone-500' : 'text-stone-400'}`}>CÓDIGO:</span>
              <span className="text-2xl font-black tracking-widest text-emerald-500">{roomCode}</span>
              <button onClick={copyCode} className="p-2 hover:bg-emerald-500/10 rounded-lg transition-colors text-emerald-500">
                {isCopied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-center gap-4">
              {Array.from({ length: playerCount }).map((_, i) => (
                <motion.div 
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg border-2 transition-all duration-500 ${
                    i < currentPlayers 
                    ? 'bg-emerald-500 border-emerald-400 text-emerald-950' 
                    : isDarkMode ? 'bg-stone-800 border-stone-700 text-stone-600' : 'bg-stone-50 border-stone-200 text-stone-300'
                  }`}
                >
                  {i < currentPlayers ? '👤' : '?'}
                </motion.div>
              ))}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-3 text-emerald-500">
                <Loader2 className="animate-spin" size={20} />
                <span className="font-black text-sm uppercase tracking-widest">
                  {currentPlayers < playerCount ? `Esperando jugadores (${currentPlayers}/${playerCount})` : '¡Sala llena!'}
                </span>
              </div>
              <p className={`text-xs ${isDarkMode ? 'text-stone-500' : 'text-stone-400'}`}>La partida comenzará automáticamente cuando todos estén listos</p>
            </div>
          </div>

          <div className="pt-4 flex gap-4">
            <button 
              onClick={() => setGameState('menu')}
              className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all border-2 ${
                isDarkMode ? 'bg-stone-800 border-stone-700 text-stone-400 hover:text-white' : 'bg-stone-50 border-stone-200 text-stone-500 hover:text-stone-900'
              }`}
            >
              ABANDONAR
            </button>
            <button 
              disabled={currentPlayers < playerCount}
              onClick={startMatch}
              className="flex-[2] py-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-emerald-950 font-black text-lg rounded-2xl transition-all shadow-lg active:scale-95"
            >
              INICIAR PARTIDA
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (gameState === 'loading') {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full space-y-8 text-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-6xl mb-8"
          >
            🀐
          </motion.div>
          <div className="space-y-2">
            <h2 className="text-emerald-500 font-black tracking-[0.3em] uppercase text-xs">
              {playerName ? `PREPARANDO PARTIDA PARA ${playerName}` : 'PREPARANDO TABLERO'}
            </h2>
            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${loadingProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-emerald-200/40 font-mono">
              <span>MEZCLANDO 144 FICHAS</span>
              <span>{loadingProgress}%</span>
            </div>
          </div>
          <p className="text-emerald-200/20 text-xs italic">
            "El Mahjong es el arte de encontrar el orden en el caos..."
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 ${isDarkMode ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-900'} font-sans selection:bg-emerald-500/30 overflow-hidden`}>
      
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 h-16 ${isDarkMode ? 'bg-black/60 border-white/5' : 'bg-white/80 border-black/5'} backdrop-blur-xl border-b flex items-center justify-between px-6 z-50`}>
        <div className="flex items-center gap-8">
          <button 
            onClick={backToMenu}
            className={`text-xl font-bold tracking-tighter ${isDarkMode ? 'text-emerald-500' : 'text-emerald-600'} flex items-center gap-2 hover:opacity-80 transition-opacity`}
          >
            <div className="w-8 h-8 bg-stone-100 rounded flex items-center justify-center text-black shadow-[2px_2px_0_#065f46]">🀄</div>
            MAHJONG
          </button>
          
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
              {playerName || 'Invitado'}
            </span>
          </div>

          <div className={`flex gap-6 text-sm font-medium ${isDarkMode ? 'text-emerald-100/80' : 'text-emerald-900/80'}`}>
            <div className="flex flex-col">
              <span className={`text-[10px] uppercase tracking-widest ${isDarkMode ? 'text-emerald-600' : 'text-emerald-700'}`}>Puntuación</span>
              <span className={`text-lg font-mono ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>{score.toLocaleString()}</span>
            </div>
            <div className="flex flex-col">
              <span className={`text-[10px] uppercase tracking-widest ${isDarkMode ? 'text-emerald-600' : 'text-emerald-700'}`}>Tiempo</span>
              <span className={`text-lg font-mono ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>{formatTime(time)}</span>
            </div>
            <div className="flex flex-col">
              <span className={`text-[10px] uppercase tracking-widest ${isDarkMode ? 'text-emerald-600' : 'text-emerald-700'}`}>Restantes</span>
              <span className={`text-lg font-mono ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>{remainingTilesCount}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10 text-yellow-400' : 'hover:bg-black/5 text-stone-600'}`}
            title={isDarkMode ? "Modo Claro" : "Modo Oscuro"}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button 
            onClick={toggleFullscreen}
            className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10 text-emerald-500' : 'hover:bg-black/5 text-emerald-600'}`}
            title="Pantalla Completa"
          >
            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
          <button 
            onClick={backToMenu}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all font-bold text-xs border border-red-500/20"
          >
            <LogOut size={16} />
            SALIR
          </button>
        </div>
      </header>

      {/* Game Board with Table Effect */}
      <main className="pt-20 pb-32 min-h-screen flex flex-col items-center px-6">
        <div className="w-full max-w-[1400px] grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8 items-start">
          
          {/* Left Side: Board and Chart */}
          <div className="space-y-8">
            {/* Table Structure */}
            <div 
              className="relative p-12 rounded-[40px] border-[16px] border-stone-800 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.9),inset_0_0_80px_rgba(0,0,0,0.6)] bg-[length:100%_100%] bg-no-repeat transition-all duration-700 mx-auto"
              style={{ backgroundImage: `url(${tableTheme.url})` }}
            >
          {/* Wood Grain Effect (CSS) */}
          <div className="absolute inset-[-16px] rounded-[40px] border-2 border-stone-700/30 pointer-events-none" />
          
          {/* Felt Texture Overlay */}
          <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:4px_4px]" />
          
          {/* Table Center Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

          {/* Actual Tile Container */}
          <div 
            className="relative"
            style={{ 
              width: '850px', 
              height: '650px',
              perspective: '1200px'
            }}
          >
          <AnimatePresence>
            {tiles.map((tile) => (
              !tile.isMatched && (
                <motion.div
                  key={tile.id}
                  initial={{ opacity: 0, scale: 0.8, y: -20 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1, 
                    x: tile.x * (TILE_WIDTH * 1.05),
                    y: tile.y * (TILE_HEIGHT * 1.05) - (tile.z * DEPTH_OFFSET),
                  }}
                  exit={{ opacity: 0, scale: 1.2, filter: 'brightness(2)' }}
                  transition={{ duration: 0.3 }}
                  onClick={() => handleTileClick(tile.id)}
                  className="absolute cursor-pointer select-none group"
                  style={{
                    width: TILE_WIDTH,
                    height: TILE_HEIGHT,
                    zIndex: Math.floor(tile.z * 100 + tile.y),
                  }}
                >
                  {/* Tile 3D Body */}
                  <div className={`
                    relative w-full h-full rounded-sm transition-all duration-200
                    ${tile.isSelected ? 'translate-y-[-6px] scale-110' : ''}
                  `}>
                    {/* Base (Dark Green) */}
                    <div className="absolute inset-0 translate-y-[5px] translate-x-[3px] bg-emerald-900 rounded-sm shadow-[4px_4px_10px_rgba(0,0,0,0.5)]" />
                    {/* Side (Darker Cream) */}
                    <div className="absolute inset-0 translate-y-[2px] translate-x-[1px] bg-stone-300 rounded-sm" />
                    {/* Face */}
                    <div className={`
                      absolute inset-0 bg-stone-100 rounded-sm border border-stone-400
                      flex items-center justify-center text-4xl font-bold
                      ${tile.isSelected ? 'ring-2 ring-yellow-500 ring-offset-2 ring-offset-black shadow-[0_0_20px_rgba(234,179,8,0.6)]' : ''}
                      ${!isSelectable(tile, tiles) ? 'brightness-50 grayscale-[0.5] cursor-not-allowed' : 'hover:brightness-110 hover:translate-y-[-2px]'}
                    `}>
                      {tile.isHinted && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ 
                            opacity: [0.4, 1, 0.4],
                            scale: [1, 1.15, 1],
                            boxShadow: [
                              "0 0 15px rgba(16,185,129,0.5)",
                              "0 0 40px rgba(16,185,129,1)",
                              "0 0 15px rgba(16,185,129,0.5)"
                            ]
                          }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className="absolute inset-[-6px] border-4 border-emerald-400 rounded-md pointer-events-none z-10"
                        />
                      )}
                      <span className="drop-shadow-[1px_1px_0px_rgba(255,255,255,0.5)] text-stone-900">{tile.symbol}</span>
                    </div>
                  </div>
                </motion.div>
              )
            ))}
          </AnimatePresence>
          </div>
        </div>

        {/* Live Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Fichas', value: tiles.filter(t => !t.isMatched).length, icon: <Layers size={16} />, color: 'text-blue-500' },
            { label: 'Parejas', value: getAvailablePairsCount(), icon: <Zap size={16} />, color: 'text-yellow-500' },
            { label: 'Combo', value: `x${combo}`, icon: <TrendingUp size={16} />, color: 'text-emerald-500' },
            { label: 'Precisión', value: `${stats.clicks > 0 ? Math.round((stats.matches * 2 / stats.clicks) * 100) : 0}%`, icon: <Target size={16} />, color: 'text-purple-500' },
          ].map((stat, i) => (
            <div key={i} className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-black/40 border-white/5' : 'bg-white border-black/5'} backdrop-blur-xl shadow-lg flex flex-col items-center justify-center gap-1`}>
              <div className={`${stat.color} mb-1`}>{stat.icon}</div>
              <div className="text-[10px] font-black uppercase tracking-tighter opacity-50">{stat.label}</div>
              <div className="text-xl font-black font-mono tracking-tighter">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Score Evolution Chart */}
        <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-black/40 border-white/5' : 'bg-white border-black/5'} backdrop-blur-xl shadow-2xl`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-emerald-500" size={20} />
              <h3 className="text-sm font-black uppercase tracking-widest text-emerald-500">Evolución de Puntuación</h3>
            </div>
            <div className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Actualización en vivo</div>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scoreHistory} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#ffffff10" : "#00000010"} vertical={false} />
                <XAxis 
                  dataKey="time" 
                  hide 
                />
                <YAxis 
                  stroke={isDarkMode ? "#ffffff40" : "#00000040"} 
                  fontSize={10} 
                  tickFormatter={(val) => `${val}`}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDarkMode ? '#1c1917' : '#ffffff',
                    borderColor: '#10b98133',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                  itemStyle={{ padding: '2px 0' }}
                />
                <Legend 
                  iconType="circle" 
                  verticalAlign="top" 
                  align="right"
                  wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingBottom: '20px' }} 
                />
                <Line 
                  type="monotone" 
                  dataKey={playerName || 'Tú'} 
                  stroke="#10b981" 
                  strokeWidth={4} 
                  dot={false} 
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  animationDuration={500}
                  isAnimationActive={true}
                />
                {opponents.map((op, i) => (
                  <Line 
                    key={op.name}
                    type="monotone" 
                    dataKey={op.name} 
                    stroke={op.color} 
                    strokeWidth={2} 
                    dot={false} 
                    strokeDasharray="5 5"
                    animationDuration={500}
                    isAnimationActive={true}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Right Side: Sidebar */}
      <aside className="space-y-6 sticky top-24">
        {/* Player Ranking */}
        <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-black/40 border-white/5' : 'bg-white border-black/5'} backdrop-blur-xl shadow-2xl`}>
          <div className="flex items-center gap-2 mb-6">
            <Trophy className="text-yellow-500" size={20} />
            <h3 className="text-sm font-black uppercase tracking-widest text-yellow-500">Ranking en Vivo</h3>
          </div>
          <div className="space-y-4">
            {[
              { name: playerName || 'Tú', score, color: '#10b981', isUser: true },
              ...opponents
            ].sort((a, b) => b.score - a.score).map((player, i) => (
              <motion.div 
                layout
                key={player.name}
                className={`flex items-center justify-between p-3 rounded-2xl border ${
                  player.isUser 
                  ? 'bg-emerald-500/10 border-emerald-500/20' 
                  : isDarkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 text-xs font-black text-stone-500">#{i + 1}</div>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg shadow-inner" style={{ backgroundColor: `${player.color}22`, color: player.color }}>
                    👤
                  </div>
                  <span className={`font-bold text-sm ${player.isUser ? 'text-emerald-400' : ''}`}>{player.name}</span>
                </div>
                <span className="font-mono font-black text-emerald-500">{player.score.toLocaleString()}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Game Rules */}
        <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-black/40 border-white/5' : 'bg-white border-black/5'} backdrop-blur-xl shadow-2xl`}>
          <div className="flex items-center gap-2 mb-6">
            <BookOpen className="text-blue-500" size={20} />
            <h3 className="text-sm font-black uppercase tracking-widest text-blue-500">Reglas del Juego</h3>
          </div>
          <div className={`space-y-4 text-xs leading-relaxed ${isDarkMode ? 'text-stone-400' : 'text-stone-600'}`}>
            <div className="flex gap-3">
              <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold shrink-0">1</div>
              <p>Encuentra y selecciona dos fichas con el mismo símbolo para eliminarlas.</p>
            </div>
            <div className="flex gap-3">
              <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold shrink-0">2</div>
              <p>Una ficha solo se puede seleccionar si tiene al menos un lado (izquierdo o derecho) libre.</p>
            </div>
            <div className="flex gap-3">
              <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold shrink-0">3</div>
              <p>Las fichas no deben tener ninguna otra ficha encima para ser seleccionables.</p>
            </div>
            <div className="flex gap-3">
              <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold shrink-0">4</div>
              <p>Las fichas de Estaciones y Flores pueden emparejarse con cualquier otra de su misma categoría.</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </main>

  <AnimatePresence>
      {gameOver && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-emerald-950 border border-emerald-500/30 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl"
          >
            {gameOver === 'win' ? (
              <>
                <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trophy className="text-yellow-500" size={40} />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">¡Victoria!</h2>
                <p className="text-emerald-200/60 mb-8">Has despejado todas las fichas en {formatTime(time)}.</p>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="text-red-500" size={40} />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Sin Movimientos</h2>
                <p className="text-emerald-200/60 mb-8">No quedan más parejas disponibles en el tablero.</p>
              </>
            )}
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={initGame}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw size={20} />
                NUEVO JUEGO
              </button>
              {gameOver === 'lose' && (
                <button 
                  onClick={shuffle}
                  className="w-full py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Shuffle size={20} />
                  MEZCLAR Y SEGUIR
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

      {/* Controls Footer */}
      <footer className={`fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t ${isDarkMode ? 'from-black/80' : 'from-white/80'} to-transparent flex items-center justify-center gap-4 px-6 z-50`}>
        <div className={`${isDarkMode ? 'bg-black/60 border-white/10' : 'bg-white/80 border-black/10'} backdrop-blur-xl border rounded-2xl p-2 flex items-center gap-2 shadow-2xl transition-colors`}>
          <ControlBtn 
            icon={<RotateCcw size={20} />} 
            label="Nuevo" 
            onClick={initGame} 
            color={isDarkMode ? "hover:text-emerald-400" : "hover:text-emerald-600"}
          />
          <div className={`w-px h-8 ${isDarkMode ? 'bg-white/10' : 'bg-black/10'} mx-1`} />
          <ControlBtn 
            icon={<Undo2 size={20} />} 
            label="Deshacer" 
            onClick={undo} 
            disabled={history.length === 0}
            color={isDarkMode ? "hover:text-blue-400" : "hover:text-blue-600"}
          />
          <ControlBtn 
            icon={<Lightbulb size={20} />} 
            label="Pista" 
            onClick={getHint} 
            color={isDarkMode ? "hover:text-yellow-400" : "hover:text-yellow-600"}
          />
          <ControlBtn 
            icon={<Shuffle size={20} />} 
            label="Mezclar" 
            onClick={shuffle} 
            color={isDarkMode ? "hover:text-purple-400" : "hover:text-purple-600"}
          />
          <div className={`w-px h-8 ${isDarkMode ? 'bg-white/10' : 'bg-black/10'} mx-1`} />
          <div className="flex items-center gap-1 px-2">
            {TABLE_THEMES.map(theme => (
              <button
                key={theme.id}
                onClick={() => setTableTheme(theme)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${tableTheme.id === theme.id ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-50 hover:opacity-100'}`}
                style={{ backgroundColor: theme.color }}
                title={theme.name}
              />
            ))}
          </div>
        </div>
      </footer>

      {/* Background Accents */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] ${isDarkMode ? 'bg-emerald-500/10' : 'bg-emerald-500/5'} blur-[120px] rounded-full`} />
        <div className={`absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] ${isDarkMode ? 'bg-emerald-500/10' : 'bg-emerald-500/5'} blur-[120px] rounded-full`} />
      </div>
    </div>
  );
}

function ControlBtn({ 
  icon, 
  label, 
  onClick, 
  disabled = false,
  color = ""
}: { 
  icon: React.ReactNode; 
  label: string; 
  onClick: () => void;
  disabled?: boolean;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex flex-col items-center justify-center w-20 h-16 rounded-xl transition-all
        ${disabled ? 'opacity-30 cursor-not-allowed' : `cursor-pointer hover:bg-white/5 ${color}`}
      `}
    >
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-tighter mt-1">{label}</span>
    </button>
  );
}
