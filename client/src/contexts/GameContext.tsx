// contexts/GameContext.tsx - Updated with elimination fixes
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import socket from "../socket";
import type { Card } from "../utils/cardUtils";

interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  deck: Card[];
  discardPile: Card[];
  gameStatus: "waiting" | "playing" | "ended";
  matchingDiscardWindow: boolean;
  matchingDiscardCard: Card | null;
  matchingDiscardTimeout: number | null;
  roundNumber: number;
  declarer: string | null;
  lastAction: any;
  eliminationUsedThisRound: boolean; // NEW
  pendingEliminationGive?: {
    // NEW
    eliminatingPlayerId: string;
    targetPlayerId: string;
    targetCardIndex: number;
    eliminatedCard: Card;
  };
}

interface Player {
  id: string;
  name: string;
  isHost: boolean;
  hand: (Card | null)[];
  score: number;
  knownCards: string[];
  skippedTurn: boolean;
  hasEliminatedThisRound: boolean;
  activePower?: string;
  isSelectingCardToGive?: boolean; // NEW
}

interface GameContextType {
  gameState: GameState | null;
  myPlayer: Player | null;
  currentPlayer: Player | null;
  isMyTurn: boolean;
  drawnCard: Card | null;
  selectedCard: number | null;
  temporaryRevealedCards: string[];
  hasDrawnFirstCard: boolean;
  opponentRevealedCard: {
    playerId: string;
    cardIndex: number;
    card: Card;
  } | null;
  swapSelections: Array<{ playerId: string; cardIndex: number }>;
  kingPowerReveal: {
    card1: { playerId: string; cardIndex: number; card: Card };
    card2: { playerId: string; cardIndex: number; card: Card };
  } | null;

  // Actions
  handleSelectCard: (cardIndex: number) => void;
  handleCardClick: (playerId: string, cardIndex: number) => void;
  handleEliminateCard: (
    playerId: string,
    cardIndex: number,
    cardId: string
  ) => void;
  clearSwapSelections: () => void;
  joinRoom: (roomId: string, playerName: string) => void;
  startGame: () => void;
  drawCard: () => void;
  declareGame: (cardRanks: string[]) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGameContext = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGameContext must be used within a GameProvider");
  }
  return context;
};

interface GameProviderProps {
  children: ReactNode;
}

