# Declare Card Game - Project Overview

## Project Summary

This is a **multiplayer card game** called "Declare" built with:
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + Socket.io
- **Architecture**: Real-time multiplayer with dual-mode support (same device & online)

---

## Game Rules Overview

### Objective
Players aim to form a valid declaration (set or sequence) with their 4 cards while minimizing their score. The player with the lowest score wins.

### Key Mechanics
1. **Initial Setup**: Each player receives 4 cards, with cards 3 and 4 initially revealed
2. **Turn Flow**: Draw → Replace/Discard → Special Powers → Next Player
3. **Card Visibility**: Cards are hidden until revealed by special powers or game events
4. **Elimination**: Players can eliminate matching cards from any player's hand when a matching card is discarded
5. **Declaration**: Players can declare when they believe they have a valid set or sequence

### Special Card Powers
- **A, 2-6**: Matching discard window (other players can eliminate matching cards)
- **7, 8**: Peek at your own cards
- **9, 10**: Peek at opponent's cards
- **J (Jack)**: Skip next player's turn
- **Q (Queen)**: Look at one of your own cards
- **K (King)**: Look at two opponent cards and optionally swap them
- **K of Hearts/Diamonds**: Value = 0 (best cards)

---

## Architecture & Flow

### 1. **Application Entry Point**

**Client**: `client/src/main.tsx`
- Initializes React app
- Renders `App.tsx` component

**Server**: `server/index.js`
- Express server on port 4000
- Socket.io server for real-time communication
- In-memory game state storage (rooms object)

### 2. **Application Flow**

```
User Opens App
    ↓
App.tsx (Main Component)
    ↓
├─ Not Joined Room? → Lobby Component
│  └─ User enters room ID & name
│  └─ Joins room via socket
│
└─ Joined Room? → GameBoard Component
   └─ Game Status: "waiting" → Lobby View (waiting for players)
   └─ Game Status: "playing" → Game Board View
   └─ Game Status: "ended" → Game End Screen
```

### 3. **Socket Communication Flow**

#### Client → Server Events:
- `join-room`: Player joins a game room
- `start-game`: Host starts the game
- `draw-card`: Player draws from deck
- `replace-with-drawn`: Replace hand card with drawn card
- `discard-drawn-card`: Discard the drawn card
- `discard-card`: Discard a card from hand
- `swap-card`: Swap card with opponent
- `declare`: Player declares (ends game)
- `eliminate-card`: Eliminate matching card
- `view-opponent-card`: Use King power
- `view-own-card`: Use Queen power
- `use-power-on-own-card`: Use 7/8 power
- `use-power-on-opponent-card`: Use 9/10 power
- `complete-elimination-card-give`: Complete elimination card transfer

#### Server → Client Events:
- `update-players`: Player list updated
- `game-state-update`: Full game state sync
- `card-drawn`: Card drawn from deck
- `game-ended`: Game finished with scores
- `error`: Error message
- `elimination-card-selection-required`: Need to select card for elimination
- `power-peek-result`: Result of power usage

### 4. **State Management**

#### Client-Side Contexts:
1. **GameContext** (`contexts/GameContext.tsx`)
   - Main game state management
   - Handles all game actions
   - Manages special powers
   - Card selection & elimination logic

2. **GameStateContext** (`contexts/GameStateContext.tsx`)
   - Tracks current player ID
   - Manages player switching (mock mode)

3. **UIStateContext** (`contexts/UIStateContext.tsx`)
   - UI-specific state
   - Modal visibility
   - Animations

#### Server-Side State:
- **rooms**: Object storing all active game rooms
  ```javascript
  {
    [roomId]: {
      players: Player[],
      deck: Card[],
      discardPile: Card[],
      gameStatus: "waiting" | "playing" | "ended",
      currentPlayerIndex: number,
      matchingDiscardWindow: boolean,
      matchingDiscardCard: Card | null,
      roundNumber: number,
      declarer: string | null,
      lastAction: GameAction | null,
      firstCardDrawn: boolean,
      drawnCard: Card | null,
      drawnCardPlayer: string | null
    }
  }
  ```

### 5. **Game Turn Flow**

