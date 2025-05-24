// client/src/contexts/EnhancedGameContext.tsx
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  type ReactNode,
} from "react";
import socket from "../socket";
import { type Card, type CardSelection } from "../utils/cardUtils";
import type { GameState, Player, GameAction } from "../utils/gameLogic";

interface GameContextType {
  // Basic state
  playerName: string;
  setPlayerName: (name: string) => void;
  gameState: GameState | null;
  isPlayerTurn: boolean;
  myPlayer: Player | null;
  selectedCard: CardSelection | null;
  setSelectedCard: (selection: CardSelection | null) => void;
  drawnCard: Card | null;
  setDrawnCard: (card: Card | null) => void;
  roomId: string | null;
  setRoomId: (id: string) => void;

  // Animation states
  cardAnimation: string | null;
  setCardAnimation: (animation: string | null) => void;
  animatingCardId: string | null;

  // Enhanced state
  selectedPower: string | null;
  powerInstructions: string | null;
  lastAction: GameAction | null;
  hasDrawnFirstCard: boolean;

  // Temporary reveal state
  temporaryRevealedCards: number[];
  setTemporaryRevealedCards: (indices: number[]) => void;

  // Game actions
  handleDrawCard: () => void;
  handleSwapWithDrawnCard: (handCardId: string) => void;
  handleDiscardDrawnCard: () => void;
  handleEliminateCard: (cardId: string) => void;
  handleDeclare: () => void;
  handleConfirmDeclare: (declaredRanks: string[]) => void;
  handleSelectCard: (card: Card) => void;
  handleCardClick: (playerId: string, cardIndex: number) => void;
  handleViewBottomCards: () => void;

  // UI state
  showDeclareModal: boolean;
  setShowDeclareModal: (show: boolean) => void;

  // Game rules helpers
  canDiscardDrawnCard: boolean;

  // Game instructions
  getInstructionsForCard: (card: Card) => string;

  // Reset game
  resetGame: () => void;
}

