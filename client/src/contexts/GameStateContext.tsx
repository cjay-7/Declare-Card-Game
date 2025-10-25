// client/src/contexts/GameStateContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { GameState, Player, GameAction } from "../utils/gameLogic";
import type { Card } from "../utils/cardUtils";

/**
 * Interface for the GameStateContext
 */
interface GameStateContextType {
  // Core game state
  gameState: GameState | null;
  setGameState: (state: GameState | null) => void;

  // Player information
  myPlayer: Player | null;
  isPlayerTurn: boolean;
  currentPlayerId: string;

  // Game actions
  lastAction: GameAction | null;
  setLastAction: (action: GameAction | null) => void;

  // Game status helpers
  canDiscardDrawnCard: boolean;
  hasDrawnFirstCard: boolean;
  setHasDrawnFirstCard: (hasDrawn: boolean) => void;
}

/**
 * Context for managing core game state
 */
const GameStateContext = createContext<GameStateContextType | undefined>(
  undefined
);

/**
 * Props for the GameStateProvider component
 */
interface GameStateProviderProps {
  children: ReactNode;
  initialCurrentPlayerId: string;
}

/**
 * Provider component for game state management
 *
 * This context handles the core game state including the current game state,
 * player information, and basic game status. It's separated from UI state
 * and socket management for better separation of concerns.
 *
 * @param {GameStateProviderProps} props - The provider props
 * @returns {JSX.Element} The provider component
 */
export const GameStateProvider: React.FC<GameStateProviderProps> = ({
  children,
  initialCurrentPlayerId,
}) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [lastAction, setLastAction] = useState<GameAction | null>(null);
  const [hasDrawnFirstCard, setHasDrawnFirstCard] = useState(false);
  const [currentPlayerId, setCurrentPlayerId] = useState(
    initialCurrentPlayerId
  );

  // Compute derived state
  const myPlayer =
    gameState?.players.find((p) => p.id === currentPlayerId) || null;
  const currentPlayer = gameState?.players[gameState?.currentPlayerIndex || 0];
  const isPlayerTurn =
    !!myPlayer && !!currentPlayer && myPlayer.id === currentPlayer.id;
  const canDiscardDrawnCard = false; // This will be computed based on drawn card state

  const value: GameStateContextType = {
    gameState,
    setGameState,
    myPlayer,
    isPlayerTurn,
    currentPlayerId,
    lastAction,
    setLastAction,
    canDiscardDrawnCard,
    hasDrawnFirstCard,
    setHasDrawnFirstCard,
  };

  return (
    <GameStateContext.Provider value={value}>
      {children}
    </GameStateContext.Provider>
  );
};

/**
 * Hook to access the game state context
 *
 * @returns {GameStateContextType} The game state context value
 * @throws {Error} If used outside of GameStateProvider
 */
export const useGameStateContext = (): GameStateContextType => {
  const context = useContext(GameStateContext);
  if (!context) {
    throw new Error(
      "useGameStateContext must be used within GameStateProvider"
    );
  }
  return context;
};

export default GameStateContext;