```
1. Current Player's Turn
   ↓
2. Player draws card from deck
   ↓
3. Player chooses:
   ├─ Option A: Replace hand card with drawn card
   │  └─ Old hand card goes to discard pile
   │  └─ Special power activates (if applicable)
   │
   └─ Option B: Discard drawn card
      └─ Card goes to discard pile
      └─ Special power activates (if applicable)
      └─ Matching discard window opens (if A-6)
         └─ Other players can eliminate matching cards
   ↓
4. Special Powers Resolve (if activated)
   ├─ 7/8: Peek at own card
   ├─ 9/10: Peek at opponent card
   ├─ Q: Look at own card
   ├─ K: Look at 2 opponent cards (optional swap)
   └─ J: Skip next player
   ↓
5. Move to Next Player
   └─ Skip if Jack was played
```

### 6. **Card Elimination Flow**

```
1. Player discards card (A-6) → Matching window opens
   ↓
2. Any player can eliminate matching card from any hand
   ↓
3. Server validates:
   ├─ Valid: Card eliminated, position becomes null
   │  └─ If eliminated opponent's card:
   │     └─ Eliminating player must give a card
   │     └─ Card owner chooses position
   │
   └─ Invalid: Penalty card added to eliminator's hand
   ↓
4. Elimination lock prevents simultaneous eliminations
```

### 7. **Declaration Flow**

```
1. Player clicks "Declare" button
   ↓
2. Declaration modal opens
   ↓
3. Player selects 4 cards to declare
   ↓
4. System validates:
   ├─ Set: All same rank? → Valid
   └─ Sequence: Same suit + consecutive values? → Valid
   ↓
5. Game ends
   ↓
6. All cards revealed
   ↓
7. Scores calculated (sum of card values)
   ↓
8. Winner: Lowest score
```

---

## Key Components

### Client Components

1. **App.tsx**
   - Root component
   - Manages room joining state
   - Handles player switching (mock mode)
   - Renders Lobby or GameBoard

2. **Lobby.tsx**
   - Room creation/joining interface
   - Player name input (real mode)
   - Room ID input/generation

3. **GameBoard.tsx**
   - Main game interface
   - Displays opponent hands
   - Shows deck & discard pile
   - Renders player's hand
   - Action panel

4. **HandGrid.tsx**
   - Displays 4-card hand
   - Handles card interactions
   - Supports declaration mode
   - Handles power usage

5. **Card.tsx**
   - Individual card component
   - Shows/hides based on `isRevealed`
   - Visual representation

6. **ActionPanel.tsx**
   - Action buttons (Draw, Declare, etc.)
   - Context-aware button states

7. **GameEndScreen.tsx**
   - End game summary
   - Score display
   - Play again / Return to lobby

### Server Components

1. **server/index.js**
   - Main server file
   - Socket.io event handlers
   - Game logic execution
   - State management

2. **server/src/utils/cardUtils.js**
   - Deck creation
   - Card shuffling
   - Card dealing
   - Initial card revelation
   - Validation functions

---

## Dual Mode System

### Mock Mode (Same Device)
- **Purpose**: Testing/playing on single device
- **Implementation**: `DualPlayerMockSocket` class
- **Features**:
  - Player switcher UI (top right)
  - Switches between "Player 1" and "Player 2"
  - Both players use same socket connection
  - Local state synchronization

### Real Mode (Online Multiplayer)
- **Purpose**: True multiplayer across devices
- **Implementation**: Real Socket.io connection
- **Features**:
  - Each player has unique socket ID
  - Server manages all state
  - Real-time synchronization
  - Supports multiple rooms

**Mode Switching**: Toggle in top-left corner (reloads page)

---

## Data Models

### Card
```typescript
{
  id: string;
  suit: "hearts" | "diamonds" | "clubs" | "spades";
  rank: "A" | "2" | ... | "K";
  value: number; // 1-13, K♥/K♦ = 0
  isRevealed: boolean;
  position?: number; // 0-3
}
```

### Player
```typescript
{
  id: string; // Socket ID
  name: string;
  isHost: boolean;
  hand: (Card | null)[]; // null = eliminated position
  score: number;
  knownCards: string[]; // Card IDs seen
  skippedTurn: boolean;
  hasEliminatedThisRound: boolean;
  activePower?: string; // "7", "8", "9", "10", "Q", "K"
  usingPower?: boolean;
  connected: boolean;
}
```

