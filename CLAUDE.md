# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a real-time multiplayer card game called "Declare" built with React TypeScript frontend and Node.js Socket.IO backend. The game features special card powers, turn-based gameplay, and a card elimination system.

## Development Commands

### Root Level Commands
```bash
npm run start      # Start both client and server concurrently
npm run client     # Start client development server (Vite)
npm run server     # Start server
```

### Client Commands (in /client directory)
```bash
npm run dev        # Start Vite development server
npm run build      # Build for production (TypeScript compilation + Vite build)
npm run lint       # Run ESLint
npm run preview    # Preview production build
```

### Server Commands (in /server directory)
```bash
npm run dev        # Start server (node index.js)
```

## Architecture

### Frontend (React + TypeScript + Vite)
- **Entry Point**: `client/src/main.tsx`
- **Main App**: `client/src/App.tsx`
- **Styling**: Tailwind CSS
- **State Management**: React Context API (`client/src/contexts/GameContext.tsx`)
- **Socket Communication**: `client/src/socket.ts`

### Backend (Node.js + Express + Socket.IO)
- **Entry Point**: `server/index.js`
- **Socket Management**: Handles real-time multiplayer functionality
- **Game State**: In-memory storage with room-based game management

## Key Game Logic Files

### Core Game Mechanics
- `client/src/utils/gameLogic.ts` - Main game state management and turn processing
- `client/src/utils/cardUtils.ts` - Card creation, deck management, game rules validation
- `server/index.js` - Multiplayer server logic with Socket.IO event handlers
- `server/src/utils/cardUtils.js` - Server-side card utilities

### Game Context & UI
- `client/src/contexts/GameContext.tsx` - React context providing game state and actions
- `client/src/components/HandGrid.tsx` - Interactive card display with power usage
- `client/src/components/ActionPanel.tsx` - Player action interface

### Testing & Debugging
- `client/src/utils/DualPlayerMockSocket.ts` - Mock socket for dual-player testing
- `client/src/TestControlPanel.tsx` - Development testing interface

## Game Features

### Special Card Powers
- **7/8**: Peek at your own cards
- **9/10**: Peek at opponent's cards
- **Jack**: Skip next player's turn
- **Queen**: Unseen card swap between any two cards
- **King**: Seen card swap (cards revealed before swapping)

### Card Elimination System
- Players can eliminate cards matching the top discard card rank
- Wrong elimination results in penalty card
- Eliminated cards count as 0 points

### Scoring
- Standard cards: Face value (A=1, J=11, Q=12, K=13)
- Special Kings: K♥/♦ = 0 points, K♠/♣ = 13 points

## Data Models

Key interfaces are defined in:
- `client/src/models/Card.ts`
- `client/src/models/Player.ts` 
- `client/src/models/Game.ts`

## Development Notes

- The project uses a monorepo structure with separate client and server packages
- Socket.IO handles real-time communication between frontend and backend
- Game state is managed both client-side (for UI responsiveness) and server-side (for validation)
- TypeScript is used throughout for type safety
- ESLint is configured for code quality

## Running the Game

1. Install dependencies: `npm install` (in root, client, and server directories)
2. Start development: `npm run start` (from root)
3. Access client at `http://localhost:5173`
4. Server runs on `http://localhost:3001`