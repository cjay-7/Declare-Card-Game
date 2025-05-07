# Declare Card Game - Project Architecture

## Tech Stack

- **Frontend**: React with TypeScript
- **Backend**: Node.js with Express
- **Real-time Communication**: Socket.io
- **State Management**: React Context API or Redux
- **Styling**: Tailwind CSS
- **Storage**: In-memory for game state with optional light persistence using SQLite

## Core Components

### Backend

1. **Game Server**

   - Socket.io server for real-time multiplayer functionality
   - Game state management
   - Card deck handling & shuffling
   - Turn management
   - Special card power implementation
   - Scoring system

2. **API Endpoints**
   - Game creation
   - Player joining/leaving
   - Game state retrieval
   - Action validation

### Frontend

1. **Game Components**

   - Game board
   - Player hand
   - Card component
   - Discard pile
   - Deck
   - Action buttons (Draw, Swap, Discard, Declare)
   - Player information display

2. **Game Logic**

   - Turn management
   - Card selection
   - Special card power execution
   - Matching discard mechanism
   - Declaring process
   - Scoring display

3. **UI/UX Elements**
   - Game lobby
   - Room creation
   - Game instructions
   - Card animations
   - Timer for matching discards
   - Visual cues for special powers

## Data Models

### Card

```typescript
interface Card {
  id: string;
  suit: "hearts" | "diamonds" | "clubs" | "spades";
  rank:
    | "A"
    | "2"
    | "3"
    | "4"
    | "5"
    | "6"
    | "7"
    | "8"
    | "9"
    | "10"
    | "J"
    | "Q"
    | "K";
  value: number; // Numerical value (1-13, with K of hearts/diamonds = 0)
  isRevealed: boolean; // Whether the card is face up or down
  position?: number; // Position in hand (1-4)
}
```

### Player

```typescript
interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isCurrentTurn: boolean;
  hand: Card[];
  score: number;
  knownCards: Set<number>; // Indices of cards that player has seen
  skippedTurn: boolean; // For Jack effect
}
```

### Game

```typescript
interface Game {
  id: string;
  status: "waiting" | "playing" | "ended";
  players: Player[];
  deck: Card[];
  discardPile: Card[];
  currentPlayerIndex: number;
  roundNumber: number;
  matchingDiscardWindow: boolean; // Whether matching discard is currently allowed
  matchingDiscardCard: Card | null; // The card that can be matched
  declarer: Player | null; // Player who declared
  lastAction: GameAction;
}
```

## Implementation Plan

### Phase 1: Core Game Mechanics

1. Set up the basic React app with Tailwind CSS
2. Create card components and game board layout
3. Implement basic game state in React
4. Set up Express server with Socket.io
5. Implement basic card dealing and player turns

### Phase 2: Game Logic

1. Card drawing and swapping mechanics
2. Implement partial knowledge rules (seeing only 2 cards initially)
3. Card power implementation
4. Turn management and player actions
5. Declare mechanism and win condition verification

### Phase 3: Multiplayer Features

1. Game room creation and joining
2. Real-time updates via Socket.io
3. Player interaction (card swapping between players)
4. Implement matching discard feature with timing
5. Scoring system

### Phase 4: Polish

1. Card animations and visual effects
2. Sound effects
3. Game instructions and help
4. Responsive design for various devices
5. Testing and bug fixing

## Deployment

- Frontend: Static hosting on your existing server
- Backend: Node.js application on your server
- Configuration for your domain

declare-card-game/
├── client/ # React frontend
│ ├── public/
│ │ ├── index.html
│ │ └── assets/
│ │ └── cards/ # Card images
│ └── src/
│ ├── components/
│ │ ├── Card.tsx
│ │ ├── Deck.tsx
│ │ ├── DiscardPile.tsx
│ │ ├── GameBoard.tsx
│ │ ├── Hand.tsx
│ │ ├── Lobby.tsx
│ │ ├── Player.tsx
│ │ └── ActionPanel.tsx
│ ├── contexts/
│ │ └── GameContext.tsx
│ ├── utils/
│ │ ├── cardUtils.ts
│ │ └── gameLogic.ts
│ ├── App.tsx
│ ├── index.tsx
│ └── socket.ts
└── server/ # Express/Socket.io backend
├── src/
│ ├── models/
│ │ ├── Card.ts
│ │ ├── Game.ts
│ │ └── Player.ts
│ ├── game/
│ │ ├── cardPowers.ts
│ │ ├── deckManager.ts
│ │ ├── gameManager.ts
│ │ └── scoreCalculator.ts
│ ├── routes/
│ │ └── api.ts
│ ├── socket/
│ │ └── socketManager.ts
│ ├── app.ts
│ └── index.ts
├── package.json
└── tsconfig.json
