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
  targetPlayerForSwap: string | null;
  setTargetPlayerForSwap: (playerId: string | null) => void;

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
  handleSwapCard: () => void;
  handleDiscardCard: () => void;
  handleDeclare: () => void;
  handleSelectCard: (card: Card) => void;
  handleCardClick: (playerId: string, cardIndex: number) => void;
  handleViewBottomCards: () => void;

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
  const [targetPlayerForSwap, setTargetPlayerForSwap] = useState<string | null>(
    null
  );

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

    socket.on("game-state-update", handleGameStateUpdate);
    socket.on("card-drawn", handleCardDrawn);
    socket.on("card-revealed", handleCardRevealed);
    socket.on("game-ended", handleGameEnded);

    return () => {
      socket.off("game-state-update", handleGameStateUpdate);
      socket.off("card-drawn", handleCardDrawn);
      socket.off("card-revealed", handleCardRevealed);
      socket.off("game-ended", handleGameEnded);
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

  const handleSwapCard = () => {
    if (
      !isPlayerTurn ||
      !roomId ||
      !myPlayer ||
      !selectedCard ||
      !targetPlayerForSwap
    ) {
      console.log("Cannot swap card:", {
        isPlayerTurn,
        roomId,
        myPlayerId: myPlayer?.id,
        selectedCard,
        targetPlayerForSwap,
      });
      return;
    }

    console.log("Swapping card...");

    // Set animation
    setCardAnimation("swap");
    setAnimatingCardId(selectedCard.cardId);

    socket.emit("swap-card", {
      roomId,
      playerId: myPlayer.id,
      cardId: selectedCard.cardId,
      targetPlayerId: targetPlayerForSwap,
    });

    // Reset selections
    setSelectedCard(null);
    setTargetPlayerForSwap(null);
    setDrawnCard(null);
    setSelectedPower(null);
    setPowerInstructions(null);
  };

  const handleDiscardCard = () => {
    if (
      !isPlayerTurn ||
      !roomId ||
      !myPlayer ||
      (!selectedCard && !drawnCard)
    ) {
      console.log("Cannot discard card:", {
        isPlayerTurn,
        roomId,
        myPlayerId: myPlayer?.id,
        selectedCard,
        drawnCard,
      });
      return;
    }

    console.log("Discarding card...");

    // Get the card ID to discard
    const cardId = drawnCard ? drawnCard.id : selectedCard!.cardId;

    // Set animation
    setCardAnimation("discard");
    setAnimatingCardId(cardId);

    socket.emit("discard-card", {
      roomId,
      playerId: myPlayer.id,
      cardId,
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

    console.log("Declaring...");
    socket.emit("declare", {
      roomId,
      playerId: myPlayer.id,
    });

    // Reset selections
    setSelectedCard(null);
    setDrawnCard(null);
    setSelectedPower(null);
    setPowerInstructions(null);
  };

  const handleSelectCard = (card: Card) => {
    if (!card.id) {
      console.log("Card has no ID:", card);
      return;
    }

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
          handleDiscardCard();
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
          handleDiscardCard();
        }
      }, 1000);
    }

    // Select player for swap
    else if (playerId !== myPlayer.id && selectedCard) {
      console.log("Setting target player for swap:", playerId);
      setTargetPlayerForSwap(playerId);
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
    setTargetPlayerForSwap(null);
    setCardAnimation(null);
    setAnimatingCardId(null);
    setSelectedPower(null);
    setPowerInstructions(null);
    setHasDrawnFirstCard(false);
    setTemporaryRevealedCards([]);
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
        targetPlayerForSwap,
        setTargetPlayerForSwap,
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
        handleSwapCard,
        handleDiscardCard,
        handleDeclare,
        handleSelectCard,
        handleCardClick,
        handleViewBottomCards,
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
