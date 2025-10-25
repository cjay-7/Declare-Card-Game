// client/src/contexts/UIStateContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { CardSelection } from "../utils/cardUtils";
import type { Card } from "../utils/cardUtils";

/**
 * Interface for temporary card reveal state
 */
interface TemporaryRevealState {
  temporaryRevealedCards: number[];
  setTemporaryRevealedCards: (indices: number[]) => void;
  opponentRevealedCard: {
    playerId: string;
    cardIndex: number;
    card: Card;
  } | null;
  setOpponentRevealedCard: (
    data: { playerId: string; cardIndex: number; card: Card } | null
  ) => void;
}

/**
 * Interface for King power reveal state
 */
interface KingPowerRevealState {
  powerUserId: string;
  powerUserName: string;
  card1: {
    card: Card;
    playerId: string;
    playerName: string;
    cardIndex: number;
  };
  card2: {
    card: Card;
    playerId: string;
    playerName: string;
    cardIndex: number;
  };
  message: string;
  swapData?: {
    card1PlayerId: string;
    card1Index: number;
    card2PlayerId: string;
    card2Index: number;
  };
  showConfirmation?: boolean;
}

/**
 * Interface for elimination card selection state
 */
interface EliminationCardSelectionState {
  isActive: boolean;
  eliminatedCardInfo: {
    eliminatingPlayerId: string;
    cardOwnerId: string;
    cardOwnerName: string;
    cardIndex: number;
    eliminatedCard: Card;
  } | null;
}

/**
 * Interface for the UIStateContext
 */
interface UIStateContextType {
  // Card selection state
  selectedCard: CardSelection | null;
  setSelectedCard: (selection: CardSelection | null) => void;

  // Drawn card state
  drawnCard: Card | null;
  setDrawnCard: (card: Card | null) => void;

  // Power-related UI state
  selectedPower: string | null;
  setSelectedPower: (power: string | null) => void;
  powerInstructions: string | null;
  setPowerInstructions: (instructions: string | null) => void;
  swapSelections: Array<{ playerId: string; cardIndex: number }>;
  setSwapSelections: (
    selections: Array<{ playerId: string; cardIndex: number }>
  ) => void;

  // Modal states
  showDeclareModal: boolean;
  setShowDeclareModal: (show: boolean) => void;

  // Temporary reveal state
  temporaryRevealedCards: number[];
  setTemporaryRevealedCards: (indices: number[]) => void;
  opponentRevealedCard: {
    playerId: string;
    cardIndex: number;
    card: Card;
  } | null;
  setOpponentRevealedCard: (
    data: { playerId: string; cardIndex: number; card: Card } | null
  ) => void;

  // King power reveal state
  kingPowerReveal: KingPowerRevealState | null;
  setKingPowerReveal: (reveal: KingPowerRevealState | null) => void;

  // Elimination card selection state
  eliminationCardSelection: EliminationCardSelectionState | null;
  setEliminationCardSelection: (
    selection: EliminationCardSelectionState | null
  ) => void;
}

/**
 * Context for managing UI state
 */
const UIStateContext = createContext<UIStateContextType | undefined>(undefined);

/**
 * Props for the UIStateProvider component
 */
interface UIStateProviderProps {
  children: ReactNode;
}

/**
 * Provider component for UI state management
 *
 * This context handles all UI-related state including card selection,
 * modal visibility, temporary reveals, and power interactions.
 * It's separated from game logic for better maintainability.
 *
 * @param {UIStateProviderProps} props - The provider props
 * @returns {JSX.Element} The provider component
 */
export const UIStateProvider: React.FC<UIStateProviderProps> = ({
  children,
}) => {
  // Card selection state
  const [selectedCard, setSelectedCard] = useState<CardSelection | null>(null);
  const [drawnCard, setDrawnCard] = useState<Card | null>(null);

  // Power-related UI state
  const [selectedPower, setSelectedPower] = useState<string | null>(null);
  const [powerInstructions, setPowerInstructions] = useState<string | null>(
    null
  );
  const [swapSelections, setSwapSelections] = useState<
    Array<{ playerId: string; cardIndex: number }>
  >([]);

  // Modal states
  const [showDeclareModal, setShowDeclareModal] = useState(false);

  // Temporary reveal state
  const [temporaryRevealedCards, setTemporaryRevealedCards] = useState<
    number[]
  >([]);
  const [opponentRevealedCard, setOpponentRevealedCard] = useState<{
    playerId: string;
    cardIndex: number;
    card: Card;
  } | null>(null);

  // King power reveal state
  const [kingPowerReveal, setKingPowerReveal] =
    useState<KingPowerRevealState | null>(null);

  // Elimination card selection state
  const [eliminationCardSelection, setEliminationCardSelection] =
    useState<EliminationCardSelectionState | null>(null);

  const value: UIStateContextType = {
    selectedCard,
    setSelectedCard,
    drawnCard,
    setDrawnCard,
    selectedPower,
    setSelectedPower,
    powerInstructions,
    setPowerInstructions,
    swapSelections,
    setSwapSelections,
    showDeclareModal,
    setShowDeclareModal,
    temporaryRevealedCards,
    setTemporaryRevealedCards,
    opponentRevealedCard,
    setOpponentRevealedCard,
    kingPowerReveal,
    setKingPowerReveal,
    eliminationCardSelection,
    setEliminationCardSelection,
  };

  return (
    <UIStateContext.Provider value={value}>{children}</UIStateContext.Provider>
  );
};

/**
 * Hook to access the UI state context
 *
 * @returns {UIStateContextType} The UI state context value
 * @throws {Error} If used outside of UIStateProvider
 */
export const useUIStateContext = (): UIStateContextType => {
  const context = useContext(UIStateContext);
  if (!context) {
    throw new Error("useUIStateContext must be used within UIStateProvider");
  }
  return context;
};

export default UIStateContext;
