# 🀄 Mahjong Online - Guía de Inicio Rápido

## ✅ Requisitos
- Node.js 18+
- npm

## 🚀 Inicio Rápido

### Opción 1: Usar el script de inicio (Recomendado)

```powershell
cd c:\Users\gabri\OneDrive\Documentos\GitHub\Mahjong-G3
.\start-game.ps1
```

Esto abrirá dos terminales:
- **Servidor**: http://localhost:3000
- **Cliente**: http://localhost:5173

Abre http://localhost:5173 en tu navegador.

### Opción 2: Inicio Manual

**Terminal 1 - Servidor:**
```bash
cd mahjong-coop/server
npm.cmd run dev
```

**Terminal 2 - Cliente:**
```bash
cd remix_-mahjong-solitario-tortuga
npm.cmd run dev
```

## 🎮 Cómo Jugar

1. **Ingresa tu nombre** en la pantalla de inicio
2. **Opciones:**
   - **Crear Sala**: Especifica un nombre y cantidad de jugadores (2-8)
   - **Unirse a Sala**: Selecciona una sala disponible de la lista
3. **Espera** a que se completen los jugadores
4. **Cuando todos estén listos**, el juego inicia automáticamente
5. **Haz clic en fichas** para seleccionarlas (necesitas 2 para comparar)
6. **Gana puntos** al emparejar fichas con el mismo símbolo

## 📋 Características

✅ **Salas Multiusuario**: Crea o únete a salas con 2-8 jugadores  
✅ **Inicio Automático**: El juego solo comienza cuando se completan los jugadores  
✅ **Estado Sincronizado**: Todos ven el tablero en tiempo real via Socket.IO  
✅ **Puntuación en Vivo**: Cada acierto suma puntos  
✅ **Interfaz Responsiva**: Funciona en desktop y tablets  

## 🔧 Estructura del Proyecto

```
Mahjong-G3/
├── mahjong-coop/
│   └── server/                    # Backend Node.js + Socket.IO
│       ├── src/
│       │   ├── index.ts           # Servidor HTTP
│       │   ├── socket.ts          # Gestión de Socket.IO y salas
│       │   ├── game.ts            # Lógica de juego
│       │   └── types.ts           # Tipos TypeScript
│       └── package.json
├── remix_-mahjong-solitario-tortuga/  # Frontend React + Vite
│   ├── src/
│   │   ├── App.tsx                # Componente principal
│   │   ├── socketService.ts       # Cliente Socket.IO
│   │   └── ...
│   └── package.json
└── start-game.ps1                 # Script para iniciar todo
```

## 🎯 Flujo de Lógica de Salas

1. **Crear Sala**: 
   - Especifica `requiredPlayers` (cupo de la sala)
   - La sala se queda en estado "esperando"
   - Los jugadores pueden unirse

2. **Unirse a Sala**:
   - El servidor comprueba que la sala no esté completa
   - Añade el jugador y lo sincroniza a todos

3. **Inicio Automático**:
   - Cuando `playersConectados >= requiredPlayers`
   - `hasStarted` cambia a `true`
   - Se abre el tablero y todos pueden jugar
   - `tile:select` solo funciona si `hasStarted === true`

## 🛠️ Desarrollo

### Cambiar número de fichas
En [socket.ts](mahjong-coop/server/src/socket.ts), línea de `createGame`:
```typescript
gameState: createGame(DEFAULT_PAIR_COUNT, safeRequiredPlayers),
```
Cambia `DEFAULT_PAIR_COUNT` (por defecto 15 pares = 30 fichas simples, típicamente son 144 fichas en Mahjong real)

### Cambiar puerto del servidor
En [index.ts](mahjong-coop/server/src/index.ts):
```typescript
const PORT = 3000; // Cambia aquí
```

### Cambiar puerto del cliente
En [package.json](remix_-mahjong-solitario-tortuga/package.json):
```json
"dev": "vite --port=5173" // Cambia aquí
```

## 🐛 Troubleshooting

**Error: "No se pudo conectar al servidor"**
- Asegúrate de que el servidor está corriendo en http://localhost:3000
- Verifica la variable de entorno `VITE_SOCKET_URL` en `.env.local`

**Las fichas no se seleccionan**
- Verifica que `hasStarted === true` (todos los jugadores conectados)
- Comprueba la consola del navegador para errores

**Dos jugadores no ven los cambios del otro**
- Asegúrate de que ambos están en la misma `roomId`
- Verifica que el Socket.IO está conectado (busca "Connected to server" en consola)

## 📞 Información de Contacto
Para reportar bugs o sugerencias, abre un issue en GitHub.