export const GameProvider: React.FC<GameProviderProps> = ({ children }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [drawnCard, setDrawnCard] = useState<Card | null>(null);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [temporaryRevealedCards, setTemporaryRevealedCards] = useState<
    string[]
  >([]);
  const [hasDrawnFirstCard, setHasDrawnFirstCard] = useState(false);
  const [opponentRevealedCard, setOpponentRevealedCard] = useState<{
    playerId: string;
    cardIndex: number;
    card: Card;
  } | null>(null);
  const [swapSelections, setSwapSelections] = useState<
    Array<{ playerId: string; cardIndex: number }>
  >([]);
  const [kingPowerReveal, setKingPowerReveal] = useState<{
    card1: { playerId: string; cardIndex: number; card: Card };
    card2: { playerId: string; cardIndex: number; card: Card };
  } | null>(null);

  const currentPlayerId = socket.getId();
  const myPlayer = gameState?.players.find((p) => p.id === currentPlayerId);
  const currentPlayer = gameState?.players[gameState.currentPlayerIndex];
  const isMyTurn = myPlayer?.id === currentPlayer?.id;

  // Actions
  const handleSelectCard = (cardIndex: number) => {
    if (!drawnCard || !gameState) return;

    socket.emit("swap-card", {
      roomId: "QUICK",
      playerId: currentPlayerId,
      cardIndex,
      drawnCardId: drawnCard.id,
    });

    setSelectedCard(null);
    setDrawnCard(null);
  };

  const handleCardClick = (playerId: string, cardIndex: number) => {
    const currentPlayer = gameState?.players.find(
      (p) => p.id === currentPlayerId
    );
    const activePower = currentPlayer?.activePower;

    if (activePower === "Q" || activePower === "K") {
      // Handle Queen/King swap selection
      const newSelection = { playerId, cardIndex };
      const existingIndex = swapSelections.findIndex(
        (sel) => sel.playerId === playerId && sel.cardIndex === cardIndex
      );

      if (existingIndex >= 0) {
        // Deselect if already selected
        setSwapSelections(swapSelections.filter((_, i) => i !== existingIndex));
      } else if (swapSelections.length < 2) {
        // Add selection if less than 2 selected
        setSwapSelections([...swapSelections, newSelection]);
      }

      // Execute swap when 2 cards are selected
      if (swapSelections.length === 1 && existingIndex === -1) {
        const finalSelections = [...swapSelections, newSelection];
        setTimeout(() => {
          socket.emit("use-power", {
            roomId: "QUICK",
            playerId: currentPlayerId,
            power: activePower,
            swapSelections: finalSelections,
          });
          setSwapSelections([]);
        }, 100);
      }
    }
  };

  const handleEliminateCard = (
    playerId: string,
    cardIndex: number,
    cardId: string
  ) => {
    if (!gameState?.discardPile.length) return;

    // FIX 1: Check global elimination status
    if (gameState.eliminationUsedThisRound) {
      console.log("Elimination already used this round");
      return;
    }

    socket.emit("eliminate-card", {
      roomId: "QUICK",
      playerId: currentPlayerId,
      cardOwnerId: playerId,
      cardIndex,
      cardId,
    });
  };

  const clearSwapSelections = () => {
    setSwapSelections([]);
  };

  const joinRoom = (roomId: string, playerName: string) => {
    socket.emit("join-room", { roomId, playerName });
  };

  const startGame = () => {
    socket.emit("start-game", { roomId: "QUICK" });
  };

  const drawCard = () => {
    socket.emit("draw-card", { roomId: "QUICK", playerId: currentPlayerId });
  };

  const declareGame = (cardRanks: string[]) => {
    socket.emit("declare", {
      roomId: "QUICK",
      playerId: currentPlayerId,
      declaredRanks: cardRanks,
    });
  };

  // Socket event handlers
  useEffect(() => {
    const handleGameStateUpdate = (newGameState: GameState) => {
      console.log(`[${currentPlayerId}] Game state update:`, newGameState);
      setGameState(newGameState);

      // Clear drawn card and selection when it's no longer our turn
      const newCurrentPlayer =
        newGameState.players[newGameState.currentPlayerIndex];
      if (newCurrentPlayer?.id !== currentPlayerId) {
        setDrawnCard(null);
        setSelectedCard(null);
      }
    };

    const handleCardDrawn = (data: { playerId: string; card: Card }) => {
      console.log(`[${currentPlayerId}] Card drawn:`, data);
      if (data.playerId === currentPlayerId) {
        setDrawnCard(data.card);
        setHasDrawnFirstCard(true);
      }
    };

    const handleCardRevealed = (data: {
      playerId: string;
      cardIndex: number;
      card: Card;
      revealType: "temporary" | "permanent";
    }) => {
      console.log(`[${currentPlayerId}] Card revealed:`, data);

      if (data.revealType === "temporary") {
        setTemporaryRevealedCards((prev) => [...prev, data.card.id]);
        setTimeout(() => {
          setTemporaryRevealedCards((prev) =>
            prev.filter((id) => id !== data.card.id)
          );
        }, 3000);
      }
    };

    const handleGameEnded = (data: {
      declarer: string;
      winners: Array<{ id: string; name: string; score: number }>;
      isValidDeclaration: boolean;
      scoreBreakdown: Array<{
        id: string;
        name: string;
        score: number;
        remainingCards: number;
        eliminatedCards: number;
      }>;
    }) => {
      console.log(`[${currentPlayerId}] Game ended:`, data);
    };

    const handlePenaltyCard = (data: {
      playerId: string;
      penaltyCard: Card;
      reason: string;
    }) => {
      console.log(`[${currentPlayerId}] Penalty card:`, data);
    };

    const handlePowerPeekResult = (data: {
      peeker: string;
      targetPlayerId: string;
      targetCardIndex: number;
      card: Card;
    }) => {
      console.log(`[${currentPlayerId}] Power peek result:`, data);

      if (
        data.peeker === currentPlayerId &&
        data.targetPlayerId !== currentPlayerId
      ) {
        setOpponentRevealedCard({
          playerId: data.targetPlayerId,
          cardIndex: data.targetCardIndex,
          card: data.card,
        });
        setTimeout(() => setOpponentRevealedCard(null), 3000);
      }
    };

    const handlePowerSwapPreview = (data: {
      powerUserId: string;
      card1: { playerId: string; cardIndex: number; card: Card };
      card2: { playerId: string; cardIndex: number; card: Card };
    }) => {
      console.log(`[${currentPlayerId}] Power swap preview:`, data);

      if (data.card1.playerId !== currentPlayerId) {
        setOpponentRevealedCard({
          playerId: data.card1.playerId,
          cardIndex: data.card1.cardIndex,
          card: data.card1.card,
        });
      }
      if (
        data.card2.playerId !== currentPlayerId &&
        data.card1.playerId !== data.card2.playerId
      ) {
        setOpponentRevealedCard({
          playerId: data.card2.playerId,
          cardIndex: data.card2.cardIndex,
          card: data.card2.card,
        });
      }
    };

    const handleKingPowerReveal = (data: {
      powerUserId: string;
      card1: { playerId: string; cardIndex: number; card: Card };
      card2: { playerId: string; cardIndex: number; card: Card };
    }) => {
      console.log(`[${currentPlayerId}] King power reveal:`, data);
      setKingPowerReveal(data);

      setTimeout(() => {
        setKingPowerReveal(null);
        setTemporaryRevealedCards([]);
        setOpponentRevealedCard(null);
      }, 5000);
    };

    const handlePowerSwapCompleted = (data: {
      powerUserId: string;
      powerUserName: string;
      power: string;
      swapDetails: {
        player1Name: string;
        player2Name: string;
        card1Rank: string;
        card2Rank: string;
      };
    }) => {
      console.log(`[${currentPlayerId}] Power swap completed:`, data);
      setKingPowerReveal(null);
      setTemporaryRevealedCards([]);
      setOpponentRevealedCard(null);
    };

    // NEW: Handle elimination card transfer
    const handleEliminationCardTransfer = (data: {
      eliminatingPlayerName: string;
      cardOwnerName: string;
      eliminatedCard: Card;
      givenCard: Card;
      position: number;
    }) => {
      console.log(`[${currentPlayerId}] Elimination card transfer:`, data);
      const {
        eliminatingPlayerName,
        cardOwnerName,
        eliminatedCard,
        givenCard,
      } = data;

      const message = `${eliminatingPlayerName} eliminated ${eliminatedCard.rank} from ${cardOwnerName}'s hand and gave them ${givenCard.rank}`;
      console.log(message);
    };

    // FIX 3: Handle card selection prompt
    const handleSelectCardToGive = (data: {
      eliminatingPlayerId: string;
      targetPlayerName: string;
      eliminatedCard: Card;
    }) => {
      console.log(`[${currentPlayerId}] Select card to give:`, data);
      if (data.eliminatingPlayerId === currentPlayerId) {
        console.log(
          `You must choose a card to give to ${data.targetPlayerName}`
        );
      }
    };

    // NEW: Handle elimination too slow
    const handleEliminationTooSlow = (data: {
      playerId: string;
      message: string;
    }) => {
      console.log(`[${currentPlayerId}] Elimination too slow:`, data);
      if (data.playerId === currentPlayerId) {
        console.log("You were too slow - elimination window closed");
      }
    };

    // NEW: Handle invalid card selection
    const handleInvalidCardSelection = (data: {
      playerId: string;
      message: string;
    }) => {
      console.log(`[${currentPlayerId}] Invalid card selection:`, data);
      if (data.playerId === currentPlayerId) {
        console.log("Invalid card selection:", data.message);
      }
    };

    // Register event handlers
    socket.on("game-state-update", handleGameStateUpdate);
    socket.on("card-drawn", handleCardDrawn);
    socket.on("card-revealed", handleCardRevealed);
    socket.on("game-ended", handleGameEnded);
    socket.on("penalty-card", handlePenaltyCard);
    socket.on("power-peek-result", handlePowerPeekResult);
    socket.on("power-swap-preview", handlePowerSwapPreview);
    socket.on("king-power-reveal", handleKingPowerReveal);
    socket.on("power-swap-completed", handlePowerSwapCompleted);
    socket.on("elimination-card-transfer", handleEliminationCardTransfer);
    socket.on("select-card-to-give", handleSelectCardToGive); // NEW
    socket.on("elimination-too-slow", handleEliminationTooSlow); // NEW
    socket.on("invalid-card-selection", handleInvalidCardSelection); // NEW

    // Cleanup
    return () => {
      socket.off("game-state-update", handleGameStateUpdate);
      socket.off("card-drawn", handleCardDrawn);
      socket.off("card-revealed", handleCardRevealed);
      socket.off("game-ended", handleGameEnded);
      socket.off("penalty-card", handlePenaltyCard);
      socket.off("power-peek-result", handlePowerPeekResult);
      socket.off("power-swap-preview", handlePowerSwapPreview);
      socket.off("king-power-reveal", handleKingPowerReveal);
      socket.off("power-swap-completed", handlePowerSwapCompleted);
      socket.off("elimination-card-transfer", handleEliminationCardTransfer);
      socket.off("select-card-to-give", handleSelectCardToGive);
      socket.off("elimination-too-slow", handleEliminationTooSlow);
      socket.off("invalid-card-selection", handleInvalidCardSelection);
    };
  }, [currentPlayerId]);

  const value: GameContextType = {
    gameState,
    myPlayer,
    currentPlayer,
    isMyTurn,
    drawnCard,
    selectedCard,
    temporaryRevealedCards,
    hasDrawnFirstCard,
    opponentRevealedCard,
    swapSelections,
    kingPowerReveal,

    // Actions
    handleSelectCard,
    handleCardClick,
    handleEliminateCard,
    clearSwapSelections,
    joinRoom,
    startGame,
    drawCard,
    declareGame,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export default GameProvider;