const defaultGameState: GameState = {
  players: [],
  currentPlayerIndex: 0,
  deck: [],
  discardPile: [],
  gameStatus: "waiting",
  matchingDiscardWindow: false,
  matchingDiscardCard: null,
  matchingDiscardTimeout: null,
  roundNumber: 1,
  declarer: null,
  lastAction: null,
  type: "view",
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [playerName, setPlayerName] = useState("");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardSelection | null>(null);
  const [drawnCard, setDrawnCard] = useState<Card | null>(null);

  // Animation states
  const [cardAnimation, setCardAnimation] = useState<string | null>(null);
  const [animatingCardId, setAnimatingCardId] = useState<string | null>(null);

  // Enhanced states
  const [selectedPower, setSelectedPower] = useState<string | null>(null);
  const [powerInstructions, setPowerInstructions] = useState<string | null>(
    null
  );
  const [lastAction, setLastAction] = useState<GameAction | null>(null);
  const [hasDrawnFirstCard, setHasDrawnFirstCard] = useState(false);

  // UI states
  const [showDeclareModal, setShowDeclareModal] = useState(false);

  // Temporary revealed cards (for viewing bottom cards at game start)
  const [temporaryRevealedCards, setTemporaryRevealedCards] = useState<
    number[]
  >([]);

  // Compute if it's the current player's turn
  const myPlayer =
    gameState?.players.find((p) => p.id === socket.getId()) || null;
  const currentPlayer = gameState?.players[gameState?.currentPlayerIndex || 0];
  const isPlayerTurn =
    !!myPlayer && !!currentPlayer && myPlayer.id === currentPlayer.id;

  // Game rules helpers
  const canDiscardDrawnCard = !!drawnCard;

  // Helper to get instructions for special cards
  const getInstructionsForCard = (card: Card): string => {
    switch (card.rank) {
      case "J":
        return "Jack: Discard to skip the next player's turn.";
      case "Q":
        return "Queen: Click on one of your cards to reveal it permanently.";
      case "K":
        return "King: Click on another player's card to peek at it.";
      default:
        return "";
    }
  };

  // Reset hasDrawnFirstCard when game status changes to waiting
  useEffect(() => {
    if (gameState?.gameStatus === "waiting") {
      setHasDrawnFirstCard(false);
      setTemporaryRevealedCards([]);
    }
  }, [gameState?.gameStatus]);

  // Handle hiding temporary revealed cards after 5 seconds
  useEffect(() => {
    if (temporaryRevealedCards.length > 0) {
      const timer = setTimeout(() => {
        setTemporaryRevealedCards([]);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [temporaryRevealedCards]);

  // Set up socket event listeners
  useEffect(() => {
    // Handle game state updates from server/mock
    const handleGameStateUpdate = (updatedState: GameState) => {
      console.log("Received game state update:", updatedState);
      setGameState(updatedState);

      // Update last action
      if (updatedState.lastAction) {
        setLastAction(updatedState.lastAction);
      }
    };

    // Handle card drawn event
    const handleCardDrawn = (
      cardData: Card | { playerId: string; card: Card }
    ) => {
      console.log("Card drawn event received:", cardData);

      // Check if this is the new format with playerId
      if ("playerId" in cardData && "card" in cardData) {
        if (cardData.playerId === socket.getId()) {
          console.log("Setting drawn card for this player:", cardData.card);
          setDrawnCard(cardData.card);

          // Set hasDrawnFirstCard to true on first draw
          setHasDrawnFirstCard(true);

          // Set animation for drawn card
          setCardAnimation("draw");
          setAnimatingCardId(cardData.card.id);

          // Set power instructions if special card
          if (["J", "Q", "K"].includes(cardData.card.rank)) {
            setSelectedPower(cardData.card.rank);
            setPowerInstructions(getInstructionsForCard(cardData.card));
          } else {
            setSelectedPower(null);
            setPowerInstructions(null);
          }
        }
      } else {
        // Legacy format - just a card
        console.log("Setting drawn card (legacy format):", cardData);
        setDrawnCard(cardData as Card);

        // Set hasDrawnFirstCard to true on first draw
        setHasDrawnFirstCard(true);

        // Set animation
        setCardAnimation("draw");
        setAnimatingCardId((cardData as Card).id);

        // Set power instructions if special card
        if (["J", "Q", "K"].includes((cardData as Card).rank)) {
          setSelectedPower((cardData as Card).rank);
          setPowerInstructions(getInstructionsForCard(cardData as Card));
        } else {
          setSelectedPower(null);
          setPowerInstructions(null);
        }
      }
    };

    // Handle card revealed event
    const handleCardRevealed = (data: any) => {
      setCardAnimation("reveal");
      setAnimatingCardId(data.card.id);
    };

    // Handle game ended event
    const handleGameEnded = (result: any) => {
      console.log("Game ended:", result);
    };

    // Handle penalty card event
    const handlePenaltyCard = (data: {
      playerId: string;
      penaltyCard: Card;
    }) => {
      if (data.playerId === socket.getId()) {
        console.log("Received penalty card:", data.penaltyCard);
        // Add penalty card to hand
        // This would be handled by the server updating the game state
      }
    };

    socket.on("game-state-update", handleGameStateUpdate);
    socket.on("card-drawn", handleCardDrawn);
    socket.on("card-revealed", handleCardRevealed);
    socket.on("game-ended", handleGameEnded);
    socket.on("penalty-card", handlePenaltyCard);

    return () => {
      socket.off("game-state-update", handleGameStateUpdate);
      socket.off("card-drawn", handleCardDrawn);
      socket.off("card-revealed", handleCardRevealed);
      socket.off("game-ended", handleGameEnded);
      socket.off("penalty-card", handlePenaltyCard);
    };
  }, []);

  // Reset animation after it completes
  useEffect(() => {
    if (cardAnimation) {
      const timer = setTimeout(() => {
        setCardAnimation(null);
        setAnimatingCardId(null);
      }, 500); // Match with animation duration

      return () => clearTimeout(timer);
    }
  }, [cardAnimation, animatingCardId]);

  // Game action handlers
  const handleDrawCard = () => {
    if (!isPlayerTurn || !roomId || !myPlayer) {
      console.log("Cannot draw card:", {
        isPlayerTurn,
        roomId,
        myPlayerId: myPlayer?.id,
      });
      return;
    }

    console.log("Drawing card...");
    socket.emit("draw-card", { roomId, playerId: myPlayer.id });
  };

  const handleSwapWithDrawnCard = (handCardId: string) => {
    if (!isPlayerTurn || !roomId || !myPlayer || !drawnCard) {
      console.log("Cannot swap with drawn card:", {
        isPlayerTurn,
        roomId,
        myPlayerId: myPlayer?.id,
        drawnCard,
      });
      return;
    }

    console.log("Swapping drawn card with hand card:", handCardId);

    // Set animation
    setCardAnimation("swap");
    setAnimatingCardId(handCardId);

    socket.emit("swap-drawn-card", {
      roomId,
      playerId: myPlayer.id,
      drawnCardId: drawnCard.id,
      handCardId: handCardId,
    });

    // Reset selections
    setSelectedCard(null);
    setDrawnCard(null);
    setSelectedPower(null);
    setPowerInstructions(null);
  };

  const handleDiscardDrawnCard = () => {
    if (!isPlayerTurn || !roomId || !myPlayer || !drawnCard) {
      console.log("Cannot discard drawn card:", {
        isPlayerTurn,
        roomId,
        myPlayerId: myPlayer?.id,
        drawnCard,
      });
      return;
    }

    console.log("Discarding drawn card...");

    // Set animation
    setCardAnimation("discard");
    setAnimatingCardId(drawnCard.id);

    socket.emit("discard-drawn-card", {
      roomId,
      playerId: myPlayer.id,
      cardId: drawnCard.id,
    });

    // Reset selections
    setSelectedCard(null);
    setDrawnCard(null);
    setSelectedPower(null);
    setPowerInstructions(null);
  };

  const handleEliminateCard = (cardId: string) => {
    // Allow elimination when there's a discard card, even if it's not player's turn
    const hasDiscardCard =
      gameState?.discardPile && gameState.discardPile.length > 0;

    if (!hasDiscardCard || !roomId || !myPlayer) {
      console.log("Cannot eliminate card:", {
        hasDiscardCard,
        roomId,
        myPlayerId: myPlayer?.id,
      });
      return;
    }

    console.log("Eliminating card:", cardId);

    // Set animation
    setCardAnimation("discard");
    setAnimatingCardId(cardId);

    socket.emit("eliminate-card", {
      roomId,
      playerId: myPlayer.id,
      cardId: cardId,
    });

    // Reset selections
    setSelectedCard(null);
    setDrawnCard(null);
    setSelectedPower(null);
    setPowerInstructions(null);
  };

  const handleDeclare = () => {
    if (!isPlayerTurn || !roomId || !myPlayer) {
      console.log("Cannot declare:", {
        isPlayerTurn,
        roomId,
        myPlayerId: myPlayer?.id,
      });
      return;
    }

    setShowDeclareModal(true);
  };

  const handleConfirmDeclare = (declaredRanks: string[]) => {
    if (!isPlayerTurn || !roomId || !myPlayer) return;

    console.log("Confirming declare with ranks:", declaredRanks);

    socket.emit("declare", {
      roomId,
      playerId: myPlayer.id,
      declaredRanks,
    });

    // Reset selections
    setSelectedCard(null);
    setDrawnCard(null);
    setSelectedPower(null);
    setPowerInstructions(null);
    setShowDeclareModal(false);
  };

  const handleSelectCard = (card: Card) => {
    if (!card.id) {
      console.log("Card has no ID:", card);
      return;
    }

    // If there's a drawn card, clicking a hand card should swap them
    if (drawnCard) {
      console.log("Swapping drawn card with selected card:", card);
      handleSwapWithDrawnCard(card.id);
      return;
    }

    // Otherwise, select/deselect for elimination
    if (selectedCard && selectedCard.cardId === card.id) {
      // Deselect if already selected
      console.log("Deselecting card:", card);
      setSelectedCard(null);
    } else {
      // Select new card
      console.log("Selecting card:", card);
      setSelectedCard({ cardId: card.id, isSelected: true });
    }
  };

  const handleCardClick = (playerId: string, cardIndex: number) => {
    if (!isPlayerTurn || !roomId || !myPlayer) {
      console.log("Cannot handle card click:", {
        isPlayerTurn,
        roomId,
        myPlayerId: myPlayer?.id,
      });
      return;
    }

    // King allows looking at opponent's card
    if (drawnCard?.rank === "K" && playerId !== myPlayer.id) {
      console.log("Viewing opponent's card with King...");
      socket.emit("view-opponent-card", {
        roomId,
        playerId: myPlayer.id,
        targetPlayerId: playerId,
        cardIndex,
      });

      // Discard the King after use
      setTimeout(() => {
        if (drawnCard) {
          handleDiscardDrawnCard();
        }
      }, 3500);
    }

    // Queen allows looking at your own card
    else if (drawnCard?.rank === "Q" && playerId === myPlayer.id) {
      console.log("Viewing own card with Queen...");
      socket.emit("view-own-card", {
        roomId,
        playerId: myPlayer.id,
        cardIndex,
      });

      // Discard the Queen after use
      setTimeout(() => {
        if (drawnCard) {
          handleDiscardDrawnCard();
        }
      }, 1000);
    }
  };

  // Function to view the bottom two cards at the start of the game
  const handleViewBottomCards = () => {
    if (!myPlayer || hasDrawnFirstCard) {
      console.log("Cannot view bottom cards:", {
        myPlayerId: myPlayer?.id,
        hasDrawnFirstCard,
      });
      return;
    }

    // Get the indices of the bottom two cards (assuming 4 cards total, so indices 2 and 3)
    const bottomCardIndices = [2, 3];

    // Temporarily reveal these cards
    setTemporaryRevealedCards(bottomCardIndices);

    console.log("Viewing bottom cards:", bottomCardIndices);
  };

  // Reset game state
  const resetGame = () => {
    setSelectedCard(null);
    setDrawnCard(null);
    setCardAnimation(null);
    setAnimatingCardId(null);
    setSelectedPower(null);
    setPowerInstructions(null);
    setHasDrawnFirstCard(false);
    setTemporaryRevealedCards([]);
    setShowDeclareModal(false);
  };

  return (
    <GameContext.Provider
      value={{
        playerName,
        setPlayerName,
        gameState,
        isPlayerTurn,
        myPlayer,
        selectedCard,
        setSelectedCard,
        drawnCard,
        setDrawnCard,
        roomId,
        setRoomId,
        cardAnimation,
        setCardAnimation,
        animatingCardId,
        selectedPower,
        powerInstructions,
        lastAction,
        hasDrawnFirstCard,
        temporaryRevealedCards,
        setTemporaryRevealedCards,
        handleDrawCard,
        handleSwapWithDrawnCard,
        handleDiscardDrawnCard,
        handleEliminateCard,
        handleDeclare,
        handleConfirmDeclare,
        handleSelectCard,
        handleCardClick,
        handleViewBottomCards,
        showDeclareModal,
        setShowDeclareModal,
        canDiscardDrawnCard,
        getInstructionsForCard,
        resetGame,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGameContext = () => {
  const context = useContext(GameContext);
  if (!context)
    throw new Error("useGameContext must be used within GameProvider");
  return context;
};