### Game State
```typescript
{
  players: Player[];
  currentPlayerIndex: number;
  deck: Card[];
  discardPile: Card[];
  gameStatus: "waiting" | "playing" | "ended";
  matchingDiscardWindow: boolean;
  matchingDiscardCard: Card | null;
  roundNumber: number;
  declarer: string | null;
  lastAction: GameAction | null;
  firstCardDrawn: boolean;
  drawnCard: Card | null;
  drawnCardPlayer: string | null;
}
```

---

## Key Features

### 1. **Partial Knowledge System**
- Cards start hidden (except positions 3 & 4)
- Special powers reveal cards
- Players track known cards

### 2. **Card Elimination**
- Matching discard creates elimination window
- Players can eliminate matching cards
- Eliminated positions become `null`
- Card exchange for opponent eliminations

### 3. **Special Powers**
- Context-aware power activation
- UI guides power usage
- Server validates power usage

### 4. **Real-time Synchronization**
- Socket.io for instant updates
- Server is source of truth
- Client receives state updates

### 5. **Player Switching (Mock Mode)**
- Seamless perspective switching
- State preservation
- UI updates automatically

---

## File Structure

```
Declare-Card-Game/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── contexts/          # State management
│   │   ├── models/            # TypeScript models
│   │   ├── utils/             # Utility functions
│   │   ├── hooks/             # Custom React hooks
│   │   ├── socket.ts          # Socket wrapper
│   │   ├── App.tsx            # Main app component
│   │   └── main.tsx           # Entry point
│   └── package.json
│
├── server/                    # Node.js backend
│   ├── src/
│   │   ├── game/
│   │   │   └── gameManager.ts # (Currently empty/commented)
│   │   └── utils/
│   │       └── cardUtils.js   # Card utilities
│   ├── index.js               # Main server file
│   └── package.json
│
└── readme.md                  # Project documentation
```

---

## Development Workflow

### Starting the Application

1. **Start Server**:
   ```bash
   cd server
   npm install
   npm start  # Runs on port 4000
   ```

2. **Start Client**:
   ```bash
   cd client
   npm install
   npm run dev  # Runs on port 5173
   ```

3. **Access Application**:
   - Open browser to `http://localhost:5173`
   - Choose mode (Mock or Real)
   - Join/create room
   - Start playing!

### Testing

- **Mock Mode**: Use player switcher to test both players
- **Real Mode**: Open multiple browser tabs/windows
- **Test Control Panel**: Press `Alt+T` to open (if available)

---

## Important Implementation Details

### 1. **First Card Drawn Logic**
- When ANY player draws their first card, all initial revealed cards (3 & 4) become hidden
- Tracked via `firstCardDrawn` flag in room state
- Ensures fair gameplay

### 2. **Elimination Lock**
- Prevents multiple simultaneous eliminations
- Lock set after valid elimination
- Released after card selection complete

### 3. **Card Visibility Rules**
- Cards hidden by default
- Revealed by: special powers, game events, declaration
- Known cards tracked in `player.knownCards`

### 4. **Turn Management**
- Server manages turn order
- `currentPlayerIndex` tracks whose turn
- `skippedTurn` flag for Jack power
- Auto-advance after actions

### 5. **State Synchronization**
- Server emits `game-state-update` after every action
- Clients receive full state snapshot
- Client updates local state from server

---

## Future Improvements (From Documentation)

- Card animations
- Sound effects
- Responsive design
- Game history/replay
- Spectator mode
- Tournament mode
- Mobile app

---

## Summary

This is a **well-structured multiplayer card game** with:
- ✅ Real-time multiplayer support
- ✅ Dual-mode system (same device & online)
- ✅ Complex game mechanics (elimination, powers, declaration)
- ✅ Partial knowledge gameplay
- ✅ Server-authoritative game state
- ✅ Modern React + TypeScript frontend
- ✅ Socket.io real-time communication

The codebase follows good practices with:
- Type safety (TypeScript)
- Context-based state management
- Component-based architecture
- Server-side validation
- Error handling
- Clean separation of concerns
